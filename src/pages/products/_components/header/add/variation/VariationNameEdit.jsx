import React, { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@heroui/react";
import { cn } from "@/lib/utils";
import { ChevronDown, Check } from "lucide-react";
import { __ } from '@wordpress/i18n';

const normalizeValue = (value) => {
  if (!value) return "";
  return value
    .replace(/-/g, " ") // מחליף מקפים ברווחים
    .replace(/['"]/g, "") // מסיר גרשיים וגרשיים כפולים
    .trim(); // מסיר רווחים מיותרים בהתחלה ובסוף
};

const VariationNameEdit = ({ i, row, attribute }) => {
   
  const attributeData = row.original.attributes?.[i] || {}; // הגנה מפני undefined
  const [isAny, setIsAny] = useState(!attributeData.option);
  const [currentValue, setCurrentValue] = useState(attributeData.option || "");  

  const handleSelect = (option) => {
    if (option === "any") {
      // שינוי למצב "any"
      setIsAny(true);
      setCurrentValue("");
      row.original.attributes[i].option = "";
      row.original.attributes[i].name;
      row.original.attributes[i].slug;
    } else {
      // בחירת אופציה ספציפית
      setIsAny(false);
      setCurrentValue(option);
      if (row.original.attributes?.[i]) {
        row.original.attributes[i].option = option;
      }      
    }
  };

  return (
    <Popover placement="top" offset={2} className="bg-white dark:bg-slate-800 rounded-lg">
      <PopoverTrigger>
        <div className="flex flex-nowrap items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-fuchsia-600/10 text-fuchsia-600 hover:bg-fuchsia-600/20 cursor-pointer">
          <span className="text-nowrap truncate">
            {isAny ? `${__("Any", "whizmanage")} ${attribute.name}` : currentValue}
          </span>
          <ChevronDown className="h-3 w-3" />
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="py-1 px-0 bg-fuchsia-600/10 text-fuchsia-600 rounded-lg"
      >
        <div className="text-xs font-medium border-b border-white dark:border-slate-800 pb-1 px-1">
          {attribute.name}
        </div>
        <div className="max-h-[200px] overflow-auto px-0.5 pt-1">
          {/* Any option at the top */}
          <div
            className={cn(
              "text-xs rtl:text-right p-1 cursor-pointer rounded-md hover:bg-fuchsia-600/20 flex gap-1 items-center"
            )}
            onClick={() => handleSelect("any")}
          >
            <Check
              className={cn(
                "h-3 w-3",
                isAny ? "opacity-100" : "opacity-0"
              )}
            />
            <span>{`${__("Any", "whizmanage")} ${attribute.name}`}</span>
          </div>
          
          {/* Divider */}
          <div className="h-px bg-white/20 dark:bg-slate-700 my-1"></div>
          
          {/* Attribute options */}
          {attribute.options?.map((option) => (
            <div
              key={option}
              className={cn(
                "text-xs rtl:text-right p-1 cursor-pointer rounded-md hover:bg-fuchsia-600/20 flex gap-1 items-center"
              )}
              onClick={() => handleSelect(option)}
            >
              <Check
                className={cn(
                  "h-3 w-3",
                  !isAny && normalizeValue(option) === normalizeValue(currentValue)
                    ? "opacity-100"
                    : "opacity-0"
                )}
              />
              <span>{option}</span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default VariationNameEdit;