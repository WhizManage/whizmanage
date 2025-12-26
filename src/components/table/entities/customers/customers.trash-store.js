// src/components/table/entities/customers/customers.trash-store.js
import { makeUseTrashEntityStore } from "../../trash/useTrashEntityStore.js";
import { customersAdapters } from "./customers.adapters.js";

export const useTrashCustomersStore = makeUseTrashEntityStore({
  key: "customers",
  adapters: customersAdapters,
});

// --- Generic alias ---
export { useTrashCustomersStore as useTrashEntityStore };
