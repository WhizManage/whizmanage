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
import { __ } from '@wordpress/i18n';
import { toast } from "sonner";
import { putApi } from "/src/services/services";
import { initialColumnOrder, initialReservedData } from "../../page";
import { initialColumnSizing } from "../../page";
import { confirm } from "@components/CustomConfirm";

function DisplayColumns({ table, plusButton, metaData, allMetaData }) {
   
  const allCustomFields = allMetaData;
  const yoastColumns = allMetaData?.filter(item => item.source === "Yoast SEO") || [];

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

    const msg = { name: "products_visible_columns", reservedData: columnsVisibility };
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

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      const oldIndex = table.getState().columnOrder.indexOf(active.id);
      const newIndex = table.getState().columnOrder.indexOf(over.id);
      const newOrder = arrayMove(table.getState().columnOrder, oldIndex, newIndex);
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
    }
  };

  // תיקון: שיפור הלוגיקה לזיהוי custom fields columns
  let metaDataColumns = [];

  if (metaData && allCustomFields && allCustomFields.length > 0) {
    metaDataColumns = table
      .getAllColumns()
      .filter((column) =>
        allCustomFields.some((item) => item.key === column.id)
      );

  }

  // בדיקה אם כל העמודות גלויות בהתבסס על סוג התצוגה (meta או רגיל)
  const allColumnsSelected = metaData
    ? metaDataColumns.length > 0 && metaDataColumns.every((column) => column.getIsVisible())
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

  const capitalFirstLetter = (nameColumns) => {
    if (typeof nameColumns !== "string" || !nameColumns) {
      return "";
    }

    const parts = nameColumns.split("_");
    const newString = parts
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
    return __(newString, "whizmanage");
  };

  const resetProductsTable = async () => {
    const isConfirmed = await confirm({
      title: __("Reset Table", "whizmanage"),
      message: __("Are you sure you want to reset the table?", "whizmanage"),
      confirmText: __("Yes", "whizmanage"),
      cancelText: __("No", "whizmanage"),
    });

    if (isConfirmed) {
      const widthMsg = { name: "products_columns_width", reservedData: initialColumnSizing };
      const widthUrl = window.siteUrl + "/wp-json/whizmanage/v1/columns/" + widthMsg.name;

      const orderMsg = { name: "products_columns_order", reservedData: initialColumnOrder };
      const orderUrl = window.siteUrl + "/wp-json/whizmanage/v1/columns/" + orderMsg.name;

      const visibleColumnsMsg = { name: "products_visible_columns", reservedData: initialReservedData };
      const visibleColumnsUrl = window.siteUrl + "/wp-json/whizmanage/v1/columns/" + visibleColumnsMsg.name;

      const pinnedColumnsMsg = { name: "products_pinned_columns", reservedData: { left: ["select", "expand"], right: [] } }
      const pinnedColumnsUrl = window.siteUrl + "/wp-json/whizmanage/v1/columns/" + pinnedColumnsMsg.name;
      try {
        table.setColumnVisibility(initialReservedData);
        table.setColumnOrder(initialColumnOrder);
        table.setColumnSizing(initialColumnSizing);
        table.setColumnPinning({ left: ["select", "expand"], right: [] });

        window.getWhizmanage = (window.getWhizmanage || []).map(c => c.name === "products_pinned_columns" ? { ...c, reservedData: pinnedColumnsMsg.reservedData } : c);

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
        console.error("Error resetting columns:", error.response?.data || error.message);
        toast.error("Failed to reset columns. Please check the console for details.");
      }
    }
  };

  // חישוב כמות העמודות הנראות
  const visibleColumnsCount = metaData && metaDataColumns.length > 0
    ? metaDataColumns.filter((column) => column.getIsVisible()).length
    : table.getVisibleFlatColumns().length;

  // בדיקה אם יש עמודות להצגה
  const columnsToRender = metaData
    ? metaDataColumns
    : table.getState().columnOrder.map((columnId) => table.getColumn(columnId)).filter(column => Boolean(column) && column.id !== "select" && column.id !== "expand");
  const hasColumnsToShow = columnsToRender.length > 0;

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
        ) : yoastColumns.length === 0 && (
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
                    onClick={handleUpdateView}
                  >
                    {__("Save as default", "whizmanage")}
                  </Button>
                </ClosePopover>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-slate-500 dark:text-slate-400 mb-2"
                onClick={resetProductsTable}>
                {__("Reset Table", "whizmanage")}
              </Button>
              <CommandInput
                placeholder={__("Find column to show/hide", "whizmanage")}
                className="!border-none !ring-0"
              />
              <CommandList className="scrollbar-whiz">
                <CommandEmpty>{__("No results found.", "whizmanage")}</CommandEmpty>
                {hasColumnsToShow ? (
                  <>
                    <CommandGroup heading={__("All columns", "whizmanage")}>
                      <CommandItem onSelect={toggleAllColumns}>
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
                      {columnsToRender.map((column) => column.name !== "Select" && column.name !== "Expand" && (
                        <SortableColumn
                          key={column.id}
                          column={column}
                          capitalFirstLetter={capitalFirstLetter}
                        />
                      ))}
                    </CommandGroup>
                  </>
                ) : (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    {metaData
                      ? __("No custom field columns found", "whizmanage")
                      : __("No columns available", "whizmanage")}
                  </div>
                )}
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
  const labelTaxonomies = window.listTaxonomies;

  // פרוס את הערכים מהמכניסים
  const newObjects = window.WhizManageCustomFields;

  // הוספת האובייקטים למערך הראשי
  if (Array.isArray(newObjects)) {
    labelTaxonomies.push(...newObjects); // הוספה פרוסה
  } else {
    console.error("window.WhizManageCustomFields is not an array");
  }
  // הפונקציה מקבלת סטרינג ומחזירה את ה-label המתאים או את הסטרינג עצמו
  function getLabelFromArray(searchString) {
    const foundObject = labelTaxonomies.find(
      obj => obj.name === searchString || obj.key === searchString
    );
    return foundObject ? capitalFirstLetter(foundObject.label) : capitalFirstLetter(searchString);
  }

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
        onClick={() => {
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
        <span className="pr-2">{getLabelFromArray(column.id)}</span>
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
