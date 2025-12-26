import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { defaultAdapters } from "./trashAdapters";

const noop = () => { };

const normalizeRows = (rows) => {
  if (!rows) return [];
  const arr = Array.isArray(rows)
    ? rows
    : Array.isArray(rows?.data)
      ? rows.data
      : [];
  return arr.map((r, idx) => {
    const rowId = r?.id ?? r?.ID ?? r?._id ?? r?.key ?? r?.sku ?? `row_${idx}`;
    return { id: String(rowId), ...r };
  });
};

const buildSafeColumns = (factory, storeLike, t) => {
  try {
    const cols = typeof factory === "function" ? factory(storeLike, t) : [];
    return Array.isArray(cols) ? cols : [];
  } catch (err) {
    console.error("[useWithTrash] columnsFactory failed:", err);
    return [];
  }
};

const buildSafeToolbarConfig = (factory, __ ,setData) => {
  try {
    const cfg = typeof factory === "function" ? factory(__, setData) : {};
    return cfg && typeof cfg === "object" ? cfg : {};
  } catch (err) {
    console.error("[useWithTrash] toolbarConfigFactory failed:", err);
    return {};
  }
};

export function useWithTrash({
  entityName,
  activeStore,
  makeTrashStore,
  api,
  columnsFactory,
  toolbarConfigFactory,
  __,
  adapters = defaultAdapters,
}) {
  const tSafe = typeof __ === "function" ? __ : (s) => s;
  const trashStore =
    typeof makeTrashStore === "function" ? makeTrashStore() : {};
  const [mode, setMode] = useState("active");

  const activeStoreRef = useRef(activeStore);
  const trashStoreRef = useRef(trashStore);

  useEffect(() => {
    activeStoreRef.current = activeStore;
  }, [activeStore]);

  useEffect(() => {
    trashStoreRef.current = trashStore;
  }, [trashStore]);

  // ✅ החלפת מצב - רק משנה את ה-state
  const toggleMode = useCallback(async () => {
    const next = mode === "active" ? "trash" : "active";
    setMode(next);

    // איפוס קל של ה-store שאליו עוברים (לא חובה, אבל נחמד ל-UX)
    setTimeout(() => {
      const target = next === "trash" ? trashStoreRef.current : activeStoreRef.current;
      try {
        target?.setColumnFilters?.([]);
        target?.setPagination?.((p) => ({
          ...(p || { pageIndex: 0, pageSize: 20 }),
          pageIndex: 0,
        }));
        target?.setRowSelection?.({});
        target?.setGlobalFilter?.("");
      } catch { }
    }, 0);
  }, [mode]);

  // ✅ UI helpers - מבוססים על mode בלבד
  const storeForUI = mode === "trash" ? trashStore : activeStore;

  const storeData = storeForUI?.data;
  const dataLength = Array.isArray(storeData) ? storeData.length : 0;

  const columns = useMemo(() => {
    const safeData = Array.isArray(storeData) ? storeData : [];
    return buildSafeColumns(
      typeof columnsFactory === "function" ? columnsFactory : () => [],
      { ...storeForUI, data: safeData },
      tSafe
    );
  }, [
    columnsFactory,
    tSafe,
    mode,
    dataLength
  ]);

  const baseToolbar = useMemo(() => {
    const safeSetData =
      typeof storeForUI?.setData === "function" ? storeForUI.setData : noop;
    return buildSafeToolbarConfig(
      typeof toolbarConfigFactory === "function"
        ? toolbarConfigFactory
        : () => ({}),
      tSafe,
      safeSetData
    );
  }, [toolbarConfigFactory, tSafe, mode]);

  const toolbarConfig = {
    ...(baseToolbar || {}),
    onTrashSelected: baseToolbar?.onTrashSelected,
    onRestoreSelected: baseToolbar?.onRestoreSelected,
    onDeleteSelected: baseToolbar?.onDeleteSelected,
    customActions: baseToolbar?.customActions,
  };

  return {
    mode,
    toggleMode,
    isTrash: mode === "trash",
    store: storeForUI,
    columns,
    toolbarConfig,
    trashStore,
  };
}