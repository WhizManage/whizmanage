// src/components/table/entities/products/products.api.js

import { toast } from "@/lib/utils";
import { useTableSaveStateStore } from "@/components/table/store/saveStateStore"; // תעדכן מסלול נכון
import { getApi, postApi, putApi } from "/src/services/services";
import { __ } from "@wordpress/i18n";
const buildProductsQueryString = ({
  page = 1,
  perPage = 100,
  search,
  status = [],
  type = [],
  downloadable,
  stock_status = [],
  stock_quantity,
  categories = [],
  tags = [],
  tax = {},
} = {}) => {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("perPage", String(perPage));

  if (search && String(search).trim()) {
    params.set("search", String(search).trim());
  }

  // 🔹 במקום csv + set נשתמש ב־append("status[]", value)
  const appendArray = (key, arr) => {
    if (!Array.isArray(arr)) return;
    arr
      .filter(Boolean)
      .forEach((v) => params.append(`${key}[]`, String(v)));
  };

  appendArray("status", status);
  appendArray("type", type);
  appendArray("stock_status", stock_status);

  if (stock_quantity !== undefined && stock_quantity !== null && String(stock_quantity).trim() !== "") {
    params.set("stock_quantity", String(stock_quantity).trim());
  }

  if (downloadable && ["yes", "no"].includes(String(downloadable))) {
    params.set("downloadable", String(downloadable));
  }

  const toIds = (arr = []) =>
    (Array.isArray(arr) ? arr : [])
      .map((v) => (typeof v === "object" ? (v.id ?? v.value) : v))
      .map((n) => parseInt(n, 10))
      .filter(Number.isInteger);

  const catIds = toIds(categories);
  if (catIds.length) params.set("product_cat", catIds.join(","));

  const tagIds = toIds(tags);
  if (tagIds.length) params.set("product_tag", tagIds.join(","));

  if (tax && typeof tax === "object") {
    Object.entries(tax).forEach(([taxonomy, ids]) => {
      const tid = toIds(ids);
      if (tid.length) {
        params.set(`tax__${encodeURIComponent(taxonomy)}`, tid.join(","));
      }
    });
  }

  return params.toString();
};

/** ============================
 *  Shape helpers (אחידות שדות)
 *  ============================ */
/**
 * Helper: Map API taxonomy responses to column IDs
 * WooCommerce returns taxonomy with different key than our column ID
 * e.g., API returns 'brands' but our column is '_product_brand'
 */
const mapTaxonomiesToColumns = (product) => {
  if (!product || typeof product !== "object") return product;

  const taxonomies = Array.isArray(window?.listTaxonomies) ? window.listTaxonomies : [];
  const mapped = { ...product };

  taxonomies.forEach((tax) => {
    const columnId = tax.name; // e.g., '_product_brand'
    // אם כבר יש ערך בשם העמודה, לא לדרוס
    if (mapped[columnId] !== undefined) return;

    // מנסים למצוא את הערך בשמות אפשריים שה-API מחזיר
    const possibleApiKeys = [
      columnId.replace(/^_?product_/, ""),         // 'brand' from '_product_brand'
      columnId.replace(/^_?product_/, "") + "s",   // 'brands' from '_product_brand'
      columnId.replace(/^_/, ""),                  // 'product_brand' from '_product_brand'
    ];

    for (const apiKey of possibleApiKeys) {
      if (mapped[apiKey] !== undefined && apiKey !== columnId) {
        mapped[columnId] = mapped[apiKey];
        break;
      }
    }
  });

  return mapped;
};

/**
 * Helper: Extract cost value from WooCommerce API response
 * Tries: cost_of_goods_sold.values[0].defined_value, then meta_data._wc_cog_cost, then existing cost
 */
const extractCostFromResponse = (p) => {
  // If cost is already set (from our PHP endpoint), use it
  if (p?.cost !== undefined && p?.cost !== null && p?.cost !== "") {
    return p.cost;
  }

  // Try to get from WooCommerce native COGS structure
  if (p?.cost_of_goods_sold?.values?.[0]?.defined_value !== undefined) {
    return p.cost_of_goods_sold.values[0].defined_value;
  }

  // Try to get from meta_data
  if (Array.isArray(p?.meta_data)) {
    const cogsMeta = p.meta_data.find((m) => m.key === "_wc_cog_cost");
    if (cogsMeta?.value) {
      return cogsMeta.value;
    }
  }

  return "";
};

export const shape = {
  toActive: (p) => {
    const mapped = mapTaxonomiesToColumns(p);
    return {
      ...mapped,
      price: mapped?.regular_price ?? mapped?.price ?? "",
      stock: mapped?.stock_quantity ?? mapped?.stock ?? 0,
      cost: extractCostFromResponse(mapped), // ✅ חילוץ עלות מתשובת ה-API
    };
  },
  toTrash: (p) => ({
    ...p,
    status: "trash",
    date_deleted: p?.date_deleted || new Date().toISOString(),
  }),
};

