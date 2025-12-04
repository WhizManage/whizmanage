import { cn } from "@/lib/utils";
import { useCouponsContext } from "@/context/CouponsContext";
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
}) => {
  const [originalData, setOriginalData] = useState([]);
  const { data, setData } = useCouponsContext();
   

  useEffect(() => {
    if (editAll && data && data.length > 0) {
      setOriginalData(JSON.parse(JSON.stringify(data)));
    }
  }, [editAll, data]);


  const sendBatchUpdate = async (items) => {
    const WooCommerceEndpoint = `${window.siteUrl}/wp-json/wc/v3/`;

    try {
      const res = await axios.post(
        WooCommerceEndpoint + "coupons/batch",
        { update: items },
        { headers: { "X-WP-Nonce": window.rest } }
      );

      const errorIds = new Set(res.data.update.filter(item => item?.error).map(item => item.id));
      setData(prev => prev.map(item => errorIds.has(item.id) ? originalData.find(org => org.id === item.id) : item));

      if (errorIds.size > 0) {
        toast(
          <div className="p-4 dark:bg-slate-800 w-full h-full dark:text-slate-300 !border-l-4 !border-l-yellow-500 rounded-md flex gap-4 items-center justify-start">
            <XCircle className="w-5 h-5 text-yellow-500" />
            {__("Some updates failed.", "whizmanage")}
          </div>,
          { duration: 5000 }
        );
      } else {
        toast(
          <div className="p-4 dark:bg-slate-800 w-full h-full dark:text-slate-400 !border-l-4 !border-l-fuchsia-600 rounded-md flex gap-4 items-center justify-start">
            <CheckCircle className="w-5 h-5 text-fuchsia-600" />
            {__("The updates have been saved successfully.", "whizmanage")}
          </div>,
          { duration: 5000 }
        );
      }
    } catch (error) {
      setData(originalData);
      toast(
        <div className="p-4 dark:bg-slate-800 w-full h-full dark:text-slate-300 !border-l-4 !border-l-red-500 rounded-md flex gap-4 items-center justify-start">
          <XCircle className="w-5 h-5 text-red-500" />
          {error?.response?.data?.message || error.message || "Unknown error occurred"}
        </div>,
        { duration: 5000 }
      );
    }
  };

  const saveAllEdits = () => {
    const itemsToSave = data
      .filter((item) => editedItems.includes(item.id))
      .map(({ attributes, ...rest }) => rest);

    const batches = chunkBatchPayloads([], itemsToSave, [], 100);

    // שליחה של כל batch – לא מחכים לתוצאה
    batches.forEach((batch) => {
      if (batch.update.length > 0) {
        sendBatchUpdate(batch.update);
      }
    });

    // עדיין שולח היסטוריה (גם לא מחכה)
    const changedFields = getChangedFields(
      originalData.filter((item) => editedItems.includes(item.id)),
      data.filter((item) => editedItems.includes(item.id))
    );

    if (changedFields.length > 0) {
      postApi(`${window.siteUrl}/wp-json/whizmanage/v1/history`, {
        location: "coupons",
        items: changedFields,
        action: "put",
      });
    }

    // איפוס ה-UI מיידית
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
        onClick={(event) => {
          const toggleAll = table.getToggleAllRowsExpandedHandler();
          !table.getIsAllRowsExpanded() && toggleAll(event);
          editAll ? saveAllEdits() : setEditAll((editAll) => !editAll);
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
