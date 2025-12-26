// src/components/table/entities/coupons/coupons.adapters.js
import { makeTrashAdapters } from "../../trash/trashAdapters.js";

export const couponsAdapters = makeTrashAdapters({
  idField: "id",
  toActive: (c) => ({
    ...c,
    status: c.status || "publish",
    date_deleted: undefined,
  }),
  toTrash: (c) => ({
    ...c,
    status: "trash",
    date_deleted: c.date_deleted || new Date().toISOString(),
  }),
});

// --- Generic alias ---
export { couponsAdapters as entityAdapters };
