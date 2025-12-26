// src/components/table/products/components/variation/store/variationsStore.js

import { create } from "zustand";
import { devtools } from "zustand/middleware";

/**
 * 🎯 Zustand Store לניהול Variations ו-Attributes - גירסה משופרת
 *
 * שיפורים:
 * ✅ שילוב עם useCustomTaxonomiesStore
 * ✅ טעינה חכמה מהמטמון
 * ✅ ניהול state מרכזי ויעיל
 */

// ===== Helper Functions =====

const createVariationFromAttributes = (
  attributes,
  parentId,
  index,
  product
) => {
  const name = attributes
    .map((attr) => attr.option || "")
    .filter(Boolean)
    .join(", ");

  return {
    id: `${parentId}.${index}`,
    original: {
      attributes: attributes,
      image: product?.images?.[0] || null,
      name: name || "",
      regular_price: product?.regular_price || "",
      sale_price: product?.sale_price || "",
      description: "",
      menu_order: index,
      sku: "",
    },
    index: index,
    depth: 1,
    parentId: parentId,
  };
};

const generateCombinations = (attributes, product, parentId) => {
  const variations = [];

  const generate = (currentIndex, combination) => {
    if (currentIndex === attributes.length) {
      variations.push({ attributes: combination });
      return;
    }

    const attribute = attributes[currentIndex];
    const options = Array.isArray(attribute?.options) ? attribute.options : [];

    if (options.length === 0) {
      const optionDetail = {
        name: attribute.id === 0 ? attribute.name : `pa_${attribute.name}`,
      };
      generate(currentIndex + 1, [...combination, optionDetail]);
      return;
    }

    for (const option of options) {
      const optionDetail = {
        name: attribute.id === 0 ? attribute.name : attribute.slug,
        option: option,
      };
      generate(currentIndex + 1, [...combination, optionDetail]);
    }
  };

  generate(0, []);

  return variations.map((variation, index) =>
    createVariationFromAttributes(
      variation.attributes,
      parentId,
      index + 1,
      product
    )
  );
};

const stringifyAttributes = (attributes) => {
  const filteredAttributes = attributes.map((attr) => ({
    name: attr.name.startsWith("pa_") ? attr.name.substring(3) : attr.name,
    option: attr.option,
  }));
  return JSON.stringify(filteredAttributes);
};

const attributesExist = (variations, newAttributes) => {
  const newAttributesString = stringifyAttributes(newAttributes);
  return variations.some(
    (item) =>
      stringifyAttributes(item.original.attributes) === newAttributesString
  );
};

// ===== Store Slices =====

const createStateSlice = (set) => ({
  mode: "full",
  isLoading: false,
  currentProductId: null,
  updatedTable: false,
  hasVariationsOrderChanged: false,

  setMode: (mode) => set({ mode }),
  setLoading: (isLoading) => set({ isLoading }),
  setCurrentProductId: (id) => set({ currentProductId: id }),
  toggleUpdatedTable: () =>
    set((state) => ({
      updatedTable: !state.updatedTable,
    })),
  setHasVariationsOrderChanged: (value) => set({ hasVariationsOrderChanged: value }),
});

const createAttributesSlice = (set, get) => ({
  selectedAttributes: [],
  allAttributes: [],

  setSelectedAttributes: (value) => {
    set((state) => {
      if (typeof value === "function") {
        const prevAttributes = Array.isArray(state.selectedAttributes)
          ? state.selectedAttributes
          : [];
        const result = value(prevAttributes);
        return {
          selectedAttributes: Array.isArray(result) ? result : [],
        };
      }

      return {
        selectedAttributes: Array.isArray(value) ? value : [],
      };
    });
  },

  setAllAttributes: (value) => {
    set((state) => {
      if (typeof value === "function") {
        const result = value(state.allAttributes);
        return { allAttributes: Array.isArray(result) ? result : [] };
      }
      return { allAttributes: Array.isArray(value) ? value : [] };
    });
  },

  addAttribute: (attribute) =>
    set((state) => ({
      selectedAttributes: state.selectedAttributes.some(
        (attr) => attr.id === attribute.id && attr.name === attribute.name
      )
        ? state.selectedAttributes
        : [...state.selectedAttributes, attribute],
      allAttributes: state.allAttributes.some(
        (attr) => attr.id === attribute.id && attr.name === attribute.name
      )
        ? state.allAttributes
        : [...state.allAttributes, attribute],
    })),

  removeAttribute: (index) =>
    set((state) => ({
      selectedAttributes: state.selectedAttributes.filter(
        (_, i) => i !== index
      ),
      allAttributes: state.allAttributes.filter((_, i) => i !== index),
    })),

  updateAttribute: (index, updates) =>
    set((state) => ({
      selectedAttributes: state.selectedAttributes.map((attr, i) =>
        i === index ? { ...attr, ...updates } : attr
      ),
      allAttributes: state.allAttributes.map((attr, i) =>
        i === index ? { ...attr, ...updates } : attr
      ),
    })),
});

