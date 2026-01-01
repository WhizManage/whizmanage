// src/components/table/entities/products/products.config.js

import { createTableStore } from "../../store/createTableStore.js";

// ✅ 1. ייבוא סטטי של כל מה שחיוני
import {
  entityApi,
  entityCategoriesApi,
  productsApiForTrash,
  trashApi,
  productsMasterUpdateCell
} from "./products.api.js";
import { productsAdapters } from "./products.adapters.js";
import { useTrashProductsStore } from "./products.trash-store.js";
import { productsImportConfig } from "./products.import.js";

// --- 2. הגדרות ברירת המחדל של הטבלה ---

const taxonomyLabel = (taxonomy) => ({
  id: taxonomy.name,
  name: taxonomy.label,
  value: [],
  labels: true,
});

const extraTaxonomies =
  typeof window !== "undefined" && Array.isArray(window?.listTaxonomies)
    ? window.listTaxonomies.map(taxonomyLabel)
    : [];

// בסיס הטקסונומיות כפי שמגיע מהחלון
const extraFilterDefs =
  typeof window !== "undefined" && Array.isArray(window?.listTaxonomies)
    ? window.listTaxonomies.map((tx) => ({
      column: tx.name,
      enable: false,
      label: tx.label || tx.name,
    }))
    : [];



const acfMetaRaw =
  typeof window !== "undefined" && Array.isArray(window?.WhizManageCustomFields)
    ? window.WhizManageCustomFields
    : [];

const allMetaDataRaw =
  typeof window !== "undefined" ? window?.metaKey || [] : [];

const collectMetaKeys = (list) =>
  (Array.isArray(list) ? list : [])
    .map((item) => item?.key)
    .filter((key) => typeof key === "string" && key.trim() !== "");

const acfMetaKeys = collectMetaKeys(acfMetaRaw);

const allMetaKeys = collectMetaKeys(allMetaDataRaw).filter(
  (key) => !acfMetaKeys.includes(key)
);

const metaKeys = Array.from(new Set([...acfMetaKeys, ...allMetaKeys]));

const metaColumnsVisibilityDefaults = metaKeys.reduce((acc, key) => {
  acc[key] = false;
  return acc;
}, {});

// 👇 ברירת מחדל לסדר עמודות META (לפני row-actions)
const metaColumnsOrderDefaults = metaKeys;

// 👇 ברירת מחדל לרוחב עמודות META
const metaColumnsSizingDefaults = metaKeys.reduce((acc, key) => {
  acc[key] = 150; // רוחב ברירת מחדל לעמודות מטא
  return acc;
}, {});

// 👇 ברירת מחדל לעמודות TAXONOMIES – visibility = false
const taxonomyColumnsVisibilityDefaults =
  typeof window !== "undefined" && Array.isArray(window?.listTaxonomies)
    ? window.listTaxonomies
      .filter((tx) => tx?.name && tx.name !== "_product_cat")
      .reduce((acc, tx) => {
        acc[tx.name] = false;
        return acc;
      }, {})
    : {};

// 👇 ברירת מחדל לסדר עמודות TAXONOMIES (לפני row-actions)
const taxonomyColumnsOrderDefaults =
  typeof window !== "undefined" && Array.isArray(window?.listTaxonomies)
    ? window.listTaxonomies
      .filter((tx) => tx?.name && tx.name !== "_product_cat")
      .map((tx) => tx.name)
    : [];

// 👇 ברירת מחדל לרוחב עמודות TAXONOMIES
const taxonomyColumnsSizingDefaults =
  typeof window !== "undefined" && Array.isArray(window?.listTaxonomies)
    ? window.listTaxonomies
      .filter((tx) => tx?.name && tx.name !== "_product_cat")
      .reduce((acc, tx) => {
        acc[tx.name] = 180; // רוחב ברירת מחדל לעמודות טקסונומיה
        return acc;
      }, {})
    : {};

const perPage =
  window?.getWhizmanage?.find((c) => c.name === "perPage")?.reservedData
    .products || 100;

// ✅ אופציות מפורשות לפילטרים (כמו בהזמנות)
const PRODUCT_FILTER_OPTIONS = {
  status: ["publish", "draft", "pending", "private"],
  type: ["simple", "variable", "grouped", "external"],
  downloadable: [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
  ],
};

