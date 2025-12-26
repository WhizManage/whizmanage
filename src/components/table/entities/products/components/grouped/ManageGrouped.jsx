// src/components/table/entities/products/components/grouped/ManageGrouped.jsx

import { cn } from "@/lib/utils";
import { Button } from "@components/ui/button";
import { Settings2 } from "lucide-react";
import ManageGroupedModal from "./ManageGroupedModal";
import CustomTooltip from "@components/ui/nextUI/Tooltip";
 import { __ } from "@wordpress/i18n";

/**
 * 👥 ManageGrouped - נקודת הכניסה לניהול מוצרים מקובצים
 *
 * קומפוננטה זו משמשת כטריגר לפתיחת המודאל של ניהול מוצרים מקובצים.
 *
 * @param {Object} props
 * @param {Object} props.row - שורת המוצר מהטבלה
 * @param {boolean} props.isNew - האם זה מוצר חדש (משפיע על גודל הכפתור)
 * @param {Function} props.updateValue - פונקציה לעדכון ערכים במוצר חדש
 */
const ManageGrouped = ({ row, isNew = false, updateValue }) => {
  
  return (
    <ManageGroupedModal
      row={row}
      isNew={isNew}
      updateValue={updateValue}
      trigger={
        <CustomTooltip title={__("Manage grouped product", "whizmanage")}>
          <Button
            type="button"
            onClick={(e) => {
              e.preventDefault(); // ✅ למנוע סגירת המודאל
            }}
            className={cn(
              "flex px-2",
              isNew ? "!min-h-10 !min-w-10 !h-10 !w-10" : "!size-8"
            )}
            variant="outline"
            size="icon"
            title="Manage grouped products"
          >
            <Settings2 className="!size-5" />
          </Button>
        </CustomTooltip>
      }
    />
  );
};

export default ManageGrouped;