/**
 * Helper: Find taxonomy value in API response
 * WooCommerce may return taxonomy with different key than our column ID
 * e.g., column is '_product_brand' but response has 'brands'
 * @param {Object} responseData - The API response object
 * @param {string} columnId - The column ID / taxonomy name in our app
 * @returns {any|undefined} - The value from response, or undefined if not found
 */
export const findTaxonomyInResponse = (responseData, columnId) => {
  if (!responseData || typeof responseData !== "object") return undefined;

  const possibleKeys = [
    columnId,                                    // exact match: '_product_brand'
    columnId.replace(/^_?product_/, ""),         // 'brand' from '_product_brand'
    columnId.replace(/^_?product_/, "") + "s",   // 'brands' from '_product_brand'
    columnId.replace(/^_/, ""),                  // 'product_brand' from '_product_brand'
  ];

  for (const key of possibleKeys) {
    if (responseData[key] !== undefined) {
      return responseData[key];
    }
  }

  return undefined;
};

// --- עוזר: ניסיון משני דרך WP REST של post type "product" (CPT של Woo) ---
export const productsApiForTrash = {
  fetchPage: async (params) => {
    const { filters, ...rest } = params;
    return productsApi.fetchPage({ ...rest, ...filters, status: ["trash"] });
  },
};

