// src/components/table/store/useCustomTaxonomiesStore.js
import { create } from "zustand";
import { getApi } from "@/services/services";

const normalizeApiName = (name) => String(name || "");

// טקסונומיות core – לא נטען דרך ה־custom store:
const CORE_NAMES = new Set([
  "product_cat",
  "_product_cat",
  "categories",
  "product_tag",
  "tags",
]);

export const useCustomTaxonomiesStore = create((set, get) => ({
  byName: {},            // { [taxonomyName]: Term[] }
  isLoadingByName: {},   // { [taxonomyName]: boolean }
  _loaded: new Set(),    // מאגר מה נטען
  _inflight: new Map(),  // מניעת כפילויות
  _siteUrl: typeof window !== "undefined" ? (window.siteUrl || "") : "",

  _setLoading(name, v) {
    set((s) => ({ isLoadingByName: { ...s.isLoadingByName, [name]: v } }));
  },

  select(name) {
    return get().byName[name] || [];
  },

  // 👇 helper חדש – בודק אם טקסונומיה מסוימת בטעינה
  isLoading(name) {
    if (!name) return false;
    const s = get();
    return !!s.isLoadingByName?.[name];
  },

  async ensure(name) {
    const state = get();
    if (!name) return [];

    if (CORE_NAMES.has(name)) return []; // core לא מכאן

    if (state._loaded.has(name)) return state.select(name);
    if (state._inflight.get(name)) return state._inflight.get(name);

    const p = (async () => {
      try {
        state._setLoading(name, true);
        const siteUrl = state._siteUrl;

        const list = Array.isArray(window.listTaxonomies) ? window.listTaxonomies : [];
        const def = list.find((t) => t?.name === name);
        if (!def) {
          console.warn(`[custom-taxonomies] taxonomy "${name}" not found in window.listTaxonomies`);
          set((s) => ({ byName: { ...s.byName, [name]: [] } }));
          state._loaded.add(name);
          return [];
        }

        const apiName = normalizeApiName(name);
        const res = await getApi(`${siteUrl}/wp-json/whizmanage/v1/taxonomy/${apiName}/terms`);
        const terms = Array.isArray(res?.data) ? res.data : [];

        set((s) => ({ byName: { ...s.byName, [name]: terms } }));
        state._loaded.add(name);
        return terms;
      } finally {
        state._inflight.delete(name);
        state._setLoading(name, false);
      }
    })();

    state._inflight.set(name, p);
    return p;
  },

  setList(name, list) {
    set((s) => ({
      byName: { ...s.byName, [name]: Array.isArray(list) ? list : [] },
    }));
    get()._loaded.add(name);
  },
}));

// ✅ תאימות אחורה למי שעדיין מייבא useTaxonomiesStore
export const useTaxonomiesStore = useCustomTaxonomiesStore;
export default useCustomTaxonomiesStore;
