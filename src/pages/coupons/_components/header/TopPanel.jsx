import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu";
import { Input } from "@components/ui/input";
import { Filter, RefreshCcw, RefreshCwOff, Trash2, Undo2, PlusCircle } from "lucide-react";
import { useState } from "react";
import { __ } from '@wordpress/i18n';
import { IoIosSearch } from "react-icons/io";
import DisplayColumns from "./DisplayColumns";
import { Button } from "@components/ui/button";
import AddCoupon from "./add/coupon/AddCoupon";
import EditAll from "./EditAll";
import { cn } from "@/lib/utils";
import { confirm } from "@components/CustomConfirm";
import { postApi } from "@/services/services";
// import DiscountRulesModal from "./discount-rules/DiscountRulesModal";

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
  setRowSelection
}) {
   
  const [isLoading, setIsLoading] = useState(false);
  const [showDiscountRulesModal, setShowDiscountRulesModal] = useState(false);

  const handleEnableCoupons = async () => {
    const isConfirmed = await confirm({
      title: __("Disable Coupons", "whizmanage"),
      message: __(
        "Are you sure you want to disable coupons? This will prevent users from applying any coupons during checkout.",
        "whizmanage"
      ),
      confirmText: __("Disable", "whizmanage"),
      cancelText: __("Cancel", "whizmanage"),
    });

    if (!isConfirmed) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await postApi(
        `${window.siteUrl}/wp-json/whizmanage/v1/toggle-coupons`,
        { enable: "no" }
      );
      console.log(window.siteUrl);
      if (response.data.status === "success") {
        window.statusCoupons = "no";
      }
      window.location.reload();
    } catch (error) {
      console.error("Failed to enable coupons:", error);
    }
    setIsLoading(false);
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
              // fetchData();
            }}
          >
            {isTrash ? (
              <Undo2 className="h-4 w-4" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {isTrash ? __("Back to Coupons", "whizmanage") : __("Trash", "whizmanage")}
          </Button>
          <EditAll
            table={table}
            editAll={editAll}
            fetchData={fetchData}
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
              value={globalFilter}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="peer !border-none !ring-0 group-hover:bg-neutral-100 dark:group-hover:!bg-slate-600 focus:bg-neutral-100 focus:dark:!bg-slate-600 text-gray-500 dark:!text-gray-300 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0"
            />
          </div>
        </div>
        <div className="sm:ml-auto flex gap-4 rtl:flex-row-reverse rtl:sm:mr-auto rtl:ml-0">
          <Button
            variant="outline"
            onClick={handleEnableCoupons}
            className="flex gap-2"
          >
            <span>
              {isLoading ? (
                <RefreshCcw className="text-white w-4 h-4 animate-spin" />
              ) : (
                <RefreshCwOff className="size-4" />
              )}
            </span>
            <span>{__("Disable Coupons", "whizmanage")}</span>
          </Button>
          {/* <Button
            variant="outline"
            onClick={() => setShowDiscountRulesModal(true)}
            className="flex gap-2"
          >
            <PlusCircle className="size-4" />
            {__("Discount Rules")}
          </Button>
          {showDiscountRulesModal && (
            <DiscountRulesModal
              onClose={() => setShowDiscountRulesModal(false)}
            />
          )} */}
          <AddCoupon fetchData={fetchData} table={table} />
        </div>
      </div>
    </div>
  );
}

export default TopPanel;
