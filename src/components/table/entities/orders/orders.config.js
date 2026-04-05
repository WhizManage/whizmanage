// src/components/table/entities/orders/orders.config.js
import { createTableStore } from "../../store/createTableStore.js";

import { ordersAdapters } from "./orders.adapters.js";
import { ORDER_STATUS_KEYS } from "./orders.constants.js";
import {
  entityApi,
  ordersApiForTrash,
  ordersMasterUpdateCell,
  trashApi,
} from "./orders.api.js";
import { useTrashOrdersStore } from "./orders.trash-store.js";

// --- META columns visibility defaults for Orders (OFF by default) ---
const ordersMetaKeys =
  typeof window !== "undefined" && Array.isArray(window?.listOrdersMetaData)
    ? window.listOrdersMetaData.filter(
      (k) => typeof k === "string" && k.trim().length > 0
    )
    : [];

const ordersMetaColumnsVisibilityDefaults = ordersMetaKeys.reduce(
  (acc, key) => {
    acc[key] = false; // 👈 כל עמודת META מכובה כברירת מחדל
    return acc;
  },
  {}
);

const perPage =
  window?.getWhizmanage?.find((c) => c.name === "perPage")?.reservedData
    .orders || 100;

const ordersTableConfig = {
  columnOrder: [
    "actions",
    "select",
    "line_items",
    "payment_method",
    "order",
    "order_summary",
    "status",
    "total",
    "customer_note",
    "payment_method",
    "shipping",
    "note",
    "date_created_gmt",
    "date_modified_gmt",
    "total_tax",
    "billing",
    "source",
    "billing_email",
    "billing_phone",
    "billing_name",
    "billing_company",
    "billing_city",
    "billing_country",
    "billing_postcode",
    "billing_address_1",
    "billing_address_2",
    "shipping_phone",
    "shipping_name",
    "shipping_company",
    "shipping_city",
    "shipping_country",
    "shipping_postcode",
    "shipping_address_1",
    "shipping_address_2",
    "version",
    "created_via",
    "is_vat_exempt",
    "row-actions",
  ],
  columnSizing: {
    actions: 66,
    select: 40,
    line_items: 150,
    order: 220,
    order_summary: 150,
    payment_method: 150,
    status: 150,
    total: 110,
    customer_note: 220,
    payment_method: 190,
    shipping: 120,
    note: 150,
    date_created_gmt: 180,
    date_modified_gmt: 180,
    total_tax: 120,
    billing: 120,
    source: 100,
    billing_email: 200,
    billing_phone: 160,
    billing_name: 200,
    billing_company: 180,
    billing_city: 160,
    billing_country: 160,
    billing_postcode: 160,
    billing_address_1: 200,
    billing_address_2: 200,
    shipping_phone: 160,
    shipping_name: 200,
    shipping_company: 180,
    shipping_city: 160,
    shipping_country: 160,
    shipping_postcode: 160,
    shipping_address_1: 200,
    shipping_address_2: 200,
    version: 120,
    created_via: 140,
    is_vat_exempt: 140,
    line_items: 120,
    "row-actions": 36,
  },
  columnVisibility: {
    actions: true,
    select: true,
    line_items: true,
    payment_method: true,
    order: true,
    order_summary: true,
    note: true,
    status: true,
    total: true,
    customer_note: true,
    payment_method: true,
    billing: true,
    date_created_gmt: true,
    date_modified_gmt: true,
    total_tax: true,
    shipping: true,
    source: 120,
    billing_email: false,
    billing_phone: false,
    billing_name: false,
    billing_company: false,
    billing_city: false,
    billing_country: false,
    billing_postcode: false,
    billing_address_1: false,
    billing_address_2: false,
    shipping_phone: false,
    shipping_name: false,
    shipping_company: false,
    shipping_city: false,
    shipping_country: false,
    shipping_postcode: false,
    shipping_address_1: false,
    shipping_address_2: false,
    version: true,
    created_via: true,
    is_vat_exempt: true,
    "row-actions": true,

    ...ordersMetaColumnsVisibilityDefaults,
  },
  columnPinning: { left: ["actions"], right: ["row-actions"] },
  enableFilters: [
    {
      column: "status",
      enable: true,
      label: "status",
      options: Object.keys(ORDER_STATUS_KEYS),
    },
    {
      column: "payment_method",
      enable: true,
      label: "Payment Method",
      options: [
        { value: "credit_card", label: "Credit Card" },
        { value: "paypal", label: "PayPal" },
        { value: "bank_transfer", label: "Bank Transfer" },
        { value: "cod", label: "Cash on Delivery (COD)" },
        { value: "bit", label: "Bit (Israeli Payment App)" },
        { value: "apple_pay", label: "Apple Pay" },
        { value: "google_pay", label: "Google Pay" },
        { value: "manual", label: "Manual Payment" },
        { value: "cheque", label: "Check" },
        { value: "direct_debit", label: "Standing Order / Direct Debit" },
      ],
    },
  ],
  pagination: { pageIndex: 0, pageSize: perPage },

  // ✅ הוספת דגל לסינון תאריכים
  showDateFilter: true,
};

