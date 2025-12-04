import CustomTooltip from "@components/nextUI/Tooltip";
import { Input } from "@components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import { GripVertical, Trash2Icon } from "lucide-react";
import { IoIosSearch } from "react-icons/io";

import { __ } from '@wordpress/i18n';
import InventoryEdit from "../../../table/edit/InventoryEdit";
import ImageEdit from "../../../table/edit/Image/ImageEdit";
import VariationNameEdit from "./VariationNameEdit";
import RichEditorModal from "@/layout/editor/RichEditorModal";
import DownloadableEdit from "../../../table/edit/DownloadableEdit";

// Import DnD-kit components
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

// Import SortableItem component
import { SortableItem } from "./SortableItem";
import { useCallback, useEffect, useState } from "react";

const columns = [
  { name: "Sort", uid: "sort" },
  { name: "Image", uid: "image" },
  { name: "Name", uid: "name", sortable: true },
  { name: "Price", uid: "price", sortable: true },
  { name: "Sale", uid: "sale", sortable: true },
  { name: "SKU", uid: "sku", sortable: true },
  { name: "Description", uid: "description", sortable: true },
  { name: "Inventory", uid: "inventory", sortable: true },
  { name: "Downloadable", uid: "downloadable" },
  { name: "Actions", uid: "actions" },
];

const INITIAL_VISIBLE_COLUMNS = [
  "sort",
  "image",
  "name",
  "price",
  "sale",
  "sku",
  "description",
  "inventory",
  "downloadable",
  "actions",
];

