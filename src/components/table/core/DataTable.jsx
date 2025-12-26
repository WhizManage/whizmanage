// src/components/table/core/DataTable.jsx

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  restrictToHorizontalAxis,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Checkbox } from "@heroui/react";
import { ChevronRightIcon } from "@radix-ui/react-icons";
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import {
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
 import { __ } from "@wordpress/i18n";

import { toast } from "@/lib/utils";
import { postApi } from "@/services/services";
import Button from "@components/ui/button.jsx";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  buildPayloadForEntity,
  getEntityConfig,
} from "../../forms/registry.js";
import StatusBarFilter from "../filters/StatusBarFilter.jsx";
import { useDragReorder } from "../hooks/useDragReorder.js";
import { useKeyboardNavigation } from "../hooks/useKeyboardNavigation.js";
import {
  GenericToolbar,
  makeUnifiedActionsBuilder,
} from "../toolbar/GenericToolbar.jsx";
import { createGenericActions } from "../toolbar/actions/genericActions.js";
import {
  getAnyId,
  restrictColumnDragToTableBounds,
  restrictRowDragToTableBounds,
} from "../utils/tableUtils.js";
import { EditableCell } from "./EditableCell.jsx";
import {
  ColumnHeader,
  RowActionsMenu,
  SelectAllCheckbox,
  TableActionsMenu,
} from "./MemoizedComponents.jsx";
import { Pagination } from "./Pagination.jsx";
import { DraggableRow, PinnableCell } from "./RowItem.jsx";
import { useTableErrorHandler } from "./TableErrorBoundary.jsx";
import TableLoadingOverlay from "./TableLoadingOverlay.jsx";
import { TopPanel } from "./TopPanel.jsx";

