import { cn } from "@/lib/utils";
import { useOrdersContext } from "@/context/OrdersContext";
import Button from "@components/ui/button";
import axios from "axios";
import { CheckCircle, SaveAll, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { __ } from '@wordpress/i18n';
import { MdCancel, MdOutlineEditNote } from "react-icons/md";
import { toast } from "sonner";
import { confirm } from "@components/CustomConfirm";
import { postApi } from "../../../../services/services";
import { getChangedFields } from "@/utils/historyUtils";
import { chunkBatchPayloads } from "@/utils/networkUtils";

const EditAll = ({
  table,
  editAll,
  setEditAll,
  setEditingRows,
  editedItems,
  setEditedItems,
}) => {
  const [originalData, setOriginalData] = useState([]);

  const { data, setData } = useOrdersContext();
   

  useEffect(() => {
    if (editAll && data && data.length > 0) {
      // שומר עותק עמוק של המידע המקורי כשנכנסים למצב עריכה
      setOriginalData(JSON.parse(JSON.stringify(data)));
    }
  }, [editAll, data]);

  const sendBatchUpdate = async (items) => {
    const WooCommerceEndpoint = `${window.siteUrl}/wp-json/wc/v3/`;

    const response = await axios.post(
      WooCommerceEndpoint + "orders/batch",
      { update: items },
      { headers: { "X-WP-Nonce": window.rest } }
    );

    return response.data.update; // נחזיר רק את המידע הרלוונטי
  };

  const saveAllEdits = async () => {
    const itemsToSave = data
      .filter((item) => editedItems.includes(item.id))
      .map(({ attributes, ...rest }) => rest);

    if (itemsToSave.length === 0) return;

    const originalSnapshot = [...data];

    const batches = chunkBatchPayloads([], itemsToSave, []); // רק update

    try {
      const allResults = Promise.all(
        batches.map(batch => sendBatchUpdate(batch.update))
      );

      const updatedItems = allResults.flat();

      setData(prev =>
        prev.map(item =>
          updatedItems.find(updated => updated.id === item.id) ?? item
        )
      );

      const changedFields = getChangedFields(originalData, data);

      if (changedFields.length > 0) {
        await postApi(`${window.siteUrl}/wp-json/whizmanage/v1/history`, {
          location: "orders",
          items: changedFields,
          action: "put"
        });
      }

      toast(
        <div className="p-4 dark:bg-slate-800 w-full h-full dark:text-slate-400 !border-l-4 !border-l-fuchsia-600 rounded-md flex gap-4 items-center justify-start">
          <CheckCircle className="w-5 h-5 text-fuchsia-600" />
          {__("The updates have been saved successfully.", "whizmanage")}
        </div>,
        { duration: 5000 }
      );

    } catch (error) {
      setData(originalSnapshot);

      toast(
        <div className="p-4 dark:bg-slate-800 w-full h-full dark:text-slate-300 !border-l-4 !border-l-red-500 rounded-md flex gap-4 items-center justify-start">
          <XCircle className="w-5 h-5 text-red-500" />
          {error?.response?.data?.message || error.message || "Unknown error occurred"}
        </div>,
        { duration: 5000 }
      );
    }

    setEditingRows(new Set());
    setEditAll(false);
    setEditedItems([]);
  };

  return (
    <>
      {editAll && (
        <Button
          variant="outline"
          className="ring-fuchsia-600 ring-1 ring-offset-1 ring-offset-white dark:!ring-offset-slate-700 !bg-fuchsia-50/50 dark:!bg-slate-900/70 px-2 sm:px-4 flex gap-2"
          onClick={async () => {
            // שים לב שהוספנו async כאן
            const isConfirmed = await confirm({
              title: __("Cancel Edits", "whizmanage"),
              message: __("Are you sure you want to cancel all edits?", "whizmanage"),
              confirmText: __("Yes", "whizmanage"),
              cancelText: __("No", "whizmanage"),
            });

            if (isConfirmed) {
              setData(originalData);
              setEditAll(false);
              setEditingRows(new Set());
              setEditedItems([]);
            }
          }}
        >
          <MdCancel className="h-5 w-5" />
          {__("Cancel", "whizmanage")}
        </Button>
      )}
      <Button
        variant="outline"
        className={cn(
          editAll
            ? "ring-fuchsia-600 ring-1 ring-offset-1 ring-offset-white dark:!ring-offset-slate-700 !bg-fuchsia-50/50 dark:!bg-slate-900/70"
            : "",
          "px-2 sm:px-4 flex gap-2"
        )}
        onClick={() => {
          table.getRowModel().rows.forEach((row) => {
            if (row.original?.subRows?.length === 0) {
              row.toggleExpanded(true);
            }
          });

          editAll ? saveAllEdits() : setEditAll((prev) => !prev);
        }}
      >
        {editAll ? (
          <SaveAll className="h-4 w-4" />
        ) : (
          <MdOutlineEditNote className="h-5 w-5" />
        )}
        {editAll ? __("Save", "whizmanage") : __("Edit All", "whizmanage")}
      </Button>
    </>
  );
};

export default EditAll;
