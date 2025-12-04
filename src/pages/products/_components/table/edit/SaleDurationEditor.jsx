import { Button } from "@components/ui/button";
import { parseAbsolute, parseAbsoluteToLocal } from "@internationalized/date";
import { __ } from '@wordpress/i18n';
import { CalendarClock, X } from "lucide-react";
import { useState } from "react";
import { DateRangePicker } from "@heroui/date-picker";
const SaleDurationEditor = ({ row, updateValue }) => {
   
  const [value, setValue] = useState({
    start: row?.original?.date_on_sale_from_gmt
      ? parseAbsoluteToLocal(row.original.date_on_sale_from_gmt)
      : null,
    end: row?.original?.date_on_sale_to_gmt
      ? parseAbsoluteToLocal(row.original.date_on_sale_to_gmt)
      : null,
  });
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
    setValue(newValue);
    const startDate = convertToDate(newValue.start);
    const endDate = convertToDate(newValue.end);
    if (row) {
      row.original.date_on_sale_from_gmt = !isNaN(startDate.getTime())
        ? startDate.toISOString()
        : null;
      row.original.date_on_sale_to_gmt = !isNaN(endDate.getTime())
        ? endDate.toISOString()
        : null;
    } else {
      updateValue(
        "date_on_sale_from_gmt",
        !isNaN(startDate.getTime()) ? startDate.toISOString() : null
      );
      updateValue(
        "date_on_sale_to_gmt",
        !isNaN(endDate.getTime()) ? endDate.toISOString() : null
      );
    }
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
    setValue(newValue);
    if (row) {
      row.original.date_on_sale_from_gmt = startOfDay.toISOString();
      row.original.date_on_sale_to_gmt = endOfDay.toISOString();
    } else {
      updateValue("date_on_sale_from_gmt", startOfDay.toISOString());
      updateValue("date_on_sale_to_gmt", endOfDay.toISOString());
    }
  };
  const handleClearDates = () => {
    setValue({ start: null, end: null });
    if (row) {
      row.original.date_on_sale_from_gmt = "";
      row.original.date_on_sale_from = "";
      row.original.date_on_sale_to_gmt = "";
      row.original.date_on_sale_to = "";
    } else {
      updateValue("date_on_sale_from_gmt", null);
      updateValue("date_on_sale_to_gmt", null);
    }
  };
  return (
    <div className="w-full max-w-xl flex flex-row gap-4">
      {value.start === null && value.end === null ? (
        <Button
          onClick={handleScheduleClick}
          variant="outline"
          className="flex gap-2 h-8 capitalize"
        >
          {__("Schedule", "whizmanage")}
          <CalendarClock className="ml-2 rtl:mr-2 rtl:ml-0 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      ) : (
        <div className="flex gap-4 items-center">
          <DateRangePicker
            aria-label={__("Select sale duration", "whizmanage")}
            value={value}
            onChange={handleDateChange}
            variant="bordered"
            size="sm"
            hideTimeZone
            visibleMonths={2}
            classNames={{
              base: "relative flex items-center min-w-48 !font-extralight",
              inputWrapper: "!max-h-8 !min-h-8 !h-8 border rounded-md flex items-center bg-white hover:!bg-white dark:hover:!bg-slate-600 dark:bg-slate-700 !font-extralight",
              input: "bg-white text-left w-full border-none bg-transparent h-full !font-extralight",
              popoverContent: "rounded-md shadow-lg !font-extralight",
              calendar: "!font-extralight"
            }}
            popoverProps={{
              placement: "bottom-start",
              offset: 4
            }}
            calendarProps={{
              focusedValue: value?.start,
              classNames: {
                base: "!font-extralight",
                headerWrapper: "!font-extralight",
                gridWrapper: "!font-extralight"
              }
            }}
          />
          <Button
            onClick={handleClearDates}
            variant="outline"
            className="flex gap-2 h-8 capitalize"
          >
            {__("Clear", "whizmanage")}
            <X className="ml-2 rtl:mr-2 rtl:ml-0 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </div>
      )}
    </div>
  );
};
export default SaleDurationEditor;