export const productsApi = {
  // fetchItems removed as per instructions

  fetchPage: async ({
    page = 1,
    perPage = 100,
    search,
    status,      // ["publish",...]
    type,        // ["simple","variable",...]
    downloadable,
    stock_status, // ["instock", "outofstock", "onbackorder"]
    stock_quantity, // 🆕 Exact stock quantity (server-side filter)
    categories,
    tags,
    extraTax = {},
    name,        // 🆕 Support name column text filter (sent to server)
    sku,         // 🆕 Support sku column text filter (sent to server)
    variations,  // 🆕 Ignored here - handled client-side for subRows filtering
    ...rest // ← catch any additional props (custom taxonomies come here)
  } = {}) => {
    // 🔧 Detect custom taxonomies that came as separate props (not inside extraTax)
    // and merge them into extraTax so they get serialized to URL properly
    const customTaxonomyNames = Array.isArray(window?.listTaxonomies)
      ? window.listTaxonomies.map((t) => t.name)
      : [];

    const mergedExtraTax = { ...extraTax };

    // Check each key in 'rest' - if it's a known custom taxonomy, merge it
    Object.entries(rest).forEach(([key, value]) => {
      if (customTaxonomyNames.includes(key) && Array.isArray(value) && value.length > 0) {
        mergedExtraTax[key] = value;
      }
    });

    // 🆕 Merge text column filters into search
    // 'name' and 'sku' are sent to server for product search
    // 'variations' is handled client-side for subRows filtering (ignored here)
    let finalSearch = search;
    if (name && typeof name === 'string' && name.trim()) {
      finalSearch = name.trim();
    } else if (sku && typeof sku === 'string' && sku.trim()) {
      finalSearch = sku.trim();
    }

    const qs = buildProductsQueryString({
      page, perPage, search: finalSearch,
      status, type, downloadable, stock_status, stock_quantity,
      categories, tags,
      tax: mergedExtraTax,
    });

    const url = `${window.siteUrl}/wp-json/whizmanage/v1/get_product/?${qs}`;
    const res = await getApi(url);
    const payload = typeof res.data === "string" ? JSON.parse(res.data) : res.data;

    return {
      rows: Array.isArray(payload?.rows) ? payload.rows.map(shape.toActive) : [],
      total: Number(payload?.total ?? 0),
      page: Number(payload?.page ?? page),
      perPage: Number(payload?.per_page ?? perPage),
      totalPages: Number(
        payload?.total_pages ??
        (payload?.total
          ? Math.ceil(payload.total / (payload?.per_page || perPage))
          : 1
        )
      ),

      // 🟢 זה החלק שחסר וגורם לפילטרים להימחק:
      filters: {
        search: finalSearch ?? null,
        status: status ?? [],
        type: type ?? [],
        downloadable: downloadable ?? null,
        stock_status: stock_status ?? [],
        stock_quantity: stock_quantity ?? null,
        categories: categories ?? [],
        tags: tags ?? [],
        extraTax: mergedExtraTax ?? {},
        name: name ?? null,
        sku: sku ?? null,
      },
    };
  },

  updateProduct: async (product) => {
    const url =
      product.has_options || product.parent_id > 0
        ? `${window.siteUrl}/wp-json/wc/v3/products/${product.parent_id}/variations/${product.id}`
        : `${window.siteUrl}/wp-json/wc/v3/products/${product.id}`;

    return await putApi(url, product);
  },

  batchUpdate: async (products) => {
    const url = `${window.siteUrl}/wp-json/wc/v3/products/batch`;
    return await postApi(url, { update: products });
  },

  reorderItems: async (productId, prevProductId, nextProductId) => {
    return await postApi(
      `${window.siteUrl}/wp-json/whizmanage/v1/products/simple-reorder`,
      {
        product_id: productId,
        prev_product_id: prevProductId,
        next_product_id: nextProductId,
      }
    );
  },

  updateField: async (productId, field, value, productData) => {
    const url =
      productData?.parent_id > 0
        ? `${window.siteUrl}/wp-json/wc/v3/products/${productData.parent_id}/variations/${productId}`
        : `${window.siteUrl}/wp-json/wc/v3/products/${productId}`;

    const cleanValue =
      typeof value === "object" && value !== null && !Array.isArray(value)
        ? value.value || value.id || value
        : value;

    if (field === "meta_data") {
      let pairs = [];
      if (Array.isArray(value)) {
        pairs = value
          .filter((m) => m && typeof m.key === "string")
          .map((m) => ({
            key: String(m.key),
            value: m.value != null ? String(m.value) : "",
          }));
      } else if (
        value &&
        typeof value === "object" &&
        typeof value.key === "string"
      ) {
        pairs = [
          {
            key: String(value.key),
            value: value.value != null ? String(value.value) : "",
          },
        ];
      }
      if (!pairs.length) throw new Error("No valid meta_data to update");
      return await putApi(url, { meta_data: pairs });
    }


    const knownFields = new Set([
      "sku",
      "name",
      "slug",
      "date_created_gmt",
      "regular_price",
      "sale_price",
      "cost", // עלות המוצר (Cost of Goods Sold)
      "stock_quantity",
      "inventory",
      "stock",
      "status",
      "type",
      "description",
      "short_description",
      "categories",
      "category",
      "weight",
      "manage_stock",
      "low_stock_amount",
      "stock_status",
      "backorders",
      "image",
      "images",
      "tags",
      "attributes",
      "downloadable",
      "virtual",
      "downloads",
      "download_expiry",
      "download_limit",
      "featured",
      "sold_individually",
      "dimensions",
      "post_password",
      "purchase_note",
      "date_on_sale_to_gmt",
      "date_on_sale_to_gmt",
      "date_on_sale_from_gmt",
      "sale_date_range", // 🆕 Batch field
      "global_unique_id",
      "upsell_ids",
      "cross_sell_ids",
      "shipping_class",
      "downloadable_settings",
      "catalog_visibility",
    ]);

    if (!knownFields.has(field)) {
      const meta_data = [
        {
          key: String(field),
          value: cleanValue != null ? String(cleanValue) : "",
        },
      ];
      return await putApi(url, { meta_data });
    }

    let payload = {};
    switch (field) {
      case "sku":
        payload.sku = cleanValue ? String(cleanValue).trim() : "";
        break;
      case "slug":
        const cleanSlug = cleanValue
          ? String(cleanValue)
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-+|-+$/g, "")
            .substring(0, 200)
          : "";
        payload.slug = cleanSlug;
        break;

      case "name":
        payload.name = String(cleanValue);
        break;
      case "regular_price":
        payload.regular_price = cleanValue ? String(cleanValue) : "";
        break;
      case "sale_price":
        payload.sale_price = cleanValue ? String(cleanValue) : "";
        break;
      case "stock_quantity":
      case "stock":
        payload.manage_stock = true;
        payload.stock_quantity = cleanValue ? parseInt(cleanValue) : 0;
        break;
      case "status":
        payload.status = cleanValue;
        break;
      case "type":
        payload.type = cleanValue;
        break;
      case "description":
      case "short_description":
        payload[field] = String(cleanValue);
        break;
      case "categories":
      case "category":
        if (typeof cleanValue === "number" || !isNaN(cleanValue)) {
          payload.categories = [{ id: parseInt(cleanValue) }];
        } else if (typeof cleanValue === "object" && cleanValue.id) {
          payload.categories = [{ id: cleanValue.id }];
        } else {
          payload.categories = [{ name: cleanValue }];
        }
        break;
      case "weight":
        payload.weight = cleanValue != null ? String(cleanValue) : "";
        break;
      case "downloadable":
        payload.downloadable = !!cleanValue;
        if (cleanValue) {
          payload.virtual = true;
        }
        break;

      case "virtual":
        payload.virtual = !!cleanValue;
        break;

      case "downloads":
        payload.downloads = Array.isArray(cleanValue)
          ? cleanValue.map((item, index) => ({
            id: item.id || `download_${index}`,
            name: item.name || "",
            file: item.file || "",
          }))
          : [];
        break;

      case "download_expiry":
        payload.download_expiry =
          cleanValue === -1 || cleanValue === ""
            ? -1
            : parseInt(cleanValue, 10);
        break;

      case "download_limit":
        payload.download_limit =
          cleanValue === -1 || cleanValue === ""
            ? -1
            : parseInt(cleanValue, 10);
        break;

      case "downloadable_settings":
        // Handle batch update of downloadable settings
        if (typeof cleanValue === "object" && cleanValue !== null) {
          // Downloads array
          if (Array.isArray(cleanValue.downloads)) {
            payload.downloads = cleanValue.downloads.map((item, index) => ({
              id: item.id || `download_${index}`,
              name: item.name || "",
              file: item.file || "",
            }));
          }
          // Download expiry
          if (cleanValue.download_expiry !== undefined) {
            payload.download_expiry =
              cleanValue.download_expiry === -1 || cleanValue.download_expiry === ""
                ? -1
                : parseInt(cleanValue.download_expiry, 10);
          }
          // Download limit
          if (cleanValue.download_limit !== undefined) {
            payload.download_limit =
              cleanValue.download_limit === -1 || cleanValue.download_limit === ""
                ? -1
                : parseInt(cleanValue.download_limit, 10);
          }
        }
        break;

      case "featured":
        payload.featured = !!cleanValue;
        break;
      case "sold_individually":
        payload.sold_individually = !!cleanValue;
        break;

      case "dimensions":
        payload.dimensions = {
          length: cleanValue?.length || "",
          width: cleanValue?.width || "",
          height: cleanValue?.height || "",
        };
        break;
      case "post_password":
        payload.post_password = cleanValue ? String(cleanValue).trim() : "";
        break;
      case "purchase_note":
        payload.purchase_note = String(cleanValue || "");
        break;
      case "inventory":
        if (typeof cleanValue === "object" && cleanValue !== null) {
          payload = {
            manage_stock: cleanValue.manage_stock ?? false,
            stock_status: cleanValue.stock_status ?? "instock",
          };
          if (cleanValue.manage_stock) {
            payload.stock_quantity = cleanValue.stock_quantity ?? 0;
            if (cleanValue.low_stock_amount != null) {
              payload.low_stock_amount = cleanValue.low_stock_amount;
            }
            if (cleanValue.backorders) {
              payload.backorders = cleanValue.backorders;
            }
          }
        }
        break;

      case "sale_date_range":
        if (typeof cleanValue === "object" && cleanValue !== null) {
          if (cleanValue.start !== undefined) {
            payload.date_on_sale_from_gmt = cleanValue.start ? String(cleanValue.start) : "";
          }
          if (cleanValue.end !== undefined) {
            payload.date_on_sale_to_gmt = cleanValue.end ? String(cleanValue.end) : "";
          }
        }
        break;

      case "upsell_ids":
      case "cross_sell_ids":
        // WooCommerce expects array of product IDs
        payload[field] = Array.isArray(cleanValue)
          ? cleanValue.map((id) => parseInt(id, 10)).filter(Number.isInteger)
          : [];
        break;

      case "shipping_class":
        payload.shipping_class = cleanValue ? String(cleanValue) : "";
        break;
      case "catalog_visibility":
        payload.catalog_visibility = cleanValue || "visible";
        break;

      case "cost":
        // עלות המוצר (Cost of Goods Sold) - WooCommerce 8.5+ native COGS feature
        // שולחים גם את המבנה הנכון של ווקומרס וגם את המטא כגיבוי
        if (cleanValue !== null && cleanValue !== undefined && cleanValue !== "") {
          payload.cost_of_goods_sold = {
            values: [
              {
                defined_value: parseFloat(cleanValue)
              }
            ]
          };
        } else {
          // ניקוי הערך - שולחים null
          payload.cost_of_goods_sold = {
            values: [
              {
                defined_value: null
              }
            ]
          };
        }
        // גיבוי: גם עדכון ב-meta_data לתאימות אחורה
        payload.meta_data = [
          {
            key: "_wc_cog_cost",
            value: cleanValue !== null && cleanValue !== undefined ? String(cleanValue) : "",
          },
        ];
        break;

      default:
        payload[field] = cleanValue;
    }



    if (Object.keys(payload).length === 0) {
      console.warn("⚠️ Empty payload! Nothing will be saved.");
    }

    return await putApi(url, payload);
  },

  validateField: (field, value, productData, allProducts) => {
    switch (field) {
      case "sku":
        if (value) {
          const exists = allProducts?.some(
            (p) => p.sku === value && p.id !== productData.id
          );
          if (exists) {
            return { isValid: false, message: "קוד מוצר כבר קיים" };
          }
        }
        break;
      case "name":
        if (!value || value.trim() === "") {
          return { isValid: false, message: "שם המוצר הוא שדה חובה" };
        }
        break;
      case "regular_price":
      case "sale_price":
        if (value !== "" && value !== null && value !== undefined) {
          const priceNum = parseFloat(value);
          if (isNaN(priceNum) || priceNum < 0) {
            return { isValid: false, message: "מחיר חייב להיות מספר חיובי" };
          }
        }
        break;
      case "stock_quantity":
        if (productData.manage_stock && value !== "" && value !== null) {
          const stockNum = parseInt(value);
          if (isNaN(stockNum) || stockNum < 0) {
            return {
              isValid: false,
              message: "מלאי חייב להיות מספר שלם חיובי",
            };
          }
        }
        break;
      case "inventory":
        if (value && typeof value === "object") {
          if (value.manage_stock) {
            const stockNum = parseInt(value.stock_quantity);
            if (isNaN(stockNum) || stockNum < 0) {
              return {
                isValid: false,
                message: "מלאי חייב להיות מספר שלם חיובי",
              };
            }
          }
        }
        break;
      case "status":
        if (value) {
          const validStatuses = ["publish", "draft", "pending", "private"];
          if (!validStatuses.includes(value)) {
            return { isValid: false, message: "סטטוס לא תקין" };
          }
        }
        break;
      default:
        break;
    }
    return { isValid: true };
  },

  updateMeta: async (productId, pairs, productData) => {
    const url =
      productData?.parent_id > 0
        ? `${window.siteUrl}/wp-json/wc/v3/products/${productData.parent_id}/variations/${productId}`
        : `${window.siteUrl}/wp-json/wc/v3/products/${productId}`;

    const meta_data = (Array.isArray(pairs) ? pairs : [])
      .filter((m) => m && typeof m.key === "string")
      .map((m) => ({
        key: String(m.key),
        value: m.value != null ? String(m.value) : "",
      }));

    if (!meta_data.length) {
      throw new Error("No valid meta_data to update");
    }

    return await putApi(url, { meta_data });
  },
};

