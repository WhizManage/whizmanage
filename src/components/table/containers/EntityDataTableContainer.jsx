// src/components/table/containers/EntityDataTableContainer.jsx
import { cn } from "@/lib/utils";
import GenericDataTable from "@components/table/core/DataTable.jsx";
import Button from "@components/ui/button.jsx";
import { Loader2, Trash2, Undo2 } from "lucide-react";
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
 import { __ } from "@wordpress/i18n";
import { useQueryClient } from "@tanstack/react-query";

import { useWithTrash } from "../trash/useWithTrash.js";

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full p-4">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

// ✅ קומפוננטה פנימית שתטען רק אחרי שהמודולים הדינמיים הגיעו
const LazyLoadedUI = ({
  store,
  useTrashStore,
  useStore,
  config,
  ...rest
}) => {
  const [modules, setModules] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // טען רק את הקבצים הכבדים שצריך לרנדור
        const [columnsMod, toolbarMod] = await Promise.all([
          config.loadColumns(),
          config.loadToolbar(),
        ]);
        if (!mounted) return;

        // ✅ ודא שהפונקציות קיימות
        const createColumns = columnsMod.createEntityColumns;
        const toolbarConfigFactory = toolbarMod.entityToolbarConfig;
        if (!createColumns || typeof createColumns !== "function") {
          throw new Error(`createColumns function not found in columns module`);
        }
        if (
          !toolbarConfigFactory ||
          typeof toolbarConfigFactory !== "function"
        ) {
          throw new Error(`toolbarConfig function not found in toolbar module`);
        }

        setModules({ createColumns, toolbarConfigFactory });
      } catch (err) {
        console.error(
          `[${config.entityName}] Failed to load dynamic modules:`,
          err
        );
        if (!mounted) return;
        setLoadError(err);
        // ✅ פונקציות fallback כדי שהטבלה עדיין תעלה
        setModules({
          createColumns: () => [],
          toolbarConfigFactory: () => ({}),
        });
      }
    })();
    return () => {
      mounted = false;
    };
  }, [config]);

  // ✅ הצג שגיאה אם הטעינה נכשלה
  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <p className="text-red-500 mb-2">Failed to load table configuration</p>
        <p className="text-sm text-muted-foreground">{loadError.message}</p>
      </div>
    );
  }
  if (!modules) {
    return <LoadingFallback />;
  }

  return (
    <DataTableUI
      store={store}
      useTrashStore={useTrashStore}
      useStore={useStore}
      config={config}
      createColumns={modules.createColumns}
      toolbarConfigFactory={modules.toolbarConfigFactory}
      {...rest}
    />
  );
};

