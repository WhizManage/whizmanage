import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CustomTooltip from "@components/nextUI/Tooltip";
import { Progress } from "@components/ui/progress";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from "@radix-ui/react-icons";
import { useEffect, useState } from "react";
import { putApi } from "/src/services/services";
import { __ } from '@wordpress/i18n';

export function DataTablePagination({
  table,
  loadingMessage,
  loadingProgress,
}) {
  const [rowsPerPage, setRowsPerPage] = useState(100);
   
  useEffect(() => {
    fetchRowsPerPage();
  }, []);

  useEffect(() => {
    updateRowsPerPage();
  }, [rowsPerPage]);

  const fetchRowsPerPage = async () => {
    const newRowsPerPage = Number(window.getWhizmanage.find((column) => column.name === "perPage")?.reservedData) || 100;
    setRowsPerPage(newRowsPerPage);
    table.setPageSize(newRowsPerPage);
  };

  const updateRowsPerPage = async () => {
    const msg = { name: "perPage", reservedData: rowsPerPage };
    const url = window.siteUrl + "/wp-json/whizmanage/v1/columns/" + msg.name;
    try {
      await putApi(url, msg);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div className="flex max-lg:flex-wrap items-center justify-between sm:px-2">
      {loadingMessage.length > 0 ? (
        <div className="flex gap-2 items-center flex-nowrap whitespace-nowrap text-sm text-muted-foreground max-sm:hidden">
          <div className="w-16 flex-none">
            <Progress value={loadingProgress} className="w-[100%]" />
          </div>
          {/* <span>{loadingMessage}</span> */}
        </div>
      ) : (
        <div className="flex text-sm text-muted-foreground max-sm:hidden gap-1">
          <span>{table.getFilteredSelectedRowModel().rows.length}</span>
          <span>{__("of", "whizmanage")}</span>
          <span>{table.getFilteredRowModel().rows.length}</span>
          <span>{__("rows selected", "whizmanage")}</span>
        </div>
      )}
      <div className="flex items-center space-x-2 rtl:flex-row-reverse">
        <CustomTooltip title={__("Go to first page", "whizmanage")}>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">{__("Go to first page", "whizmanage")}</span>
            <DoubleArrowLeftIcon className="h-4 w-4" />
          </Button>
        </CustomTooltip>
        <CustomTooltip title={__("Go to previous page", "whizmanage")}>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">{__("Go to previous page", "whizmanage")}</span>
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
        </CustomTooltip>
        <div className="flex w-[100px] items-center justify-center text-sm text-muted-foreground gap-1">
          <span>{__("Page", "whizmanage")}</span>
          <span>{table.getState().pagination.pageIndex + 1}</span>
          <span>{__("of", "whizmanage")}</span>
          <span>{table.getPageCount()}</span>
        </div>
        <CustomTooltip title={__("Go to next page", "whizmanage")}>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">{__("Go to next page", "whizmanage")}</span>
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </CustomTooltip>
        <CustomTooltip title={__("Go to last page", "whizmanage")}>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">{__("Go to last page", "whizmanage")}</span>
            <DoubleArrowRightIcon className="h-4 w-4" />
          </Button>
        </CustomTooltip>
      </div>
      <div className="flex items-center space-x-2 rtl:flex-row-reverse">
        <p className="text-sm text-muted-foreground max-sm:hidden">
          {__("Rows per page", "whizmanage")}
        </p>
        <Select
          value={`${table.getState().pagination.pageSize}`}
          onValueChange={(value) => {
            const newPageSize = Number(value);
            table.setPageSize(newPageSize);
            setRowsPerPage(newPageSize);
          }}
        >
          <SelectTrigger className="h-8 w-fit">
            <SelectValue placeholder={table.getState().pagination.pageSize} />
          </SelectTrigger>
          <SelectContent side="top">
            {[100, 50, 20, 10].map((pageSize) => (
              <SelectItem key={pageSize} value={`${pageSize}`}>
                {pageSize}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