export const mediaApi = {
  updateProductImage: async (productId, image, productData) => {
    const isVariation = productData?.parent_id && productData.parent_id > 0;

    const url = isVariation
      ? `${window.siteUrl}/wp-json/wc/v3/products/${productData.parent_id}/variations/${productId}`
      : `${window.siteUrl}/wp-json/wc/v3/products/${productId}`;

    let payload;

    if (isVariation) {
      payload = image
        ? {
          image: {
            id: image.id,
            src: image.src,
            name: image.name || "",
            alt: image.alt || "",
          },
        }
        : { image: null };
    } else {
      const existingImages = productData.images || [];
      const updatedImages = image
        ? [
          {
            id: image.id,
            src: image.src,
            name: image.name || "",
            alt: image.alt || "",
          },
          ...existingImages.slice(1),
        ]
        : existingImages.slice(1);

      payload = { images: updatedImages };
    }

    try {
      const response = await putApi(url, payload);
      return response;
    } catch (error) {
      console.error("❌ Failed to update product image:", error);
      throw error;
    }
  },

  updateProductGallery: async (productId, gallery, productData) => {
    const isVariation = productData?.parent_id && productData.parent_id > 0;

    const url = isVariation
      ? `${window.siteUrl}/wp-json/wc/v3/products/${productData.parent_id}/variations/${productId}`
      : `${window.siteUrl}/wp-json/wc/v3/products/${productId}`;

    const cleanGallery = (gallery || []).filter((img) => img && img.id);

    const formattedImages = cleanGallery.map((img) => ({
      id: img.id,
      src: img.src,
      name: img.name || "",
      alt: img.alt || "",
    }));

    const payload = { images: formattedImages };

    try {
      const response = await putApi(url, payload);
      return response;
    } catch (error) {
      console.error("❌ Failed to update product gallery:", error);
      console.error("Error response:", error.response?.data);
      throw error;
    }
  },
};

