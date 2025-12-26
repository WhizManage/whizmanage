// src/components/table/entities/customers/customers.toolbar.js
export const customersCustomActions = (__) => [
  {
    label: __("Edit in Wordpress", "whizmanage"),
    icon: "Pencil",
    showWhen: "single",
    onClick: (rows) => {
      const row = rows[0];
      const entity = row?.original ?? row;
      const userId = entity?.id;
      if (!userId) return;

      window.open(
        `${window.siteUrl}/wp-admin/user-edit.php?user_id=${userId}`,
        "_blank",
        "noopener,noreferrer"
      );
    },
  },
];

export const customersToolbarConfig = (__) => ({
  entityName: "customers",
  endpoint: `${window.siteUrl}/wp-json/wc/v3/customers`,
  duplicateTransform: null, // אין בדרך כלל "שכפול" לקוחות
  allowTrash: false,   // ⛔️ לא רוצים "אשפה"
  customActions: customersCustomActions(__),
});

// --- Generic alias ---
export { customersToolbarConfig as entityToolbarConfig };
