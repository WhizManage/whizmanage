import axios from "axios";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { ToastContent } from "./ToastContent";
import { postApi } from "/src/services/services";
import { __ } from '@wordpress/i18n';
import { XCircle } from "lucide-react";
import { useProductsContext } from "@/context/ProductsContext";
import { confirm } from "@components/CustomConfirm";
import { chunkBatchPayloads } from "@/utils/networkUtils";

const Toolbar = ({
  setRowSelection,
  table,
  fetchData,
  isTrash,
  isTableImport,
  isLoading,
  setIsLoading
}) => {

  const [selectedRows, setSelectedRows] = useState([]);
  const { data, setData } = useProductsContext();
  const WooCommerceEndpoint = `${window.siteUrl}/wp-json/wc/v3/`;
   

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
    const newSelectedRows = getSelectedRows(table.getRowModel().rows);
    setSelectedRows(newSelectedRows);
  }, [table.getGroupedSelectedRowModel().rows]);

  const deleteProducts = async (delete_permanently) => {

    const isConfirmed = await confirm({
      title: isTrash ? __("Delete Products Permanently", "whizmanage") : __("Move to Trash", "whizmanage"),
      message:
        isTrash || delete_permanently
          ? __(
          "Are you sure you want to permanently delete the selected products? This action cannot be undone.",
          "whizmanage"
        )
          : __(
          "Are you sure you want to move the selected products to the trash? Any selected variations will be permanently deleted. This action cannot be undone.",
          "whizmanage"
        ),
      confirmText:
        isTrash || delete_permanently
          ? __("Delete Permanently", "whizmanage")
          : __("Move to Trash", "whizmanage"),
      cancelText: __("Cancel", "whizmanage"),
    });

    if (isConfirmed) {
      setIsLoading(true);
      const { productsToDelete, subProductsToDelete } = selectedRows.reduce(
        (acc, product) => {
          if (product.depth == 0) {
            acc.productsToDelete.push(product);
          } else {
            acc.subProductsToDelete.push(product);
          }
          return acc;
        },
        { productsToDelete: [], subProductsToDelete: [] }
      );
      if (isTableImport) {
        setData((prevData) =>
          prevData.filter(
            (product) =>
              !productsToDelete.some(
                (deletedProduct) => deletedProduct.original.id === product.id
              )
          )
        );

        setData((prevData) => {
          // יצירת סט מזהים של השורות למחיקה
          const idsToDelete = new Set(
            subProductsToDelete.map((row) => row.original.id)
          );
          // עדכון ה-data כך שהשורות ב-subRows יתעדכנו ללא השורות שצריך למחוק
          return prevData.map((item) => {
            if (Array.isArray(item.subRows)) {
              return {
                ...item,
                subRows: item.subRows.filter(
                  (subRow) => !idsToDelete.has(subRow.id)
                ),
              };
            }
            return item; // אם אין subRows, מחזירים את האובייקט כמו שהוא
          });
        });

        return;
      }

      setSelectedRows([]);
      productsToDelete.map((product) => {
        product.original.status = "trash";
      });

      setIsLoading(true);
      const allProducts = [...productsToDelete, ...subProductsToDelete];

      if (productsToDelete.length > 0) {
        axios
          .post(
            `${window.siteUrl}/wp-json/whizmanage/v1/trash-products`,
            isTrash || delete_permanently
              ? {
                product_ids: allProducts.map(
                  (product) => product.original.id
                ),
                delete_permanently: true,
              }
              : {
                product_ids: productsToDelete.map(
                  (product) => product.original.id
                ),
                delete_permanently: false,
              },
            {
              headers: {
                "X-WP-Nonce": window.rest,
              },
            }
          )
          .then((response) => {
            console.log("Products processed successfully:", response.data);
            setRowSelection({});
            const successfullyIds =
              isTrash || delete_permanently
                ? [
                  ...response.data.processed_ids.deleted,
                  ...subProductsToDelete.map((p) => p.original.id),
                ]
                : [
                  ...response.data.processed_ids.trashed,
                  ...subProductsToDelete.map((p) => p.original.id),
                ];

            setData((prevData) =>
              prevData.filter((product) => {
                if (product.subRows && product.subRows.length > 0) {
                  product.subRows = product.subRows.filter(
                    (subProduct) => !successfullyIds.includes(subProduct.id)
                  );
                }
                return !successfullyIds.includes(product.id);
              })
            );
            setIsLoading(false);
            setSelectedRows([]);
          })
          .catch((error) => {
            console.log(error.response);
            setIsLoading(false);
          });
      } else if (subProductsToDelete.length > 0) {
        axios
          .post(
            `${window.siteUrl}/wp-json/whizmanage/v1/trash-products`,
            {
              product_ids: subProductsToDelete.map(
                (product) => product.original.id
              ),
              delete_permanently: true,
            },
            {
              headers: {
                "X-WP-Nonce": window.rest,
              },
            }
          )
          .then((response) => {
            console.log("Sub-products processed successfully:", response.data);
            setRowSelection({});
            const deletedSubProductIds = subProductsToDelete.map(
              (p) => p.original.id
            );

            setData((prevData) =>
              prevData.map((product) => {
                if (product.subRows && product.subRows.length > 0) {
                  return {
                    ...product,
                    subRows: product.subRows.filter(
                      (subProduct) =>
                        !deletedSubProductIds.includes(subProduct.id)
                    ),
                  };
                }
                return product;
              })
            );
            setIsLoading(false);
          })
          .catch((error) => {
            console.log(error.response);
            setIsLoading(false);
          });
      }
    }
  };

  const restoreProducts = () => {
    const { productsToRestore } = selectedRows.reduce(
      (acc, product) => {
        if (product.depth == 0) {
          // בודק שהמוצר הוא לא תת-מוצר
          acc.productsToRestore.push(product);
        }
        return acc;
      },
      { productsToRestore: [] }
    );
    if (
      window.confirm(
        __(
          "Are you sure you want to restore the selected products? This action will update their status to 'publish'.",
          "whizmanage"
        )
      )
    ) {
      setIsLoading(true);
      axios
        .post(
          WooCommerceEndpoint + "products/batch",
          {
            update: productsToRestore.map((product) => ({
              id: product.original.id,
              status: "publish",
            })),
          },
          {
            headers: {
              "X-WP-Nonce": window.rest,
            },
          }
        )
        .then((response) => {
          fetchData();
          setRowSelection({});
          setIsLoading(false);
        })
        .catch((error) => {
          console.log(error.response.data);
          setIsLoading(false);
        });
    }
  };

  const duplicateProducts = async () => {
    const isConfirmed = await confirm({
      title: __("Duplicate Products", "whizmanage"),
      message: __("Are you sure you want to duplicate the selected products?", "whizmanage"),
      confirmText: __("Duplicate", "whizmanage"),
      cancelText: __("Cancel", "whizmanage"),
    });

    if (!isConfirmed) return;

    const subProductsSelected = selectedRows.filter(({ depth }) => depth !== 0);
    if (subProductsSelected.length > 0) {
      toast(
        <div className="p-4 dark:bg-slate-800 w-full h-full dark:text-slate-300 !border-l-4 !border-l-red-500 rounded-md flex gap-4 items-center justify-start">
          <XCircle className="w-5 h-5 text-red-500" />
          {__("Cannot duplicate variations. Please select only products.", "whizmanage")}
        </div>,
        { duration: 5000 }
      );
      return;
    }

    const productsToDuplicate = selectedRows
      .filter(({ depth }) => depth === 0)
      .map(({ original }) => ({
        ...original,
        id: isTableImport ? original.id + 1000 : null,
        name: original.name + " (copy)",
        status: "draft",
        sku: null,
      }));

    setRowSelection({});

    if (isTableImport) {
      setData((prevData) => [...productsToDuplicate, ...prevData]);
      setSelectedRows([]);
      return;
    }

    setIsLoading(true);
    const responses = await Promise.all(
      productsToDuplicate.map((product) => postDuplicateProduct(product))
    );
    setIsLoading(false);

    const duplicatedItems = responses.filter(item => item !== null);
    const duplicatedIds = duplicatedItems.map(res => res.id);

    if (duplicatedItems.length > 0) {
      await postApi(`${window.siteUrl}/wp-json/whizmanage/v1/history`, {
        location: "products",
        items: duplicatedItems,
        action: "duplicate",
      });
    }

    fetchData(duplicatedIds, true);
  };

  const postDuplicateProduct = async (newData) => {
    try {
      const response = await postApi(WooCommerceEndpoint + "products", newData);
      const newProductId = response.data?.id;

      if (newData.subRows && newData.subRows.length > 0 && newProductId) {
        const createList = newData.subRows.map(v => ({
          id: null,
          parent_id: newProductId,
          regular_price: v.regular_price,
          sku: v.sku,
          attributes: v.attributes.map(a => ({
            name: a.slug || `pa_${a.name.toLowerCase()}`,
            option: a.option
          }))
        }));

        const batches = chunkBatchPayloads(createList, [], [], 100);

        const res = await Promise.all(
          batches.map(batch => {
            if (batch.create.length === 0) return Promise.resolve();
            return postApi(
              `${WooCommerceEndpoint}products/${newProductId}/variations/batch`,
              { create: batch.create }
            );
          })
        );

        console.log(res);
      }

      return response?.data || null;

    } catch (error) {
      console.error(error?.response?.data?.message || error || "Unknown error occurred");
      toast(
        <div className="p-4 dark:bg-slate-800 w-full h-full dark:text-slate-300 !border-l-4 !border-l-red-500 rounded-md flex gap-4 items-center justify-start">
          <XCircle className="w-5 h-5 text-red-500" />
          {error?.response?.data?.message || error || "Unknown error occurred"}
        </div>,
        { duration: 5000 }
      );
      return null;
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
        deleteProducts={deleteProducts}
        restoreProducts={restoreProducts}
        duplicateProducts={duplicateProducts}
        fetchData={fetchData}
        isTrash={isTrash}
        isTableImport={isTableImport}
        setData={setData}
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

  return <div className="hidden"></div>;
};

export default Toolbar;
