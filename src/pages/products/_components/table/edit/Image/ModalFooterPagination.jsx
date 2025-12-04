import { cn } from "@/lib/utils";
import Button2 from "@components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { __ } from '@wordpress/i18n';

/**
 * Footer למודלים: מונה + פג'ינציה + כפתורי פעולות.
 *
 * Props:
 * - page (number)             – עמוד נוכחי
 * - totalPages (number)       – סה"כ עמודים
 * - onChange(nextPage)        – שינוי עמוד
 * - currentCount (number)     – כמה פריטים מוצגים כרגע (למשל items.length) [אופציונלי]
 * - totalItems (number)       – סה"כ פריטים [אופציונלי]
 * - resourceLabel (string)    – טקסט לסוג המשאב (ברירת מחדל: __(media items"))
 * - showSummary (boolean)     – האם להציג את ה-"Showing..." (ברירת מחדל: true)
 * - onCancel ()               – פעולה לכפתור סגור
 * - onSave ()                 – פעולה לכפתור שמור
 * - saveDisabled (boolean)    – השבתת כפתור שמור
 * - className (string)
 */
export default function ModalFooterPagination({
  page,
  totalPages,
  onChange,
  currentCount,
  totalItems,
  resourceLabel,
  showSummary = true,
  onCancel,
  onSave,
  saveDisabled = false,
  className,
}) {
  
  const isRTL = document.documentElement.dir === 'rtl';

  const canPrev = page > 1;
  const canNext = page < totalPages;

  const goPrev = () => canPrev && onChange(page - 1);
  const goNext = () => canNext && onChange(page + 1);

  return (
    <div
      className={cn(
        "w-full flex flex-col md:flex-row md:items-center md:justify-between gap-3",
        className
      )}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Summary */}
      {showSummary &&
        typeof currentCount === "number" &&
        typeof totalItems === "number" && (
          <div className="!min-w-40 flex gap-1 h-10 items-center text-muted-foreground">
            <span>{__("Showing", "whizmanage")}</span>
            <span>{currentCount}</span>
            <span>{__("of", "whizmanage")}</span>
            <span>{totalItems}</span>
            <span className="text-nowrap">
              {resourceLabel || __("media items", "whizmanage")}
            </span>
          </div>
        )}
      {/* Pager */}
      <div className="w-full md:w-auto h-10 flex justify-center items-center gap-4">
        <Button2
          variant="outline"
          className="size-10 p-0"
          onClick={goPrev}
          disabled={!canPrev}
          aria-label={__("Go to previous page", "whizmanage")}
          title={__("Go to previous page", "whizmanage")}
        >
          {isRTL ? (
            <ChevronRightIcon className="h-4 w-4" />
          ) : (
            <ChevronLeftIcon className="h-4 w-4" />
          )}
        </Button2>

        <p className="dark:text-slate-300">
          {__("page", "whizmanage")} {page} {__("of", "whizmanage")} {totalPages}
        </p>

        <Button2
          variant="outline"
          className="size-10 p-0"
          onClick={goNext}
          disabled={!canNext}
          aria-label={__("Go to next page", "whizmanage")}
          title={__("Go to next page", "whizmanage")}
        >
          {isRTL ? (
            <ChevronLeftIcon className="h-4 w-4" />
          ) : (
            <ChevronRightIcon className="h-4 w-4" />
          )}
        </Button2>
      </div>
      {/* Default actions */}
      <div className={cn("flex gap-2", isRTL ? "flex-row-reverse" : "flex-row")}>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 h-10 rounded-md border border-slate-300 dark:border-slate-600 text-sm dark:text-slate-200"
        >
          {__("Close", "whizmanage")}
        </button>
        <button
          type="button"
          onClick={onSave}
          className={"px-3 h-10 rounded-md text-white text-sm bg-fuchsia-600 hover:bg-fuchsia-700"}
        >
          {__("Save", "whizmanage")}
        </button>
      </div>
    </div>
  );
}