export const categoriesApi = {
  async updateProductCategories(productId, value, productData) {
    const url =
      productData?.parent_id > 0
        ? `${window.siteUrl}/wp-json/wc/v3/products/${productData.parent_id}/variations/${productId}`
        : `${window.siteUrl}/wp-json/wc/v3/products/${productId}`;

    const terms = Array.isArray(value) ? value : value ? [value] : [];
    const categories = terms.map((t) => {
      if (t && typeof t === "object") {
        if (t.id) return { id: parseInt(t.id, 10) };
        if (t.name) return { name: String(t.name) };
      }
      if (!isNaN(t)) return { id: parseInt(t, 10) };
      return { name: String(t) };
    });

    return putApi(url, { categories });
  },

  async updateProductTags(productId, value, productData) {
    const url =
      productData?.parent_id > 0
        ? `${window.siteUrl}/wp-json/wc/v3/products/${productData.parent_id}/variations/${productId}`
        : `${window.siteUrl}/wp-json/wc/v3/products/${productId}`;

    const terms = Array.isArray(value) ? value : value ? [value] : [];
    const tags = terms.map((t) => {
      if (t && typeof t === "object") {
        if (t.id) return { id: parseInt(t.id, 10) };
        if (t.name) return { name: String(t.name) };
      }
      if (!isNaN(t)) return { id: parseInt(t, 10) };
      return { name: String(t) };
    });

    return putApi(url, { tags });
  },

  async updateProductTaxonomy(productId, taxonomy, value, productData) {
    const originalKey = String(taxonomy);
    const cleanedKey = String(taxonomy)
      .replace(/^tax__/, "")
      .replace(/^_/, "");

    // Convert value to array if needed
    const terms = Array.isArray(value) ? value : value ? [value] : [];

    // If no terms, we still want to clear the taxonomy
    // Build the payload with term IDs
    const termIds = terms.map((t) => {
      if (t && typeof t === "object") {
        return t.id ?? t.value ?? t;
      }
      // If it's a string/number, try to parse as ID
      const parsed = parseInt(t, 10);
      return Number.isInteger(parsed) ? parsed : t;
    }).filter(Boolean);

    // Determine the correct field name for WooCommerce API
    // For custom taxonomies, WooCommerce expects the taxonomy name (e.g., 'brand' or 'pa_brand')
    const useKey = originalKey.startsWith("_") ? originalKey : cleanedKey;

    const url = productData?.parent_id > 0
      ? `${window.siteUrl}/wp-json/wc/v3/products/${productData.parent_id}/variations/${productId}`
      : `${window.siteUrl}/wp-json/wc/v3/products/${productId}`;

    // Format the terms properly for WooCommerce
    // WooCommerce custom taxonomies are usually in meta_data or as direct fields
    const payload = { [useKey]: termIds.map(id => ({ id })) };

    return await putApi(url, payload);
  },
};