// ✅ פונקציית עזר לסידור נתונים לפני עריכה (תמונות + שדות מותאמים)
const transformProductForEdit = (product) => {
  if (!product) return product;
  const clone = { ...product };

  // 1. Fix Images: Main image vs Gallery
  // בווקומרס הכל מגיע ב-images. צריך להפריד לתמונה ראשית (image) וגלריה (images בלי הראשונה).
  if (Array.isArray(clone.images) && clone.images.length > 0) {
    if (!clone.image) {
      clone.image = clone.images[0];
    }
    // אם התמונה הראשית היא הראשונה ברשימה (התנהגות ברירת מחדל), הסר אותה מהגלריה ל-UI
    if (clone.image && clone.images[0]?.id === clone.image.id) {
      clone.images = clone.images.slice(1);
    }
  }

  // 2. Fix Custom Fields: Flatten meta_data to root
  // הטופס מצפה ששדות מותאמים יהיו זמינים בשורש האובייקט (watch(fieldKey))
  if (Array.isArray(clone.meta_data)) {
    clone.meta_data.forEach((meta) => {
      if (meta.key) {
        clone[meta.key] = meta.value;
      }
    });
  }

  return clone;
};

// --- קונפיגורציית הטבלה ---
const productsTableConfig = {
  transformForEdit: transformProductForEdit, // 👈 Hook חדש

  columnOrder: [
    "actions", "select", "expand", "name", "status", "image", "image_alt", "sale_price",
    "regular_price", "description", "short_description", "type", "attributes",
    "tags", "categories", "sale_date_range", "downloadable", "shipping_class",
    "sold_individually", "inventory", "weight", "sku", "global_unique_id",
    "dimensions", "meta_data", "gallery", "linked_products", "post_password",
    "date_created_gmt", "menu_order", "featured", "slug", "purchase_note", "yoast",
    // 👇 עמודות דינמיות לפני row-actions
    ...metaColumnsOrderDefaults,
    ...taxonomyColumnsOrderDefaults,
    "row-actions",
  ],
  columnSizing: {
    actions: 66,
    name: 200,
    sku: 130,
    regular_price: 130,
    sale_price: 120,
    inventory: 140,
    status: 134,
    date_created_gmt: 200,
    categories: 180,
    tags: 180,
    description: 200,
    short_description: 180,
    global_unique_id: 140,
    weight: 100,
    sale_date_range: 370,
    image: 80,
    image_alt: 150,
    gallery: 110,
    slug: 120,
    yoast: 60,
    downloadable: 130,
    post_password: 100,
    shipping_class: 150,
    linked_products: 180,
    // 👇 עמודות דינמיות
    ...metaColumnsSizingDefaults,
    ...taxonomyColumnsSizingDefaults,
    "row-actions": 36,
  },
  columnVisibility: {
    actions: true,
    select: true,
    expand: true,
    name: true,
    status: true,
    image: true,
    image_alt: false, // 👈 כבוי כברירת מחדל
    price: true,
    description: true,
    short_description: true,
    type: true,
    attributes: false,
    tags: true,
    categories: true,
    sale_date_range: false,
    downloadable: true,
    shipping_class: true,
    sold_individually: true,
    inventory: true,
    weight: false,
    sku: true,
    global_unique_id: false,
    dimensions: false,
    meta_data: true,
    gallery: false,
    linked_products: false,
    post_password: true,
    date_created_gmt: true,
    menu_order: false,
    featured: true,
    slug: true,
    yoast: true,
    purchase_note: true,
    "row-actions": true,
    ...metaColumnsVisibilityDefaults,
    ...taxonomyColumnsVisibilityDefaults,
  },
  columnPinning: { left: ["actions"], right: ["row-actions"] },

  // ✅ כמו בהזמנות: פילטרים עם options מפורשים + טקסונומיות מאופשרות
  enableFilters: [
    {
      column: "status",
      enable: true,
      label: "status",
      options: PRODUCT_FILTER_OPTIONS.status,
    },
    {
      column: "type",
      enable: true,
      label: "type",
      options: PRODUCT_FILTER_OPTIONS.type,
    },
    {
      column: "downloadable",
      enable: true,
      label: "Downloadable",
      options: PRODUCT_FILTER_OPTIONS.downloadable,
    },
    { column: "categories", enable: true, label: "categories" },
    { column: "tags", enable: true, label: "tags" },
    ...extraFilterDefs,
  ],

  pagination: { pageIndex: 0, pageSize: perPage },
};

// --- 3. יצירת ה-Store הספציפי ---
const useProductsStore = createTableStore(
  "products",
  [],
  productsTableConfig,
  {
    columnOrder: "products_columns_order",
    columnVisibility: "products_visible_columns",
    columnSizing: "products_columns_width",
    columnPinning: "products_pinned_columns",
    enableFilters: "products_enabled_filters",
  }
);

// --- 4. הזרקת הלוגיקה הספציפית ל-Store ---
useProductsStore.setState({
  masterUpdateCell: productsMasterUpdateCell(useProductsStore.getState),
});

