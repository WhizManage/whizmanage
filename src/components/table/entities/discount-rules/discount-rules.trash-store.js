// src/components/table/entities/discount-rules/discount-rules.trash-store.js

import { makeUseTrashEntityStore } from "../../trash/useTrashEntityStore.js";
import { discountRulesAdapters } from "./discount-rules.adapters.js";

export const useTrashDiscountRulesStore = makeUseTrashEntityStore({
  key: "discount-rules",
  adapters: discountRulesAdapters,
});

// --- Generic alias ---
export { useTrashDiscountRulesStore as useTrashEntityStore };
