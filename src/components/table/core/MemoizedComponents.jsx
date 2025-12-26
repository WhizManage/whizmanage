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
export const SelectAllCheckbox = memo(
  ({ table, rowSelection, __ }) => {
    const flattenAll = (rows) => {
      const out = [];
      for (const r of rows) {
        out.push(r);
        if (r.subRows?.length) out.push(...flattenAll(r.subRows));
      }
      return out;
    };

    const filteredRoots = table.getFilteredRowModel().rows;
    const allRows = flattenAll(filteredRoots);

    const visibleRows = (() => {
      const bucket = [];
      const collectVisible = (rows) => {
        for (const r of rows) {
          bucket.push(r);
          if (r.getIsExpanded() && r.subRows?.length) collectVisible(r.subRows);
        }
      };
      collectVisible(filteredRoots);
      return bucket;
    })();

    const isAllSelected = allRows.length > 0 && allRows.every((r) => r.getIsSelected());
    const areAnySelected = allRows.some((r) => r.getIsSelected());
    const areAllVisibleSelected = visibleRows.length > 0 && visibleRows.every((r) => r.getIsSelected());

    const setRowsSelected = (rows, value) => {
      for (const r of rows) r.toggleSelected(value);
    };

    const handleChange = (next) => {
      if (!next) {
        setRowsSelected(allRows, false);
        return;
      }
      if (areAllVisibleSelected && !isAllSelected) {
        setRowsSelected(allRows, true);
      } else {
        setRowsSelected(visibleRows, true);
      }
    };

    return (
      <Checkbox
        isSelected={isAllSelected}
        isIndeterminate={!isAllSelected && areAnySelected}
        onValueChange={handleChange}
        classNames={{
          base: "!p-0 !m-0",
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
    );
  },
  (prevProps, nextProps) => {
    // רנדר מחדש רק אם ה-selection השתנה
    const prevSelectionKeys = Object.keys(prevProps.rowSelection || {}).sort().join(",");
    const nextSelectionKeys = Object.keys(nextProps.rowSelection || {}).sort().join(",");
    return prevSelectionKeys === nextSelectionKeys;
  }
);
SelectAllCheckbox.displayName = "SelectAllCheckbox";