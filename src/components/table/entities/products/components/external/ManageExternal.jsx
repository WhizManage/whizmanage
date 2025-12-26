// src/components/table/entities/products/components/external/ManageExternal.jsx

import { cn } from "@/lib/utils";
import { Button } from "@components/ui/button";
import CustomTooltip from "@components/ui/nextUI/Tooltip";
import { Settings2 } from "lucide-react";
import ManageExternalModal from "./ManageExternalModal";
 import { __ } from "@wordpress/i18n";

/**
 * 🌐 ManageExternal - נקודת הכניסה לניהול מוצרים חיצוניים
 *
 * קומפוננטה זו משמשת כטריגר לפתיחת המודאל של ניהול מוצרים חיצוניים/אפיליאט.
 *
 * @param {Object} props
 * @param {Object} props.row - שורת המוצר מהטבלה
 * @param {boolean} props.isNew - האם זה מוצר חדש (משפיע על גודל הכפתור)
 * @param {Function} props.updateValue - פונקציה לעדכון ערכים במוצר חדש
 */
const ManageExternal = ({ row, isNew = false, updateValue }) => {
   
  return (
    <ManageExternalModal
      row={row}
      isNew={isNew}
      updateValue={updateValue}
      trigger={
        <CustomTooltip title={__("Manage external product", "whizmanage")}>
          <Button
            type="button"
            onClick={(e) => {
              e.preventDefault(); // ✅ כמו ב-AddVariations!
            }}
            className={cn(
              "flex px-2",
              isNew ? "!min-h-10 !min-w-10 !h-10 !w-10" : "!size-8"
            )}
            variant="outline"
            size="icon"
            title="Manage external product"
          >
            <Settings2 className="!size-5" />
          </Button>
        </CustomTooltip>
      }
    />
  );
};

export default ManageExternal;
