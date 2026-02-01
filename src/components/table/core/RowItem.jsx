// src/components/table/components/RowItem.jsx
import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { flexRender } from "@tanstack/react-table";
import { GripVertical } from "lucide-react";
import { memo, useMemo } from "react";
import {
  isDarkMode as checkDarkMode,
  getAnyId,
  getCommonPinningStyles,
  getShadow,
} from "../utils/tableUtils.js";

/**
 * DraggableRow
 * - אם יש ידית בתא "actions" נשתמש בה
 * - אם אין (מסיבה כלשהי), כל השורה הופכת לידית (fallback)
 * - ✅ תמיכה בסימון שורות חדשות
 * - ✅ עטוף ב-memo למניעת רינדור מיותר
 */

export const DraggableRow = memo(
  function DraggableRow({
    row,
    children,
    isSelected,
    onToggleSelect,
    config,
    style = {},
  }) {
    const isDragEnabled = config?.enableRowDragging && !row.original?.isVariant;

    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: String(getAnyId(row.original ?? {})),
      data: { type: "row" },
      disabled: !isDragEnabled,
    });

    // נרשום את ה־handlers על האובייקט של השורה – כדי שהידית שבתא תוכל להשתמש בהם
    if (!row.original) row.original = {};
    row.original._rowElement = {
      dragHandlers: { attributes, listeners },
      isDragging,
    };

    // Fallback: אם אין ידית – נאפשר לגרור מכל השורה
    const rowListeners = useMemo(() => {
      const hasHandle = true; // יש לנו ידית ב-actions בעיצוב ברירת מחדל
      return hasHandle ? {} : listeners;
    }, [listeners]);

    const combinedStyle = {
      ...style,
      transform: CSS.Transform.toString(transform) || style.transform,
      transition: isDragging ? "none" : transition,
      zIndex: isDragging ? 1000 : style.zIndex || "auto",
      position: isDragging ? "relative" : style.position || "static",
      borderBottom:
        style.position === "absolute"
          ? "1px solid rgb(226 232 240)"
          : undefined,
      boxShadow: isDragging ? getShadow("dragging") : undefined,
    };

    const isVariant = row.original?.isVariant;
    // ✅ בדיקה אם זו שורה חדשה
    const isNewRow = row.original?._isNew === true;

    return (
      <tr
        ref={setNodeRef}
        {...rowListeners}
        {...attributes}
        style={combinedStyle}
        // ✅ data attribute לזיהוי שורות חדשות
        data-is-new-row={isNewRow ? "true" : "false"}
        data-row-id={String(getAnyId(row.original ?? {}))}
        className={cn(
          "group transition-all duration-150 hover:!shadow dark:hover:!shadow-2xl relative",
          isDragging
            ? "shadow-2xl"
            : isVariant
              ? "bg-slate-50 dark:bg-slate-700"
              : "hover:!bg-slate-50 dark:hover:!bg-slate-700",
          // ✅ סטיילינג מיוחד לשורות חדשות
          isNewRow &&
            !isDragging &&
            "!bg-fuchsia-50/40 dark:!bg-fuchsia-900/20 ring-2 ring-inset ring-fuchsia-500/30 dark:ring-fuchsia-500/20"
        )}
        aria-grabbed={isDragging ? "true" : undefined}
        role="row"
        aria-selected={isSelected}
      >
        {children}
      </tr>
    );
  },
  // ✅ comparison function - רק אם משהו חשוב השתנה
  (prevProps, nextProps) => {
    // אם ה-ID שונה, זו שורה אחרת לגמרי
    if (prevProps.row.id !== nextProps.row.id) return false;

    // אם מצב הבחירה השתנה
    if (prevProps.isSelected !== nextProps.isSelected) return false;

    // אם הקונפיג השתנה (reference equality)
    if (prevProps.config !== nextProps.config) return false;

    // אם ה-style השתנה
    if (JSON.stringify(prevProps.style) !== JSON.stringify(nextProps.style))
      return false;

    // ✅ הכי חשוב: אם הנתונים של השורה השתנו
    if (prevProps.row.original !== nextProps.row.original) return false;

    // אם ה-children (התאים) השתנו
    if (prevProps.children !== nextProps.children) return false;

    // אם הגענו לכאן, שום דבר חשוב לא השתנה
    return true;
  }
);

/**
 * PinnableCell
 * - הסרתי stopPropagation מהידית (מאפשר ל־DnD לקבל את ה־pointerdown)
 * - השארתי בלחצנים/צ׳קבוקסים כדי שלא יתחילו גרירה בטעות
 * - ✅ תמיכה בסימון תאים של שורות חדשות
 * - ✅ עטוף ב-memo למניעת רינדור מיותר
 */
