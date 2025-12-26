// src/components/table/entities/orders/orders.toolbar.js

import { getOrderCustomActions } from "./orders.actions.js";

export const ordersToolbarConfig = (t) => ({
  entityName: "orders",
  endpoint: `${window.siteUrl}/wp-json/wc/v3/orders`,
  customActions: getOrderCustomActions(t),
});

export { ordersToolbarConfig as entityToolbarConfig };