// עדכון DataTable.jsx עבור טבלת ההזמנות
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { orderFilters } from "@/data/defaultFilters";
import { cn } from "@/lib/utils";
import { putApi } from "@/services/services";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CheckIcon } from "lucide-react";
import { __ } from '@wordpress/i18n';
import { toast } from "sonner";
import { DataTablePagination } from "../footer/DataTablePagination";
import DisplayColumns from "../header/DisplayColumns";
import StatusBarFilter from "../header/StatusBarFilter";
import TopPanel from "../header/TopPanel";
import RowItem from "./RowItem";
import SkeletonTable from "./SkeletonTable";
import Toolbar from "./toolbar/Toolbar";
import { TableProvider } from "/src/context/TableContext";
import { useOrdersContext } from "../../../../context/OrdersContext";

export function DataTable({
  columns,
  fetchData,
  isLoading,
  setIsLoading,
  isTrash,
  setIsTrash,
  columnsToVisible,
  loadingMessage,
  loadingProgress,
  columnOrder,
  setColumnOrder,
  ordersData,
}) {
  
  const [sorting, setSorting] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState(columnsToVisible);
  const [rowSelection, setRowSelection] = useState({});
  const [enableFilters, setEnableFilters] = useState(orderFilters);
  const [columnFilters, setColumnFilters] = useState([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [expanded, setExpanded] = useState({});
  const [editingRows, setEditingRows] = useState(new Set());
  const [editAll, setEditAll] = useState(false);
  const [editedItems, setEditedItems] = useState([]);
  const [columnSizing, setColumnSizing] = useState({});
  const [isResizing, setIsResizing] = useState(false); 
  const { data, setData } = useOrdersContext();
  const { resolvedTheme } = useTheme ? useTheme() : { resolvedTheme: "light" };
  const isDark = resolvedTheme === "dark"; // הוספת משתנה isDark

  const isRTL = document.documentElement.dir === 'rtl';

  const [columnPinning, setColumnPinning] = useState(() => {
    const data = window.getWhizmanage.find(
      (column) => column.name === "orders_pinned_columns"
    )?.reservedData || { left: ["select", "expand"], right: [] };
    return data;
  });

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (editedItems.length > 0) {
        const confirmationMessage = __("You have unsaved changes. Are you sure you want to leave?", "whizmanage");
        event.returnValue = confirmationMessage;
        return confirmationMessage;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [editedItems, t]);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      const oldIndex = columnOrder.indexOf(active.id);
      const newIndex = columnOrder.indexOf(over.id);
      const newOrder = arrayMove(columnOrder, oldIndex, newIndex);
      setColumnOrder(newOrder);
      table.setColumnOrder(newOrder);

      const updatedColumnOrder = newOrder;
      const msg = { name: "orders_columns_order", reservedData: updatedColumnOrder };
      const url = window.siteUrl + "/wp-json/whizmanage/v1/columns/" + msg.name;

      try {
        await putApi(url, msg);
        toast(
          <div className="p-4 w-full h-full !border-l-4 !border-l-fuchsia-600 dark:bg-slate-800 dark:text-slate-300 rounded-md flex gap-4 items-center justify-start">
            <CheckIcon className="w-5 h-5 text-fuchsia-600" />
            {__("The new column order has been updated successfully", "whizmanage")}
          </div>,
          { duration: 5000 }
        );
      } catch (error) {
        console.error("Error:", error);
      }
    }
  };

  const toggleEdit = (row, cancel) => {
    const rowId = row.id;
    setEditingRows((prevEditingRows) => {
      const newEditingRows = new Set(prevEditingRows);
      if (newEditingRows.has(rowId)) {
        newEditingRows.delete(rowId);
        if (cancel) {
          if (row.temp == "" || row.temp == undefined) {
            const loading = true;
            // fetchData(loading);
          } else {
            row.original = { ...row.temp };
          }
          delete row.temp;
        }
      } else {
        newEditingRows.add(rowId);
        if (loadingProgress < 75) {
          row.temp = "";
        } else {
          row.temp = { ...row.original };
        }
      }
      return newEditingRows;
    });
  };

  const columnResizeMode = "onChange";
  const columnResizeDirection = window.user_local == "he_IL" ? "rtl" : "ltr";

  // הוספת פונקציות חדשות לטיפול בשינוי גודל העמודות
  const handleColumnSizingStart = () => {
    setIsResizing(true);
  };

  const handleColumnSizingEnd = () => {
    setIsResizing(false);
  };

  const globalFilterFn = (row, id, filterValue) => {
    // דילוג על תת-שורות
    if (row.depth > 0) {
      return true;
    }

    const searchValue = filterValue.toLowerCase();

    const checkValue = (value) => {
      if (value === null || value === undefined) return false;
      if (typeof value === "string" || typeof value === "number") {
        return value.toString().toLowerCase().includes(searchValue);
      }
      if (Array.isArray(value)) {
        return value.some((element) => checkValue(element));
      }
      if (typeof value === "object") {
        return Object.values(value).some((innerValue) =>
          checkValue(innerValue)
        );
      }
      return false;
    };

    return Object.values(row.original).some((value) => checkValue(value));
  };

  const handleSaveSize = (updater) => {
    setColumnSizing((prev) => {
      const newState = typeof updater === "function" ? updater(prev) : updater;
      return { ...newState };
    });
  };

  // פונקציה משותפת לסגנון עמודות מוצמדות
  const getCommonPinningStyles = (column) => {
    const isPinned = column.getIsPinned();
    const isPinnedLeft = isPinned === "left";
    const isPinnedRight = isPinned === "right";

    if (!isPinned) {
      return {
        width: column.getSize(),
        minWidth: column.getSize(),
      };
    }

    return {
      width: column.getSize(),
      minWidth: column.getSize(),
      position: "sticky",
      [isRTL ? "right" : "left"]: isPinnedLeft
        ? `${column.getStart("left")}px`
        : undefined,
      [isRTL ? "left" : "right"]: isPinnedRight
        ? `${column.getAfter("right")}px`
        : undefined,
      zIndex: 40,
    };
  };

  const HeaderShadowEffect = ({ pinSide }) => {
    const isLeft = pinSide === "left";
    return (
      <div
        className="absolute top-0 bottom-0 transition-opacity duration-200 opacity-70 group-hover:opacity-100"
        style={{
          [isRTL ? (isLeft ? "left" : "right") : isLeft ? "right" : "left"]:
            "-4px",
          width: "4px",
          background: isDark
            ? `linear-gradient(to ${isLeft ? "right" : "left"}, ${isLeft ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.75)"}, transparent)`
            : `linear-gradient(to ${isLeft ? "right" : "left"}, rgba(0,0,0,0.08), transparent)`,
          zIndex: 41,
          pointerEvents: "none",
        }}
      />
    );
  };

  useEffect(() => {
    if (!columnSizing || Object.keys(columnSizing).length === 0) return;

    const time = setTimeout(async () => {
      const msg = { name: "orders_columns_width", reservedData: tableColumns };
      const url = window.siteUrl + "/wp-json/whizmanage/v1/columns/" + msg.name;
      // console.log("Saving column sizes:", msg);

      try {
        await putApi(url, msg);
        // console.log("Column sizes saved to DB:", columnSizing);
      } catch (error) {
        console.error("Failed to save column sizes:", error);
      }
    }, 500);

    return () => clearTimeout(time);
  }, [columnSizing]);

  const table = useReactTable({
    data,
    columns,
    columnResizeMode,
    columnResizeDirection,
    onSortingChange: setSorting,
    onColumnSizingChange: handleSaveSize,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onColumnPinningChange: setColumnPinning,
    onExpandedChange: setExpanded,
    onColumnOrderChange: setColumnOrder,
    getSubRows: (row) => row.subRows,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    state: {
      columnSizing,
      globalFilter,
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      expanded,
      columnOrder,
      columnPinning,
    },
    globalFilterFn: globalFilterFn,
    autoResetPageIndex: false,
    enableColumnPinning: true,
    onColumnResizeStart: handleColumnSizingStart, // הוספת טיפול בריסייז
    onColumnResizeEnd: handleColumnSizingEnd,
  });

  const tableColumns = table.getAllLeafColumns().reduce((acc, column) => {
    acc[column.id] = column.getSize();
    return acc;
  }, {});

  useEffect(() => {
    setColumnVisibility(columnsToVisible);
  }, [columnsToVisible]);

  useEffect(() => {
    if (!editAll && editingRows.size === 0) {
      setEditedItems([]);
    }
  }, [editAll, editingRows]);

  const tableResizingClass = isResizing ? "table-resizing" : ""; // הוספת מחלקת CSS למצב שינוי גודל

  return (
    <TableProvider table={table}>
      <div className={`flex flex-col gap-2 p-2 ${tableResizingClass}`}>
        <TopPanel
          table={table}
          enableFilters={enableFilters}
          setEnableFilters={setEnableFilters}
          globalFilter={globalFilter}
          setGlobalFilter={setGlobalFilter}
          isTrash={isTrash}
          setIsTrash={setIsTrash}
          editAll={editAll}
          setEditAll={setEditAll}
          setEditingRows={setEditingRows}
          editedItems={editedItems}
          setEditedItems={setEditedItems}
          setRowSelection={setRowSelection}
        />
        <StatusBarFilter
          enableFilters={enableFilters}
          setColumnFilters={setColumnFilters}
          data={data}
        />
        <div className="relative overflow-auto">
          <Toolbar
            setRowSelection={setRowSelection}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            table={table}
            fetchData={fetchData}
            isTrash={isTrash}
            ordersData={ordersData}
          />
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={columnOrder}
              strategy={horizontalListSortingStrategy}
            >
              <Table
                style={{
                  width:
                    window.innerWidth > 640
                      ? table.getCenterTotalSize()
                      : "auto",
                }}
                className="resizable-table"
              >
                <TableHeader className="sticky top-0 z-[39]">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                        const isHeaderResizing = header.column.getIsResizing();
                        return (
                          <TableHead
                            key={header.id}
                            colSpan={header.colSpan}
                            style={{
                              ...getCommonPinningStyles(header.column),
                              top: 0, // הוספת top: 0 לכל כותרת
                            }}
                            className={cn(
                              "px-4 py-2 group table-head-cell relative", // הוספת 'relative'
                              isHeaderResizing && "is-resizing"
                            )}
                          >
                            {/* אפקט צל לכותרת העמודה האחרונה המוצמדת */}
                            {header.column.getIsPinned() === "left" &&
                              header.column.getIsLastColumn("left") && (
                                <HeaderShadowEffect pinSide="left" />
                              )}
                            {header.column.getIsPinned() === "right" &&
                              header.column.getIsFirstColumn("right") && (
                                <HeaderShadowEffect pinSide="right" />
                              )}

                            {/* תוכן הכותרת */}
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}

                            {/* הגדרת הרייסייזר בסגנון המשודרג */}
                            <div
                              className={cn(
                                "absolute top-0 h-full w-4 select-none touch-none !rounded-full",
                                isRTL ? "left-0" : "right-0",
                                isHeaderResizing
                                  ? "bg-fuchsia-600/80 opacity-70 !w-2"
                                  : "opacity-0 group-hover:opacity-50 bg-slate-800 bg-opacity-50 hover:bg-opacity-80 dark:bg-slate-100 w-1 hover:w-2",
                                "transition-all duration-200 ease-in-out"
                              )}
                              style={{
                                cursor: "col-resize",
                              }}
                              {...{
                                onMouseDown: header.getResizeHandler(),
                                onTouchStart: header.getResizeHandler(),
                              }}
                            />
                          </TableHead>
                        );
                      })}
                      {/* עמודת תצוגת העמודות */}
                      {!editAll && (
                        <TableHead
                          style={{
                            position: "sticky",
                            top: 0,
                            [isRTL ? "left" : "right"]: 0,
                            zIndex: 42,
                          }}
                          className={cn(
                            "!z-30 !min-h-10 w-full group flex items-center justify-center relative", // הוספת 'relative'
                            "dark:bg-slate-900",
                            // isRTL
                            //   ? "[mask-image:_linear-gradient(to_right,transparent_0,_black_0px,_black_calc(100%-8px),transparent_100%)]"
                            //   : "[mask-image:_linear-gradient(to_left,transparent_80,_black_0px,_black_calc(100%-8px),transparent_100%)]"
                          )}
                        >
                          <HeaderShadowEffect
                            pinSide={isRTL ? "left" : "right"}
                          />
                          <DisplayColumns table={table} plusButton />
                        </TableHead>
                      )}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <SkeletonTable />
                  ) : table.getRowModel().rows?.length ? (
                    table
                      .getRowModel()
                      .rows.map((row) => (
                        <RowItem
                          key={row.id}
                          row={row}
                          isEditing={editingRows.has(row.id)}
                          toggleEdit={toggleEdit}
                          setData={setData}
                          editAll={editAll}
                          editedItems={editedItems}
                          setEditedItems={setEditedItems}
                          isTrash={isTrash}
                          isRTL={isRTL}
                          isDark={isDark}
                        />
                      ))
                  ) : (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                      <div className="flex items-center gap-4 text-left bg-white dark:bg-slate-800 p-5 rounded-lg shadow-md border-l-4 border-l-fuchsia-600">
                        <div className="flex-shrink-0 w-12 h-12 bg-fuchsia-600/10 rounded-full flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-fuchsia-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                            {__("No orders found", "whizmanage")}
                          </h3>
                          <p className="text-gray-500 dark:text-gray-400 text-sm">
                            {__("Try changing the date range or filters", "whizmanage")}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </TableBody>
              </Table>
            </SortableContext>
          </DndContext>
        </div>
        <DataTablePagination
          table={table}
          loadingMessage={loadingMessage}
          loadingProgress={loadingProgress}
        />
      </div>
    </TableProvider>
  );
}
