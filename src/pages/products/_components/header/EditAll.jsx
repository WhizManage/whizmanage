import { cn } from "@/lib/utils";
import { useProductsContext } from "@/context/ProductsContext";
import Button from "@components/ui/button";
import axios from "axios";
import { CheckCircle, SaveAll, XCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { __ } from '@wordpress/i18n';
import { MdCancel, MdOutlineEditNote } from "react-icons/md";
import { toast } from "sonner";
import { confirm } from "@components/CustomConfirm";
import { getChangedFields } from "@/utils/historyUtils";
import { postApi } from "../../../../services/services";
import { chunkBatchPayloads } from "@/utils/networkUtils";

const EditAll = ({
  table,
  editAll,
  setEditAll,
  fetchData,
  setEditingRows,
  editedItems,
  setEditedItems,
  isTableImport,
}) => {
  const [originalData, setOriginalData] = useState([]);

  const { data, setData } = useProductsContext();
   
  useEffect(() => {
    if (editAll && data && data.length > 0) {
      setOriginalData(JSON.parse(JSON.stringify(data)));
    }
  }, [editAll, data]);

  const sendBatchUpdate = (items) => {
    const WooCommerceEndpoint = `${window.siteUrl}/wp-json/wc/v3/`;
    axios
      .post(
        WooCommerceEndpoint + "products/batch",
        { update: items },
        { headers: { "X-WP-Nonce": window.rest } }
      )
      .then((data) => {
        const idsArray = items.map((item) => item.id);

        fetchData(true, idsArray);
        toast(
          <div className="p-4 dark:bg-slate-800 w-full h-full dark:text-slate-400 !border-l-4 !border-l-fuchsia-600 rounded-md flex gap-4 items-center justify-start">
            <CheckCircle className="w-5 h-5 text-fuchsia-600" />
            {__("The updates have been saved successfully.", "whizmanage")}
          </div>,
          { duration: 5000 }
        );
      })
      .catch((error) => {
        setData(originalData);
        toast(
          <div className="p-4 dark:bg-slate-800 w-full h-full dark:text-slate-300 !border-l-4 !border-l-red-500 rounded-md flex gap-4 items-center justify-start">
            <XCircle className="w-5 h-5 text-red-500" />
            {error?.response?.data?.message ||
              error ||
              "Unknown error occurred"}
          </div>,
          { duration: 5000 }
        );
      });
  };

  const sendVariationBatchUpdate = (id, variations) => {
    const WooCommerceEndpoint = `${window.siteUrl}/wp-json/wc/v3/`;
    axios
      .post(
        WooCommerceEndpoint + `products/${id}/variations/batch`,
        {
          update: variations.map((variation) => {
            const newUpdate = { ...variation };

            const parent = data.find((item) => item.id === newUpdate.parent_id);

            if (parent && parent.sku === newUpdate.sku) {
              // Remove the SKU from the variation
              delete newUpdate.sku;
            }

            return newUpdate;
          }),
        },
        { headers: { "X-WP-Nonce": window.rest } }
      )
      .then((res) => {
        fetchData(true, [id]);
      })
      .catch((error) => {
        setData(originalData);
        toast(
          <div className="p-4 dark:bg-slate-800 w-full h-full dark:text-slate-300 !border-l-4 !border-l-red-500 rounded-md flex gap-4 items-center justify-start">
            <XCircle className="w-5 h-5 text-red-500" />
            {error?.response?.data?.message ||
              error ||
              "Unknown error occurred"}
          </div>,
          { duration: 5000 }
        );
      });
  };

  const flattenRows = (data) => {
    const flat = [];
    data.forEach((item) => {
      flat.push(item);
      if (item.subRows && item.subRows.length) {
        flat.push(...item.subRows);
      }
    });
    return flat;
  }

  const saveAllEdits = async () => {
    const itemsToSave = data.filter((item) => editedItems.includes(item.id));

    const subItemsToSave = data.reduce((acc, item) => {
      if (
        item.subRows &&
        item.subRows.some((subItem) => editedItems.includes(subItem.id))
      ) {
        acc[item.id] = item.subRows.filter((subItem) =>
          editedItems.includes(subItem.id)
        );
      }
      return acc;
    }, {});

    // ✨ שימוש בפונקציה שלך:
    const itemChunks = chunkBatchPayloads([], itemsToSave, [], 100);

    const promises = itemChunks.map((batch) => sendBatchUpdate(batch.update));

    // שליחת וריאציות
    Object.entries(subItemsToSave).forEach(([parentId, variations]) => {
      sendVariationBatchUpdate(parentId, variations);
    });

    await Promise.all(promises);

    // היסטוריית שינויים
    if (editedItems.length > 0) {
      const flatOriginal = flattenRows(originalData);
      const flatCurrent = flattenRows(data);
      
      console.log(flatOriginal);
      console.log(flatOriginal.filter((item) => editedItems.includes(item.id)))
      console.log(flatCurrent);
      console.log(flatCurrent.filter((item) => editedItems.includes(item.id)))
      const changedFields = getChangedFields(
        flatOriginal.filter((item) => editedItems.includes(item.id)),
        flatCurrent.filter((item) => editedItems.includes(item.id))
      );

      if (changedFields.length > 0) {
        postApi(`${window.siteUrl}/wp-json/whizmanage/v1/history`, {
          location: "products",
          items: changedFields,
          action: "put",
        });
      }
    }

    setEditingRows(new Set());
    setEditAll(false);
    setEditedItems([]);
  };

  return (
    <>
      {editAll && (
        <>
          {!isTableImport && (
            <Button
              variant="outline"
              className="ring-fuchsia-600 ring-1 ring-offset-1 ring-offset-white dark:!ring-offset-slate-700 !bg-fuchsia-50/50 dark:!bg-slate-900/70 px-2 sm:px-4 flex gap-2"
              onClick={async () => {
                const isConfirmed = await confirm({
                  title: __("Cancel Edits", "whizmanage"),
                  message: __("Are you sure you want to cancel all edits?", "whizmanage"),
                  confirmText: __("Yes, Cancel", "whizmanage"),
                  cancelText: __("No, Keep Editing", "whizmanage"),
                });

                if (isConfirmed) {
                  setData(originalData);
                  setEditAll(false);
                  setEditingRows(new Set());
                }
              }}
            >
              <MdCancel className="h-5 w-5" />
              {__("Cancel", "whizmanage")}
            </Button>
          )}
        </>
      )}
      <Button
        variant="outline"
        className={cn(
          editAll
            ? "ring-fuchsia-600 ring-1 ring-offset-1 ring-offset-white dark:!ring-offset-slate-700 !bg-fuchsia-50/50 dark:!bg-slate-900/70"
            : "",
          "px-2 sm:px-4 flex gap-2"
        )}
        onClick={(event) => {
          const toggleAll = table.getToggleAllRowsExpandedHandler();
          !table.getIsAllRowsExpanded() && toggleAll(event);
          if (isTableImport) {
            if (editAll) {
              setEditingRows(new Set());
            }
            setEditAll((editAll) => !editAll);
            return;
          }
          editAll ? saveAllEdits() : setEditAll((editAll) => !editAll);
        }}
      >
        {editAll ? (
          <SaveAll className="h-4 w-4" />
        ) : (
          <MdOutlineEditNote className="h-5 w-5" />
        )}
        {/* {editAll ? __(Save") : __(Edit All")} */}
        {editAll ? (
          <span>{isTableImport ? __("Table mode", "whizmanage") : __("Save", "whizmanage")} </span>
        ) : (
          <span> {isTableImport ? __("Edit mode", "whizmanage") : __("Edit All", "whizmanage")}</span>
        )}
      </Button>
    </>
  );
};

export default EditAll;
