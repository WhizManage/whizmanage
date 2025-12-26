// src/components/table/entities/products/products.trash-store.js
import { makeUseTrashEntityStore } from "../../trash/useTrashEntityStore.js";
import { productsAdapters } from "./products.adapters.js";

export const useTrashProductsStore = makeUseTrashEntityStore({
  key: "products",
  adapters: productsAdapters,
});

// --- ✅ ייצוא גנרי ---
// זה השם שהקונטיינר הגנרי יחפש
export { useTrashProductsStore as useTrashEntityStore };