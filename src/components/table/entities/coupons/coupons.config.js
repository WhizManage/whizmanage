// src/components/table/entities/coupons/coupons.config.js

import { createTableStore } from "../../store/createTableStore.js";

import {
  entityApi,
  entityApiForTrash,
  entityTrashApi,
  masterUpdateCell,
} from "./coupons.api.js";
import { couponsAdapters } from "./coupons.adapters.js";
import { useTrashCouponsStore } from "./coupons.trash-store.js";

const perPage = window?.getWhizmanage?.find((c) => c.name === "perPage")?.reservedData.coupons || 100;

const couponsTableConfig = {
  columnOrder: [
    "actions",
    "select",
    "code",
    "discount_type",
    "amount",
    "minimum_spend",     // ← new
    "maximum_spend",     // ← new
    "usage_count",
    "usage_limit",
    "date",              // ← new
    "date_expires",
    "description",
    "status",
    "individual_use",
    "email_restrictions",
    "exclude_sale_items",
    "free_shipping",
    "product_categories",
    "excluded_product_categories",
    "product_ids",
    "excluded_product_ids",
    "row-actions",
  ],
  columnSizing: {
    actions: 66,
    code: 200,
    discount_type: 160,
    amount: 120,
    minimum_spend: 140,  // ← new
    maximum_spend: 140,  // ← new
    usage_count: 90,
    usage_limit: 110,
    date: 180,           // ← new
    date_expires: 180,
    description: 260,
    product_categories: 200,
    excluded_product_categories: 200,
    product_ids: 200,
    excluded_product_ids: 200,
    status: 120,
    individual_use: 150,
    email_restrictions: 220,
    exclude_sale_items: 170,
    free_shipping: 150,
    "row-actions": 36,
  },
  columnVisibility: {
    actions: true,
    select: true,
    code: true,
    discount_type: true,
    amount: true,
    minimum_spend: true, // ← new
    maximum_spend: true, // ← new
    usage_count: true,
    usage_limit: true,
    product_categories: true,
    excluded_product_categories: true,
    date: true,          // ← new
    date_expires: true,
    product_ids: true,
    excluded_product_ids: true,
    description: true,
    status: true,
    individual_use: true,
    email_restrictions: true,
    exclude_sale_items: true,
    free_shipping: true,
    "row-actions": true,
  },
  columnPinning: { left: ["actions"], right: ["row-actions"] },
  enableFilters: [
    { column: "status", enable: true, label: "status", options: ["publish", "draft", "pending", "trash"] },
    { column: "discount_type", enable: true, label: "discount_type", options: ["fixed_product", "fixed_cart", "percent"] },
  ],
  pagination: { pageIndex: 0, pageSize: perPage },
};

const useCouponsStore = createTableStore(
  "coupons",
  [],
  couponsTableConfig,
  {
    columnOrder: "coupons_columns_orde",
    columnVisibility: "coupons_visible_columns",
    columnSizing: "coupons_columns_width",
    columnPinning: "coupons_pinned_columns",
    enableFilters: "coupons_enabled_filters",
  }
);

// הזרקת masterUpdateCell הספציפי
useCouponsStore.setState({
  masterUpdateCell: masterUpdateCell(useCouponsStore.getState),
});

const columnsPromise = import("./coupons.columns.js");
const toolbarPromise = import("./coupons.toolbar.js");

export const couponsConfig = {
  entityName: "coupons",
  fetchPage: ({ page, perPage, filters }) => {
    return entityApi.fetchPage({ page, perPage, ...filters });
  },
  useStore: useCouponsStore,
  useTrashStoreFactory: useTrashCouponsStore,
  api: {
    apiForTrash: entityApiForTrash,
    trashApi: entityTrashApi,
    entityApi: entityApi,
  },
  adapters: couponsAdapters,
  tableConfigDefaults: couponsTableConfig,
  bulkEditRows: [
    // --- קטגוריות/תגיות/מוצרים (ערכים מסוג array) ---
    { id: "product_categories", type: "taxonomy", value: [], editor: "taxonomy", editOptions: { taxonomyType: "product_cat", label: "Categories", oppositeColumn: "excluded_product_categories" } },
    { id: "excluded_product_categories", type: "taxonomy", value: [], editor: "taxonomy", editOptions: { taxonomyType: "product_cat", label: "Excluded categories", oppositeColumn: "product_categories" } },

    { id: "product_ids", type: "products", value: [], editor: "products", editOptions: { label: "Products" } },
    { id: "excluded_product_ids", type: "products", value: [], editor: "products", editOptions: { label: "Excluded products" } },

    // סטטוס / סוג הנחה
    { id: "status", type: "select", options: ["No Change", "publish", "draft", "pending"], value: "", isChangeTypeEditable: false, changeType: "-", valueType: "-" },
    { id: "discount_type", type: "select", options: ["No Change", "fixed_product", "fixed_cart", "percent"], value: "", isChangeTypeEditable: false, changeType: "-", valueType: "-" },

    // סכומים/כמויות
    { id: "amount", type: "input", value: "", isChangeTypeEditable: true, changeType: "Increase", valueType: "%", isNewValueOption: true },
    { id: "maximum_amount", type: "input", value: "", isChangeTypeEditable: true, changeType: "Increase", valueType: "%", isNewValueOption: true },
    { id: "minimum_amount", type: "input", value: "", isChangeTypeEditable: true, changeType: "Increase", valueType: "%", isNewValueOption: true },

    { id: "usage_limit", type: "input", value: "", isChangeTypeEditable: true, changeType: "Increase", valueType: "QTY", isNewValueOption: true },
    { id: "usage_limit_per_user", type: "input", value: "", isChangeTypeEditable: true, changeType: "Increase", valueType: "QTY", isNewValueOption: true },
    { id: "limit_usage_to_x_items", type: "input", value: "", isChangeTypeEditable: true, changeType: "Increase", valueType: "QTY", isNewValueOption: true },

    // בוליאנים
    { id: "individual_use", type: "select", options: ["No Change", "yes", "no"], value: "No Change", isChangeTypeEditable: false, changeType: "-", valueType: "-" },
    { id: "free_shipping", type: "select", options: ["No Change", "yes", "no"], value: "No Change", isChangeTypeEditable: false, changeType: "-", valueType: "-" },
    { id: "exclude_sale_items", type: "select", options: ["No Change", "yes", "no"], value: "No Change", isChangeTypeEditable: false, changeType: "-", valueType: "-" },

    // תאריכים
    { id: "date_expires", type: "date", value: "", isChangeTypeEditable: false, changeType: "-", valueType: "-" },
    { id: "date", type: "date", value: "", isChangeTypeEditable: false, changeType: "-", valueType: "-" },
  ],

  loadColumns: () => columnsPromise,
  loadToolbar: () => toolbarPromise,
};

// --- generic exports ---
export { couponsTableConfig as entityTableConfig };
export { useCouponsStore as useEntityStore };
export { /* extra exports if needed */ };
