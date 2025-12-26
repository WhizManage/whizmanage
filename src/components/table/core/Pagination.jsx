// src/components/table/Pagination.jsx
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CustomTooltip from "@components/ui/nextUI/Tooltip.jsx";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Cloud,
  CloudOff,
  Loader2,
} from "lucide-react";
import { memo, useCallback } from "react";
 import { __ } from "@wordpress/i18n";
import { useTableSaveStateStore } from "../store/saveStateStore.js";

/** -------- SaveIndicator (ללא lastSaveTime) -------- */
const SaveIndicator = memo(function SaveIndicator() {
   

  // נרשמים רק ל-saveState כדי לא לטריגר רנדרים כשה- lastSaveTime היה משתנה
  const saveState = useTableSaveStateStore((s) => s.saveState ?? "saved");

  const getTextColor = () => {
    switch (saveState) {
      case "saving":
        return "text-fuchsia-600 dark:text-fuchsia-400";
      case "saved":
        return "text-slate-500 dark:text-slate-300";
      case "offline":
        return "text-yellow-600 dark:text-yellow-400";
      case "error":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-slate-600 dark:text-slate-200";
    }
  };

  return (
    <div
      className={`flex items-center gap-1.5 text-sm text-muted-foreground ${getTextColor()}`}
    >
      {saveState === "saving" && (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>{__("Saving...", "whizmanage")}</span>
        </>
      )}
      {saveState === "saved" && (
        <>
          <Cloud className="h-3.5 w-3.5" />
          <span>{__("All changes saved", "whizmanage")}</span>
        </>
      )}
      {saveState === "error" && (
        <>
          <CloudOff className="h-3.5 w-3.5 text-red-500" />
          <span>{__("Error saving", "whizmanage")}</span>
        </>
      )}
      {saveState === "offline" && (
        <>
          <CloudOff className="h-3.5 w-3.5" />
          <span>{__("Offline - Will sync when online", "whizmanage")}</span>
        </>
      )}
    </div>
  );
});
SaveIndicator.displayName = "SaveIndicator";

