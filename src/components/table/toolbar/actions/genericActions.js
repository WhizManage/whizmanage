// src/components/table/toolbar/actions/genericActions.js

import { toast } from "@/lib/utils";
import { chunkBatchPayloads } from "@/components/table/utils/networkUtils";
import { postApi } from "@/services/services";
import { confirm } from "@components/ui/custom/CustomConfirm";
import axios from "axios";

export const createGenericActions = (config) => {
  const {
    entityName,
    endpoint,
    setData,
    setRowSelection,
    setIsLoading,
    __,
    isTrash = false,
    queryClient,
  } = config;

  const toEntity = (rowOrEntity) => rowOrEntity?.original ?? rowOrEntity;

  // ✅ קבוע פשוט שנחשב פעם אחת
  const n = String(entityName || "").toLowerCase();
  const IS_PRODUCT_ENTITY = n === "products" || n === "product";

  const deleteItems = async (selectedRows, deletePermanently = false) => {
    const actionType = isTrash || deletePermanently ? "delete" : "trash";

    const isConfirmed = await confirm({
      title:
        actionType === "delete"
          ? __("Delete {{entityName}}", { entityName: __(entityName, "whizmanage") })
          : __("Move to Trash", "whizmanage"),
      message:
        actionType === "delete"
          ? __(
            "Are you sure you want to permanently delete the selected {{entityName}}? This action cannot be undone.",
            { entityName: __(entityName, "whizmanage") }
          )
          : __("Are you sure you want to move the selected {{entityName}} to the trash?", {
            entityName: __(entityName, "whizmanage"),
          }),
      confirmText:
        actionType === "delete" ? __("Delete Permanently", "whizmanage") : __("Move to Trash", "whizmanage"),
      cancelText: __("Cancel", "whizmanage"),
    });

    if (!isConfirmed) return;

    setIsLoading(true);

    const entitiesToHandle = selectedRows.map(toEntity);
    // Relaxed ID check: allow any truthy ID (string or number)
    const idsToDelete = entitiesToHandle
      .map((e) => e?.id)
      .filter((id) => id != null && id !== "")
      .map(String);

    try {
      if (actionType === "delete") {
        await axios.post(
          `${endpoint}/batch`,
          { delete: idsToDelete },
          { headers: { "X-WP-Nonce": window.rest } }
        );
      } else {
        await axios.post(
          `${endpoint}/batch`,
          {
            update: idsToDelete.map((id) => ({ id, status: "trash" })),
          },
          { headers: { "X-WP-Nonce": window.rest } }
        );

        window.dispatchEvent?.(
          new CustomEvent("wm:trash:moved", {
            detail: {
              ids: idsToDelete,
              items: entitiesToHandle,
              entity: entityName || "items",
            },
          })
        );
      }

      // 1. Update Local Store
      setData((prev) =>
        prev
          .filter((item) => !idsToDelete.includes(String(item.id)))
          .map((item) =>
            item.subRows?.length
              ? {
                ...item,
                subRows: item.subRows.filter(
                  (sub) => !idsToDelete.includes(String(sub.id))
                ),
              }
              : item
          )
      );

      // 2. Update React Query Cache (Current View)
      if (queryClient) {
        queryClient.setQueriesData({ queryKey: [entityName] }, (oldData) => {
          if (!oldData || !oldData.rows) return oldData;
          return {
            ...oldData,
            rows: oldData.rows.filter((row) => !idsToDelete.includes(String(row.id))),
            total: Math.max(0, (oldData.total || 0) - idsToDelete.length),
          };
        });
      }

      setRowSelection({});

      // שמירה להיסטוריה
      try {
        await postApi(`${window.siteUrl}/wp-json/whizmanage/v1/history`, {
          location: entityName.toLowerCase(),
          action: "delete",
          items: entitiesToHandle.map((item) => ({
            id: item.id,
            old: item,
            name: item.name || item.title || `#${item.id}`,
          })),
        });
      } catch (historyError) {
        console.warn("Failed to log delete to history:", historyError);
      }

      toast.success(
        __(
          actionType === "delete"
            ? "{{entityName}} deleted successfully"
            : "{{entityName}} moved to trash",
          { entityName: __(entityName, "whizmanage") }
        )
      );

      if (typeof config.onActionSuccess === "function") {
        config.onActionSuccess();
      }
    } catch (error) {
      console.error(`Failed to delete ${entityName}:`, error);
      toast.error(
        __("Failed to delete {{entityName}}", { entityName: __(entityName, "whizmanage") })
      );
    } finally {
      setIsLoading(false);
    }
  };

  const duplicateItems = async (selectedRows, customTransform = null) => {
    const isConfirmed = await confirm({
      title: __("Duplicate {{entityName}}", { entityName: __(entityName, "whizmanage") }),
      message: __(
        "Are you sure you want to duplicate the selected {{entityName}}?",
        { entityName: __(entityName, "whizmanage") }
      ),
      confirmText: __("Duplicate", "whizmanage"),
      cancelText: __("Cancel", "whizmanage"),
    });

    if (!isConfirmed) return;

    setIsLoading(true);

    try {
      // שמירת ה-IDs המקוריים לפי סדר כדי להכניס את המשוכפלים אחריהם
      const originalIds = selectedRows.map((row) => String(toEntity(row)?.id));

      // 1. להכין מה נשלח
      const itemsToDuplicate = selectedRows.map((row) => {
        const src = toEntity(row);
        const { id, ...rest } = src;

        if (customTransform) {
          return { ...customTransform(rest), __originalId: id };
        }

        return { ...rest, status: "draft", __originalId: id };
      });

      const withVariations = itemsToDuplicate.filter(
        (item) => item.__withVariations
      );
      const regularItems = itemsToDuplicate.filter(
        (item) => !item.__withVariations
      );

      const createdIds = [];
      const createdPlainItems = []; // 👈 מה שהשרת החזיר בקופונים/פוסטים
      // מיפוי בין ID מקורי ל-ID חדש
      const originalToNewIdMap = new Map();

      // 2. שכפול רגיל בבאצ'ים
      if (regularItems.length > 0) {
        const batches = chunkBatchPayloads(regularItems, [], [], 100);

        for (const batch of batches) {
          if (batch.create.length > 0) {
            const response = await axios.post(
              `${endpoint}/batch`,
              { create: batch.create },
              { headers: { "X-WP-Nonce": window.rest } }
            );

            const created = response.data?.create || [];

            // נרשום IDs ומיפוי
            created.forEach((newItem, idx) => {
              createdIds.push(newItem.id);
              const originalId = batch.create[idx]?.__originalId;
              if (originalId) {
                originalToNewIdMap.set(String(originalId), newItem.id);
              }
            });

            // לא מוצרים? אפשר להזרים ישירות ל־store
            if (!IS_PRODUCT_ENTITY && created.length > 0) {
              createdPlainItems.push(...created);
            }
          }
        }
      }

      // 3. מוצרים עם וריאציות
      for (let i = 0; i < withVariations.length; i++) {
        const item = withVariations[i];
        const { base, variations, __originalId } = item;

        const productResponse = await postApi(`${endpoint}`, base);
        const newProductId = productResponse.data?.id;

        if (newProductId) {
          createdIds.push(newProductId);
          // שמירת מיפוי
          if (__originalId) {
            originalToNewIdMap.set(String(__originalId), newProductId);
          }

          if (variations?.length > 0) {
            const variationBatches = chunkBatchPayloads(
              variations,
              [],
              [],
              100
            );

            for (const batch of variationBatches) {
              if (batch.create.length > 0) {
                const createList = batch.create.map((v) => ({
                  parent_id: newProductId,
                  regular_price: v.regular_price,
                  sku: v.sku,
                  attributes: v.attributes,
                }));

                await postApi(
                  `${endpoint}/${newProductId}/variations/batch`,
                  { create: createList }
                );
              }
            }
          }
        }
      }

      // פונקציה להכנסת מוצרים משוכפלים אחרי המוצרים המקוריים
      const insertAfterOriginals = (prev, newItems) => {
        if (originalToNewIdMap.size === 0) {
          // אם אין מיפוי, פשוט תוסיף בהתחלה
          return [...newItems, ...prev];
        }

        // יוצרים מפה של מוצרים חדשים לפי ה-ID שלהם
        const newItemsById = new Map(newItems.map((item) => [item.id, item]));
        const result = [];
        const insertedIds = new Set();

        for (const item of prev) {
          result.push(item);

          // בדיקה אם יש מוצר משוכפל שצריך להיכנס אחרי זה
          const newId = originalToNewIdMap.get(String(item.id));
          if (newId && newItemsById.has(newId) && !insertedIds.has(newId)) {
            result.push(newItemsById.get(newId));
            insertedIds.add(newId);
          }
        }

        // הוספת מוצרים שלא נכנסו (למקרה שהמקור לא נמצא ברשימה)
        for (const item of newItems) {
          if (!insertedIds.has(item.id)) {
            result.unshift(item);
          }
        }

        return result;
      };

      // 4. הזרמת נתונים חזרה ל־UI
      if (IS_PRODUCT_ENTITY) {
        if (createdIds.length > 0) {
          try {
            const url = `${window.siteUrl}/wp-json/whizmanage/v1/get_product/`;
            const res = await postApi(url, { product_ids: createdIds });
            // res.data הוא אובייקט עם rows שמכיל את המוצרים המלאים כולל subRows
            const fullProducts = res.data?.rows || [];

            setData((prev) => insertAfterOriginals(prev, fullProducts));

            // Log to history (don't await to avoid blocking)
            postApi(`${window.siteUrl}/wp-json/whizmanage/v1/history`, {
              location: entityName.toLowerCase(),
              items: fullProducts,
              action: "duplicate",
            }).catch((e) => console.warn("History log failed:", e));
          } catch (fetchError) {
            // אם נכשל לקרוא את המוצרים המלאים, ננסה להביא אותם בדרך אחרת
            console.warn("Failed to fetch full products, trying fallback:", fetchError);

            try {
              // Fallback: קרא כל מוצר בנפרד מה-API הרגיל
              const fallbackProducts = [];
              for (const productId of createdIds) {
                const singleRes = await axios.get(
                  `${endpoint}/${productId}`,
                  { headers: { "X-WP-Nonce": window.rest } }
                );
                if (singleRes.data) {
                  fallbackProducts.push(singleRes.data);
                }
              }

              if (fallbackProducts.length > 0) {
                setData((prev) => insertAfterOriginals(prev, fallbackProducts));
              }
            } catch (fallbackError) {
              console.error("Fallback fetch also failed:", fallbackError);
              // המוצרים נוצרו בשרת אבל לא הצלחנו לטעון אותם - נודיע למשתמש
              toast.warning(
                __("Products created successfully. Please refresh to see them.", "whizmanage")
              );
            }
          }
        }
      } else {
        if (createdPlainItems.length > 0) {
          setData((prev) => insertAfterOriginals(prev, createdPlainItems));
        }
      }

      setRowSelection({});

      toast.success(
        __("{{entityName}} duplicated successfully", {
          entityName: __(entityName, "whizmanage"),
        })
      );
    } catch (error) {
      console.error(`Failed to duplicate ${entityName}:`, error);
      toast.error(
        error?.response?.data?.message ||
          __("Failed to duplicate {{entityName}}", {
            entityName: __(entityName, "whizmanage"),
          })
      );
    } finally {
      setIsLoading(false);
    }
  };

  const restoreItems = async (selectedRows) => {
    const isConfirmed = await confirm({
      title: __("Restore {{entityName}}", { entityName: __(entityName, "whizmanage") }),
      message: __(
        "Are you sure you want to restore the selected {{entityName}}?",
        { entityName: __(entityName, "whizmanage") }
      ),
      confirmText: __("Restore", "whizmanage"),
      cancelText: __("Cancel", "whizmanage"),
    });

    if (!isConfirmed) return;

    setIsLoading(true);

    const entitiesToRestore = selectedRows.map(toEntity);
    // Relaxed ID check
    const idsToRestore = entitiesToRestore
      .map((e) => e?.id)
      .filter((id) => id != null && id !== "")
      .map(String);

    if (idsToRestore.length === 0) {
      setIsLoading(false);
      toast.error(__("No valid items to restore", "whizmanage"));
      return;
    }

    try {
      await axios.post(
        `${endpoint}/batch`,
        { update: idsToRestore.map((id) => ({ id, status: "publish" })) },
        { headers: { "X-WP-Nonce": window.rest } }
      );

      // 1. Update Local Store
      setData((prev) =>
        prev.filter((item) => !idsToRestore.includes(String(item.id)))
      );

      // 2. Update React Query Cache (Current View)
      if (queryClient) {
        queryClient.setQueriesData({ queryKey: [entityName] }, (oldData) => {
          if (!oldData || !oldData.rows) return oldData;
          return {
            ...oldData,
            rows: oldData.rows.filter((row) => !idsToRestore.includes(String(row.id))),
            total: Math.max(0, (oldData.total || 0) - idsToRestore.length),
          };
        });
      }
      setRowSelection({});

      const restoredItems = entitiesToRestore.map((it) => {
        const clone = { ...it, status: "publish" };
        delete clone.date_deleted;
        return clone;
      });

      window.dispatchEvent?.(
        new CustomEvent("wm:trash:restored", {
          detail: {
            items: restoredItems,
            ids: idsToRestore,
            entity: entityName || "items",
          },
        })
      );

      toast.success(
        __("{{entityName}} restored successfully", {
          entityName: __(entityName, "whizmanage"),
        })
      );

      if (typeof config.onActionSuccess === "function") {
        config.onActionSuccess();
      }
    } catch (error) {
      console.error(`Failed to restore ${entityName}:`, error);
      toast.error(
        __("Failed to restore {{entityName}}", {
          entityName: __(entityName, "whizmanage"),
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  const exportItems = async (selectedRows) => {
    try {
      const dataToExport = selectedRows.map(toEntity);
      const json = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement( "a");
      a.href = url;
      a.download = `${entityName}-${new Date()
        .toISOString()
        .split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(
        __("{{entityName}} exported successfully", {
          entityName: __(entityName, "whizmanage"),
        })
      );
    } catch (error) {
      console.error(`Failed to export ${entityName}:`, error);
      toast.error(
        __("Failed to export {{entityName}}", { entityName: __(entityName, "whizmanage") })
      );
    }
  };

  return {
    deleteItems,
    duplicateItems,
    restoreItems,
    exportItems,
  };
};
