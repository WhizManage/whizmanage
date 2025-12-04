import CustomTooltip from "@components/nextUI/Tooltip";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ScrollShadow,
  useDisclosure,
} from "@heroui/react";
import axios from "axios";
import { CheckCircle, RefreshCcw, Settings2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import BulkEditRow from "./BulkEditRow";
import SelectedRows from "./SelectedRows";

import { __ } from '@wordpress/i18n';
import { OrdersBulkEditRows } from "../../../../../../data/ordersBulkEditRows";
import { getChangedFields } from "@/utils/historyUtils";
import { chunkBatchPayloads } from "@/utils/networkUtils";
import { postApi } from "../../../../../../services/services";

function BulkEdit({ table, setHideToolbar, setData }) {
  const WooCommerceEndpoint = `${window.siteUrl}/wp-json/wc/v3/`;
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState(OrdersBulkEditRows);
  const [selectedRows, setSelectedRows] = useState([]);
   

  const getSelectedRows = (rows) => {
    let rowsSelected = [];
    const traverseRows = (rows) => {
      rows.forEach((row) => {
        if (row.getIsSelected()) {
          rowsSelected.push(row);
        }
      });
    };
    traverseRows(rows);
    return rowsSelected;
  };

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      const wasAnyChange = JSON.stringify(rows) !== JSON.stringify(OrdersBulkEditRows);
      if (wasAnyChange) {
        const confirmationMessage = __(You have unsaved changes. Are you sure you want to leave?");
        event.returnValue = confirmationMessage;
        return confirmationMessage;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [rows, OrdersBulkEditRows]);

  useEffect(() => {
    const newSelectedRows = getSelectedRows(table.getRowModel().rows);
    setSelectedRows(newSelectedRows);
  }, []);

  useEffect(() => {
    const newHideToolbar = isOpen;
    setHideToolbar(newHideToolbar);
  }, [isOpen, setHideToolbar]);

  const handleRowChange = (index, field, value) => {
    setRows((currentRows) =>
      currentRows.map((row, idx) => {
        if (idx === index) {
          return { ...row, [field]: value };
        }
        return row;
      })
    );
  };

  const sendBatchUpdate = async (items) => {
    return await axios.post(
      WooCommerceEndpoint + "orders/batch",
      { update: items },
      { headers: { "X-WP-Nonce": window.rest } }
    );
  };

  const onSaveChanges = (onClose) => {
    setIsLoading(true);

    // 1) בנה payload לעדכון הזמנות (ללא הערות)
    const updatedData = selectedRows.map((row) => {
      const newRow = { ...row.original };

      rows.forEach((editRow) => {
        if (editRow.value !== "" && editRow.value !== "No Change") {

          if (editRow.type === "date") {
            if (editRow.value) {
              const newDate = new Date(editRow.value);
              const newIsoString = newDate.toISOString().split("T")[0] + "T00:00:00";
              newRow.date_created_gmt = newIsoString;
            } else {
              newRow[editRow.id] = null;
            }

          } else if (editRow.id === "private_note" || editRow.id === "message_to_customer") {
            // דלג: הערות מטופלות בקריאת bulk נפרדת
            return;

          } else if (editRow.options && (editRow.value === "yes" || editRow.value === "no")) {
            newRow[editRow.id === "paid" ? "set_paid" : editRow.id] = (editRow.value === "yes");

          } else if (editRow.options || editRow.type === "input") {
            newRow[editRow.id] = editRow.value;

          } else {
            const fieldToUpdate = editRow.id;
            const referenceBase = editRow.referenceBase || fieldToUpdate;
            const originalValue = parseFloat(newRow[referenceBase]) || 0;
            const changeValue = parseFloat(editRow.value);

            if (!isNaN(changeValue)) {
              if (editRow.changeType === "Increase") {
                newRow[fieldToUpdate] = editRow.valueType === "%" ? originalValue * (1 + changeValue / 100) : originalValue + changeValue;
              } else if (editRow.changeType === "Decrease") {
                newRow[fieldToUpdate] = editRow.valueType === "%" ? originalValue * (1 - changeValue / 100) : originalValue - changeValue;
              } else if (editRow.changeType === "New Value") {
                newRow[fieldToUpdate] = changeValue;
              }
            }
          }
        }
      });

      return newRow;
    });

    // 2) הכן את בקשת הבאלק להערות (אם מולאו)
    const privateNoteRow = rows.find(r => r.id === "private_note");
    const customerNoteRow = rows.find(r => r.id === "message_to_customer");
    const privateNoteVal = (privateNoteRow?.value || "").trim();
    const customerNoteVal = (customerNoteRow?.value || "").trim();

    const hasNotes = !!privateNoteVal || !!customerNoteVal;
    const selectedOrderIds = selectedRows.map(r => r.original.id);

    const buildOrdersNotesPayload = () => {
      // לכל הזמנה במבחר, שים את השדות שקיימים בפועל
      return selectedOrderIds.map(id => ({
        order_id: id,
        ...(privateNoteVal ? { private_note: privateNoteVal } : {}),
        ...(customerNoteVal ? { customer_note: customerNoteVal } : {}),
      }));
    };

    console.log(buildOrdersNotesPayload());
    const chunks = chunkBatchPayloads([], updatedData, []);
    const updatePromises = chunks.map(chunk => sendBatchUpdate(chunk.update));

    Promise.all(updatePromises)
      .then(async (responses) => {
        // עדכון טבלת הנתונים (כמו אצלך)
        const allUpdated = responses.flatMap(res => res.data.update);
        const updatedIds = new Set(allUpdated.map(item => item.id));

        setData(prev =>
          prev.map(item =>
            updatedIds.has(item.id)
              ? allUpdated.find(updated => updated.id === item.id)
              : item
          )
        );

        const changedFields = getChangedFields(
          selectedRows.map((r) => r.original),
          updatedData
        );

        if (changedFields.length > 0) {
          postApi(`${window.siteUrl}/wp-json/whizmanage/v1/history`, {
            location: "orders",
            items: changedFields,
            action: "put",
          });
        }

        // >>> notes bulk
        if (hasNotes) {
          const res = await postApi(`${window.siteUrl}/wp-json/wm/v1/order_note`, {
            orders: buildOrdersNotesPayload(),
            include_notes: true, // ✅ תמיד true כדי לקבל notes
          });

          const data = res?.data;
          if (data?.success && Array.isArray(data.results)) {
            data.results.forEach(item => {
              if (item?.success && Array.isArray(item.notes)) {
                setData(prev => prev.map(order => order.id == item.order_id ? { ...order, order_notes: item.notes } : order));
              }
            });
          }
        }
      })
      .then(() => {
        setIsLoading(false);
        onClose();
        setSelectedRows([]);
        table.resetRowSelection();

        // אפס את שדות ההערות בטופס הבאלק
        if (privateNoteRow) handleRowChange(rows.indexOf(privateNoteRow), "value", "");
        if (customerNoteRow) handleRowChange(rows.indexOf(customerNoteRow), "value", "");

        toast(
          <div className="p-4 dark:bg-slate-800 w-full h-full dark:text-slate-400 !border-l-4 !border-l-fuchsia-600 rounded-md flex gap-4 items-center justify-start">
            <CheckCircle className="w-5 h-5 text-fuchsia-600" />
            {__("The updates have been saved successfully.")}
          </div>,
          { duration: 5000 }
        );
      })
      .catch((error) => {
        setIsLoading(false);
        toast(
          <div className="p-4 dark:bg-slate-800 w-full h-full dark:text-slate-300 !border-l-4 !border-l-red-500 rounded-md flex gap-4 items-center justify-start">
            <XCircle className="w-5 h-5 text-red-500" />
            {error?.response?.data?.message || error.message || "Unknown error occurred"}
          </div>,
          { duration: 5000 }
        );
      });
  };

  return (
    <>
      <CustomTooltip title={__("Bulk edit")}>
        <button
          className="flex flex-col w-full items-center justify-center gap-2 p-5 border-r hover:bg-fuchsia-50 dark:hover:bg-slate-800/50 hover:cursor-pointer"
          onClick={onOpen}
        >
          <Settings2 />
        </button>
      </CustomTooltip>
      <Modal
        size="5xl"
        scrollBehavior="inside"
        backdrop="opaque"
        className=" !overflow-hidden"
        classNames={{
          backdrop:
            "bg-gradient-to-t from-zinc-800 to-zinc-800/30 backdrop-opacity-20 !overflow-hidden",
        }}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        isDismissable={false}
        motionProps={{
          variants: {
            enter: {
              y: 0,
              opacity: 1,
              transition: {
                duration: 0.3,
                ease: "easeOut",
              },
            },
            exit: {
              y: -20,
              opacity: 0,
              transition: {
                duration: 0.2,
                ease: "easeIn",
              },
            },
          },
        }}
      >
        <ModalContent className="dark:bg-gray-900">
          {(onClose) => (
            <>
              <ModalHeader className="flex gap-1 text-center text-3xl justify-center">
                <h2 className="text-center dark:text-gray-400">
                  {__("Bulk Edit")}
                </h2>
              </ModalHeader>
              <ModalBody>
                <ScrollShadow size={10} className="w-full h-full">
                  <div className="w-full flex flex-col gap-4 items-center justify-center">
                    <SelectedRows
                      selectedRows={selectedRows}
                      setSelectedRows={setSelectedRows}
                      table={table}
                    />
                    <div className="w-full">
                      <h2 className="w-full text-start text-xl dark:text-gray-300 p-2 font-semibold">
                        {__("Edit fields")}
                      </h2>
                      <div className="w-full shadow dark:shadow-xl !rounded-lg border border-neutral-200 dark:border-slate-700 overflow-auto scroll-smooth select-none !max-h-96 !scrollbar-hide scrollbar-none">
                        <table className="table-auto w-full dark:bg-slate-800 min-w-full max-w-[100%] divide-y divide-gray-200 scroll-smooth dark:divide-gray-500">
                          <thead className="border-b z-10  sticky top-0 h-8 dark:border-b-slate-700 bg-slate-100 dark:bg-slate-900">
                            <tr>
                              <th className="w-32 p-2 text-start text-slate-400 !font-semibold">
                                {__("Field to Edit")}
                              </th>
                              <th className="w-32 p-2 text-center text-slate-400 !font-semibold">
                                {__("Change Amount")}
                              </th>
                              <th className="w-32 p-2 text-center text-slate-400 !font-semibold">
                                {__("Change Type")}
                              </th>
                              <th className="w-32 p-2 text-center text-slate-400 !font-semibold">
                                {__("Value Type")}
                              </th>
                              <th className="w-32 p-2 text-center text-slate-400 !font-semibold">
                                {__("Reference Base")}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y-1 dark:divide-slate-700 rounded-b-md overflow-x-hidden">

                            {rows.map((row, index) => (
                              <BulkEditRow
                                key={index}
                                row={row}
                                handleRowChange={handleRowChange}
                                index={index}
                              />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </ScrollShadow>
              </ModalBody>
              <ModalFooter className="">
                <Button
                  color="primary"
                  onClick={() => onSaveChanges(onClose)}
                  className="flex gap-2"
                  disabled={false}
                >
                  {__("Save changes")}
                  {isLoading && (
                    <RefreshCcw className="text-white w-5 h-5 animate-spin" />
                  )}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}

export default BulkEdit;
