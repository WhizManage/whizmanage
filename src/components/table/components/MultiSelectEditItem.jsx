// src/components/table/components/MultiSelectEditItem.jsx
import { useCoreTaxonomiesStore } from "@/components/table/store/useCoreTaxonomiesStore";
import { useCustomTaxonomiesStore } from "@/components/table/store/useCustomTaxonomiesStore";
import { cn, toast } from "@/lib/utils";
import Button from "@components/ui/button";
import { CommandItem } from "@components/ui/command";
import { confirm } from "@components/ui/custom/CustomConfirm";
import { Input } from "@components/ui/input";
import CustomTooltip from "@components/ui/nextUI/Tooltip.jsx";
import { Check, Pencil, Plus, Trash2, Undo2 } from "lucide-react";
import { useState } from "react";
 import { __ } from "@wordpress/i18n";
import { deleteApi, postApi, putApi } from "/src/services/services";

// טקסונומיות core – לא נטען דרך ה־custom store
const CORE_TAXONOMIES = new Set([
  "product_cat",
  "_product_cat",
  "categories",
  "product_tag",
  "tags",
]);

const isCoreTaxonomy = (name) => CORE_TAXONOMIES.has(String(name || ""));

const MultiSelectEditItem = ({
  item,
  itemsExist,
  setItemsExist,
  itemsProduct,
  setItemsProduct,
  columnName,
  objectSingular,
  row,
  combinedIdEndName,
  setCombinedIdEndName,
  disabled,
  apiSlug,
  taxonomyType, // ✅ שם הטקסונומיה בפועל (לטקסונומיות מותאמות)
  allowSubcategory = false, // האם לאפשר הוספת תת-קטגוריה
}) => {
  const [isEditItem, setIsEditItem] = useState(false);
  const [newName, setNewName] = useState("");
  const [isAddingSubcategory, setIsAddingSubcategory] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { updateTaxonomy } = useCoreTaxonomiesStore();
  const customStore = useCustomTaxonomiesStore();
   

  // ✅ קביעת שם הטקסונומיה לעדכון ה-store
  const taxonomyNameForStore = taxonomyType || columnName;
  const isCoreTax = isCoreTaxonomy(taxonomyNameForStore);
  // ❌ אין צורך ב: const apiSlug = taxonomySlug || columnName;

  // 🟣 נרמול – פה קובעים איך מזהים "את אותו אייטם"
  const itemId = typeof item === "object" ? item.id : item;
  const itemName = typeof item === "object" ? item.name : String(item);

  // האם האייטם הזה כבר נבחר? (תומך גם במספרים וגם באובייקטים)
  const isSelected = itemsProduct?.some((p) => {
    const pId = typeof p === "object" ? p.id : p;
    return String(pId) === String(itemId);
  });

  const editItem = async () => {
    const updatedName = newName || itemName;

    // 🟢 שמירת הערכים הקודמים לשחזור במקרה של שגיאה
    const previousItemsExist = [...itemsExist];
    const previousItemsProduct = [...itemsProduct];
    const previousCombined = combinedIdEndName ? [...combinedIdEndName] : null;

    // 🟢 יצירת אובייקט מעודכן אופטימי
    const optimisticItem = typeof item === "object"
      ? { ...item, name: updatedName }
      : { id: itemId, name: updatedName };

    // 🟢 עדכון אופטימי מיידי - לפני הקריאה לשרת
    const nextExist = itemsExist.map((i) =>
      (typeof i === "object" ? i.id : i) === itemId ? optimisticItem : i
    );
    setItemsExist(nextExist);

    const nextSelected = itemsProduct.map((i) => {
      const selId = typeof i === "object" ? i.id : i;
      return String(selId) === String(itemId) ? optimisticItem : i;
    });
    setItemsProduct(nextSelected);

    if (setCombinedIdEndName && Array.isArray(combinedIdEndName)) {
      setCombinedIdEndName(
        combinedIdEndName.map((i) =>
          (typeof i === "object" ? i.id : i) === itemId ? optimisticItem : i
        )
      );
    }

    // סגירת מצב העריכה מיד
    setIsEditItem(false);
    setNewName("");

    // ✅ קביעת ה-URL לפי סוג הטקסונומיה
    const url = isCoreTax
      ? `${window.siteUrl}/wp-json/wc/v3/products/${apiSlug}/${itemId}`
      : `${window.siteUrl}/wp-json/whizmanage/v1/taxonomy/${taxonomyNameForStore}/term/${itemId}`;
    const itemData = { name: updatedName };

    try {
      const response = await putApi(url, itemData);
      const serverItem = response.data;

      // 🟢 עדכון עם הנתונים האמיתיים מהשרת (כולל slug וכו')
      const finalExist = itemsExist.map((i) =>
        (typeof i === "object" ? i.id : i) === itemId ? serverItem : i
      );
      setItemsExist(finalExist);

      // ✅ עדכון ה-store הגלובלי לפי סוג הטקסונומיה
      if (isCoreTax) {
        updateTaxonomy(columnName, finalExist);
      } else {
        customStore.setList(taxonomyNameForStore, finalExist);
      }

      // עדכון הנבחרים עם נתוני השרת
      const finalSelected = itemsProduct.map((i) => {
        const selId = typeof i === "object" ? i.id : i;
        return String(selId) === String(itemId) ? serverItem : i;
      });
      setItemsProduct(finalSelected);

      if (setCombinedIdEndName && Array.isArray(combinedIdEndName)) {
        setCombinedIdEndName(
          combinedIdEndName.map((i) =>
            (typeof i === "object" ? i.id : i) === itemId ? serverItem : i
          )
        );
      }

      toast.success(`${__(`The ${objectSingular} has been successfully updated to `, "whizmanage")} ${serverItem.name}`);
    } catch (error) {
      // 🔴 שחזור הערכים הקודמים במקרה של שגיאה
      setItemsExist(previousItemsExist);
      setItemsProduct(previousItemsProduct);
      if (previousCombined && setCombinedIdEndName) {
        setCombinedIdEndName(previousCombined);
      }

      toast.error(__("Failed to update item", "whizmanage"));
      console.log("Error editing item", error);
    }
  };

  const addSubcategory = async () => {
    if (!newSubcategoryName.trim()) return;

    setIsSubmitting(true);

    const itemData = {
      name: newSubcategoryName.trim(),
      parent: itemId,
    };

    // ✅ קביעת ה-URL לפי סוג הטקסונומיה
    let url;
    if (isCoreTax) {
      url = `${window.siteUrl}/wp-json/wc/v3/products/${columnName}`;
    } else {
      url = `${window.siteUrl}/wp-json/whizmanage/v1/taxonomy/${taxonomyNameForStore}/term`;
    }

    // תגיות לא תומכות ב-parent
    if (columnName === "tags") {
      delete itemData.parent;
    }

    try {
      const res = await postApi(url, itemData);
      const newItem = res?.data;

      if (newItem) {
        // הוספת התת-קטגוריה מיד אחרי הקטגוריה האב
        setItemsExist((prev) => {
          const updatedItems = [...prev];
          const parentIndex = updatedItems.findIndex(
            (cat) => cat.id === itemId
          );

          if (parentIndex !== -1) {
            let insertIndex = parentIndex + 1;

            // מצא את המיקום הנכון - אחרי כל התת-קטגוריות הקיימות
            while (
              insertIndex < updatedItems.length &&
              updatedItems[insertIndex].parent === itemId
            ) {
              insertIndex++;
            }

            newItem.depth = (updatedItems[parentIndex].depth || 0) + 1;
            updatedItems.splice(insertIndex, 0, newItem);
            return updatedItems;
          }

          return [...updatedItems, newItem];
        });

        // ✅ עדכון ה-store הגלובלי לפי סוג הטקסונומיה
        if (isCoreTax) {
          updateTaxonomy(columnName, (prev) => {
            if (!Array.isArray(prev)) return [newItem];
            return [...prev, newItem];
          });
        } else {
          const currentList = customStore.select(taxonomyNameForStore) || [];
          customStore.setList(taxonomyNameForStore, [...currentList, newItem]);
        }

        toast.success(`${__("Subcategory", "whizmanage")} "${newItem.name}" ${__("was added successfully", "whizmanage")}`);
      }
    } catch (error) {
      console.error("Error adding subcategory:", error);
      toast.error(__("Failed to add subcategory", "whizmanage"));
    } finally {
      setIsSubmitting(false);
      setIsAddingSubcategory(false);
      setNewSubcategoryName("");
    }
  };

  const deleteItem = async () => {
    const isConfirmed = await confirm({
      title: __("Delete Item", "whizmanage"),
      message: `${__("Are you sure you want to permanently delete this", "whizmanage")} "${itemName}"?`,
      confirmText: __("Delete", "whizmanage"),
      cancelText: __("Cancel", "whizmanage"),
    });

    if (!isConfirmed) return;

    try {
      // ✅ קביעת ה-URL לפי סוג הטקסונומיה
      const url = isCoreTax
        ? `${window.siteUrl}/wp-json/wc/v3/products/${apiSlug}/${itemId}`
        : `${window.siteUrl}/wp-json/whizmanage/v1/taxonomy/${taxonomyNameForStore}/term/${itemId}`;
      await deleteApi(url);

      toast.success(`${__("The", "whizmanage")} ${itemName} ${__("has been permanently deleted", "whizmanage")}.`);

      // להסיר מהרשימה
      const updated = itemsExist.filter((existItem) => {
        const existId =
          typeof existItem === "object" ? existItem.id : existItem;
        return String(existId) !== String(itemId);
      });
      setItemsExist(updated);

      // ✅ עדכון ה-store הגלובלי לפי סוג הטקסונומיה
      if (isCoreTax) {
        updateTaxonomy(columnName, updated);
      } else {
        customStore.setList(taxonomyNameForStore, updated);
      }

      // להסיר מהנבחרים – גם אם הם מספרים
      const updatedSelected = itemsProduct.filter((productItem) => {
        const pId =
          typeof productItem === "object" ? productItem.id : productItem;
        return String(pId) !== String(itemId);
      });
      setItemsProduct(updatedSelected);
    } catch (error) {
      console.log("Error deleting item", error);
    }
  };

  const getPaddingClass = (depth) => {
    switch (depth) {
      case 0:
        return "pl-0 ";
      case 1:
        return "pl-4 rtl:pr-4";
      case 2:
        return "pl-8 rtl:pr-8";
      case 3:
        return "pl-12 rtl:pr-12";
      case 4:
        return "pl-16 rtl:pr-16";
      case 5:
        return "pl-20 rtl:pr-20";
      default:
        return "pl-0 ";
    }
  };

  // בדיקה האם זה קטגוריות (לא תגיות) - רק קטגוריות תומכות בהיררכיה
  const isCategories = columnName === "categories";

  return (
    <div className="flex flex-col">
      <CommandItem
        className="cursor-pointer h-8 dark:hover:bg-slate-700 group/item flex justify-between"
        key={itemId}
        value={`${itemName || ""} ${itemId || ""}`}
        disabled={disabled}
        onSelect={() => {
          if (disabled || isAddingSubcategory) return;

          setItemsProduct((prev) => {
            const already = prev?.some((existingItem) => {
              const exId =
                typeof existingItem === "object" ? existingItem.id : existingItem;
              return String(exId) === String(itemId);
            });

            let next;
            if (already) {
              // הסרה
              next = prev.filter((existingItem) => {
                const exId =
                  typeof existingItem === "object"
                    ? existingItem.id
                    : existingItem;
                return String(exId) !== String(itemId);
              });
            } else {
              // הוספה - אובייקט מלא עם name לתצוגה נכונה
              next = [...prev, item];
            }

            if (row && row.original) {
              row.original[columnName] = next.map((x) =>
                typeof x === "object" ? x.id : x
              );
            }

            return next;
          });
        }}
      >
        {isEditItem ? (
          <div className="flex gap-2 w-full">
            <Input
              onChange={(e) => {
                e.stopPropagation();
                setNewName(e.target.value);
              }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter" && newName.trim() && newName !== itemName) {
                  editItem();
                } else if (e.key === "Escape") {
                  setIsEditItem(false);
                  setNewName("");
                }
              }}
              value={newName}
              className="h-8 w-full"
              autoFocus
            />
            {newName.trim() && newName !== itemName ? (
              <CustomTooltip title={__("Save", "whizmanage")} instantClose>
                <Button
                  variant="outline"
                  className="h-8 rounded-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    editItem();
                  }}
                >
                  {__("Save", "whizmanage")}
                </Button>
              </CustomTooltip>
            ) : (
              <CustomTooltip title={__("Cancel", "whizmanage")} instantClose>
                <Button
                  variant="outline"
                  className="h-8 rounded-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditItem(false);
                    setNewName("");
                  }}
                >
                  <Undo2 className="w-4 h-4" />
                </Button>
              </CustomTooltip>
            )}
          </div>
        ) : (
          <div className="flex !justify-between w-full items-center">
            <div className="flex gap-2 items-center">
              <Check
                className={cn(
                  "h-4 w-4 transition-opacity",
                  isSelected ? "opacity-100" : "opacity-0"
                )}
              />
              <span className={cn("flex-1", getPaddingClass(item.depth))}>
                {itemName.replace(/\\/g, "").replace(/"/g, "''")}
              </span>
            </div>
            <div className="hidden group-hover/item:flex gap-1 !max-w-fit">
              {/* כפתור הוספת תת-קטגוריה - רק לקטגוריות */}
              {isCategories && (allowSubcategory || true) && (
                <CustomTooltip title={__("Add subcategory", "whizmanage")} instantClose>
                  <Button
                    size="icon"
                    variant="outline"
                    className="w-6 h-6"
                    disabled={disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (disabled) return;
                      setIsAddingSubcategory(true);
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </CustomTooltip>
              )}
              <CustomTooltip title={__("Edit", "whizmanage")} instantClose>
                <Button
                  size="icon"
                  variant="outline"
                  className="w-6 h-6"
                  disabled={disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (disabled) return;
                    setNewName(itemName);
                    setIsEditItem(true);
                  }}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              </CustomTooltip>
              <CustomTooltip title={__("Delete", "whizmanage")} instantClose>
                <Button
                  size="icon"
                  variant="outline"
                  className="w-6 h-6"
                  disabled={disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (disabled) return;
                    deleteItem();
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CustomTooltip>
            </div>
          </div>
        )}
      </CommandItem>
      {/* טופס הוספת תת-קטגוריה */}
      {isAddingSubcategory && (
        <div
          className={cn(
            "flex gap-2 items-center px-2 py-1.5 bg-slate-50 dark:bg-slate-700/50 border-t border-slate-200 dark:border-slate-600",
            getPaddingClass((item.depth || 0) + 1)
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <Input
            type="text"
            value={newSubcategoryName}
            placeholder={__("Subcategory name", "whizmanage")}
            className="h-7 text-sm flex-1"
            onChange={(e) => setNewSubcategoryName(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter" && newSubcategoryName.trim()) {
                addSubcategory();
              } else if (e.key === "Escape") {
                setIsAddingSubcategory(false);
                setNewSubcategoryName("");
              }
            }}
            autoFocus
          />
          {newSubcategoryName.trim() ? (
            <CustomTooltip title={__("Add", "whizmanage")} instantClose>
              <Button
                variant="outline"
                className="h-7 rounded-sm text-xs px-2"
                onClick={addSubcategory}
                disabled={isSubmitting}
              >
                {isSubmitting ? "..." : __("Add", "whizmanage")}
              </Button>
            </CustomTooltip>
          ) : (
            <CustomTooltip title={__("Cancel", "whizmanage")} instantClose>
              <Button
                variant="outline"
                className="h-7 rounded-sm px-2"
                onClick={() => {
                  setIsAddingSubcategory(false);
                  setNewSubcategoryName("");
                }}
              >
                <Undo2 className="w-4 h-4" />
              </Button>
            </CustomTooltip>
          )}
        </div>
      )}
    </div>
  );
};

export default MultiSelectEditItem;
