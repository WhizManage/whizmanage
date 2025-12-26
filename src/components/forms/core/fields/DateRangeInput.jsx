// src/components/forms/core/fields/DateRangeInput.jsx

import { Button } from "@components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@components/ui/hover-card";
import { Label } from "@components/ui/label";
import { DateRangePicker } from "@heroui/date-picker";
import { parseAbsolute } from "@internationalized/date";
import { CalendarClock, Info, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller } from "react-hook-form";
 import { __ } from "@wordpress/i18n";
import { useGenericForm } from "../FormProvider";

export default function DateRangeInput({
  name,
  label,
  startDateField,
  endDateField,
  startDateLabel = "Start date",
  endDateLabel = "End date",
  scheduleButtonLabel = "Schedule",
  clearButtonLabel = "Clear",
  helperText,
  rules,
  required = false,
  useGMT = false, // אם true, ישתמש ב-_gmt suffix
}) {
   
  const { control, watch, setValue } = useGenericForm();

  // שדות עם או בלי _gmt
  const startField = useGMT ? `${startDateField}_gmt` : startDateField;
  const endField = useGMT ? `${endDateField}_gmt` : endDateField;

  const startDate = watch(startField);
  const endDate = watch(endField);

  const [value, setValue_] = useState({
    start: startDate ? parseAbsolute(startDate) : null,
    end: endDate ? parseAbsolute(endDate) : null,
  });

  // סנכרון עם הטופס
  useEffect(() => {
    if (startDate && endDate) {
      setValue_({
        start: parseAbsolute(startDate),
        end: parseAbsolute(endDate),
      });
    }
  }, [startDate, endDate]);

  const convertToDate = (intlDate) => {
    return new Date(
      intlDate.year,
      intlDate.month - 1,
      intlDate.day,
      intlDate.hour,
      intlDate.minute,
      intlDate.second
    );
  };

  const handleDateChange = (newValue) => {
    setValue_(newValue);

    const startDateObj = convertToDate(newValue.start);
    const endDateObj = convertToDate(newValue.end);

    setValue(
      startField,
      !isNaN(startDateObj.getTime()) ? startDateObj.toISOString() : null,
      { shouldValidate: true, shouldDirty: true }
    );
    setValue(
      endField,
      !isNaN(endDateObj.getTime()) ? endDateObj.toISOString() : null,
      { shouldValidate: true, shouldDirty: true }
    );
  };

  const handleScheduleClick = () => {
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      0,
      0,
      0
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1,
      0,
      0,
      0
    );

    const newValue = {
      start: parseAbsolute(startOfDay.toISOString()),
      end: parseAbsolute(endOfDay.toISOString()),
    };

    setValue_(newValue);
    setValue(startField, startOfDay.toISOString(), {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue(endField, endOfDay.toISOString(), {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const handleClearDates = () => {
    setValue_({ start: null, end: null });
    setValue(startField, null, { shouldValidate: true, shouldDirty: true });
    setValue(endField, null, { shouldValidate: true, shouldDirty: true });

    // ניקוי גם של השדות ללא _gmt אם זה שדה GMT
    if (useGMT) {
      setValue(startDateField, "", { shouldValidate: true, shouldDirty: true });
      setValue(endDateField, "", { shouldValidate: true, shouldDirty: true });
    }
  };

  return (
    <div className="flex flex-col w-full gap-1 px-2">
      {/* כותרת */}
      {label && (
        <Label className="flex items-center gap-1">
          {/* <CalendarClock className="h-4 w-4 text-muted-foreground" /> */}
          {__(label, "whizmanage")}
          {required ? (
            <span className="text-red-500 ml-1">*</span>
          ) : (
            <span>{__("(optional)", "whizmanage")}</span>
          )}
        </Label>
      )}
      <Controller
        name={startField}
        control={control}
        rules={rules}
        render={({ fieldState: { error } }) => (
          <>
            <div className="w-full flex flex-row gap-2">
              {value.start === null && value.end === null ? (
                <Button
                  type="button"
                  onClick={handleScheduleClick}
                  variant="outline"
                  className="flex gap-2 h-10 capitalize"
                >
                  {__(scheduleButtonLabel, "whizmanage")}
                  <CalendarClock className="ml-2 rtl:mr-2 rtl:ml-0 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              ) : (
                <div className="flex gap-2 items-center w-full">
                  <DateRangePicker
                    aria-label={__(label || "Select date range", "whizmanage")}
                    value={value}
                    onChange={handleDateChange}
                    variant="bordered"
                    size="sm"
                    hideTimeZone
                    visibleMonths={2}
                    classNames={{
                      base: "relative flex items-center min-w-48 !font-extralight",
                      inputWrapper:
                        "!max-h-10 !min-h-10 !h-10 border dark:!border-none dark:hover:!border-none rounded-md flex items-center bg-white hover:!bg-white dark:hover:!bg-slate-700 dark:bg-slate-700 !font-extralight",
                      input:
                        "bg-white text-left w-full border-none bg-transparent h-full !font-extralight",
                      popoverContent: "rounded-md shadow-lg !font-extralight",
                      calendar: "!font-extralight",
                    }}
                    popoverProps={{
                      placement: "bottom-start",
                      offset: 4,
                    }}
                    calendarProps={{
                      focusedValue: value?.start,
                      classNames: {
                        base: "!font-extralight",
                        headerWrapper: "!font-extralight",
                        gridWrapper: "!font-extralight",
                      },
                    }}
                  />
                  <Button
                    type="button"
                    onClick={handleClearDates}
                    variant="outline"
                    size="md"
                    className="flex gap-2 h-10 capitalize !px-3"
                  >
                    {__(clearButtonLabel, "whizmanage")}
                    <X className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </div>
              )}
            </div>

            {/* הודעת עזרה */}
            {helperText && !error && (
              <div className="flex items-center gap-1.5 px-2">
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
                    <p className="whitespace-pre-wrap break-words">
                      {__(helperText, "whizmanage")}
                    </p>
                  </HoverCardContent>
                </HoverCard>
                <p className="text-xs text-muted-foreground">{__(helperText, "whizmanage")}</p>
              </div>
            )}
            {/* שגיאות */}
            {error && (
              <p className="text-red-500 dark:text-pink-500 text-sm px-2">
                {__(error.message, "whizmanage")}
              </p>
            )}
          </>
        )}
      />
    </div>
  );
}