export default function VariationsTable({
  ProductRow,
  selectedAttributes,
  setSelectedAttributes,
  variations,
  setVariations,
  updatedTable,
  allAttributes,
  setUpdatedTable,
  setUpdatedVariations,
  setDeletedVariations,
  deletedVariations,
}) {
  useEffect(() => { }, [variations]);
  const [filterValue, setFilterValue] = useState("");
  const [visibleColumns, setVisibleColumns] = useState(
    new Set(INITIAL_VISIBLE_COLUMNS)
  );
  const [sortDescriptor, setSortDescriptor] = useState({
    column: "menu_order",
    direction: "ascending",
  });

  const [refreshKey, setRefreshKey] = useState(0);
  const [activeId, setActiveId] = useState(null);
  const [activeDraggedRow, setActiveDraggedRow] = useState(null);

  const refreshTable = () => {
    setRefreshKey((prev) => prev + 1);
  };

  useEffect(() => {
    refreshTable();
  }, [allAttributes]);

  const [page, setPage] = useState(1);
  const rowsPerPage = 4;
  const hasSearchFilter = Boolean(filterValue);
   
  
  // Initialize sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Minimum drag distance before activation
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Make sure all variations have menu_order initialized
  useEffect(() => {
    if (variations && variations.length > 0) {
      // Check if any variation is missing menu_order
      const needsMenuOrder = variations.some(item => !item.original.menu_order);
      
      if (needsMenuOrder) {
        // Initialize menu_order based on current position in array
        const updatedVariations = variations.map((item, index) => ({
          ...item,
          original: {
            ...item.original,
            menu_order: index + 1,
          }
        }));
        
        setVariations(updatedVariations);
      }
    }
  }, []);

  // Handle drag start
  const handleDragStart = (event) => {
    const { active } = event;
    setActiveId(active.id);
    
    // Find the row that's being dragged
    const draggedRow = variations.find(item => item.id === active.id);
    setActiveDraggedRow(draggedRow);
  };

  // Handle drag end event
  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    setActiveId(null);
    setActiveDraggedRow(null);
    
    if (active.id !== over?.id) {
      setVariations((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);
        
        if (newIndex === -1) return items; // If over is null or not found
        
        // Create a new array with the updated order
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Update menu_order for all items based on their new positions
        const updatedItems = newItems.map((item, index) => {
          // Only mark for update if the menu_order has changed
          if (item.original.menu_order !== index + 1) {
            const updatedItem = {
              ...item,
              original: {
                ...item.original,
                menu_order: index + 1,
              },
            };
            
            // Flag the item for updating when saving if it already exists in DB
            if (item.original.date_modified) {
              setUpdatedVariations((prev) => {
                if (prev.some((prevItem) => prevItem.id === item.id)) {
                  return prev.map((prevItem) => 
                    prevItem.id === item.id 
                      ? updatedItem
                      : prevItem
                  );
                }
                return [...prev, updatedItem];
              });
            }
            
            return updatedItem;
          }
          return item;
        });
        
        return updatedItems;
      });
      
      // Set updated table to trigger a re-render
      setUpdatedTable(!updatedTable);
    }
  };

  // Override the sort change handler to also update menu_order
  const handleSortChange = (newDescriptor) => {
    // Update the sort descriptor state
    setSortDescriptor(newDescriptor);
    
    console.log("Sort changed:", newDescriptor);
    
    // Always update menu_order based on the new sort, regardless of which column
    // This ensures that menu_order is always consistent with displayed order
    const itemsToSort = [...variations];
    
    // Sort according to the selected column and direction
    const sortedItems = itemsToSort.sort((a, b) => {
      // For special columns that might need custom comparison logic
      if (newDescriptor.column === "name") {
        // For name column, we'll sort by the combined attribute options
        const aName = a.original.name || "";
        const bName = b.original.name || "";
        const cmp = aName.localeCompare(bName);
        return newDescriptor.direction === "descending" ? -cmp : cmp;
      } else {
        // For other columns, standard comparison
        const first = a.original[newDescriptor.column];
        const second = b.original[newDescriptor.column];
        
        // Handle null/undefined values
        if (first == null && second == null) return 0;
        if (first == null) return newDescriptor.direction === "descending" ? 1 : -1;
        if (second == null) return newDescriptor.direction === "descending" ? -1 : 1;
        
        // Handle number comparison
        if (typeof first === 'number' && typeof second === 'number') {
          return newDescriptor.direction === "descending" ? second - first : first - second;
        }
        
        // Handle string comparison
        if (typeof first === 'string' && typeof second === 'string') {
          const cmp = first.localeCompare(second);
          return newDescriptor.direction === "descending" ? -cmp : cmp;
        }
        
        // Fallback comparison
        const cmp = first < second ? -1 : first > second ? 1 : 0;
        return newDescriptor.direction === "descending" ? -cmp : cmp;
      }
    });

    // Update menu_order for all items based on their new sorted positions
    const updatedItems = sortedItems.map((item, index) => {
      const newMenuOrder = index + 1;
      // Only update if menu_order has changed
      if (item.original.menu_order !== newMenuOrder) {
        const updatedItem = {
          ...item,
          original: {
            ...item.original,
            menu_order: newMenuOrder,
          },
        };
        
        // Flag for updating when saving
        if (item.original.date_modified) {
          setUpdatedVariations((prev) => {
            // Check if the item already exists in updated variations
            if (prev.some((prevItem) => prevItem.id === item.id)) {
              return prev.map((prevItem) => 
                prevItem.id === item.id 
                  ? updatedItem
                  : prevItem
              );
            }
            
            // Add to updated variations
            return [...prev, updatedItem];
          });
        }
        
        return updatedItem;
      }
      
      return item;
    });
    
    // Update the variations with the new order
    setVariations(updatedItems);
    setUpdatedTable(!updatedTable);
  };

  const handleDelete = (row) => {
    if (row && row.original && row.original.date_modified) {
      setDeletedVariations((prev) => [...prev, row.original]);
    } else {
      console.error("Attempted to delete an invalid or incomplete row:", row);
    }
    setVariations((currentData) =>
      currentData.filter((item) => item.id !== row.id)
    );
    setUpdatedTable(!updatedTable);
  };
  
  const pages = Math.ceil(variations.length / rowsPerPage);

  const items = React.useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return variations.slice(start, end);
  }, [page, variations]);

  const headerColumns = React.useMemo(() => {
    if (visibleColumns === "all") return columns;
    return columns.filter((column) =>
      Array.from(visibleColumns).includes(column.uid)
    );
  }, [visibleColumns]);

  const filteredItems = React.useMemo(() => {
    let filteredData = [...variations];
    if (hasSearchFilter) {
      filteredData = filteredData.filter((item) =>
        item.original.name.toLowerCase().includes(filterValue.toLowerCase())
      );
    }
    return filteredData;
  }, [variations, filterValue]);

  const sortedItems = React.useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      // If sorting by menu_order explicitly (for drag operations)
      if (sortDescriptor.column === "menu_order") {
        const aOrder = a.original.menu_order || 0;
        const bOrder = b.original.menu_order || 0;
        return sortDescriptor.direction === "descending" 
          ? bOrder - aOrder 
          : aOrder - bOrder;
      }
      
      // Handle special columns
      if (sortDescriptor.column === "name") {
        // For name column, sort by the combined attribute options
        const aName = a.original.name || "";
        const bName = b.original.name || "";
        const cmp = aName.localeCompare(bName);
        return sortDescriptor.direction === "descending" ? -cmp : cmp;
      }
      
      // Standard column sorting
      const first = a.original[sortDescriptor.column];
      const second = b.original[sortDescriptor.column];
      
      // Handle null/undefined values
      if (first == null && second == null) return 0;
      if (first == null) return sortDescriptor.direction === "descending" ? 1 : -1;
      if (second == null) return sortDescriptor.direction === "descending" ? -1 : 1;
      
      // Handle number comparison
      if (typeof first === 'number' && typeof second === 'number') {
        return sortDescriptor.direction === "descending" ? second - first : first - second;
      }
      
      // Handle string comparison
      if (typeof first === 'string' && typeof second === 'string') {
        const cmp = first.localeCompare(second);
        return sortDescriptor.direction === "descending" ? -cmp : cmp;
      }
      
      // Fallback comparison
      const cmp = first < second ? -1 : first > second ? 1 : 0;
      return sortDescriptor.direction === "descending" ? -cmp : cmp;
    });
  }, [filteredItems, sortDescriptor]);

  const renderCell = useCallback(
    (row, columnKey) => {
      const cellValue = row.original[columnKey];
      switch (columnKey) {
        case "image":
          return <ImageEdit row={row} />;
        case "name":
          return (
            <div className="flex gap-2 items-center">
              {allAttributes.map((attribute, i) => (
                <VariationNameEdit
                  key={i}
                  i={i}
                  row={row}
                  selectedAttributes={selectedAttributes}
                  attribute={attribute}
                />
              ))}
            </div>
          );
        case "sku":
          return (
            <div className="relative h-8 w-20 rounded-md border border-input bg-background dark:bg-slate-700 py-1 text-sm overflow-hidden">
              <Input
                onChange={(e) => {
                  row.original.sku = e.target.value;
                }}
                defaultValue={row?.original?.sku || ""}
                className="h-full w-full !border-none !rounded-none !border-0 !ring-0 !outline-none px-1 focus-visible:dark:!ring-offset-0 placeholder:text-slate-300 dark:placeholder:text-slate-500"
                onFocus={(event) => event.target.select()}
              />
            </div>
          );
        case "price":
          return (
            <div className="relative h-8 w-20 rounded-md border border-input bg-background dark:bg-slate-700 pl-4 rtl:pr-4 rtl:pl-0 py-1 text-sm overflow-hidden">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2 rtl:pr-2 rtl:pl-0 h-full">
                <span
                  className="text-gray-400 sm:text-sm"
                  dangerouslySetInnerHTML={{ __html: window.currency }}
                />
              </div>
              <Input
                onChange={(e) => {
                  row.original.regular_price = e.target.value;
                }}
                defaultValue={row?.original?.regular_price}
                placeholder={__("No price", "whizmanage")}
                className="h-full w-full focus-visible:dark:!ring-offset-0 !border-none !rounded-none !border-0 !ring-0 !outline-none px-1 placeholder:text-slate-300 dark:placeholder:text-slate-500"
                onFocus={(event) => event.target.select()}
              />
            </div>
          );
        case "sale":
          return (
            <div className="relative h-8 w-20 rounded-md border border-input bg-background dark:bg-slate-700 pl-4 rtl:pr-4 rtl:pl-0 py-1 text-sm ring-offset-background overflow-hidden">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2 rtl:pr-2 rtl:pl-0 h-full">
                <span
                  className="text-gray-400 sm:text-sm"
                  dangerouslySetInnerHTML={{ __html: window.currency }}
                />
              </div>
              <Input
                onChange={(e) => {
                  row.original.sale_price = e.target.value;
                }}
                defaultValue={row?.original?.sale_price}
                placeholder={__("No price", "whizmanage")}
                className="h-full w-full focus-visible:dark:!ring-offset-0 !border-none !rounded-none !border-0 !ring-0 !outline-none px-1 placeholder:text-slate-300 dark:placeholder:text-slate-500"
                onFocus={(event) => event.target.select()}
              />
            </div>
          );
        case "description":
          return <RichEditorModal row={row.original} title={"description"} />;
        case "inventory":
          return <InventoryEdit row={row} />;
        case "downloadable":
          return <DownloadableEdit row={row} />;
        case "actions":
          return (
            <div className="relative flex items-center gap-2">
              <CustomTooltip title={__("Delete variation", "whizmanage")}>
                <span
                  className="text-lg text-default-400 cursor-pointer active:opacity-50 text-fuchsia-600 hover:text-slate-500 flex justify-end"
                  onClick={() => handleDelete(row)}
                >
                  <Trash2Icon className="w-4 h-4" />
                </span>
              </CustomTooltip>
            </div>
          );
        default:
          return cellValue;
      }
    }, [allAttributes]);
    
  const onClear = React.useCallback(() => {
    setFilterValue("");
    setPage(1);
  }, []);

  const onSearchChange = React.useCallback((value) => {
    if (value) {
      setFilterValue(value);
      setPage(1);
    } else {
      setFilterValue("");
    }
  }, []);

  const topContent = React.useMemo(() => {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-center gap-3 items-end">
          <div className="relative h-10 w-60 border rounded-lg flex gap-1 items-center px-1 dark:bg-slate-700">
            <IoIosSearch className="w-6 h-6 text-gray-500" />
            <Input
              placeholder={__("Search variation...", "whizmanage")}
              type="search"
              onChange={(event) => onSearchChange(event.target.value)}
              className="!border-none !ring-0 placeholder:text-slate-400 dark:!text-slate-300 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0"
            />
          </div>
        </div>
      </div>
    );
  }, [
    filterValue,
    visibleColumns,
    variations.length,
    onSearchChange,
    hasSearchFilter,
  ]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={sortedItems.map(item => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <Table
          key={refreshKey}
          aria-label="Table of product variations with drag and drop"
          isHeaderSticky
          bottomContentPlacement="outside"
          classNames={{
            wrapper: "max-h-[382px] dark:bg-slate-800 scrollbar-whiz",
            th: "dark:bg-slate-900",
          }}
          sortDescriptor={sortDescriptor}
          onSortChange={handleSortChange}
          topContent={topContent}
        >
          <TableHeader columns={headerColumns}>
            {(column) => (
              <TableColumn
                key={column.uid}
                align={column.uid === "actions" ? "center" : "start"}
                allowsSorting={column.sortable}
              >
                {__(column.name, "whizmanage")}
              </TableColumn>
            )}
          </TableHeader>
          <TableBody emptyContent={__("No variations found", "whizmanage")} items={sortedItems}>
            {(item) => {
              const isActive = activeId === item.id;
              return (
                <TableRow 
                  key={item.id}
                  className={isActive ? "opacity-30 bg-fuchsia-600/5 border-2 border-dashed border-fuchsia-600" : ""}
                  onClick={() => {
                    setUpdatedVariations((prev) => {
                      if (!item.original.date_modified) {
                        return prev;
                      }
                      if (prev.some((prevItem) => prevItem.id === item.id)) {
                        return prev;
                      }
                      return [...prev, item];
                    });
                  }}
                >
                  {(columnKey) => (
                    <TableCell className={isActive ? "bg-fuchsia-600/5" : ""}>
                      {columnKey === "sort" ? (
                        <SortableItem id={item.id}>
                          <div className="cursor-grab active:cursor-grabbing p-1 flex justify-center">
                            <GripVertical className="w-5 h-5 text-gray-400" />
                          </div>
                        </SortableItem>
                      ) : (
                        renderCell(item, columnKey)
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            }}
          </TableBody>
        </Table>
      </SortableContext>
      {/* Drag overlay to show what's being dragged */}
      <DragOverlay adjustScale={true}>
        {activeId && activeDraggedRow && (
          <div className="w-full p-3 bg-fuchsia-600/10 border-2 border-dashed border-fuchsia-600 rounded shadow-lg">
            <div className="flex items-center gap-2">
              <div className="bg-fuchsia-600/20 rounded-full p-1">
                <GripVertical className="w-5 h-5 text-fuchsia-600" />
              </div>
              <span className="font-medium">{activeDraggedRow.original.name || __("Variation", "whizmanage")}</span>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
