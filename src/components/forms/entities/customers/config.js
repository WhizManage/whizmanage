// src/components/forms/entities/customers/config.js

import { Mail, MapPin, Truck, User } from "lucide-react";

const customerConfig = {
  triggerLabel: "Add customer",
  title: "Create a new customer",
  // ברירות מחדל ראשוניות
  defaults: {
   role: "customer",
    email: "",
    first_name: "",
    last_name: "",
    username: "",
    password: "",
    // אובייקטים לכתובות (כדי ש-react-hook-form לא יתלונן)
    billing: {
      first_name: "",
      last_name: "",
      company: "",
      address_1: "",
      address_2: "",
      city: "",
      state: "",
      postcode: "",
      country: "",
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
      country: "",
    },
  },

  // שדה עיקרי להצגה / פוקוס
  primaryField: "email",

  groups: [
    // 🧍‍♀️ פרטי לקוח בסיסיים
    {
      title: "Customer details",
      icon: User,
      fields: [
        {
          name: "role",
          label: "Role",
          type: "select",
          options: [
            { value: "customer", label: "Customer" },
            { value: "subscriber", label: "Subscriber" },
          ],
        },
        {
          name: "email",
          label: "Email",
          type: "text",
          placeholder: "customer@example.com",
          rules: {
            required: "Email is required",
            pattern: {
              value: /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
              message: "Invalid email address",
            },
          },
        },
        {
          name: "first_name",
          label: "First name",
          type: "text",
          placeholder: "John",
        },
        {
          name: "last_name",
          label: "Last name",
          type: "text",
          placeholder: "Doe",
        },
        {
          name: "username",
          label: "Username",
          type: "text",
          placeholder: "johndoe",
          rules: {
            minLength: {
              value: 3,
              message: "Username must be at least 3 characters",
            },
          },
        },
        {
          name: "password",
          label: "Password (optional)",
          type: "text",
          placeholder: "Leave empty to auto-generate",
        },
        {
          name: "note",
          label: "Internal note (optional)",
          type: "textarea",
          placeholder: "Notes about this customer...",
          rows: 3,
        },
      ],
    },

    // 💳 כתובת חיוב (billing)
    {
      title: "Billing details",
      icon: MapPin,
      fields: [
        {
          name: "billing.first_name",
          label: "Billing first name",
          type: "text",
          placeholder: "First name",
        },
        {
          name: "billing.last_name",
          label: "Billing last name",
          type: "text",
          placeholder: "Last name",
        },
        {
          name: "billing.company",
          label: "Company",
          type: "text",
          placeholder: "Company (optional)",
        },
        {
          name: "billing.address_1",
          label: "Address line 1",
          type: "text",
          placeholder: "Street and number",
        },
        {
          name: "billing.address_2",
          label: "Address line 2",
          type: "text",
          placeholder: "Apartment, suite, etc. (optional)",
        },
        {
          name: "billing.city",
          label: "City",
          type: "text",
        },
        {
          name: "billing.state",
          label: "State / Province / Region",
          type: "text",
        },
        {
          name: "billing.postcode",
          label: "Postcode",
          type: "text",
        },
        {
          name: "billing.country",
          label: "Country code",
          type: "text",
          placeholder: "e.g. IL, US, GB",
        },
        {
          name: "billing.phone",
          label: "Phone",
          type: "text",
          placeholder: "+972...",
        },
        {
          name: "billing.email",
          label: "Billing email",
          type: "text",
          placeholder: "customer@example.com",
          icon: Mail,
        },
      ],
    },

    // 📦 כתובת משלוח (shipping)
    {
      title: "Shipping details",
      icon: Truck,
      fields: [
        {
          name: "shipping.first_name",
          label: "Shipping first name",
          type: "text",
          placeholder: "First name",
        },
        {
          name: "shipping.last_name",
          label: "Shipping last name",
          type: "text",
          placeholder: "Last name",
        },
        {
          name: "shipping.company",
          label: "Company",
          type: "text",
          placeholder: "Company (optional)",
        },
        {
          name: "shipping.address_1",
          label: "Address line 1",
          type: "text",
          placeholder: "Street and number",
        },
        {
          name: "shipping.address_2",
          label: "Address line 2",
          type: "text",
          placeholder: "Apartment, suite, etc. (optional)",
        },
        {
          name: "shipping.city",
          label: "City",
          type: "text",
        },
        {
          name: "shipping.state",
          label: "State / Province / Region",
          type: "text",
        },
        {
          name: "shipping.postcode",
          label: "Postcode",
          type: "text",
        },
        {
          name: "shipping.country",
          label: "Country code",
          type: "text",
          placeholder: "e.g. IL, US, GB",
        },
      ],
    },
  ],
};

export default customerConfig;
