import { cn } from "@/lib/utils";
import { putApi } from "@/services/services";
import { Button } from "@components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu";
import { Input } from "@components/ui/input";
import { Filter, Trash2, Undo2 } from "lucide-react";
import { __ } from '@wordpress/i18n';
import { IoIosSearch } from "react-icons/io";
import DisplayColumns from "./DisplayColumns";
import EditAll from "./EditAll";
import AddProduct from "./add/product/AddProduct";
import Import from "./import/Import";
// import { useState } from "react";
// import Export from "./export/Export";
function TopPanel({
  table,
  enableFilters,
  setEnableFilters,
  globalFilter,
  setGlobalFilter,
  fetchData,
  isTrash,
  setIsTrash,
  editAll,
  setEditAll,
  setEditingRows,
  editedItems,
  setEditedItems,
  isTableImport,
  setRowSelection
}) {
   
  const saveToServer = async (filters) => {
    const minimalData = filters.map(({ column, enable }) => ({
      column,
      enable,
    }));

    const msg = { name: "products_enabled_filters", reservedData: minimalData };
    const url = window.siteUrl + "/wp-json/whizmanage/v1/columns/" + msg.name;
    try {
      await putApi(url, msg);
      // toast(
      //   // <div className="p-4 w-full h-full !border-l-4 !border-l-fuchsia-600 dark:bg-slate-800 dark:text-slate-300 rounded-md flex gap-4 items-center justify-start">
      //   //   <CheckIcon className="w-5 h-5 text-fuchsia-600" />
      //   //   {__("New view has been saved successfully")}
      //   // </div>,
      //   // { duration: 5000 }
      // );
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap-reverse items-center justify-start gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="px-2 sm:px-4 flex gap-2">
                <Filter className="h-4 w-4" />
                {__("Filters", "whizmanage")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="max-h-[400px] overflow-y-auto scrollbar-whiz"
            >
              {Array.isArray(enableFilters)
                ? enableFilters.map((column) => (
                    <DropdownMenuCheckboxItem
                      className="capitalize"
                      checked={
                        enableFilters.find(
                          (filter) => filter.column === column.column
                        ).enable
                      }
                      onCheckedChange={() => {
                        // עדכון המצב המקומי
                        const updatedFilters = enableFilters.map((filter) =>
                          filter.column === column.column
                            ? {
                                ...filter,
                                enable: !filter.enable,
                              }
                            : filter
                        );

                        setEnableFilters(updatedFilters); // עדכון ה-State

                        // שליחת הנתונים המעודכנים לשרת
                        saveToServer(updatedFilters);
                      }}
                    >
                      {__(column.label, "whizmanage")}
                    </DropdownMenuCheckboxItem>
                  ))
                : console.log(enableFilters)}
            </DropdownMenuContent>
          </DropdownMenu>
          {!isTableImport && (
            <Button
              variant="outline"
              className={cn(
                isTrash
                  ? "ring-fuchsia-600 ring-1 ring-offset-1 ring-offset-white dark:!ring-offset-slate-700 !bg-fuchsia-50/50 dark:!bg-slate-900/70"
                  : "",
                "px-2 sm:px-4 flex gap-2"
              )}
              onClick={() => {
                setRowSelection({});
                setIsTrash((isTrash) => !isTrash);
                // fetchData();
              }}
            >
              {isTrash ? (
                <Undo2 className="h-4 w-4" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {isTrash ? __("Back to Products", "whizmanage") : __("Trash", "whizmanage")}
            </Button>
          )}
          {isTrash ? (
            <></>
          ) : (
            <EditAll
              table={table}
              editAll={editAll}
              fetchData={fetchData}
              setEditAll={setEditAll}
              setEditingRows={setEditingRows}
              editedItems={editedItems}
              setEditedItems={setEditedItems}
              isTableImport={isTableImport}
            />
          )}
          <DisplayColumns table={table} />
          <div className="relative h-10 w-60 border group rounded-lg flex gap-1 items-center px-2 dark:bg-slate-700 hover:bg-neutral-100 hover:text-accent-foreground dark:hover:bg-slate-600 peer-focus:!bg-neutral-100 peer-focus:dark:!bg-slate-600">
            <IoIosSearch className="w-6 h-6 text-gray-500 dark:text-gray-300" />
            <Input
              placeholder={__("Search", "whizmanage") + "..."}
              type="search"
              value={globalFilter}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="peer !border-none !ring-0 group-hover:bg-neutral-100 dark:group-hover:!bg-slate-600 focus:bg-neutral-100 focus:dark:!bg-slate-600 text-gray-500 dark:!text-gray-300 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0"
            />
          </div>
        </div>
        <div className="sm:ml-auto flex gap-4 rtl:flex-row-reverse rtl:sm:mr-auto rtl:ml-0">
           <Import fetchData={fetchData} /> 

          <AddProduct
            fetchData={fetchData}
            table={table}
            isTableImport={isTableImport}
          />
          {/* <Export/> */}
     
        </div>
      </div>
    </div>
  );
}

export default TopPanel;
