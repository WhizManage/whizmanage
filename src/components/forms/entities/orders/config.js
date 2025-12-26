// src/components/forms/entities/orders/config.js

import { Settings2, ShoppingBag, ShoppingCart, User } from "lucide-react";

const orderConfig = {
  triggerLabel: "Add order",
  title: "Create a new order",
  endpoint: null,
  labels: {
    singular: "order",
    plural: "orders",
  },
  defaults: {
    status: "pending",
    payment_method: "manual",
    payment_method_title: "Manual Payment",
    set_paid: false,
    customer_note: "",
    date_created_gmt: null,
    customer_id: null,
    billing: {
      first_name: "",
      last_name: "",
      company: "",
      address_1: "",
      address_2: "",
      city: "",
      state: "",
      postcode: "",
      country: "IL",
      email: "",
      phone: "",
    },
    shipping: {
      first_name: "",
      last_name: "",
      company: "",
      address_1: "",
      address_2: "",
      city: "",
      state: "",
      postcode: "",
      country: "IL",
    },
    line_items: [],
    meta_data: [],
  },
  groups: [
    // ========== עמודה שמאלית ==========
    {
      title: "Order Details",
      icon: ShoppingBag,
      fields: [
        {
          name: "status",
          label: "Order Status",
          type: "select",
          rules: { required: "Order status is required" },
          options: [
            { value: "pending", label: "Pending payment" },
            { value: "processing", label: "Processing" },
            { value: "on-hold", label: "On hold" },
            { value: "completed", label: "Completed" },
            { value: "cancelled", label: "Cancelled" },
            { value: "refunded", label: "Refunded" },
            { value: "failed", label: "Failed" },
          ],
          helperText: "The current status of the order.",
        },
        {
          name: "payment_method",
          label: "Payment Method",
          type: "select",
          options: [
            { value: "manual", label: "Manual Payment" },
            { value: "credit_card", label: "Credit Card" },
            { value: "paypal", label: "PayPal" },
            { value: "bank_transfer", label: "Bank Transfer" },
            { value: "cod", label: "Cash on Delivery" },
            { value: "bit", label: "Bit" },
            { value: "apple_pay", label: "Apple Pay" },
            { value: "google_pay", label: "Google Pay" },
            { value: "cheque", label: "Check" },
          ],
          helperText: "How the customer will pay for the order.",
        },
        {
          name: "date_created_gmt",
          label: "Order Date",
          type: "datetime", // ✅ שונה מ-daterange
          helperText: "The date and time when the order was created.",
        },
        {
          name: "set_paid",
          label: "Mark as paid",
          type: "switch",
          helperText: "Check this to mark the order as paid immediately.",
        },
        {
          name: "customer_note",
          label: "Customer Note",
          type: "textarea",
          rows: 3,
          placeholder: "Add a note for the customer (optional)",
          helperText: "A note visible to the customer on order confirmation.",
        },
      ],
    },
    {
      title: "Customer Information",
      icon: User,
      fields: [
        {
          name: "customer_id",
          label: "Select Existing Customer",
          type: "customerselect",
          placeholder: "Choose a customer or leave empty for guest",
          helperText:
            "Select an existing customer to auto-fill billing and shipping details, or leave empty to manually enter details for a guest checkout.",
        },
        {
          name: "billing",
          label: "Billing Address",
          type: "address",
          showEmail: true,
          showPhone: true,
          showCopyCheckbox: false,
          helperText: "The billing address for this order.",
        },
        {
          name: "shipping",
          label: "Shipping Address",
          type: "address",
          showEmail: false,
          showPhone: false,
          showCopyCheckbox: true,
          copyFromName: "billing",
          helperText: "The shipping address for this order.",
        },
      ],
    },

    // ========== עמודה ימנית ==========
    {
      // title: "Order Items",
      icon: ShoppingCart,
      fields: [
        {
          name: "line_items",
          type: "orderlineitems",
          helperText:
            "Add products to this order. You can also apply coupons and see the total calculation.",
        },
      ],
    },
    {
      title: "Custom Fields",
      icon: Settings2,
      fields: [
        {
          name: "meta_data",
          label: "Custom Order Fields",
          type: "customfieldskeyvalue",
          helperText:
            "Add custom meta data to this order. This can be used for tracking, integration with other systems, or storing additional information.",
        },
      ],
    },
  ],
};

export default orderConfig;
