import axios from "axios";
import { useEffect, useState, useRef } from "react";
import { __ } from '@wordpress/i18n';
import { toast } from "sonner";
import { confirm } from "@components/CustomConfirm";
import { useOrdersContext } from "@/context/OrdersContext";
import { ToastContent } from "./ToastContent";
import { postApi, putApi } from "../../../../../services/services";
import { CheckIcon } from 'lucide-react';

const Toolbar = ({
  setRowSelection,
  table,
  fetchData,
  isTrash,
  ordersData,
  isLoading,
  setIsLoading
}) => {
  const { data, setData } = useOrdersContext();
  const [selectedRows, setSelectedRows] = useState([]);
  const WooCommerceEndpoint = `${window.siteUrl}/wp-json/wc/v3/orders`;
   

  // ref שמחזיק את מזהה הטוסט הנוכחי
  const toastIdRef = useRef(null);

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
    const newSelectedRows = getSelectedRows(table.getRowModel().rows).map(
      (row) => row.original
    );
    setSelectedRows(newSelectedRows);
  }, [table.getGroupedSelectedRowModel().rows]);

  const deleteOrders = async (delete_permanently) => {
    const isConfirmed = await confirm({
      title: __(Delete Orders"),
      message: isTrash || delete_permanently
        ? __(Are you sure you want to permanently delete the selected orders? This action cannot be undone.")
        : __(Are you sure you want to move the selected orders to the trash?"),
      confirmText: __(Delete"),
      cancelText: __(Cancel"),
    });

    if (isConfirmed) {
      setIsLoading(true);

      // Separate orders and refunds
      const orderRows = selectedRows.filter(row => +row.parent_id === 0);
      const refundRows = selectedRows.filter(row => +row.parent_id > 0);

      try {
        // Handle orders deletion
        if (orderRows.length > 0) {
          if (isTrash || delete_permanently) {
            // Permanently delete orders
            const response = await axios.post(
              `${WooCommerceEndpoint}/batch`,
              {
                delete: orderRows.map((row) => row.id),
              },
              {
                headers: { "X-WP-Nonce": window.rest },
              }
            );
            console.log("Deleted orders successfully:", response.data);
          } else {
            // Move orders to trash
            const response = await axios.post(
              `${WooCommerceEndpoint}/batch`,
              {
                update: orderRows.map((row) => ({
                  id: row.id,
                  status: "trash",
                })),
              },
              {
                headers: { "X-WP-Nonce": window.rest },
              }
            );
            console.log("Moved orders to trash:", response.data);
          }
        }

        // Handle refunds deletion
        if (refundRows.length > 0) {
          // For refunds, we need to delete them individually using the specific endpoint
          for (const refund of refundRows) {
            const orderId = refund.parent_id;
            const refundId = refund.id;

            await putApi(`${WooCommerceEndpoint}/${orderId}`, { status: "completed" });
            const refundResponse = await axios.delete(
              `${WooCommerceEndpoint}/${orderId}/refunds/${refundId}`,
              {
                headers: { "X-WP-Nonce": window.rest },
              }
            );
            console.log(`Deleted refund ${refundId} for order ${orderId}:`, refundResponse.data);
          }
        }

        // Update the UI
        const idsToDelete = [...refundRows, ...orderRows].map(row => row.id);

        setRowSelection({});
        setData((prev) => {
          return prev
            .filter(item => !idsToDelete.includes(item.id))
            .map(item => {
              if (item.subRows && item.subRows.length > 0) {
                return {
                  ...item,
                  subRows: item.subRows.filter(subItem => !idsToDelete.includes(subItem.id))
                };
              }
              return item;
            });
        });

      } catch (error) {
        console.error("Failed to update/delete orders or refunds:", error);
      } finally {
        setIsLoading(false);
        setSelectedRows([]);
        setRowSelection({});
      }
    }
  };

  const duplicateOrders = async () => {
    const isConfirmed = await confirm({
      title: __(Duplicate Orders"),
      message: __(Are you sure you want to duplicate the selected orders?"),
      confirmText: __(Duplicate"),
      cancelText: __(Cancel"),
    });

    if (!isConfirmed) return;

    try {
      const makeOrdersReadyToDuplicate = selectedRows.map(row => {
        const { id, ...rest } = row;

        let processedLineItems = [];
        if (Array.isArray(rest.line_items)) {
          processedLineItems = rest.line_items.map(item => {
            const { id: itemId, ...itemRest } = item; // הסר ID של הפריט
            return itemRest;
          });
        } else {
          console.warn(`Order ${id} is missing line_items array.`);
        }

        const payload = {
          ...rest,
          line_items: processedLineItems,
          status: 'pending',
          set_paid: false
        };

        delete payload.id;
        delete payload.number;
        delete payload.order_key;
        delete payload.date_created;
        delete payload.date_created_gmt;
        delete payload.date_modified;
        delete payload.date_modified_gmt;
        return payload;
      });

      const response = await axios.post(
        `${WooCommerceEndpoint}/batch`,
        {
          create: makeOrdersReadyToDuplicate,
        },
        {
          headers: { "X-WP-Nonce": window.rest },
        }
      );

      const duplicatedOrders = response?.data?.create;

      postApi(`${window.siteUrl}/wp-json/whizmanage/v1/history`, {
        location: "orders",
        items: duplicatedOrders,
        action: "duplicate"
      });

      setSelectedRows([]); // נקה את השורות שנבחרו מה-state
      setRowSelection({}); // אפס את הבחירה בטבלה (תלוי בספריית הטבלה)
      console.log("Orders duplicated successfully:", response.data.create);
      setData(prev => [...response.data.create, ...prev]);
      toast(
        <div className="p-4 w-full h-full !border-l-4 !border-l-fuchsia-600 dark:bg-slate-800 dark:text-slate-300 rounded-md flex gap-4 items-center justify-start">
          <CheckIcon className="w-5 h-5 text-fuchsia-600" />
          {__("New orders has been duplicated successfully")}
        </div>,
        { duration: 5000 }
      );
    } catch (error) {
      console.error("Failed to duplicate orders:", error.response?.data || error.message || error);
    }
  };

  const restoreOrders = async () => {
    const isConfirmed = await confirm({
      title: __(Restore Orders"),
      message: __(Are you sure you want to restore the selected orders?"),
      confirmText: __(Restore"),
      cancelText: __(Cancel"),
    });

    if (isConfirmed) {
      setIsLoading(true);
      try {
        const response = await axios.post(
          `${WooCommerceEndpoint}/batch`,
          {
            update: selectedRows.map((row) => ({
              id: row.id,
              status: "publish",
            })),
          },
          {
            headers: { "X-WP-Nonce": window.rest },
          }
        );
        console.log("Restored successfully:", response.data);
        const idsToRestore = selectedRows.map(row => row.id);
        setData((prev) => prev.filter(item => !idsToRestore.includes(item.id)));
      } catch (error) {
        console.error("Failed to restore orders:", error);
      } finally {
        setSelectedRows([]);
        setIsLoading(false);
        setRowSelection({});
      }
    }
  };

  const handleToast = () => {
    // אם יש טוסט פתוח – סגור אותו לפני הצגת החדש
    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }

    // אם אין בחירה – לא נפתח טוסט
    if (selectedRows.length === 0) {
      return;
    }


    const id = toast(
      <ToastContent
        table={table}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        setRowSelection={setRowSelection}
        deleteOrders={deleteOrders}
        restoreOrders={restoreOrders}
        duplicateOrders={duplicateOrders}
        isTrash={isTrash}
        setData={setData}
        ordersData={ordersData}
      />,
      {
        duration: 500000,
        position: "bottom-center",
      }
    );
    toastIdRef.current = id;
  }

  useEffect(() => {
    handleToast();
  }, [selectedRows]);

  return <div className="hidden" />;
};

export default Toolbar;
