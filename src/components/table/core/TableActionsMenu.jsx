// src/components/table/TableActionsMenu.jsx
import { toast } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu";
import CustomTooltip from "@components/ui/nextUI/Tooltip";
import { Columns, Download, MoreVertical, RefreshCw } from "lucide-react";
 import { __ } from "@wordpress/i18n";
import { DisplayColumns } from "./DisplayColumns";

export function TableActionsMenu({
  table,
  store,
  useTableStore,
  selectedCount,
  tableDefaults,
}) {
   

  const handleExportAll = () => {
    const data = table.getFilteredRowModel().rows.map((row) => row.original);
    const csv = convertToCSV(data);
    downloadCSV(csv, "table_export.csv");
    toast.success(__("Table exported successfully", "whizmanage"));
  };

  const handleResetFilters = () => {
    table.resetGlobalFilter();
    table.resetColumnFilters();
    table.resetSorting();
    toast.success(__("All filters reset", "whizmanage"));
  };

  const convertToCSV = (data) => {
    if (!data.length) return "";
    const headers = Object.keys(data[0]);
    const rows = data.map((row) =>
      headers.map((header) => JSON.stringify(row[header] || "")).join(",")
    );
    return [headers.join(","), ...rows].join("\n");
  };

  const downloadCSV = (csv, filename) => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement( "a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DropdownMenu>
      <CustomTooltip title={__("Table actions", "whizmanage")} instantClose>
        <DropdownMenuTrigger asChild>
          <button
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label={__("Table actions menu", "whizmanage")}
          >
            <MoreVertical className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </DropdownMenuTrigger>
      </CustomTooltip>
      <DropdownMenuContent align="end" className="w-56">
        {/* <DropdownMenuItem onClick={handleExportAll}>
          <Download className="mr-2 h-4 w-4" />
          {__("Export table to CSV")}
        </DropdownMenuItem> */}

        <DropdownMenuItem onClick={handleResetFilters}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {__("Reset filters", "whizmanage")}
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <div className="flex items-center">
              <Columns className="mr-2 h-4 w-4" />
              {__("Manage columns", "whizmanage")}
            </div>
          </DropdownMenuSubTrigger>

          <DropdownMenuSubContent
            className="w-[320px] max-h-fit overflow-hidden p-0 dark:!bg-slate-800"
            sideOffset={5}
          >
            <DisplayColumns
              table={table}
              useTableStore={useTableStore}
              store={store}
              tableConfig={tableDefaults}
            />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