// --- 5. הגדרות Bulk Edit ---
const ProductBulkEditRows = [
  { id: "categories", value: [], labels: true },
  { id: "tags", value: [], labels: true },
  { id: "images", value: [], labels: true },
  {
    id: "status",
    type: "select",
    options: ["No Change", "publish", "draft", "pending", "private"],
    value: "",
    isChangeTypeEditable: false,
    changeType: "-",
    valueType: "-",
    labels: false,
  },
  {
    id: "regular_price",
    type: "input",
    value: "",
    isChangeTypeEditable: true,
    changeType: "Increase",
    valueType: "%",
    isNewValueOption: true,
    labels: false,
  },
  {
    id: "sale_price",
    type: "input",
    value: "",
    isChangeTypeEditable: true,
    changeType: "Increase",
    valueType: "%",
    referenceBase: "price",
    isNewValueOption: true,
    labels: false,
  },
  {
    id: "weight",
    type: "input",
    value: "",
    isChangeTypeEditable: false,
    changeType: "New Value",
    valueType: "KG",
    labels: false,
  },
  {
    id: "length",
    type: "input",
    value: "",
    isChangeTypeEditable: false,
    changeType: "New Value",
    valueType: "CM",
    labels: false,
  },
  {
    id: "width",
    type: "input",
    value: "",
    isChangeTypeEditable: false,
    changeType: "New Value",
    valueType: "CM",
    labels: false,
  },
  {
    id: "height",
    type: "input",
    value: "",
    isChangeTypeEditable: false,
    changeType: "New Value",
    valueType: "CM",
    labels: false,
  },
  {
    id: "manage_stock",
    type: "select",
    options: ["No Change", "yes", "no"],
    value: "",
    isChangeTypeEditable: false,
    changeType: "-",
    valueType: "-",
    labels: false,
  },
  {
    id: "stock_status",
    type: "select",
    options: ["No Change", "instock", "outofstock", "backordered"],
    value: "",
    isChangeTypeEditable: false,
    changeType: "-",
    valueType: "-",
    labels: false,
  },
  {
    id: "stock_quantity",
    type: "input",
    value: "",
    isChangeTypeEditable: true,
    changeType: "Increase",
    valueType: "QTY",
    isNewValueOption: true,
    labels: false,
  },
  {
    id: "low_stock_amount",
    type: "input",
    value: "",
    isChangeTypeEditable: true,
    changeType: "Increase",
    valueType: "QTY",
    isNewValueOption: true,
    labels: false,
  },
  {
    id: "featured",
    type: "select",
    options: ["No Change", "yes", "no"],
    value: "No Change",
    isChangeTypeEditable: false,
    changeType: "-",
    valueType: "-",
    labels: false,
  },
  {
    id: "backorders",
    type: "select",
    options: ["No Change", "no", "notify", "yes"],
    value: "No Change",
    isChangeTypeEditable: false,
    changeType: "-",
    valueType: "-",
  },
  {
    id: "sold_individually",
    type: "select",
    options: ["No Change", "yes", "no"],
    value: "No Change",
    isChangeTypeEditable: false,
    changeType: "-",
    valueType: "-",
    labels: false,
  },
  ...extraTaxonomies,
];

const columnsPromise = import("./products.columns.js");

// ⚠️ כאן התיקון הקריטי: מעבירים entityToolbarConfig עם enableFilters/showDateFilter
const toolbarPromise = import("./products.toolbar.js").then((mod) => ({
  ...mod,
  entityToolbarConfig: (t, storeInstance) => {
    // מעבירים ל-Toolbar את ההגדרות כדי שיצייר StatusBarFilter
    const originalConfig = mod.entityToolbarConfig ? mod.entityToolbarConfig(t, storeInstance) : {};
    return {
      ...originalConfig,
      enableFilters: productsTableConfig.enableFilters ?? [],
      showDateFilter: productsTableConfig.showDateFilter === true,
    };
  },
}));

// --- 6. ייצוא "חבילת הקונפיגורציה" השלמה ---
export const productsConfig = {
  entityName: "products",

  fetchPage: ({ page, perPage, filters }) => {
    return entityApi.fetchPage({ page, perPage, ...filters });
  },

  useStore: useProductsStore,
  useTrashStoreFactory: useTrashProductsStore,

  api: {
    apiForTrash: productsApiForTrash,
    trashApi: trashApi,
    entityApi: entityApi,
    categoriesApi: entityCategoriesApi,
  },

  adapters: productsAdapters,
  tableConfigDefaults: {
    ...productsTableConfig,
    api: {
      reorderItems: entityApi.reorderItems, // (= productsApi.reorderItems)
    },
  }, bulkEditRows: ProductBulkEditRows,
  importConfig: productsImportConfig,

  loadColumns: () => columnsPromise,
  loadToolbar: () => toolbarPromise,
};

// --- ייצואים גנריים ---
export { productsTableConfig as entityTableConfig };
export { useProductsStore as useEntityStore };
export { ProductBulkEditRows as EntityBulkEditRows };