const useOrdersStore = createTableStore("orders", [], ordersTableConfig, {
  columnOrder: "orders_columns_order",
  columnVisibility: "orders_visible_columns",
  columnSizing: "orders_columns_width",
  columnPinning: "orders_pinned_columns",
  enableFilters: "orders_enabled_filters",
});

useOrdersStore.setState({
  masterUpdateCell: ordersMasterUpdateCell(useOrdersStore.getState),
});

const columnsPromise = import("./orders.columns.js");
const toolbarPromise = import("./orders.toolbar.js");

export const ordersConfig = {
  entityName: "orders",

  fetchPage: ({ page, perPage, filters }) => {
    return entityApi.fetchPage({ page, perPage, ...filters });
  },

  useStore: useOrdersStore,
  useTrashStoreFactory: useTrashOrdersStore,

  api: {
    apiForTrash: ordersApiForTrash,
    trashApi: trashApi,
    entityApi: entityApi,
  },

  adapters: ordersAdapters,
  tableConfigDefaults: ordersTableConfig,

  bulkEditRows: [
    {
      id: "status",
      type: "select",
      options: ["No Change", ...Object.keys(ORDER_STATUS_KEYS)],
      value: "",
      isChangeTypeEditable: false,
      changeType: "-",
      valueType: "-",
    },
    {
      id: "date_created",
      type: "date",
      value: "",
      isChangeTypeEditable: false,
      changeType: "-",
      valueType: "-",
    },
    {
      id: "private_note",
      type: "input",
      editor: "textarea",
      value: "",
      isChangeTypeEditable: false,
      changeType: "New Value",
      valueType: "-",
    },
    {
      id: "message_to_customer",
      type: "input",
      editor: "textarea",
      value: "",
      isChangeTypeEditable: false,
      changeType: "New Value",
      valueType: "-",
    },
    {
      id: "discount_total",
      type: "input",
      value: "",
      isChangeTypeEditable: true,
      isNewValueOption: true,
      changeType: "Increase",
      valueType: "%",
      referenceBase: "total",
    },
    {
      id: "shipping_total",
      type: "input",
      value: "",
      isChangeTypeEditable: true,
      isNewValueOption: true,
      changeType: "Increase",
      valueType: "%",
      referenceBase: "shipping_total",
    },
  ],

  loadColumns: () => columnsPromise,
  loadToolbar: () =>
    import("./orders.toolbar.js").then((mod) => ({
      ...mod,
      entityToolbarConfig: (t, storeInstance) => {
        // אם יש _openEmailModal על ה-config, נעביר אותה
        const openEmailModal = storeInstance?._openEmailModal ?? null;
        return mod.ordersToolbarConfig(t, { openEmailModal });
      },
    })),
};

export {
  ordersTableConfig as entityTableConfig,
  useOrdersStore as useEntityStore,
};
