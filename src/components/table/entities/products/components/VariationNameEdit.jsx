// src/components/table/products/components/variation/components/VariationNameEdit.jsx

import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@heroui/react";
import { Check, ChevronDown } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@components/ui/input";

const normalizeValue = (value) => {
  if (!value) return "";
  return value
    .replace(/-/g, " ")
    .replace(/['"]/g, "")
    .trim();
};

/**
 * VariationNameEdit - עורך שם מוצר/ווריאציה
 * תומך ב-EditableCell props + עיצוב Popover מקורי
 *
 * ✅ שמירה רק ב-blur - כמו שאר התאים בטבלה
 * המשתמש יכול לערוך כמה attributes ורק כשיוצא מהתא הכל נשמר
 */
const VariationNameEdit = ({
  value,
  onChange,
  onFinish,
  onCancel,
  onDirectUpdate,
  isLoading,
  error,
  inputRef,
  __,
  row,
  cell
}) => {
  const isVariation = row?.depth > 0;
  const [localValue, setLocalValue] = useState(value || "");

  // עבור ווריאציות
  const attributes = row?.original?.attributes || [];
  const [selectedOptions, setSelectedOptions] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const containerRef = useRef(null);
  const isPopoverOpenRef = useRef(false); // ✅ עוקב אם יש Popover פתוח

  useEffect(() => {
    if (isVariation && attributes.length > 0) {
      const initial = {};
      attributes.forEach((attr, index) => {
        initial[index] = attr.option || "";
      });
      setSelectedOptions(initial);
    }
  }, [isVariation, attributes]);

  // טיפול במוצר רגיל
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange?.(newValue);
  };

  const handleInputBlur = async () => {
    if (localValue !== value && onDirectUpdate) {
      try {
        await onDirectUpdate(localValue);
      } catch (error) {
        console.error("Failed to update name:", error);
        onCancel?.();
      }
    } else {
      onFinish?.();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleInputBlur();
    } else if (e.key === "Escape") {
      onCancel?.();
    }
  };

  // ✅ שמירה לשרת רק כשיוצאים מהתא
  const saveChanges = useCallback(async () => {
    if (!hasChanges || !onDirectUpdate) {
      onFinish?.();
      return;
    }

    // בנה attributes מעודכנים מה-state המקומי
    const updatedAttributes = attributes.map((a, i) => ({
      ...a,
      option: selectedOptions[i] !== undefined ? selectedOptions[i] : (a.option || "")
    }));

    try {
      await onDirectUpdate(updatedAttributes, "attributes");
    } catch (err) {
      console.error("❌ Failed to update variation:", err);
      onCancel?.();
    }
  }, [hasChanges, selectedOptions, attributes, onDirectUpdate, onFinish, onCancel]);

  // ✅ טיפול ב-blur מהcontainer כולו
  const handleContainerBlur = useCallback((e) => {
    // אם יש Popover פתוח, אל תצא ממצב עריכה
    if (isPopoverOpenRef.current) {
      return;
    }

    // בדוק אם הפוקוס עבר לאלמנט מחוץ לcontainer
    const relatedTarget = e.relatedTarget;
    if (containerRef.current && !containerRef.current.contains(relatedTarget)) {
      // הפוקוס עזב את התא - שמור את השינויים
      saveChanges();
    }
  }, [saveChanges]);

  // אם זה מוצר רגיל - Input רגיל
  if (!isVariation) {
    return (
      <Input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        autoFocus
        className={cn(
          "h-8 text-sm focus:ring-2 focus:ring-fuchsia-500 w-full",
          isLoading && "opacity-50 cursor-not-allowed",
          error && "border-red-500"
        )}
        placeholder={__("Product name", "whizmanage")}
      />
    );
  }

  // 🔥 קבל את המוצר האב (parentRow)
  const parentRow = row.getParentRow();
  const parentAttributes = parentRow?.original?.attributes || [];

  // ווריאציה - Popovers עם העיצוב המקורי
  return (
    <div
      ref={containerRef}
      className="flex gap-2 items-center flex-wrap"
      onBlur={handleContainerBlur}
      tabIndex={-1}
    >
      {attributes.map((attr, index) => {
        // 🎯 מצא את ה-attribute התואם במוצר האב
        const parentAttr = parentAttributes.find(
          pa => pa.id === attr.id || pa.slug === attr.slug || pa.name === attr.name
        );

        // קח את ה-options מהמוצר האב!
        const options = parentAttr?.options || [];

        return (
          <AttributePopover
            key={`${attr.id || attr.name}-${index}`}
            attribute={{ ...attr, options }}
            index={index}
            value={selectedOptions[index] !== undefined ? selectedOptions[index] : (attr.option || "")}
            onChange={(newValue) => {
              // ✅ עדכון מקומי בלבד - בלי קריאה לשרת
              setSelectedOptions(prev => ({
                ...prev,
                [index]: newValue
              }));
              setHasChanges(true);

              // עדכון ה-onChange לצורך תצוגה מיידית
              const updatedAttributes = attributes.map((a, i) => ({
                ...a,
                option: i === index ? newValue : (selectedOptions[i] !== undefined ? selectedOptions[i] : (a.option || ""))
              }));
              onChange?.(updatedAttributes);
            }}
            isLoading={isLoading}
            __={__}
            isPopoverOpenRef={isPopoverOpenRef}
          />
        );
      })}
    </div>
  );
};

/**
 * AttributePopover - Popover בודד לכל attribute
 * ✅ סוגר את הPopover אחרי בחירה אבל לא יוצא ממצב עריכה
 */
const AttributePopover = ({ attribute, index, value, onChange, isLoading, __, isPopoverOpenRef }) => {
  const [isOpen, setIsOpen] = useState(false);

  // חישוב האם זה "Any" לפי הvalue הנוכחי
  const isAny = !value;
  const currentValue = value || "";

  // ✅ עדכון ה-ref כשהPopover נפתח/נסגר
  const handleOpenChange = (open) => {
    setIsOpen(open);
    if (isPopoverOpenRef) {
      isPopoverOpenRef.current = open;
    }
  };

  const handleSelect = (option) => {
    if (option === "any") {
      onChange("");
    } else {
      onChange(option);
    }

    // ✅ סגור רק את הPopover, בלי לצאת ממצב עריכה
    setIsOpen(false);
    if (isPopoverOpenRef) {
      isPopoverOpenRef.current = false;
    }
  };

  return (
    <Popover
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      placement="top"
      offset={2}
      className="bg-white dark:bg-slate-800 rounded-lg"
    >
      <PopoverTrigger>
        <div
          className={cn(
            "flex flex-nowrap items-center gap-1 px-2 py-1 text-xs font-medium rounded-full",
            "bg-fuchsia-600/10 text-fuchsia-600 hover:bg-fuchsia-600/20 cursor-pointer",
            isLoading && "opacity-50 cursor-not-allowed"
          )}
        >
          <span className="text-nowrap truncate">
            {isAny ? `${__("Any", "whizmanage")} ${attribute.name}` : currentValue}
          </span>
          <ChevronDown className="h-3 w-3" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="py-1 px-0 bg-fuchsia-600/10 text-fuchsia-600 rounded-lg">
        <div className="text-xs font-medium border-b border-white dark:border-slate-800 pb-1 px-1">
          {attribute.name}
        </div>

        <div className="max-h-[200px] overflow-auto scrollbar-whiz px-0.5 pt-1">
          {/* Any option */}
          <div
            className={cn(
              "text-xs rtl:text-right p-1 cursor-pointer rounded-md hover:bg-fuchsia-600/20 flex gap-1 items-center"
            )}
            onClick={() => handleSelec__("any")}
          >
            <Check
              className={cn("h-3 w-3", isAny ? "opacity-100" : "opacity-0")}
            />
            <span>{`${__("Any", "whizmanage")} ${attribute.name}`}</span>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/20 dark:bg-slate-700 my-1"></div>

          {/* Attribute options */}
          {attribute.options && attribute.options.length > 0 ? (
            attribute.options.map((option) => {
              const optionValue = typeof option === "string" ? option : option.name || option.slug || option;
              return (
                <div
                  key={optionValue}
                  className={cn(
                    "text-xs rtl:text-right p-1 cursor-pointer rounded-md hover:bg-fuchsia-600/20 flex gap-1 items-center"
                  )}
                  onClick={() => handleSelect(optionValue)}
                >
                  <Check
                    className={cn(
                      "h-3 w-3",
                      !isAny && normalizeValue(optionValue) === normalizeValue(currentValue)
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  <span>{optionValue}</span>
                </div>
              );
            })
          ) : (
            <div className="text-xs text-slate-500 italic p-2 text-center">
              {__("No options available", "whizmanage")}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default VariationNameEdit;