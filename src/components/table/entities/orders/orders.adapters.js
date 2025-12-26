// src/components/table/entities/orders/orders.adapters.js
import { makeTrashAdapters } from "../../trash/trashAdapters.js";

export const ordersAdapters = makeTrashAdapters({
  idField: "id",
  toActive: (o) => ({ ...o, status: o.status || "pending", date_deleted: undefined }),
  toTrash:  (o) => ({ ...o, date_deleted: o.date_deleted || new Date().toISOString() }),
});

// Alias גנרי
export { ordersAdapters as entityAdapters };
