import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import React from "react";
import RowItem from "./RowItem";

const SortableRow = React.memo(function SortableRow({
  row,
  isEditing,
  toggleEdit,
  fetchData,
  editAll,
  editedItems,
  setData,
  setEditedItems,
  isTrash,
  isTableImport,
  isRTL,
  isDark,
  data,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: row.original.id.toString(),
    disabled: isEditing || editAll || row.depth !== 0,
    // ← הסר את transition מכאן!
  });

  const style = React.useMemo(
    () => ({
      // שיפור ה-transform עם GPU acceleration
      transform: CSS.Transform.toString(transform),
      transition: isDragging
        ? "none"
        : "transform 150ms cubic-bezier(0.25, 1, 0.5, 1)",
      opacity: isDragging ? 0.95 : 1,
      zIndex: isDragging ? 9999 : "auto",
      position: "relative", // תמיד relative למען עקביות
      // שיפורי GPU acceleration
      willChange: isDragging ? "transform" : "auto",
      backfaceVisibility: "hidden",
      perspective: "1000px",
      transformStyle: "preserve-3d",
      // מניעת קפיצות
      ...(isDragging && {
        isolation: "isolate",
        contain: "layout style paint",
      }),
    }),
    [transform, isDragging]
  );

  const dragHandleProps = React.useMemo(
    () => ({
      attributes: {
        ...attributes,
        // שיפור נגישות
        role: "button",
        "aria-describedby": `drag-instructions-${row.original.id}`,
      },
      listeners, // ← השתמש ב-listeners המקורי!
      isDragging,
      isOver,
      disabled: isEditing || editAll,
    }),
    [
      attributes,
      listeners, // ← שינוי כאן
      isDragging,
      isOver,
      isEditing,
      editAll,
      row.original.id,
    ]
  );

  return (
    <RowItem
      ref={setNodeRef}
      style={style}
      row={row}
      isEditing={isEditing}
      toggleEdit={toggleEdit}
      fetchData={fetchData}
      editAll={editAll}
      editedItems={editedItems}
      setData={setData}
      setEditedItems={setEditedItems}
      isTrash={isTrash}
      isTableImport={isTableImport}
      isRTL={isRTL}
      isDark={isDark}
      data={data}
      dragHandle={dragHandleProps}
    />
  );
});

export default SortableRow;