function DataTableUI({
  entityName,
  store,
  useStore,
  useTrashStore,
  config,
  createColumns,
  toolbarConfigFactory,
}) {
   
  const { api, adapters, tableConfigDefaults, fetchPage } = config;
  const [isToggling, setIsToggling] = useState(false);
  const activeStoreRef = useRef(store);
  const trashStoreRef = useRef(null);

  const columnsFactory = useCallback(
    (storeInstance, tArg) => {
      try {
        const stable = {
          data: Array.isArray(storeInstance?.data) ? storeInstance.data : [],
          updateItem: storeInstance?.updateItem ?? (() => { }),
          updateItemWithHistory:
            storeInstance?.updateItemWithHistory ?? (() => { }),
        };
        const apiHandleUpdate = async (
          id,
          field,
          value,
          rowData,
          isFromHistory
        ) => {
          if (typeof storeInstance.masterUpdateCell === "function") {
            await storeInstance.masterUpdateCell(
              id,
              field,
              value,
              rowData,
              isFromHistory
            );
            return true;
          }
          console.warn(
            `[${entityName}] masterUpdateCell not found on store, using generic fallback.`
          );
          const prevValue = rowData?.[field];
          const patch = { [field]: value };

          if (typeof storeInstance.updateItemWithHistory === "function") {
            storeInstance.updateItemWithHistory(id, patch);
          } else {
            storeInstance.updateItem(id, patch);
          }

          try {
            if (
              config.api.entityApi &&
              typeof config.api.entityApi.updateField === "function"
            ) {
              await config.api.entityApi.updateField(id, field, value, rowData);
            }
            return true;
          } catch (e) {
            const rollback = { [field]: prevValue };
            if (typeof storeInstance.updateItemWithHistory === "function") {
              storeInstance.updateItemWithHistory(id, rollback, false);
            } else {
              storeInstance.updateItem(id, rollback);
            }
            throw e;
          }
        };
        const cols = createColumns(
          storeInstance, // ✅ תעביר את ה-store המלא
          typeof tArg === "function" ? tArg : (s) => s,
          apiHandleUpdate
        );
        return Array.isArray(cols) ? cols : [];
      } catch (err) {
        console.error(`[${entityName}] createColumns failed:`, err);
        return [];
      }
    },
    [createColumns, entityName, config.api]
  );

  const {
    isTrash,
    store: currentStore,
    columns,
    toolbarConfig: resolvedToolbarConfig,
    toggleMode,
    trashStore,
  } = useWithTrash({
    entityName,
    activeStore: store,
    makeTrashStore: useTrashStore,
    api: api.apiForTrash,
    columnsFactory,
    toolbarConfigFactory,
    __,
    adapters,
  });


  trashStoreRef.current = trashStore;

  const queryClient = useQueryClient();

  useEffect(() => {
    const onTrashMoved = (e) => {
      const { items } = e.detail;
      if (items?.length) {
        const trashedIds = new Set(items.map(i => String(i.id)));

        // 1. Update Active Store locally (remove items that were moved to trash)
        if (store && typeof store.setData === "function") {
          store.setData((prev) =>
            prev.filter(p => !trashedIds.has(String(p.id)))
          );
        }

        // 2. Update React Query Cache for Active View (remove trashed items from ALL pages)
        queryClient.setQueriesData(
          { queryKey: [entityName], exact: false },
          (oldData) => {
            if (!oldData || !oldData.rows) return oldData;
            return {
              ...oldData,
              rows: oldData.rows.filter(r => !trashedIds.has(String(r.id))),
              total: Math.max(0, (oldData.total || 0) - items.length)
            };
          }
        );

        // 3. Update Trash Store locally (Optimistic update)
        if (trashStore && typeof trashStore.setData === "function") {
          trashStore.setData((prev) => {
            const newItems = items.map(item => ({ ...item, status: 'trash' }));
            const existingIds = new Set(prev.map(p => String(p.id)));
            const uniqueNewItems = newItems.filter(i => !existingIds.has(String(i.id)));
            return [...uniqueNewItems, ...prev];
          });
        }

        // 4. Update React Query Cache for Trash (Optimistic - ALL pages)
        const trashEntityName = `trash ${entityName}`;
        queryClient.setQueriesData(
          { queryKey: [trashEntityName], exact: false },
          (oldData) => {
            const newItems = items.map(item => ({ ...item, status: 'trash' }));

            if (!oldData) {
              return {
                rows: newItems,
                total: newItems.length,
                totalPages: 1,
                page: 1,
                perPage: 20
              };
            }

            const existingIds = new Set((oldData.rows || []).map(p => String(p.id)));
            const uniqueNewItems = newItems.filter(i => !existingIds.has(String(i.id)));

            return {
              ...oldData,
              rows: [...uniqueNewItems, ...(oldData.rows || [])],
              total: (oldData.total || 0) + uniqueNewItems.length
            };
          }
        );


      }
    };

    const onTrashRestored = (e) => {
      const { items } = e.detail;
      if (items?.length) {
        const restoredIds = new Set(items.map(i => String(i.id)));

        // 1. Update Active Store locally (add restored items)
        if (store && typeof store.setData === "function") {
          store.setData((prev) => {
            const restoredItems = items.map(item => {
              const { date_deleted, ...rest } = item;
              return { ...rest, status: 'publish' };
            });
            const existingIds = new Set(prev.map(p => String(p.id)));
            const uniqueRestoredItems = restoredItems.filter(i => !existingIds.has(String(i.id)));
            return [...uniqueRestoredItems, ...prev];
          });
        }

        // 2. Update React Query Cache for Active View (add restored items to ALL pages)
        queryClient.setQueriesData(
          { queryKey: [entityName], exact: false },
          (oldData) => {
            const restoredItems = items.map(item => {
              const { date_deleted, ...rest } = item;
              return { ...rest, status: 'publish' };
            });

            if (!oldData) {
              return {
                rows: restoredItems,
                total: restoredItems.length,
                totalPages: 1,
                page: 1,
                perPage: 20
              };
            }

            const existingIds = new Set((oldData.rows || []).map(p => String(p.id)));
            const uniqueRestoredItems = restoredItems.filter(i => !existingIds.has(String(i.id)));

            return {
              ...oldData,
              rows: [...uniqueRestoredItems, ...(oldData.rows || [])],
              total: (oldData.total || 0) + uniqueRestoredItems.length
            };
          }
        );

        // 3. Update Trash Store locally (Optimistic removal)
        if (trashStore && typeof trashStore.setData === "function") {
          trashStore.setData((prev) => {
            return prev.filter(p => !restoredIds.has(String(p.id)));
          });
        }

        // 4. Update React Query Cache for Trash (Optimistic removal - ALL pages)
        const trashEntityName = `trash ${entityName}`;
        queryClient.setQueriesData(
          { queryKey: [trashEntityName], exact: false },
          (oldData) => {
            if (!oldData || !oldData.rows) return oldData;
            return {
              ...oldData,
              rows: oldData.rows.filter(r => !restoredIds.has(String(r.id))),
              total: Math.max(0, (oldData.total || 0) - items.length)
            };
          }
        );


      }
    };

    window.addEventListener('wm:trash:moved', onTrashMoved);
    window.addEventListener('wm:trash:restored', onTrashRestored);

    return () => {
      window.removeEventListener('wm:trash:moved', onTrashMoved);
      window.removeEventListener('wm:trash:restored', onTrashRestored);
    };
  }, [trashStore, store, queryClient, entityName]);

  const handleToggleMode = async () => {
    setIsToggling(true);
    try {
      await toggleMode();
    } finally {
      setIsToggling(false);
    };
  };

  // 🔽 שלוף את הפונקציה מחוץ ל-useEffect
  const loadConfiguration = currentStore?.loadConfiguration;

  useEffect(() => {
    if (loadConfiguration && tableConfigDefaults) {
      loadConfiguration(tableConfigDefaults);
    }
  }, [loadConfiguration, tableConfigDefaults]);

  const undoRedoProps = currentStore?.undoRedoHistory
    ? {
      history: currentStore.undoRedoHistory,
      canUndo: () => currentStore.undoRedoHistory.canUndo(),
      canRedo: () => currentStore.undoRedoHistory.canRedo(),
      onUndo: currentStore.undoRedoHistory.undo,
      onRedo: currentStore.undoRedoHistory.redo,
    }
    : null;

  const toolbarWithToggle = useMemo(() => {
    const canToggleTrash = resolvedToolbarConfig?.allowTrash ?? true;

    // ✅ שלוף את ה-customActions מה-config המקורי
    const configCustomActions = resolvedToolbarConfig?.customActions || [];

    return {
      ...resolvedToolbarConfig,
      // ✅ שמור את ה-customActions כדי שיעברו ל-buildActions
      customActions: [
        ...(canToggleTrash
          ? [
            <Button
              key="trash-toggle"
              variant="outline"
              size="sm"
              disabled={isToggling}
              className={cn(
                isTrash
                  ? "mx-1 ring-fuchsia-600 ring-1 ring-offset-1 ring-offset-white dark:!ring-offset-slate-700 !bg-fuchsia-50/50 dark:!bg-slate-900/70"
                  : "",
                "h-8 px-2 sm:px-3 flex items-center gap-2 font-normal text-muted-foreground"
              )}
              onClick={handleToggleMode}
            >
              {isToggling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isTrash ? (
                <Undo2 className="h-4 w-4" />
              ) : (
                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
              )}
              {isTrash ? __(`Back to ${entityName}`, "whizmanage") : __("Trash", "whizmanage")}
            </Button>,
          ]
          : []),
        // ✅ הוסף את הפעולות המותאמות (אובייקטים, לא React elements)
        ...configCustomActions,
      ],
      // ✅ העבר גם את הפעולות המותאמות בנפרד לשימוש ב-buildActions
      _rowCustomActions: configCustomActions.filter(
        (a) => !React.isValidElement(a)
      ),
    };
  }, [
    resolvedToolbarConfig,
    entityName,
    isTrash,
    isToggling,
    __,
  ]);



  const tableConfigOverride = useMemo(
    () => ({
      enableRowSelection: true,
      enableRowActions: true,
      enableSorting: true,
      enableFiltering: true,
      enablePagination: true,
      enableColumnResizing: true,
      enableColumnPinning: true,
      enableRowDragging: true,
      enableColumnDragging: true,
      enableGrouping: true,
    }),
    []
  );

  const mergedTableConfig = useMemo(() => {
    const base = {
      ...tableConfigOverride,
      ...tableConfigDefaults,
      fetchPage,
    };

    if (isTrash && config.api.apiForTrash?.fetchPage) {
      base.fetchPage = config.api.apiForTrash.fetchPage;
      // Swap entityApi to ensure updates/actions use the trash API if needed
      base.api = {
        ...config.api,
        entityApi: config.api.apiForTrash,
      };
    }

    return base;
  }, [tableConfigOverride, tableConfigDefaults, fetchPage, isTrash, config.api]);

  return (
    <GenericDataTable
      key={isTrash ? `table-trash-${entityName}` : `table-active-${entityName}`}
      store={currentStore}
      useTableStore={isTrash ? useTrashStore : useStore}
      columns={Array.isArray(columns) ? columns : []}
      config={mergedTableConfig}
      undoRedoProps={undoRedoProps}
      entityName={isTrash ? `trash ${entityName}` : entityName}
      toolbarConfig={toolbarWithToggle}
      isTrash={isTrash}
      tableDefaults={config.tableConfigDefaults}
      importConfig={config.importConfig}
    />
  );
}

export default function EntityDataTableContainer({ entityConfig }) {
  const { entityName, useStore, useTrashStoreFactory } = entityConfig;

  // ✅ קריאה ל-store מתבצעת כאן, סטטית ומיידית
  const store = useStore();

  // ✅ ודא ש-store קיים לפני המשך
  if (!store) {
    return <LoadingFallback />;
  }

  return (
    <div className="!bg-transparent">
      <Suspense fallback={<LoadingFallback />}>
        <LazyLoadedUI
          entityName={entityName}
          store={store}
          useStore={useStore}
          useTrashStore={useTrashStoreFactory}
          config={entityConfig}
        />
      </Suspense>
    </div>
  );
}
