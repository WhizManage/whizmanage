// src/components/forms/registry.js
import { addToast } from "@heroui/react";
import couponConfig from "./entities/coupons/config";
import customerConfig from "./entities/customers/config";
import discountRuleConfig from "./entities/discount-rules/config";
import orderConfig from "./entities/orders/config";
import productConfig from "./entities/products/config";
import { postApi } from "/src/services/services";
import { rowsToConditions } from "@/components/table/entities/discount-rules/components/FiltersEditor";

/**
 * נסה למצוא את שם המוצר מתוך values
 */
function extractProductName(values) {
  if (!values || typeof values !== "object") return undefined;
  const directCandidates = [
    "name",
    "product_name",
    "post_title",
    "title",
    "productTitle",
  ];
  for (const key of directCandidates) {
    if (values[key] && typeof values[key] === "string" && values[key].trim()) {
      return values[key].trim();
    }
  }
  let fallbackName;
  Object.keys(values).forEach((key) => {
    const val = values[key];
    if (
      !fallbackName &&
      typeof val === "string" &&
      val.trim() &&
      /(name|title)/i.test(key)
    ) {
      fallbackName = val.trim();
    }
  });
  return fallbackName;
}

export function buildProductPayload(values) {
  const name = extractProductName(values);
  const payload = {
    status: values.status || "draft",
    type: values.type || "simple",
    ...(name ? { name } : {}),
    sku: values.sku,
    regular_price: values.regular_price,
    sale_price: values.sale_price,
  };
  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined || payload[key] === null)
      delete payload[key];
  });
  ["regular_price", "sale_price"].forEach((field) => {
    if (field in payload && payload[field] !== "") {
      payload[field] = String(payload[field]);
    }
  });
  return payload;
}

/** עזר: הופך "10" / "10%" / 10 לאובייקט אקשנס אחיד */
function normalizeActions(input) {
  if (Array.isArray(input)) return input;
  if (input && typeof input === "object") return input;

  if (typeof input === "string" && /%$/.test(input.trim())) {
    const n = Number(input.replace("%", "").trim());
    return {
      method: "percentage",
      value: Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0,
      apply_as_coupon: false,
      coupon_label: "",
    };
  }

  if (
    typeof input === "number" ||
    (typeof input === "string" && input.trim() !== "" && !isNaN(Number(input)))
  ) {
    const n = Number(input);
    return {
      method: "percentage",
      value: Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0,
      apply_as_coupon: false,
      coupon_label: "",
    };
  }

  return {};
}

/**
 * @typedef {Object} EntityHandler
 */
