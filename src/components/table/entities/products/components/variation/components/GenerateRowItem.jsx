// src/components/table/products/components/variation/components/GenerateRowItem.jsx

import CustomTooltip from "@components/ui/nextUI/Tooltip";
import { Switch } from "@components/ui/switch";
import { Chip } from "@heroui/react";
import { GripVertical, Minus } from "lucide-react";
 import { __ } from "@wordpress/i18n";
import { useVariationsStore } from "../store/variationsStore";
import SelectGlobalOptions from "./SelectGlobalOptions";
import SelectProductOptions from "./SelectProductOptions";
import { putApi } from "/src/services/services";

// dnd-kit (sortable row)
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/**
 * 🎯 GenerateRowItem - שורה בודדת בטבלת attributes
 *
 * תכונות:
 * ✅ ניתנת לגרירה (drag & drop)
 * ✅ מחיקת attribute
 * ✅ toggle "For variations"
 * ✅ ניהול אופציות (גלובלית/מוצר)
 * ✅ הצגת chips של אופציות נבחרות
 *
 * @param {Object} props
 * @param {string} props.id - מזהה ייחודי לשורה (לdnd)
 * @param {number} props.index - אינדקס בmערך
 * @param {Object} props.attribute - התכונה
 * @param {Object} props.product - המוצר
 */
export default function GenerateRowItem({ id, index, attribute, product }) {
   
  const isRTL = window?.document?.documentElement?.dir === "rtl";


  // Store
  const { selectedAttributes, setSelectedAttributes, setAllAttributes } =
    useVariationsStore();

  /**
   * ✅ hook של dnd על השורה
   */
  const {
    setNodeRef,
    attributes: dndAttributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const rowStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const rowClassName = isDragging ? "opacity-60 bg-fuchsia-600/5" : "";

  /**
   * ✅ הסרת Chip (אופציה ספציפית)
   */
  const handleClose = (itemToRemove) => {
    const newSelectedAttributes = [...selectedAttributes];

    if (newSelectedAttributes[index]) {
      newSelectedAttributes[index] = {
        ...newSelectedAttributes[index],
        options: newSelectedAttributes[index].options.filter((option) =>
          option?.name ? option.name !== itemToRemove : option !== itemToRemove
        ),
      };
    }

    setSelectedAttributes(newSelectedAttributes);
  };

  /**
   * ✅ מחיקת Attribute
   */
  const handleRemoveAttribute = async () => {
    const filteredAttributes = selectedAttributes.filter(
      (_, attrIndex) => attrIndex !== index
    );

    setAllAttributes?.((prev) =>
      prev.filter((_, attrIndex) => attrIndex !== index)
    );

    setSelectedAttributes(filteredAttributes);

    // ✅ עדכון ב-WooCommerce
    const url = `${window.siteUrl}/wp-json/wc/v3/products/${product.id}`;
    const itemData = {
      attributes: product.attributes.filter(
        (_, attrIndex) => attrIndex !== index
      ),
    };

    try {
      const response = await putApi(url, itemData);
      product.attributes = response.data.attributes;
    } catch (error) {
      console.error(
        "Error editing options",
        error?.response?.data?.message || error || "Unknown error occurred"
      );
    }
  };

  return (
    <tr
      ref={setNodeRef}
      style={rowStyle}
      className={`hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-300 hover:text-slate-600 dark:hover:text-slate-300 transition-all ${rowClassName}`}
      {...dndAttributes}
    >
      {/* ✅ כפתור גרירה */}
      <td className="px-2">
        <div
          className="h-6 w-6 flex justify-center items-center cursor-grab active:cursor-grabbing"
          {...listeners}
        >
          <GripVertical className="w-4 h-4 text-slate-400" />
        </div>
      </td>
      {/* ✅ שם Attribute */}
      <td className="px-2">{attribute.name}</td>
      {/* ✅ סוג (גלובלית/מוצר) */}
      <td className="px-2">{attribute.id == 0 ? __("Product", "whizmanage") : __("Global", "whizmanage")}</td>
      {/* ✅ Toggle "For variations" */}
      <td className="px-2">
        <Switch
          dir={isRTL ? "rtl" : "ltr"}
          checked={attribute.variation === true}
          onCheckedChange={(isSelected) => {
            const newSelectedAttributes = [...selectedAttributes];
            newSelectedAttributes[index] = {
              ...newSelectedAttributes[index],
              variation: isSelected,
            };
            setSelectedAttributes(newSelectedAttributes);
          }}
        />
      </td>
      {/* ✅ ניהול אופציות + הצגת Chips */}
      <td
        className="px-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-4 items-center">
          {/* כפתור הוספה/עריכה */}
          {attribute.id == 0 ? (
            <SelectProductOptions
              product={product}
              attribute={attribute}
              index={index}
            />
          ) : (
            <SelectGlobalOptions
              product={product}
              attribute={attribute}
              index={index}
            />
          )}

          {/* הצגת Chips */}
          <div className="flex flex-wrap gap-2 relative min-h-10 items-center">
            {selectedAttributes[index]?.options?.length < 1 ? (
              <span className="flex gap-1 items-center text-slate-400">
                <span>{__("Any", "whizmanage")}</span>
                <span>{attribute.name}</span>
              </span>
            ) : (
              selectedAttributes[index].options.map((option, idx) => (
                <Chip
                  key={idx}
                  onClose={() => handleClose(option.name ? option.name : option)}
                  variant="flat"
                  classNames={{
                    base: "bg-gradient-to-br from-fuchsia-50 dark:from-slate-700 to-fuchsia-200 dark:to-slate-600 opacity-100",
                    content: "text-fuchsia-600 dark:text-slate-300",
                    closeButton: "text-fuchsia-600 dark:text-slate-300",
                  }}
                >
                  {option.name ? option.name : option}
                </Chip>
              ))
            )}
          </div>
        </div>
      </td>
      {/* ✅ כפתור מחיקת Attribute */}
      <td className="px-2 w-10">
        <CustomTooltip title={__("Delete attribute", "whizmanage")}>
          <div
            className="h-6 w-6 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-400 text-slate-400 dark:hover:text-slate-200 flex justify-center items-center cursor-pointer whitespace-nowrap"
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveAttribute();
            }}
          >
            <Minus className="w-4 h-4 text-fuchsia-600" />
          </div>
        </CustomTooltip>
      </td>
    </tr>
  );
}
