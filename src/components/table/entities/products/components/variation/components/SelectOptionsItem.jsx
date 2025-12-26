// src/components/table/products/components/variation/components/SelectOptionsItem.jsx

import { cn, toast } from "@/lib/utils";
import Button from "@components/ui/button";
import { CommandItem } from "@components/ui/command";
import { Input } from "@components/ui/input";
import CustomTooltip from "@components/ui/nextUI/Tooltip.jsx";
import { Check, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
 import { __ } from "@wordpress/i18n";
import { useVariationsStore } from "../store/variationsStore";
import { postApi } from "/src/services/services";

/**
 * 🎯 SelectOptionsItem - פריט אופציה בודד
 *
 * שיפורים מהגירסה הישנה:
 * ✅ עריכה ומחיקה של אופציות
 * ✅ תמיכה ב-Enter/Escape
 * ✅ עדכון אוטומטי של allAttributes
 * ✅ UI משופר
 *
 * @param {Object} props
 * @param {Object} props.product - המוצר
 * @param {string} props.item - האופציה (string או object)
 * @param {Object} props.attribute - התכונה
 * @param {number} props.optionIndex - אינדקס האופציה
 * @param {number} props.attributeIndex - אינדקס התכונה
 * @param {Function} props.setOpen - פונקציה לשליטה ב-Popover
 */
const SelectOptionsItem = ({
  product,
  item,
  itemsExist,
  setItemsExist,
  attribute,
  optionIndex,
  attributeIndex,
  setOpen,
}) => {
  const [isEditItem, setIsEditItem] = useState(false);
  const [newName, setNewName] = useState("");
   

  // Store
  const { selectedAttributes, setSelectedAttributes, setAllAttributes } =
    useVariationsStore();

  /**
   * ✅ עריכת אופציה
   */
  const editItem = async () => {
    if (optionIndex < 0 || optionIndex >= itemsExist.length) {
      console.error("Invalid option index");
      return;
    }

    if (!newName.trim()) {
      toast.error(__("Option name cannot be empty", "whizmanage"));
      return;
    }

    const oldName = itemsExist[optionIndex];
    const updatedOptions = itemsExist.map((option, idx) =>
      idx === optionIndex ? newName.trim() : option
    );

    // 🟢 עדכון אופטימי מיידי - לפני הקריאה לשרת
    setItemsExist(updatedOptions);
    setIsEditItem(false);
    setNewName("");

    try {
      const data = {
        update: [
          {
            id: product.id,
            attributes: product.attributes.map((attr) =>
              attr.id === attribute.id
                ? { ...attr, options: updatedOptions }
                : attr
            ),
          },
        ],
      };

      const response = await postApi(
        `${window.siteUrl}/wp-json/wc/v3/products/batch`,
        data
      );

      // עדכון product.attributes
      product.attributes = response?.data.update[0].attributes;

      // ✅ סנכרון allAttributes
      setAllAttributes((prev) => {
        const productAttributes = product.attributes;
        const prevIds = new Set(productAttributes.map((attr) => attr.id));
        const filteredPrev = prev.filter((attr) => !prevIds.has(attr.id));
        return [...productAttributes, ...filteredPrev];
      });

      // ✅ עדכון selectedAttributes - החלפת השם הישן בחדש
      const updatedSelectedAttributes = selectedAttributes.map((attr, idx) => {
        if (idx === attributeIndex) {
          return {
            ...attr,
            options: attr.options.map((opt) =>
              opt === oldName ? newName.trim() : opt
            ),
          };
        }
        return attr;
      });
      setSelectedAttributes(updatedSelectedAttributes);

      toast.success(`${__("The options has been successfully updated to", "whizmanage")} "${newName.trim()}".`);
    } catch (error) {
      // 🔴 שחזור במקרה של שגיאה
      setItemsExist(itemsExist);
      console.error("Error editing options", error);
      toast.error(
        error?.response?.data?.message || __("Failed to update option", "whizmanage")
      );
    }
  };

  /**
   * ✅ מחיקת אופציה
   */
  const deleteItem = async () => {
    const deletedOption = itemsExist[optionIndex];
    const updatedOptions = itemsExist.filter(
      (existItem, idx) => idx !== optionIndex
    );

    // 🟢 עדכון אופטימי מיידי
    const previousItemsExist = [...itemsExist];
    setItemsExist(updatedOptions);

    const data = {
      update: [
        {
          id: product.id,
          attributes: product.attributes.map((attr) =>
            attr.id === attribute.id
              ? { ...attr, options: updatedOptions }
              : attr
          ),
        },
      ],
    };

    try {
      const updateRes = await postApi(
        `${window.siteUrl}/wp-json/wc/v3/products/batch`,
        data
      );

      // עדכון product.attributes
      product.attributes = updateRes?.data.update[0].attributes;

      // ✅ סנכרון allAttributes
      setAllAttributes((prev) => {
        const productAttributes = product.attributes;
        const prevIds = new Set(productAttributes.map((attr) => attr.id));
        const filteredPrev = prev.filter((attr) => !prevIds.has(attr.id));
        return [...productAttributes, ...filteredPrev];
      });

      // ✅ הסרת האופציה מ-selectedAttributes
      const updatedSelectedAttributes = selectedAttributes.map((attr, idx) => {
        if (idx === attributeIndex) {
          return {
            ...attr,
            options: attr.options.filter((opt) => opt !== deletedOption),
          };
        }
        return attr;
      });
      setSelectedAttributes(updatedSelectedAttributes);

      toast.success(`${__("The option", "whizmanage")} "${item}" ${__("has been successfully deleted", "whizmanage")}.`);
    } catch (error) {
      // 🔴 שחזור במקרה של שגיאה
      setItemsExist(previousItemsExist);
      console.error("Error deleting option", error);
      toast.error(
        error?.response?.data?.message || __("Failed to delete option", "whizmanage")
      );
    }
  };

  /**
   * בחירה/ביטול בחירה של אופציה
   */
  const onSelectOption = (item) => {
    const updatedSelectedAttributes = selectedAttributes.map((attr, idx) => {
      if (idx === attributeIndex) {
        const isAlreadySelected = attr.options.some((t) =>
          t.id ? t.id === item.id : t === item
        );

        const newSelectedOptions = isAlreadySelected
          ? attr.options.filter((t) => (t.id ? t.id !== item.id : t !== item))
          : [...attr.options, item];

        return {
          ...attr,
          options: newSelectedOptions,
        };
      }
      return attr;
    });

    setSelectedAttributes(updatedSelectedAttributes);
    setOpen(true); // שומר על ה-Popover פתוח
  };

  return (
    <CommandItem
      className="cursor-pointer dark:hover:bg-slate-700 group/item flex gap-2 justify-between min-h-9"
      key={`${attribute.id}-${optionIndex}-${item}`}
      onSelect={() => onSelectOption(item)}
    >
      {/* ✅ מצב עריכה */}
      {isEditItem ? (
        <div className="flex gap-2 w-full" onClick={(e) => e.stopPropagation()}>
          <Input
            onChange={(e) => {
              e.stopPropagation();
              setNewName(e.target.value);
            }}
            defaultValue={item}
            className="h-8 w-full"
            onFocus={(event) => {
              event.target.select();
              event.stopPropagation();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newName.trim()) {
                editItem();
              } else if (e.key === "Escape") {
                setIsEditItem(false);
                setNewName("");
              }
            }}
          />
          <Button
            variant="outline"
            className="h-8"
            onClick={(e) => {
              e.stopPropagation();
              editItem();
            }}
          >
            {__("Save", "whizmanage")}
          </Button>
        </div>
      ) : (
        <>
          {/* ✅ סימון בחירה */}
          <Check
            className={cn(
              "mr-2 size-4 flex-shrink-0",
              selectedAttributes[attributeIndex]?.options.some(
                (t) => t === item
              )
                ? "opacity-100"
                : "opacity-0"
            )}
          />

          {/* ✅ שם האופציה */}
          <span className="flex-1 truncate">
            {item.replace(/\\/g, "").replace(/"/g, "''")}
          </span>

          <span className="sr-only">{optionIndex}</span>

          {/* ✅ כפתורי עריכה/מחיקה */}
          <div className="hidden group-hover/item:flex gap-1 flex-shrink-0">
            <CustomTooltip title={__("Edit option", "whizmanage")} instantClose>
              <Button
                size="icon"
                variant="outline"
                className="w-6 h-6"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditItem(true);
                  setNewName(item);
                }}
              >
                <Pencil className="w-3 h-3" />
              </Button>
            </CustomTooltip>
            <CustomTooltip title={__("Delete option", "whizmanage")} instantClose>
              <Button
                size="icon"
                variant="outline"
                className="w-6 h-6 hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-900/20"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteItem();
                }}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </CustomTooltip>
          </div>
        </>
      )}
    </CommandItem>
  );
};

export default SelectOptionsItem;
