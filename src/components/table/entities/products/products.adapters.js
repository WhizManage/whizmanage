// src/components/table/products/productsAdapters.js
import { makeTrashAdapters } from "../../trash/trashAdapters.js";

export const productsAdapters = makeTrashAdapters({
  idField: "id",
  toActive: (p) => ({ ...p, status: p.status || "publish", date_deleted: undefined }),
  toTrash:  (p) => ({ ...p, date_deleted: p.date_deleted || new Date().toISOString() }),
});

// --- Generic alias ---
//
// Export a generic name for the adapters so that generic table
// components can import `entityAdapters` regardless of the entity.
export { productsAdapters as entityAdapters };
