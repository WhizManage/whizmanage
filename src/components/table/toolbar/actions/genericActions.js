// src/components/table/toolbar/actions/genericActions.js

import { toast } from "@/lib/utils";
import { chunkBatchPayloads } from "@/components/table/utils/networkUtils";
import { postApi } from "@/services/services";
import { confirm } from "@components/ui/custom/CustomConfirm";
import axios from "axios";
import { sprintf, __ } from "@wordpress/i18n"
export const createGenericActions = (config) => {
  const {
    entityName,
    endpoint,
    setData,
    setRowSelection,
    setIsLoading,
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
          ? sprintf(__("Delete %s", "whizmanage"), __(entityName, "whizmanage"))
          : __("Move to Trash", "whizmanage"),
      message:
        actionType === "delete"
          ? sprintf(
            __("Are you sure you want to permanently delete the selected %s? This action cannot be undone.", "whizmanage"),
            __(entityName, "whizmanage")
          )
          : sprintf(__("Are you sure you want to move the selected %s to the trash?", "whizmanage"),
            __(entityName, "whizmanage")
          ),
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
      // חלק את ה-IDs לבאצ'ים של 100 כדי לעמוד במגבלת WooCommerce
      if (actionType === "delete") {
        const batches = chunkBatchPayloads([], [], idsToDelete, 100);
        for (const batch of batches) {
          if (batch.delete.length > 0) {
            await axios.post(
              `${endpoint}/batch`,
              { delete: batch.delete },
              { headers: { "X-WP-Nonce": window.rest } }
            );
          }
        }
      } else {
        const trashUpdates = idsToDelete.map((id) => ({ id, status: "trash" }));
        const batches = chunkBatchPayloads([], trashUpdates, [], 100);
        for (const batch of batches) {
          if (batch.update.length > 0) {
            await axios.post(
              `${endpoint}/batch`,
              { update: batch.update },
              { headers: { "X-WP-Nonce": window.rest } }
            );
          }
        }

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
        const historyPayload = {
          location: entityName.toLowerCase(),
          action: actionType === "delete" ? "delete" : "trash",
          items: entitiesToHandle.map((item) => ({
            id: item.id,
            old: item,
            name: item.name || item.title || `#${item.id}`,
          })),
        };
        await postApi(`${window.siteUrl}/wp-json/whizmanage/v1/history`, historyPayload);
      } catch (historyError) {
        console.warn("Failed to log delete to history:", historyError);
      }

      toast.success(
        sprintf(
          __(
            actionType === "delete"
              ? "%s deleted successfully"
              : "%s moved to trash",
            "whizmanage"
          ),
          __(entityName, "whizmanage")
        )
      );

      if (typeof config.onActionSuccess === "function") {
        config.onActionSuccess();
      }
    } catch (error) {
      console.error(`Failed to delete ${entityName}:`, error);
      toast.error(
        sprintf(__("Failed to delete %s", "whizmanage"), __(entityName, "whizmanage"))
      );
    } finally {
      setIsLoading(false);
    }
  };

  // duplicateItems removed - Pro feature only

  const restoreItems = async (selectedRows) => {
    // 🔒 בדיקת מגבלת חוקי הנחות עבור Free users
    const noLicence = typeof window !== "undefined" && window.hasLicence !== true;
    if (entityName === "discount-rules" && noLicence) {
      try {
        // בדוק כמה חוקים פעילים קיימים
        const activeRes = await axios.get(
          `${window.siteUrl}/wp-json/whizmanage/v1/discount-rules/?per_page=1&status=publish,draft`,
          { headers: { "X-WP-Nonce": window.rest } }
        );
        const activeCount = parseInt(activeRes.headers?.["x-wp-total"] || "0", 10);

        if (activeCount >= 1) {
          toast.error(__("Free version limit reached", "whizmanage"), {
            description: __("You can only have 1 discount rule in the free version. Please upgrade to Pro to restore more rules.", "whizmanage"),
          });
          return;
        }

        // אפשר לשחזר רק 1 אם אין חוקים פעילים
        if (selectedRows.length > 1) {
          toast.error(__("Free version limit", "whizmanage"), {
            description: __("You can only restore 1 discount rule in the free version.", "whizmanage"),
          });
          return;
        }
      } catch (err) {
        console.warn("Could not check active discount rules count:", err);
      }
    }

    const isConfirmed = await confirm({
      title: sprintf(__("Restore %s", "whizmanage"), __(entityName, "whizmanage")),
      message: sprintf(
        __("Are you sure you want to restore the selected %s?", "whizmanage"),
        __(entityName, "whizmanage")
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
      // חלק את ה-IDs לבאצ'ים של 100 כדי לעמוד במגבלת WooCommerce
      const restoreUpdates = idsToRestore.map((id) => ({ id, status: "publish" }));
      const batches = chunkBatchPayloads([], restoreUpdates, [], 100);
      for (const batch of batches) {
        if (batch.update.length > 0) {
          await axios.post(
            `${endpoint}/batch`,
            { update: batch.update },
            { headers: { "X-WP-Nonce": window.rest } }
          );
        }
      }

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
        sprintf(__("%s restored successfully", "whizmanage"),
          __(entityName, "whizmanage")
        )
      );

      if (typeof config.onActionSuccess === "function") {
        config.onActionSuccess();
      }
    } catch (error) {
      console.error(`Failed to restore ${entityName}:`, error);
      toast.error(
        sprintf(__("Failed to restore %s", "whizmanage"),
          __(entityName, "whizmanage")
        )
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
      const a = document.createElement("a");
      a.href = url;
      a.download = `${entityName}-${new Date()
        .toISOString()
        .split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(
        sprintf(__("%s exported successfully", "whizmanage"),
          __(entityName, "whizmanage")
        )
      );
    } catch (error) {
      console.error(`Failed to export ${entityName}:`, error);
      toast.error(
        sprintf(__("Failed to export %s", "whizmanage"), __(entityName, "whizmanage"))
      );
    }
  };

  return {
    deleteItems,
    restoreItems,
    exportItems,
  };
};
