// src/components/media/MediaPagination.jsx
import { cn } from "@/lib/utils";
import Button2 from "@components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
 import { __ } from "@wordpress/i18n";

const MediaPagination = ({
  page,
  totalPages,
  onChange,
  currentCount,
  totalItems,
  onCancel,
  onSave,
  className,
}) => {
   
  const isRTL = window?.document?.documentElement?.dir === "rtl";

  
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
      {typeof currentCount === "number" && typeof totalItems === "number" && (
        <div className="!min-w-40 flex gap-1 h-10 items-center text-muted-foreground">
          <span>{__("Showing", "whizmanage")}</span>
          <span>{currentCount}</span>
          <span>{__("of", "whizmanage")}</span>
          <span>{totalItems}</span>
          <span className="text-nowrap">{__("media items", "whizmanage")}</span>
        </div>
      )}
      {/* Pager */}
      <div className="w-full md:w-auto h-10 flex justify-center items-center gap-4">
        <Button2
          variant="outline"
          className="size-8 p-0"
          onClick={goPrev}
          disabled={!canPrev}
          aria-label={__("Go to previous page", "whizmanage")}
        >
          {isRTL ? (
            <ChevronRightIcon className="h-4 w-4" />
          ) : (
            <ChevronLeftIcon className="h-4 w-4" />
          )}
        </Button2>
        
        <p className="text-muted-foreground text-sm">
          {__("page", "whizmanage")} {page} {__("of", "whizmanage")} {totalPages}
        </p>
        
        <Button2
          variant="outline"
          className="size-8 p-0"
          onClick={goNext}
          disabled={!canNext}
          aria-label={__("Go to next page", "whizmanage")}
        >
          {isRTL ? (
            <ChevronLeftIcon className="h-4 w-4" />
          ) : (
            <ChevronRightIcon className="h-4 w-4" />
          )}
        </Button2>
      </div>
      {/* Actions */}
      <div className={cn("flex gap-2", isRTL ? "flex-row-reverse" : "flex-row")}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCancel?.();
          }}
          className="px-3 h-10 rounded-md border border-slate-300 dark:border-slate-600 text-sm dark:text-slate-200"
        >
          {__("Close", "whizmanage")}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSave?.();
          }}
          className="px-3 h-10 rounded-md text-white text-sm bg-fuchsia-600 hover:bg-fuchsia-700"
        >
          {__("Save", "whizmanage")}
        </button>
      </div>
    </div>
  );
};

export default MediaPagination;