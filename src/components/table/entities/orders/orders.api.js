// src/components/table/entities/orders/orders.api.js
import { getApi, postApi, putApi } from "/src/services/services";
// אם יש לכם deleteApi בשירותים – עדיף להשתמש בו עבור מחיקה רכה/קשיחה.
// import { deleteApi } from "/src/services/services";
import { useTableSaveStateStore } from "@/components/table/store/saveStateStore"; // תעדכן מסלול נכון
import { __ } from "@wordpress/i18n";
import { ORDER_STATUS_KEYS } from "./orders.constants";
export const orderStatusList = Object.keys(ORDER_STATUS_KEYS);

export const shape = {
  toActive: (o) => ({
    ...o,
    number: o?.number ?? String(o?.id ?? ""),
    total: o?.total ?? o?.total_price ?? "0.00",
    date_created: o?.date_created ?? o?.date_created_gmt ?? null,
    customer_name:
      o?.billing?.first_name || o?.billing?.last_name
        ? `${o.billing.first_name ?? ""} ${o.billing.last_name ?? ""}`.trim()
        : (o?.shipping?.first_name || o?.shipping?.last_name
          ? `${o.shipping.first_name ?? ""} ${o.shipping.last_name ?? ""}`.trim()
          : ""),
    billing_email: o?.billing?.email ?? "",
  }),
  toTrash: (o) => ({
    ...o,
    status: "trash",
    date_deleted: o?.date_deleted || new Date().toISOString(),
  }),
};

// ---- helper: wp/v2 shop_order (fallback) ----
export const ordersApiForTrash = {
  fetchPage: async (params) => {
    return ordersApi.fetchPage({ ...params, status: ["trash"] });
  },
};

