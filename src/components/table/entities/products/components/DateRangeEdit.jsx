// src/components/table/products/components/DateRangeEdit.jsx
import CustomTooltip from "@components/ui/nextUI/Tooltip";
import { Button } from "@components/ui/button";
import { DateRangePicker } from "@heroui/date-picker";
import { CalendarDateTime } from "@internationalized/date";
import { CalendarClock, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
 import { __ } from "@wordpress/i18n";

const DateRangeEdit = ({
  // Props מ-EditableCell
  value,
  onChange,
  onFinish,
  onCancel,
  isLoading,
  error,
  inputRef,
  editOptions,
  row,
  column,
  t: tProp,

  // תמיכה בשימושים נוספים (טפסים וכו')
  startFieldName: startFieldNameProp,
  endFieldName: endFieldNameProp,
  updateValue,
  isForm = false,
}) => {
   
  const translate = tProp || __;

  // שמות שדות התחלה/סיום – קודם מה-editOptions, אח"כ מה-props, ואז ברירת מחדל
  const startFieldName =
    editOptions?.startFieldName ||
    startFieldNameProp ||
    "date_on_sale_from_gmt";
  const endFieldName =
    editOptions?.endFieldName || endFieldNameProp || "date_on_sale_to_gmt";

  // המרת ISO string ל-CalendarDateTime
  const parseToCalendarDateTime = (dateString) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return null;
      return new CalendarDateTime(
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate(),
        date.getHours(),
        date.getMinutes(),
        date.getSeconds()
      );
    } catch {
      return null;
    }
  };

  // חישוב ערך התחלתי מה-value או מה-row
  const getInitialValue = () => {
    const startStr = value?.start || row?.original?.[startFieldName];
    const endStr = value?.end || row?.original?.[endFieldName];

    if (!startStr && !endStr) return null;

    const start = parseToCalendarDateTime(startStr);
    const end = parseToCalendarDateTime(endStr);

    if (!start && !end) return null;
    return { start, end };
  };

  // ערך מקומי לבקרת ה-RangePicker
  const [localValue, setLocalValue] = useState(getInitialValue);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // האם יש בכלל תקופת מבצע (להחליט אם להראות כפתור או את ה-picker)
  const [isScheduled, setIsScheduled] = useState(
    !!(
      value?.start ||
      value?.end ||
      row?.original?.[startFieldName] ||
      row?.original?.[endFieldName]
    )
  );

  const [shouldFinish, setShouldFinish] = useState(false);
  const pickerRef = useRef(null);
  const containerRef = useRef(null);

  // המרת DateValue של HeroUI ל-JavaScript Date
  const convertToDate = (d) => {
    if (!d) return null;
    if (typeof d.toDate === "function") {
      // חלק מהאובייקטים האלו מגיעים עם .toDate()
      return d.toDate();
    }
    return new Date(
      d.year,
      (d.month || 1) - 1,
      d.day || 1,
      d.hour || 0,
      d.minute || 0,
      d.second || 0
    );
  };

  // שינוי טווח התאריכים: מעדכן state + קורא onChange (בלי API)
  const handleDateChange = (newValue) => {
    setLocalValue(newValue);

    const startDate = newValue?.start ? convertToDate(newValue.start) : null;
    const endDate = newValue?.end ? convertToDate(newValue.end) : null;

    const dateRange = {
      start: startDate ? startDate.toISOString() : null,
      end: endDate ? endDate.toISOString() : null,
    };

    if (isForm) {
      if (updateValue) {
        updateValue(startFieldName, dateRange.start);
        updateValue(endFieldName, dateRange.end);
      }
      if (row) {
        row.original[startFieldName] = dateRange.start;
        row.original[endFieldName] = dateRange.end;
      }
    } else {
      // פה אנחנו רק מעדכנים את הערך בתא (EditableCell),
      // השמירה לשרת תקרה רק כש-EditableCell יסיים עריכה (finishEditing)
      onChange(dateRange);
    }

  };

  // הפעלה/כיבוי "תקופת מבצע"
  const handleToggleSchedule = () => {
    if (!isScheduled) {
      setIsScheduled(true);
      // רק לפתוח את ה-picker – בלי לייצר ערך ולשלוח לשרת
      setTimeout(() => setIsPickerOpen(true), 50);
    } else {
      handleClearDates();
    }
  };

  // ניקוי תאריכים (גם פה – בלי API)
  const handleClearDates = () => {
    const cleared = { start: null, end: null };
    setLocalValue(null);
    setIsScheduled(false);

    if (isForm) {
      if (updateValue) {
        updateValue(startFieldName, null);
        updateValue(endFieldName, null);
      }
      if (row) {
        row.original[startFieldName] = "";
        row.original[endFieldName] = "";
      }
    } else {
      onChange(cleared);
    }
  };

  // סגירת הקומפוננטה כשעוזבים את התא
  useEffect(() => {
    if (isForm) return;

    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target) &&
        !isPickerOpen
      ) {
        setShouldFinish(true);
      }
    };

    if (!isPickerOpen && shouldFinish) {
      const timer = setTimeout(() => {
        onFinish();
      }, 200);
      return () => clearTimeout(timer);
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isPickerOpen, shouldFinish, isForm, onFinish]);

  // Escape → ביטול עריכה
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && !isForm) {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isForm, onCancel]);

  return (
    <div ref={containerRef} className="w-full flex flex-row gap-2 items-center">
      <div className="flex items-center gap-1">
        {/* כפתור התחלת תקופת מבצע */}
        {!isScheduled && (
          <Button
            ref={inputRef}
            onClick={handleToggleSchedule}
            variant="outline"
            className="h-8 flex items-center gap-2"
            disabled={isLoading}
          >
            <CalendarClock className="h-4 w-4 opacity-50" />
            <span className="text-sm">{translate("Set Sale Period","whizmanage")}</span>
          </Button>
        )}

        {/* בורר תאריכים – רק כשהתזמון פעיל */}
        {isScheduled && (
          <>
            <DateRangePicker
              ref={pickerRef}
              aria-label={translate("Select sale period","whizmanage")}
              // value מבוקר – מתחיל כ-null, מתמלא אחרי שינוי ראשון
              value={localValue}
              onChange={handleDateChange}
              isOpen={isPickerOpen}
              onOpenChange={(open) => {
                setIsPickerOpen(open);
                if (!open && !isForm) {
                  setShouldFinish(true);
                }
              }}
              variant="bordered"
              size="sm"
              granularity="minute"
              hideTimeZone
              visibleMonths={2}
              isDisabled={isLoading}
              classNames={{
                base: "relative flex items-center min-w-[180px] [direction:ltr]",
                inputWrapper:
                  "!h-8 border rounded-md bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600",
                input: "text-xs",
                selectorButton: "text-default-400",
                popoverContent: "z-[10000]",
              }}
              popoverProps={{
                placement: "bottom-start",
                offset: 4,
              }}
              calendarProps={{
                onChange: (value) => {
                  // כשנבחר טווח מלא בלוח השנה, עדכן את הערך וסגור
                  if (value?.start && value?.end) {
                    // המרה מ-CalendarDate ל-CalendarDateTime (עם שעה 00:00)
                    const startDateTime = new CalendarDateTime(
                      value.start.year,
                      value.start.month,
                      value.start.day,
                      0, 0, 0
                    );
                    const endDateTime = new CalendarDateTime(
                      value.end.year,
                      value.end.month,
                      value.end.day,
                      23, 59, 0
                    );
                    // עדכון הערך דרך handleDateChange
                    handleDateChange({ start: startDateTime, end: endDateTime });
                    setTimeout(() => setIsPickerOpen(false), 150);
                  }
                },
              }}
            />
            <CustomTooltip title={translate("Cancel Sale Period","whizmanage")}>
              <Button
                onClick={handleClearDates}
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-red-50 dark:hover:bg-fuchsia-900/20"
                disabled={isLoading}
              >
                <X className="h-3.5 w-3.5 text-fuchsia-500" />
              </Button>
            </CustomTooltip>
          </>
        )}
      </div>

      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
};

export default DateRangeEdit;
