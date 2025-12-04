import CustomTooltip from "@components/nextUI/Tooltip";
import { cn } from "@heroui/react";
import { Archive, CopyPlus, ListRestart, Trash2, X } from "lucide-react";
import { useState } from "react";
import BulkEdit from "./bulk-edit/BulkEdit";
import { __ } from '@wordpress/i18n';

export const MultipleRowsToast = ({
  table,
  selectedRows,
  setSelectedRows,
  setRowSelection,
  deleteCoupons,
  restoreCoupons,
  duplicateCoupons,
  isTrash,
  dataProducts,
  setData,
  data
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
        <CustomTooltip title={__("Restore selected coupons", "whizmanage")}>
          <div
            className="flex p-5 flex-col w-full items-center justify-center gap-2 hover:bg-fuchsia-50 dark:hover:bg-slate-800/50 hover:cursor-pointer"
            onClick={restoreCoupons}
          >
            <ListRestart />
            {/* <p>Delete</p> */}
          </div>
        </CustomTooltip>
      ) : (
        <>
          <BulkEdit
            table={table}
            setHideToolbar={setHideToolbar}
            selectedRows={selectedRows}
            setSelected={setSelectedRows}
            dataProducts={dataProducts}
            setData={setData}
            data={data}
          />
          <CustomTooltip title={__("Duplicate selected coupons", "whizmanage")}>
            <div
              className="flex p-5 border-r flex-col w-full items-center justify-center gap-2 hover:bg-fuchsia-50 dark:hover:bg-slate-800/50 hover:cursor-pointer"
              onClick={duplicateCoupons}
            >
              <CopyPlus />
              {/* <p>Duplicate</p> */}
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
            onClick={() => deleteCoupons(false)}
          >
           <Archive />
            {/* <p>Delete</p> */}
          </div>
        </CustomTooltip>
      )}
      <CustomTooltip title={__("Delete permanently coupons", "whizmanage")}>
        <div
          className="flex p-5 flex-col w-full items-center justify-center gap-2 hover:bg-fuchsia-50 dark:hover:bg-slate-800/50 hover:cursor-pointer"
          onClick={() => deleteCoupons(true)}
        >
          <Trash2 />
          {/* <p>Delete</p> */}
        </div>
      </CustomTooltip>
    </div>
  );
};
