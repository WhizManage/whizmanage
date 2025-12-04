import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { __ } from '@wordpress/i18n';

import {
  ArrowDownIcon,
  ArrowUpIcon,
  CaretSortIcon,
  DrawingPinIcon,
  EyeNoneIcon,
} from "@radix-ui/react-icons";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { cn } from "@/lib/utils";
import { PinIcon } from "lucide-react";
import { putApi } from "../../../../services/services";

export function DataTableColumnHeader({ column, title, className }) {
   

  const togglePin = async () => {
    // עדכון מצב הפין
    const newPinState = column.getIsPinned() ? false : "left";
    column.pin(newPinState);
    // קבלת הנתונים הנוכחיים
    const currentData = window.getWhizmanage.find(
      (column) => column.name === "orders_pinned_columns"
    )?.reservedData;

    // עדכון המערכים של העמודות המוצמדות
    const updatedLeft = newPinState
      ? [...(currentData.left || []), column.id]
      : (currentData.left || []).filter((id) => id !== column.id);

    // יצירת אובייקט הנתונים לשמירה
    const data = {
      name: "orders_pinned_columns",
      reservedData: {
        left: updatedLeft,
        right: currentData?.right || [],
      },
    };

    const orders_pinned_idx = window.getWhizmanage.findIndex(
      (col) => col.name === "orders_pinned_columns"
    );
    if (orders_pinned_idx !== -1) {
      window.getWhizmanage[orders_pinned_idx].reservedData = data.reservedData;
    }

    // שמירה בדאטה בייס
    const url =
      window.siteUrl + "/wp-json/whizmanage/v1/columns/orders_pinned_columns";
    await putApi(url, data);
  };

  const handleHideColumn = async () => {
    column.toggleVisibility(false);

    const currentIdx = window.getWhizmanage.findIndex(
      (col) => col.name === "orders_visible_columns"
    );
    const visibleColumns = window.getWhizmanage[currentIdx]?.reservedData || {};

    const data = {
      name: "orders_visible_columns",
      reservedData: {
        ...visibleColumns,
        [column.id]: false,
      },
    };

    if (currentIdx !== -1) {
      window.getWhizmanage[currentIdx].reservedData = data.reservedData;
    }

    const url = window.siteUrl + "/wp-json/whizmanage/v1/columns/ordersDisplay";
    await putApi(url, data);
  };

  // הגדרות עבור גרירה של כותרת העמודה
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({ id: column.id });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    touchAction: "none", // מונע מהדפדפן לגלול בזמן גרירה במובייל
  };

  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center space-x-2 rtl:space-x-reverse",
        className
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className={cn(
          "flex items-center cursor-grab active:cursor-grabbing",
          column.getIsPinned() && "font-medium text-fuchsia-600"
        )}
      >
        {column.getIsPinned() && (
          <PinIcon className="mr-1 rtl:mr-0 rtl:ml-1 h-3.5 w-3.5 text-fuchsia-600" />
        )}
        <span>{__(title, "whizmanage")}</span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-6 w-6 rounded-full p-0 hover:bg-slate-100 dark:hover:bg-slate-700",
              column.getIsSorted() && "bg-slate-100 dark:bg-slate-700"
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
