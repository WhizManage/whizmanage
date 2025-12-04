import CustomTooltip from "@components/nextUI/Tooltip";
import { CopyPlus, Edit2, ScanEye, ListRestart, Trash2, X, Archive } from "lucide-react";
import { __ } from '@wordpress/i18n';

export const SingleRowToast = ({
  table,
  selectedRows,
  duplicateOrders,
  deleteOrders,
  restoreOrders,
  isTrash,
}) => {
   
  // console.log(selectedRows);
  return (
    <div className="text-fuchsia-600 !min-w-[500px] dark:text-fuchsia-600 flex items-center justify-between dark:bg-slate-900 rounded-lg">
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
        <CustomTooltip title={__("Restore selected order", "whizmanage")}>
          <div
            className="flex p-5 flex-col w-full items-center justify-center gap-2 hover:bg-fuchsia-50 dark:hover:bg-slate-800/50 hover:cursor-pointer"
            onClick={restoreOrders}
          >
            <ListRestart />
            {/* <p>Delete</p> */}
          </div>
        </CustomTooltip>
      ) : (
        <CustomTooltip title={__("Duplicate selected order", "whizmanage")}>
          <div
            className="flex p-5 border-r flex-col w-full items-center justify-center gap-2 hover:bg-fuchsia-50 dark:hover:bg-slate-800/50 hover:cursor-pointer"
            onClick={duplicateOrders}
          >
            <CopyPlus />
            {/* <p>Duplicate</p> */}
          </div>
        </CustomTooltip>
      )}
      <CustomTooltip title={__("Edit in WooCommerce", "whizmanage")}>
        <div
          className="flex p-5 border-r flex-col w-full items-center justify-center gap-2 hover:bg-fuchsia-50 dark:hover:bg-slate-800/50 hover:cursor-pointer hover:!text-fuchsia-600"
          onClick={() =>
            window.open(
              `${window.siteUrl}/wp-admin/post.php?post=${selectedRows[0].id}&action=edit`,
              "_blank"
            )
            // console.log(selectedRows[0])
            
          }
        >
          <Edit2 />
          {/* <p>WooCommerce</p> */}
        </div>
      </CustomTooltip>
      {!isTrash  && <CustomTooltip title={__("Move to Trash", "whizmanage")}>
        <div
          className="flex p-5 flex-col w-full items-center justify-center gap-2 hover:bg-fuchsia-50 dark:hover:bg-slate-800/50 hover:cursor-pointer"
          onClick={() => deleteOrders(false)}
        >
        <Archive />
          {/* <p>Delete</p> */}
        </div>
      </CustomTooltip>}
      <CustomTooltip title={__("Delete permanently order", "whizmanage")}>
        <div
          className="flex p-5 flex-col w-full items-center justify-center gap-2 hover:bg-fuchsia-50 dark:hover:bg-slate-800/50 hover:cursor-pointer"
          onClick={() => deleteOrders(true)}
        >
          <Trash2 />
          {/* <p>Delete</p> */}
        </div>
      </CustomTooltip>
    </div>
  );
};
