// src/components/table/ColumnHeader.jsx
import { useTheme } from "@/layout/ThemeProvider.jsx";
import Button from "@components/ui/button.jsx";
import { Input } from "@components/ui/input.jsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/ui/popover";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { flexRender } from "@tanstack/react-table";
import {
  ArrowDownAZ,
  ArrowDownZA,
  ArrowUpAZ,
  ArrowUpZA,
  ChevronsUpDown,
  EyeOff,
  Pin,
  PinOff,
  X,
} from "lucide-react";
import CustomTooltip from "@components/ui/nextUI/Tooltip.jsx";
import { useState } from "react";
 import { __ } from "@wordpress/i18n";
import { getCommonPinningStyles } from "../utils/tableUtils.js";

export function ColumnHeader({ header, table, children, isActionsColumn }) {
   
  const [showDropdown, setShowDropdown] = useState(false);
  const [filterValue, setFilterValue] = useState(
    header.column.getFilterValue() || ""
  );
  const [isHovered, setIsHovered] = useState(false);
const isRTL = window?.document?.documentElement?.dir === "rtl";
  const { theme } = useTheme();
  const handleSide = isRTL ? "left" : "right";

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: header.id,
    data: { type: "column" },
    disabled: isActionsColumn,
  });

  const isPinned = header.column.getIsPinned();
  const canResize = header.column.getCanResize();
  const columnName = header.column.columnDef.header || header.id;
  const sortState = header.column.getIsSorted();
  const isLastLeftPinned =
    isPinned === "left" && header.column.getIsLastColumn("left");
  const isFirstRightPinned =
    isPinned === "right" && header.column.getIsFirstColumn("right");

  const getPinDirection = (logicalDirection) => {
    if (isRTL) {
      return logicalDirection === "left"
        ? { visual: "right", text: __("Pin to right", "whizmanage") }
        : { visual: "left", text: __("Pin to left", "whizmanage") };
    }
    return logicalDirection === "left"
      ? { visual: "left", text: __("Pin to left", "whizmanage") }
      : { visual: "right", text: __("Pin to right", "whizmanage") };
  };

  const isRowActionsColumn = header.column.id === "row-actions";
  const isDarkMode =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia?.("(prefers-color-scheme: dark)")?.matches);

  const getHeaderShadow = () => {
    if (isLastLeftPinned) {
      return isDarkMode
        ? "4px 0 8px -2px rgba(15, 23, 42, 0.3), 2px 0 4px -1px rgba(15, 23, 42, 0.2)"
        : "3px 0 6px -3px rgba(0, 0, 0, 0.08), 2px 0 4px -2px rgba(0, 0, 0, 0.05)";
    }

    if (isFirstRightPinned) {
      return isDarkMode
        ? "-4px 0 8px -2px rgba(15, 23, 42, 0.3), -2px 0 4px -1px rgba(15, 23, 42, 0.2)"
        : "-3px 0 6px -3px rgba(0, 0, 0, 0.08), -2px 0 4px -2px rgba(0, 0, 0, 0.05)";
    }

    return undefined;
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging || header.column.getIsResizing() ? "none" : transition,
    zIndex: isDragging ? 1000 : isPinned ? 50 : 40,
    width: header.getSize(),
    ...getCommonPinningStyles(header.column),
    boxShadow: getHeaderShadow(),
    backgroundColor: isDarkMode ? "rgb(51 65 85)" : "rgb(248 250 252)",
  };

  const toggleColumnPin = (position) => {
    const pinState = table.getState().columnPinning;
    const columnId = header.column.id;

    if (header.column.getIsPinned() === position) {
      header.column.pin(false);
      setShowDropdown(false);
      return;
    }

    const leftNow = (pinState.left || []).filter((id) => id !== columnId);
    const rightNow = (pinState.right || []).filter((id) => id !== columnId);

    let newLeftPinned = leftNow;
    let newRightPinned = rightNow;

    if (position === "left") {
      const hasActions = newLeftPinned.includes("actions");
      if (hasActions) {
        const withoutActions = newLeftPinned.filter((id) => id !== "actions");
        newLeftPinned = ["actions", ...withoutActions, columnId];
      } else {
        newLeftPinned = [...newLeftPinned, columnId];
      }
    }

    if (position === "right") {
      const hasRowActions = newRightPinned.includes("row-actions");
      const rest = newRightPinned.filter((id) => id !== "row-actions");
      if (hasRowActions) {
        newRightPinned = [columnId, ...rest, "row-actions"];
      } else {
        newRightPinned = [columnId, ...rest];
      }
    }

    table.setColumnPinning({ left: newLeftPinned, right: newRightPinned });
    setShowDropdown(false);
  };

  const handleFilterChange = (value) => {
    setFilterValue(value);
    header.column.setFilterValue(value || undefined);
  };

  const handleSortClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    header.column.toggleSorting();
  };

  const getSortDescription = () => {
    if (sortState === "asc") return __("Sort ascending", "whizmanage");
    if (sortState === "desc") return __("Sort descending", "whizmanage");
    return __("Clear sort", "whizmanage");
  };

  const leftPin = getPinDirection("left");
  const rightPin = getPinDirection("right");

  return (
    <th
      ref={setNodeRef}
      style={style}
      className={`border-b border-slate-300 dark:border-slate-800 p-0 text-right font-medium text-sm text-slate-900 dark:text-slate-200 relative bg-slate-50 dark:!bg-slate-900 ${
        isPinned ? "sticky" : ""
      } ${
        isDragging
          ? "shadow-2xl border-2 border-slate-400 scale-105 opacity-95"
          : ""
      }`}
      role="columnheader"
      aria-sort={
        sortState === "asc"
          ? "ascending"
          : sortState === "desc"
          ? "descending"
          : "none"
      }
      aria-label={__("Column header", {
        columnName,
        sortDescription: getSortDescription(),
      })}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative h-full py-1.5 px-1">
        {isActionsColumn ? (
          <div className="w-full h-full flex items-center justify-center">
            {!isRowActionsColumn && <div className="flex-1"></div>}
            {children}
          </div>
        ) : (
          <div className="flex items-center gap-0 px-1">
            {/* אייקון ביטול הצמדה לעמודות מוצמדות */}
            {isPinned && (
              <CustomTooltip title={__("Unpin", "whizmanage")} instantClose>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    header.column.pin(false);
                  }}
                  className="p-0.5 rounded-sm text-fuchsia-500 hover:text-fuchsia-600 hover:bg-fuchsia-100 dark:hover:bg-fuchsia-900/30 transition-all"
                >
                  <Pin className="h-3 w-3" />
                </button>
              </CustomTooltip>
            )}
            <Popover open={showDropdown} onOpenChange={setShowDropdown}>
              <PopoverTrigger asChild>
                <div
                  {...attributes}
                  {...listeners}
                  className={`flex-1 cursor-pointer select-none px-1.5 py-0.5 rounded-sm transition-all text-sm flex items-center justify-between group/header ${
                    showDropdown
                      ? "ring-1 ring-fuchsia-600/50 bg-fuchsia-50 dark:bg-slate-800"
                      : isHovered
                      ? "ring-1 ring-slate-300 dark:ring-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                      : ""
                  } ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
                  style={{ touchAction: "none" }}
                >
                  <div className="flex items-center flex-nowrap text-nowrap text-slate-700 dark:text-slate-300">
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </div>

                  {table.options.enableSorting && (
                    <button
                      onClick={handleSortClick}
                      className={`p-0.5 -mr-0.5 rounded-sm transition-all ${
                        isHovered || sortState
                          ? "opacity-100"
                          : "opacity-0 pointer-events-none"
                      } ${
                        sortState
                          ? "text-fuchsia-600 hover:bg-fuchsia-200 dark:hover:bg-slate-600 group-hover/header:bg-fuchsia-100 dark:group-hover/header:bg-slate-700"
                          : "text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-600 group-hover/header:bg-slate-200 dark:group-hover/header:bg-slate-700"
                      }`}
                    >
                      {sortState === "asc" ? (
                        <ArrowUpZA className="h-3.5 w-3.5" />
                      ) : sortState === "desc" ? (
                        <ArrowDownZA className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronsUpDown className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </PopoverTrigger>

              <PopoverContent
                align="start"
                sideOffset={5}
                className="w-48 p-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg"
              >
                {/* מיון */}
                <div className="p-1">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      header.column.toggleSorting(false);
                      setShowDropdown(false);
                    }}
                    disabled={sortState === "asc"}
                    className={`w-full h-9 flex items-center justify-start gap-2 px-2 py-2 text-sm font-normal text-muted-foreground rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      sortState === "asc" ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <ArrowUpAZ className="size-3.5" />
                    <span>{__("Sort ascending", "whizmanage")}</span>
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={() => {
                      header.column.toggleSorting(true);
                      setShowDropdown(false);
                    }}
                    disabled={sortState === "desc"}
                    className={`w-full h-9 flex items-center justify-start gap-2 px-2 py-2 text-sm font-normal text-muted-foreground rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      sortState === "desc" ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <ArrowDownAZ className="size-3.5" />
                    <span>{__("Sort descending", "whizmanage")}</span>
                  </Button>

                  {sortState && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        header.column.clearSorting();
                        setShowDropdown(false);
                      }}
                      className="w-full h-9 flex items-center justify-start gap-2 px-2 py-2 text-sm font-normal text-muted-foreground rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <X className="size-3.5" />
                      <span>{__("Clear sort", "whizmanage")}</span>
                    </Button>
                  )}
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700" />

                {/* הצמדה */}
                <div className="p-1">
                  {header.column.id !== "actions" && (
                    <Button
                      variant="ghost"
                      onClick={() => toggleColumnPin("left")}
                      disabled={header.column.getIsPinned() === "left"}
                      className={`w-full h-9 flex items-center justify-start gap-2 px-2 py-2 text-sm font-normal text-muted-foreground rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
                        header.column.getIsPinned() === "left"
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      <Pin className="size-3" />
                      <span>{leftPin.text}</span>
                    </Button>
                  )}

                  {header.column.id !== "row-actions" && (
                    <Button
                      variant="ghost"
                      onClick={() => toggleColumnPin("right")}
                      disabled={header.column.getIsPinned() === "right"}
                      className={`w-full h-9 flex items-center justify-start gap-2 px-2 py-2 text-sm font-normal text-muted-foreground rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
                        header.column.getIsPinned() === "right"
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      <Pin className="size-3" />
                      <span>{rightPin.text}</span>
                    </Button>
                  )}

                  {header.column.getIsPinned() &&
                    header.column.id !== "actions" &&
                    header.column.id !== "row-actions" && (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          header.column.pin(false);
                          setShowDropdown(false);
                        }}
                        className="w-full h-9 flex items-center justify-start gap-2 px-2 py-2 text-sm font-normal text-muted-foreground rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <PinOff className="size-3" />
                        <span>{__("Unpin", "whizmanage")}</span>
                      </Button>
                    )}
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700" />

                {/* הסתרה */}
                <div className="p-1">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      header.column.toggleVisibility();
                      setShowDropdown(false);
                    }}
                    className="w-full h-9 flex items-center justify-start gap-2 px-2 py-2 text-sm font-normal text-muted-foreground rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <EyeOff className="size-3" />
                    <span>{__("Hide column", "whizmanage")}</span>
                  </Button>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700" />

                {/* סינון */}
                <div className="p-2">
                  <Input
                    id={`filter-${header.id}`}
                    type="text"
                    placeholder={__("Type to filter", "whizmanage")}
                    value={filterValue}
                    onChange={(e) => handleFilterChange(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full h-8"
                    autoFocus
                    aria-label={__("Filter column", { column: columnName })}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {canResize && !isActionsColumn && (
          <>
            <div
              className={`absolute top-0 h-full w-1 bg-slate-300 dark:bg-slate-800 rounded-full transition-all ${
                isHovered ? "opacity-100" : "opacity-0"
              }`}
              style={{ zIndex: 19, [handleSide]: 0 }}
            />
            <div
              onMouseDown={header.getResizeHandler()}
              onTouchStart={header.getResizeHandler()}
              className="absolute top-0 h-full w-0.5 cursor-col-resize select-none touch-none group"
              style={{ zIndex: 20, [handleSide]: 0 }}
            >
              <div
                className={`absolute top-0 h-full w-1 rounded-full transition-all ${
                  header.column.getIsResizing()
                    ? "bg-fuchsia-500 opacity-100"
                    : "bg-slate-300 dark:bg-slate-800 group-hover:bg-fuchsia-500 opacity-0 group-hover:opacity-100"
                }`}
                style={{ [handleSide]: 0 }}
              />
              <div
                className="absolute top-0 w-3 h-full"
                style={{ [handleSide]: -4 }}
              />
            </div>
          </>
        )}
      </div>
    </th>
  );
}