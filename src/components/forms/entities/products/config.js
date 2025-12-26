// src/components/forms/entities/products/config.js

import {
  CircleDollarSign,
  Container,
  Image,
  LayoutList,
  Package,
  Settings2,
  Tags,
} from "lucide-react";

const productConfig = {
  triggerLabel: "Add product",
  title: "Create a new product",
  defaults: {
    type: "simple",
    status: "draft",
    regular_price: "",
    stock_quantity: null,
    manage_stock: false,
    date_on_sale_from: null,
    date_on_sale_to: null,
    downloadable: false,
    virtual: false,
    downloads: [],
    download_expiry: -1,
    download_limit: -1,
  },
  primaryField: "name",

  groups: [
    {
      title: "Describe your product",
      icon: LayoutList,
      fields: [
        {
          name: "name",
          label: "Product Name",
          type: "text",
          placeholder: "Name",
          rules: {
            required: "Product name is required",
          },
        },
        {
          name: "description",
          label: "Product Description",
          type: "wysiwyg",
          height: "full",
        },
        {
          name: "short_description",
          label: "Product Short description",
          type: "wysiwyg",
          height: "full",
        },
      ],
    },
    {
      title: "Product prices",
      icon: CircleDollarSign,
      fields: [
        {
          name: "regular_price",
          label: "Regular price",
          type: "number",
          step: 1,
          min: 0,
          placeholder: "0.00",
          showCurrency: true,
          rules: {
            min: { value: 0, message: "Price cannot be negative" },
          },
        },
        {
          name: "sale_price",
          label: "Sale price (optional)",
          type: "number",
          step: 1,
          min: 0,
          placeholder: "0.00",
          showCurrency: true,
          rules: {
            min: { value: 0, message: "Price cannot be negative" },
          },
        },
        {
          type: "daterange",
          label: "Sale duration",
          startDateField: "date_on_sale_from",
          endDateField: "date_on_sale_to",
          scheduleButtonLabel: "Schedule",
          clearButtonLabel: "Clear",
          helperText: "Leave empty to keep sale price active indefinitely",
        },
      ],
    },
    {
      title: "Inventory",
      icon: Container,
      fields: [
        {
          name: "inventory",
          type: "inventory",
          skuField: "sku",
          manageStockField: "manage_stock",
          stockQuantityField: "stock_quantity",
          backordersField: "backorders",
          stockStatusField: "stock_status",
        },
      ],
    },
    {
      title: "Product image & Gallery",
      icon: Image,
      fields: [
        {
          name: "image",
          label: "Product image",
          type: "image",
          multiple: false,
        },
        {
          name: "images",
          label: "Product gallery",
          type: "image",
          multiple: true,
          maxSelection: 10,
        },
      ],
    },
    {
      title: "Tags & Categories",
      icon: Tags,
      fields: [
        {
          name: "tags",
          label: "Product tags",
          type: "multiselect",
          taxonomyType: "product_tag",
        },
        {
          name: "categories",
          label: "Product categories",
          type: "multiselect",
          taxonomyType: "product_cat",
        },
        {
          type: "additionaltaxonomies",
          name: "additional_taxonomies",
          label: "Additional Taxonomies",
          defaultOpen: false,
        },
      ],
    },
    {
      title: "Additional Fields",
      icon: Tags,
      fields: [
        {
          name: "status",
          label: "Product status",
          type: "select",
          options: [
            { value: "draft", label: "Draft" },
            { value: "publish", label: "Published" },
            { value: "private", label: "Private" },
          ],
        },
        {
          name: "purchase_note",
          label: "Purchase note (email to customer)",
          type: "textarea",
          placeholder: "send automatically message after purchase",
          rows: 3,
        },
        {
          type: "downloadable",
          label: "Downloadable product",
          name: "downloadable",
          downloadsField: "downloads",
          expiryField: "download_expiry",
          limitField: "download_limit",
          virtualField: "virtual",
        },
      ],
    },
    {
      title: "Custom Fields",
      icon: Settings2,
      fields: [
        {
          type: "customfields",
          name: "meta_data",
          label: "Custom Fields",
          fieldsSource: "window.WhizManageCustomFields",
          defaultOpen: false,
        },
      ],
    },
    {
      title: "Product Type",
      icon: Package,
      fields: [
        {
          type: "producttype",
          name: "type",
          label: "Product type",
          requiredField: "name",
          showVariationsButton: true,
          showGroupedButton: true,
          showExternalButton: true,
          // ✅ הסר את onProductCreated - לא צריך אותו יותר
        },
      ],
    },
  ],
};

export default productConfig;
