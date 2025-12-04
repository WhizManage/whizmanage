
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
import { __ } from '@wordpress/i18n';
import { toast } from "sonner";
import AddLabelsItem from "./AddLabelsItem";
import BulkEditRow from "./BulkEditRow";
import SelectedRows from "./SelectedRows";

import { CouponsBulkEditRows } from "@/data/couponsBulkEditRows";
import { getChangedFields } from "@/utils/historyUtils";
import { postApi } from "../../../../../../services/services";
import CustomTooltip from "@/components/nextUI/Tooltip";
import { chunkBatchPayloads } from "@/utils/networkUtils";

export const MULTI_SELECT_FIELDS = {
  product_categories: {
    id: "product_categories",
    label: "Product categories",
  },
  excluded_product_categories: {
    id: "excluded_product_categories",
    label: "Excluded Product Categories",
  },
  product_ids: {
    id: "product_ids",
    label: "Products",
  },
  excluded_product_ids: {
    id: "excluded_product_ids",
    label: "Excluded Products",
  },
};

function BulkEdit({ table, setHideToolbar, dataProducts, setData, data }) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState(CouponsBulkEditRows);
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
      const wasAnyChange =
        JSON.stringify(rows) !== JSON.stringify(CouponsBulkEditRows);
      if (wasAnyChange) {
        const confirmationMessage = __("You have unsaved changes. Are you sure you want to leave?", "whizmanage");
        event.returnValue = confirmationMessage;
        return confirmationMessage;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [rows, CouponsBulkEditRows]);

  useEffect(() => {
    const newSelectedRows = getSelectedRows(table.getRowModel().rows);
    setSelectedRows(newSelectedRows);
  }, []);

  useEffect(() => {
    const newHideToolbar = isOpen;
    setHideToolbar(newHideToolbar);
  }, [isOpen, setHideToolbar]);

  useEffect(() => {
    const selected = table.getSelectedRowModel().rows;
    setSelectedRows(selected);
  }, [table.getState().rowSelection]);

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
    const WooCommerceEndpoint = `${window.siteUrl}/wp-json/wc/v3/`;

    try {
      const res = await axios.post(
        WooCommerceEndpoint + "coupons/batch",
        { update: items },
        { headers: { "X-WP-Nonce": window.rest } }
      );

      const errorIds = new Set(
        res.data.update.filter((item) => item?.error).map((item) => item.id)
      );

      if (errorIds.size > 0) {
        const originalsMap = Object.fromEntries(
          selectedRows.map(row => [row.original.id, row.original])
        );

        setData((prev) =>
          prev.map((item) =>
            errorIds.has(item.id)
              ? originalsMap[item.id] || item
              : item
          )
        );

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
        return res;
      }
    } catch (error) {
      const ids = new Set(items.map((item) => item.id));
      setData((prev) =>
        prev.map((item) =>
          ids.has(item.id) ? items.find((i) => i.id === item.id) : item
        )
      );
      toast(
        <div className="p-4 dark:bg-slate-800 w-full h-full dark:text-slate-300 !border-l-4 !border-l-red-500 rounded-md flex gap-4 items-center justify-start">
          <XCircle className="w-5 h-5 text-red-500" />
          {error?.response?.data?.message ||
            error.message ||
            "Unknown error occurred"}
        </div>,
        { duration: 5000 }
      );
    }
  };
  
 const onSaveChanges = async (onClose) => {
  setIsLoading(true);

  const data = selectedRows.map((row) => {
    const newRow = { ...row.original };

    rows.forEach((editRow) => {
      if (editRow.value !== "" && editRow.value !== "No Change") {
        if (
          Object.keys(MULTI_SELECT_FIELDS).includes(editRow.id) &&
          newRow[editRow.id] !== undefined
        ) {
          newRow[editRow.id] = [
            ...new Set([...newRow[editRow.id], ...editRow.value]),
          ];
        } else if (editRow.type === "date") {
          if (editRow.value) {
            const newDate = new Date(editRow.value);
            const newIsoString =
              newDate.toISOString().split("T")[0] + "T00:00:00";
            newRow[editRow.id] = newIsoString;
          } else {
            newRow[editRow.id] = null;
          }
        } else if (
          editRow.options &&
          (editRow.value === "yes" || editRow.value === "no")
        ) {
          if (newRow[editRow.id] !== undefined) {
            newRow[editRow.id] = editRow.value === "yes";
          }
        } else if (editRow.options) {
          newRow[editRow.id] = editRow.value;
        } else {
          const fieldToUpdate = editRow.id;
          const referenceBase = editRow.referenceBase || fieldToUpdate;
          const originalValue = parseFloat(newRow[referenceBase]) || 0;
          const changeValue = parseFloat(editRow.value);

          if (!isNaN(changeValue)) {
            if (editRow.changeType === "Increase") {
              newRow[fieldToUpdate] =
                editRow.valueType === "%"
                  ? originalValue * (1 + changeValue / 100)
                  : originalValue + changeValue;
            } else if (editRow.changeType === "Decrease") {
              newRow[fieldToUpdate] =
                editRow.valueType === "%"
                  ? originalValue * (1 - changeValue / 100)
                  : originalValue - changeValue;
            } else if (editRow.changeType === "New Value") {
              newRow[fieldToUpdate] = changeValue;
            }
          }
        }
      }
    });

    return newRow;
  });

  const batches = chunkBatchPayloads([], data, [], 100);

  try {
    const allResults = await Promise.all(
      batches.map((batch) =>
        batch.update.length > 0 ? sendBatchUpdate(batch.update) : null
      )
    );

    // איסוף כל הפריטים שעודכנו
    const updatedItems = allResults
      .filter(Boolean)
      .flatMap((res) => res.data.update);

    const updatedIds = new Set(updatedItems.map((item) => item.id));

    // עדכון ה־data
    setData((prev) =>
      prev.map((item) =>
        updatedIds.has(item.id)
          ? updatedItems.find((edited) => edited.id === item.id)
          : item
      )
    );

    const beforeArr = selectedRows.map((row) => row.original);
    const afterArr = updatedItems;

    const changedFields = getChangedFields(beforeArr, afterArr);
    const excludeKeys = ["date_created_gmt", "date_modified_gmt"];

    const filteredChangedFields = changedFields.map((item) => ({
      id: item.id,
      old: Object.fromEntries(
        Object.entries(item.old).filter(([key]) => !excludeKeys.includes(key))
      ),
      new: Object.fromEntries(
        Object.entries(item.new).filter(([key]) => !excludeKeys.includes(key))
      ),
    }));

    if (changedFields.length > 0) {
      await postApi(`${window.siteUrl}/wp-json/whizmanage/v1/history`, {
        location: "coupons",
        items: filteredChangedFields,
        action: "put",
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
    console.error("🔥 Batch update error:", error);
    toast(
      <div className="p-4 dark:bg-slate-800 w-full h-full dark:text-slate-300 !border-l-4 !border-l-red-500 rounded-md flex gap-4 items-center justify-start">
        <XCircle className="w-5 h-5 text-red-500" />
        {String(
          error?.response?.data?.message ||
          error?.message ||
          "Unknown error occurred"
        )}
      </div>,
      { duration: 5000 }
    );
  }

  setIsLoading(false);
  onClose();
  table.resetRowSelection();
};


  return (
    <>
      <CustomTooltip title={__("Bulk edit", "whizmanage")}>
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
                  {__("Bulk Edit", "whizmanage")}
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
                        {__("Coupon Scope", "whizmanage")}
                      </h2>
                      <div className="w-full shadow dark:shadow-xl !rounded-lg border border-neutral-200 dark:border-slate-700 overflow-auto scroll-smooth select-none !scrollbar-hide scrollbar-none">
                        <table className="table-auto w-full dark:bg-slate-800 min-w-full max-w-[100%] divide-y divide-gray-200 scroll-smooth dark:divide-gray-500">
                          <thead className="border-b z-10  sticky top-0 h-8 dark:border-b-slate-700 bg-slate-100 dark:bg-slate-900">
                            <tr>
                              <th className="!w-32 p-2 text-start text-slate-400 !font-semibold">
                                {__("Type", "whizmanage")}
                              </th>
                              <th className="p-2 text-start text-slate-400 !font-semibold">
                                {__("Items", "whizmanage")}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y-1 dark:divide-slate-700 rounded-b-md overflow-x-hidden">
                            {rows.slice(0, 4).map((row, index) => (
                              <tr className="hover:bg-gray-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all">
                                <td className="px-2 h-12 text-base capitalize whitespace-nowrap">
                                  {__(MULTI_SELECT_FIELDS[row.id]?.label, "whizmanage")}
                                </td>
                                <td className="px-2 h-12 text-base capitalize">
                                  <AddLabelsItem
                                    handleRowChange={handleRowChange}
                                    index={index}
                                    columnName={row.id}
                                    dataProducts={dataProducts}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="w-full">
                      <h2 className="w-full text-start text-xl dark:text-gray-300 p-2 font-semibold">
                        {__("Edit fields", "whizmanage")}
                      </h2>
                      <div className="w-full shadow dark:shadow-xl !rounded-lg border border-neutral-200 dark:border-slate-700 overflow-auto scroll-smooth select-none !max-h-96 !scrollbar-hide scrollbar-none">
                        <table className="table-auto w-full dark:bg-slate-800 min-w-full max-w-[100%] divide-y divide-gray-200 scroll-smooth dark:divide-gray-500">
                          <thead className="border-b z-10  sticky top-0 h-8 dark:border-b-slate-700 bg-slate-100 dark:bg-slate-900">
                            <tr>
                              <th className="w-32 p-2 text-start text-slate-400 !font-semibold">
                                {__("Field to Edit", "whizmanage")}
                              </th>
                              <th className="w-32 p-2 text-center text-slate-400 !font-semibold">
                                {__("Change Amount", "whizmanage")}
                              </th>
                              <th className="w-32 p-2 text-center text-slate-400 !font-semibold">
                                {__("Change Type", "whizmanage")}
                              </th>
                              <th className="w-32 p-2 text-center text-slate-400 !font-semibold">
                                {__("Value Type", "whizmanage")}
                              </th>
                              <th className="w-32 p-2 text-center text-slate-400 !font-semibold">
                                {__("Reference Base", "whizmanage")}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y-1 dark:divide-slate-700 rounded-b-md overflow-x-hidden">
                            {rows.slice(4).map((row, index) => (
                              <BulkEditRow
                                key={index}
                                row={row}
                                handleRowChange={handleRowChange}
                                index={index + 4}
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
                  {__("Save changes", "whizmanage")}
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