const registry = {
  coupons: {
    cfg: couponConfig,
    // ✅ beforeSubmit לקופונים
    beforeSubmit: (values) => {
      // ✅ הגדרת formatted עם הערכים + סטטוס ברירת מחדל
      const formatted = {
        ...values,
        status: values.status || "publish"  // ✅ ברירת מחדל: מפורסם
      };

      // המרת product_categories לרשימת IDs
      if (Array.isArray(formatted.product_categories)) {
        formatted.product_categories = formatted.product_categories.map(
          (item) => {
            if (typeof item === "object" && item?.id) {
              return Number(item.id);
            }
            return Number(item);
          }
        );
      }

      // המרת excluded_product_categories לרשימת IDs
      if (Array.isArray(formatted.excluded_product_categories)) {
        formatted.excluded_product_categories =
          formatted.excluded_product_categories.map((item) => {
            if (typeof item === "object" && item?.id) {
              return Number(item.id);
            }
            return Number(item);
          });
      }

      // המרת product_ids
      if (Array.isArray(formatted.product_ids)) {
        formatted.product_ids = formatted.product_ids.map((id) => Number(id));
      }

      // המרת excluded_product_ids
      if (Array.isArray(formatted.excluded_product_ids)) {
        formatted.excluded_product_ids = formatted.excluded_product_ids.map(
          (id) => Number(id)
        );
      }

      // הסרת email_restrictions אם ריק
      if (
        Array.isArray(formatted.email_restrictions) &&
        formatted.email_restrictions.length === 0
      ) {
        delete formatted.email_restrictions;
      }

      // המרת date_expires לפורמט ISO
      if (formatted.date_expires) {
        formatted.date_expires = new Date(formatted.date_expires).toISOString();
      }

      // הסרת date_expires_end (רק לUI)
      if (formatted.date_expires_end) {
        delete formatted.date_expires_end;
      }

      // המרת amount/minimum/maximum למחרוזות
      if (formatted.amount !== undefined && formatted.amount !== "") {
        formatted.amount = String(formatted.amount);
      }

      if (
        formatted.minimum_amount !== undefined &&
        formatted.minimum_amount !== ""
      ) {
        formatted.minimum_amount = String(formatted.minimum_amount);
      }

      if (
        formatted.maximum_amount !== undefined &&
        formatted.maximum_amount !== ""
      ) {
        formatted.maximum_amount = String(formatted.maximum_amount);
      }

      // המרת usage limits לmספרים שלמים
      if (formatted.usage_limit !== undefined) {
        formatted.usage_limit = Number(formatted.usage_limit) || 0;
      }

      if (formatted.usage_limit_per_user !== undefined) {
        formatted.usage_limit_per_user =
          Number(formatted.usage_limit_per_user) || 0;
      }

      if (formatted.limit_usage_to_x_items !== undefined) {
        formatted.limit_usage_to_x_items =
          Number(formatted.limit_usage_to_x_items) || 0;
      }

      return formatted;
    },
    submit: async (values) => {
      const res = await postApi(
        `${window.siteUrl}/wp-json/wc/v3/coupons`,
        values
      );
      await postApi(`${window.siteUrl}/wp-json/whizmanage/v1/history`, {
        location: "coupons",
        items: [res.data],
        action: "add",
      });
      return res.data;
    },
  },

  products: {
    cfg: productConfig,
    beforeSubmit: (values) => {


      const cleanValues = { ...values };
      delete cleanValues._isNew;
      delete cleanValues._needsSave;
      delete cleanValues._rowElement;
      delete cleanValues.id;

      // ✅ המרת categories ל-{id: X}
      if (Array.isArray(cleanValues.categories)) {
        cleanValues.categories = cleanValues.categories.map((item) => {
          if (typeof item === "object" && item.id) {
            return { id: item.id };
          }
          if (typeof item === "number" || typeof item === "string") {
            return { id: Number(item) };
          }
          return item;
        });
      }

      // ✅ המרת tags ל-{id: X}
      if (Array.isArray(cleanValues.tags)) {
        cleanValues.tags = cleanValues.tags.map((item) => {
          if (typeof item === "object" && item.id) {
            return { id: item.id };
          }
          if (typeof item === "number" || typeof item === "string") {
            return { id: Number(item) };
          }
          return item;
        });
      }

      const name = extractProductName(cleanValues);

      const payload = {
        status: cleanValues.status || "draft",
        type: cleanValues.type || "simple",
        ...(name ? { name } : {}),
        sku: cleanValues.sku,
        regular_price: cleanValues.regular_price,
        sale_price: cleanValues.sale_price,
        categories: cleanValues.categories,
        tags: cleanValues.tags,
        // ✅ Inventory fields
        manage_stock: cleanValues.manage_stock,
        stock_quantity: cleanValues.stock_quantity,
        backorders: cleanValues.backorders,
        stock_status: cleanValues.stock_status,
        // ✅ Description fields
        description: cleanValues.description,
        short_description: cleanValues.short_description,
        // ✅ Image fields
        images: cleanValues.images,
        // ✅ Sale dates
        date_on_sale_from: cleanValues.date_on_sale_from,
        date_on_sale_to: cleanValues.date_on_sale_to,
        // ✅ Downloadable fields
        downloadable: cleanValues.downloadable,
        virtual: cleanValues.virtual,
        downloads: cleanValues.downloads,
        download_limit: cleanValues.download_limit,
        download_expiry: cleanValues.download_expiry,
        // ✅ Other fields
        purchase_note: cleanValues.purchase_note,
        meta_data: cleanValues.meta_data,
      };

      // ניקוי שדות ריקים
      Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined || payload[key] === null) {
          delete payload[key];
        }
      });

      // המרת מחירים למחרוזות
      ["regular_price", "sale_price"].forEach((field) => {
        if (field in payload && payload[field] !== "") {
          payload[field] = String(payload[field]);
        }
      });

      // ✅ טיפול בתמונה הראשית (image)
      if (cleanValues.image) {
        if (typeof cleanValues.image === "object" && cleanValues.image.id) {
          payload.images = [{ id: cleanValues.image.id }, ...(payload.images || [])];
        } else if (typeof cleanValues.image === "string") {
          payload.images = [{ src: cleanValues.image }, ...(payload.images || [])];
        }
      }

      return payload;
    },
    submit: async (values) => {
      const res = await postApi(
        `${window.siteUrl}/wp-json/wc/v3/products`,
        values
      );
      return res.data;
    },
    afterSubmit: async (result) => {
      addToast({
        title: "Success",
        description: `Product "${result.name}" added successfully`,
      });
    },
  },

  orders: {
    cfg: orderConfig,
    // ✅ beforeSubmit להזמנות - ניקוי line_items ושדות ריקים
    beforeSubmit: (values) => {
      const cleaned = { ...values };

      // ✅ ניקוי line_items - הסר שדות שלא מתקבלים ב-API
      if (Array.isArray(cleaned.line_items)) {
        cleaned.line_items = cleaned.line_items.map((item) => {
          const cleanItem = {
            product_id: item.product_id,
            quantity: item.quantity || 1,
          };

          // הוסף price רק אם קיים
          if (item.price !== undefined && item.price !== null) {
            cleanItem.price = item.price;
          }

          // הוסף variation_id רק אם קיים
          if (item.variation_id) {
            cleanItem.variation_id = item.variation_id;
          }

          // הוסף meta_data רק אם יש
          if (Array.isArray(item.meta_data) && item.meta_data.length > 0) {
            cleanItem.meta_data = item.meta_data;
          }

          return cleanItem;
        });
      }

      // ✅ ניקוי שדות ריקים מ-billing
      if (cleaned.billing) {
        Object.keys(cleaned.billing).forEach((key) => {
          if (cleaned.billing[key] === "" || cleaned.billing[key] === null) {
            delete cleaned.billing[key];
          }
        });
        // אם billing ריק לגמרי - מחק אותו
        if (Object.keys(cleaned.billing).length === 0) {
          delete cleaned.billing;
        }
      }

      // ✅ ניקוי שדות ריקים מ-shipping
      if (cleaned.shipping) {
        Object.keys(cleaned.shipping).forEach((key) => {
          if (cleaned.shipping[key] === "" || cleaned.shipping[key] === null) {
            delete cleaned.shipping[key];
          }
        });
        if (Object.keys(cleaned.shipping).length === 0) {
          delete cleaned.shipping;
        }
      }

      // ✅ ניקוי coupon_lines - WooCommerce API לא מקבל id ביצירת הזמנה
      if (Array.isArray(cleaned.coupon_lines)) {
        cleaned.coupon_lines = cleaned.coupon_lines.map((coupon) => ({
          code: coupon.code,
        }));
      }

      // ✅ ניקוי שדות פנימיים
      delete cleaned._isNew;
      delete cleaned._needsSave;
      delete cleaned._rowElement;

      // ✅ ניקוי שדות חישוביים שלא נשלחים ל-API
      delete cleaned.subtotal;
      delete cleaned.discount_total;
      delete cleaned.total;

      // ✅ ניקוי שדות ריקים ברמה העליונה
      ["customer_note", "transaction_id"].forEach((field) => {
        if (cleaned[field] === "" || cleaned[field] === null) {
          delete cleaned[field];
        }
      });

      return cleaned;
    },
    submit: async (values) => {
      const res = await postApi(
        `${window.siteUrl}/wp-json/wc/v3/orders`,
        values
      );
      return res.data;
    },
  },

  customers: {
    cfg: customerConfig,
    beforeSubmit: (values) => {
      const cleaned = { ...values };

      // ניקוי שדות ריקים מ-billing
      if (cleaned.billing) {
        Object.keys(cleaned.billing).forEach((key) => {
          if (cleaned.billing[key] === "" || cleaned.billing[key] === null) {
            delete cleaned.billing[key];
          }
        });
        // אם billing ריק לגמרי - מחק אותו
        if (Object.keys(cleaned.billing).length === 0) {
          delete cleaned.billing;
        }
      }

      // ניקוי שדות ריקים מ-shipping
      if (cleaned.shipping) {
        Object.keys(cleaned.shipping).forEach((key) => {
          if (cleaned.shipping[key] === "" || cleaned.shipping[key] === null) {
            delete cleaned.shipping[key];
          }
        });
        if (Object.keys(cleaned.shipping).length === 0) {
          delete cleaned.shipping;
        }
      }

      // ניקוי שדות ריקים ברמה העליונה
      ["username", "password", "note"].forEach((field) => {
        if (cleaned[field] === "" || cleaned[field] === null) {
          delete cleaned[field];
        }
      });


      return cleaned;
    },
    submit: async (values) => {
      const res = await postApi(
        `${window.siteUrl}/wp-json/wc/v3/customers`,
        values
      );
      try {
        await postApi(`${window.siteUrl}/wp-json/whizmanage/v1/history`, {
          location: "customers",
          items: [res.data ?? res],
          action: "add",
        });
      } catch (_) { }
      return res.data ?? res;
    },
  },

  "discount-rules": {
    cfg: discountRuleConfig,
    beforeSubmit: (values) => {
      const cleaned = { ...values };

      // המרת priority למספר
      if (cleaned.priority !== undefined) {
        cleaned.priority = Number(cleaned.priority) || 0;
      }

      // וידוא מבנה conditions
      if (cleaned.conditions) {
        cleaned.conditions = {
          logic: cleaned.conditions?.logic === "any" ? "any" : "all",
          rules: Array.isArray(cleaned.conditions?.rules)
            ? cleaned.conditions.rules
            : [],
        };
      }

      // וידוא מבנה filters
      if (!Array.isArray(cleaned.filters)) {
        cleaned.filters = [];
      }

      // וידוא מבנה actions
      if (!cleaned.actions || typeof cleaned.actions !== "object") {
        cleaned.actions = {
          method: "percentage",
          value: 10,
          apply_as_coupon: false,
          coupon_label: "",
        };
      }

      // הסרת שדה date_range אם קיים (רק למטרות UI)
      if (cleaned.date_range !== undefined) {
        delete cleaned.date_range;
      }

      return cleaned;
    },
    submit: async (payload) =>
      postApi(discountRuleConfig.endpoint, payload).then((r) => r.data ?? r),
  },
};

