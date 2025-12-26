// src/components/table/entities/discount-rules/discount-rules.config.js

import { createTableStore } from "../../store/createTableStore.js";
import { discountRulesAdapters } from "./discount-rules.adapters.js";
import {
  entityApi,
  entityApiForTrash,
  entityTrashApi,
  masterUpdateCell,
} from "./discount-rules.api.js";
import { useTrashDiscountRulesStore } from "./discount-rules.trash-store.js";

const perPage =
  window?.getWhizmanage?.find((c) => c.name === "perPage")?.reservedData?.[
    "discount-rules"
  ] || 100;

// --- 2) תצורת טבלה ברירת מחדל ---
const discountRulesTableConfig = {
  columnOrder: [
    "actions",
    "select",
    "expand",
    "name",
    "type",
    "show_message",
    "status",
    "start_date",
    "end_date",
    "priority",
    "filters",
    "conditions",
    "message",
    "row-actions",
  ],
  columnSizing: {
    actions: 66,
    name: 220,
    type: 200,
    status: 120,
    start_date: 180,
    end_date: 180,
    priority: 120,
    filters: 260,
    conditions: 260,
    message: 200,
    show_message: 120,
    "row-actions": 36,
  },
  columnVisibility: {
    actions: true,
    select: true,
    expand: true,
    name: true,
    type: true,
    status: true,
    start_date: true,
    end_date: true,
    priority: true,
    filters: true,
    conditions: true,
    show_message: true,
    message: true,
    "row-actions": true,
  },
  columnPinning: { left: ["actions"], right: ["row-actions"] },
  enableFilters: [
    {
      column: "status",
      enable: true,
      label: "status",
      options: ["publish", "draft"],
    },
    {
      column: "type",
      enable: true,
      label: "type",
      options: [
        { value: "product_adjustment", label: "Product adjustment" },
        { value: "cart_adjustment", label: "Cart adjustment" },
        { value: "bulk_discount", label: "Bulk discount" },
        { value: "bogo_discount", label: "BOGO" },
        { value: "bxgy_discount", label: "BXGY" },
        { value: "spend_bundle", label: "Spend bundle" },
        { value: "shipping_discount", label: "Shipping discount" },
      ],
    },
  ],
  pagination: { pageIndex: 0, pageSize: perPage },
};

const useDiscountRulesStore = createTableStore(
  "discount-rules",
  [],
  discountRulesTableConfig,
  {
    columnOrder: "discount_rules_columns_order",
    columnVisibility: "discount_rules_visible_columns",
    columnSizing: "discount_rules_columns_width",
    columnPinning: "discount_rules_pinned_columns",
    enableFilters: "discount_rules_enabled_filters",
  }
);

// --- 4) הזרקת לוגיקת עדכון תא מרכזית ---
useDiscountRulesStore.setState({
  masterUpdateCell: masterUpdateCell(useDiscountRulesStore.getState),
});

// --- 5) טעינה דינמית של עמודות/טולבר ---
const columnsPromise = import("./discount-rules.columns.js");
const toolbarPromise = import("./discount-rules.toolbar.js");

// --- 6) ייצוא חבילת קונפיג מלאה (בדיוק כמו products) ---
export const discountRulesConfig = {
  entityName: "discount-rules",
  fetchPage: ({ page, perPage, filters }) => {
    return entityApi.fetchPage({ page, perPage, ...filters });
  },

  useStore: useDiscountRulesStore,
  useTrashStoreFactory: useTrashDiscountRulesStore,
  api: {
    apiForTrash: entityApiForTrash,
    trashApi: entityTrashApi,
    entityApi: entityApi,
  },
  adapters: discountRulesAdapters,
  tableConfigDefaults: discountRulesTableConfig,
  loadColumns: () => columnsPromise,
  loadToolbar: () => toolbarPromise,
};

// --- ייצואים גנריים ---
export {
  discountRulesTableConfig as entityTableConfig,
  useDiscountRulesStore as useEntityStore,
};
