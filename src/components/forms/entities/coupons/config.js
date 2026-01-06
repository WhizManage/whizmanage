// src/components/forms/entities/coupons/config.js

import { CopyMinus, GaugeCircle, Infinity, Tag } from "lucide-react";

const couponConfig = {
  triggerLabel: "Add coupon",
  title: "Create a new coupon",
  endpoint: null,
  labels: {
    singular: "coupon",
    plural: "coupons",
  },
  defaults: {
    code: "",
    description: "",
    discount_type: "fixed_cart",
    amount: "",
    status: "publish",  // ✅ הוספה - ברירת מחדל מפורסם
    free_shipping: false,
    date_expires: null,
    minimum_amount: "",
    maximum_amount: "",
    usage_limit: 0,
    usage_limit_per_user: 0,
    limit_usage_to_x_items: 0,
    individual_use: false,
    exclude_sale_items: false,
    product_ids: [],
    excluded_product_ids: [],
    product_categories: [],
    excluded_product_categories: [],
    email_restrictions: [],
  },
  groups: [
    // ========== עמודה שמאלית ==========
    {
      title: "Coupon Details",
      icon: Tag,
      fields: [
        {
          name: "code",
          label: "Coupon code",
          type: "couponcode",
          rules: {
            required: "Coupon code is required",
          },
          placeholder: "Enter coupon code (e.g. SAVE20)",
          helperText:
            "A unique code that customers will use at checkout. Click Generate to create a random code.",
          codeLength: 8,
        },
        {
          name: "description",
          label: "Description",
          type: "textarea",
          placeholder: "Optional coupon description for internal use",
          rows: 3,
          helperText:
            "Internal description to help you remember what this coupon is for.",
        },
        {
          name: "discount_type",
          label: "Discount type",
          type: "select",
          rules: { required: "Discount type is required" },
          options: [
            { value: "fixed_cart", label: "Fixed cart discount" },
            { value: "percent", label: "Percentage discount" },
            { value: "fixed_product", label: "Fixed product discount" },
          ],
          helperText: "Choose how the discount will be calculated and applied.",
        },
        {
          name: "amount",
          label: "Coupon amount",
          type: "number",
          step: "0.01",
          min: 0,
          showCurrency: true,
          rules: {
            required: "Amount is required",
            min: { value: 0, message: "Amount must be ≥ 0" },
            // ✅ ולידציה מותאמת: אם אחוזים, לא יותר מ-100
            validate: (value, formValues) => {
              if (formValues?.discount_type === "percent" && Number(value) > 100) {
                return "Percent discount cannot exceed 100";
              }
              return true;
            },
          },
          placeholder: "0.00",
          helperText:
            "The discount amount. For percentage discounts, enter the percentage value (e.g., 20 for 20%).",
        },
        {
          name: "free_shipping",
          label: "Allow free shipping",
          type: "switch",
          helperText:
            "Check this box to grant free shipping when this coupon is used.",
        },
        {
          name: "date_expires",
          label: "Coupon expiry date",
          type: "daterange",
          startDateField: "date_expires",
          endDateField: "date_expires_end",
          scheduleButtonLabel: "Set expiry date",
          clearButtonLabel: "Clear",
          helperText:
            "Set an expiration date for this coupon. Leave empty for no expiration.",
        },
      ],
    },
    {
      title: "Usage Limits",
      icon: Infinity,
      fields: [
        {
          name: "usage_limit",
          label: "Usage limit per coupon",
          type: "number",
          step: 1,
          min: 0,
          placeholder: "Unlimited usage",
          helperText:
            "How many times this coupon can be used in total before it becomes void. Leave blank or set to 0 for unlimited usage.",
        },
        {
          name: "usage_limit_per_user",
          label: "Usage limit per user",
          type: "number",
          step: 1,
          min: 0,
          placeholder: "Unlimited usage",
          helperText:
            "How many times an individual user can use this coupon. Uses billing email for guests and user ID for logged in users.",
        },
        {
          name: "limit_usage_to_x_items",
          label: "Limit usage to X items",
          type: "number",
          step: 1,
          min: 0,
          placeholder: "Apply to all qualifying items",
          helperText:
            "The maximum number of individual items this coupon can apply to when using product discounts. Leave blank to apply to all qualifying items in cart.",
        },
      ],
    },

    // ========== עמודה ימנית ==========
    {
      title: "Advanced Usage Restrictions",
      icon: GaugeCircle,
      fields: [
        {
          name: "product_ids",
          label: "Products",
          type: "productids",
          helperText:
            "Products that the coupon will be applied to, or that need to be in the cart in order for the 'Fixed cart discount' to be applied.",
        },
        {
          name: "excluded_product_ids",
          label: "Exclude products",
          type: "productids",
          excluded: true,
          helperText:
            "Products that the coupon will not be applied to, or that cannot be in the cart in order for the 'Fixed cart discount' to be applied.",
        },
        {
          name: "product_categories",
          label: "Product categories",
          type: "multiselect",
          taxonomyType: "product_cat",
          helperText:
            "Product categories that the coupon will be applied to, or that need to be in the cart in order for the 'Fixed cart discount' to be applied.",
        },
        {
          name: "excluded_product_categories",
          label: "Exclude categories",
          type: "multiselect",
          taxonomyType: "product_cat",
          excluded: true,
          helperText:
            "Product categories that the coupon will NOT be applied to.",
        },
      ],
    },
    {
      title: "General Restrictions",
      icon: CopyMinus,
      fields: [
        {
          name: "minimum_amount",
          label: "Minimum spend",
          type: "number",
          step: "0.01",
          min: 0,
          showCurrency: true,
          placeholder: "No minimum",
          helperText:
            "The minimum subtotal (before tax and shipping) required in the cart to use this coupon.",
        },
        {
          name: "maximum_amount",
          label: "Maximum spend",
          type: "number",
          step: "0.01",
          min: 0,
          showCurrency: true,
          placeholder: "No maximum",
          helperText:
            "The maximum subtotal (before tax and shipping) allowed in the cart when using this coupon.",
        },
        {
          name: "email_restrictions",
          label: "Allowed emails",
          type: "emails",
          placeholder: "e.g. example@gmail.com or *@gmail.com",
          helperText:
            "List of allowed billing emails. Separate with commas. Use asterisk (*) for wildcards (e.g., '*@gmail.com' matches all Gmail addresses).",
        },
        {
          name: "individual_use",
          label: "Individual use only",
          type: "switch",
          helperText:
            "Check this if the coupon cannot be used in conjunction with other coupons.",
        },
        {
          name: "exclude_sale_items",
          label: "Exclude sale items",
          type: "switch",
          helperText:
            "Check this if the coupon should not apply to items on sale. Per-item coupons will only work if the item is not on sale. Per-cart coupons will only work if there are items in the cart that are not on sale.",
        },
      ],
    },
  ],
};

export default couponConfig;
