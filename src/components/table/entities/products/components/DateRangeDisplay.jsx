// src/components/table/products/components/DateRangeDisplay.jsx
import { CalendarRange, CalendarOff } from "lucide-react";

const DateRangeDisplay = ({ value, __}) => {
  if (!value || (!value.start && !value.end)) {
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        <CalendarOff className="h-3.5 w-3.5" />
        <span className="text-xs">{__?.("No schedule","whizmanage") || __("No schedule", "whizmanage")}</span>
      </div>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="flex items-center gap-1">
      <CalendarRange className="h-3.5 w-3.5 text-fuchsia-600" />
      <div className="flex items-center gap-1 text-xs">
        <span className="text-sm">{formatDate(value.start)}</span>
        <span className="text-muted-foreground">-</span>
        <span className="text-sm">{formatDate(value.end)}</span>
      </div>
    </div>
  );
};

export default DateRangeDisplay;