export const PinnableCell = memo(
  function PinnableCell({ cell, config, table, isRowSelected }) {
    // ⚡ אופטימיזציה: במקום MutationObserver לכל תא, נשתמש בבדיקה פשוטה
    // Dark mode משתנה רק כשהמשתמש משנה הגדרה, לא בזמן פתיחת שורות
    const isDarkMode = checkDarkMode();

    const isPinned = cell.column.getIsPinned();
    const isLastLeftPinned =
      isPinned === "left" && cell.column.getIsLastColumn("left");
    const isFirstRightPinned =
      isPinned === "right" && cell.column.getIsFirstColumn("right");

    // ✅ בדיקה אם התא שייך לשורה חדשה
    const isNewRow = cell.row.original?._isNew === true;

    const baseStyle = {
      width: cell.column.getSize(),
      minWidth: cell.column.getSize(),
      maxWidth: cell.column.getSize(),
      ...getCommonPinningStyles(cell.column),
    };

    // ---- צל לעמודות מוצמדות ----
    const cellShadow = isLastLeftPinned
      ? getShadow("pinnedLeft", isDarkMode)
      : isFirstRightPinned
        ? getShadow("pinnedRight", isDarkMode)
        : undefined;

    // ---- עמודת בחירה/אקשנים (שמאל) ----
    if (cell.column.id === "actions") {
      const row = cell.row;
      const isSelected = isRowSelected; // ✨ נלקח מה-prop היציב
      const dragHandlers = row.original?._rowElement?.dragHandlers || {};
      const isVariant = row.original?.isVariant;
      const actionsStyle = {
        ...baseStyle,
        boxShadow: cellShadow,
      };

      return (
        <td
          className={cn(
            "py-2 px-1 z-30",
            "border-b border-slate-200 dark:border-slate-700",
            "hover:ring-1 hover:ring-inset hover:ring-slate-300/50 dark:hover:ring-slate-500/50",
            "focus:outline-none focus:ring-1 focus:ring-inset focus:ring-fuchsia-400/70 dark:focus:ring-fuchsia-500/70",
            isSelected
              ? "!bg-slate-100 dark:!bg-gray-950 dark:group-hover:!bg-gray-900"
              : "dark:bg-slate-800 group-hover:!bg-slate-50 dark:group-hover:!bg-slate-700",
            isNewRow && "!bg-fuchsia-50/40 dark:!bg-fuchsia-900/20"
          )}
          style={actionsStyle}
          tabIndex={0}
          role="gridcell"
          data-tour="drag-reorder"
        >
          <div className="flex items-center justify-between">
            {isVariant && <div className="w-5" />}

            {!isVariant &&
              config?.enableRowDragging &&
              dragHandlers &&
              !row.depth && (
                <div
                  {...dragHandlers.attributes}
                  {...dragHandlers.listeners}
                  className="cursor-grab hover:cursor-grabbing flex-shrink-0 mt-0.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400"
                  style={{ touchAction: "none" }}
                  aria-label="Drag row"
                  title="Drag row"
                >
                  <GripVertical className="size-3.5 transition-all duration-150 hidden group-hover:block [.tour-active_&]:block" />
                </div>
              )}

            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </div>
        </td>
      );
    }

    // ---- עמודת פעולות שורה (ימין) ----
    if (cell.column.id === "row-actions") {
      const row = cell.row;
      const isSelected = isRowSelected; // ✨
      const rowActionsStyle = {
        ...baseStyle,
        boxShadow: cellShadow,
      };

      return (
        <td
          className={cn(
            "py-2 px-1 z-30",
            "border-b border-slate-200 dark:border-slate-700",
            "hover:ring-1 hover:ring-inset hover:ring-slate-300/50 dark:hover:ring-slate-500/50",
            "focus:outline-none focus:ring-1 focus:ring-inset focus:ring-fuchsia-400/70 dark:focus:ring-fuchsia-500/70",
            isSelected
              ? "!bg-slate-100 dark:!bg-gray-950 dark:group-hover:!bg-gray-900"
              : "dark:bg-slate-800 group-hover:!bg-slate-50 dark:group-hover:!bg-slate-700",
            isNewRow && "!bg-fuchsia-50/40 dark:!bg-fuchsia-900/20"
          )}
          style={rowActionsStyle}
          tabIndex={0}
          role="gridcell"
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      );
    }

    // ---- ברירת מחדל: כל שאר התאים ----
    const defaultCellStyle = {
      ...baseStyle,
      boxShadow: cellShadow,
    };

    return (
      <td
        className={cn(
          "px-2 whitespace-nowrap py-1 overflow-hidden",
          "border-b border-slate-200 dark:!border-slate-700",
          "hover:ring-1 hover:ring-inset hover:ring-slate-300/50 dark:hover:ring-slate-500/50",
          "focus:outline-none focus:ring-1 focus:ring-inset focus:ring-fuchsia-400/70 dark:focus:ring-fuchsia-500/70",
          isRowSelected
            ? "!bg-slate-100 dark:!bg-gray-950 dark:group-hover:!bg-gray-900"
            : "group-hover:!bg-slate-50 dark:group-hover:!bg-slate-700",
          isNewRow && "!bg-fuchsia-50/40 dark:!bg-fuchsia-900/20"
        )}
        style={defaultCellStyle}
        tabIndex={0}
        role="gridcell"
        data-editable={
          cell.column.columnDef.enableEditing !== false ? "true" : "false"
        }
      >
        {flexRender(cell.column.columnDef.cell, cell.getContext())}
      </td>
    );
  },
  (prevProps, nextProps) => {
    if (prevProps.cell.id !== nextProps.cell.id) return false;

    // 👇 זה הטריגר לרנדר כשמצמידים/משחררים עמודות
    if (prevProps.pinKey !== nextProps.pinKey) return false;

    // 👇 רק עמודת actions צריכה להתעדכן כשפותחים/סוגרים שורות
    const isActionsColumn = prevProps.cell.column.id === "actions";
    if (isActionsColumn && prevProps.expandedVersion !== nextProps.expandedVersion) {
      return false;
    }

    const prevValue = prevProps.cell.getValue();
    const nextValue = nextProps.cell.getValue();
    if (prevValue !== nextValue) {
      if (typeof prevValue === "object" && typeof nextValue === "object") {
        if (JSON.stringify(prevValue) !== JSON.stringify(nextValue))
          return false;
      } else {
        return false;
      }
    }

    if (prevProps.config !== nextProps.config) return false;
    if (prevProps.isRowSelected !== nextProps.isRowSelected) return false;
    if (prevProps.cell.row.original !== nextProps.cell.row.original)
      return false;

    return true;
  }
);
