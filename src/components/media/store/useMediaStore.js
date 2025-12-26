// src/components/media/store/useMediaStore.js
import { create } from 'zustand';
import { getApi, deleteApi } from '@/services/services';

// כמה פריטים בכל עמוד בשרת
const PER_PAGE = 100;

// מפתח קאש לפי חיפוש/עמוד/טיפוס/גודל עמוד
const keyOf = ({ search = '', page = 1, mediaType = 'image', perPage = PER_PAGE }) =>
  JSON.stringify({ search, page, mediaType, perPage });

const useMediaStore = create((set, get) => ({
  // ===== State =====
  images: [],
  loading: false,
  searchQuery: '',
  currentPage: 1,
  totalPages: 1,
  totalItems: 0,
  selectedImages: [],
  mediaType: 'image', // 'image' | 'file' | 'all'
  perPage: PER_PAGE,

  // קאש לפי עמוד: { [key]: { images, totalPages, totalItems } }
  cache: {},

  // ===== Helpers =====
  _setFromCache: (key, { images, totalPages, totalItems }, page, search, mediaType, perPage) =>
    set({
      images,
      totalPages,
      totalItems,
      currentPage: page,
      searchQuery: search,
      mediaType,
      perPage,
      loading: false,
    }),

  _writeCache: (key, payload) =>
    set((state) => ({
      cache: {
        ...state.cache,
        [key]: payload,
      },
    })),

  _prependToCacheKey: (key, newItem) =>
    set((state) => {
      const cached = state.cache[key];
      if (!cached) return { cache: state.cache };
      // בדיקה אם הפריט כבר קיים בקאש
      const alreadyExists = cached.images?.some((img) => img.id === newItem.id);
      if (alreadyExists) return { cache: state.cache };
      return {
        cache: {
          ...state.cache,
          [key]: {
            ...cached,
            images: [newItem, ...cached.images],
            totalItems: (cached.totalItems ?? 0) + 1,
          },
        },
      };
    }),

  _updateItemInAllCache: (id, patch) =>
    set((state) => {
      const next = {};
      for (const [k, v] of Object.entries(state.cache)) {
        next[k] = {
          ...v,
          images: (v.images || []).map((img) => (img.id === id ? { ...img, ...patch } : img)),
        };
      }
      return { cache: next, images: state.images.map((img) => (img.id === id ? { ...img, ...patch } : img)) };
    }),

  _removeFromAllCache: (id) =>
    set((state) => {
      const next = {};
      for (const [k, v] of Object.entries(state.cache)) {
        next[k] = {
          ...v,
          images: (v.images || []).filter((img) => img.id !== id),
          totalItems: Math.max(0, (v.totalItems ?? 0) - 1),
        };
      }
      return {
        cache: next,
        images: state.images.filter((img) => img.id !== id),
        totalItems: Math.max(0, state.totalItems - 1),
        selectedImages: state.selectedImages.filter((img) => img.id !== id),
      };
    }),

  // ===== Actions =====
  // מביא עמוד מהשרת או מהקאש (אם קיים)
  fetchImages: async (search = '', page = 1, mediaType = null, { force = false } = {}) => {
    set({ loading: true });

    const currentMediaType = mediaType ?? get().mediaType;
    const perPage = get().perPage || PER_PAGE;
    const key = keyOf({ search, page, mediaType: currentMediaType, perPage });

    // שימוש בקאש אם יש
    if (!force) {
      const cached = get().cache[key];
      if (cached) {
        get()._setFromCache(key, cached, page, search, currentMediaType, perPage);
        return cached.images;
      }
    }

    try {
      // עימוד בצד השרת + 100 פריטים בכל עמוד
      let endpoint = `${window.siteUrl}/wp-json/wp/v2/media?search=${encodeURIComponent(
        search
      )}&per_page=${perPage}&page=${page}`;

      if (currentMediaType && currentMediaType !== 'all') {
        endpoint += `&media_type=${currentMediaType}`;
      }

      const response = await getApi(endpoint);

      const fetchedImages = response.data.map((item) => ({
        id: item.id,
        src: item.source_url,
        name: item.title.rendered,
        alt: item.alt_text || '',
        caption: item.caption?.rendered || '',
        media_type: item.media_type,
        mime_type: item.mime_type,
      }));

      const totalPages = parseInt(response.headers['x-wp-totalpages'], 10);
      const totalItems = parseInt(response.headers['x-wp-total'], 10);

      // עדכון סטייט
      set({
        images: fetchedImages,
        totalPages,
        totalItems,
        currentPage: page,
        searchQuery: search,
        mediaType: currentMediaType,
        perPage,
        loading: false,
      });

      // כתיבה לקאש
      get()._writeCache(key, { images: fetchedImages, totalPages, totalItems });

      return fetchedImages;
    } catch (error) {
      console.error('Failed to fetch media:', error);
      set({ loading: false });
      throw error;
    }
  },

  // העלאת קובץ – מעדכנת את ה־state ואת הקאש (עמוד נוכחי + עמוד 1)
  uploadFile: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${window.siteUrl}/wp-json/wp/v2/media`, {
      method: 'POST',
      headers: { 'X-WP-Nonce': window.rest },
      body: formData,
    });

    if (!response.ok) throw new Error(await response.text());

    const data = await response.json();
    const newFile = {
      id: data.id,
      src: data.source_url,
      name: data.title.rendered || data.title,
      alt: data.alt_text || '',
      caption: data.caption?.rendered || '',
      media_type: data.media_type,
      mime_type: data.mime_type,
    };

    // הוספה מיידית לרשימה המוצגת - רק אם לא קיים כבר
    set((state) => {
      const alreadyExists = state.images.some((img) => img.id === newFile.id);
      if (alreadyExists) return state;
      return {
        images: [newFile, ...state.images],
        totalItems: state.totalItems + 1,
      };
    });

    // עדכון קאש למפתחות הרלוונטיים (עמוד נוכחי ועמוד 1) - רק אם לא קיים כבר
    const { searchQuery, currentPage, mediaType, perPage } = get();
    const currentKey = keyOf({ search: searchQuery, page: currentPage, mediaType, perPage });
    const firstKey = keyOf({ search: searchQuery, page: 1, mediaType, perPage });

    get()._prependToCacheKey(currentKey, newFile);
    if (currentKey !== firstKey) {
      get()._prependToCacheKey(firstKey, newFile);
    }

    return newFile;
  },

  // תאימות לאחור
  uploadImage: async (file) => get().uploadFile(file),

  // מחיקה – מעדכן סטייט וקאש של כל העמודים שכבר נטענו
  deleteImage: async (id) => {
    await deleteApi(`${window.siteUrl}/wp-json/wp/v2/media/${id}/`);
    get()._removeFromAllCache(id);
  },

  // שינוי סוג המדיה
  setMediaType: (mediaType) => set({ mediaType }),

  // עדכון פריט (לשימוש אחרי עריכת שם למשל)
  patchItem: (id, patch) => get()._updateItemInAllCache(id, patch),

  setSelectedImages: (images) => set({ selectedImages: images }),
  toggleImageSelection: (image) => {
    set((state) => {
      const isSelected = state.selectedImages.some((img) => img.id === image.id);
      return {
        selectedImages: isSelected
          ? state.selectedImages.filter((img) => img.id !== image.id)
          : [...state.selectedImages, image],
      };
    });
  },

  clearSelection: () => set({ selectedImages: [] }),

  reset: () =>
    set({
      images: [],
      loading: false,
      searchQuery: '',
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      selectedImages: [],
      mediaType: 'image',
      perPage: PER_PAGE,
      cache: {},
    }),
}));

export default useMediaStore;
