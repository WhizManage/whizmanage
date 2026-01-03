// src/components/table/products/components/variation/components/SelectAttributeItem.jsx

import { cn } from "@/lib/utils";
import { confirm } from "@components/ui/custom/CustomConfirm";
import Button from "@components/ui/button";
import { CommandItem } from "@components/ui/command";
import { Input } from "@components/ui/input";
import { Checkbox } from "@components/ui/checkbox";
import { toast } from "@/lib/utils";
import { Check, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
 import { __ } from "@wordpress/i18n";
import { useVariationsStore } from "../store/variationsStore";
import { deleteApi, putApi, postApi } from "/src/services/services";

const decodeUrlString = (encodedString) => {
  try {
    return decodeURIComponent(encodedString);
  } catch (e) {
    console.error("Error decoding URL component:", e);
    return encodedString;
  }
};

/**
 * 🎯 SelectAttributeItem - פריט תכונה בבחירה
 *
 * 🔥 תיקון באג קריטי: כשמוסיפים תכונה גלובלית, חייבים להוסיף אותה גם ל-product.attributes!
 */
const SelectAttributeItem = ({
  item,
  ItemsExist,
  setItemsExist,
  selectedAttributes,
  setSelectedAttributes,
  setOpen,
  setDropdownOpen,
  variationMood,
  product, // 🔥 חדש: צריך את product כדי לעדכן את attributes
  // 🆕 Multi-select props
  multiSelectMode,
  checkedItems,
  setCheckedItems,
}) => {
  const [isEditItem, setIsEditItem] = useState(false);
  const [newName, setNewName] = useState("");
  const isRTL = window?.document?.documentElement?.dir === "rtl";
   

  const { mode, setAllAttributes } = useVariationsStore();

  const editItem = async () => {
    const url = `${window.siteUrl}/wp-json/wc/v3/products/attributes/${item.id}`;
    const itemData = {
      name: decodeUrlString(newName),
    };

    try {
      const response = await putApi(url, itemData);
      const updatedItem = response.data;

      setItemsExist(
        ItemsExist.map((i) => (i.id === item.id ? updatedItem : i))
      );

      toast.success(`${__("The attribute has been successfully updated to", "whizmanage")} "${updatedItem.name}".`);

      setIsEditItem(false);
      setNewName("");
    } catch (error) {
      console.error("Error editing item", error);
      toast.error(__("Failed to update attribute", "whizmanage"));
    }
  };

  const deleteItem = async () => {
    const isConfirmed = await confirm({
      title: __("Delete attribute", "whizmanage"),
      message: __(
        `Are you sure you want to permanently delete this attribute?`,
        "whizmanage"
      ),
      confirmText: __("Delete", "whizmanage"),
      cancelText: __("Cancel", "whizmanage"),
    });

    if (isConfirmed) {
      const url = `${window.siteUrl}/wp-json/wc/v3/products/attributes/${item.id}`;

      try {
        await deleteApi(url);

        toast.success(`${__("The attribute", "whizmanage")} ${item.name} ${__("has been permanently deleted", "whizmanage")}`);

        setItemsExist(
          ItemsExist.filter((existItem) => existItem.id !== item.id)
        );
      } catch (error) {
        console.error("Error deleting item", error);
        toast.error(__("Failed to delete attribute", "whizmanage"));
      }
    }
  };

  /**
   * 🔥 תיקון באג קריטי: הוספת תכונה גלובלית
   *
   * הבעיה: התכונה התווספה רק ל-Store, לא ל-product.attributes!
   * הפתרון: להוסיף גם ל-product.attributes ב-WooCommerce
   */
  const handleSelect = async () => {
    const variationFlag = mode === "full" ? true : false;

    const newItem = {
      ...item,
      variation: variationFlag,
      options: [], // 🔥 רשימה 2 מתחילה ריקה!
      visible: true,
    };

    // 1️⃣ הוספה ל-Store (selectedAttributes)
    setSelectedAttributes((prev) => {
      return [...prev, newItem];
    });

    // 2️⃣ 🔥 חדש: הוספה גם ל-product.attributes!
    if (product && product.id) {
      try {
        const updatedAttributes = [
          ...product.attributes,
          {
            id: item.id,
            name: item.name,
            slug: item.slug,
            options: [], // 🔥 רשימה 2 ריקה בהתחלה
            position: product.attributes.length,
            variation: variationFlag,
            visible: true,
          },
        ];

        const data = {
          update: [
            {
              id: product.id,
              attributes: updatedAttributes,
            },
          ],
        };

        const updateRes = await postApi(
          `${window.siteUrl}/wp-json/wc/v3/products/batch`,
          data
        );

        // 3️⃣ עדכון product.attributes מהשרת
        product.attributes = updateRes?.data.update[0].attributes;

        // 4️⃣ סנכרון allAttributes (Store)
        setAllAttributes((prev) => {
          const productAttributes = product.attributes;
          const prevIds = new Set(productAttributes.map((attr) => attr.id));
          const filteredPrev = prev.filter((attr) => !prevIds.has(attr.id));
          return [...productAttributes, ...filteredPrev];
        });

      } catch (error) {
        console.error("Error adding attribute to product:", error);
        toast.error(
          error?.response?.data?.message || __("Failed to add attribute to product", "whizmanage")
        );
        // במקרה של שגיאה, מבטלים את ההוספה ל-Store
        setSelectedAttributes((prev) => 
          prev.filter(attr => attr.id !== item.id)
        );
        return;
      }
    }

    setOpen(false);
    setDropdownOpen(false);
  };

  const isSelected = selectedAttributes.some(
    (attr) =>
      item.id === 0
        ? attr.name === item.name
        : attr.id === item.id
  );

  // 🆕 Check if item is in checkedItems for multi-select
  const isChecked = checkedItems?.some(
    (checkedItem) =>
      item.id === 0
        ? checkedItem.name === item.name
        : checkedItem.id === item.id
  );

  // 🆕 Handle checkbox change for multi-select
  const handleCheckboxChange = (checked) => {
    if (!setCheckedItems) return;

    if (checked) {
      // Add to checked items
      setCheckedItems((prev) => [...prev, item]);
    } else {
      // Remove from checked items
      setCheckedItems((prev) =>
        prev.filter((checkedItem) =>
          item.id === 0
            ? checkedItem.name !== item.name
            : checkedItem.id !== item.id
        )
      );
    }
  };

  return (
    <CommandItem
      className="cursor-pointer dark:hover:bg-slate-700 group/item flex justify-between min-h-9"
      key={item.name + item.id}
      onSelect={handleSelect}
      disabled={isSelected}
    >
      {isEditItem ? (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Input
            onChange={(e) => {
              e.stopPropagation();
              setNewName(e.target.value);
            }}
            defaultValue={item.name}
            className="h-8 w-full"
            onFocus={(event) => event.target.select()}
          />
          <Button
            variant="outline"
            className="h-8"
            onClick={(e) => {
              e.stopPropagation();
              editItem();
              setIsEditItem(false);
            }}
          >
            {__("Save", "whizmanage")}
          </Button>
        </div>
      ) : (
        <>
          {/* Icon area - shows Check if selected, Checkbox on hover if multi-select enabled */}
          <div
            className={cn(
              "size-4 flex items-center justify-center shrink-0",
              isRTL ? "ml-2" : "mr-2"
            )}
            onClick={(e) => {
              if (multiSelectMode && !isSelected) {
                e.stopPropagation();
              }
            }}
          >
            {isSelected ? (
              // Already selected - show check mark
              <Check className="size-4" />
            ) : multiSelectMode ? (
              // Multi-select mode - show checkbox on hover or if checked
              <div
                className={cn(
                  "hidden group-hover/item:flex items-center justify-center",
                  isChecked && "!flex"
                )}
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={handleCheckboxChange}
                  className="size-4"
                />
              </div>
            ) : (
              // Not selected and not multi-select - empty space
              <span className="opacity-0">
                <Check className="size-4" />
              </span>
            )}
          </div>
          <span className="flex-1">
            {decodeUrlString(item.name.replace(/\\/g, "").replace(/"/g, "''"))}
          </span>
          <span className="sr-only">{item.id}</span>

          {item.id !== 0 && (
            <div className="hidden group-hover/item:flex gap-1 !max-w-fit">
              <Button
                size="icon"
                variant="outline"
                className="w-6 h-6"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditItem(true);
                }}
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="w-6 h-6"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteItem();
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </CommandItem>
  );
};

export default SelectAttributeItem;