const createVariationsSlice = (set, get) => ({
  variations: [],
  newVariations: [],
  updatedVariations: [],
  deletedVariations: [],

  setVariations: (variations) => set({ variations }),

  addVariation: (variation) =>
    set((state) => ({
      variations: [...state.variations, variation],
    })),

  updateVariation: (variationId, updates) =>
    set((state) => {
      const variations = [...state.variations];
      const index = variations.findIndex((v) => v.id === variationId);

      if (index !== -1) {
        variations[index] = {
          ...variations[index],
          original: {
            ...variations[index].original,
            ...updates,
          },
        };

        let updatedVariations = [...state.updatedVariations];
        const updateIndex = updatedVariations.findIndex(
          (v) => v.id === variationId
        );

        if (updateIndex !== -1) {
          updatedVariations[updateIndex] = variations[index];
        } else {
          updatedVariations.push(variations[index]);
        }

        return { variations, updatedVariations };
      }
      return state;
    }),

  deleteVariation: (variationId) =>
    set((state) => {
      const index = state.variations.findIndex((v) => v.id === variationId);

      if (index !== -1) {
        const variation = state.variations[index];
        const variations = state.variations.filter((v) => v.id !== variationId);

        const deletedVariations = variation.original.date_modified
          ? [...state.deletedVariations, variation.original]
          : state.deletedVariations;

        return { variations, deletedVariations };
      }

      return state;
    }),

  reorderVariations: (oldIndex, newIndex) =>
    set((state) => {
      const variations = [...state.variations];
      const [movedItem] = variations.splice(oldIndex, 1);
      variations.splice(newIndex, 0, movedItem);

      const updatedVariations = [...state.updatedVariations];
      variations.forEach((variation, index) => {
        const newMenuOrder = index + 1;
        if (variation.original.menu_order !== newMenuOrder) {
          variation.original = {
            ...variation.original,
            menu_order: newMenuOrder,
          };

          if (variation.original.date_modified) {
            const updateIndex = updatedVariations.findIndex(
              (v) => v.id === variation.id
            );
            if (updateIndex !== -1) {
              updatedVariations[updateIndex] = variation;
            } else {
              updatedVariations.push(variation);
            }
          }
        }
      });

      return { variations, updatedVariations, hasVariationsOrderChanged: true };
    }),

  generateVariations: (productId, product) => {
    const { selectedAttributes, variations } = get();

    const newVariations = generateCombinations(
      selectedAttributes,
      product,
      productId
    );

    const filteredNew = newVariations.filter(
      (newVar) => !attributesExist(variations, newVar.original.attributes)
    );

    if (filteredNew.length > 0) {
      set((state) => {
        const startOrder = state.variations.length + 1;
        const updatedNewVariations = filteredNew.map((variation, index) => ({
          ...variation,
          original: {
            ...variation.original,
            menu_order: startOrder + index,
          },
        }));

        return {
          variations: [...state.variations, ...updatedNewVariations],
          newVariations: [...state.newVariations, ...updatedNewVariations],
        };
      });
    }
  },

  clearVariationsChanges: () =>
    set({
      newVariations: [],
      updatedVariations: [],
      deletedVariations: [],
      hasVariationsOrderChanged: false,
    }),

  hasChanges: () => {
    const state = get();
    return (
      state.newVariations.length > 0 ||
      state.updatedVariations.length > 0 ||
      state.deletedVariations.length > 0 ||
      state.hasVariationsOrderChanged
    );
  },

  applySortOrder: (sortedIds) =>
    set((state) => {
      // יצירת מפה לגישה מהירה
      const variationsMap = new Map(state.variations.map((v) => [v.id, v]));

      // סידור הווריאציות לפי הסדר החדש
      const reorderedVariations = sortedIds
        .map((id) => variationsMap.get(id))
        .filter(Boolean);

      // עדכון menu_order ומעקב אחרי שינויים
      const updatedVariations = [...state.updatedVariations];

      reorderedVariations.forEach((variation, index) => {
        const newMenuOrder = index + 1;
        if (variation.original.menu_order !== newMenuOrder) {
          variation.original = {
            ...variation.original,
            menu_order: newMenuOrder,
          };

          // רק ווריאציות קיימות (עם date_modified) נכנסות ל-updatedVariations
          if (variation.original.date_modified) {
            const updateIndex = updatedVariations.findIndex(
              (v) => v.id === variation.id
            );
            if (updateIndex !== -1) {
              updatedVariations[updateIndex] = variation;
            } else {
              updatedVariations.push(variation);
            }
          }
        }
      });

      return {
        variations: reorderedVariations,
        updatedVariations,
        hasVariationsOrderChanged: true,
      };
    }),
});

