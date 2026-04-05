// src/components/table/TopPanel.jsx
import { useDebounceFn } from "@/components/table/hooks/useDebounce";
import { cn } from "@/lib/utils";
import Button from "@components/ui/button.jsx";
import { Input } from "@components/ui/input.jsx";
import { Columns, Filter, Plus, Search, X, Upload } from "lucide-react";
import CustomTooltip from "@components/ui/nextUI/Tooltip";
import { memo, useCallback, useEffect, useState, forwardRef, useImperativeHandle, useRef } from "react";
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

// 🔒 סטייל/תגית לפריטים נעולים
const lockStyle =
  "opacity-50 grayscale cursor-not-allowed pointer-events-none relative";
const ProCorner = () => (
  <div className="absolute -top-1 -right-1 scale-90">
    <ProBadge />
  </div>
);

export const TopPanel = memo(
  forwardRef(({
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

    // ✅ קונפיגורציה ליבוא (אופציונלי)
    importConfig = null,
    data = null,
    isTrash = false,
  }, ref) => {
    const addItemRef = useRef(null);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      openFormModal: () => addItemRef.current?.openFormModal?.(),
      closeFormModal: () => addItemRef.current?.closeFormModal?.(),
      triggerAddInlineRow: () => onAddInlineRow?.(),
    }), [onAddInlineRow]);

    const [localFilter, setLocalFilter] = useState(globalFilter || "");
    const [isColumnsOpen, setIsColumnsOpen] = useState(false);
    const [filterSearch, setFilterSearch] = useState("");

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
              <DropdownMenu onOpenChange={(open) => !open && setFilterSearch("")}>
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
                <DropdownMenuContent align="start" className="w-56">
                  {/* Search input */}
                  <div className="px-2 pb-2">
                    <div className="relative">
                      <Search className="absolute start-2 top-1/2 -translate-y-1/2 text-slate-400 h-3.5 w-3.5 pointer-events-none" />
                      <Input
                        value={filterSearch}
                        onChange={(e) => setFilterSearch(e.target.value)}
                        className="h-8 !ps-7 text-sm text-start"
                        dir="auto"
                        placeholder={__("Search...", "whizmanage")}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  {/* Scrollable list */}
                  <div className="max-h-64 overflow-y-auto">
                    {enableFilters
                      .filter((f) => {
                        if (!filterSearch) return true;
                        const search = filterSearch.toLowerCase();
                        const originalLabel = (f.label || f.column).toLowerCase();
                        const translatedLabel = __(f.label, "whizmanage").toLowerCase();
                        return originalLabel.includes(search) || translatedLabel.includes(search);
                      })
                      .map((f) => (
                        <DropdownMenuCheckboxItem
                          key={f.column}
                          className="capitalize"
                          checked={!!f.enable}
                          onCheckedChange={() => toggleFilter(f.column)}
                        >
                          {__(f.label, "whizmanage")}
                        </DropdownMenuCheckboxItem>
                      ))}
                    {enableFilters.filter((f) => {
                      if (!filterSearch) return true;
                      const search = filterSearch.toLowerCase();
                      const originalLabel = (f.label || f.column).toLowerCase();
                      const translatedLabel = __(f.label, "whizmanage").toLowerCase();
                      return originalLabel.includes(search) || translatedLabel.includes(search);
                    }).length === 0 && (
                      <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                        {__("No filters found", "whizmanage")}
                      </div>
                    )}
                  </div>
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
          {/* ✅ Import Button - Pro feature (always locked) */}
          {importConfig?.enabled && importConfig?.showInTopPanel && !isTrash && (
            <CustomTooltip
              title={__("Pro feature", "whizmanage")}
              instantClose
            >
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-8 px-2 sm:px-3 flex items-center gap-2 font-normal text-muted-foreground",
                    lockStyle
                  )}
                  aria-disabled="true"
                >
                  <Upload className="h-4 w-4" strokeWidth={1.5} />
                  <span className="hidden sm:inline">
                    {__(importConfig.buttonLabel || "Import Settings", "whizmanage")}
                  </span>
                </Button>
                <ProCorner />
              </div>
            </CustomTooltip>
          )}

          {entityName && !isTrash && (() => {
            // 🔒 הגבלת חוקי הנחות ל-1 עבור Free users
            const noLicence = typeof window !== "undefined" && window.hasLicence !== true;
            const isDiscountRulesLimitReached =
              entityName === "discount-rules" &&
              noLicence &&
              Array.isArray(data) &&
              data.length >= 1;

            return (
              <AddItemDropdown
                ref={addItemRef}
                entity={entityName}
                onCreated={onItemCreated}
                onAddInlineRow={onAddInlineRow}
                isLimitReached={isDiscountRulesLimitReached}
              />
            );
          })()}
        </div>
      </div>
    );
  })
);

TopPanel.displayName = "TopPanel";
