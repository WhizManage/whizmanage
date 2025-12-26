// src/components/table/entities/coupons/coupons.trash-store.js
import { makeUseTrashEntityStore } from "../../trash/useTrashEntityStore.js";
import { couponsAdapters } from "./coupons.adapters.js";

export const useTrashCouponsStore = makeUseTrashEntityStore({
  key: "coupons",
  adapters: couponsAdapters,
});

// --- Generic alias ---
export { useTrashCouponsStore as useTrashEntityStore };