export const productsMasterUpdateCell =
  (get) =>
    async (rowId, columnId, value, rowData, isFromHistory = false) => {
      const { updateItemWithHistory, data } = get();
      const { setSaveState, setLastSaveTime } = useTableSaveStateStore.getState();

      // שמירת ערכים קודמים עבור שדות batch
      const getPreviousValue = () => {
        if (columnId === "inventory") {
          return {
            manage_stock: rowData.manage_stock,
            stock_quantity: rowData.stock_quantity,
            stock: rowData.stock,
            low_stock_amount: rowData.low_stock_amount,
            stock_status: rowData.stock_status,
            backorders: rowData.backorders,
          };
        }
        if (columnId === "sale_date_range") {
          return {
            date_on_sale_from_gmt: rowData.date_on_sale_from_gmt,
            date_on_sale_to_gmt: rowData.date_on_sale_to_gmt,
          };
        }
        return rowData[columnId];
      };
      const previousValue = getPreviousValue();

      // עבור שדות batch נעדכן רק את השדות שקיימים ב-value
      const getUpdates = () => {
        if (columnId === "inventory" && value && typeof value === "object") {
          const updates = {};
          if ("manage_stock" in value) updates.manage_stock = value.manage_stock;
          if ("stock_quantity" in value) {
            updates.stock_quantity = value.stock_quantity;
            updates.stock = value.stock_quantity;
          }
          if ("low_stock_amount" in value) updates.low_stock_amount = value.low_stock_amount;
          if ("stock_status" in value) updates.stock_status = value.stock_status;
          if ("backorders" in value) updates.backorders = value.backorders;
          return updates;
        }
        if (columnId === "sale_date_range" && value && typeof value === "object") {
          const updates = {};
          if (value.start !== undefined) updates.date_on_sale_from_gmt = value.start;
          if (value.end !== undefined) updates.date_on_sale_to_gmt = value.end;
          return updates;
        }
        return { [columnId]: value };
      };

      if (!isFromHistory) {
        setSaveState("saving");

        const validation =
          productsApi && typeof productsApi.validateField === "function"
            ? productsApi.validateField(columnId, value, rowData, data)
            : { isValid: true };

        if (!validation.isValid) {
          toast.error(__("Update error", "whizmanage"), {
            description: validation.message,
          });
          throw new Error(validation.message);
        }

        // ✅ עדכון ה-store והוספה להיסטוריה
        // עבור שדות batch, נשמור את ה-columnId המקורי (inventory, sale_date_range)
        const batchFields = ["inventory", "sale_date_range"];
        const isBatchField = batchFields.includes(columnId);

        if (isBatchField) {
          // עבור שדות batch - קודם נעדכן את ה-store (בלי היסטוריה)
          get().updateItem(rowId, getUpdates());

          // סינון רק השדות ששונו בפועל
          const filterChangedFields = (prev, curr) => {
            if (!prev || !curr) return { prev: prev || {}, curr: curr || {} };

            const changedPrev = {};
            const changedCurr = {};

            const allKeys = new Set([
              ...Object.keys(prev || {}),
              ...Object.keys(curr || {}),
            ]);

            for (const key of allKeys) {
              const prevVal = prev[key];
              const currVal = curr[key];

              // השוואה עמוקה לאובייקטים ומערכים
              const isDifferent = JSON.stringify(prevVal) !== JSON.stringify(currVal);

              if (isDifferent) {
                changedPrev[key] = prevVal;
                changedCurr[key] = currVal;
              }
            }

            return { prev: changedPrev, curr: changedCurr };
          };

          const { prev: filteredPrev, curr: filteredCurr } = filterChangedFields(previousValue, value);

          // ואז נוסיף להיסטוריה ידנית עם field נכון - רק אם יש שינויים
          const { undoRedoHistory } = get();
          if (undoRedoHistory && Object.keys(filteredCurr).length > 0) {
            undoRedoHistory.addToHistory({
              type: "update",
              id: rowId,
              field: columnId, // "inventory"
              previousValues: filteredPrev, // רק השדות ששונו
              newValues: filteredCurr, // רק השדות ששונו
              rowData: { ...rowData },
              timestamp: Date.now(),
            });
          }
        } else {
          // עבור שדות רגילים - משתמשים ב-updateItemWithHistory
          if (typeof updateItemWithHistory === "function") {
            updateItemWithHistory(rowId, getUpdates(), true);
          } else {
            get().updateItem(rowId, getUpdates());
          }
        }
      } else {
        // ✅ שינוי שמגיע מ־Undo/Redo / history → בלי היסטוריה שוב
        get().updateItem(rowId, getUpdates());
      }

      try {
        const taxList = Array.isArray(window.listTaxonomies)
          ? window.listTaxonomies.map((x) => x.name)
          : [];

        let serverRes;
        if (columnId === "categories") {
          serverRes = await categoriesApi.updateProductCategories(
            rowId,
            value,
            rowData
          );
        } else if (columnId === "tags") {
          serverRes = await categoriesApi.updateProductTags(
            rowId,
            value,
            rowData
          );
        } else if (taxList.includes(columnId)) {
          serverRes = await categoriesApi.updateProductTaxonomy(
            rowId,
            columnId,
            value,
            rowData
          );
        } else {
          serverRes = await productsApi.updateField(
            rowId,
            columnId,
            value,
            rowData
          );
        }

        const patch = serverRes?.data ?? serverRes;

        if (patch && typeof patch === "object" && patch.id) {
          const fieldsToSync = [
            "downloadable",
            "virtual",
            "downloads",
            "date_modified_gmt",
            "download_expiry",
            "download_limit",
          ];

          const updates = {};
          fieldsToSync.forEach((field) => {
            if (patch[field] !== undefined && patch[field] !== rowData[field]) {
              updates[field] = patch[field];
            }
          });

          // 🔧 Sync taxonomy fields (categories, tags, and custom taxonomies)
          // so the UI shows names instead of just IDs
          const taxonomyFields = ["categories", "tags", ...taxList];
          if (taxonomyFields.includes(columnId)) {
            const taxonomyValue = findTaxonomyInResponse(patch, columnId);
            if (taxonomyValue !== undefined) {
              updates[columnId] = taxonomyValue;
            }
          }

          if (Object.keys(updates).length > 0) {
            // ✅ סנכרון מהשרת – בלי היסטוריה
            get().updateItem(rowId, updates);
          }
        }

        if (
          columnId === "date_created_gmt" &&
          patch &&
          typeof patch === "object"
        ) {
          const updates = {};
          if (patch.status != null && patch.status !== rowData.status) {
            updates.status = patch.status;
          }
          if (
            patch.date_created_gmt != null &&
            patch.date_created_gmt !== rowData.date_created_gmt
          ) {
            updates.date_created_gmt = patch.date_created_gmt;
          }
          if (Object.keys(updates).length) {
            // ✅ גם פה – בלי היסטוריה
            get().updateItem(rowId, updates);
          }
        }

        if (!isFromHistory) {
          setSaveState("saved");
          setLastSaveTime(new Date());
        }

        return true;
      } catch (apiError) {
        // ✅ rollback – בלי היסטוריה
        const batchFields = ["inventory", "sale_date_range"];
        const rollbackUpdates = batchFields.includes(columnId)
          ? previousValue
          : { [columnId]: previousValue };
        get().updateItem(rowId, rollbackUpdates);

        setSaveState("error");
        if (!isFromHistory) {
          toast.error(__("Update error", "whizmanage"), {
            description:
              apiError.message || __("Error occurred while saving data", "whizmanage"),
            duration: 4000,
          });
        }
        throw apiError;
      }
    };

