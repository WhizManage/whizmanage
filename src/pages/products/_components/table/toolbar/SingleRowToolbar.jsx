import CustomTooltip from "@components/nextUI/Tooltip";
import { CopyPlus, Edit2, ScanEye, ListRestart, Trash2, X, Archive } from "lucide-react";
import { __ } from '@wordpress/i18n';

export const SingleRowToast = ({
  table,
  selectedRows,
  duplicateProducts,
  deleteProducts,
  restoreProducts,
  isTrash,
  isTableImport
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
        <CustomTooltip title={__("Restore selected product", "whizmanage")}>
          <div
            className="flex p-5 flex-col w-full items-center justify-center gap-2 hover:bg-fuchsia-50 dark:hover:bg-slate-800/50 hover:cursor-pointer"
            onClick={restoreProducts}
          >
            <ListRestart />
            {/* <p>Delete</p> */}
          </div>
        </CustomTooltip>
      ) : selectedRows[0].depth == 0 ? (
        <CustomTooltip title={__("Duplicate selected product", "whizmanage")}>
          <div
            className="flex p-5 border-r flex-col w-full items-center justify-center gap-2 hover:bg-fuchsia-50 dark:hover:bg-slate-800/50 hover:cursor-pointer"
            onClick={duplicateProducts}
          >
            <CopyPlus />
            {/* <p>Duplicate</p> */}
          </div>
        </CustomTooltip>
      ) : (
        <></>
      )}
      {!isTableImport &&
        <CustomTooltip title={__("View in WooCommerce", "whizmanage")}>
          <div
            className="flex p-5 border-r flex-col w-full items-center justify-center gap-2 hover:bg-fuchsia-50 dark:hover:bg-slate-800/50 hover:cursor-pointer hover:!text-fuchsia-600"
            onClick={() =>
              window.open(selectedRows[0].original.permalink, "_blank")
            }
          >
            <ScanEye />
            {/* <p>View</p> */}
          </div>
        </CustomTooltip>
      }
      {!isTableImport &&
        <CustomTooltip title={__("Edit in WooCommerce", "whizmanage")}>
          <div
            className="flex p-5 border-r flex-col w-full items-center justify-center gap-2 hover:bg-fuchsia-50 dark:hover:bg-slate-800/50 hover:cursor-pointer hover:!text-fuchsia-600"
            onClick={() =>
              window.open(
                `${window.siteUrl}/wp-admin/post.php?post=${selectedRows[0].original.id}&action=edit`,
                "_blank"
              )
            }
          >
            <Edit2 />
            {/* <p>WooCommerce</p> */}
          </div>
        </CustomTooltip>
      }
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
