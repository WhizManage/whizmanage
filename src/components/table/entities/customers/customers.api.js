// src/components/table/entities/customers/customers.api.js

import { toast } from "@/lib/utils";
import { getApi, postApi, putApi } from "/src/services/services";
import { useTableSaveStateStore } from "@/components/table/store/saveStateStore"; // תעדכן מסלול נכון
import { __ } from "@wordpress/i18n";
// --- Shape: התאמת אובייקט לקוח מה-API למבנה נוח לטבלה ---
export const shape = {
  toActive: (c) => ({
    ...c,
    is_paying_customer: !!Number(c.is_paying_customer),
    orders_count: c.orders_count ?? 0,
    total_spent: c.total_spent ?? 0,
    billing_phone: c.billing?.phone ?? "",
    billing_city: c.billing?.city ?? "",
    billing_country: c.billing?.country ?? "",
    billing_postcode: c.billing?.postcode ?? "",
  }),
};

// =============== Main customers API ===============
export const customersApi = {

  fetchPage: async ({
    page = 1,
    perPage = 100,
    search,
    // תאימות: אם יעבירו roles/role מבחוץ, עדיין ננרמל ל-"customer" בלבד
    roles,
    role,
    is_paying_customer,
    // 🆕 Support text column filters
    first_name,
    last_name,
    email,
    username,
  } = {}) => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("per_page", String(perPage));

    // 🆕 Merge text column filters into search
    let finalSearch = search;
    const textFilters = [first_name, last_name, email, username].filter(
      (v) => v && typeof v === 'string' && v.trim()
    );
    if (textFilters.length > 0) {
      finalSearch = textFilters[0].trim();
    }

    if (finalSearch && String(finalSearch).trim()) {
      params.set("search", String(finalSearch).trim());
    }

    // ---- תפקיד בודד בלבד ----
    // ניקח מה שהגיע (role או roles), אבל נכפה תמיד customer.
    let incomingRole = "customer";
    if (typeof role === "string" && role.trim()) {
      incomingRole = role.trim().toLowerCase();
    } else if (Array.isArray(roles) && roles.length > 0) {
      incomingRole = String(roles[0]).trim().toLowerCase();
    } else if (typeof roles === "string" && roles.trim()) {
      incomingRole = roles.split(",")[0].trim().toLowerCase();
    }
    if (incomingRole !== "customer") incomingRole = "customer";
    params.set("role", incomingRole);

    // --- נרמול is_paying_customer (תומך גם באובייקט/מחרוזת) ---
    if (typeof is_paying_customer !== "undefined") {
      let normalized = null;
      if (Array.isArray(is_paying_customer)) {
        if (is_paying_customer.length === 1) {
          normalized = is_paying_customer[0];
        }
      } else {
        normalized = is_paying_customer;
      }

      if (normalized !== null && normalized !== undefined && normalized !== "") {
        const yes = normalized === true || normalized === "true" || normalized === 1 || normalized === "1" || normalized === "yes";
        const no = normalized === false || normalized === "false" || normalized === 0 || normalized === "0" || normalized === "no";
        if (yes) params.set("is_paying_customer", "1");
        else if (no) params.set("is_paying_customer", "0");
      }
    }

    const url = `${window.siteUrl}/wp-json/whizmanage/v1/get_customers/?${params.toString()}&include_orders=1`;
    const res = await getApi(url);
    const payload = typeof res.data === "string" ? JSON.parse(res.data) : res.data;

    return {
      rows: Array.isArray(payload?.rows) ? payload.rows.map(shape.toActive) : [],
      total: Number(payload?.total ?? 0),
      page: Number(payload?.page ?? page),
      perPage: Number(payload?.per_page ?? perPage),
      totalPages: Number(payload?.total_pages ?? 1),
    };
  },

  // fetchItems removed as per instructions

  // עדכון שדה בודד (עובד יחד עם masterUpdateCell + EditableCell)
  updateField: async (id, field, value, rowData) => {
    const url = `${window.siteUrl}/wp-json/wc/v3/customers/${id}`;
    const payload = {};

    if (field.startsWith("billing_")) {
      // למשל billing_phone -> phone
      const key = field.replace("billing_", "");
      // 👇 שולחים רק את השדה הזה, בלי כל האובייקט עם ריקנות
      payload.billing = {
        [key]: value,
      };
    } else if (field.startsWith("shipping_")) {
      const key = field.replace("shipping_", "");
      payload.shipping = {
        [key]: value,
      };
    } else if (field === "role") {
      // אם תעשה endpoint מותאם אישית ל-role, אפשר לטפל כאן (כמו שכתבתי קודם)
      payload.role = value;
    } else {
      payload[field] = value;
    }

    const res = await putApi(url, payload);
    return res.data ? shape.toActive(res.data) : res;
  },

validateField: (field, value, rowData) => {
  switch (field) {
    case "email": {
      if (!value) {
        return { isValid: false, message: __("Email is required", "whizmanage") };
      }
      const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
      if (!emailRe.test(value)) {
        return { isValid: false, message: __("Invalid email address", "whizmanage") };
      }
      break;
    }

    case "first_name":
    case "last_name": {
      if (value && value.length > 100) {
        return { isValid: false, message: __("Value is too long", "whizmanage") };
      }
      break;
    }
  }

  return { isValid: true };
},
};

// =============== Trash API (ללקוחות אין trash אמיתי) ===============
export const customersTrashApi = {
  // fetchTrash removed as per instructions

  // אפשר להשתמש בזה למחיקת לקוחות (Permanent)
  batchPermanentDelete: async (ids) => {
    const url = `${window.siteUrl}/wp-json/wc/v3/customers/batch`;
    return postApi(url, {
      delete: ids.map((id) => ({ id })),
    });
  },
};

// =============== API לאשפה ברמת ה־store ===============
export const customersApiForTrash = {
  fetchPage: async (params) => {
    // Customers don't have a standard trash status in Woo.
    // Return empty result.
    return {
      rows: [],
      total: 0,
      page: params.page || 1,
      perPage: params.perPage || 100,
      totalPages: 0,
    };
  },
};

// =============== masterUpdateCell ללקוחות ===============
export const customersMasterUpdateCell =
  (get) =>
    async (rowId, columnId, value, rowData, isFromHistory = false) => {
      const { updateItemWithHistory } = get();
      const { setSaveState, setLastSaveTime } = useTableSaveStateStore.getState();
      const previousValue = rowData[columnId];

      if (!isFromHistory) {
        setSaveState("saving");

        const validation =
          customersApi && typeof customersApi.validateField === "function"
            ? customersApi.validateField(columnId, value, rowData)
            : { isValid: true };

        if (!validation.isValid) {
          toast.error(__("Update error", "whizmanage"), {
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
        const serverRes = await customersApi.updateField(
          rowId,
          columnId,
          value,
          rowData
        );

        const patch = serverRes?.data ?? serverRes;
        if (patch && typeof patch === "object") {
          // כאן אפשר פשוט לעדכן את כל הלקוח, או לבחור שדות חשובים
          if (typeof updateItemWithHistory === "function") {
            updateItemWithHistory(rowId, patch, false);
          } else {
            get().updateItem(rowId, patch);
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
          toast.error(__("Update error", "whizmanage"), {
            description:
              apiError.message || __("Error occurred while saving data", "whizmanage"),
            duration: 4000,
          });
        }
        throw apiError;
      }
    };

// --- Generic aliases, כמו בקופונים ---
export { customersApi as entityApi };
export { customersApiForTrash as entityApiForTrash };
export { customersTrashApi as entityTrashApi };
export { customersMasterUpdateCell as masterUpdateCell };
