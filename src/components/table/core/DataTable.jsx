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
import GenericItemModal from "../../forms/GenericItemModal.jsx";
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
  const [editModalItem, setEditModalItem] = useState(null); // פריט לעריכה בטופס
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

  // 📱 Disable column pinning on mobile for better horizontal scrolling
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 640
  );

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Use empty pinning on mobile to allow free horizontal scroll
  const effectiveColumnPinning = useMemo(() =>
    isMobile ? { left: [], right: [] } : columnPinning,
    [isMobile, columnPinning]
  );

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

  // 🆕 Ref לשמירת השורה האחרונה שנבחרה (עבור Shift+Click)
  const lastSelectedRowIdRef = useRef(null);

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

  // 🆕 Helper: normalize strings for comparison (handles Hebrew and other Unicode)
  const normalizeForSearch = useCallback((str) => {
    if (!str || typeof str !== "string") return "";
    // Normalize Unicode (NFC), lowercase, and remove extra whitespace
    return str.normalize("NFC").toLowerCase().trim();
  }, []);

  // פילטרים מקומיים מכותרות העמודות (מתחילים ב-_local_)
  const isLocalHeaderFilter = useCallback((id) => id?.startsWith?.("_local_"), []);

  // 🆕 מוציאים את הפילטר של עמודת variations_filter לסינון מקומי של תתי-שורות (ווריאציות)
  // הפילטר הזה לא נשלח לשרת - רק מסנן מקומית את הווריאציות
  const variationsColumnFilter = useMemo(() => {
    const variationsFilter = (columnFilters || []).find((f) => f.id === "variations_filter");
    return variationsFilter?.value && typeof variationsFilter.value === "string"
      ? normalizeForSearch(variationsFilter.value)
      : null;
  }, [columnFilters, config?.enableGrouping, normalizeForSearch]);

  // 🆕 Helper: ממיר slug של option ל-name באמצעות terms מהמוצר האב
  // זה נדרש כי הווריאציות שומרות את ה-option כ-slug (למשל "red")
  // אבל המשתמש מחפש לפי השם בעברית (למשל "אדום")
  const convertOptionSlugToName = useCallback((optionValue, attr, parentProduct) => {
    if (!optionValue || !parentProduct) return optionValue;

    // מצא את שם ה-taxonomy key (למשל pa_צבע -> _pa_צבע)
    const attrSlug = attr.slug || "";
    const attrName = attr.name || "";

    // נסה למצוא את ה-terms לפי slug (pa_צבע) או name (צבע)
    let terms = null;

    // נסה קודם לפי slug
    if (attrSlug) {
      const taxonomyKey = attrSlug.startsWith("pa_") ? `_${attrSlug}` : `_pa_${attrSlug}`;
      terms = parentProduct[taxonomyKey];
    }

    // אם לא נמצא, נסה לפי name
    if (!terms || terms.length === 0) {
      const taxonomyKey = `_pa_${attrName}`;
      terms = parentProduct[taxonomyKey];
    }

    if (!terms || terms.length === 0) return optionValue;

    // בדוק אם זה כבר name
    const termByName = terms.find((t) => t.name === optionValue);
    if (termByName) return optionValue;

    // חפש לפי slug והחזר את ה-name
    const termBySlug = terms.find((t) => t.slug === optionValue);
    if (termBySlug?.name) return termBySlug.name;

    return optionValue;
  }, []);

  // Helper לחיפוש בודד (נפרד לשימוש חוזר)
  const singleFilterMatch = useCallback((subRow, parentRow, filter) => {
    // בדיקה בשם הווריאציה (normalized)
    const name = normalizeForSearch(subRow.name || "");
    if (name.includes(filter)) return true;

    // בדיקה באופציות התכונות (attributes)
    // המרת slug ל-name באמצעות terms מהמוצר האב
    const attributes = subRow.attributes || [];
    return attributes.some((attr) => {
      const rawOption = attr.option || attr.value || "";

      // נסה קודם את הערך הגולמי
      const normalizedRaw = normalizeForSearch(rawOption);
      if (normalizedRaw.includes(filter)) return true;

      // נסה URL-decoded version
      try {
        const decoded = normalizeForSearch(decodeURIComponent(rawOption));
        if (decoded.includes(filter)) return true;
      } catch (e) {
        // decodeURIComponent failed, continue
      }

      // נסה להמיר slug ל-name באמצעות terms מהמוצר האב
      const optionName = convertOptionSlugToName(rawOption, attr, parentRow);
      if (optionName !== rawOption) {
        const normalizedName = normalizeForSearch(optionName);
        if (normalizedName.includes(filter)) return true;
      }

      // בדוק גם את שם ה-attribute
      const attrName = normalizeForSearch(attr.name || "");
      if (attrName.includes(filter)) return true;

      return false;
    });
  }, [normalizeForSearch, convertOptionSlugToName]);

  // 🆕 Helper: בודק אם תת-שורה (ווריאציה) תואמת לפילטר
  // משתמש בהמרת slug ל-name כדי לתמוך בחיפוש עברית
  // 🆕 תומך בחיפוש מרובה ווריאציות עם סלש (/) - למשל "אדום/חשמלי"
  const subRowMatchesFilter = useCallback((subRow, parentRow, filter) => {
    // 🆕 פיצול הפילטר לפי סלש לתמיכה בחיפוש מרובה
    const filterParts = filter.split("/").map((part) => part.trim()).filter(Boolean);

    // אם אין סלש או יש רק חלק אחד - חיפוש רגיל
    if (filterParts.length <= 1) {
      return singleFilterMatch(subRow, parentRow, filter);
    }

    // 🆕 חיפוש מרובה - כל חלקי הפילטר חייבים להתאים
    // כל חלק חייב להתאים לאחד מה-attributes או לשם הווריאציה
    return filterParts.every((filterPart) => singleFilterMatch(subRow, parentRow, filterPart));
  }, [singleFilterMatch]);

  // 🆕 פתיחה אוטומטית של כל המוצרים עם תתי-שורות כשיש סינון בעמודת variations_filter
  useEffect(() => {
    // רק אם יש סינון פעיל ויש grouping מופעל
    if (!defaultConfig.enableGrouping || !variationsColumnFilter) return;

    // מוצאים את כל המוצרים שיש להם תתי-שורות שתואמות לפילטר
    const rowsToExpand = data
      .filter((row) => {
        const subRows = row.subRows ?? [];
        if (subRows.length === 0) return false;

        // בודקים אם יש לפחות תת-שורה אחת שתואמת לפילטר
        return subRows.some((subRow) => subRowMatchesFilter(subRow, row, variationsColumnFilter));
      })
      .map((row) => String(getAnyId(row)));

    if (rowsToExpand.length > 0) {
      const newExpanded = {};
      rowsToExpand.forEach((id) => {
        newExpanded[id] = true;
      });
      setExpanded((prev) => ({ ...prev, ...newExpanded }));
    }
  }, [variationsColumnFilter, data, defaultConfig.enableGrouping, subRowMatchesFilter]);

  // 🆕 פילטרים מקומיים מכותרות העמודות (טקסט)
  const localHeaderFilters = useMemo(() => {
    return (columnFilters || [])
      .filter((f) => isLocalHeaderFilter(f.id) && !f.id.startsWith("_local_bool_") && f.value)
      .map((f) => ({
        // מוציאים את הקידומת _local_ כדי לקבל את שם העמודה האמיתי
        columnId: f.id.replace("_local_", ""),
        value: String(f.value).toLowerCase().trim(),
      }))
      .filter((f) => f.value);
  }, [columnFilters, isLocalHeaderFilter]);

  // 🆕 פילטרים בוליאניים מכותרות העמודות
  const localBoolFilters = useMemo(() => {
    return (columnFilters || [])
      .filter((f) => f.id?.startsWith?.("_local_bool_") && f.value)
      .map((f) => ({
        columnId: f.id.replace("_local_bool_", ""),
        value: f.value, // { yes: boolean, no: boolean }
      }));
  }, [columnFilters]);

  // 🆕 פונקציה לבדיקה אם שורה עוברת את הפילטרים המקומיים
  const rowPassesLocalFilters = useCallback((row, filters, boolFilters) => {
    // בדיקת פילטרים טקסטואליים
    if (filters && filters.length > 0) {
      const passesTextFilters = filters.every(({ columnId, value }) => {
        const cellValue = row[columnId];

        // אם אין ערך בתא
        if (cellValue === null || cellValue === undefined || cellValue === "") {
          return false;
        }

        // המרה לסטרינג לחיפוש
        let searchValue = "";

        if (typeof cellValue === "string") {
          searchValue = cellValue;
        } else if (typeof cellValue === "number" || typeof cellValue === "boolean") {
          searchValue = String(cellValue);
        } else if (Array.isArray(cellValue)) {
          // מערך - מחפשים בכל הערכים
          searchValue = cellValue
            .map((item) => {
              if (typeof item === "object" && item !== null) {
                return item.name || item.label || item.title || JSON.stringify(item);
              }
              return String(item);
            })
            .join(" ");
        } else if (typeof cellValue === "object" && cellValue !== null) {
          // אובייקט - מחפשים בשדות נפוצים
          searchValue = cellValue.name || cellValue.label || cellValue.title || JSON.stringify(cellValue);
        }

        return searchValue.toLowerCase().includes(value);
      });

      if (!passesTextFilters) return false;
    }

    // בדיקת פילטרים בוליאניים
    if (boolFilters && boolFilters.length > 0) {
      const passesBoolFilters = boolFilters.every(({ columnId, value }) => {
        const cellValue = row[columnId];
        const isTruthy = Boolean(cellValue);

        // אם שניהם פעילים - הכל עובר
        if (value.yes && value.no) return true;

        // אם רק yes פעיל - מציגים רק true
        if (value.yes && !value.no) return isTruthy === true;

        // אם רק no פעיל - מציגים רק false
        if (!value.yes && value.no) return isTruthy === false;

        return true;
      });

      if (!passesBoolFilters) return false;
    }

    return true;
  }, []);

  // 🆕 נתונים מסוננים מקומית (לפני עיבוד subRows)
  const locallyFilteredData = useMemo(() => {
    if (localHeaderFilters.length === 0 && localBoolFilters.length === 0) return data;
    return data.filter((row) => rowPassesLocalFilters(row, localHeaderFilters, localBoolFilters));
  }, [data, localHeaderFilters, localBoolFilters, rowPassesLocalFilters]);

  // ⚡ יוצרים דאטה מעובד עם תתי-שורות מוגבלות לפי visibleSubRowCounts
  // 🆕 + סינון מקומי של תתי-שורות לפי variations_filter
  const processedData = useMemo(() => {
    // משתמשים בנתונים המסוננים מקומית
    const dataToProcess = locallyFilteredData;

    if (!defaultConfig.enableGrouping) {
      return dataToProcess;
    }

    return dataToProcess.map((row) => {
      const originalSubRows = row.subRows ?? [];
      if (originalSubRows.length === 0) return row;

      let filteredSubRows = originalSubRows;

      // 🆕 סינון תתי-שורות לפי variations_filter column
      // מסנן לפי שם הווריאציה או לפי אופציות התכונות
      // משתמש ב-subRowMatchesFilter שתומך בהמרת slug ל-name
      if (variationsColumnFilter) {
        filteredSubRows = originalSubRows.filter((subRow) =>
          subRowMatchesFilter(subRow, row, variationsColumnFilter)
        );

        // 🆕 כשיש פילטר פעיל, מחזירים את כל התוצאות המסוננות (ללא slice)
        return {
          ...row,
          subRows: filteredSubRows,
          _totalSubRows: originalSubRows.length,
          _filteredSubRowsCount: filteredSubRows.length,
        };
      }

      // ללא פילטר - הלוגיקה המקורית של chunked rendering
      const rowId = String(getAnyId(row));
      const visibleCount = visibleSubRowCounts[rowId];

      // אם אין הגבלה על כמות, מחזירים את השורה כמו שהיא
      if (visibleCount === undefined) {
        return row;
      }

      // מחזירים שורה עם תתי-שורות מוגבלות
      return {
        ...row,
        subRows: originalSubRows.slice(0, visibleCount),
        _totalSubRows: originalSubRows.length,
      };
    });
  }, [locallyFilteredData, visibleSubRowCounts, defaultConfig.enableGrouping, variationsColumnFilter, subRowMatchesFilter]);

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

  // Callback לעדכון פריט אחרי עריכה בטופס
  const handleEditModalItemUpdated = useCallback((updatedItem) => {
    store.updateItem?.(updatedItem.id, updatedItem);
    setEditModalItem(null);
    // רענון הנתונים מהשרת
    queryClient.invalidateQueries({ queryKey: [entityName] });
  }, [store.updateItem, queryClient, entityName]);

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
      onEditInForm: (item) => setEditModalItem(defaultConfig.transformForEdit ? defaultConfig.transformForEdit(item) : item), // פתיחת עריכה בטופס
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
        cell: ({ row, table }) => {
          const isSelected = row.getIsSelected();
          const canExpand = row.getCanExpand();
          const isRowExpanded = row.getIsExpanded();
          const isSubRow = row.depth > 0;

          // 🆕 Handler for selecting with Shift+Click and Ctrl+Click support
          const handleRowSelection = (next, event) => {
            const allRows = table.getRowModel().flatRows;
            const currentRowId = row.id;

            // Shift+Click - בחירת טווח
            if (event?.shiftKey && lastSelectedRowIdRef.current) {
              const lastIndex = allRows.findIndex(r => r.id === lastSelectedRowIdRef.current);
              const currentIndex = allRows.findIndex(r => r.id === currentRowId);

              if (lastIndex !== -1 && currentIndex !== -1) {
                const start = Math.min(lastIndex, currentIndex);
                const end = Math.max(lastIndex, currentIndex);

                // בחר את כל השורות בטווח
                for (let i = start; i <= end; i++) {
                  allRows[i].toggleSelected(true);
                }
                return;
              }
            }

            // Ctrl+Click (או Cmd+Click ב-Mac) - הוספה/הסרה בודדת
            // זה ההתנהגות הרגילה של toggleSelected

            // בחירה רגילה
            row.toggleSelected(next);

            // If row is expanded and has subRows, also toggle their selection
            if (isRowExpanded && canExpand && row.subRows?.length > 0) {
              row.subRows.forEach((subRow) => {
                subRow.toggleSelected(next);
              });
            }

            // שמור את השורה הנוכחית כאחרונה שנבחרה
            lastSelectedRowIdRef.current = currentRowId;
          };

          // 🆕 Handler ל-click על ה-wrapper - תופס את ה-event עם shiftKey
          const handleCheckboxClick = (event) => {
            event.preventDefault();
            event.stopPropagation();
            const next = !isSelected;
            handleRowSelection(next, event);
          };

          return (
            <div className="flex items-center justify-between gap-1">
              {/* ⚡ הזחה לתתי-שורות - מוסיפים padding מימין ב-RTL (או משמאל ב-LTR) */}
              {isSubRow && <div className="w-4 flex-shrink-0" />}
              <div
                onClick={handleCheckboxClick}
                className="cursor-pointer"
              >
                <Checkbox
                  isSelected={isSelected}
                  disableAnimation={false}
                  classNames={{
                    base: "!p-0 !m-0 pointer-events-none",
                    wrapper:
                      "dark:border dark:!border-slate-600 text-white focus:!ring-slate-500 bg-white dark:!bg-slate-700 m-0 p-0",
                  }}
                />
              </div>
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
  // 🆕 פילטרים שמטופלים מקומית בלבד ולא נשלחים לשרת
  // variations_filter מסנן תתי-שורות מקומית בלבד
  // _local_* פילטרים מקומיים מה-ColumnHeader
  const LOCAL_ONLY_FILTERS = ["variations_filter"];

  const mapColumnFiltersToServer = useCallback(() => {
    const out = {};
    (columnFilters || []).forEach((f) => {
      const id = f?.id;
      const val = f?.value;
      if (!id) return;

      // דלג על פילטרים שמטופלים מקומית בלבד
      if (LOCAL_ONLY_FILTERS.includes(id)) return;
      // דלג על פילטרים מקומיים מכותרות העמודות
      if (isLocalHeaderFilter(id)) return;

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
      columnPinning: effectiveColumnPinning,
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
  const pinKey = useMemo(() => JSON.stringify(effectiveColumnPinning), [effectiveColumnPinning]);

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

      {/* Edit in Form Modal */}
      {editModalItem && (
        <GenericItemModal
          entityName={entityName}
          config={resolveEntityConfig()}
          initialData={editModalItem}
          isOpen={!!editModalItem}
          onClose={() => setEditModalItem(null)}
          onItemUpdated={handleEditModalItemUpdated}
        />
      )}
    </div>
  );
}