/**
 * מקבל את הקונפיגורציה של entity
 */
export function getEntityConfig(entity) {
  return registry?.[entity]?.cfg || null;
}

/**
 * שולח את הנתונים של entity עם תמיכה ב-hooks
 */
export async function submitEntity(entity, values) {
  const handler = registry?.[entity];
  if (!handler?.submit)
    throw new Error(`No submit handler for entity: ${entity}`);

  try {
    let processedValues = values;
    if (handler.beforeSubmit) {
      processedValues = await handler.beforeSubmit(values);
    }

    const result = await handler.submit(processedValues);

    if (handler.afterSubmit) {
      await handler.afterSubmit(result);
    }

    return result;
  } catch (error) {
    if (handler.onError) {
      await handler.onError(error, values);
    }
    throw error;
  }
}

/** רישום ישויות חיצוניות */
export function registerEntity(name, config, options = {}) {
  registry[name] = {
    cfg: config,
    submit: options.submit,
    beforeSubmit: options.beforeSubmit,
    afterSubmit: options.afterSubmit,
    onError: options.onError,
  };
}

export function isEntityRegistered(entity) {
  return !!registry?.[entity];
}

export function getRegisteredEntities() {
  return Object.keys(registry);
}

export async function buildPayloadForEntity(entity, values) {
  const handler = registry?.[entity];
  if (!handler) throw new Error(`No handler found for entity: ${entity}`);
  if (handler.beforeSubmit) return await handler.beforeSubmit(values);
  return values;
}
