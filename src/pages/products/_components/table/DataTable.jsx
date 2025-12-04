import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useProductsContext } from "@/context/ProductsContext";
import { defaultFilters } from "@/data/defaultFilters";
import { cn } from "@/lib/utils";
import { putApi } from "@/services/services";
import Button from "@components/ui/button";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  restrictToHorizontalAxis,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { AlertTriangle, CheckIcon, GripVertical, XCircle } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import { __ } from '@wordpress/i18n';
import { toast } from "sonner";
import { useDebounce } from "../../../../components/hooks/useDebounce";
import { DataTablePagination } from "../footer/DataTablePagination";
import DisplayColumns from "../header/DisplayColumns";
import StatusBarFilter from "../header/StatusBarFilter";
import TopPanel from "../header/TopPanel";
import SkeletonTable from "./SkeletonTable";
import SortableRow from "./SortableRow";
import Toolbar from "./toolbar/Toolbar";
import { TableProvider } from "/src/context/TableContext";

export function DataTable({
  columns,
  fetchData,
  isLoading,
  isTrash,
  setIsTrash,
  columnsToVisible,
  loadingMessage,
  loadingProgress,
  columnOrder,
  setColumnOrder,
  isTableImport,
  setIsLoading,
}) {
  
  const [sorting, setSorting] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState(columnsToVisible);
  const [rowSelection, setRowSelection] = useState({});
  const [columnFilters, setColumnFilters] = useState([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [expanded, setExpanded] = useState({});
  const [editingRows, setEditingRows] = useState(new Set());
  const [editAll, setEditAll] = useState(false);
  const [editedItems, setEditedItems] = useState([]);
  const [columnSizing, setColumnSizing] = useState({});
  const { data, setData } = useProductsContext();
  const [isDraggingColumn, setIsDraggingColumn] = useState(false);
  const [activeColumn, setActiveColumn] = useState(null);
  const [isResizing, setIsResizing] = useState(false);
  const { resolvedTheme } = useTheme ? useTheme() : { resolvedTheme: "light" };
  const isDark = resolvedTheme === "dark";

  const isRTL = document.documentElement.dir === 'rtl';

  const [columnPinning, setColumnPinning] = useState(() => {
    const data = window.getWhizmanage.find(
      (column) => column.name === "products_pinned_columns"
    )?.reservedData || { left: ["select", "expand"], right: [] };
    return data;
  });

  const columnSensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const rowSensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 50,
        tolerance: 2,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const dataIds = useMemo(
    () => data?.map((item) => item.id.toString()) || [],
    [data]
  );

 const confirmationMessage = useMemo(
    () => __("You have unsaved changes. Are you sure you want to leave?", "whizmanage"),
    []
  );

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (editedItems.length > 0) {
        // התקן: טריגר לאזהרה
        event.preventDefault?.(); // חלק מהדפדפנים מתעלמים, אבל לא מזיק
        event.returnValue = "";   // חייב להיות מחרוזת; הטקסט מותאם לרוב לא יוצג
        // חלק מהדפדפנים עדיין יחזירו את המחרוזת הזו:
        return confirmationMessage;
      }
      return undefined;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [editedItems.length, confirmationMessage]);


  const syncFilters = (localFilters, serverData) => {
    const localFiltersMap = new Map(
      localFilters.map((item) => [item.column, item])
    );
    serverData.forEach((serverItem) => {
      if (localFiltersMap.has(serverItem.column)) {
        const localItem = localFiltersMap.get(serverItem.column);
        localFiltersMap.set(serverItem.column, {
          ...localItem,
          enable: serverItem.enable,
        });
      }
    });
    return Array.from(localFiltersMap.values());
  };

  const [enableFilters, setEnableFilters] = useState(() => {
    const filters =
      window.getWhizmanage.find((column) => column.name === "products_enabled_filters")
        ?.reservedData || [];
    return syncFilters(defaultFilters, filters);
  });

  const handlePartialSuccess = (result, originalData) => {
    const errorIds = new Set(result.errors.map((item) => item.id));
    setData((prevData) =>
      prevData.map((item) =>
        errorIds.has(item.id)
          ? originalData.find((org) => org.id === item.id) || item
          : item
      )
    );

    toast(
      <div className="p-4 w-full h-full !border-l-4 !border-l-yellow-500 dark:bg-slate-800 dark:text-slate-300 rounded-md flex gap-4 items-center justify-start">
        <AlertTriangle className="w-5 h-5 text-yellow-500" />
        {__("Some items failed to update", "whizmanage")} ({result.totalErrors}/
        {result.totalProcessed})
      </div>,
      { duration: 5000 }
    );
  };

  const handleRowDragEnd = async (event) => {
    const { active, over } = event;
    if (!active || !over || active.id === over.id) return;

    const oldIndex = dataIds.indexOf(active.id);
    const newIndex = dataIds.indexOf(over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const originalData = [...data];
      const draggedItem = data[oldIndex];

      // עדכן את ה-UI מיידית (אופטימיסטי)
      const newData = arrayMove(data, oldIndex, newIndex);
      setData(newData);

      // קבע את המוצרים שמסביב למקום החדש
      let prevProductId = null;
      let nextProductId = null;

      if (newIndex > 0) {
        prevProductId = newData[newIndex - 1].id;
      }

      if (newIndex < newData.length - 1) {
        nextProductId = newData[newIndex + 1].id;
      }

      try {
        // שלח בקשה אחת בלבד לשרת!
        const response = await fetch(
          `${window.siteUrl}/wp-json/whizmanage/v1/products/simple-reorder`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-WP-Nonce": window.rest,
            },
            body: JSON.stringify({
              product_id: draggedItem.id,
              prev_product_id: prevProductId,
              next_product_id: nextProductId,
            }),
          }
        );

        const result = await response.json();

        if (result.success) {
          // עדכן את ה-menu_order של כל המוצרים לפי הסדר החדש
          setData((prevData) =>
            prevData.map((item, index) => ({
              ...item,
              menu_order: index + 1, // אם רוצה קפיצות של 10: (index + 1) * 10
            }))
          );

          toast(
            <div className="p-4 w-full h-full !border-l-4 !border-l-emerald-500 dark:bg-slate-800 dark:text-slate-300 rounded-md flex gap-4 items-center justify-start">
              <CheckIcon className="w-5 h-5 text-emerald-500" />
              {__("Product order updated successfully", "whizmanage")}
              <small className="text-slate-500">
                ({result.updated_products} {__("products updated", "whizmanage")})
              </small>
            </div>,
            { duration: 3000 }
          );
        } else {
          throw new Error(result.message || "Update failed");
        }
      } catch (error) {
        console.error("Reorder error:", error);

        // החזר למצב הקודם במקרה של שגיאה
        setData(originalData);

        toast(
          <div className="p-4 w-full h-full !border-l-4 !border-l-red-500 dark:bg-slate-800 dark:text-slate-300 rounded-md flex gap-4 items-center justify-start">
            <XCircle className="w-5 h-5 text-red-500" />
            {error.message || __("Failed to update product order", "whizmanage")}
          </div>,
          { duration: 5000 }
        );
      }
    }
  };

  const handleColumnDragStart = (event) => {
    setIsDraggingColumn(true);
    setActiveColumn(event.active.id);
    document.body.classList.add("dragging-column");
  };

  const handleColumnDragEnd = async (event) => {
    const { active, over } = event;
    setIsDraggingColumn(false);
    setActiveColumn(null);
    document.body.classList.remove("dragging-column");

    if (!active || !over || active.id === over.id) return;

    const oldIndex = columnOrder.indexOf(active.id);
    const newIndex = columnOrder.indexOf(over.id);
    const newOrder = arrayMove(columnOrder, oldIndex, newIndex);
    setColumnOrder(newOrder);
    table.setColumnOrder(newOrder);

    const updatedColumnOrder = newOrder;
    const msg = { name: "products_columns_order", reservedData: updatedColumnOrder };
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

  const handleColumnSizingStart = () => {
    setIsResizing(true);
  };

  const handleColumnSizingEnd = () => {
    setIsResizing(false);
  };

  const globalFilterFn = (row, id, filterValue) => {
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

  const debouncedColumnSizing = useDebounce(columnSizing, 500);

  const handleSaveSize = (updater) => {
    setColumnSizing((prev) => {
      const newState = typeof updater === "function" ? updater(prev) : updater;
      return { ...newState };
    });
  };

  useEffect(() => {
    if (
      !debouncedColumnSizing ||
      Object.keys(debouncedColumnSizing).length === 0
    )
      return;

    const saveColumnSizes = async () => {
      const msg = {
        name: "products_columns_width",
        reservedData: tableColumns,
      };
      const url = window.siteUrl + "/wp-json/whizmanage/v1/columns/" + msg.name;

      try {
        await putApi(url, msg);
      } catch (error) {
        console.error("Failed to save column sizes:", error);
      }
    };

    saveColumnSizes();
  }, [debouncedColumnSizing]);

  const getCommonPinningStyles = (column) => {
    const isPinned = column.getIsPinned();
    const isPinnedLeft = isPinned === "left";
    const isPinnedRight = isPinned === "right";

    if (!isPinned) {
      return {
        width: column.getSize(),
        minWidth: column.getSize(),
        zIndex: isDraggingColumn ? 1 : "auto",
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
      zIndex: isDraggingColumn ? 30 : 40,
    };
  };

  const HeaderShadowEffect = ({ pinSide }) => {
    const isLeft = pinSide === "left";
    return (
      <div
        className={cn(
          "absolute top-0 bottom-0 transition-opacity duration-200 opacity-70 group-hover:opacity-100",
          isDraggingColumn && "opacity-0"
        )}
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
    onExpandedChange: setExpanded,
    onColumnPinningChange: setColumnPinning,
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
    onColumnResizeStart: handleColumnSizingStart,
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

  const tableResizingClass = isResizing ? "table-resizing" : "";

  return (
    <TableProvider table={table}>
      <div className={`flex flex-col gap-2 p-2 ${tableResizingClass}`}>
        <TopPanel
          table={table}
          enableFilters={enableFilters}
          setEnableFilters={setEnableFilters}
          globalFilter={globalFilter}
          setGlobalFilter={setGlobalFilter}
          fetchData={fetchData}
          isTrash={isTrash}
          setIsTrash={setIsTrash}
          editAll={editAll}
          setEditAll={setEditAll}
          setEditingRows={setEditingRows}
          editedItems={editedItems}
          setEditedItems={setEditedItems}
          isTableImport={isTableImport}
          setRowSelection={setRowSelection}
        />
        <StatusBarFilter
          enableFilters={enableFilters}
          setColumnFilters={setColumnFilters}
          data={data}
        />
        <div className="relative overflow-auto">
          <Toolbar
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            setRowSelection={setRowSelection}
            table={table}
            fetchData={fetchData}
            isTrash={isTrash}
            isTableImport={isTableImport}
          />

          <DndContext
            sensors={columnSensors}
            collisionDetection={closestCenter}
            onDragStart={handleColumnDragStart}
            onDragEnd={handleColumnDragEnd}
            modifiers={[restrictToHorizontalAxis]}
            autoScroll={{
              enabled: true,
              threshold: {
                x: 0.2, // 20% מהרוחב
                y: 0.15, // 15% מהגובה - יותר רגיש
              },
              acceleration: 10, // מהירות גלילה
              interval: 5, // רענון כל 5ms לחלקות מקסימלית
            }}
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
                className={cn(
                  "resizable-table",
                  isDraggingColumn && [
                    "select-none cursor-grabbing",
                    "[&_.dragging-header]:!z-[9999]",
                    "[&_.dragging-header]:!opacity-100",
                  ]
                )}
              >
                <TableHeader
                  className={cn(
                    "sticky top-0",
                    isDraggingColumn ? "z-[35]" : "z-[39]"
                  )}
                >
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                        const isHeaderResizing = header.column.getIsResizing();
                        const isActiveColumn =
                          activeColumn === header.column.id;

                        return (
                          <TableHead
                            key={header.id}
                            colSpan={header.colSpan}
                            style={{
                              ...getCommonPinningStyles(header.column),
                              top: 0,
                              ...(isActiveColumn && {
                                opacity: 0.3,
                                pointerEvents: "none",
                              }),
                            }}
                            className={cn(
                              "px-4 py-2 group table-head-cell relative",
                              isHeaderResizing && "is-resizing",
                              isDraggingColumn && "transition-none",
                              isDraggingColumn && "!z-10"
                            )}
                          >
                            {header.column.getIsPinned() === "left" &&
                              header.column.getIsLastColumn("left") && (
                                <HeaderShadowEffect pinSide="left" />
                              )}
                            {header.column.getIsPinned() === "right" &&
                              header.column.getIsFirstColumn("right") && (
                                <HeaderShadowEffect pinSide="right" />
                              )}

                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}

                            <div
                              className={cn(
                                "absolute top-0 h-full w-4 select-none touch-none !rounded-full",
                                isRTL ? "left-0" : "right-0",
                                isHeaderResizing
                                  ? "bg-fuchsia-600/80 opacity-70 !w-2"
                                  : "opacity-0 group-hover:opacity-50 bg-slate-800 bg-opacity-50 hover:bg-opacity-80 dark:bg-slate-100 w-1 hover:w-2",
                                "transition-all duration-200 ease-in-out",
                                isDraggingColumn && "!opacity-0"
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
                      {!editAll && (
                        <TableHead
                          style={{
                            position: "sticky",
                            top: 0,
                            [isRTL ? "left" : "right"]: 0,
                            zIndex: 42,
                          }}
                          className={cn(
                            "!z-50 !min-h-10 w-full group flex items-center justify-center",
                            "dark:bg-slate-900"
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
                    <DndContext
                      sensors={rowSensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleRowDragEnd}
                      modifiers={[restrictToVerticalAxis]}
                    >
                      <SortableContext
                        items={dataIds}
                        strategy={verticalListSortingStrategy}
                      >
                        {table.getRowModel().rows.map((row) => (
                          <SortableRow
                            key={row.id}
                            row={row}
                            isEditing={editingRows.has(row.id)}
                            toggleEdit={toggleEdit}
                            fetchData={fetchData}
                            editAll={editAll}
                            editedItems={editedItems}
                            setData={setData}
                            setEditedItems={setEditedItems}
                            isTrash={isTrash}
                            isTableImport={isTableImport}
                            isRTL={isRTL}
                            isDark={isDark}
                            data={data}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  ) : (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                      <div className="flex items-center gap-4 text-left bg-white dark:bg-slate-800 p-5 rounded-lg shadow-md border-l-4 border-l-slate-600 dark:border-l-slate-400">
                        <div className="flex-shrink-0 w-12 h-12 bg-slate-600/10 dark:bg-slate-400/10 rounded-full flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-slate-600 dark:text-slate-400"
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
                            {__("No products found", "whizmanage")}
                          </h3>
                          <p className="text-gray-500 dark:text-gray-400 text-sm">
                            {__("Try changing the date range or filters", "whizmanage")}
                          </p>
                        </div>
                        <Button
                          onClick={() => {
                            setGlobalFilter("");
                            setColumnFilters([]);
                          }}
                          className=""
                          variant="gradient"
                        >
                          {__("Reset Filters", "whizmanage")}
                        </Button>
                      </div>
                    </div>
                  )}
                </TableBody>
              </Table>
            </SortableContext>

            <DragOverlay
              style={{ zIndex: 99999 }}
              dropAnimation={{
                duration: 200,
                easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
                // הוספת קונפיגורציה לביצועים
                // keyframes: [
                //   { transform: "scale(1.02)", opacity: 0.9 },
                //   { transform: "scale(1)", opacity: 1 },
                // ],
              }}
              modifiers={[
                // modifier שמבטיח שהאלמנט נשאר בגבולות המסך
                (args) => {
                  const { transform } = args;
                  return {
                    ...transform,
                    scaleX: 1,
                    scaleY: 1,
                  };
                },
              ]}
              className="drag-overlay"
            >
              {activeColumn ? (
                <div className="flex items-center space-x-2 rtl:space-x-reverse select-none bg-slate-200 dark:bg-slate-800 rounded-lg shadow-2xl border-1 border-slate-300 dark:border-slate-600 px-2 py-1 font-semibold text-slate-800 dark:text-slate-100 backdrop-blur-sm cursor-grabbing">
                  <GripVertical className="h-4 w-4" />



                  {table
                    .getAllLeafColumns()
                    .find((col) => col.id === activeColumn)?.columnDef
                    ?.header &&
                    __(typeof table
                      .getAllLeafColumns()
                      .find((col) => col.id === activeColumn)?.columnDef
                      ?.header === "function"
                      ? activeColumn
                      : table
                        .getAllLeafColumns()
                        .find((col) => col.id === activeColumn)?.columnDef
                        ?.header, "whizmanage")}
                </div>
              ) : null}
            </DragOverlay>
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
