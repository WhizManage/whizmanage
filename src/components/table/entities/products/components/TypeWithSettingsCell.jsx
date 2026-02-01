// src/components/pages/table/products/components/TypeWithSettingsCell.jsx

import { EditableCell } from "@/components/table/core/EditableCell";
import React from "react";
import ManageExternal from "./external/ManageExternal";
import ManageGrouped from "./grouped/ManageGrouped";
import { __ } from "@wordpress/i18n";

export default function TypeWithSettingsCell(props) {
  const { row, table } = props;
  const handleCellUpdate = table?.options?.meta?.handleCellUpdate;

  const rowData = row.original;
  const currentType = rowData?.type || "simple";

  // פונקציה לעצירת propagation (מועתקת מ-TypeDisplay)
  const handleButtonClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
  };

  // הגדרת הכפתור לפי סוג המוצר
  const renderButton = () => {
    // Variable products feature removed
    if (currentType === "variable") {
      return null;
    }

    if (currentType === "grouped") {
      return <ManageGrouped row={row} />;
    }

    if (currentType === "external") {
      return <ManageExternal row={row} />;
    }

    return null;
  };

  const button = renderButton();

  return (
    <div className="flex items-center gap-2 w-full min-w-0">
      {/* EditableCell משמאל */}
      <div className="flex-1 min-w-0">
        <EditableCell {...props} onUpdate={handleCellUpdate} />
      </div>

      {/* מפריד + כפתור */}
      {button && (
        <>
          <div className="w-px h-5 bg-border flex-shrink-0 dark:bg-slate-700" />
          <div onClick={handleButtonClick}>
            {button}
          </div>
        </>
      )}
    </div>
  );
}
