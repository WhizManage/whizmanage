import React, { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
 import { __ } from "@wordpress/i18n";
import { SelectionToolbar } from "./Toolbar";
import { createGenericActions } from "./actions/genericActions";
import { ExternalLink } from "lucide-react";

const getEntity = (rowOrEntity) => rowOrEntity?.original ?? rowOrEntity ?? null;
const getPostId = (e) => e?.id ?? e?.parent_id ?? e?.parentId ?? e?.parent ?? null;
const getViewUrl = (e) => {
  if (!e) return null;
  if (e.permalink) return e.permalink;
  if (e.slug) return `${window.siteUrl}/${e.slug}`;
  if (e.id) return `${window.siteUrl}/?p=${e.id}`;
  return null;
};

/**
 * בונה מערך פעולות אחוד (לשורת פעולות ול־Toolbar) בלי לבצע confirm בשכבה הזו.
 * האישור (confirm) מתבצע בתוך פעולות ה־CRUD ב־createGenericActions,
 * או בתוך פונקציות override אם הועברו מבחוץ.
 */
export const makeUnifiedActionsBuilder = ({
  __,
  actions,
  isTrash,
  duplicateTransform,
  onBulkEdit,
  customActions = [],
  toolbarOverrides = {},
  entityName,
  allowTrash = true,
  allowDelete = true,
}) => {
  const {
    onRestoreSelected = null,
    onDeleteSelected = null,
    onTrashSelected = null,
  } = toolbarOverrides || {};

  // בדיקת רישיון עבור חסימות
  const noLicence = typeof window !== "undefined" && window.hasLicence === false;
  const isDiscountRules = entityName === "discount-rules";

  return (rowsSnapshot) => {
    const base = [];

    // בדיקה אם יש שורות נעולות בין הנבחרות (עבור discount-rules ו-Free users)
    const hasLockedRows = noLicence && isDiscountRules && rowsSnapshot.length > 0 &&
      rowsSnapshot.some((row, index) => index > 0 || (row?.index !== undefined && row.index > 0));

    if (entityName !== "customers") {
      // Duplicate - חסום עבור Free users ב-discount-rules
      const isDuplicateLocked = noLicence && isDiscountRules;
      base.push({
        label: __("Duplicate", "whizmanage"),
        icon: "Copy",
        showWhen: "any",
        disabled: isDuplicateLocked,
        lockedFeature: isDuplicateLocked,
        onClick: isDuplicateLocked
          ? () => {}
          : () => actions.duplicateItems(rowsSnapshot, duplicateTransform),
      });

      // Bulk edit לא יוצג ב-discount-rules
      if (entityName !== "discount-rules") {
        base.push({
          label: __("Bulk edit", "whizmanage"),
          icon: "Settings2",
          showWhen: "multiple",
          closeFirst: true,
          clearSelection: false,
          keepOpen: true,
          onClick: () => onBulkEdit?.(),
        });
      }
    }

    if (!["discount-rules", "customers"].includes(entityName)) {
      base.push({
        label: __("Edit in WooCommerce", "whizmanage"),
        icon: "Pencil",
        showWhen: "single",
        onClick: () => {
          const entity = getEntity(rowsSnapshot[0]);
          const postId = getPostId(entity);
          if (!postId) return;
          window.open(
            `${window.siteUrl}/wp-admin/post.php?post=${postId}&action=edit`,
            "_blank",
            "noopener,noreferrer"
          );
        },
      });
    };

    // 👇 אל תציג "View in WooCommerce" במקום שהוא לא מוצרים
    if (entityName === "products") {
      base.push({
        label: __("View in WooCommerce", "whizmanage"),
        icon: <ExternalLink className="h-full w-full text-slate-600 dark:text-slate-300" />,
        showWhen: "single",
        onClick: () => {
          const entity = getEntity(rowsSnapshot[0]);
          const url = getViewUrl(entity);
          if (url) window.open(url, "_blank", "noopener,noreferrer");
        },
      });
    }

    if (isTrash && (allowTrash || allowDelete)) {
      if (allowTrash) {
        base.push({
          label: __("Restore", "whizmanage"), icon: "RotateCcw", showWhen: "any",
          onClick: async () => onRestoreSelected ? onRestoreSelected(rowsSnapshot) : actions.restoreItems(rowsSnapshot)
        });
      }
      if (allowDelete) {
        base.push({
          label: __("Delete Permanently", "whizmanage"), icon: "DeleteForever", variant: "destructive", showWhen: "any",
          onClick: async () => onDeleteSelected ? onDeleteSelected(rowsSnapshot) : actions.deleteItems(rowsSnapshot, true)
        });
      }
    } else {
      if (allowTrash) {
        // Move to Trash - חסום עבור Free users ב-discount-rules
        const isTrashLocked = noLicence && isDiscountRules;
        base.push({
          label: __("Move to Trash", "whizmanage"), icon: "Archive", variant: "destructive", showWhen: "any",
          disabled: isTrashLocked,
          lockedFeature: isTrashLocked,
          onClick: isTrashLocked
            ? () => {}
            : async () => onTrashSelected ? onTrashSelected(rowsSnapshot) : actions.deleteItems(rowsSnapshot, false)
        });
      }
      if (allowDelete) {
        base.push({
          label: __("Delete Permanently", "whizmanage"), icon: "Trash2", variant: "destructive", showWhen: "any",
          onClick: async () => onDeleteSelected ? onDeleteSelected(rowsSnapshot) : actions.deleteItems(rowsSnapshot, true)
        });
      }
    }

    // מיפוי פעולות מותאמות (אובייקטים בלבד, לא React elements)
    const mappedCustom = (customActions || [])
      .filter((a) => !React.isValidElement(a) && a && typeof a === "object")
      .map((a) => ({ ...a, onClick: () => a.onClick?.(rowsSnapshot) }));

    return [...base, ...mappedCustom];
  };
};

export const GenericToolbar = ({
  table,
  store,
  entityName,
  endpoint,
  isTrash = false,
  customActions = [],
  duplicateTransform = null,
  onBulkEdit,
  onRestoreSelected,
  onDeleteSelected,
  onTrashSelected,
  allowTrash = true,
  allowDelete = true,
  onActionSuccess,
  queryClient,
}) => {
   
  const [selectedRows, setSelectedRows] = useState([]);
  const TOAST_ID = "wm-selection-toolbar";
  const selectedCount = table.getSelectedRowModel().flatRows.length;

  const actions = useMemo(
    () =>
      createGenericActions({
        entityName,
        endpoint,
        setData: store.setData,           // 👈 מה-store
        setRowSelection: store.setRowSelection, // 👈 מה-store
        setIsLoading: store.setLoading,   // 👈 מה-store (שים לב: setLoading ולא setIsLoading)
        __,
        isTrash,
        queryClient,
        onActionSuccess: () => {
          // GenericToolbar doesn't have direct access to queryClient easily here without props.
          // However, GenericToolbar is usually used inside GenericDataTable or similar context.
          // If we want to support invalidation here, we might need to pass a callback prop.
          // For now, let's assume the parent handles it or we pass a prop.
          if (typeof onActionSuccess === "function") {
            onActionSuccess();
          }
        },
      }),
    [entityName, endpoint, store.setData, store.setRowSelection, store.setLoading, __, isTrash, queryClient]
  );

  const collectSelected = (rows) => {
    const out = [];
    const walk = (arr) => {
      arr.forEach((r) => {
        if (r.getIsSelected()) out.push(r);
        if (r.subRows?.length) walk(r.subRows);
      });
    };
    walk(rows);
    return out;
  };

  useEffect(() => {
    setSelectedRows(collectSelected(table.getRowModel().rows));
  }, [table.getState().rowSelection]); // 👈 יציב וברור

  const buildActions = useMemo(
    () =>
      makeUnifiedActionsBuilder({
        __,
        actions,
        isTrash,
        duplicateTransform,
        onBulkEdit,
        customActions,
        entityName,
        allowTrash,
        allowDelete,
        toolbarOverrides: { onRestoreSelected, onDeleteSelected, onTrashSelected },
      }),
    [__, actions, isTrash, duplicateTransform, onBulkEdit, customActions, onRestoreSelected, onDeleteSelected, onTrashSelected, entityName, allowTrash, allowDelete]
  );

  const toolbarActions = useMemo(
    () => buildActions([...selectedRows]),
    [buildActions, selectedRows]
  );

  useEffect(() => {
    if (selectedRows.length === 0) {
      toast.dismiss(TOAST_ID);
      return;
    }

    const handleClear = () => {
      setSelectedRows([]);
      store.setRowSelection({});  // 👈 מה-store
      toast.dismiss(TOAST_ID);
    };

    toast(
      <SelectionToolbar
        selectedCount={selectedCount}
        onClear={handleClear}
        actions={toolbarActions}
        onRequestClose={() => toast.dismiss(TOAST_ID)}
      />,
      { duration: Infinity, position: "bottom-center", id: TOAST_ID }
    );
  }, [selectedRows.length, selectedCount, toolbarActions, store.setRowSelection]);

  return null;
};
