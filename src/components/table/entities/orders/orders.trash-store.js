// src/components/table/entities/orders/orders.trash-store.js
import { makeUseTrashEntityStore } from "../../trash/useTrashEntityStore.js";
import { ordersAdapters } from "./orders.adapters.js";

export const useTrashOrdersStore = makeUseTrashEntityStore({
  key: "orders",
  adapters: ordersAdapters,
});

// Alias גנרי
export { useTrashOrdersStore as useTrashEntityStore };
