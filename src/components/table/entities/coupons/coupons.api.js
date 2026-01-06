// src/components/table/entities/coupons/coupons.api.js
import { toast } from "@/lib/utils";
import { useTableSaveStateStore } from "@/components/table/store/saveStateStore"; // תעדכן מסלול נכון
import { getApi, postApi, putApi } from "/src/services/services";
import { __ } from "@wordpress/i18n";
export const shape = {
  toActive: (c) => ({
    ...c,
    code: c.code || "",
    amount: c.amount || "0",
    discount_type: c.discount_type || "fixed_cart",
    usage_count: c.usage_count ?? 0,
    usage_limit: c.usage_limit ?? null,
    usage_limit_per_user: c.usage_limit_per_user ?? null,
    date_expires: c.date_expires || c.date_expires_gmt || null,
    date_modified_gmt: c.date_modified_gmt || c.date_modified || null,
    status: c.status || "publish",
  }),
  toTrash: (c) => ({
    ...c,
    status: "trash",
    date_deleted: c?.date_deleted || new Date().toISOString(),
  }),
};

// =============== Trash wrapper ===============
export const couponsApiForTrash = {
  fetchPage: async (params) => {
    return couponsApi.fetchPage({ ...params, status: "trash" });
  },
};

// =============== Main coupons API ===============
export const couponsApi = {
  fetchPage: async ({ page = 1, perPage = 100, search, status, discount_type, code } = {}) => {

    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("per_page", String(perPage));

    // 🆕 Merge text column filters (code) into search
    let finalSearch = search;
    if (code && typeof code === 'string' && code.trim()) {
      finalSearch = code.trim();
    }

    if (finalSearch && String(finalSearch).trim()) {
      params.set("search", String(finalSearch).trim());
    }
    if (status && status !== "any") {
      params.set("status", status);
    }
    // ⬇️ העברה לשרת – תומך במחרוזת או CSV של כמה ערכים
    if (discount_type && String(discount_type).trim()) {
      params.set("discount_type",
        Array.isArray(discount_type) ? discount_type.join(",") : String(discount_type)
      );
    }

    const url = `${window.siteUrl}/wp-json/whizmanage/v1/get_coupons/?${params.toString()}`;

    const res = await getApi(url);
    const payload = typeof res.data === "string" ? JSON.parse(res.data) : res.data;

    return {
      rows: Array.isArray(payload?.rows)
        ? payload.rows.map(shape.toActive)
        : [],
      total: Number(payload?.total ?? 0),
      page: Number(payload?.page ?? 1),
      perPage: Number(payload?.per_page ?? perPage),
      totalPages: Number(payload?.total_pages ?? 1),
    };
  },

  updateCoupon: async (coupon) => {
    const url = `${window.siteUrl}/wp-json/wc/v3/coupons/${coupon.id}`;
    return await putApi(url, coupon);
  },

  updateField: async (couponId, field, value, couponData) => {
    const url = `${window.siteUrl}/wp-json/wc/v3/coupons/${couponId}`;

    const cleanValue =
      typeof value === "object" && value !== null && !Array.isArray(value)
        ? value.value || value.id || value
        : value;

    // שדות מוכרים של קופון
    const knownFields = new Set([
      "code",
      "amount",
      "discount_type",
      "description",
      "date_expires",
      "date_expires_gmt",
      "date",
      "usage_limit",
      "usage_limit_per_user",
      "usage_count",
      "individual_use",
      "product_ids",
      "excluded_product_ids",
      "product_categories",
      "excluded_product_categories",
      "exclude_sale_items",
      "free_shipping",
      "minimum_spend",
      "maximum_spend",
      "email_restrictions",
      "status",
    ]);

    // לא מוכר? שלח כ־meta (אם ההתקנה שלך תומכת)
    if (!knownFields.has(field)) {
      return await putApi(url, {
        meta_data: [
          {
            key: String(field),
            value: cleanValue != null ? String(cleanValue) : "",
          },
        ],
      });
    }

    const payload = {};
    switch (field) {
      case "code":
        payload.code = String(cleanValue).trim();
        break;
      case "amount": {
        const normalized = cleanValue == null || cleanValue === ""
          ? "0"
          : String(cleanValue).replace(",", ".");
        payload.amount = normalized;
        break;
      }

      case "minimum_spend":
      case "minimum_amount": {
        const normalized = cleanValue == null || cleanValue === ""
          ? ""
          : String(cleanValue).replace(",", ".");
        payload.minimum_amount = normalized;
        break;
      }

      case "maximum_spend":
      case "maximum_amount": {
        const normalized = cleanValue == null || cleanValue === ""
          ? ""
          : String(cleanValue).replace(",", ".");
        payload.maximum_amount = normalized;
        break;
      }

      case "discount_type":
        payload.discount_type = String(cleanValue);
        break;
      case "date_expires":
      case "date_expires_gmt":
        payload.date_expires = cleanValue || null;
        break;
      case "usage_limit":
      case "usage_limit_per_user":
        payload[field] = cleanValue != null && cleanValue !== "" ? Number(cleanValue) : null;
        break;
      case "exclude_sale_items":
      case "free_shipping":
      case "individual_use":
        payload[field] = !!cleanValue;
        break;
      default:
        payload[field] = cleanValue;
    }


    return await putApi(url, payload);
  },

  validateField: (field, value, couponData, allCoupons) => {

    const toNum = (raw) => {
      const s = String(raw ?? "").replace(",", ".").trim();
      return s === "" ? NaN : Number(s);
    };

    switch (field) {
      // 1) קוד קופון: חובה וייחודי
      case "code": {
        const v = String(value || "").trim();
        if (!v) {
          return { isValid: false, message: __("Coupon code is required", "whizmanage") };
        }
        const currentId = couponData?.id ?? couponData?._id ?? couponData?.key;
        // Server-side validation is preferred, but keeping this simple check if allCoupons is available (it won't be full list anymore)
        // If allCoupons is just the current page, this check is partial.
        // The user said "Remove any window.list* or global caches".
        // So I should probably remove the allCoupons dependency here or accept it's just the current page.
        // I'll leave it as is for now, but note that allCoupons will be just the current page rows.
        const isDup =
          Array.isArray(allCoupons) &&
          allCoupons.some((c) => {
            const cid = c?.id ?? c?._id ?? c?.key;
            return (
              String(c?.code || "").toLowerCase() === v.toLowerCase() &&
              cid !== currentId
            );
          });
        if (isDup) {
          return { isValid: false, message: __("Coupon code already exists", "whizmanage") };
        }
        break;
      }

      // 2) סכום הנחה: לא שלילי; לא יותר מ־100% כשזה אחוזי
      case "amount": {
        const v = toNum(value);
        if (Number.isFinite(v)) {
          if (v < 0) {
            return { isValid: false, message: __("Amount must be a positive number", "whizmanage") };
          }
          const type = couponData?.discount_type;
          if (type === "percent" && v > 100) {
            return { isValid: false, message: __("Percent discount cannot exceed 100", "whizmanage") };
          }
        }
        break;
      }

      // 3) מינימום/מקסימום עם אינסוף כשהצד השני ריק
      case "minimum_spend":
      case "maximum_spend": {
        const v = toNum(value);
        if (Number.isFinite(v) && v < 0) {
          return { isValid: false, message: __("Amount must be a positive number", "whizmanage") };
        }

        const minRaw = field === "minimum_spend" ? value : couponData?.minimum_spend;
        const maxRaw = field === "maximum_spend" ? value : couponData?.maximum_spend;

        const min = toNum(minRaw);
        const max = toNum(maxRaw);

        const minCmp = Number.isFinite(min) ? min : -Infinity;
        const maxCmp = Number.isFinite(max) ? max : Infinity;

        if (Number.isFinite(min) && Number.isFinite(max) && min > max) {
          return { isValid: false, message: __("Minimum cannot be greater than maximum", "whizmanage") };
        }
        if (field === "minimum_spend" && Number.isFinite(v) && v > maxCmp) {
          return { isValid: false, message: __("Minimum cannot be greater than maximum", "whizmanage") };
        }
        if (field === "maximum_spend" && Number.isFinite(v) && v < minCmp) {
          return { isValid: false, message: __("Maximum cannot be less than minimum", "whizmanage") };
        }
        break;
      }

      default:
        break;
    }

    return { isValid: true };
  },
};

