// src/components/media/MediaEdit.jsx
import { useEffect, useState } from "react";
import MediaDisplay from "./MediaDisplay";
import MediaPicker from "./MediaPicker";

const MediaEdit = ({
  value,
  onChange,
  onFinish,
  onCancel,
  onDirectUpdate,
  editOptions,
  __,
  isForm = false, // 🆕 מצב טופס - לא נפתח אוטומטית
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [canOpen, setCanOpen] = useState(true); // מונע פתיחה מיידית אחרי סגירה
  const [localValue, setLocalValue] = useState(() => {
    if (editOptions?.multiple) return Array.isArray(value) ? [...value] : [];
    return value || null;
  });

  // סנכרון עם value חיצוני (חשוב לטופס)
  useEffect(() => {
    if (editOptions?.multiple) {
      setLocalValue(Array.isArray(value) ? [...value] : []);
    } else {
      setLocalValue(value || null);
    }
  }, [value, editOptions?.multiple]);

  // הסרת תמונה בודדת מהגלריה (במצב טופס)
  const handleRemoveImage = (imageToRemove) => {
    if (!editOptions?.multiple) return;
    const newValue = localValue.filter((img) => img.id !== imageToRemove.id);
    setLocalValue(newValue);
    onChange?.(newValue);
  };

  // 🆕 בטבלה נפתח אוטומטית, בטופס רק בלחיצה
  useEffect(() => {
    if (!isForm) {
      const id = requestAnimationFrame(() => setIsOpen(true));
      return () => cancelAnimationFrame(id);
    }
  }, [isForm]);

  const handleSave = async (selectedValue) => {
    setLocalValue(selectedValue);
    onChange?.(selectedValue);
    setIsOpen(false);
    setCanOpen(false);
    setTimeout(() => setCanOpen(true), 300); // מונע פתיחה מיידית
    onFinish?.();

    try {
      if (onDirectUpdate) await onDirectUpdate(selectedValue);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setCanOpen(false);
    setTimeout(() => setCanOpen(true), 300);
    onCancel?.();
  };

  const handleOpenPicker = () => {
    if (!canOpen) return;
    setIsOpen(true);
  };

  return (
    <div
      className="w-full h-full flex items-center justify-center cursor-pointer"
      onClick={handleOpenPicker}
    >
      <MediaDisplay
        value={localValue}
        editOptions={editOptions}
        isForm={isForm}
        onRemove={isForm && editOptions?.multiple ? handleRemoveImage : undefined}
        onOpenPicker={isForm ? handleOpenPicker : undefined}
      />
      {isOpen && (
        <MediaPicker
          value={localValue}
          onChange={handleSave}
          onClose={handleClose}
          multiple={!!editOptions?.multiple}
          maxSelection={editOptions?.maxSelection}
          title={
            editOptions?.title ||
            (!!editOptions?.multiple
              ? t?.("Edit Gallery")
              : t?.("Select Image"))
          }
          autoOpen
          isForm={isForm} // 🆕 העברת מצב טופס
        />
      )}
    </div>
  );
};

export default MediaEdit;
