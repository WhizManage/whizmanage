// src/components/table/entities/customers/customers.config.js
import { createTableStore } from "../../store/createTableStore.js";

import {
  entityApi,
  entityApiForTrash,
  entityTrashApi,
  masterUpdateCell,
} from "./customers.api.js";
import { customersAdapters } from "./customers.adapters.js";
import { useTrashCustomersStore } from "./customers.trash-store.js";


const perPage = window?.getWhizmanage?.find((c) => c.name === "perPage")?.reservedData.customers || 100;

const customersTableConfig = {
  columnOrder: [
    "actions",
    "select",
    "email",
    "first_name",
    "last_name",
    "username",
    "role",                 // מציגים בלבד
    "orders_count",
    "total_spent",
    "billing_phone",
    "billing_city",
    "billing_country",
    "billing_postcode",
    "is_paying_customer",
    "date_created",
    "date_modified",
    "row-actions",
  ],
  columnSizing: {
    actions: 66,
    select: 40,
    email: 220,
    first_name: 150,
    last_name: 150,
    username: 160,
    role: 140,
    orders_count: 100,
    total_spent: 140,
    billing_phone: 150,
    billing_city: 150,
    billing_country: 140,
    billing_postcode: 120,
    is_paying_customer: 110,
    date_created: 180,
    date_modified: 180,
    "row-actions": 36,
  },
  columnVisibility: {
    actions: true,
    select: true,
    email: true,
    first_name: true,
    last_name: true,
    username: true,
    role: true,                 // מוצג
    orders_count: true,
    total_spent: true,
    billing_phone: true,
    billing_city: true,
    billing_country: true,
    billing_postcode: true,
    is_paying_customer: true,
    date_created: true,
    date_modified: true,
    "row-actions": true,
  },
  columnPinning: { left: ["actions"], right: ["row-actions"] },
  enableFilters: [
    {
      column: "is_paying_customer",
      enable: true,
      label: "Paying Customers",
      options: [{ label: "Yes", value: true }, { label: "No", value: false }],
    },
  ],
  pagination: { pageIndex: 0, pageSize: perPage },
};


const useCustomersStore = createTableStore(
  "customers",
  [],
  customersTableConfig,
  {
    columnOrder: "customers_columns_order",
    columnVisibility: "customers_visible_columns",
    columnSizing: "customers_columns_width",
    columnPinning: "customers_pinned_columns",
    enableFilters: "customers_enabled_filters",
  }
);

// הזרקת masterUpdateCell הספציפי
useCustomersStore.setState({
  masterUpdateCell: masterUpdateCell(useCustomersStore.getState),
});

const columnsPromise = import("./customers.columns.js");
const toolbarPromise = import("./customers.toolbar.js");

export const customersConfig = {
  entityName: "customers",
  useStore: useCustomersStore,
  useTrashStoreFactory: useTrashCustomersStore,
  fetchPage: ({ page, perPage, filters }) =>
    entityApi.fetchPage({ page, perPage, ...filters }),

  api: {
    apiForTrash: entityApiForTrash,
    trashApi: entityTrashApi,
    entityApi: entityApi,
  },
  adapters: customersAdapters,
  tableConfigDefaults: customersTableConfig,
  bulkEditRows: [
    // אפשר להוסיף אחר כך Bulk edit ל־role וכו'
  ],

  loadColumns: () => columnsPromise,
  loadToolbar: () => toolbarPromise,
};

// --- generic exports ---
export { customersTableConfig as entityTableConfig };
export { useCustomersStore as useEntityStore };
export { /* extra exports if needed */ };
