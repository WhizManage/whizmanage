// src/components/table/entities/products/components/TypeDisplay.jsx

import AddVariations from "./variation/AddVariations";
import ManageGrouped from "./grouped/ManageGrouped";
import ManageExternal from "./external/ManageExternal";
import ProBadge from "@components/ui/nextUI/ProBadge";
import CustomTooltip from "@components/ui/nextUI/Tooltip";
import { Button } from "@components/ui/button";
import { Settings2 } from "lucide-react";

const TypeDisplay = ({ value, editOptions, row, t }) => {
  if (!value) {
    return <span className="text-muted-foreground">-</span>;
  }

  // אם זה variant (subRow), הצג "Variant"
  if (!row?.original?.type || row?.depth > 0) {
    return <span>{__("Variant", "whizmanage")}</span>;
  }

  const options = editOptions?.options || [];
  const currentValue = typeof value === 'object' ? (value.value || value.id) : value;
  const option = options.find(opt => (opt.value || opt.id) === currentValue);
  const displayText = option ? (option.label || option.name) : currentValue;

  // פונקציה לעצירת propagation
  const handleButtonClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
  };

  // הגדרת הכפתור לפי סוג המוצר
  const renderButton = () => {
    const hasLicence = typeof window !== "undefined" && window.hasLicence !== false;

    if (currentValue === "variable") {
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

    if (currentValue === "grouped") {
      return <ManageGrouped row={row} />;
    }

    if (currentValue === "external") {
      return <ManageExternal row={row} />;
    }

    return null;
  };

  const button = renderButton();

  return (
    <div className="flex items-center gap-2 w-full min-w-0">
      {/* הטקסט */}
      <div className="flex-1 min-w-0">
        <span>{__(displayText, "whizmanage")}</span>
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
};

export default TypeDisplay;