export default function GenericDataTable({
  useTableStore,
  store,
  columns = [],
  config = {},
  tableDefaults = {},
  entityName,
  onSelectionChange,
  onAddTestData,
  undoRedoProps = null,
  customActions = null,
  bulkRows,
  undoRedoHistory,
  toolbarConfig = null,
  isTrash = false,
  importConfig = null,
}) {
   
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const __isRTL = window?.document?.documentElement?.dir === "rtl";
  const queryClient = useQueryClient();
  const fetchPage = config.fetchPage;
  const singularize = useCallback(
    (n) => (/ies$/i.test(n) ? n.slice(0, -3) + "y" : n.replace(/s$/i, "")),
    []
  );
  const [serverStats, setServerStats] = useState({ total: 0, totalPages: 1 });

  const resolveEntityConfig = useCallback(() => {
    const direct = getEntityConfig?.(entityName);
    if (direct) return direct;
    const sing = singularize(entityName);
    return getEntityConfig?.(sing) || null;
  }, [entityName, singularize]);

  columns = Array.isArray(columns) ? columns : [];

  useEffect(() => {
    function onRestoreEvt(e) {
      const restored = e?.detail;
      if (!restored) return;
      store.applyRestoredBatch?.(restored);

      const items = restored.items || [];
      const hist = store.undoRedoHistory;
      if (hist?.removeMatching) {
        items.forEach((it) => {
          hist.removeMatching(
            (a) =>
              a.type === "update" &&
              a.id === it.id &&
              (!it.__meta?.field || a.field === it.__meta.field)
          );
        });
      }
    }
    window.addEventListener("wm:history-restore", onRestoreEvt);
    return () => window.removeEventListener("wm:history-restore", onRestoreEvt);
  }, [store]);

  const {
    data,
    isLoading,
    error,
    columnOrder,
    columnVisibility,
    columnSizing,
    columnPinning,
    sorting,
    globalFilter,
    columnFilters,
    enableFilters,
    rowSelection,
    pagination,
    setColumnOrder,
    setColumnVisibility,
    setColumnSizing,
    setColumnPinning,
    setSorting,
    setGlobalFilter,
    setColumnFilters,
    setEnableFilters,
    setRowSelection,
    setPagination,
    reorderItems,
    deleteItemsByIds,
    updateItem,
    getItemsByIds,
    deleteItem,
    addItem,
  } = store;

  

  const selectionVersion = useMemo(
    () => Object.keys(rowSelection || {}).length,
    [rowSelection]
  );

  const [expanded, setExpanded] = useState({});
  // ⚡ State לכמה תתי-שורות להציג לכל שורה (chunked rendering)
  const [visibleSubRowCounts, setVisibleSubRowCounts] = useState({});
  const expandTimeoutsRef = useRef({});
  const expandedRef = useRef(expanded);
  const prevExpandedRef = useRef({});
  const dataRef = useRef(data);

  // עדכון refs כשמשתנים
  useEffect(() => {
    expandedRef.current = expanded;
  }, [expanded]);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // ⚡ מפתח לזיהוי שינויים ב-expanded state - גורם לרנדור מחדש של headers ו-cells
  const expandedVersion = useMemo(
    () => (expanded === true ? "all" : Object.keys(expanded || {}).join(",")),
    [expanded]
  );

  // ⚡ useEffect לטיפול ב-chunked rendering כשמשתנה expanded
  useEffect(() => {
    const INITIAL_CHUNK = 10;
    const CHUNK_SIZE = 20;
    const CHUNK_DELAY = 16;

    const prev = prevExpandedRef.current;
    const next = expanded;

    // מוצאים אילו שורות נפתחו
    const newlyExpandedIds = Object.keys(next).filter(
      (id) => next[id] && !prev[id]
    );

    // מפעילים chunked rendering לשורות שנפתחו
    newlyExpandedIds.forEach((rowId) => {
      const parentRow = dataRef.current.find(
        (row) => String(getAnyId(row)) === rowId
      );
      const totalSubRows = parentRow?.subRows?.length || 0;

      if (totalSubRows > 0) {
        // נקה timeout קודם אם יש
        if (expandTimeoutsRef.current[rowId]) {
          clearTimeout(expandTimeoutsRef.current[rowId]);
        }

        // מתחילים עם chunk ראשון
        setVisibleSubRowCounts((prevCounts) => ({
          ...prevCounts,
          [rowId]: Math.min(INITIAL_CHUNK, totalSubRows),
        }));

        // אם יש עוד תתי-שורות, טוענים בהדרגה
        if (totalSubRows > INITIAL_CHUNK) {
          let currentCount = INITIAL_CHUNK;

          const loadMore = () => {
            currentCount = Math.min(currentCount + CHUNK_SIZE, totalSubRows);
            setVisibleSubRowCounts((prevCounts) => {
              if (expandedRef.current[rowId]) {
                return { ...prevCounts, [rowId]: currentCount };
              }
              return prevCounts;
            });

            if (currentCount < totalSubRows && expandedRef.current[rowId]) {
              expandTimeoutsRef.current[rowId] = setTimeout(
                loadMore,
                CHUNK_DELAY
              );
            }
          };

          expandTimeoutsRef.current[rowId] = setTimeout(loadMore, CHUNK_DELAY);
        }
      }
    });

    // מנקים counts של שורות שנסגרו
    const closedIds = Object.keys(prev).filter((id) => prev[id] && !next[id]);
    closedIds.forEach((id) => {
      if (expandTimeoutsRef.current[id]) {
        clearTimeout(expandTimeoutsRef.current[id]);
        delete expandTimeoutsRef.current[id];
      }
    });

    if (closedIds.length > 0) {
      setVisibleSubRowCounts((prevCounts) => {
        const nextCounts = { ...prevCounts };
        closedIds.forEach((id) => delete nextCounts[id]);
        return nextCounts;
      });
    }

    // שומרים את ה-expanded הנוכחי לסיבוב הבא
    prevExpandedRef.current = { ...next };
  }, [expanded]);

  // ניקוי timeouts בעת unmount
  useEffect(() => {
    return () => {
      Object.values(expandTimeoutsRef.current).forEach(clearTimeout);
    };
  }, []);

  const [columnSizingInfo, setColumnSizingInfo] = useState({});
  const [activeId, setActiveId] = useState(null);
  const [activeType, setActiveType] = useState(null);
  const [scrollPosition, setScrollPosition] = useState(0);

  const headerCustomActions = useMemo(() => {
    const source = toolbarConfig?.customActions ?? customActions;

    if (!source) return null;
    if (Array.isArray(source)) {
      const onlyElements = source.filter((a) => isValidElement(a));
      return onlyElements.length ? onlyElements : null;
    }
    return isValidElement(source) ? source : null;
  }, [toolbarConfig, customActions]);

  const { handleDragEnd: handleOptimisticDragEnd, isSaving: isDragSaving } =
    useDragReorder({
      data,
      setData: () => { },
      onSave: async ({ activeId, overId, oldIndex, newIndex }) => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      },
      debounceMs: 500,
    });

  const defaultConfig = useMemo(
    () => ({
      enableRowSelection: true,
      enableRowActions: true,
      enableSorting: true,
      enableFiltering: true,
      enablePagination: true,
      enableColumnResizing: true,
      enableColumnPinning: true,
      enableRowDragging: false,
      enableColumnDragging: true,
      enableGrouping: false,
      enableEditing: true,
      ...config,
    }),
    [config]
  );

  // ⚡ יוצרים דאטה מעובד עם תתי-שורות מוגבלות לפי visibleSubRowCounts
  const processedData = useMemo(() => {
    if (!defaultConfig.enableGrouping) return data;

    return data.map((row) => {
      const allSubRows = row.subRows ?? [];
      if (allSubRows.length === 0) return row;

      const rowId = String(getAnyId(row));
      const visibleCount = visibleSubRowCounts[rowId];

      // אם אין הגבלה, מחזירים את השורה כמו שהיא
      if (visibleCount === undefined) return row;

      // מחזירים שורה עם תתי-שורות מוגבלות
      return {
        ...row,
        subRows: allSubRows.slice(0, visibleCount),
        _totalSubRows: allSubRows.length, // שומרים את המספר האמיתי
      };
    });
  }, [data, visibleSubRowCounts, defaultConfig.enableGrouping]);

  const tableContainerRef = useRef(null);
  const hasLoadedOnceRef = useRef(false); // ⬅️ חדש: לזכור אם כבר נטענו פעם אחת
  const { handleTableError } = useTableErrorHandler();

  const getSelectedIds = useCallback(() => {
    if (!rowSelection || typeof rowSelection !== "object") return [];
    return Object.keys(rowSelection).filter((id) => rowSelection[id]);
  }, [rowSelection]);

  const clearSelection = useCallback(() => {
    setRowSelection({});
  }, [setRowSelection]);

  useEffect(() => {
    if (onSelectionChange) {
      const selectedIds = getSelectedIds();
      const selectedItems =
        selectedIds.length > 0 && getItemsByIds
          ? getItemsByIds(selectedIds)
          : [];
      onSelectionChange(selectedIds, selectedItems);
    }
  }, [onSelectionChange, getSelectedIds, getItemsByIds]);

  const actionsApi = useMemo(
    () =>
      createGenericActions({
        entityName: toolbarConfig?.entityName || entityName,
        endpoint: toolbarConfig?.endpoint,
        setData: store.setData,
        setRowSelection: store.setRowSelection,
        setIsLoading: store.setLoading,
        __,
        isTrash,
        queryClient,
      }),
    [
      toolbarConfig,
      store.setData,
      store.setRowSelection,
      store.setLoading,
      __,
      isTrash,
      entityName,
    ]
  );

  const buildActions = useMemo(() => {
    const builder = makeUnifiedActionsBuilder({
      __,
      actions: actionsApi,
      isTrash,
      duplicateTransform: toolbarConfig?.duplicateTransform || null,
      onBulkEdit: () => setIsBulkOpen(true),
      customActions:
        toolbarConfig?._rowCustomActions || toolbarConfig?.customActions || [],
      entityName: toolbarConfig?.entityName || entityName,
      allowTrash: toolbarConfig?.allowTrash ?? true,
      allowDelete: toolbarConfig?.allowDelete ?? true,
    });

    if (!isTrash) return builder;

    const allow = (a) => {
      const key = a.key || a.id || a.action || a.label?.toLowerCase?.() || "";
      return /restore|delete/.test(String(key).toLowerCase());
    };
    return (rows) => (builder(rows) || []).filter(allow);
  }, [__, actionsApi, isTrash, toolbarConfig, entityName]);

  const handleResetFilters = useCallback(() => {
    setGlobalFilter("");
    setColumnFilters([]);
    setPagination((prev) => ({ ...(prev || {}), pageIndex: 0 }));
    queryClient.invalidateQueries({ queryKey: [entityName] });
  }, [
    setGlobalFilter,
    setColumnFilters,
    setPagination,
    queryClient,
    entityName,
  ]);

  const enhancedColumns = useMemo(() => {
    const baseCols = Array.isArray(columns) ? columns : [];
    let resultColumns = [...baseCols];

    if (defaultConfig.enableRowSelection) {
      const actionsColumn = {
        id: "actions",
        header: ({ table }) => {
          const canExpandSome = table.getCanSomeRowsExpand();
          const areAllExpanded = table.getIsAllRowsExpanded();

          return (
            <div className="flex w-full justify-end">
              <div className="flex items-center pt-1 gap-1">
                <SelectAllCheckbox
                  table={table}
                  rowSelection={table.getState().rowSelection}
                  __={__}
                />
                {/* {defaultConfig.enableGrouping && canExpandSome ? (
                  <button
                    onClick={table.getToggleAllRowsExpandedHandler()}
                    className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                    title={areAllExpanded ? __("Collapse all") : __("Expand all")}
                  >
                    <ChevronRightIcon
                      className={`size-4 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
                        areAllExpanded
                          ? "rotate-90"
                          : __isRTL
                            ? "rotate-180"
                            : ""
                      }`}
                    />
                  </button>
                ) : (
                  )} */}
                <div className="size-5" />
              </div>
            </div>
          );
        },
        size: 66,
        minSize: 66,
        maxSize: 66,
        cell: ({ row }) => {
          const isSelected = row.getIsSelected();
          const canExpand = row.getCanExpand();
          const isRowExpanded = row.getIsExpanded();
          const isSubRow = row.depth > 0;

          return (
            <div className="flex items-center justify-between gap-1">
              {/* ⚡ הזחה לתתי-שורות - מוסיפים padding מימין ב-RTL (או משמאל ב-LTR) */}
              {isSubRow && <div className="w-4 flex-shrink-0" />}
              <Checkbox
                isSelected={isSelected}
                onValueChange={(next) => row.toggleSelected(next)}
                disableAnimation={false}
                classNames={{
                  base: "!p-0 !m-0",
                  wrapper:
                    "dark:border dark:!border-slate-600 text-white focus:!ring-slate-500 bg-white dark:!bg-slate-700 m-0 p-0",
                }}
              />
              {canExpand && defaultConfig.enableGrouping ? (
                <button
                  onClick={row.getToggleExpandedHandler()}
                  className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600"
                  title={
                    isRowExpanded ? __("Collapse subRows", "whizmanage") : __("Expand subRows", "whizmanage")
                  }
                >
                  <ChevronRightIcon
                    className={`size-4 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${isRowExpanded ? "rotate-90" : __isRTL ? "rotate-180" : ""
                      }`}
                  />
                </button>
              ) : (
                <div className="size-5" />
              )}
            </div>
          );
        },
      };
      resultColumns = [actionsColumn, ...resultColumns];
    }

    if (defaultConfig.enableRowActions) {
      const rowActionsColumn = {
        id: "row-actions",
        header: ({ table }) => {
          const selectedCount = Object.values(
            table.getState().rowSelection ?? {}
          ).filter(Boolean).length;

          return (
            <TableActionsMenu
              table={table}
              store={store}
              useTableStore={useTableStore}
              selectedCount={selectedCount}
              tableDefaults={tableDefaults}
            />
          );
        },
        size: 36,
        minSize: 36,
        maxSize: 36,
        cell: ({ row }) => {
          if (row.depth > 0) return null;
          return (
            <div className="flex items-center justify-center">
              <RowActionsMenu row={row} actions={buildActions([row])} />
            </div>
          );
        },
      };
      resultColumns.push(rowActionsColumn);
    }

    return resultColumns;
  }, [
    Array.isArray(columns) ? columns.length : 0,
    defaultConfig,
    store.setData,
    store.setRowSelection,
    __,
    useTableStore,
    tableDefaults,
    buildActions,
    __isRTL,
  ]);

  // === מיפוי פילטרים לצד שרת (כולל date_from/date_to) ===
  const mapColumnFiltersToServer = useCallback(() => {
    const out = {};
    (columnFilters || []).forEach((f) => {
      const id = f?.id;
      const val = f?.value;
      if (!id) return;

      // תאריכים — מעתיקים כמו שהם (yyyy-MM-dd)
      if (id === "date_from" || id === "date_to") {
        if (val) out[id] = String(val);
        return;
      }

      // מערכים (מרובי בחירה)
      if (Array.isArray(val) && val.length > 0) {
        out[id] = val;
        return;
      }

      // ערכים סקאלריים
      if (typeof val === "string" && val.trim() !== "") {
        out[id] = val.trim();
        return;
      }
    });

    if (globalFilter && String(globalFilter).trim()) {
      out.search = String(globalFilter).trim();
    }
    return out;
  }, [columnFilters, globalFilter]);

  const memoizedConfig = useMemo(() => ({ ...defaultConfig }), [defaultConfig]);

  // ========= Server-side fetching (React Query) =========
  const filtersForServer = mapColumnFiltersToServer();
  const page = (pagination?.pageIndex ?? 0) + 1;
  const perPage = pagination?.pageSize ?? 20;

  const queryKey = [
    entityName,
    { page, perPage, filters: filtersForServer, isTrash },
  ];

  const {
    data: queryData,
    isLoading: isQueryLoading,
    isError,
    error: queryError,
    isPreviousData,
  } = useQuery({
    queryKey: queryKey,
    queryFn: () => fetchPage({ page, perPage, filters: filtersForServer }),
    enabled: true,
    keepPreviousData: true,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!queryData) return;

    const total = queryData.total ?? 0;

    // אם השרת מחזיר totalPages – נוודא לפחות 1
    const fromServer = queryData.totalPages;
    const computedPages =
      typeof fromServer === "number"
        ? fromServer
        : Math.ceil(total / perPage) || 0;

    const safeTotalPages = Math.max(1, computedPages); // ⬅️ לא לתת להיות 0

    store.setData?.(queryData.rows ?? []);
    setServerStats({
      total,
      totalPages: safeTotalPages,
    });

    const maxIndex = Math.max(0, safeTotalPages - 1);
    if ((pagination?.pageIndex ?? 0) > maxIndex) {
      setPagination({
        ...(pagination || {}),
        pageIndex: maxIndex,
      });
    }
  }, [queryData, store.setData, perPage, pagination, setPagination]);

  // סימון שנטענו לפחות פעם אחת (גם אם rows ריק)
  useEffect(() => {
    if (queryData || (Array.isArray(data) && data.length > 0)) {
      hasLoadedOnceRef.current = true;
    }
  }, [queryData, Array.isArray(data) ? data.length : 0]);

  useEffect(() => {
    store.setLoading?.(isQueryLoading && !isPreviousData);
  }, [isQueryLoading, isPreviousData, store.setLoading]);

  // ========= TanStack Table =========
  const table = useReactTable({
    // ⚡ משתמשים בדאטה המעובד עם תתי-שורות מוגבלות
    data: processedData,
    columns: enhancedColumns,
    getSubRows: defaultConfig.enableGrouping
      ? (row) => row.subRows ?? []
      : undefined,

    state: {
      rowSelection,
      columnOrder,
      columnPinning,
      columnSizing,
      columnSizingInfo,
      sorting,
      globalFilter,
      columnFilters,
      pagination,
      columnVisibility,
      expanded,
    },

    onRowSelectionChange: setRowSelection,
    onColumnOrderChange: setColumnOrder,
    onColumnPinningChange: setColumnPinning,
    onColumnSizingChange: setColumnSizing,
    onColumnSizingInfoChange: setColumnSizingInfo,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    onExpandedChange: setExpanded,

    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: defaultConfig.enableFiltering
      ? getFilteredRowModel()
      : undefined,
    getSortedRowModel: defaultConfig.enableSorting
      ? getSortedRowModel()
      : undefined,
    getExpandedRowModel: defaultConfig.enableGrouping
      ? getExpandedRowModel()
      : undefined,
    getPaginationRowModel: defaultConfig.enablePagination
      ? getPaginationRowModel()
      : undefined,

    enableRowSelection: defaultConfig.enableRowSelection,
    enableMultiRowSelection: true,
    enableSubRowSelection: false,
    manualPagination: true,
    pageCount: Math.max(1, serverStats.totalPages || 1),

    manualFiltering: true,
    manualGlobalFilter: true,
    manualColumnFiltering: true,
    enableColumnPinning: defaultConfig.enableColumnPinning,
    enableColumnResizing: defaultConfig.enableColumnResizing,
    enableGlobalFilter: defaultConfig.enableFiltering,
    enableSorting: defaultConfig.enableSorting,

    columnResizeMode: "onChange",
    columnResizeDirection: __isRTL ? "rtl" : "ltr",

    getRowId: (row) => String(getAnyId(row)),

    defaultColumn: {
      size: 150,
      minSize: 50,
      maxSize: 1200,
      cell: ({ getValue, row, column, table }) => {
        return (
          <EditableCell
            getValue={getValue}
            row={row}
            column={column}
            table={table}
          />
        );
      },
    },

    meta: {
      handleCellUpdate: async (
        rowId,
        field,
        value,
        fullRowData,
        isFromHistory = false
      ) => {
        const stringId = String(rowId);
        const isTempId = stringId.startsWith("temp_");
        const isNewRow = fullRowData?._isNew === true;

        if ((isTempId || isNewRow) && !isFromHistory) {
          try {
            const updatedData = { ...fullRowData, [field]: value };
            // Use entityName directly since registry uses plural form (e.g., "products", "orders")
            const payload = await buildPayloadForEntity(
              entityName,
              updatedData
            );
            const endpoint = `${window.siteUrl}/wp-json/wc/v3/${entityName}`;
            const response = await postApi(endpoint, payload);
            const newItem = response.data;

            store.setData((prev) =>
              prev.map((row) =>
                String(row.id) === stringId
                  ? { ...newItem, _isNew: false, _needsSave: false }
                  : row
              )
            );

            toast.success(__("Item created successfully", "whizmanage"));
            return true;
          } catch (error) {
            toast.error(__("Failed to create item", "whizmanage"), {
              description: error?.response?.data?.message || error.message,
            });
            throw error;
          }
        }

        if (typeof store.masterUpdateCell === "function") {
          return await store.masterUpdateCell(
            rowId,
            field,
            value,
            fullRowData,
            isFromHistory
          );
        }
        store.updateItem(rowId, { [field]: value });
        return true;
      },
      store: store,
      t: __
    },

    globalFilterFn: undefined,
  });

  useEffect(() => {
    if (!memoizedConfig.enablePagination) return;

    const cur = pagination?.pageIndex ?? 0;
    const pageCount = table.getPageCount?.();

    if (pageCount === undefined) return;

    if (pageCount <= 0) {
      if (cur !== 0) {
        setPagination((prev) => ({ ...(prev || {}), pageIndex: 0 }));
      }
      return;
    }

    const maxIndex = Math.max(0, pageCount - 1);
    if (cur > maxIndex) {
      setPagination((prev) => ({ ...(prev || {}), pageIndex: maxIndex }));
    }
  }, [
    memoizedConfig.enablePagination,
    pagination?.pageIndex,
    pagination?.pageSize,
    isQueryLoading,
  ]);

  const selectedCount = Object.values(
    table.getState().rowSelection ?? {}
  ).filter(Boolean).length;

  useKeyboardNavigation(table, {
    enableNavigation: defaultConfig.enableKeyboardNavigation !== false,
    enableEditing: defaultConfig.enableEditing,
  });

  const rowsToDisplay = defaultConfig.enablePagination
    ? table.getPaginationRowModel().rows
    : table.getFilteredRowModel().rows;

  // ⚡ אופטימיזציה: יוצרים את pinKey פעם אחת במקום בכל תא
  const pinKey = useMemo(() => JSON.stringify(columnPinning), [columnPinning]);

  // בדיקת חסימת שורות עבור משתמשי Free ב-discount-rules
  const noLicence = typeof window !== "undefined" && window.hasLicence === false;
  const isDiscountRules = entityName === "discount-rules";

  const renderRow = useCallback(
    (row, rowIndex) => {
      const isSelected = row.getIsSelected();
      const isLockedRow = noLicence && isDiscountRules && rowIndex > 0;

      return (
        <DraggableRow
          key={String(row.id)}
          row={row}
          isSelected={isSelected}
          onToggleSelect={() => row.toggleSelected()}
          config={memoizedConfig}
          isLockedRow={isLockedRow}
        >
          {row.getVisibleCells().map((cell) => (
            <PinnableCell
              key={cell.id}
              cell={cell}
              config={memoizedConfig}
              table={table}
              isRowSelected={isSelected}
              pinKey={pinKey}
              expandedVersion={
                cell.column.id === "actions" ? expandedVersion : undefined
              }
            />
          ))}
        </DraggableRow>
      );
    },
    [memoizedConfig, table, pinKey, expandedVersion, noLicence, isDiscountRules]
  );

  const memoizedRowsData = useMemo(() => {
    return rowsToDisplay.map((row, index) => ({ row, _memoKey: String(row.id), rowIndex: index }));
  }, [rowsToDisplay]);

  const memoizedRenderRow = useCallback(
    (rowData) => {
      const { row, rowIndex } = rowData;

      if (row.depth > 0) {
        const isRowSelected = row.getIsSelected();
        return (
          <tr key={rowData._memoKey} className="bg-slate-50 dark:bg-slate-800">
            {row.getVisibleCells().map((cell) => (
              <PinnableCell
                key={cell.id}
                cell={cell}
                config={memoizedConfig}
                table={table}
                isRowSelected={isRowSelected}
                pinKey={pinKey}
              />
            ))}
          </tr>
        );
      }

      return renderRow(row, rowIndex);
    },
    [memoizedConfig, table, renderRow, pinKey]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragStart(event) {
    const { active } = event;
    if (active.data.current?.type === "row" && defaultConfig.enableGrouping) {
      const hasExpanded =
        expanded === true || Object.values(expanded || {}).some(Boolean);
      if (hasExpanded) setExpanded({});
    }
    setActiveId(active.id);
    setActiveType(active.data.current?.type || null);
    if (tableContainerRef.current)
      setScrollPosition(tableContainerRef.current.scrollLeft);
  }

  function handleDragMove() {
    if (activeType === "row" && tableContainerRef.current) {
      if (tableContainerRef.current.scrollLeft !== scrollPosition) {
        tableContainerRef.current.scrollLeft = scrollPosition;
      }
    }
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    try {
      if (!over || active.id === over.id) return;
      const dragType = active.data.current?.type;

      if (dragType === "column" && defaultConfig.enableColumnDragging) {
        const currentCols = table.getAllLeafColumns().map((c) => c.id);

        const EDGE_LEFT = "actions";
        const EDGE_RIGHT = "row-actions";

        const core = currentCols.filter(
          (id) => id !== EDGE_LEFT && id !== EDGE_RIGHT
        );

        const from = core.indexOf(String(active.id));
        const to = core.indexOf(String(over.id));
        if (from === -1 || to === -1 || from === to) return;

        const nextCore = arrayMove(core, from, to);

        const nextOrder = [EDGE_LEFT, ...nextCore, EDGE_RIGHT];

        setColumnOrder(nextOrder);
        return;
      }

      if (
        dragType === "row" &&
        defaultConfig.enableRowDragging &&
        reorderItems
      ) {
        const oldIndex = data.findIndex(
          (it) => String(getAnyId(it)) === String(active.id)
        );
        const newIndex = data.findIndex(
          (it) => String(getAnyId(it)) === String(over.id)
        );
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

        reorderItems(oldIndex, newIndex);
        const nextData = [...data];
        const moved = nextData.splice(oldIndex, 1)[0];
        nextData.splice(newIndex, 0, moved);

        const prev = nextData[newIndex - 1]
          ? getAnyId(nextData[newIndex - 1])
          : null;
        const next = nextData[newIndex + 1]
          ? getAnyId(nextData[newIndex + 1])
          : null;

        (async () => {
          try {
            const reorderApi = tableDefaults?.api;
            if (reorderApi?.reorderItems) {
              await reorderApi.reorderItems(
                Number(getAnyId(moved)),
                prev != null ? Number(prev) : null,
                next != null ? Number(next) : null
              );
            }
            handleOptimisticDragEnd(event);
          } catch (err) {
            reorderItems(newIndex, oldIndex);
            toast.error(__("Save order failed", "whizmanage"), {
              description: err?.message || __("Could not persist new order", "whizmanage"),
              duration: 4000,
            });
          }
        })();
      }
    } finally {
      setActiveId(null);
      setActiveType(null);
    }
  }

  const isDragEnabled =
    defaultConfig.enableRowDragging || defaultConfig.enableColumnDragging;

  const currentModifiers = useMemo(() => {
    if (activeType === "column")
      return restrictToHorizontalAxis
        ? [restrictToHorizontalAxis, restrictColumnDragToTableBounds]
        : [];
    if (activeType === "row")
      return [restrictToVerticalAxis, restrictRowDragToTableBounds];
    return [];
  }, [activeType]);

  // ✅ הצגת loading overlay - גם בטעינה ראשונה וגם בחיפוש/סינון
  const showLoadingOverlay =
    (store.isLoading && data.length === 0 && !hasLoadedOnceRef.current) ||
    (isQueryLoading && hasLoadedOnceRef.current);

  return (
    <div className="max-w-full overflow-x-auto scrollbar-whiz overflow-hidden min-h-full flex flex-col gap-2 !bg-transparent px-2">
      {/* Header */}
      {defaultConfig.enableFiltering && (
        <TopPanel
          globalFilter={globalFilter}
          setGlobalFilter={setGlobalFilter}
          totalRows={table.getPreFilteredRowModel().rows.length}
          entityName={entityName}
          onAddTestData={onAddTestData}
          undoRedoProps={undoRedoProps}
          customActions={headerCustomActions}
          enableFilters={enableFilters}
          setEnableFilters={setEnableFilters}
          isTrash={isTrash}
          table={table}
          useTableStore={useTableStore}
          tableConfig={tableDefaults}
          importConfig={importConfig}
          data={data}
          onItemCreated={(item) => {
            if (typeof addItem === "function") {
              addItem(item);
            } else if (typeof store.setData === "function") {
              store.setData((prev) => {
                const exists = prev.some(
                  (p) => String(p.id) === String(item.id)
                );
                return exists ? prev : [item, ...prev];
              });
            }
          }}
          onAddInlineRow={() => {
            const cfg = resolveEntityConfig();
            const defaults = cfg?.defaults || {};

            const emptyRow = {
              id: `temp_${Date.now()}`,
              name: "",
              _isNew: true,
              _needsSave: true,
              ...defaults,
            };

            if (typeof addItem === "function") {
              addItem(emptyRow);
            } else if (typeof store.setData === "function") {
              store.setData((prev) => [emptyRow, ...prev]);
            }

            setTimeout(() => {
              const newRowElement = document.querySelector(
                '[data-is-new-row="true"]'
              );
              if (newRowElement) {
                const firstEditableCell = newRowElement.querySelector(
                  '[data-editable="true"]'
                );
                if (firstEditableCell) {
                  firstEditableCell.click();
                  firstEditableCell.focus();
                }
              }
            }, 150);
          }}
        />
      )}
      {defaultConfig.enableFiltering && enableFilters && (
        <StatusBarFilter
          enableFilters={enableFilters}
          setColumnFilters={setColumnFilters}
          columnFilters={columnFilters}
          showDateFilter={tableDefaults?.showDateFilter ?? false}
          data={undefined}
        />
      )}
      {/* Table Container */}
      <div className="!overflow-hidden relative">
        {/* ✅ Loading overlay for initial load and search/filter */}
        {showLoadingOverlay && <TableLoadingOverlay />}
        <div
          ref={tableContainerRef}
          data-table-container="true"
          className="relative shadow dark:shadow-2xl rounded-lg bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 h-[calc(100vh-304px)] sm:h-[calc(100vh-192px)] overflow-auto scroll-smooth select-none scrollbar-whiz min-w-full"
          style={{ overscrollBehavior: "none" }}
        >
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragMove={handleDragMove}
            modifiers={currentModifiers}
            autoScroll={{
              enabled:
                isDragEnabled &&
                (activeType === "column" || activeType === "row"),
              threshold: {
                x: activeType === "column" ? 0.15 : 0,
                y: activeType === "row" ? 0.2 : 0,
              },
              acceleration: activeType === "column" ? 15 : 25,
              canScroll(element) {
                const tableContainer = document.querySelector(
                  '[data-table-container="true"]'
                );
                return element === tableContainer;
              },
            }}
          >
            <table
              className="min-w-full"
              role="table"
              aria-label={__("Data table", "whizmanage")}
              aria-rowcount={data.length}
              aria-colcount={enhancedColumns.length}
              style={{
                borderCollapse: "separate",
                borderSpacing: 0,
                tableLayout: "fixed",
                width: "100%",
              }}
            >
              {/* Headers */}
              <thead className="sticky top-0 z-40">
                <SortableContext
                  items={table.getAllLeafColumns().map((c) => c.id) || []}
                  strategy={horizontalListSortingStrategy}
                >
                  <tr className="bg-slate-50 dark:bg-slate-900">
                    {table.getHeaderGroups()[0]?.headers.map((header) => (
                      <ColumnHeader
                        key={`${header.id}`}
                        header={header}
                        selectionVersion={selectionVersion}
                        expandedVersion={expandedVersion}
                        table={table}
                        isActionsColumn={
                          header.column.id === "actions" ||
                          header.column.id === "row-actions"
                        }
                      >
                        <div className="flex items-center gap-1">
                          <div
                            className="cursor-pointer select-none flex items-center gap-1"
                            onClick={
                              header.column.id !== "actions" &&
                                defaultConfig.enableSorting
                                ? header.column.getToggleSortingHandler()
                                : undefined
                            }
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            {header.column.id !== "actions" &&
                              defaultConfig.enableSorting &&
                              header.column.getIsSorted() === "asc" && (
                                <ChevronUp className="h-4 w-4" />
                              )}
                            {header.column.id !== "actions" &&
                              defaultConfig.enableSorting &&
                              header.column.getIsSorted() === "desc" && (
                                <ChevronDown className="h-4 w-4" />
                              )}
                          </div>
                        </div>
                      </ColumnHeader>
                    ))}
                  </tr>
                </SortableContext>
              </thead>

              {/* Body */}
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                <SortableContext
                  items={memoizedRowsData
                    .filter((rd) => rd.row && rd.row.depth === 0)
                    .map((rd) => String(rd.row.id))}
                  strategy={verticalListSortingStrategy}
                >
                  {memoizedRowsData.map(memoizedRenderRow)}
                </SortableContext>
              </tbody>
            </table>
          </DndContext>

          {rowsToDisplay.length === 0 && !store.isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="pointer-events-auto flex items-center gap-4 text-left bg-white dark:bg-slate-800 p-5 rounded-lg shadow-md border-l-4 border-l-slate-600 dark:border-l-slate-400">
                <div className="flex-shrink-0 w-12 h-12 bg-slate-600/10 dark:bg-slate-400/10 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-slate-600 dark:text-slate-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                    {isTrash
                      ? __("No entities in trash", { entity: __(entityName, "whizmanage") })
                      : __("No entities found", { entity: __(entityName, "whizmanage") })}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-300 text-sm">
                    {__("Try changing the filters", "whizmanage")}
                  </p>
                </div>
                {(globalFilter || columnFilters.length > 0) && (
                  <Button
                    onClick={handleResetFilters}
                    className="flex gap-2"
                    variant="gradient"
                  >
                    <RefreshCw />
                    {__("Reset Filters", "whizmanage")}
                  </Button>
                )}

                {onAddTestData && (
                  <Button onClick={onAddTestData} variant="gradient">
                    {__("Add sample data", "whizmanage")}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Pagination */}
      {defaultConfig.enablePagination && (
        <Pagination
          table={table}
          store={store}
          entityName={entityName}
          serverTotal={serverStats.total}
        />
      )}
      {/* Selection Toolbar */}
      {defaultConfig.enableRowSelection && toolbarConfig && (
        <GenericToolbar
          table={table}
          store={store}
          isTrash={isTrash}
          onBulkEdit={() => setIsBulkOpen(true)}
          selectedCount={selectedCount}
          entityName={toolbarConfig?.entityName || entityName}
          queryClient={queryClient}
          {...toolbarConfig}
        />
      )}
    </div>
  );
}
