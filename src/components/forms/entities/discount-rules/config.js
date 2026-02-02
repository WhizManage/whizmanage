// src/components/forms/entities/discount-rules/config.js

import { Settings2, CalendarClock, Filter as FilterIcon, Braces } from "lucide-react";

const discountRuleConfig = {
  triggerLabel: "Add rule",
  title: "Create a new discount rule",
  
  endpoint: `${window.siteUrl}/wp-json/whizmanage/v1/discount-rules`,
  labels: { singular: "Rule", plural: "Rules" },

  defaults: {
    name: "",
    type: "product_adjustment",
    status: "publish",
    priority: 0,
    start_date: null,
    end_date: null,
    conditions: { logic: "all", rules: [] },
    filters: [],
    actions: {
      method: "percentage",
      value: 10,
      apply_as_coupon: false,
      coupon_label: "",
    },
  },

  groups: [
    {
      title: "Rule details",
      icon: Settings2,
      fields: [
        {
          name: "name",
          label: "Rule name",
          type: "text",
          placeholder: "e.g. Summer Sale 20%",
          rules: { required: "Rule name is required" },
        },
        {
          name: "type",
          label: "Discount type",
          type: "typewithsettings",
          actionsField: "actions",
          options: (() => {
            // נעילה אם אין רישיון (hasLicence לא true)
            const noLicence = typeof window !== "undefined" && window.hasLicence !== true;
            return [
              { value: "product_adjustment", label: "Product adjustment" },
              { value: "cart_adjustment", label: "Cart adjustment", locked: noLicence },
              { value: "bulk_discount", label: "Bulk discount", locked: noLicence },
              { value: "bogo_discount", label: "BOGO", locked: noLicence },
              { value: "bxgy_discount", label: "BXGY", locked: noLicence },
              { value: "shipping_discount", label: "Shipping discount", locked: noLicence },
              { value: "spend_bundle", label: "Spend bundle", locked: noLicence },
            ];
          })(),
        },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "publish", label: "Active" },
            { value: "draft", label: "Draft" },
          ],
        },
        {
          name: "priority",
          label: "Priority",
          type: "number",
          placeholder: "0",
          step: 1,
          min: 0,
          helperText: "Higher priority rules are applied first",
        },
      ],
    },

    {
      title: "Schedule",
      icon: CalendarClock,
      fields: [
        {
          name: "date_range",
          label: "Schedule",
          type: "daterange",
          startDateField: "start_date",
          endDateField: "end_date",
          scheduleButtonLabel: "Schedule",
          clearButtonLabel: "Clear",
          helperText: "Leave empty for no time restriction",
          required: false,
        },
      ],
    },

    {
      title: "Filters",
      icon: FilterIcon,
      fields: [
        {
          name: "filters",
          label: "",
          type: "filters",
          description: "Limit by categories, products, tags, roles, etc.",
        },
      ],
    },

    {
      title: "Conditions",
      icon: Braces,
      fields: [
        {
          name: "conditions",
          label: "",
          type: "conditions",
          description: "Cart subtotal, item count, etc.",
        },
      ],
    },
  ],
};

export default discountRuleConfig;