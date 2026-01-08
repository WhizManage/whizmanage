// src/components/table/TopPanel.jsx
import { useDebounceFn } from "@/components/table/hooks/useDebounce";
import { cn } from "@/lib/utils";
import Button from "@components/ui/button.jsx";
import { Input } from "@components/ui/input.jsx";
import { Columns, Filter, Plus, Search, X, Upload } from "lucide-react";
import CustomTooltip from "@components/ui/nextUI/Tooltip";
import { memo, useCallback, useEffect, useState, lazy, Suspense } from "react";
 import { __ } from "@wordpress/i18n";
import { DisplayColumns } from "./DisplayColumns";
import { UndoRedoButtons } from "./UndoRedoButtons.jsx";
import ProBadge from "@components/ui/nextUI/ProBadge";

// ייבוא רכיבי התפריט (Shadcn)
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu";
import AddItemDropdown from "../../forms/AddItemDropdown.jsx";

// ✅ Lazy load של Import component
const ImportSettings = lazy(() =>
  import("../import/ImportSettings").catch(() => ({
    default: () => <div>Import Error</div>
  }))
);

export const TopPanel = memo(
  ({
    // Filter props
    globalFilter,
    setGlobalFilter,
    totalRows,
    entityName,

    // NEW: toggling which filters to show
    enableFilters = null,
    setEnableFilters = null,

    // Action props
    onAddTestData = null,
    undoRedoProps = null,
    customActions = null,

    // NEW: for DisplayColumns
    table = null,
    useTableStore = null,
    tableConfig = null,

    // ✅ callback כשהתווסף אייטם חדש
    onItemCreated = null,

    // ✅ NEW: callback להוספת שורה ריקה
    onAddInlineRow = null,

    // ✅ NEW: קונפיגורציה ליבוא (אופציונלי)
    importConfig = null,
    data = null,
    isTrash = false,
  }) => {
     
    const [localFilter, setLocalFilter] = useState(globalFilter || "");
    const [isColumnsOpen, setIsColumnsOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    // 🔒 סטייל/תגית לפריטים נעולים
    const lockStyle =
      "opacity-50 grayscale cursor-not-allowed pointer-events-none relative";
    const ProCorner = () => (
      <div className="absolute -top-1 -right-1 scale-90">
        <ProBadge />
      </div>
    );

    const debouncedSetGlobalFilter = useDebounceFn(
      (value) => setGlobalFilter(value),
      { wait: 500 }
    );

    useEffect(() => {
      debouncedSetGlobalFilter(localFilter);
    }, [localFilter, debouncedSetGlobalFilter]);

    useEffect(() => {
      return () => debouncedSetGlobalFilter.cancel?.();
    }, [debouncedSetGlobalFilter]);

    const handleInputChange = useCallback((e) => {
      setLocalFilter(e.target.value);
    }, []);

    const handleClear = useCallback(() => {
      setLocalFilter("");
      setGlobalFilter("");
      debouncedSetGlobalFilter.cancel?.();
    }, [setGlobalFilter, debouncedSetGlobalFilter]);

    const toggleFilter = useCallback(
      (columnId) => {
        if (
          !Array.isArray(enableFilters) ||
          typeof setEnableFilters !== "function"
        )
          return;
        setEnableFilters((current) =>
          current.map((f) =>
            f.column === columnId ? { ...f, enable: !f.enable } : f
          )
        );
      },
      [enableFilters, setEnableFilters]
    );

    return (
      <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
          {undoRedoProps && (
            <div className="flex-shrink-0 h-8">
              <UndoRedoButtons {...undoRedoProps} />
            </div>
          )}

          {undoRedoProps && (
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
          )}

          {Array.isArray(enableFilters) &&
            typeof setEnableFilters === "function" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 sm:px-3 flex items-center gap-2 font-normal text-muted-foreground"
                  >
                    <Filter className="h-4 w-4" strokeWidth={1.5} />
                    <span className="hidden sm:inline">{__("Filters", "whizmanage")}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {enableFilters.map((f) => (
                    <DropdownMenuCheckboxItem
                      key={f.column}
                      className="capitalize"
                      checked={!!f.enable}
                      onCheckedChange={() => toggleFilter(f.column)}
                    >
                      {__(f.label, "whizmanage")}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

          {table && useTableStore && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 sm:px-3 flex items-center gap-2 font-normal text-muted-foreground"
                onClick={() => setIsColumnsOpen(!isColumnsOpen)}
              >
                <Columns className="h-4 w-4" strokeWidth={1.5} />
                <span className="hidden sm:inline">{__("Columns", "whizmanage")}</span>
              </Button>

              {isColumnsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsColumnsOpen(false)}
                  />
                  <div
                    className={cn(
                      "absolute top-full start-0 mt-1 z-50",
                      "w-[320px] rounded-lg border border-slate-200 dark:border-slate-700",
                      "bg-white dark:bg-slate-800 shadow-lg"
                    )}
                  >
                    <DisplayColumns
                      table={table}
                      useTableStore={useTableStore}
                      tableConfig={tableConfig}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {customActions && (
            <div className="flex items-center gap-1.5 sm:gap-2">{customActions}</div>
          )}

          <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

          <div className="relative w-full sm:w-auto sm:flex-1 sm:max-w-72 min-w-[120px] rounded-lg hover:shadow-sm transition-shadow order-first sm:order-none mb-0.5 sm:mb-0">
            <Search className="absolute start-2 top-1/2 -translate-y-1/2 text-slate-400 h-3 sm:h-4 w-3 sm:w-4 pointer-events-none" />
            <Input
              value={localFilter}
              onChange={handleInputChange}
              className="w-full h-[22px] sm:h-8 !ps-6 sm:!ps-8 !pe-6 sm:!pe-8 border rounded sm:rounded-lg text-[11px] sm:text-sm"
              placeholder={__("Search", "whizmanage")}
              type="text"
              aria-label={__("Search in table", "whizmanage")}
            />
            {localFilter && (
              <CustomTooltip title={__("Clear search", "whizmanage")} instantClose>
                <button
                  onClick={handleClear}
                  className="absolute end-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-0.5 rounded-sm hover:bg-slate-200 dark:hover:bg-slate-700"
                  aria-label={__("Clear search", "whizmanage")}
                >
                  <X className="h-3 w-3" />
                </button>
              </CustomTooltip>
            )}
          </div>

          {onAddTestData && (
            <>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
              <Button onClick={onAddTestData} variant="gradient" size="sm">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {__("Add 1000 products", "whizmanage")}
                </span>
                <span className="sm:hidden">+1000</span>
              </Button>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* ✅ Import Button - נעילה לפי window.hasLicence בלבד */}
          {importConfig?.enabled && importConfig?.showInTopPanel && !isTrash && (
            <>
              <CustomTooltip
                title={
                  (typeof window !== "undefined" &&
                    window?.hasLicence === false)
                    ? __("Pro feature", "whizmanage")
                    : __("Import Settings", "whizmanage")
                }
                instantClose
              >
                <div className="relative">
                  <Button
                    onClick={
                      (typeof window !== "undefined" &&
                        window?.hasLicence === false)
                        ? undefined /* 🔒 חסום */
                        : () => setIsImportOpen(true)
                    }
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 px-2 sm:px-3 flex items-center gap-2 font-normal text-muted-foreground",
                      (typeof window !== "undefined" &&
                        window?.hasLicence === false) && lockStyle // 🔒 סטייל נעול
                    )}
                    aria-disabled={
                      (typeof window !== "undefined" &&
                        window?.hasLicence === false)
                        ? "true"
                        : "false"
                    }
                  >
                    <Upload className="h-4 w-4" strokeWidth={1.5} />
                    <span className="hidden sm:inline">
                      {__(importConfig.buttonLabel || "Import Settings", "whizmanage")}
                    </span>
                  </Button>
                  {(typeof window !== "undefined" &&
                    window?.hasLicence === false) && <ProCorner />} {/* 🔖 Pro */}
                </div>
              </CustomTooltip>

              <Suspense fallback={null}>
                {isImportOpen &&
                  (typeof window !== "undefined" &&
                    window?.hasLicence !== false) && (
                    <ImportSettings
                      isOpen={isImportOpen}
                      onClose={() => setIsImportOpen(false)}
                      config={importConfig}
                      entityName={entityName}
                      data={data}
                    />
                  )}
              </Suspense>
            </>
          )}

          {/* באנר שדרוג לפרו - מוצג רק ב-discount-rules למשתמשי Free עם חוק קיים */}
          {entityName === "discount-rules" &&
           typeof window !== "undefined" &&
           window.hasLicence === false &&
           Array.isArray(data) &&
           data.length >= 1 && (
            <a
              href="https://whizmanage.com/pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-fuchsia-700 dark:text-fuchsia-300 bg-fuchsia-50 dark:bg-fuchsia-900/30 border border-fuchsia-200 dark:border-fuchsia-700 rounded-lg hover:bg-fuchsia-100 dark:hover:bg-fuchsia-900/50 hover:!text-fuchsia-800 dark:hover:!text-fuchsia-200 transition-colors"
            >
              <span>✨</span>
              <span>{__("Upgrade to Pro for unlimited discount rules", "whizmanage")}</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}

          {entityName && !isTrash && (
            <AddItemDropdown
              entity={entityName}
              onCreated={onItemCreated}
              onAddInlineRow={onAddInlineRow}
              currentItemsCount={Array.isArray(data) ? data.length : 0}
            />
          )}
        </div>
      </div>
    );
  }
);

TopPanel.displayName = "TopPanel";