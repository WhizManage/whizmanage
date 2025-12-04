export const OrdersBulkEditRows = [
  // General order fields
  {
    id: "status",
    type: "select",
    options: ["No Change", "pending", "processing", "on-hold", "completed", "cancelled", "refunded", "failed"],
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
    value: "",
    isChangeTypeEditable: false,
    changeType: "-",
    valueType: "-",
  },
  {
    id: "message_to_customer",
    type: "input",
    value: "",
    isChangeTypeEditable: false,
    changeType: "-",
    valueType: "-",
  },
  // // Customer information
  // {
  //   id: "billing_first_name",
  //   type: "input",
  //   value: "",
  //   isChangeTypeEditable: false,
  //   changeType: "-",
  //   valueType: "-",
  // },
  // {
  //   id: "billing_last_name",
  //   type: "input",
  //   value: "",
  //   isChangeTypeEditable: false,
  //   changeType: "-",
  //   valueType: "-",
  // },
  // {
  //   id: "billing_email",
  //   type: "input",
  //   value: "",
  //   isChangeTypeEditable: false,
  //   changeType: "-",
  //   valueType: "-",
  // },
  // {
  //   id: "billing_phone",
  //   type: "input",
  //   value: "",
  //   isChangeTypeEditable: false,
  //   changeType: "-",
  //   valueType: "-",
  // },

  // // Shipping information
  // {
  //   id: "shipping_method",
  //   type: "select",
  //   options: ["No Change", "free_shipping", "flat_rate", "local_pickup"],
  //   value: "No Change",
  //   isChangeTypeEditable: false,
  //   changeType: "-",
  //   valueType: "-",
  // },

  // // Price fields with advanced edit options
  // {
  //   id: "discount_total",
  //   type: "input",
  //   value: "",
  //   isChangeTypeEditable: true,
  //   isNewValueOption: true,
  //   changeType: "Increase",
  //   valueType: "%",
  // },
  // {
  //   id: "shipping_total",
  //   type: "input",
  //   value: "",
  //   isChangeTypeEditable: true,
  //   isNewValueOption: true,
  //   changeType: "Increase",
  //   valueType: "%",
  // },
  // {
  //   id: "total",
  //   type: "input",
  //   value: "",
  //   isChangeTypeEditable: true,
  //   isNewValueOption: true,
  //   changeType: "Increase",
  //   valueType: "%",
  // }
];