export const trashApi = {
  // fetchTrash removed as per instructions

  moveToTrash: async (product) => {
    const isVariation = product?.parent_id > 0;
    const url = isVariation
      ? `${window.siteUrl}/wp-json/wc/v3/products/${product.parent_id}/variations/${product.id}`
      : `${window.siteUrl}/wp-json/wc/v3/products/${product.id}`;
    return putApi(url, { status: "trash" });
  },

  restoreFromTrash: async (product, nextStatus = "publish") => {
    const isVariation = product?.parent_id > 0;
    const url = isVariation
      ? `${window.siteUrl}/wp-json/wc/v3/products/${product.parent_id}/variations/${product.id}`
      : `${window.siteUrl}/wp-json/wc/v3/products/${product.id}`;
    return putApi(url, { status: nextStatus });
  },

  batchMoveToTrash: async (ids) => {
    const url = `${window.siteUrl}/wp-json/wc/v3/products/batch`;
    return postApi(url, {
      update: ids.map((id) => ({ id, status: "trash" })),
    });
  },

  batchRestore: async (ids, status = "publish") => {
    const url = `${window.siteUrl}/wp-json/wc/v3/products/batch`;
    return postApi(url, { update: ids.map((id) => ({ id, status })) });
  },

  batchPermanentDelete: async (ids) => {
    const url = `${window.siteUrl}/wp-json/wc/v3/products/batch`;
    return postApi(url, { delete: ids.map((id) => ({ id })) });
  },
};

