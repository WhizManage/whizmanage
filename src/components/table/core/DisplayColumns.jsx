// src/components/table/DisplayColumns.jsx
import { cn } from "@/lib/utils";
import Button from "@components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@components/ui/command";
import { IconBadge } from "@components/ui/custom/IconBadge";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "@/lib/utils";
import { CheckIcon, Columns, GripVertical, EyeOff } from "lucide-react";
 import { __ } from "@wordpress/i18n";
import { useEffect, useMemo, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";

export function DisplayColumns({ table, useTableStore, tableConfig }) {
   

  const {
    columnOrder,
    columnVisibility,
    setColumnOrder,
    setColumnVisibility,
    resetConfiguration,
  } = useTableStore(
    useShallow((s) => ({
      columnOrder: s.columnOrder,
      columnVisibility: s.columnVisibility,
      setColumnOrder: s.setColumnOrder,
      setColumnVisibility: s.setColumnVisibility,
      resetConfiguration: s.resetConfiguration,
    }))
  );

  // קבלת כל העמודות מהטבלה (ללא actions)
  const allTableColumns = useMemo(() => {
    return table
      .getAllLeafColumns()
      .filter((c) => !["actions", "row-actions"].includes(c.id));
  }, [table]);

  // סנכרון ראשוני של columnOrder
  useEffect(() => {
    const columnIds = allTableColumns.map((c) => c.id);
    let newOrder = Array.isArray(columnOrder) ? [...columnOrder] : [];

    newOrder = newOrder.filter(
      (id) => 
        id === "actions" || 
        id === "row-actions" || 
        columnIds.includes(id)
    );

    if (!newOrder.includes("actions")) {
      newOrder = ["actions", ...newOrder];
    }
    if (!newOrder.includes("row-actions")) {
      newOrder = [...newOrder, "row-actions"];
    }

    const missingColumns = columnIds.filter((id) => !newOrder.includes(id));
    if (missingColumns.length > 0) {
      const rowActionsIndex = newOrder.indexOf("row-actions");
      newOrder = [
        ...newOrder.slice(0, rowActionsIndex),
        ...missingColumns,
        ...newOrder.slice(rowActionsIndex),
      ];
    }

    const hasChanged =
      newOrder.length !== columnOrder.length ||
      newOrder.some((id, i) => id !== columnOrder[i]);

    if (hasChanged) {
      setColumnOrder(newOrder);
    }
  }, [allTableColumns, columnOrder, setColumnOrder]);

  // סנכרון ראשוני של columnVisibility
  useEffect(() => {
    const newVisibility = { ...columnVisibility };
    let hasChanged = false;

    allTableColumns.forEach((col) => {
      if (newVisibility[col.id] === undefined) {
        newVisibility[col.id] = true;
        hasChanged = true;
      }
    });

    if (newVisibility["actions"] !== true) {
      newVisibility["actions"] = true;
      hasChanged = true;
    }
    if (newVisibility["row-actions"] !== true) {
      newVisibility["row-actions"] = true;
      hasChanged = true;
    }

    if (hasChanged) {
      setColumnVisibility(newVisibility);
    }
  }, [allTableColumns, columnVisibility, setColumnVisibility]);

const getColumnDisplayName = useCallback(
  (columnId) => {
    if (!columnId) return "";
    const col = allTableColumns.find((c) => c.id === columnId);
    const header = col?.columnDef?.header;
    const meta = col?.columnDef?.meta;

    // 1) אם header הוא מחרוזת – זה השם המדויק כבר (כולל תרגום)
    if (typeof header === "string" && header.trim()) {
      return header;
    }

    // 2) אם שמנו שם ידידותי במטה
    if (typeof meta?.displayName === "string" && meta.displayName.trim()) {
      return __(meta.displayName, "whizmanage");
    }
    if (typeof meta?.editOptions?.label === "string" && meta.editOptions.label.trim()) {
      return __(meta.editOptions.label, "whizmanage");
    }

    // 3) נסה להביא label מהטקסונומיות הגלובליות (כולל pa_color וכד')
    const tax =
      typeof window !== "undefined"
        ? window.listTaxonomies?.find((x) => x?.name === columnId)
        : null;
    if (tax?.label) {
      return __(tax.label, "whizmanage");
    }

    // 4) נפילה אחורה: הפורמטינג הישן, עם הסרה של prefix pa_
    const parts = columnId.replace(/^pa_/, "").split("_");
    const formatted = parts
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

    return __(formatted, "whizmanage");
  },
  [__, allTableColumns]
);

  // עמודות ממוינות לפי columnOrder
  const sortedColumns = useMemo(() => {
    return columnOrder
      .map((colId) => allTableColumns.find((c) => c.id === colId))
      .filter((col) => col !== undefined);
  }, [columnOrder, allTableColumns]);

  // חלוקה לעמודות מוצגות ומוסתרות
  const { visibleColumns, hiddenColumns } = useMemo(() => {
    const visible = [];
    const hidden = [];

    sortedColumns.forEach((column) => {
      if (columnVisibility[column.id] !== false) {
        visible.push(column);
      } else {
        hidden.push(column);
      }
    });

    return { visibleColumns: visible, hiddenColumns: hidden };
  }, [sortedColumns, columnVisibility]);

  const visibleCount = useMemo(() => {
    return allTableColumns.filter((col) => columnVisibility[col.id] !== false)
      .length;
  }, [allTableColumns, columnVisibility]);

  const allVisible = useMemo(() => {
    return allTableColumns.every((col) => columnVisibility[col.id] !== false);
  }, [allTableColumns, columnVisibility]);

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      
      if (!active || !over || active.id === over.id) {
        return;
      }

      if (
        ["actions", "row-actions"].includes(active.id) ||
        ["actions", "row-actions"].includes(over.id) ||
        columnVisibility[active.id] === false ||
        columnVisibility[over.id] === false
      ) {
        return;
      }

      const oldIndex = columnOrder.indexOf(active.id);
      const newIndex = columnOrder.indexOf(over.id);

      if (oldIndex === -1 || newIndex === -1) {
        return;
      }

      let newOrder = arrayMove([...columnOrder], oldIndex, newIndex);
      newOrder = newOrder.filter(
        (id) => id !== "actions" && id !== "row-actions"
      );
      newOrder = ["actions", ...newOrder, "row-actions"];

      setColumnOrder(newOrder);
    },
    [columnOrder, columnVisibility, setColumnOrder]
  );

  const toggleColumn = useCallback(
    (columnId) => {
      setColumnVisibility((prev) => ({
        ...prev,
        [columnId]: !prev[columnId],
      }));
    },
    [setColumnVisibility]
  );

  const toggleAllColumns = useCallback(() => {
    const newVisibility = { ...columnVisibility };
    const shouldHide = allVisible;

    allTableColumns.forEach((col) => {
      newVisibility[col.id] = !shouldHide;
    });

    newVisibility["actions"] = true;
    newVisibility["row-actions"] = true;

    setColumnVisibility(newVisibility);
  }, [allTableColumns, allVisible, columnVisibility, setColumnVisibility]);

  const handleReset = useCallback(async () => {
    if (
      window.confirm(
        __(
          "Are you sure you want to reset all table settings to default?",
          "whizmanage"
        )
      )
    ) {
      const success = await resetConfiguration();
      if (success) {
        toast.success(__("Table settings reset to default", "whizmanage"));
      } else {
        toast.error(__("Failed to reset table settings", "whizmanage"));
      }
    }
  }, [__, resetConfiguration]);

  return (
    <Command className="p-4 pb-0.5 dark:!bg-slate-800">
      <div className="pb-3 flex items-center gap-3">
        <IconBadge icon={Columns} variant="default" size="default" />
        <div>
          <h3 className="text-base font-semibold dark:text-slate-300">
            {__("Display columns", "whizmanage")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {visibleCount}/{allTableColumns.length} {__("visible", "whizmanage")}
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="text-slate-500 dark:text-slate-300 mb-2 w-full"
        onClick={handleReset}
      >
        {__("Reset Table Settings", "whizmanage")}
      </Button>
      <CommandInput
        placeholder={__("Find column to show/hide", "whizmanage")}
        className="!border-none !ring-0"
      />
      <CommandList className="scrollbar-whiz max-h-[300px]">
        <CommandEmpty>{__("No results found.", "whizmanage")}</CommandEmpty>

        <CommandGroup heading={__("All columns", "whizmanage")}>
          <CommandItem
            className="cursor-pointer"
            onSelect={toggleAllColumns}
          >
            <div
              className={cn(
                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-fuchsia-600",
                allVisible
                  ? "bg-fuchsia-600 text-white"
                  : "opacity-50 bg-white dark:bg-slate-800"
              )}
            >
              <CheckIcon
                className={cn("h-4 w-4", !allVisible && "invisible")}
              />
            </div>
            <span className="pr-2">
              {allVisible ? __("Hide All Columns", "whizmanage") : __("Show All Columns", "whizmanage")}
            </span>
            <span className="ml-auto text-muted-foreground">
              {visibleCount} {__("Selected", "whizmanage")}
            </span>
          </CommandItem>
        </CommandGroup>

        {visibleColumns.length > 0 && (
          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={visibleColumns.map((col) => col.id)}
              strategy={verticalListSortingStrategy}
            >
              <CommandGroup heading={__("Visible columns", "whizmanage")}>
                {visibleColumns.map((column) => (
                  <SortableColumn
                    key={column.id}
                    column={column}
                    isVisible={true}
                    onToggle={() => toggleColumn(column.id)}
                    displayName={getColumnDisplayName(column.id)}
                  />
                ))}
              </CommandGroup>
            </SortableContext>
          </DndContext>
        )}

        {hiddenColumns.length > 0 && (
          <CommandGroup heading={__("Hidden columns", "whizmanage")}>
            {hiddenColumns.map((column) => (
              <CommandItem
                key={column.id}
                className="flex items-center p-2 opacity-60 cursor-pointer"
                onSelect={() => toggleColumn(column.id)}
              >
                <div className="flex items-center flex-grow">
                  <div className="mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-slate-400 bg-white dark:bg-slate-800">
                    <CheckIcon className="h-4 w-4 invisible" />
                  </div>
                  <span className="pr-2">
                    {getColumnDisplayName(column.id)}
                  </span>
                </div>
                <EyeOff className="ml-auto size-4 text-muted-foreground" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );
}

function SortableColumn({ column, isVisible, onToggle, displayName }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({
      id: column.id,
    });

  const style = useMemo(
    () => ({
      transform: CSS.Translate.toString(transform),
      opacity: isDragging ? 0.5 : 1,
    }),
    [transform, isDragging]
  );

  return (
    <CommandItem
      ref={setNodeRef}
      style={style}
      className="flex items-center p-2 group cursor-pointer"
      onSelect={onToggle}
      value={displayName}
    >
      <div className="flex items-center flex-grow">
        <div
          className={cn(
            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-fuchsia-600",
            isVisible
              ? "bg-fuchsia-600 text-white"
              : "opacity-50 bg-white dark:bg-slate-800"
          )}
        >
          <CheckIcon className={cn("h-4 w-4", !isVisible && "invisible")} />
        </div>
        <span className="pr-2">{displayName}</span>
      </div>
      <GripVertical
        className="ml-auto cursor-grab size-5 hidden group-hover:block text-muted-foreground hover:text-fuchsia-600"
        {...attributes}
        {...listeners}
      />
    </CommandItem>
  );
}