import { toast } from "@/lib/utils";
import { postApi, putApi } from "@/services/services";
import { deleteHistory, logHistoryImmediate } from "@/utils/historyLogger";
import { arrayMove } from "@dnd-kit/sortable";
import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { getAnyId, idsEqual } from "../utils/tableUtils.js";
import { useTableSaveStateStore } from "./saveStateStore.js";
import { __ } from "@wordpress/i18n";
const getDefaultColumnPinning = () => {
  const isRTL =
    typeof document !== "undefined" &&
    (document.dir === "rtl" || document.documentElement?.dir === "rtl");
  if (isRTL) {
    return { right: ["actions"], left: ["row-actions"] };
  }
  return { left: ["actions"], right: ["row-actions"] };
};

export function createTableStore(
  storeName,
  initialData = [],
  initialConfig = {},
  dbFieldNames = {}
) {
  const fieldNames = {
    columnOrder: dbFieldNames.columnOrder || `${storeName}Order`,
    columnVisibility: dbFieldNames.columnVisibility || `${storeName}Display`,
    columnSizing: dbFieldNames.columnSizing || `${storeName}_columns_width`,
    columnPinning: dbFieldNames.columnPinning || `${storeName}_pinned_columns`,
    enableFilters: dbFieldNames.enableFilters || `${storeName}_enabled_filters`,
    perPage: dbFieldNames.perPage || "perPage",
    ...dbFieldNames,
  };

  const pendingUpdates = new Map();
  let batchUpdateTimeout = null;

  return create(
    devtools(
      subscribeWithSelector((set, get) => {

        const bumpHistoryVersion = () =>
          set((s) => ({ historyVersion: (s.historyVersion || 0) + 1 }));

        const scheduleBatchUpdate = async () => {
          clearTimeout(batchUpdateTimeout);
          batchUpdateTimeout = setTimeout(async () => {
            if (pendingUpdates.size === 0) return;
            const updates = Array.from(pendingUpdates.entries());
            try {
              await Promise.all(
                updates.map(([fieldName, data]) =>
                  putApi(
                    `${window.siteUrl}/wp-json/whizmanage/v1/columns/${fieldName}`,
                    { name: fieldName, reservedData: data }
                  )
                )
              );
              pendingUpdates.clear();

              const saveStore = useTableSaveStateStore.getState();
              saveStore.setSaveState("saved");
              saveStore.setLastSaveTime(new Date());
            } catch (error) {
              console.error("Failed to save batch updates:", error);
              useTableSaveStateStore.getState().setSaveState("error");
            }
          }, 500);
        };

        return {
          // ========================
          // DATA STATE
          // ========================
          table: null,
          data: initialData,
          originalData: initialData,
          isLoading: false,
          error: null,
          errors: [],

          // ========================
          // TABLE CONFIG STATE
          // ========================
          columnOrder: initialConfig.columnOrder || [],
          columnVisibility: initialConfig.columnVisibility || {},
          columnSizing: initialConfig.columnSizing || {},
          columnPinning:
            initialConfig.columnPinning || getDefaultColumnPinning(),

          // ========================
          // UI STATE
          // ========================
          sorting: [],
          globalFilter: "",
          columnFilters: [],
          enableFilters: null,
          rowSelection: {},
          expanded: {},
          pagination: {
            pageIndex: 0,
            pageSize: initialConfig.pagination?.pageSize || 100,
          },

          // ========================
          // UNDO/REDO STATE
          // ========================
          historyVersion: 0, // 👈 חדש: טריגר רינדור ל־UI כשסטאק ההיסטוריה משתנה
          undoRedoHistory: (() => {
            const stack = [];
            let idx = -1;
            const api = {
              addToHistory(action) {
                stack.splice(idx + 1);
                stack.push(action);
                idx = stack.length - 1;

                // 👇 שליחה אוטומטית להיסטוריה בשרת
                action._hidPromise = logHistoryImmediate(action, {
                  location: storeName,
                })
                  .then((hid) => {
                    if (hid) action._hid = hid;
                    return hid;
                  })
                  .catch((e) => {
                    console.error("logHistoryImmediate failed", e);
                    return null;
                  });

                bumpHistoryVersion();
                return action;
              },
              canUndo: () => idx >= 0,
              canRedo: () => idx < stack.length - 1,
              async undo() {
                if (idx < 0) return;
                const action = stack[idx--];
                await get().applyUndo(action);
              },
              async redo() {
                if (idx >= stack.length - 1) return;
                const action = stack[++idx];
                await get().applyRedo(action);
              },
              removeMatching(pred) {
                let removedBeforeIdx = 0;
                for (let i = stack.length - 1; i >= 0; i--) {
                  if (pred(stack[i])) {
                    if (i <= idx) removedBeforeIdx++;
                    stack.splice(i, 1);
                  }
                }
                idx = Math.max(-1, idx - removedBeforeIdx);
              },
            };
            return api;
          })(),

          isHistoryAction: false,

          masterUpdateCell: null,

          // ========================
          // ERROR HANDLING
          // ========================
          setError: (error) => {
            const errorObj = {
              message: error?.message || error,
              timestamp: new Date().toISOString(),
              type: error?.type || "general",
            };
            set((state) => ({
              error: errorObj,
              errors: [...state.errors.slice(-9), errorObj],
            }));
            if (!error?.silent) {
              toast.error(errorObj.message);
            }
          },
          clearError: () => set({ error: null }),
          clearAllErrors: () => set({ error: null, errors: [] }),

          // ========================
          // DATA ACTIONS
          // ========================
          setTable: (tbl) => set({ table: tbl }),
          getProductIdFor: (rowId) => {
            const s = get();
            if (s.data.some((p) => String(getAnyId(p)) === String(rowId)))
              return rowId;
            const parent = s.data.find(
              (p) =>
                Array.isArray(p.subRows) &&
                p.subRows.some((sr) => idsEqual(getAnyId(sr), rowId))
            );
            return parent?.id ?? rowId;
          },
          setData: (updaterOrValue) => {
            const current = get().data;
            const next =
              typeof updaterOrValue === "function"
                ? updaterOrValue(current)
                : updaterOrValue;
            if (!Array.isArray(next)) {
              console.error("Data must be an array");
              return;
            }

            set({ data: next, originalData: next, error: null });
            try {
              const tbl = get().table;
              if (tbl?.resetRowSelection) tbl.resetRowSelection();
            } catch {}
          },
          setLoading: (loading) => set({ isLoading: loading }),
          addItem: (item) => {
            if (!item || typeof item !== "object") {
              console.error("Invalid item");
              return;
            }

            const newItem = {
              ...item,
              id: item.id || Date.now().toString(),
            };

            const exists = get().data.some(
              (i) => String(i.id) === String(newItem.id)
            );
            if (exists) {
              console.warn(`Item with ID ${newItem.id} already exists`);
              set((state) => ({
                data: state.data.map((i) =>
                  String(i.id) === String(newItem.id) ? { ...i, ...newItem } : i
                ),
                error: null,
              }));
              return;
            }

            set((state) => ({
              data: [newItem, ...state.data],
              error: null,
            }));
          },
          updateItem: (id, updates) => {
            if (!id) {
              console.error("Missing ID for update");
              return;
            }

            const state = get();

            // בדיקה אם הפריט ברמה העליונה
            const topLevelIndex = state.data.findIndex((item) => idsEqual(getAnyId(item), id));

            if (topLevelIndex !== -1) {
              // עדכון פריט ברמה העליונה
              set((s) => ({
                data: s.data.map((item) =>
                  idsEqual(getAnyId(item), id) ? { ...item, ...updates } : item
                ),
                error: null,
              }));
              return;
            }

            // חיפוש ב-subRows (ווריאציות)
            const parentIndex = state.data.findIndex(
              (p) =>
                Array.isArray(p.subRows) &&
                p.subRows.some((sr) => idsEqual(getAnyId(sr), id))
            );

            if (parentIndex !== -1) {
              const subIndex = state.data[parentIndex].subRows.findIndex((sr) =>
                idsEqual(getAnyId(sr), id)
              );

              if (subIndex !== -1) {
                // עדכון subRow (ווריאציה)
                set((s) => {
                  const parent = s.data[parentIndex];
                  const newSubRows = parent.subRows.map((sr, idx) =>
                    idx === subIndex ? { ...sr, ...updates } : sr
                  );
                  const newParent = { ...parent, subRows: newSubRows };
                  const newData = [...s.data];
                  newData[parentIndex] = newParent;
                  return { data: newData, error: null };
                });
                return;
              }
            }

            console.warn("Item not found for update:", id);
          },

          // ========================
          // UNDO/REDO FUNCTIONS
          // ========================
          updateItemWithHistory: (id, updates, saveToHistory = true) => {
            const state = get();
            let item = state.data.find((it) => idsEqual(getAnyId(it), id));
            let isNested = false;
            let parentIndex = -1;
            let subIndex = -1;
            if (!item) {
              parentIndex = state.data.findIndex(
                (p) =>
                  Array.isArray(p.subRows) &&
                  p.subRows.some((sr) => idsEqual(getAnyId(sr), id))
              );
              if (parentIndex !== -1) {
                subIndex = state.data[parentIndex].subRows.findIndex((sr) =>
                  idsEqual(getAnyId(sr), id)
                );
                if (subIndex !== -1) {
                  item = state.data[parentIndex].subRows[subIndex];
                  isNested = true;
                }
              }
            }
            if (!item) {
              console.error("Item not found:", id);
              return;
            }
            if (saveToHistory && state.undoRedoHistory) {
              const previousValues = {};
              Object.keys(updates).forEach((key) => {
                previousValues[key] = item[key];
              });
              state.undoRedoHistory.addToHistory({
                type: "update",
                id: id,
                field: Object.keys(updates)[0],
                previousValues,
                newValues: updates,
                rowData: { ...item },
                timestamp: Date.now(),
              });
              bumpHistoryVersion(); // 👈 רענון UI
            }
            if (!isNested) {
              set((s) => ({
                data: s.data.map((it) =>
                  idsEqual(getAnyId(it), id) ? { ...it, ...updates } : it
                ),
                error: null,
              }));
            } else {
              set((s) => {
                const parent = s.data[parentIndex];
                const newSubRows = parent.subRows.map((sr, idx) =>
                  idx === subIndex ? { ...sr, ...updates } : sr
                );
                const newParent = { ...parent, subRows: newSubRows };
                const newData = [...s.data];
                newData[parentIndex] = newParent;
                return { data: newData, error: null };
              });
            }
          },

          applyUndo: async (action) => {
            set({ isHistoryAction: true });
            try {
              if (action.type === "update") {
                const state = get();
                const { masterUpdateCell } = state;
                const currentItem = state.data.find(
                  (item) => item.id == action.id
                );

                if (currentItem && typeof masterUpdateCell === "function") {
                  // טיפול בשדות batch (inventory, downloadable_settings)
                  const batchFields = ["inventory", "downloadable_settings"];
                  const isBatchField = batchFields.includes(action.field);

                  // עבור שדות batch, נעביר את כל ה-previousValues כאובייקט
                  const valueToRestore = isBatchField
                    ? action.previousValues
                    : action.previousValues?.[action.field];

                  const rowDataForUpdate = isBatchField
                    ? { ...currentItem, ...action.previousValues }
                    : { ...currentItem, [action.field]: valueToRestore };

                  await masterUpdateCell(
                    action.id,
                    action.field,
                    valueToRestore,
                    rowDataForUpdate,
                    true
                  );
                } else {
                  get().updateItemWithHistory(
                    action.id,
                    action.previousValues,
                    false
                  );
                }
              }
              if (action.type === "config") {
                if (action.field === "columnVisibility")
                  get().setColumnVisibility(action.previousValues, true);
                if (action.field === "columnOrder")
                  get().setColumnOrder(action.previousValues, true);
                if (action.field === "columnPinning")
                  get().setColumnPinning(action.previousValues, true);
              }
            } finally {
              set({ isHistoryAction: false });
              bumpHistoryVersion(); // 👈 רענון UI אחרי Undo
              try {
                let hid = action?._hid;
                if (!hid && action?._hidPromise) hid = await action._hidPromise;
                if (hid) {
                  await deleteHistory([hid]);
                }
              } catch (e) {
                console.error("deleteHistory on undo failed", e);
              }
            }
          },

          applyRedo: async (action) => {
            set({ isHistoryAction: true });
            try {
              if (action.type === "update") {
                const state = get();
                const { masterUpdateCell } = state;
                const currentItem = state.data.find(
                  (item) => item.id == action.id
                );

                if (currentItem && typeof masterUpdateCell === "function") {
                  // טיפול בשדות batch (inventory, downloadable_settings)
                  const batchFields = ["inventory", "downloadable_settings"];
                  const isBatchField = batchFields.includes(action.field);

                  // עבור שדות batch, נעביר את כל ה-newValues כאובייקט
                  const valueToApply = isBatchField
                    ? action.newValues
                    : action.newValues?.[action.field];

                  await masterUpdateCell(
                    action.id,
                    action.field,
                    valueToApply,
                    { ...currentItem, ...action.newValues },
                    true
                  );
                } else {
                  get().updateItemWithHistory(
                    action.id,
                    action.newValues,
                    false
                  );
                }
              }
              if (action.type === "config") {
                if (action.field === "columnVisibility")
                  get().setColumnVisibility(action.newValues, true);
                if (action.field === "columnOrder")
                  get().setColumnOrder(action.newValues, true);
                if (action.field === "columnPinning")
                  get().setColumnPinning(action.newValues, true);
              }
            } finally {
              set({ isHistoryAction: false });
              bumpHistoryVersion(); // 👈 רענון UI אחרי Redo
            }
          },

          setUndoRedoHistory: (historyHook) => {
            const origAdd = historyHook.addToHistory;
            const origUndo = historyHook.undo;
            const origRedo = historyHook.redo;

            historyHook.addToHistory = (action) => {
              const added = origAdd(action);
              added._hidPromise = logHistoryImmediate(added, {
                location: `${storeName}`,
              })
                .then((hid) => {
                  if (hid) added._hid = hid;
                  return hid;
                })
                .catch((e) => {
                  console.error("logHistoryImmediate(do) failed", e);
                  return null;
                });
              bumpHistoryVersion(); // 👈 כל הוספה להיסטוריה תרנדר את ה־UI
              return added;
            };

            historyHook.undo = async () => {
              await origUndo();
              bumpHistoryVersion(); // 👈 לוודא שגם Undo מבחוץ ירנדר
            };

            historyHook.redo = async () => {
              await origRedo();
              bumpHistoryVersion(); // 👈 גם Redo
            };

            set({ undoRedoHistory: historyHook });
          },

          applyActionFromHistory: async (action) => {
            set({ isHistoryAction: true });
            try {
              if (action.type === "update") {
                const state = get();
                const { masterUpdateCell } = state;
                const currentItem = state.data.find((it) => it.id == action.id);
                const patch = action.newValues ?? action.previousValues ?? {};

                if (
                  currentItem &&
                  typeof masterUpdateCell === "function" &&
                  action.field
                ) {
                  // טיפול בשדות batch (inventory, downloadable_settings)
                  const batchFields = ["inventory", "downloadable_settings"];
                  const isBatchField = batchFields.includes(action.field);

                  // עבור שדות batch, נעביר את כל ה-patch כאובייקט
                  const valueToApply = isBatchField ? patch : patch[action.field];

                  await masterUpdateCell(
                    action.id,
                    action.field,
                    valueToApply,
                    { ...currentItem, ...patch },
                    true
                  );
                } else {
                  get().updateItemWithHistory(action.id, patch, false);
                }
              }
              if (action.type === "config") {
                const field = action.field;
                const nextVal = action.newValues ?? action.previousValues ?? {};
                if (field === "columnVisibility")
                  get().setColumnVisibility(nextVal, true);
                if (field === "columnOrder")
                  get().setColumnOrder(nextVal, true);
                if (field === "columnPinning")
                  get().setColumnPinning(nextVal, true);
                if (field === "columnSizing") get().setColumnSizing(nextVal);
              }
              if (action.type === "add" && action.newValues) {
                const item = { ...action.newValues };
                const exists = get().data.some((i) => i.id == item.id);
                if (!exists) set((s) => ({ data: [...s.data, item] }));
              }
              if (action.type === "delete" && action.id != null) {
                set((s) => ({ data: s.data.filter((i) => i.id != action.id) }));
              }
              if (
                action.type === "reorder" &&
                action.previousValues &&
                action.newValues
              ) {
                const from = action.previousValues.from;
                const to = action.newValues.to;
                if (Number.isInteger(from) && Number.isInteger(to)) {
                  set((s) => ({ data: arrayMove(s.data, from, to) }));
                }
              }
            } finally {
              set({ isHistoryAction: false });
              bumpHistoryVersion(); // 👈 גם כשמריצים פעולה משוחזרת
            }
          },
          applyRestoredBatch: async (restored) => {
            const items = restored?.items || [];
            for (const it of items) {
              if (it.new && it.id != null) {
                await get().applyActionFromHistory({
                  type: "update",
                  id: it.id,
                  newValues: it.new,
                  previousValues: it.old,
                  field: it.__meta?.field,
                });
              } else if (restored.action === "delete" && it.id != null) {
                await get().applyActionFromHistory({
                  type: "delete",
                  id: it.id,
                });
              } else if (restored.action === "add" && it.new) {
                await get().applyActionFromHistory({
                  type: "add",
                  newValues: it.new,
                });
              }
            }
            if (restored.__config) {
              for (const cfg of restored.__config) {
                await get().applyActionFromHistory({
                  type: "config",
                  field: cfg.field,
                  newValues: cfg.new,
                  previousValues: cfg.old,
                });
              }
            }
          },
          deleteItem: (id) => {
            if (!id) {
              console.error("Missing ID for deletion");
              return;
            }
            set((state) => ({
              data: state.data.filter((item) => item.id != id),
              error: null,
            }));
            toast.success(__("Item deleted successfully", "whizmanage"));
          },
          fetchItemsByIds: async (ids, apiUrl) => {
            if (!ids?.length) return;
            set({ isLoading: true });
            try {
              const response = await postApi(apiUrl, { product_ids: ids });
              const items = JSON.parse(response.data);
              set((state) => ({
                data: [
                  ...items,
                  ...state.data.filter((item) => !ids.includes(item.id)),
                ],
                originalData: [
                  ...items,
                  ...state.originalData.filter(
                    (item) => !ids.includes(item.id)
                  ),
                ],
                isLoading: false,
              }));
              return items;
            } catch (error) {
              console.error("Failed to fetch items:", error);
              set({ isLoading: false });
              throw error;
            }
          },
          deleteItemsByIds: (ids) => {
            if (!Array.isArray(ids) || ids.length === 0) {
              console.error("No items selected for deletion");
              return;
            }
            const validIds = ids.filter((id) =>
              get().data.some((item) => item.id == id)
            );
            if (validIds.length === 0) {
              console.error("No matching items found");
              return;
            }
            set((state) => ({
              data: state.data.filter(
                (item) => !validIds.some((id) => id == item.id)
              ),
              error: null,
            }));
            toast.success(
              __("Items updated successfully", { count: validIds.length })
            );
          },
          reorderItems: (oldIndex, newIndex) => {
            const dataLength = get().data.length;
            if (
              oldIndex < 0 ||
              oldIndex >= dataLength ||
              newIndex < 0 ||
              newIndex >= dataLength
            ) {
              console.error("Invalid indices for reorder");
              return;
            }
            if (oldIndex === newIndex) return;
            set((state) => ({
              data: arrayMove(state.data, oldIndex, newIndex),
              error: null,
            }));
          },
          updateItemsByIds: (ids, updates) => {
            if (!Array.isArray(ids) || ids.length === 0) {
              console.error("No items selected for update");
              return;
            }
            const validIds = ids.filter((id) =>
              get().data.some((item) => item.id == id)
            );
            set((state) => ({
              data: state.data.map((item) =>
                validIds.some((id) => id == item.id)
                  ? { ...item, ...updates }
                  : item
              ),
              error: null,
            }));
            toast.success(
              __("Items updated successfully", { count: validIds.length })
            );
          },
          bulkUpdateStatus: (ids, status) => {
            get().updateItemsByIds(ids, { status });
          },
          getItemsByIds: (ids) => {
            if (!ids || !Array.isArray(ids) || ids.length === 0) return [];
            return get().data.filter((item) => ids.some((id) => id == item.id));
          },
          setColumnOrder: (updaterOrValue, isFromHistory = false) => {
            const prev = get().columnOrder;
            const newValue =
              typeof updaterOrValue === "function"
                ? updaterOrValue(prev)
                : updaterOrValue;
            set({ columnOrder: newValue });
            pendingUpdates.set(fieldNames.columnOrder, newValue);
            scheduleBatchUpdate();
            if (
              !get().isHistoryAction &&
              !isFromHistory &&
              get().undoRedoHistory
            ) {
              get().undoRedoHistory.addToHistory({
                type: "config",
                field: "columnOrder",
                previousValues: prev,
                newValues: newValue,
                timestamp: Date.now(),
              });
            }
          },
          setColumnVisibility: (updaterOrValue, isFromHistory = false) => {
            const prev = get().columnVisibility;
            const newValue =
              typeof updaterOrValue === "function"
                ? updaterOrValue(prev)
                : updaterOrValue;
            set({ columnVisibility: newValue });
            pendingUpdates.set(fieldNames.columnVisibility, newValue);
            scheduleBatchUpdate();
            if (
              !get().isHistoryAction &&
              !isFromHistory &&
              get().undoRedoHistory
            ) {
              get().undoRedoHistory.addToHistory({
                type: "config",
                field: "columnVisibility",
                previousValues: prev,
                newValues: newValue,
                timestamp: Date.now(),
              });
            }
          },
          setColumnSizing: (updaterOrValue) => {
            const newValue =
              typeof updaterOrValue === "function"
                ? updaterOrValue(get().columnSizing)
                : updaterOrValue;
            set({ columnSizing: newValue });
            pendingUpdates.set(fieldNames.columnSizing, newValue);
            scheduleBatchUpdate();
          },
          setColumnPinning: (updaterOrValue, isFromHistory = false) => {
            const prev = get().columnPinning;
            const newValue =
              typeof updaterOrValue === "function"
                ? updaterOrValue(prev)
                : updaterOrValue;
            set({ columnPinning: newValue });
            pendingUpdates.set(fieldNames.columnPinning, newValue);
            scheduleBatchUpdate();
            if (
              !get().isHistoryAction &&
              !isFromHistory &&
              get().undoRedoHistory
            ) {
              get().undoRedoHistory.addToHistory({
                type: "config",
                field: "columnPinning",
                previousValues: prev,
                newValues: newValue,
                timestamp: Date.now(),
              });
            }
          },
          setSorting: (updaterOrValue) => {
            const newValue =
              typeof updaterOrValue === "function"
                ? updaterOrValue(get().sorting)
                : updaterOrValue;
            set({ sorting: newValue });
          },
          setGlobalFilter: (updaterOrValue) => {
            const newValue =
              typeof updaterOrValue === "function"
                ? updaterOrValue(get().globalFilter)
                : updaterOrValue;
            set({ globalFilter: newValue });
          },
          setColumnFilters: (updaterOrValue) => {
            const newValue =
              typeof updaterOrValue === "function"
                ? updaterOrValue(get().columnFilters)
                : updaterOrValue;
            set({ columnFilters: newValue });
          },
          setEnableFilters: (updaterOrValue) => {
            const current = get().enableFilters || [];
            const next =
              typeof updaterOrValue === "function"
                ? updaterOrValue(current)
                : updaterOrValue;
            set({ enableFilters: Array.isArray(next) ? next : [] });
            pendingUpdates.set(fieldNames.enableFilters, next);
            scheduleBatchUpdate();
          },
          setRowSelection: (updaterOrValue) => {
            const newValue =
              typeof updaterOrValue === "function"
                ? updaterOrValue(get().rowSelection)
                : updaterOrValue;
            set({ rowSelection: newValue });
          },
          setExpanded: (updaterOrValue) => {
            const newValue =
              typeof updaterOrValue === "function"
                ? updaterOrValue(get().expanded)
                : updaterOrValue;
            set({ expanded: newValue });
          },
          setPagination: (updaterOrValue) => {
            const { pagination: prevPagination } = get(); // 1. קבל מצב קודם
            const prevPageSize = prevPagination.pageSize;

            const newValue =
              typeof updaterOrValue === "function"
                ? updaterOrValue(prevPagination)
                : updaterOrValue;

            const newPageSize = newValue.pageSize;

            set({ pagination: newValue }); // 2. עדכן state מיד

            // 3. שמור ל-DB אם ה-pageSize השתנה (ולא 'All')
            if (newPageSize !== prevPageSize && newPageSize < 100000) {
              const whizmanageSettings = Array.isArray(window.getWhizmanage)
                ? window.getWhizmanage
                : [];
              const perPageRow = whizmanageSettings.find(
                (item) => item.name === fieldNames.perPage
              );

              let currentPerPageData = {};
              if (
                perPageRow &&
                typeof perPageRow.reservedData === "object" &&
                perPageRow.reservedData !== null
              ) {
                currentPerPageData = perPageRow.reservedData;
              }

              // עדכן את הערך עבור הישות הספציפית הזו
              currentPerPageData[storeName] = newPageSize;

              // השתמש במנגנון השמירה הקיים
              pendingUpdates.set(fieldNames.perPage, currentPerPageData);
              scheduleBatchUpdate();
            }
          },
          loadConfiguration: (defaults = {}) => {
            const getWhizmanage = window.getWhizmanage || [];
            const savedOrderRaw = getWhizmanage.find(
              (col) => col.name === fieldNames.columnOrder
            )?.reservedData;
            const savedVisibility = getWhizmanage.find(
              (col) => col.name === fieldNames.columnVisibility
            )?.reservedData;
            const savedSizing = getWhizmanage.find(
              (col) => col.name === fieldNames.columnSizing
            )?.reservedData;
            let savedPinning = getWhizmanage.find(
              (col) => col.name === fieldNames.columnPinning
            )?.reservedData;
            const savedEnableFilters =
              getWhizmanage.find((col) => col.name === fieldNames.enableFilters)
                ?.reservedData || [];
            if (savedPinning) {
              const leftPinned = (savedPinning.left || []).filter(
                (id) => id !== "actions" && id !== "row-actions"
              );
              const rightPinned = (savedPinning.right || []).filter(
                (id) => id !== "actions" && id !== "row-actions"
              );
              savedPinning = {
                left: ["actions", ...leftPinned],
                right: [...rightPinned, "row-actions"],
              };
            }

            const perPageRow = getWhizmanage.find(
              (col) => col.name === fieldNames.perPage
            );
            // קריאת ברירת המחדל שכבר קיימת ב-state
            let initialPageSize = get().pagination.pageSize;

            if (
              perPageRow &&
              typeof perPageRow.reservedData === "object" &&
              perPageRow.reservedData !== null
            ) {
              // זה אובייקט תקין: {"orders": 50, "coupons": 100}
              initialPageSize =
                Number(perPageRow.reservedData[storeName]) || initialPageSize;
            } else if (perPageRow && !isNaN(Number(perPageRow.reservedData))) {
              // תמיכה לאחור בערך הישן (אם היה רק "100")
              initialPageSize = Number(perPageRow.reservedData);
            }

            const defaultsOrder = (defaults.columnOrder || []).filter(Boolean);
            const raw = Array.isArray(savedOrderRaw) ? savedOrderRaw : [];
            const coreAll = defaultsOrder.filter(
              (id) => id !== "actions" && id !== "row-actions"
            );
            const known = new Set(coreAll);
            const seen = new Set();
            const cleanSaved = [];
            for (const id of raw) {
              if (!id || id === "actions" || id === "row-actions") continue;
              if (!known.has(id)) continue;
              if (seen.has(id)) continue;
              seen.add(id);
              cleanSaved.push(id);
            }
            const missing = coreAll.filter((id) => !seen.has(id));
            const finalOrder = [
              "actions",
              ...cleanSaved,
              ...missing,
              "row-actions",
            ];
            const labelByCol = new Map(
              (defaults.enableFilters || []).map((d) => [
                d.column,
                d.label || d.column,
              ])
            );

            // Merge saved filters with default filters - add any new filters from defaults
            const mergeEnableFilters = () => {
              const defaultFilters = defaults.enableFilters || [];
              if (!Array.isArray(savedEnableFilters) || !savedEnableFilters.length) {
                return defaultFilters;
              }

              // Map saved filters by column for quick lookup
              const savedByColumn = new Map(
                savedEnableFilters.map((f) => [f.column, f])
              );

              // Start with saved filters (updated with current labels and options)
              const merged = savedEnableFilters.map((s) => {
                const defaultFilter = defaultFilters.find((d) => d.column === s.column);
                return {
                  ...s,
                  label: labelByCol.get(s.column) || s.column,
                  // Merge options from defaults if they exist
                  ...(defaultFilter?.options ? { options: defaultFilter.options } : {}),
                  // Merge extraInput from defaults if it exists
                  ...(defaultFilter?.extraInput ? { extraInput: defaultFilter.extraInput } : {}),
                };
              });

              // Add any new filters from defaults that don't exist in saved
              for (const defaultFilter of defaultFilters) {
                if (!savedByColumn.has(defaultFilter.column)) {
                  merged.push({
                    ...defaultFilter,
                    label: labelByCol.get(defaultFilter.column) || defaultFilter.column,
                  });
                }
              }

              return merged;
            };

            set({
              columnOrder: finalOrder,
              columnVisibility:
                savedVisibility || defaults.columnVisibility || {},
              columnSizing: savedSizing || defaults.columnSizing || {},
              columnPinning:
                savedPinning ||
                defaults.columnPinning ||
                getDefaultColumnPinning(),
              pagination: {
                ...get().pagination, // שמור על pageIndex קיים
                pageSize: initialPageSize,
              },
              enableFilters: mergeEnableFilters(),
            });
          },
          resetConfiguration: async () => {
            clearTimeout(batchUpdateTimeout);
            pendingUpdates.clear();
            const defaultConfig = {
              columnOrder: initialConfig.columnOrder || [],
              columnVisibility: initialConfig.columnVisibility || {},
              columnSizing: initialConfig.columnSizing || {},
              columnPinning:
                initialConfig.columnPinning || getDefaultColumnPinning(),
            };
            set(defaultConfig);
            if (window.getWhizmanage) {
              const updateWindowData = (name, data) => {
                const index = window.getWhizmanage.findIndex(
                  (item) => item.name === name
                );
                if (index !== -1) {
                  window.getWhizmanage[index].reservedData = data;
                }
              };
              updateWindowData(
                fieldNames.columnOrder,
                defaultConfig.columnOrder
              );
              updateWindowData(
                fieldNames.columnVisibility,
                defaultConfig.columnVisibility
              );
              updateWindowData(
                fieldNames.columnSizing,
                defaultConfig.columnSizing
              );
              updateWindowData(
                fieldNames.columnPinning,
                defaultConfig.columnPinning
              );
            }
            try {
              await Promise.all([
                putApi(
                  `${window.siteUrl}/wp-json/whizmanage/v1/columns/${fieldNames.columnOrder}`,
                  {
                    name: fieldNames.columnOrder,
                    reservedData: defaultConfig.columnOrder,
                  }
                ),
                putApi(
                  `${window.siteUrl}/wp-json/whizmanage/v1/columns/${fieldNames.columnVisibility}`,
                  {
                    name: fieldNames.columnVisibility,
                    reservedData: defaultConfig.columnVisibility,
                  }
                ),
                putApi(
                  `${window.siteUrl}/wp-json/whizmanage/v1/columns/${fieldNames.columnSizing}`,
                  {
                    name: fieldNames.columnSizing,
                    reservedData: defaultConfig.columnSizing,
                  }
                ),
                putApi(
                  `${window.siteUrl}/wp-json/whizmanage/v1/columns/${fieldNames.columnPinning}`,
                  {
                    name: fieldNames.columnPinning,
                    reservedData: defaultConfig.columnPinning,
                  }
                ),
              ]);
              return true;
            } catch (error) {
              console.error("Failed to save default configuration:", error);
              return false;
            }
          },
          resetData: () => {
            set({
              data: initialData,
              originalData: initialData,
              error: null,
              errors: [],
            });
          },
          resetAll: () => {
            get().resetConfiguration();
            get().resetData();
            set({
              sorting: [],
              globalFilter: "",
              columnFilters: [],
              rowSelection: {},
              expanded: {},
              pagination: { pageIndex: 0, pageSize: 20 },
            });
          },
          getFilteredData: () => {
            const state = get();
            let filtered = [...state.data];
            if (state.globalFilter) {
              filtered = filtered.filter((item) =>
                Object.values(item).some((val) =>
                  String(val)
                    .toLowerCase()
                    .includes(state.globalFilter.toLowerCase())
                )
              );
            }
            state.columnFilters.forEach((filter) => {
              filtered = filtered.filter((item) =>
                String(item[filter.id])
                  .toLowerCase()
                  .includes(filter.value.toLowerCase())
              );
            });
            return filtered;
          },
          getStats: () => {
            const state = get();
            return {
              total: state.data.length,
              filtered: get().getFilteredData().length,
              selected: Object.keys(state.rowSelection).filter(
                (key) => state.rowSelection[key]
              ).length,
              hasErrors: state.errors.length > 0,
            };
          },
        };
      })
    ),
    {
      name: `${storeName}-store`,
    }
  );
}
