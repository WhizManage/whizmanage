import { cn } from "@/lib/utils";
import { Button } from "@components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu";
import { Input } from "@components/ui/input";
import axios from "axios";
import { Filter, Trash2, Undo2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { __ } from '@wordpress/i18n';
import { IoIosSearch } from "react-icons/io";
import { useOrdersContext } from "../../../../context/OrdersContext";
import AddOrder from "./add/order/AddOrder";
import DateFilterTabs from "./DateFilterTabs";
import DisplayColumns from "./DisplayColumns";
import EditAll from "./EditAll";
import Loader from "@components/Loader";

function TopPanel({
  table,
  enableFilters,
  setEnableFilters,
  globalFilter,
  setGlobalFilter,
  isTrash,
  setIsTrash,
  editAll,
  setEditAll,
  setEditingRows,
  editedItems,
  setEditedItems,
  setRowSelection,
}) {
   
  const { data, setData } = useOrdersContext();
  const ordersContext = useOrdersContext();
  const setIsLoading = ordersContext.setIsLoading || (() => {});
  const activeRequest = useRef(null);
  const [localLoading, setLocalLoading] = useState(false);

  const handleDateRangeChange = useCallback(
    async (start, end) => {
      const isDefaultRequest = start === null && end === null;
      if (!isDefaultRequest && (!start || !end)) return;

      const startDateStr = isDefaultRequest
        ? null
        : start.toISOString().split("T")[0];
      const endDateStr = isDefaultRequest
        ? null
        : end.toISOString().split("T")[0];

      const requestKey = `${startDateStr}-${endDateStr}`;

      if (activeRequest.current === requestKey) {
        return;
      }

      activeRequest.current = requestKey;

      setIsLoading(true);

      try {
        console.log(startDateStr, "   ", endDateStr);
        const url = `${window.siteUrl}/wp-json/whizmanage/v1/get_orders`;
        const resOrders = await axios.get(url, {
          headers: {
            "X-WP-Nonce": window.rest,
          },
          params: {
            start_date: startDateStr,
            end_date: endDateStr,
          },
        });

        if (activeRequest.current === requestKey) {
          setData(resOrders.data);
        }
      } catch (error) {
        if (activeRequest.current === requestKey) {
          console.log("Error fetching orders:", error);
        }
      } finally {
        if (activeRequest.current === requestKey) {
          setIsLoading(false);
        }
      }
    },
    [setData, setIsLoading]
  );

  const [searchValue, setSearchValue] = useState(globalFilter || "");

  useEffect(() => {
    setSearchValue(globalFilter || "");
  }, [globalFilter]);

  const handleSearchChange = (event) => {
    const value = event.target.value;
    setSearchValue(value);

    setGlobalFilter(value);
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
            <DropdownMenuContent align="end">
              {Array.isArray(enableFilters)
                ? enableFilters.map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.column}
                      className="capitalize"
                      checked={
                        enableFilters.find(
                          (filter) => filter.column === column.column
                        ).enable
                      }
                      onCheckedChange={() => {
                        setEnableFilters((currentFilters) =>
                          currentFilters.map((filter) =>
                            filter.column === column.column
                              ? {
                                  ...filter,
                                  enable: !filter.enable,
                                }
                              : filter
                          )
                        );
                      }}
                    >
                      {__(column.label, "whizmanage")}
                    </DropdownMenuCheckboxItem>
                  ))
                : console.log(enableFilters)}
            </DropdownMenuContent>
          </DropdownMenu>
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
            }}
          >
            {isTrash ? (
              <Undo2 className="h-4 w-4" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {isTrash ? __("Back to Orders", "whizmanage") : __("Trash", "whizmanage")}
          </Button>
          <EditAll
            table={table}
            editAll={editAll}
            setEditAll={setEditAll}
            setEditingRows={setEditingRows}
            editedItems={editedItems}
            setEditedItems={setEditedItems}
          />
          <DisplayColumns table={table} />
          <div className="relative h-10 w-60 border group rounded-lg flex gap-1 items-center px-2 dark:bg-slate-700 hover:bg-neutral-100 hover:text-accent-foreground dark:hover:bg-slate-600 peer-focus:!bg-neutral-100 peer-focus:dark:!bg-slate-600">
            <IoIosSearch className="w-6 h-6 text-gray-500 dark:text-gray-300" />
            <Input
              placeholder={__("Search", "whizmanage") + "..."}
              type="search"
              value={searchValue}
              onChange={handleSearchChange}
              className="peer !border-none !ring-0 group-hover:bg-neutral-100 dark:group-hover:!bg-slate-600 focus:bg-neutral-100 focus:dark:!bg-slate-600 text-gray-500 dark:!text-gray-300 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0"
            />
          </div>
        </div>
        <div className="sm:ml-auto flex gap-4 rtl:sm:mr-auto rtl:ml-0">
          <div className="border dark:bg-slate-700 rounded-lg shadow-sm dark:!shadow-xl overflow-hidden">
            <DateFilterTabs onDateRangeChange={handleDateRangeChange} />
          </div>
          <AddOrder />
        </div>
      </div>
      {localLoading && typeof setIsLoading !== "function" && (
        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 flex items-center">
          <Loader />
        </div>
      )}
    </div>
  );
}

export default TopPanel;
