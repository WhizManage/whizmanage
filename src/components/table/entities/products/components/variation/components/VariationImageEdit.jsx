// src/components/table/products/components/variation/components/VariationImageEdit.jsx

import MediaPicker from "@components/media/MediaPicker";
import { Avatar, Image, Tooltip } from "@heroui/react";
import { ImagePlus } from "lucide-react";
import { useState } from "react";
 import { __ } from "@wordpress/i18n";
import { useVariationsStore } from "../store/variationsStore";

/**
 * 🎯 VariationImageEdit - עריכת תמונה לווריאציה
 *
 * קומפוננטה ממוקדת שמשלבת את MediaPicker עם הטבלה
 *
 * תכונות:
 * ✅ לחיצה על תמונה פותחת MediaPicker
 * ✅ שמירה אוטומטית ב-Store
 * ✅ תצוגה מקדימה (Tooltip)
 * ✅ Placeholder כשאין תמונה
 */
const VariationImageEdit = ({ row }) => {
   
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Store
  const { updateVariation, toggleUpdatedTable } = useVariationsStore();

  // ✅ טיפול בתמונה - תומך גם בפורמט depth=0 (מוצר) וגם depth>0 (ווריאציה)
  const currentImage =
    row.depth === 0 ? row.original.images?.[0] : row.original.image;

  const hasImage = currentImage?.src;

  /**
   * ✅ פונקציית שמירה - עדכון ב-Store
   */
  const handleSave = (selectedImage) => {
    if (row.depth === 0) {
      // מוצר ראשי - עדכן images[0]
      const updatedImages = [...(row.original.images || [])];
      updatedImages[0] = selectedImage;
      updateVariation(row.id, { images: updatedImages });
    } else {
      // ווריאציה - עדכן image
      updateVariation(row.id, { image: selectedImage });
    }

    toggleUpdatedTable();
    setIsPickerOpen(false);
  };

  /**
   * ✅ פונקציית ביטול
   */
  const handleClose = () => {
    setIsPickerOpen(false);
  };

  return (
    <>
      {/* ✅ תצוגת התמונה - עיצוב משופר כמו בגירסה הישנה */}
      {hasImage ? (
        <Tooltip
          className="p-0 m-0 rounded-lg dark:bg-transparent"
          placement={window.user_local === "he_IL" ? "left" : "right"}
          content={
            <Image
              width={200}
              height={200}
              alt="Preview"
              src={hasImage}
              className="object-cover rounded-lg"
            />
          }
        >
          <Avatar
            src={hasImage}
            radius="sm"
            isBordered
            className="size-8 cursor-pointer dark:!bg-slate-700 dark:!border-slate-700 hover:scale-105 transition-transform"
            isPressable
            onClick={() => setIsPickerOpen(true)}
          />
        </Tooltip>
      ) : (
        <Avatar
          radius="sm"
          isBordered
          className="size-8 cursor-pointer dark:!bg-slate-700 dark:!border-slate-700 hover:scale-105 transition-transform"
          isPressable
          onClick={() => setIsPickerOpen(true)}
          fallback={
            <div
              className="size-8 flex items-center justify-center rounded-lg cursor-pointer hover:border-fuchsia-600 hover:scale-105 transition-all bg-slate-50 dark:bg-slate-700/50"
              onClick={() => setIsPickerOpen(true)}
            >
              <ImagePlus className="w-6 h-6 text-slate-400 hover:text-fuchsia-600 transition-colors" />
            </div>
          }
        />
      )}
      {/* ✅ MediaPicker - נפתח רק כשלוחצים */}
      {isPickerOpen && (
        <MediaPicker
          value={currentImage}
          onChange={handleSave}
          onClose={handleClose}
          multiple={false}
          title={__("Select Image", "whizmanage")}
        />
      )}
    </>
  );
};

export default VariationImageEdit;
