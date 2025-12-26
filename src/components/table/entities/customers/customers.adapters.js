// src/components/table/entities/customers/customers.adapters.js
import { makeTrashAdapters } from "../../trash/trashAdapters.js";

export const customersAdapters = makeTrashAdapters({
  idField: "id",
  toActive: (c) => ({
    ...c,
    status: c.status || "active",
    date_deleted: undefined,
  }),
  toTrash: (c) => ({
    ...c,
    status: "trash",
    date_deleted: c.date_deleted || new Date().toISOString(),
  }),
});

// --- Generic alias ---
export { customersAdapters as entityAdapters };
