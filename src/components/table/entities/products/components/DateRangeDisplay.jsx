// src/components/table/products/components/DateRangeDisplay.jsx
import { CalendarRange, CalendarOff } from "lucide-react";

const DateRangeDisplay = ({ value, __}) => {
  if (!value || (!value.start && !value.end)) {
    return (
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <CalendarOff className="size-3.5" />
        <span className="text-xs">{__?.("No schedule","whizmanage") || __("No schedule", "whizmanage")}</span>
      </div>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="flex items-center gap-1.5">
      <CalendarRange className="size-3.5 text-fuchsia-600" />
      <div className="flex items-center gap-1 text-xs">
        <span className="text-sm">{formatDate(value.start)}</span>
        <span className="text-muted-foreground">-</span>
        <span className="text-sm">{formatDate(value.end)}</span>
      </div>
    </div>
  );
};

export default DateRangeDisplay;