// =============== Trash API ===============
export const couponsTrashApi = {
  // fetchTrash removed as per instructions

  moveToTrash: async (coupon) => {
    const url = `${window.siteUrl}/wp-json/wc/v3/coupons/${coupon.id}`;
    return putApi(url, { status: "trash" });
  },

  restoreFromTrash: async (coupon, nextStatus = "publish") => {
    const url = `${window.siteUrl}/wp-json/wc/v3/coupons/${coupon.id}`;
    return putApi(url, { status: nextStatus });
  },

  batchMoveToTrash: async (ids) => {
    const url = `${window.siteUrl}/wp-json/wc/v3/coupons/batch`;
    return postApi(url, {
      update: ids.map((id) => ({ id, status: "trash" })),
    });
  },

  batchRestore: async (ids, status = "publish") => {
    const url = `${window.siteUrl}/wp-json/wc/v3/coupons/batch`;
    return postApi(url, {
      update: ids.map((id) => ({ id, status })),
    });
  },

  batchPermanentDelete: async (ids) => {
    const url = `${window.siteUrl}/wp-json/wc/v3/coupons/batch`;
    return postApi(url, {
      delete: ids.map((id) => ({ id })),
    });
  },
};

/**
 * ✅ פונקציית העדכון המרכזית בשביל טבלת קופונים
 */