export const ordersApi = {
  // fetchItems removed as per instructions


  /**
   * עדכון שדה יחיד בהזמנה
   * שדות שזוכים לטיפול מיוחד: status, date_created, billing, shipping, meta_data,
   * וכן הוספת הערות: private_note / message_to_customer (נשלחות דרך orders/{id}/notes)
   */
  updateField: async (orderId, field, value, orderData) => {
    const url = `${window.siteUrl}/wp-json/wc/v3/orders/${orderId}`;

    const cleanValue =
      typeof value === "object" && value !== null && !Array.isArray(value)
        ? value.value || value.id || value
        : value;

    // הערות הזמנה
    if (field === "private_note" || field === "message_to_customer") {
      const notesUrl = `${window.siteUrl}/wp-json/wc/v3/orders/${orderId}/notes`;
      const payload = {
        note: String(value ?? "").trim(),
        customer_note: field === "message_to_customer",
      };
      if (!payload.note) throw new Error("Cannot add empty note");
      return await postApi(notesUrl, payload);
    }

    if (field === "meta_data") {
      let pairs = [];
      if (Array.isArray(value)) {
        pairs = value
          .filter((m) => m && typeof m.key === "string")
          .map((m) => ({ key: String(m.key), value: m.value != null ? String(m.value) : "" }));
      } else if (value && typeof value === "object" && typeof value.key === "string") {
        pairs = [{ key: String(value.key), value: value.value != null ? String(value.value) : "" }];
      }
      if (!pairs.length) throw new Error("No valid meta_data to update");
      return await putApi(url, { meta_data: pairs });
    }

    const knownFields = new Set([
      "status",
      "customer_id",
      "billing",
      "shipping",
      "payment_method",
      "payment_method_title",
      "transaction_id",
      "set_paid",
      "date_created",
      "customer_note",
      "date_paid",
      "date_completed",
      "shipping_total",
      "discount_total",
      "fee_lines",
      "shipping_lines",
      "coupon_lines",
      "line_items",
      // שדות נוספים אם תרצו…
    ]);

    let payload = {};

    if (!knownFields.has(field)) {
      // כותבים לשדה כ־meta אוטומטית:
      const meta_data = [{ key: String(field), value: cleanValue != null ? String(cleanValue) : "" }];
      return await putApi(url, { meta_data });
    }

    switch (field) {
      case "status":
        payload.status = String(cleanValue);
        break;
      case "customer_note":
        payload.customer_note = cleanValue != null ? String(cleanValue) : "";
        break;
      case "customer_id":
        payload.customer_id = Number(cleanValue) || 0;
        break;
      case "billing":
      case "shipping":
        payload[field] = cleanValue || {};
        break;
      case "payment_method":
      case "payment_method_title":
      case "transaction_id":
        payload[field] = cleanValue != null ? String(cleanValue) : "";
        break;
      case "set_paid":
        payload.set_paid = !!cleanValue;
        break;
      case "date_created":
      case "date_paid":
      case "date_completed":
        payload[field] = cleanValue || null;
        break;
      case "shipping_total":
      case "discount_total":
        payload[field] = cleanValue != null ? String(cleanValue) : "0";
        break;
      default:
        payload[field] = cleanValue;
        break;
    }

    return await putApi(url, payload);
  },

  // לא תמיד יש batch ל־orders, אך ב־wc/v3 קיים orders/batch – נשאיר תמיכה זהירה.
  batchUpdate: async (orders) => {
    const url = `${window.siteUrl}/wp-json/wc/v3/orders/batch`;
    return await postApi(url, { update: orders });
  },

  fetchPage: async ({
    page = 1,
    perPage = 100,
    search,
    status,
    payment_method,
    date_from,
    date_to,
    customer_email,
    min_total,
    max_total,
    meta,
    extra,
    // 🆕 Support text column filters
    number,
    customer_name,
    billing_email,
  } = {}) => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("per_page", String(perPage));

    // 🆕 Merge text column filters into search
    let finalSearch = search;
    const textFilters = [number, customer_name, billing_email].filter(
      (v) => v && typeof v === 'string' && v.trim()
    );
    if (textFilters.length > 0) {
      finalSearch = textFilters[0].trim();
    }

    if (finalSearch && String(finalSearch).trim()) {
      params.set("search", String(finalSearch).trim());
    }

    const appendArray = (key, arr) => {
      if (arr && Array.isArray(arr) && arr.length) {
        arr.forEach((value) => params.append(key, value));
      }
    };

    appendArray("status[]", status);
    appendArray("payment_method[]", payment_method);

    // ✅ תואם ל-PHP: date_from/date_to
    if (date_from) params.set("date_from", date_from);
    if (date_to) params.set("date_to", date_to);

    if (customer_email) params.set("customer_email", customer_email);
    if (min_total != null) params.set("min_total", String(min_total));
    if (max_total != null) params.set("max_total", String(max_total));

    if (meta || extra) {
      params.set("filters", JSON.stringify({ meta, ...extra }));
    }

    const url = `${window.siteUrl}/wp-json/whizmanage/v1/get_orders/?${params.toString()}`;

    const res = await getApi(url);
    const payload = typeof res.data === "string" ? JSON.parse(res.data) : res.data;

    return {
      rows: Array.isArray(payload?.rows) ? payload.rows.map(shape.toActive) : [],
      total: Number(payload?.total ?? 0),
      page: Number(payload?.page ?? 1),
      perPage: Number(payload?.per_page ?? perPage),
      totalPages: Number(payload?.total_pages ?? 1),
    };
  },

  validateField: (field, value, orderData, allOrders) => {
    switch (field) {
      case "status":
        if (value && !orderStatusList.includes(value)) {
          return { isValid: false, message: "סטטוס הזמנה לא תקין" };
        }
        break;
      case "date_created":
      case "date_paid":
      case "date_completed":
        if (value) {
          const d = new Date(value);
          if (isNaN(d.getTime())) {
            return { isValid: false, message: "תאריך לא תקין" };
          }
        }
        break;
      case "line_items":
        const s = String(orderData?.status || "").toLowerCase();
        if (!["pending", "on-hold"].includes(s)) {
          return { isValid: false, message: "אפשר לערוך פריטים רק בהזמנות Pending/On hold" };
        }
      default:
        break;
    }
    return { isValid: true };
  },
};

