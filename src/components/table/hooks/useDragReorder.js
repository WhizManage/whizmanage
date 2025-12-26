// src/components/table/hooks/useDragReorder.js
/**
 * Hook לטיפול בגרירת שורות עם debounced save
 * משתמש ב-useDebounceFn הקיים שלך מ-useDebounce.js!
 */
import { useCallback, useState } from "react";
import { useDebounceFn } from "./useDebounce";
export function useDragReorder({
  data,
  setData,
  onSave, // פונקציה ששומרת לשרת
  debounceMs = 500,
}) {
  const [isSaving, setIsSaving] = useState(false);
  // :rocket: פונקציית שמירה מדובנסת באמצעות ה-hook הקיים שלך
  const debouncedSave = useDebounceFn(
    async (reorderInfo) => {
      setIsSaving(true);
      try {
        await onSave(reorderInfo);
      } catch (error) {
        console.error(":x: Save failed:", error);
        // כאן אפשר להחזיר את המצב הקודם או להציג הודעת שגיאה
      } finally {
        setIsSaving(false);
      }
    },
    {
      wait: debounceMs,
      maxWait: debounceMs * 3, // לכל היותר פי 3 מה-debounce
    }
  );
  /**
   * טיפול בסיום גרירה
   */
  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      // אם לא שחררו על משהו תקף
      if (!over || active.id === over.id) {
        return;
      }
      // :one: עדכון UI מיידי (אופטימיסטי)
      setData((currentData) => {
        const oldIndex = currentData.findIndex(
          (item) => String(item.id) === String(active.id)
        );
        const newIndex = currentData.findIndex(
          (item) => String(item.id) === String(over.id)
        );
        if (oldIndex === -1 || newIndex === -1) {
          console.warn("Could not find indices:", { oldIndex, newIndex });
          return currentData;
        }
        // יצירת מערך חדש עם הסדר המעודכן
        const newData = [...currentData];
        const [movedItem] = newData.splice(oldIndex, 1);
        newData.splice(newIndex, 0, movedItem);
        return newData;
      });
      // :two: שמירה לשרת (debounced!)
      debouncedSave({
        activeId: active.id,
        overId: over.id,
        oldIndex: data.findIndex(
          (item) => String(item.id) === String(active.id)
        ),
        newIndex: data.findIndex((item) => String(item.id) === String(over.id)),
        timestamp: Date.now(),
      });
    },
    [data, setData, debouncedSave]
  );
  /**
   * ביטול שמירה ממתינה
   */
  const cancelPendingSave = useCallback(() => {
    debouncedSave.cancel();
    setIsSaving(false);
  }, [debouncedSave]);
  /**
   * שמירה מיידית (flush)
   */
  const saveImmediately = useCallback(() => {
    debouncedSave.flush();
  }, [debouncedSave]);
  return {
    handleDragEnd,
    isSaving,
    cancelPendingSave,
    saveImmediately,
  };
}