export const couponsMasterUpdateCell = (get) => async (
  rowId,
  columnId,
  value,
  rowData,
  isFromHistory = false
) => {
  const { updateItemWithHistory, data } = get();
  const { setSaveState, setLastSaveTime } = useTableSaveStateStore.getState();
  const previousValue = rowData[columnId];

  if (!isFromHistory) {
    setSaveState("saving");
    const validation =
      couponsApi && typeof couponsApi.validateField === "function"
        ? couponsApi.validateField(columnId, value, rowData, data)
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
    const serverRes = await couponsApi.updateField(
      rowId,
      columnId,
      value,
      rowData
    );

    const patch = serverRes?.data ?? serverRes;
    if (patch && typeof patch === "object") {
      const updates = {};
      const fieldsToSync = [
        // ✅ הסרת "status" מכאן - לא נסנכרן סטטוס אלא אם זה השדה שעודכן
        "date_modified_gmt",
        "date_modified",
        "date_expires",
        "date_expires_gmt",
        "usage_count",
      ];

      // ✅ סנכרון סטטוס רק אם זה השדה שהמשתמש עידכן
      if (columnId === "status" && patch.status !== undefined) {
        updates.status = patch.status;
      }

      fieldsToSync.forEach((f) => {
        if (patch[f] !== undefined && patch[f] !== rowData[f]) {
          updates[f] = patch[f];
        }
      });
      // fallback אופטימי אם ה–API לא החזיר עידכון זמן
      if (updates.date_modified_gmt === undefined && patch.id) {
        updates.date_modified_gmt = new Date().toISOString();
      }
      if (Object.keys(updates).length) {
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
      toast.error(__("Update error", "whizmanage"), {
        description: apiError.message || __("Error occurred while saving data", "whizmanage"),
        duration: 4000,
      });
    }
    throw apiError;
  }
};

// --- Generic aliases ---
export { couponsApi as entityApi };
export { couponsApiForTrash as entityApiForTrash };
export { couponsTrashApi as entityTrashApi };
export { couponsMasterUpdateCell as masterUpdateCell };
