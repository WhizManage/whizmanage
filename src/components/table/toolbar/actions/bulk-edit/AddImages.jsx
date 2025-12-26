// src/components/table/toolbar/actions/bulk-edit/AddImages.jsx
import React, { useCallback, useMemo, useState } from "react";
import { Avatar, AvatarGroup, Button } from "@heroui/react";
import MediaPicker from "@components/media/MediaPicker";
 import { __ } from "@wordpress/i18n";


const AddImages = React.memo(function AddImages({
  images = [],
  updateValue,
  index = 0,
  title = "Select Gallery Images",
  maxSelection = 100,
}) {
   
  
  const [open, setOpen] = useState(false);

  // ✅ נרמול ערך פתיחה - רק פעם אחת
  const initial = useMemo(
    () => (Array.isArray(images) ? images.filter((x) => x && x.id && x.src) : []),
    [] // ריק - רק בהתחלה!
  );

  const [galleryImages, setGalleryImages] = useState(initial);

  // ✅ handleChange מטפל בהכל - כולל קריאה ל-updateValue
  const handleChange = useCallback((val) => {
    const clean = Array.isArray(val) ? val.filter((v) => v && v.id && v.src) : [];
    
    setGalleryImages(clean);
    
    // קורא ישירות ל-updateValue כאן - ללא useEffect!
    updateValue?.(index, "value", clean);
  }, [index, updateValue]);

  const trigger = useMemo(
    () => (
      <Button
        size="sm"
        variant="light"
        className="h-8 px-3 rounded-md bg-transparent text-fuchsia-600 dark:text-fuchsia-400"
        onPress={() => setOpen(true)}
      >
        {title}
      </Button>
    ),
    [title]
  );

  return (
    <div className="w-full rounded-lg border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 h-auto min-h-16 flex items-center gap-4 px-3 py-2">
      {/* טריגר לפתיחה */}
      {trigger}
      {/* מודאל – נטען רק כשפתוח */}
      {open && (
        <MediaPicker
          value={galleryImages}
          onChange={(val) => {
            handleChange(val);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
          multiple
          maxSelection={maxSelection}
          title={title}
          autoOpen
        />
      )}
      {/* תצוגה קומפקטית */}
      <div className="flex-1 flex items-center justify-between gap-4">
        <div className="flex items-center">
          {galleryImages.length === 0 ? (
            <span className="text-sm text-slate-400 dark:text-slate-500">
              {__("No images selected yet", "whizmanage")}
            </span>
          ) : (
            <AvatarGroup isBordered max={12} radius="sm">
              {galleryImages.map((img) => (
                <Avatar key={img.id} src={img.src} radius="sm" isBordered />
              ))}
            </AvatarGroup>
          )}
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-300">
          {galleryImages.length} {__("selected", "whizmanage")}
        </div>
      </div>
    </div>
  );
});

export default AddImages;