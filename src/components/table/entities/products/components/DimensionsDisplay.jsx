// src/components/pages/table/products/components/DimensionsDisplay.jsx
import { Ruler } from "lucide-react";
import { formatValue } from "../../../../../utils/formatValue.js";

const DimensionsDisplay = ({ value, row }) => {
  const dimensions = row?.original?.dimensions || {};
  const { length = "", width = "", height = "" } = dimensions;

  const dimensionUnit =
    typeof window !== "undefined" && window.dimensionUnit
      ? window.dimensionUnit
      : "cm";

  // אם אין מידות בכלל
  if (!length && !width && !height) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Ruler className="size-4" />
        <span>—</span>
      </div>
    );
  }

  // פונקציה שתסיר את הספרות אחרי הנקודה (תעגל למספר שלם)
  const cleanValue = (v) => {
    const num = parseFloat(v);
    if (Number.isNaN(num)) return v;
    return Math.round(num); // עיגול למספר שלם
  };

  const dimensionParts = [];

  if (length) dimensionParts.push(`L:${cleanValue(length)}`);
  if (width) dimensionParts.push(`W:${cleanValue(width)}`);
  if (height) dimensionParts.push(`H:${cleanValue(height)}`);

  const displayText = dimensionParts.join(" × ");

  return (
    <div className="flex items-center gap-2">
      <Ruler className="size-4 text-muted-foreground" />
      <span className="text-muted-foreground">
        {displayText}
        <span className="text-xs ml-1 opacity-70">{dimensionUnit}</span>
      </span>
    </div>
  );
};

export default DimensionsDisplay;
