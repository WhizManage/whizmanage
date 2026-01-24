// src/components/table/MemoizedComponents.jsx
import { memo } from "react";
import { RowActionsMenu as OriginalRowActionsMenu } from "./RowActionsMenu.jsx";
import { TableActionsMenu as OriginalTableActionsMenu } from "./TableActionsMenu.jsx";
import { ColumnHeader as OriginalColumnHeader } from "./ColumnHeader.jsx";
import { Checkbox } from "@heroui/react";

/**
 * RowActionsMenu - מתעדכן רק כש-actions משתנות באמת
 */
export const RowActionsMenu = memo(
  OriginalRowActionsMenu,
  (prevProps, nextProps) => {
    // השווה רק את מה שבאמת משפיע על התצוגה
    if (prevProps.row.id !== nextProps.row.id) return false;

    // השווה את ה-actions
    const prevActions = prevProps.actions;
    const nextActions = nextProps.actions;

    if (!prevActions && !nextActions) return true;
    if (!prevActions || !nextActions) return false;
    if (prevActions.length !== nextActions.length) return false;

    // השווה את המפתחות של הפעולות
    for (let i = 0; i < prevActions.length; i++) {
      if (prevActions[i]?.key !== nextActions[i]?.key) return false;
      if (prevActions[i]?.label !== nextActions[i]?.label) return false;
    }

    return true; // זהה - אל תרנדר מחדש
  }
);
RowActionsMenu.displayName = "MemoizedRowActionsMenu";

/**
 * TableActionsMenu - מתעדכן רק כש-selectedCount משתנה
 */
export const TableActionsMenu = memo(
  OriginalTableActionsMenu,
  (prev, next) => {
    if (prev.selectedCount !== next.selectedCount) return false;
    // חשוב: טריגרים לשינויי היסטוריה
    if (prev.historyVersion !== next.historyVersion) return false;
    if (prev.canUndo !== next.canUndo) return false;
    if (prev.canRedo !== next.canRedo) return false;

    // שאר רפרנסים יציבים
    return (
      prev.store === next.store &&
      prev.useTableStore === next.useTableStore &&
      prev.tableDefaults === next.tableDefaults
    );
  }
);
TableActionsMenu.displayName = "MemoizedTableActionsMenu";

/**
 * ColumnHeader - מתעדכן רק כשמשהו רלוונטי משתנה
 */
export const ColumnHeader = memo(
  OriginalColumnHeader,
  (prevProps, nextProps) => {
    const prev = prevProps.header;
    const next = nextProps.header;

    if (prev.id !== next.id) return false;
    if (prev.column.getIsPinned() !== next.column.getIsPinned()) return false;
    if (prev.column.getIsSorted() !== next.column.getIsSorted()) return false;
    if (prev.column.getSize() !== next.column.getSize()) return false;
    if (prev.column.getIsResizing() !== next.column.getIsResizing()) return false;
    if (prevProps.isActionsColumn !== nextProps.isActionsColumn) return false;
    if (prevProps.table !== nextProps.table) return false;

    // ⚡ רק עמודת actions צריכה להתעדכן כש-selection או expanded משתנים
    if (prevProps.isActionsColumn) {
      if (prevProps.selectionVersion !== nextProps.selectionVersion) return false;
      if (prevProps.expandedVersion !== nextProps.expandedVersion) return false;
    }

    return true;
  }
);

ColumnHeader.displayName = "MemoizedColumnHeader";

/**
 * SelectAllCheckbox - מתעדכן רק כש-selection משתנה
 */
export const SelectAllCheckbox = ({ table, __ }) => {
  const flattenAll = (rows) => {
    const out = [];
    for (const r of rows) {
      out.push(r);
      if (r.subRows?.length) out.push(...flattenAll(r.subRows));
    }
    return out;
  };

  const getRowsData = () => {
    const filteredRoots = table.getFilteredRowModel()?.rows ?? [];
    const rowModelRows = table.getRowModel()?.rows ?? [];
    const rootRows = filteredRoots.length > 0 ? filteredRoots : rowModelRows;
    const allRows = flattenAll(rootRows);

    const visibleRows = (() => {
      const bucket = [];
      const collectVisible = (rows) => {
        for (const r of rows) {
          bucket.push(r);
          if (r.getIsExpanded() && r.subRows?.length) collectVisible(r.subRows);
        }
      };
      collectVisible(rootRows);
      return bucket;
    })();

    const isAllSelected = allRows.length > 0 && allRows.every((r) => r.getIsSelected());
    const areAnySelected = allRows.some((r) => r.getIsSelected());
    const areAllVisibleSelected = visibleRows.length > 0 && visibleRows.every((r) => r.getIsSelected());

    return { allRows, visibleRows, isAllSelected, areAnySelected, areAllVisibleSelected };
  };

  // לרנדור - חשב פעם אחת
  const { isAllSelected, areAnySelected, areAllVisibleSelected } = getRowsData();

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // חשב מחדש בזמן ה-click כדי לקבל את הנתונים העדכניים
    const { allRows, visibleRows, isAllSelected: currentIsAllSelected, areAnySelected: currentAreAnySelected, areAllVisibleSelected: currentAreAllVisibleSelected } = getRowsData();

    // בנה את ה-selection object בפעם אחת במקום לקרוא ל-toggleSelected על כל שורה
    let newSelection = {};

    if (currentIsAllSelected || currentAreAnySelected) {
      // בטל הכל - selection ריק
      newSelection = {};
    } else if (currentAreAllVisibleSelected && !currentIsAllSelected) {
      // בחר הכל (כולל collapsed)
      for (const r of allRows) {
        newSelection[r.id] = true;
      }
    } else {
      // בחר את הנראים
      for (const r of visibleRows) {
        newSelection[r.id] = true;
      }
    }

    // עדכון אחד במקום מאות
    table.setRowSelection(newSelection);
  };

  return (
    <div onClick={handleClick} className="cursor-pointer">
      <Checkbox
        isSelected={isAllSelected}
        isIndeterminate={!isAllSelected && areAnySelected}
        classNames={{
          base: "!p-0 !m-0 pointer-events-none",
          wrapper: "dark:border dark:!border-slate-600 text-white focus:!ring-slate-500 bg-white dark:!bg-slate-700 m-0 p-0",
        }}
        aria-label={
          isAllSelected
            ? __("Deselect all rows", "whizmanage")
            : areAllVisibleSelected
              ? __("Select all rows (including collapsed)", "whizmanage")
              : __("Select all visible rows", "whizmanage")
        }
      />
    </div>
  );
};
SelectAllCheckbox.displayName = "SelectAllCheckbox";