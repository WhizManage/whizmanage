import CustomTooltip from "@components/nextUI/Tooltip";
import { cn } from "@heroui/react";
import {
  Archive,
  CopyPlus,
  ListRestart,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { __ } from '@wordpress/i18n';
import ProBadge from "../../../../../components/nextUI/ProBadge";

export const MultipleRowsToast = ({
  table,
  deleteProducts,
  restoreProducts,
  isTrash,
}) => {
  const [hideToolbar, setHideToolbar] = useState(false);
   
  return (
    <div
      className={cn(
        "text-fuchsia-600 !min-w-[500px] dark:text-fuchsia-600 items-center justify-between dark:bg-slate-900 rounded-lg",
        hideToolbar ? "hidden" : "flex"
      )}
    >
      <CustomTooltip title={__("Dismiss", "whizmanage")}>
        <div
          className="flex p-5 border-r flex-col w-full items-center justify-center gap-2 hover:bg-fuchsia-50 dark:hover:bg-slate-800/50 hover:cursor-pointer"
          onClick={() => {
            table.resetRowSelection();
          }}
        >
          <X />
          {/* <p>Dismiss</p> */}
        </div>
      </CustomTooltip>
      {isTrash ? (
        <CustomTooltip title={__("Restore selected products", "whizmanage")}>
          <div
            className="flex p-5 flex-col w-full items-center justify-center gap-2 hover:bg-fuchsia-50 dark:hover:bg-slate-800/50 hover:cursor-pointer"
            onClick={restoreProducts}
          >
            <ListRestart />
            {/* <p>Delete</p> */}
          </div>
        </CustomTooltip>
      ) : (
        <>
          <CustomTooltip title={__("Bulk edit", "whizmanage")}>
            <button className="flex flex-col w-full items-center justify-center gap-2 p-5 border-r hover:bg-fuchsia-50 dark:hover:bg-slate-800/50 hover:cursor-pointer">
              <Settings2 />
              <ProBadge />
            </button>
          </CustomTooltip>
          <CustomTooltip title={__("Duplicate selected product", "whizmanage")}>
            <div className="flex p-5 border-r flex-col w-full items-center justify-center gap-2 hover:bg-fuchsia-50 dark:hover:bg-slate-800/50 hover:cursor-pointer">
              <CopyPlus />
              <ProBadge />
            </div>
          </CustomTooltip>
        </>
      )}
      {/* <ExportToExcel
          selectedRows={selectedRows}
          setSelectedRows={setRowSelection}
          ColumnsVisible={table
            .getAllColumns()
            .filter((column) => column.getCanHide())}
        /> */}
      {!isTrash && (
        <CustomTooltip title={__("Move to Trash", "whizmanage")}>
          <div
            className="flex p-5 flex-col w-full items-center justify-center gap-2 hover:bg-fuchsia-50 dark:hover:bg-slate-800/50 hover:cursor-pointer"
            onClick={() => deleteProducts(false)}
          >
            <Archive />
            {/* <p>Delete</p> */}
          </div>
        </CustomTooltip>
      )}
      <CustomTooltip title={__("Delete permanently product", "whizmanage")}>
        <div
          className="flex p-5 flex-col w-full items-center justify-center gap-2 hover:bg-fuchsia-50 dark:hover:bg-slate-800/50 hover:cursor-pointer"
          onClick={() => deleteProducts(true)}
        >
          <Trash2 />
        </div>
      </CustomTooltip>
    </div>
  );
};