export const trashApi = {
  // fetchTrash removed as per instructions

  moveToTrash: async (order) => {
    const url = `${window.siteUrl}/wp-json/wc/v3/orders/${order.id}`;
    return putApi(url, { status: "trash" }); // אם אצלכם יש deleteApi עם force=false – אפשר לעבור אליו.
  },

  restoreFromTrash: async (order, nextStatus = "pending") => {
    const url = `${window.siteUrl}/wp-json/wc/v3/orders/${order.id}`;
    return putApi(url, { status: nextStatus });
  },

  batchMoveToTrash: async (ids) => {
    const url = `${window.siteUrl}/wp-json/wc/v3/orders/batch`;
    return postApi(url, { update: ids.map((id) => ({ id, status: "trash" })) });
  },

  batchRestore: async (ids, status = "pending") => {
    const url = `${window.siteUrl}/wp-json/wc/v3/orders/batch`;
    return postApi(url, { update: ids.map((id) => ({ id, status })) });
  },

  batchPermanentDelete: async (ids) => {
    const url = `${window.siteUrl}/wp-json/wc/v3/orders/batch`;
    return postApi(url, { delete: ids.map((id) => ({ id })) });
  },
};

// ה-masterUpdateCell ספציפי להזמנות (דומה למוצרים, בלי טקסונומיות)
export const ordersMasterUpdateCell =
  (get) =>
    async (rowId, columnId, value, rowData, isFromHistory = false) => {
      const { updateItemWithHistory, data } = get();
      const { setSaveState, setLastSaveTime } = useTableSaveStateStore.getState();


      const previousValue = rowData[columnId];

      if (!isFromHistory) {
        setSaveState("saving");

        const validation =
          ordersApi && typeof ordersApi.validateField === "function"
            ? ordersApi.validateField(columnId, value, rowData, data)
            : { isValid: true };

        if (!validation.isValid) {
          window?.sonner?.toast?.error?.(__("Update error", "whizmanage"), {
            description: validation.message,
          });
          throw new Error(validation.message);
        }

        if (typeof updateItemWithHistory === "function") {
          updateItemWithHistory(rowId, { [columnId]: value }, true);
        } else {
          get().updateItem(rowId, { [columnId]: value });
        }
      } else {
        if (typeof updateItemWithHistory === "function") {
          updateItemWithHistory(rowId, { [columnId]: value }, false);
        } else {
          get().updateItem(rowId, { [columnId]: value });
        }
      }

      try {
        let serverRes;

        // הערות – נשלחות ל-notes
        if (columnId === "private_note" || columnId === "message_to_customer") {
          serverRes = await ordersApi.updateField(rowId, columnId, value, rowData);
        } else {
          serverRes = await ordersApi.updateField(rowId, columnId, value, rowData);
        }

        const patch = serverRes?.data ?? serverRes;

        // סנכרון שדות שחזרו מהשרת (אם חזרו)
        if (patch && typeof patch === "object" && patch.id) {
          const fieldsToSync = [
            "status",
            "date_created",
            "date_modified_gmt",
            "date_paid",
            "date_completed",
            "billing",
            "total",
            "discount_total",
            "shipping",
            "meta_data",
          ];
          const updates = {};
          fieldsToSync.forEach((f) => {
            if (patch[f] !== undefined && patch[f] !== rowData[f]) {
              updates[f] = patch[f];
            }
          });
          if (Object.keys(updates).length > 0) {
            if (typeof updateItemWithHistory === "function") {
              updateItemWithHistory(rowId, updates, false);
            } else {
              get().updateItem(rowId, updates);
            }
          }
        }

        if (!isFromHistory) {
          setSaveState("saved");
          setLastSaveTime(new Date());
        }

        return true;
      } catch (apiError) {
        if (typeof updateItemWithHistory === "function") {
          updateItemWithHistory(rowId, { [columnId]: previousValue }, false);
        } else {
          get().updateItem(rowId, { [columnId]: previousValue });
        }

        setSaveState("error");
        if (!isFromHistory) {
          window?.sonner?.toast?.error?.(__("Update error", "whizmanage"), {
            description: apiError.message || __("Error occurred while saving data", "whizmanage"),
            duration: 4000,
          });
        }
        throw apiError;
      }
    };

// ייצוא בשמות הגנריים שהקונטיינר מחפש
export {
  ordersApi as entityApi,
  ordersApiForTrash as entityApiForTrash,
  trashApi as entityTrashApi,
  ordersMasterUpdateCell as masterUpdateCell,
};