/**
 * ✅ Slice חדש: טיפול ב-Custom Taxonomies
 * 
 * משתמש ב-useCustomTaxonomiesStore כמטמון ראשי
 */
const createTermsCacheSlice = (set, get) => ({
  termsCache: {},
  termsLoading: {},

  setTerms: (attributeId, terms) =>
    set((state) => ({
      termsCache: {
        ...state.termsCache,
        [attributeId]: Array.isArray(terms) ? terms : [],
      },
      termsLoading: {
        ...state.termsLoading,
        [attributeId]: false,
      },
    })),

  addTerm: (attributeId, term) =>
    set((state) => ({
      termsCache: {
        ...state.termsCache,
        [attributeId]: [...(state.termsCache[attributeId] || []), term],
      },
    })),

  clearTermsCache: () => set({ termsCache: {}, termsLoading: {} }),

  /**
   * 🎯 טעינת terms עם שילוב Custom Taxonomies Store
   * 
   * תהליך:
   * 1. בדיקה במטמון המקומי
   * 2. בדיקה ב-Custom Taxonomies Store
   * 3. טעינה מהשרת רק אם אין במקורות קודמים
   */
  loadTermsForAttribute: async (attributeId, attributeSlug) => {
    const { termsCache, termsLoading } = get();

    // אם כבר נטען או בטעינה - דלג
    if (termsCache[attributeId] || termsLoading[attributeId]) {
      return;
    }

    // סמן שמתחילים טעינה
    set((state) => ({
      termsLoading: {
        ...state.termsLoading,
        [attributeId]: true,
      },
    }));

    try {
      // ✅ ייבוא דינמי של Custom Taxonomies Store
      const { useCustomTaxonomiesStore } = await import(
        "@/components/table/store/useCustomTaxonomiesStore"
      );
      const customTaxStore = useCustomTaxonomiesStore.getState();

      // שם הטקסונומיה (עם _ לפני)
      const taxonomyName = `_${attributeSlug}`;

      // ✅ נסה לטעון מה-Custom Taxonomies Store
      const termsFromCustomStore = await customTaxStore.ensure(taxonomyName);

      if (termsFromCustomStore && termsFromCustomStore.length > 0) {
        // ✅ נמצא במטמון - שמור מקומית
        get().setTerms(attributeId, termsFromCustomStore);
        return;
      }

      // ✅ אם לא קיים - טען מהשרת וגם שמור ב-Custom Store
      const { getApi } = await import("/src/services/services");
      const response = await getApi(
        `${window.siteUrl}/wp-json/whizmanage/v1/taxonomy/${taxonomyName}/terms`
      );

      const loadedTerms = response?.data || [];

      // שמור גם ב-Custom Store לשימוש עתידי
      customTaxStore.setList(taxonomyName, loadedTerms);

      // שמור מקומית
      get().setTerms(attributeId, loadedTerms);
    } catch (error) {
      console.error("Failed to load terms:", error);
      get().setTerms(attributeId, []);
    }
  },
});

const createActionsSlice = (set, get) => ({
  initializeStore: (product, mode = "full") => {
    const formattedVariations = (product.subRows || []).map((variation) => {
      if (variation.original) {
        return variation;
      }
      return {
        id: variation.id,
        original: variation,
        index: variation.index,
        depth: variation.depth || 1,
        parentId: variation.parentId || product.id,
      };
    });

    const safeAttributes = Array.isArray(product.attributes)
      ? product.attributes
      : [];

    // במצב attributes-only, שמור את ה-options הקיימים מהמוצר
    // במצב full (variations), התחל עם options ריקים לבחירת options חדשים
    const initialSelectedAttributes = safeAttributes.map((attr) => ({
      ...attr,
      options: mode === "attributes-only" ? (attr.options || []) : [],
    }));

    set({
      mode,
      currentProductId: product.id,
      selectedAttributes: initialSelectedAttributes,
      allAttributes: safeAttributes,
      variations: formattedVariations,
      newVariations: [],
      updatedVariations: [],
      deletedVariations: [],
      termsCache: {},
      termsLoading: {},
      updatedTable: false,
    });
  },

  reset: () => {
    set({
      mode: "full",
      currentProductId: null,
      selectedAttributes: [],
      allAttributes: [],
      variations: [],
      newVariations: [],
      updatedVariations: [],
      deletedVariations: [],
      termsCache: {},
      termsLoading: {},
      isLoading: false,
      updatedTable: false,
      hasVariationsOrderChanged: false,
    });
  },
});

// ===== Main Store Creation =====

export const useVariationsStore = create(
  devtools(
    (set, get) => ({
      ...createStateSlice(set),
      ...createAttributesSlice(set, get),
      ...createVariationsSlice(set, get),
      ...createTermsCacheSlice(set, get),
      ...createActionsSlice(set, get),
    }),
    { name: "VariationsStore" }
  )
);