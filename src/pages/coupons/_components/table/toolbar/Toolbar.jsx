import axios from "axios";
import { useEffect, useState, useRef } from "react";
import { __ } from '@wordpress/i18n';
import { toast } from "sonner";
import { confirm } from "@components/CustomConfirm";
import { useCouponsContext } from "@/context/CouponsContext";
import { ToastContent } from "./ToastContent";
import { postApi } from "../../../../../services/services";
const Toolbar = ({
  setRowSelection,
  table,
  fetchData,
  isTrash,
  dataProducts,
  setIsLoading,
}) => {
  const { data, setData } = useCouponsContext();
  const [selectedRows, setSelectedRows] = useState([]);
  const WooCommerceEndpoint = `${window.siteUrl}/wp-json/wc/v3/coupons`;
   

  // ref שמחזיק את מזהה הטוסט הנוכחי
  const toastIdRef = useRef(null);

  // בחירת שורות
  const getSelectedRows = (rows) => {
    const rowsSelected = [];
    rows.forEach((row) => {
      if (row.getIsSelected()) {
        rowsSelected.push(row);
      }
    });
    return rowsSelected;
  };

    // מעדכן את selectedRows בכל שינוי בבחירה
  useEffect(() => {
    const newSelectedRows = getSelectedRows(table.getRowModel().rows).map(
      (row) => row.original
    );
    setSelectedRows(newSelectedRows);
  }, [table.getGroupedSelectedRowModel().rows]);

  // מחיקת קופונים
  const deleteCoupons = async (delete_permanently) => {
    const isConfirmed = await confirm({
      title: __("Delete Coupons", "whizmanage"),
      message:
        isTrash || delete_permanently
          ? __(
          "Are you sure you want to permanently delete the selected coupons? This action cannot be undone.",
          "whizmanage"
        )
          : __(
          "Are you sure you want to move the selected coupons to the trash?",
          "whizmanage"
        ),
      confirmText: __("Delete", "whizmanage"),
      cancelText: __("Cancel", "whizmanage"),
    });

    if (isConfirmed) {
      setIsLoading(true);
      const idsToDelete = selectedRows.map((row) => row.id);

      try {
        if (isTrash || delete_permanently) {
          const response = await axios.post(
            `${WooCommerceEndpoint}/batch`,
            {
              delete: idsToDelete,
            },
            {
              headers: { "X-WP-Nonce": window.rest },
            }
          );
          console.log("Deleted successfully:", response.data);
          setRowSelection({});
          setData((prev) => prev.filter((item) => !idsToDelete.includes(item.id)));
        } else {
          const response = await axios.post(
            `${WooCommerceEndpoint}/batch`,
            {
              update: selectedRows.map((row) => ({
                id: row.id,
                status: "trash",
              })),
            },
            {
              headers: { "X-WP-Nonce": window.rest },
            }
          );
          console.log("Moved to trash:", response.data);
          setRowSelection({});
          setData((prev) => prev.filter((item) => !idsToDelete.includes(item.id)));
        }
      } catch (error) {
        console.error("Failed to update/delete coupons:", error);
      } finally {
        setIsLoading(false);
        setSelectedRows([]);
        setRowSelection({});
      }
    }
  };

  // שכפול קופונים
  const duplicateCoupons = async () => {
    const isConfirmed = await confirm({
      title: __("Duplicate Coupons", "whizmanage"),
      message: __("Are you sure you want to duplicate the selected coupons?", "whizmanage"),
      confirmText: __("Duplicate", "whizmanage"),
      cancelText: __("Cancel", "whizmanage"),
    });

    if (isConfirmed) {
      setIsLoading(true);
      try {
        const duplicatePromises = selectedRows.map((row) => {
          const { id, ...rest } = row;
          return axios.post(
            WooCommerceEndpoint,
            {
              ...rest,
              code: `${rest.code}-copy`,
            },
            {
              headers: { "X-WP-Nonce": window.rest },
            }
          );
        });

        const responses = await Promise.all(duplicatePromises);
        const duplicatedCoupons = responses.map((res) => res.data);

        postApi(`${window.siteUrl}/wp-json/whizmanage/v1/history`, {
          location: "coupons",
          items: duplicatedCoupons,
          action: "duplicate",
        });

        setData((prev) => [...duplicatedCoupons, ...prev]);
      } catch (error) {
        console.error("Failed to duplicate coupons:", error);
      } finally {
        setSelectedRows([]);
        setRowSelection({});
        setIsLoading(false);
      }
    }
  };

  // שחזור קופונים
  const restoreCoupons = async () => {
    const isConfirmed = await confirm({
      title: __("Restore Coupons", "whizmanage"),
      message: __("Are you sure you want to restore the selected coupons?", "whizmanage"),
      confirmText: __("Restore", "whizmanage"),
      cancelText: __("Cancel", "whizmanage"),
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
        const idsToRestore = selectedRows.map((row) => row.id);
        setData((prev) => prev.filter((item) => !idsToRestore.includes(item.id)));
      } catch (error) {
        console.error("Failed to restore coupons:", error);
      } finally {
        setSelectedRows([]);
        setIsLoading(false);
        setRowSelection({});
      }
    }
  };

  // מנהל פתיחה/סגירה/עדכון של הטוסט
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

    // פתיחת טוסט חדש עם תוכן מעודכן
    const id = toast(
      <ToastContent
        table={table}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        setRowSelection={setRowSelection}
        deleteCoupons={deleteCoupons}
        restoreCoupons={restoreCoupons}
        duplicateCoupons={duplicateCoupons}
        isTrash={isTrash}
        dataProducts={dataProducts}
        setData={setData}
        data={data}
      />,
      {
        duration: 500000,
        position: "bottom-center",
      }
    );
    toastIdRef.current = id;
  };

  useEffect(() => {
    handleToast();
  }, [selectedRows]);

  return <div className="hidden" />;
};

export default Toolbar;
