// src/components/table/trash/useTrashEntityStore.js

import { useRef, useState } from "react";

export const makeUseTrashEntityStore = ({
  key,
  adapters,
  initial = [],
} = {}) => {
  const idField = adapters?.idField || "id";

  return function useTrashEntityStore() {
    const [data, setData] = useState(initial);
    const [isLoading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [columnOrder, setColumnOrder] = useState([]);
    const [columnVisibility, setColumnVisibility] = useState({});
    const [columnSizing, setColumnSizing] = useState({});
    const [columnPinning, setColumnPinning] = useState({});
    const [sorting, setSorting] = useState([]);
    const [globalFilter, setGlobalFilter] = useState("");
    const [columnFilters, setColumnFilters] = useState([]);
    const [enableFilters, setEnableFilters] = useState(null);
    const [rowSelection, setRowSelection] = useState({});
    const [pagination, setPagination] = useState({
      pageIndex: 0,
      pageSize: 20,
    });

    const undoRedoHistoryRef = useRef(null);

    // תאימות אחורה: לא משתמשים בזה להחלטת fetch ראשון
    const fetchedRef = useRef(false);

    // חדש: בוצע fetch אמיתי מהשרת לפחות פעם אחת
    const serverFetchedRef = useRef(false);

    const setUndoRedoHistory = (h) => {
      undoRedoHistoryRef.current = h;
    };

    const getItemsByIds = (ids) => {
      const idSet = new Set((ids || []).map(String));
      return data.filter((d) => idSet.has(String(d?.[idField])));
    };

    const updateItem = (id, patch) => {
      setData((prev) =>
        prev.map((it) =>
          String(it?.[idField]) === String(id) ? { ...it, ...patch } : it
        )
      );
    };

    const deleteItem = (id) => {
      setData((prev) =>
        prev.filter((it) => String(it?.[idField]) !== String(id))
      );
    };

    const deleteItemsByIds = (ids) => {
      const idSet = new Set((ids || []).map(String));
      setData((prev) => prev.filter((it) => !idSet.has(String(it?.[idField]))));
    };

    const addItem = (item) => setData((prev) => [...prev, item]);

    const reorderItems = (oldIndex, newIndex) => {
      setData((prev) => {
        const arr = prev.slice();
        const [moved] = arr.splice(oldIndex, 1);
        arr.splice(newIndex, 0, moved);
        return arr;
      });
    };

    // לא נקראות מעדכונים לוקליים יותר (נשאר לתאימות)
    const markFetched = () => {
      fetchedRef.current = true;
    };
    const hasFetched = () => fetchedRef.current;

    // ייקרא רק אחרי fetch מהשרת
    const markServerFetched = () => {
      serverFetchedRef.current = true;
    };
    const hasServerFetched = () => serverFetchedRef.current;

    return {
      key,
      adapters,
      data,
      setData,
      isLoading,
      setLoading,
      error,
      setError,
      columnOrder,
      setColumnOrder,
      columnVisibility,
      setColumnVisibility,
      columnSizing,
      setColumnSizing,
      columnPinning,
      setColumnPinning,
      sorting,
      setSorting,
      globalFilter,
      setGlobalFilter,
      columnFilters,
      setColumnFilters,
      enableFilters,
      setEnableFilters,
      rowSelection,
      setRowSelection,
      pagination,
      setPagination,
      reorderItems,
      deleteItemsByIds,
      updateItem,
      getItemsByIds,
      deleteItem,
      addItem,
      undoRedoHistory: undoRedoHistoryRef.current,
      setUndoRedoHistory,

      // תאימות קיימת
      hasFetched,
      markFetched,

      // החדש — משמש להחלטות טעינה
      hasServerFetched,
      markServerFetched,

      table: null,
    };
  };
};
