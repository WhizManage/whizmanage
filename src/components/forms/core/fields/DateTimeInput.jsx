// src/components/forms/core/fields/DateTimeInput.jsx

import { Label } from "@/components/ui/label";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { DatePicker } from "@heroui/react";
import { getLocalTimeZone, now, parseAbsolute } from "@internationalized/date";
import { Info } from "lucide-react";
import { useState } from "react";
 import { __ } from "@wordpress/i18n";
import { useGenericForm } from "../FormProvider";

export default function DateTimeInput({
  name,
  label,
  helperText,
  rules,
  showTimeZone = false,
}) {
   
  const { setValue, watch } = useGenericForm();
  
  const currentValue = watch(name);
  
  const [dateValue, setDateValue] = useState(() => {
    if (currentValue && typeof currentValue === 'string' && currentValue.trim()) {
      try {
        return parseAbsolute(currentValue);
      } catch (e) {
        console.warn("Invalid date value:", currentValue, e);
        return now(getLocalTimeZone());
      }
    }
    return now(getLocalTimeZone());
  });

  const handleDateChange = (newDate) => {
    if (newDate) {
      setDateValue(newDate);
      
      const jsDate = newDate.toDate(getLocalTimeZone());
      const localDate = new Date(
        jsDate.getTime() - jsDate.getTimezoneOffset() * 60000
      );
      const isoString = localDate.toISOString().slice(0, 19);
      
      setValue(name, isoString, { shouldValidate: true, shouldDirty: true });
    }
  };

  return (
    <div className="flex flex-col w-full gap-1.5 px-2">
      <div className="flex items-center gap-1.5">
        {helperText && (
          <HoverCard openDelay={300}>
            <HoverCardTrigger asChild>
              <Info className="h-3 w-3 text-fuchsia-600 opacity-60 hover:opacity-100 cursor-pointer" />
            </HoverCardTrigger>
            <HoverCardContent
              className="max-w-xs text-sm break-words z-[9999] shadow-md p-3"
              align="start"
              avoidCollisions
              collisionPadding={10}
              sideOffset={5}
            >
              <p className="whitespace-pre-wrap break-words">{__(helperText, "whizmanage")}</p>
            </HoverCardContent>
          </HoverCard>
        )}
        <Label htmlFor={name}>
          {__(label, "whizmanage")}
          {rules?.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      </div>
      <DatePicker
        value={dateValue}
        onChange={handleDateChange}
        showMonthAndYearPickers
        hideTimeZone={!showTimeZone}
        classNames={{
          base: "w-full",
          inputWrapper: [
            "!h-10 !min-h-10",
            "border rounded-lg",
            "bg-white dark:bg-slate-700",
            "border-input dark:!border-slate-700", // ✅ border כהה יותר
            "hover:bg-slate-50 dark:hover:!bg-slate-600", // ✅ hover עם slate
            "focus-within:ring-2 focus-within:ring-fuchsia-600 focus-within:ring-offset-0",
            "transition-colors",
          ].join(" "),
          input: "dark:!text-slate-300",
          selectorButton: [
            "dark:text-slate-300",
            "hover:bg-slate-100 dark:hover:!bg-slate-600", // ✅ hover slate
            "transition-colors",
          ].join(" "),
          popoverContent: "dark:bg-slate-800 dark:border-slate-700",
          calendar: "dark:bg-slate-800",
          calendarContent: "dark:bg-slate-800",
          timeInputWrapper: "dark:bg-slate-700 dark:border-slate-600",
          timeInput: "dark:!text-slate-300",
        }}
        popoverProps={{
          placement: "bottom-start",
          offset: 4,
          classNames: {
            content: "dark:bg-slate-800 dark:border-slate-700",
          },
        }}
        calendarProps={{
          focusedValue: dateValue,
          classNames: {
            base: "dark:bg-slate-800",
            headerWrapper: "dark:bg-slate-800 dark:border-slate-700",
            gridWrapper: "dark:bg-slate-800",
            gridHeader: "dark:bg-slate-800",
            gridBody: "dark:bg-slate-800",
            cell: "dark:hover:bg-slate-700",
            cellButton: [
              "dark:text-slate-300",
              "dark:hover:bg-slate-700",
              "data-[selected]:bg-fuchsia-600 data-[selected]:dark:bg-fuchsia-600",
              "data-[selected]:text-white",
              "dark:data-[today]:bg-slate-700",
              "dark:data-[today]:border-slate-500",
            ].join(" "),
            nextButton: "dark:text-slate-300 dark:hover:bg-slate-700",
            prevButton: "dark:text-slate-300 dark:hover:bg-slate-700",
          },
        }}
        aria-label={__(label, "whizmanage")}
      />
    </div>
  );
}