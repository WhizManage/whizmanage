import { cn } from "@/lib/utils";
import { Button } from "@components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@components/ui/command";
import {
  ClosePopover,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/ui/popover-portal";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { EyeNoneIcon } from "@radix-ui/react-icons";
import { CheckIcon, GripVertical } from "lucide-react";
import { useEffect, useState } from "react";
import { __ } from '@wordpress/i18n';
import { toast } from "sonner";
import { putApi } from "/src/services/services";
import { initialColumnOrder, initialColumnSizing, initialReservedData } from "../../page";
import { confirm } from "@components/CustomConfirm";

function DisplayColumns({ table, plusButton, metaData, allMetaData }) {
   
  const [columnOrder, setColumnOrder] = useState(table.getState().columnOrder);
  const allCustomFields = allMetaData;
  const unselectableColumns = [
    "select",
    "expand",
    "shipping_phone",
    "shipping_name",
    "shipping_company",
    "shipping_country",
    "shipping_city",
    "shipping_postcode",
    "shipping_address_1",
    "shipping_address_2",
    "shipping_state",
    "billing_email",
    "billing_state",
    "billing_phone",
    "billing_name",
    "billing_company",
    "billing_country",
    "billing_city",
    "billing_postcode",
    "billing_address_1",
    "billing_address_2",
  ];

  const handleUpdateView = async () => {
    const columnsVisibility = {};
    table.getState().columnOrder.forEach((columnId) => {
      const column = table.getColumn(columnId);
      if (column) {
        columnsVisibility[column.id] = column.getIsVisible();
      }
    });

    table.getAllColumns().forEach((column) => {
      if (!(column.id in columnsVisibility)) {
        columnsVisibility[column.id] = column.getIsVisible();
      }
    });

    const msg = { name: "orders_visible_columns", reservedData: columnsVisibility };
    const url = window.siteUrl + "/wp-json/whizmanage/v1/columns/" + msg.name;

    try {
      await putApi(url, msg);
      toast(
        <div className="p-4 w-full h-full !border-l-4 !border-l-fuchsia-600 dark:bg-slate-800 dark:text-slate-300 rounded-md flex gap-4 items-center justify-start">
          <CheckIcon className="w-5 h-5 text-fuchsia-600" />
          {__("New view has been saved successfully", "whizmanage")}
        </div>,
        { duration: 5000 }
      );
    } catch (error) {
      console.error("Error:", error);
    }
  };

  useEffect(() => {
    setColumnOrder(table.getState().columnOrder);
  }, [table]);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      const oldIndex = columnOrder.indexOf(active.id);
      const newIndex = columnOrder.indexOf(over.id);
      const newOrder = arrayMove(columnOrder, oldIndex, newIndex);
      setColumnOrder(newOrder);
      table.setColumnOrder(newOrder);

      // Get the updated column order after setColumnOrder
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

  const metaDataColumns = table
    .getAllColumns()
    .filter((column) =>
      allCustomFields?.some((item) => item.key === column.id)
    );

  const allColumnsSelected = metaData
    ? metaDataColumns.every((column) => column.getIsVisible())
    : table.getIsAllColumnsVisible();

  const toggleAllColumns = () => {
    if (metaData) {
      metaDataColumns
        .filter(column => !["select", "expand"].includes(column.id))
        .forEach(column => {
          column.toggleVisibility(!allColumnsSelected);
        });
    } else {
      table.getAllLeafColumns()
        .filter(column => !["select", "expand"].includes(column.id))
        .forEach(column => {
          column.toggleVisibility(!allColumnsSelected);
        });
    }
  };

  const resetOrdersTable = async () => {

    const isConfirmed = await confirm({
      title: __("Reset Table", "whizmanage"),
      message: __("Are you sure you want to reset the table?", "whizmanage"),
      confirmText: __("Yes", "whizmanage"),
      cancelText: __("No", "whizmanage"),
    });

    if (isConfirmed) {
      const widthMsg = { name: "orders_columns_width", reservedData: initialColumnSizing };
      const widthUrl = window.siteUrl + "/wp-json/whizmanage/v1/columns/" + widthMsg.name;

      const orderMsg = { name: "orders_columns_order", reservedData: initialColumnOrder };
      const orderUrl = window.siteUrl + "/wp-json/whizmanage/v1/columns/" + orderMsg.name;

      const visibleColumnsMsg = { name: "orders_visible_columns", reservedData: initialReservedData };
      const visibleColumnsUrl = window.siteUrl + "/wp-json/whizmanage/v1/columns/" + visibleColumnsMsg.name;
      const pinnedColumnsMsg = { name: "orders_pinned_columns", reservedData: { left: ["select", "expand"], right: [] } }
      const pinnedColumnsUrl = window.siteUrl + "/wp-json/whizmanage/v1/columns/" + pinnedColumnsMsg.name;

      try {
        table.setColumnOrder(initialColumnOrder);
        table.setColumnVisibility(initialReservedData);
        table.setColumnSizing(initialColumnSizing);
        table.setColumnPinning({ left: ["select", "expand"], right: [] });

        window.getWhizmanage = (window.getWhizmanage || []).map(c => c.name === "orders_pinned_columns" ? { ...c, reservedData: pinnedColumnsMsg.reservedData } : c);

        await putApi(widthUrl, widthMsg);
        await putApi(orderUrl, orderMsg);
        await putApi(visibleColumnsUrl, visibleColumnsMsg);
        await putApi(pinnedColumnsUrl, pinnedColumnsMsg);

        toast(
          <div className="p-4 w-full h-full !border-l-4 !border-l-fuchsia-600 dark:bg-slate-800 dark:text-slate-300 rounded-md flex gap-4 items-center justify-start">
            <CheckIcon className="w-5 h-5 text-fuchsia-600" />
            {__("The table was reset successfully", "whizmanage")}
          </div>,
          { duration: 5000 }
        );
      } catch (error) {
        console.error(error);
      }
    }
  }

  const capitalFirstLetter = (nameColumns) => {
    const parts = nameColumns.spli__("_");
    const newString = parts
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

    return __(newString, "whizmanage");
  };

  const visibleColumnsCount = metaData
    ? metaDataColumns.filter((column) => column.getIsVisible()).length
    : table.getVisibleFlatColumns().length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        {plusButton ? (
          <Button
            variant="ghost"
            size="sm"
            className="size-8 mt-0 rtl:mt-2 ml-1 mr-0 flex items-center justify-center data-[state=open]:bg-accent text-slate-600 rounded-full hover:bg-slate-500/10 text-2xl pb-1 rtl:mb-0"
          >
            +
          </Button>
        ) : (
          <Button variant="outline" className="flex gap-2">
            <EyeNoneIcon className="h-3.5 w-3.5 max-w-fit" />
            {metaData ? __("Custom fields columns", "whizmanage") : __("Columns", "whizmanage")}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-[320px] max-h-fit overflow-hidden p-0 mr-4 rtl:ml-4 dark:!bg-gray-800"
        align="start"
      >
        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={table.getState().columnOrder}
            strategy={verticalListSortingStrategy}
          >
            <Command className="p-4 pb-0.5 dark:!bg-gray-800">
              <div className="pb-2 flex justify-between items-center">
                <h3 className="text-lg pl-1 dark:text-gray-400">
                  {__("Display columns", "whizmanage")}
                </h3>
                <ClosePopover asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-slate-500 dark:text-slate-400"
                    onPointerDown={handleUpdateView}
                  >
                    {__("Save as default", "whizmanage")}
                  </Button>
                </ClosePopover>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-slate-500 dark:text-slate-400"
                onClick={resetOrdersTable}
              >
                {__("Reset Table", "whizmanage")}
              </Button>
              <CommandInput
                placeholder={__("Find column to show/hide", "whizmanage")}
                className="!border-none !ring-0"
              />
              <CommandList className="scrollbar-whiz">
                <CommandEmpty>{__("No results found.", "whizmanage")}</CommandEmpty>
                <CommandGroup heading={__("All columns", "whizmanage")}>
                  <CommandItem onPointerDown={toggleAllColumns}>
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-fuchsia-600",
                        allColumnsSelected
                          ? "bg-fuchsia-600 text-white"
                          : "opacity-50 [&_svg]:invisible dark:!bg-slate-400"
                      )}
                    >
                      <CheckIcon className={cn("h-4 w-4")} />
                    </div>
                    <span className="pr-2">
                      {allColumnsSelected
                        ? __("Hide All Columns", "whizmanage")
                        : __("Show All Columns", "whizmanage")}
                    </span>
                    <span className="ml-auto rtl:ml-2 rtl:mr-auto text-muted-foreground">
                      {visibleColumnsCount} {__("Selected", "whizmanage")}
                    </span>
                  </CommandItem>
                </CommandGroup>
                <CommandGroup
                  heading={
                    metaData ? __("Custom fields columns", "whizmanage") : __("Item columns", "whizmanage")
                  }
                >
                  {metaData
                    ? metaDataColumns.map((column) => (
                      <SortableColumn
                        key={column.id}
                        column={column}
                        capitalFirstLetter={capitalFirstLetter}
                      />
                    ))
                    : table.getState().columnOrder.filter(c => !unselectableColumns.includes(c)).map((columnId) => {
                      const column = table.getColumn(columnId);
                      return (
                        column && (
                          <SortableColumn
                            key={column.id}
                            column={column}
                            capitalFirstLetter={capitalFirstLetter}
                          />
                        )
                      );
                    })}
                </CommandGroup>
              </CommandList>
            </Command>
          </SortableContext>
        </DndContext>
      </PopoverContent>
    </Popover>
  );
}

function SortableColumn({ column, capitalFirstLetter }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({ id: column.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };
  const isSelected = column.getIsVisible();

  return (
    <CommandItem
      key={column.id}
      ref={setNodeRef}
      style={style}
      className="flex items-center p-2 group"
    >
      <div
        className="flex items-center flex-grow"
        onPointerDown={() => {
          column.toggleVisibility(!isSelected);
        }}
      >
        <div
          className={cn(
            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-fuchsia-600",
            isSelected
              ? "bg-fuchsia-600 text-white"
              : "opacity-50 [&_svg]:invisible dark:!bg-slate-400"
          )}
        >
          <CheckIcon className={cn("h-4 w-4")} />
        </div>
        <span className="pr-2">{capitalFirstLetter(column.id)}</span>
      </div>
      <GripVertical
        className="ml-auto cursor-grab size-5 hidden group-hover:block text-muted-foreground hover:text-fuchsia-600"
        {...attributes}
        {...listeners}
      />
    </CommandItem>
  );
}

export default DisplayColumns;