// src/components/table/LazyEditableCell.jsx
import { lazy, Suspense, useState } from "react";
import { formatValue } from "../../../utils/formatValue.js.js";
// import { formatValue } from "@/utils/formatValue";

// Lazy load את EditableCell
const EditableCellComponent = lazy(() =>
  import("./EditableCell.jsx").then((module) => ({
    default: module.EditableCell,
  }))
);

/**
 * Wrapper component שטוען את EditableCell רק כשצריך
 */
export function LazyEditableCell(props) {
  const [shouldLoad, setShouldLoad] = useState(() => {
    // טען מיד עבור השורות הראשונות הנראות
    return props.rowIndex < 20;
  });

  // אם התא בעריכה או hover, טען את הקומפוננטה
  const handleInteraction = () => {
    if (!shouldLoad) {
      setShouldLoad(true);
    }
  };

  // אם עדיין לא נטען, הצג תא פשוט
  if (!shouldLoad) {
    const value = props.getValue();
    const meta = props.column.columnDef.meta || {};
    const editType = meta.editType || "text";
    const isEditable = meta.editable !== false;

    // פורמט בסיסי לתצוגה
    const displayValue = () => {
      if (value == null || value === "") {
        return <span className="text-muted-foreground">-</span>;
      }

      // מספרים – משתמשים בפורמט האחיד מה-utils
      if (editType === "number" && value != null) {
        const editOptions = meta.editOptions || {};
        const formatType = editOptions.format || "number"; // "currency" / "percent" / "number"
        return formatValue(value, formatType);
      }

      // תאריך
      if (editType === "date" && value) {
        const date = new Date(value);
        return date.toLocaleDateString("he-IL");
      }

      // select – הצגת label במקום value אם קיים
      if (editType === "select") {
        const editOptions = meta.editOptions || {};
        const option = editOptions.options?.find((opt) => opt.value === value);
        return option?.label || value;
      }

      // ברירת מחדל – טקסט כמו שהוא
      return value;
    };

    return (
      <div
        className={`px-2 py-1 cursor-text transition-all duration-200 group ${
          isEditable
            ? "hover:!ring-[0.5px] hover:ring-slate-300 dark:hover:ring-slate-500 hover:rounded-sm"
            : "text-muted-foreground opacity-60"
        }`}
        onClick={isEditable ? handleInteraction : undefined}
        onMouseEnter={isEditable ? handleInteraction : undefined}
        onFocus={isEditable ? handleInteraction : undefined}
        tabIndex={isEditable ? 0 : undefined}
        role="gridcell"
      >
        <div className="relative flex items-center min-h-[24px]">
          {displayValue()}
        </div>
      </div>
    );
  }

  // טען את הקומפוננטה המלאה
  return (
    <Suspense
      fallback={
        <div className="px-2 py-1">
          <div className="h-6 w-full bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
        </div>
      }
    >
      <EditableCellComponent {...props} />
    </Suspense>
  );
}
