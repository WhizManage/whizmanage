// src/components/table/products/components/variation/components/AddFromTermsItem.jsx

import { cn, toast } from "@/lib/utils";
import Button from "@components/ui/button";
import { CommandItem } from "@components/ui/command";
import { Input } from "@components/ui/input";
import CustomTooltip from "@components/ui/nextUI/Tooltip.jsx";
import { Check, Pencil, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { __, sprintf } from "@wordpress/i18n";
import { useVariationsStore } from "../store/variationsStore";
import { deleteApi, putApi } from "/src/services/services";

/**
 * 🎯 AddFromTermsItem - פריט term בודד ברשימה
 *
 * ✅ גירסה מתוקנת:
 * - עובדת עם Store החדש (termsCache)
 * - מקבלת isAlreadyInProduct ו-isSelected כprops
 * - 🆕 הוספת loading state עם חיווי ויזואלי
 */
const AddFromTermsItem = ({
  item,
  terms,
  values,
  setValues,
  itemsExist,
  attribute,
  setItemFoTaxonomy,
  isAlreadyInProduct,
  isSelected,
}) => {
  const [isEditItem, setIsEditItem] = useState(false);
  const [newName, setNewName] = useState("");
  const [isSaving, setIsSaving] = useState(false); // 🆕 Loading state
  const [isDeleting, setIsDeleting] = useState(false); // 🆕 Loading state למחיקה


  // Store - לעדכון termsCache
  const { termsCache, setTerms } = useVariationsStore();

  /**
   * ✅ עריכת term
   * מעדכן גם את termsCache
   * 🆕 עם loading state
   */
  const editItem = async () => {
    if (!item?.id || !newName.trim()) return;

    // מציאת ה-attribute id (מהמפתח ב-termsCache)
    let attributeId = null;
    for (const [attrId, cachedTerms] of Object.entries(termsCache)) {
      if (cachedTerms.some((t) => t.id === item.id)) {
        attributeId = attrId;
        break;
      }
    }

    if (!attributeId) {
      attributeId = attribute.id; // fallback
    }

    const url = `${window.siteUrl}/wp-json/wc/v3/products/attributes/${attributeId}/terms/${item.id}`;
    const itemData = {
      name: newName.trim(),
      slug: newName.trim().replace(/\//g, "-"),
    };

    setIsSaving(true); // 🆕 התחל loading

    try {
      const response = await putApi(url, itemData);
      const updatedTerm = response.data;

      // ✅ עדכון termsCache
      const currentTerms = termsCache[attributeId] || [];
      const updatedTerms = currentTerms.map((t) =>
        t.id === item.id ? updatedTerm : t
      );
      setTerms(attributeId, updatedTerms);

      toast.success(`${__("The term has been successfully updated to", "whizmanage")} "${updatedTerm.name}".`);

      setIsEditItem(false);
      setNewName("");
    } catch (error) {
      console.error("Error editing term:", error);
      toast.error(error?.response?.data?.message || __("Failed to update term", "whizmanage"));
    } finally {
      setIsSaving(false); // 🆕 סיים loading
    }
  };

  /**
   * ✅ מחיקת term
   * מעדכן גם את termsCache
   * 🆕 עם loading state
   * 🔥 שימוש ב-native confirm למניעת aria-hidden
   */
  const deleteItem = async () => {
    if (!item?.id) return;

    // מציאת ה-attribute id
    let attributeId = null;
    for (const [attrId, cachedTerms] of Object.entries(termsCache)) {
      if (cachedTerms.some((t) => t.id === item.id)) {
        attributeId = attrId;
        break;
      }
    }

    if (!attributeId) {
      attributeId = attribute.id; // fallback
    }

    // 🔥 Native confirm במקום CustomConfirm
    const isConfirmed = window.confirm(
      sprintf(
        __(
          'Are you sure you want to permanently delete the "%s" term? This action will remove it from all products using this attribute.',
          "whizmanage"
        ),
        item.name
      )
    );

    if (!isConfirmed) return;

    const url = `${window.siteUrl}/wp-json/wc/v3/products/attributes/${attributeId}/terms/${item.id}`;

    setIsDeleting(true); // 🆕 התחל loading

    try {
      await deleteApi(url);

      // ✅ עדכון termsCache
      const currentTerms = termsCache[attributeId] || [];
      const updatedTerms = currentTerms.filter((t) => t.id !== item.id);
      setTerms(attributeId, updatedTerms);

      toast.success(sprintf(__('The "%s" term has been permanently deleted.', "whizmanage"),
        item.name
      ));
    } catch (error) {
      console.error("Error deleting term:", error);
      toast.error(error?.response?.data?.message || __("Failed to delete term", "whizmanage"));
    } finally {
      setIsDeleting(false); // 🆕 סיים loading
    }
  };

  /**
   * ✅ טיפול בבחירה/ביטול בחירה
   */
  const handleSelectionChange = () => {
    setItemFoTaxonomy(item);

    if (isSelected) {
      setValues(values.filter((v) => v !== item.name));
    } else {
      setValues([...values, item.name]);
    }
  };

  return (
    <CommandItem
      key={item?.id ?? item?.name}
      className={cn(
        "cursor-pointer dark:aria-selected:bg-slate-800 flex gap-2 group/item justify-between min-h-9",
        isAlreadyInProduct && "opacity-50 cursor-not-allowed",
        (isSaving || isDeleting) && "opacity-70 pointer-events-none" // 🆕 disabled במצב loading
      )}
      disabled={isAlreadyInProduct || isSaving || isDeleting}
      onSelect={handleSelectionChange}
    >
      {/* ✅ מצב עריכה */}
      {isEditItem ? (
        <div className="flex gap-2 w-full" onClick={(e) => e.stopPropagation()}>
          <Input
            onChange={(e) => {
              e.stopPropagation();
              setNewName(e.target.value);
            }}
            defaultValue={item?.name || ""}
            className="h-8 w-full"
            onFocus={(event) => event.target.select()}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newName.trim()) {
                editItem();
              } else if (e.key === "Escape") {
                setIsEditItem(false);
                setNewName("");
              }
            }}
            disabled={isSaving} // 🆕 disabled בזמן שמירה
          />
          <Button
            variant="outline"
            className="h-8 min-w-[60px]" // 🆕 רוחב מינימלי למניעת קפיצה
            onClick={(e) => {
              e.stopPropagation();
              editItem();
            }}
            disabled={isSaving} // 🆕 disabled בזמן שמירה
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                {__("Saving...", "whizmanage")}
              </>
            ) : (
              __("Save", "whizmanage")
            )}
          </Button>
        </div>
      ) : (
        <>
          {/* ✅ סימון בחירה */}
          <Check
            className={cn(
              "mr-2 size-4 flex-shrink-0",
              isSelected ? "opacity-100" : "opacity-0"
            )}
          />

          {/* ✅ שם ה-term */}
          <span className="flex-1 truncate">
            {item?.name?.replace(/\\/g, "").replace(/"/g, "''") || ""}
            {isAlreadyInProduct && (
              <span className="text-xs text-slate-400 ml-2">
                ({__("Already added", "whizmanage")})
              </span>
            )}
            {/* 🆕 מחוון מחיקה */}
            {isDeleting && (
              <span className="text-xs text-red-500 ml-2">
                ({__("Deleting...", "whizmanage")})
              </span>
            )}
          </span>

          {/* ✅ כפתורי עריכה/מחיקה - מוצגים ב-hover */}
          {!isAlreadyInProduct && (
            <div className="hidden group-hover/item:flex gap-1 flex-shrink-0">
              <CustomTooltip title={__("Edit term", "whizmanage")} instantClose>
                <Button
                  size="icon"
                  variant="outline"
                  className="w-6 h-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditItem(true);
                    setNewName(item?.name || "");
                  }}
                  disabled={isDeleting} // 🆕 disabled בזמן מחיקה
                >
                  <Pencil className="w-3 h-3" />
                </Button>
              </CustomTooltip>
              <CustomTooltip title={__("Delete term", "whizmanage")} instantClose>
                <Button
                  size="icon"
                  variant="outline"
                  className="w-6 h-6 hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-900/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteItem();
                  }}
                  disabled={isDeleting} // 🆕 disabled בזמן מחיקה
                >
                  {isDeleting ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                </Button>
              </CustomTooltip>
            </div>
          )}
        </>
      )}
    </CommandItem>
  );
};

export default AddFromTermsItem;