export const handleCategoriesUpdate = async (
  rowId,
  columnId,
  value,
  rowData,
  store,
  isFromHistory = false
) => {
  try {
    const previousValue = rowData[columnId];

    if (typeof store.updateItemWithHistory === "function") {
      store.updateItemWithHistory(rowId, { [columnId]: value });
    } else {
      store.updateItem(rowId, { [columnId]: value });
    }

    try {
      let serverRes;
      if (columnId === "categories") {
        serverRes = await categoriesApi.updateProductCategories(rowId, value, rowData);
      } else if (columnId === "tags") {
        serverRes = await categoriesApi.updateProductTags(rowId, value, rowData);
      } else {
        serverRes = await categoriesApi.updateProductTaxonomy(
          rowId,
          columnId,
          value,
          rowData
        );
      }

      // 🔧 Sync the server response to get full objects with names
      const patch = serverRes?.data ?? serverRes;
      if (patch && typeof patch === "object" && patch.id) {
        const taxonomyValue = findTaxonomyInResponse(patch, columnId);
        if (taxonomyValue !== undefined) {
          store.updateItem(rowId, { [columnId]: taxonomyValue });
        }
      }

      if (
        typeof store.updateItemWithHistory !== "function" &&
        !isFromHistory &&
        store.undoRedoHistory
      ) {
        store.undoRedoHistory.addToHistory({
          type: "update",
          id: rowId,
          field: columnId,
          previousValues: { [columnId]: previousValue },
          newValues: { [columnId]: value },
          rowData: { ...rowData },
          timestamp: Date.now(),
        });
      }

      return true;
    } catch (apiError) {
      store.updateItem(rowId, { [columnId]: previousValue });
      throw apiError;
    }
  } catch (error) {
    console.error("Failed to update categories/tags/taxonomy:", error);
    throw error;
  }
};

export const ensureTrashFetchedOnce = async (
  trashStore,
  { perPage = 100 } = {}
) => {
  if (trashStore.hasFetched && trashStore.hasFetched()) return;

  trashStore.setLoading(true);
  try {
    const map = new Map();
    (trashStore.data || []).forEach((p) => map.set(String(p.id), p));

    let page = 1;
    for (; ;) {
      const { data, hasMore } = await trashApi.fetchTrash({ page, perPage });
      if (!data || data.length === 0) break;
      data.forEach((p) => map.set(String(p.id), p));
      if (!hasMore) break;
      page += 1;
    }

    trashStore.setData(Array.from(map.values()));
    trashStore.markFetched?.();
  } catch (e) {
    console.error("Failed to fetch trash:", e);
    trashStore.setError(e.message || "Failed to fetch trash");
  } finally {
    trashStore.setLoading(false);
  }
};

export {
  productsApi as entityApi,
  productsApiForTrash as entityApiForTrash,
  categoriesApi as entityCategoriesApi,
  trashApi as entityTrashApi,
  productsMasterUpdateCell as masterUpdateCell,
};
