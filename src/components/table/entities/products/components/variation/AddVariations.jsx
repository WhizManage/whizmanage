// src/components/table/entities/products/components/variation/AddVariations.jsx

import CustomTooltip from "@components/ui/nextUI/Tooltip";
import { Button } from "@components/ui/button";
import { cn } from "@/lib/utils";
import { Settings2 } from "lucide-react";
import ManageVariationsModal from "./components/ManageVariationsModal";
import { __ } from "@wordpress/i18n";

/**
 * 🎯 AddVariations - נקודת הכניסה לניהול Variations
 *
 * קומפוננטה זו משמשת כטריגר לפתיחת המודאל של ניהול הווריאציות.
 * היא יכולה לשמש גם לניהול מלא של variations וגם רק לניהול attributes.
 *
 * שיפורים מהגירסה הישנה:
 * ✅ תמיכה ב-2 מצבים: full / attributes-only
 * ✅ גמישות מלאה - ניתן לשימוש חוזר
 * ✅ props ברורים ומתועדים
 * ✅ וידוא נתונים (validation)
 *
 * @param {Object} props
 * @param {Object} props.row - שורת המוצר מהטבלה
 * @param {boolean} props.isNew - האם זה מוצר חדש (משפיע על גודל הכפתור)
 * @param {'full' | 'attributes-only'} props.mode - מצב התצוגה (ברירת מחדל: 'full')
 * @param {boolean} props.showTour - האם להציג tour (רק ב-mode full)
 */
const AddVariations = ({
  row,
  isNew = false,
  mode = "full",
  showTour = true,
}) => {
  // ✅ חילוץ המוצר מהשורה
  const product = row?.original;

  // ✅ בדיקת תקינות - אם אין מוצר, לא מציגים כלום
  if (!product) {
    console.error("AddVariations: No product data provided");
    return null;
  }

  // ✅ וידוא ש-attributes הוא תמיד מערך
  const safeProduct = {
    ...product,
    attributes: Array.isArray(product.attributes) ? product.attributes : [],
  };

  return (
    <ManageVariationsModal
      product={safeProduct}
      mode={mode}
      showTour={showTour && mode === "full"}
      trigger={
        <CustomTooltip
          title={mode === "full" ? __("Manage variations", "whizmanage") : __("Manage attributes", "whizmanage")}
        >
          <Button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              // e.stopPropagation();
            }}
            className={cn(
              "flex px-2",
              isNew ? "!min-h-10 !min-w-10 !h-10 !w-10" : "!size-7"
            )}
            variant="outline"
            size="icon"
          >
            <Settings2 className="!size-4" />
          </Button>
        </CustomTooltip>
      }
    />
  );
};

export default AddVariations;

/**
 * 📚 דוגמאות שימוש:
 *
 * 1️⃣ ניהול מלא של variations (ברירת מחדל):
 * ```jsx
 * <AddVariations row={row} />
 * ```
 *
 * 2️⃣ ניהול רק של attributes:
 * ```jsx
 * <AddVariations row={row} mode="attributes-only" />
 * ```
 *
 * 3️⃣ ניהול variations ללא tour:
 * ```jsx
 * <AddVariations row={row} showTour={false} />
 * ```
 *
 * 4️⃣ מוצר חדש עם כפתור גדול יותר:
 * ```jsx
 * <AddVariations row={row} isNew={true} />
 * ```
 *
 * 5️⃣ שילוב של הכל:
 * ```jsx
 * <AddVariations 
 *   row={row} 
 *   mode="attributes-only" 
 *   isNew={true} 
 *   showTour={false} 
 * />
 * ```
 */