/** -------- Pagination -------- */
export const Pagination = memo(function Pagination({
  table,
  entityName,
  serverTotal,
}) {
   

  // perPage מתוך window לפי entityName (orders, products וכו')
  const perPageFromSettings = (() => {
    if (typeof window === "undefined") return undefined;
    const cfg = window.getWhizmanage?.find((c) => c.name === "perPage");
    // נניח ש-reservedData הוא משהו כמו { orders: 100, products: 50, ... }
    return cfg?.reservedData?.[entityName];
  })();

  const handleFirstPage = useCallback(() => {
    table.setPageIndex(0);
  }, [table]);

  const handlePreviousPage = useCallback(() => {
    table.previousPage();
  }, [table]);

  const handleNextPage = useCallback(() => {
    table.nextPage();
  }, [table]);

  const handleLastPage = useCallback(() => {
    const lastPageIndex = table.getPageCount() - 1;
    table.setPageIndex(lastPageIndex);
  }, [table]);

  const canPreviousPage = table.getCanPreviousPage();
  const canNextPage = table.getCanNextPage();
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const pageCount = table.getPageCount();

  const totalRows = table.getFilteredRowModel().rows.length;
  const currentPageRows = table.getPaginationRowModel().rows.length;

  // "מצב All" מזוהה לפי pageSize של MAX_SAFE_INTEGER
  const isAll = pageSize === Number.MAX_SAFE_INTEGER;

  // עבור טווח השורות נשתמש ב-serverTotal כשיש צד שרת
  const totalForRange =
    typeof serverTotal === "number" ? serverTotal : totalRows;

  const startRow =
    totalForRange === 0 ? 0 : pageIndex * (isAll ? currentPageRows : pageSize) + 1;
  const endRow =
    totalForRange === 0
      ? 0
      : Math.min(startRow + currentPageRows - 1, totalForRange);

  const handlePageSizeChange = useCallback(
    (value) => {
      if (value === "all") {
        table.setPageIndex(0);
        table.setPageSize(Number.MAX_SAFE_INTEGER);
      } else {
        table.setPageIndex(0);
        table.setPageSize(Number(value));
      }
    },
    [table]
  );

  const totalLabel =
    typeof serverTotal === "number"
      ? serverTotal
      : totalRows;

  // אופציות לגודל עמוד – כולל perPage מה־settings אם קיים
  const pageSizeOptions = Array.from(
    new Set(
      [10, 20, 50, 100, 200, 500, perPageFromSettings].filter(
        (v) => typeof v === "number" && Number.isFinite(v)
      )
    )
  ).sort((a, b) => a - b);

  return (
    <div className="flex rtl:flex-row-reverse max-lg:flex-wrap items-center justify-between !bg-transparent sm:px-0.5 pb-2 gap-2">
      {/* Save Indicator */}
      <div className="text-sm text-muted-foreground max-sm:hidden !bg-transparent">
        <SaveIndicator />
      </div>
      {/* רק בשרת: ניווט + בחירת גודל עמוד */}
      <>
        {/* Navigation Controls */}
        <div className="flex items-center space-x-2 rtl:flex-row-reverse !bg-transparent">
          <CustomTooltip title={__("Go to first page", "whizmanage")} instantClose>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex text-muted-foreground"
              onClick={handleFirstPage}
              disabled={!canPreviousPage}
              aria-label={__("Go to first page", "whizmanage")}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
          </CustomTooltip>

          <CustomTooltip title={__("Go to previous page", "whizmanage")} instantClose>
            <Button
              variant="outline"
              className="h-8 w-8 p-0 text-muted-foreground"
              onClick={handlePreviousPage}
              disabled={!canPreviousPage}
              aria-label={__("Go to previous page", "whizmanage")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </CustomTooltip>

          <div className="flex w-[100px] items-center justify-center text-sm text-muted-foreground gap-1">
            <span>{__("Page", "whizmanage")}</span>
            <span>{pageCount > 0 ? pageIndex + 1 : 0}</span>
            <span>{__("of", "whizmanage")}</span>
            <span>{pageCount || 0}</span>
          </div>

          <CustomTooltip title={__("Go to next page", "whizmanage")} instantClose>
            <Button
              variant="outline"
              className="h-8 w-8 p-0 text-muted-foreground"
              onClick={handleNextPage}
              disabled={!canNextPage}
              aria-label={__("Go to next page", "whizmanage")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CustomTooltip>

          <CustomTooltip title={__("Go to last page", "whizmanage")} instantClose>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex text-muted-foreground"
              onClick={handleLastPage}
              disabled={!canNextPage}
              aria-label={__("Go to last page", "whizmanage")}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </CustomTooltip>
        </div>

        {/* Page Size + Row Count */}
        <div className="flex items-center space-x-2 rtl:flex-row-reverse !bg-transparent">
          <div className="text-sm text-muted-foreground font-normal">
            {isAll ? (
              <span>
                {totalLabel} {__(entityName, "whizmanage") || __("items", "whizmanage")}
              </span>
            ) : (
              <span>
                {startRow}-{endRow} {__("of", "whizmanage")} {totalLabel}{" "}
                {__(entityName, "whizmanage") || __("items", "whizmanage")}
              </span>
            )}
          </div>

          <Select
            value={isAll ? "all" : `${pageSize}`}
            onValueChange={handlePageSizeChange}
            aria-label={__("Select rows per page", "whizmanage")}
          >
            <SelectTrigger className="h-8 w-fit text-muted-foreground">
              <SelectValue placeholder={isAll ? __("All", "whizmanage") : pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((size) => (
                <SelectItem
                  key={size}
                  value={`${size}`}
                  className="text-muted-foreground"
                >
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </>
    </div>
  );
});
Pagination.displayName = "Pagination";
