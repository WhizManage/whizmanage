// src/components/table/store/useCoreTaxonomiesStore.js
import { create } from "zustand";
import { getApi } from "@/services/services";

const PER_PAGE = 100;

const paths = {
  categories: "/wp-json/wc/v3/products/categories",
  tags: "/wp-json/wc/v3/products/tags",
};

async function fetchPage(siteUrl, resourcePath, page, perPage = PER_PAGE) {
  const url = `${siteUrl}${resourcePath}?per_page=${perPage}&page=${page}`;
  const res = await getApi(url);
  const data = Array.isArray(res?.data) ? res.data : [];
  const totalPagesHeader =
    res?.headers?.["x-wp-totalpages"] || res?.headers?.["X-WP-TotalPages"];
  const totalPages = Number.parseInt(totalPagesHeader, 10);
  return { data, totalPages: Number.isFinite(totalPages) ? totalPages : null };
}

export const useCoreTaxonomiesStore = create((set, get) => ({
  // --- Promise guards to prevent duplicate fetches ---
  _bootPromise: null,
  _bgPromises: { categories: null, tags: null },

  // state
  isLoaded: false,        // finished loading everything
  isLoading: false,       // first-page loading (UI blocking)
  isBgLoading: {          // background continuation
    categories: false,
    tags: false,
  },

  // data
  categories: [],
  tags: [],

  // Fast boot: fetch first page now, rest in background ONCE
  loadTaxonomiesOnce: async () => {
    const state = get();
    if (state.isLoaded) return;

    // if a boot is already running, return it
    if (state._bootPromise) return state._bootPromise;

    const boot = (async () => {
      set({ isLoading: true });
      const siteUrl = window.siteUrl || "";

      // Fetch first page for both in parallel
      const [c1, t1] = await Promise.all([
        fetchPage(siteUrl, paths.categories, 1),
        fetchPage(siteUrl, paths.tags, 1),
      ]);

      // Immediate state update with first page
      set({
        categories: c1.data,
        tags: t1.data,
        isLoading: false,
      });

      // If there's no more pages for both — done
      const noMoreCats = !c1.totalPages || c1.totalPages <= 1;
      const noMoreTags = !t1.totalPages || t1.totalPages <= 1;
      if (noMoreCats && noMoreTags) {
        set({ isLoaded: true });
        return;
      }

      // Background fetch helper with per-key promise guard
      const bgFetch = async (key, firstPageMeta) => {
        const current = get()[key] || [];
        const resourcePath = paths[key];
        const totalPages = firstPageMeta.totalPages;

        // already running? return same promise
        const running = get()._bgPromises[key];
        if (running) return running;

        set((s) => ({ isBgLoading: { ...s.isBgLoading, [key]: true } }));

        const p = (async () => {
          let acc = [...current];

          if (totalPages && totalPages > 1) {
            for (let page = 2; page <= totalPages; page++) {
              const { data } = await fetchPage(siteUrl, resourcePath, page);
              if (!data.length) break;
              acc = acc.concat(data);
            }
          } else {
            // Fallback when totalPages header missing
            let page = 2;
            while (true) {
              const { data } = await fetchPage(siteUrl, resourcePath, page);
              if (!data.length) break;
              acc = acc.concat(data);
              if (data.length < PER_PAGE) break;
              page += 1;
            }
          }

          set((s) => ({ [key]: acc }));
        })().finally(() => {
          set((s) => ({ isBgLoading: { ...s.isBgLoading, [key]: false } }));
          set((s) => ({ _bgPromises: { ...s._bgPromises, [key]: null } }));
        });

        set((s) => ({ _bgPromises: { ...s._bgPromises, [key]: p } }));
        return p;
      };

      const bgJobs = [];
      if (!noMoreCats) bgJobs.push(bgFetch("categories", c1));
      if (!noMoreTags) bgJobs.push(bgFetch("tags", t1));

      await Promise.all(bgJobs);

      const stillBg = get().isBgLoading.categories || get().isBgLoading.tags;
      if (!stillBg) set({ isLoaded: true });
    })()
      .catch((error) => {
        console.error("❌ Failed to load categories/tags:", error);
        set({
          isLoading: false,
          isBgLoading: { categories: false, tags: false },
        });
      })
      .finally(() => set({ _bootPromise: null }));

    set({ _bootPromise: boot });
    return boot;
  },

  // Local updates (with aliases)
  // newListOrFn יכול להיות מערך או פונקציה שמקבלת את הערך הקודם
  updateTaxonomy: (name, newListOrFn) => {
    const state = get();
    let newList;

    if (typeof newListOrFn === "function") {
      // אם זו פונקציה, קרא לה עם הערך הקודם
      const currentKey =
        name === "product_categories" ||
        name === "product_cat" ||
        name === "_product_cat" ||
        name === "categories"
          ? "categories"
          : name === "product_tag" || name === "tags"
            ? "tags"
            : null;

      if (!currentKey) return;
      newList = newListOrFn(state[currentKey] || []);
    } else {
      newList = newListOrFn;
    }

    const safe = Array.isArray(newList) ? newList : [];
    if (
      name === "product_categories" ||
      name === "product_cat" ||
      name === "_product_cat" ||
      name === "categories"
    ) {
      set({ categories: safe });
    } else if (name === "product_tag" || name === "tags") {
      set({ tags: safe });
    }
  },

  // Full reload
  reload: async () => {
    set({
      _bootPromise: null,
      _bgPromises: { categories: null, tags: null },
      isLoaded: false,
      isLoading: false,
      isBgLoading: { categories: false, tags: false },
      categories: [],
      tags: [],
    });
    await get().loadTaxonomiesOnce();
  },
}));

// Backward compatibility alias
export const useCategoriesTagsStore = useCoreTaxonomiesStore;
export default useCoreTaxonomiesStore;
