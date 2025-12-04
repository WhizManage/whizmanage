import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { putApi } from "@/services/services";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CaretSortIcon,
  DrawingPinIcon,
  EyeNoneIcon,
} from "@radix-ui/react-icons";
import { PinIcon } from "lucide-react";
import React from "react";
import { __ } from '@wordpress/i18n';

export function DataTableColumnHeader({ column, title, className }) {
   

  const [isDraggingColumn, setIsDraggingColumn] = React.useState(false);

  React.useEffect(() => {
    const checkDragState = () => {
      const isDragging = document.body.classList.contains("dragging-column");
      setIsDraggingColumn(isDragging);
    };

    const observer = new MutationObserver(checkDragState);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const togglePin = async () => {
    const newPinState = column.getIsPinned() ? false : "left";
    column.pin(newPinState);

    const currentData =
      window.getWhizmanage.find((col) => col.name === "products_pinned_columns")
        ?.reservedData || {};

    const updatedLeft = newPinState
      ? [...(currentData.left || []), column.id]
      : (currentData.left || []).filter((id) => id !== column.id);

    const data = {
      name: "products_pinned_columns",
      reservedData: {
        left: updatedLeft,
        right: currentData.right || [],
      },
    };

    const product_pinned_idx = window.getWhizmanage.findIndex(
      (col) => col.name === "products_pinned_columns"
    );
    if (product_pinned_idx !== -1) {
      window.getWhizmanage[product_pinned_idx].reservedData = data.reservedData;
    }

    const url =
      window.siteUrl + "/wp-json/whizmanage/v1/columns/products_pinned_columns";
    await putApi(url, data);
  };

  const handleHideColumn = async () => {
    column.toggleVisibility(false);

    const currentIdx = window.getWhizmanage.findIndex(
      (col) => col.name === "products_visible_columns"
    );
    const visibleColumns = window.getWhizmanage[currentIdx]?.reservedData || {};

    const data = {
      name: "products_visible_columns",
      reservedData: {
        ...visibleColumns,
        [column.id]: false,
      },
    };

    if (currentIdx !== -1) {
      window.getWhizmanage[currentIdx].reservedData = data.reservedData;
    }

    const url = `${window.siteUrl}/wp-json/whizmanage/v1/columns/products_columns_order`;
    await putApi(url, data);
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: {
      type: "column",
      column: column.id,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? "none" : transition,
    opacity: isDragging ? 1 : 1,
    zIndex: isDragging ? 9999 : "auto",
    cursor: isDragging ? "grabbing" : "grab",
    // מונע תזוזה אנכית
    transformOrigin: "center",
    willChange: isDragging ? "transform" : "auto",
    ...(isDragging && {
      position: "relative",
      isolation: "isolate",
      backfaceVisibility: "hidden",
      perspective: "1000px",
    }),
  };

  if (!column.getCanSort()) {
    return <div className={cn(className)}>{__(title, "whizmanage")}</div>;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center space-x-2 rtl:space-x-reverse select-none relative",
        className,
        isDragging && [
          "dragging-header",
          "!bg-slate-100 dark:!bg-slate-800",
          "rounded-md shadow-2xl",
          "border-1 border-slate-200 dark:border-slate-600",
          "px-2 py-0.5",
          "font-semibold text-slate-800 dark:text-slate-100",
          "!z-[9999] !relative",
          "backdrop-blur-sm",
          "overflow-visible",
        ]
      )}
    >
      {/* אזור גרירה ייעודי */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          "flex items-center px-1 py-0.5 rounded-md transition-colors duration-200",
          // "active:bg-slate-200 dark:active:bg-slate-600",
          "cursor-grab active:cursor-grabbing touch-none",
          column.getIsPinned() && "!font-extrabold",
          isDragging && "cursor-grabbing"
        )}
        title={__("Drag to reorder column", "whizmanage")}
      >
        {/* אייקון גרירה - רק בזמן גרירה */}
        {/* {isDragging && (
          <GripVertical className="mr-2 rtl:mr-0 rtl:ml-2 h-4 w-4 text-fuchsia-600" />
        )} */}

        {column.getIsPinned() && (
          <PinIcon className="mr-1 rtl:mr-0 rtl:ml-1 h-3.5 w-3.5" />
        )}

        <span
          className={cn(
            "select-none font-medium",
            isDragging && "text-slate-700 dark:text-slate-200"
          )}
        >
          {__(title, "whizmanage")}
        </span>
      </div>
      {/* תפריט פעולות */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-6 w-6 rounded-md p-0 hover:bg-slate-200 dark:hover:bg-slate-700",
              column.getIsSorted() && "bg-slate-200 dark:bg-slate-700"
            )}
          >
            {column.getIsSorted() === "desc" ? (
              <ArrowDownIcon className="h-3.5 w-3.5" />
            ) : column.getIsSorted() === "asc" ? (
              <ArrowUpIcon className="h-3.5 w-3.5" />
            ) : (
              <CaretSortIcon className="h-3.5 w-3.5" />
            )}
            <span className="sr-only">
              {__(column.getIsSorted() === "desc"
                ? "Sort ascending"
                : column.getIsSorted() === "asc"
                  ? "Sort descending"
                  : "Sort", "whizmanage")}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="min-w-[12rem] dark:border-slate-600 z-50"
        >
          <DropdownMenuItem
            onClick={() => column.toggleSorting(false)}
            className="flex items-center"
          >
            <ArrowUpIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <span>{__("Asc", "whizmanage")}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => column.toggleSorting(true)}
            className="flex items-center"
          >
            <ArrowDownIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <span>{__("Desc", "whizmanage")}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={togglePin}
            className="flex items-center justify-between"
          >
            <div className="flex items-center">
              <DrawingPinIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              <span>{__(column.getIsPinned() ? "Unpin" : "Pin", "whizmanage")}</span>
            </div>
            {column.getIsPinned() && (
              <span className="text-xs px-1.5 py-0.5 rounded-sm bg-fuchsia-600/10 text-fuchsia-600">
                {__("Pinned", "whizmanage")}
              </span>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleHideColumn}
            className="flex items-center"
          >
            <EyeNoneIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <span>{__("Hide", "whizmanage")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
