// src/components/pages/table/products/components/TypeWithSettingsCell.jsx

import { EditableCell } from "@/components/table/core/EditableCell";
import CustomTooltip from "@components/ui/nextUI/Tooltip";
import { Button } from "@/components/ui/button";
import ProBadge from "@components/ui/nextUI/ProBadge";
import { Settings2 } from "lucide-react";
import React from "react";
import ManageExternal from "./external/ManageExternal";
import ManageGrouped from "./grouped/ManageGrouped";
import AddVariations from "./variation/AddVariations";
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

  // הגדרת הכפתור לפי סוג המוצר (מועתקת מ-TypeDisplay)
  const renderButton = () => {
    const hasLicence = typeof window !== "undefined" && window.hasLicence !== false;

    if (currentType === "variable") {
      if (!hasLicence) {
        return (
          <CustomTooltip
            title={__("Pro feature", "whizmanage")}
            description={__("Variable products require Pro license", "whizmanage")}
          >
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="flex px-2 !size-7 opacity-60 cursor-not-allowed"
              disabled
              aria-disabled
            >
              <Settings2 className="!size-4" />
              <span className="pointer-events-none absolute -top-1 -right-1 z-[50]">
                <ProBadge />
              </span>
            </Button>
          </CustomTooltip>
        );
      }
      return <AddVariations row={row} />;
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