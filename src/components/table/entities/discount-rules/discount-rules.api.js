// src/components/table/entities/discount-rules/discount-rules.api.js

import { useTableSaveStateStore } from "@/components/table/store/saveStateStore";
import { toast } from "@/lib/utils";
import { deleteApi, getApi, postApi } from "/src/services/services";
import { __ } from "@wordpress/i18n";
/** =========================
 *  Shape helpers (אחידות שדות)
 *  ========================= */
const safeParse = (val, fallback) => {
  if (!val) return fallback;
  if (typeof val !== "string") return val;
  try {
    return JSON.parse(val);
  } catch (e) {
    console.warn("safeParse failed for:", val, e);
    return fallback;
  }
};

export const discountRulesShape = {
  toActive: (r) => ({
    ...r,
    id: r?.id ? String(r.id) : r?.id,
    name: r?.name || "",
    type: r?.type || "product_adjustment",
    status: r?.status ?? "draft",
    start_date: r?.start_date || null,
    end_date: r?.end_date || null,
    priority: r?.priority !== undefined ? Number(r.priority) : 0,
    show_message: r?.show_message !== undefined ? (r.show_message === "1" || r.show_message === 1 || r.show_message === true) : true,
    conditions: safeParse(r?.conditions, { logic: "all", rules: [] }),
    filters: safeParse(r?.filters, []),
    actions: safeParse(r?.actions, {}),
    message: r?.message || "",
  }),
  toTrash: (r) => ({
    ...r,
    status: "trash",
    date_deleted: r?.date_deleted || new Date().toISOString(),
  }),
};

const base = `${window.siteUrl}/wp-json/whizmanage/v1/discount-rules`;

// פונקציה עוזרת ליצירת actions ברירת מחדל לפי type
const getDefaultActionsForType = (type) => {
  switch (type) {
    case "spend_bundle":
      return { unit_amount: 10, method: "fixed", value: 3, recursive: false };
    case "bulk_discount":
      return { tiers: [], apply_as_coupon: false };
    case "bogo_discount":
      return { x_qty: 2, y_qty: 1, discount_pct: 100, recursive: false };
    case "bxgy_discount":
      return { x_qty: 1, y_qty: 1, discount_pct: 100, recursive: false };
    case "shipping_discount":
      return { method: "percentage", value: 50, label: "" };
    case "product_adjustment":
    case "cart_adjustment":
    default:
      return { method: "percentage", value: 10, apply_as_coupon: false };
  }
};

/** =========================
 *  Entity API
 *  ========================= */
export const discountRulesApi = {
  // fetchItems removed as per instructions

  fetchPage: async ({
    page = 1,
    perPage = 100,
    search,
    status,
    type,
    start_from,
    start_to,
    end_from,
    end_to,
    orderby,
    order,
  } = {}) => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("per_page", String(perPage));

    if (search && String(search).trim()) {
      params.set("q", String(search).trim());
    }
    if (status && status !== "any") params.set("status", status);
    if (type) params.set("type", String(type));

    if (start_from) params.set("start_from", start_from);
    if (start_to) params.set("start_to", start_to);
    if (end_from) params.set("end_from", end_from);
    if (end_to) params.set("end_to", end_to);

    if (orderby) params.set("orderby", String(orderby));
    if (order)
      params.set(
        "order",
        String(order).toUpperCase() === "ASC" ? "ASC" : "DESC"
      );

    const url = `${window.siteUrl}/wp-json/whizmanage/v1/discount-rules/?${params.toString()}`;
    const res = await getApi(url);

    const rowsArray = Array.isArray(res?.data) ? res.data : [];
    const totalHeader =
      res?.headers?.["x-wp-total"] ?? res?.headers?.["X-WP-Total"];
    const totalPagesHeader =
      res?.headers?.["x-wp-totalpages"] ?? res?.headers?.["X-WP-TotalPages"];

    const total = totalHeader ? Number(totalHeader) : rowsArray.length;
    const totalPages = totalPagesHeader
      ? Number(totalPagesHeader)
      : Math.max(1, Math.ceil(total / perPage));

    return {
      rows: rowsArray.map(discountRulesShape.toActive),
      total,
      page,
      perPage,
      totalPages,
    };
  },

  create: async (payload) => {
    const res = await postApi(base, payload);
    return res?.data ?? res;
  },

  updateRule: async (id, payload) => {
    const res = await postApi(`${base}/${id}`, payload);
    return res?.data ?? res;
  },

  updateField: async (id, field, value, rowData) => {
    const passthrough = new Set(["actions", "conditions", "filters"]);
    if (passthrough.has(field)) {
      const res = await postApi(`${base}/${id}`, { [field]: value });
      return res?.data ?? res;
    }

    const cleanValue =
      typeof value === "object" && value !== null && !Array.isArray(value)
        ? (value.value ?? value.id ?? value)
        : value;

    const knownFields = new Set([
      "name",
      "type",
      "status",
      "start_date",
      "end_date",
      "priority",
      "filters",
      "conditions",
      "actions",
      "message",
      "show_message",
    ]);

    let payload;
    if (knownFields.has(field)) {
      payload = { [field]: cleanValue };
    } else {
      payload = { meta: [{ key: String(field), value: cleanValue }] };
    }

    const res = await postApi(`${base}/${id}`, payload);
    return res?.data ?? res;
  },

  delete: async (id) => {
    const res = await deleteApi(`${base}/${id}`);
    return res?.data ?? true;
  },

  validateField: (field, value, rowData) => {
    switch (field) {
      case "name":
        if (!String(value || "").trim()) {
          return { isValid: false, message: __("Name is required", "whizmanage") };
        }
        break;
      case "priority":
        if (value !== "" && value !== null && value !== undefined) {
          const n = Number(value);
          if (!Number.isFinite(n) || n < 0) {
            return {
              isValid: false,
              message: __("Priority must be a non-negative number", "whizmanage"),
            };
          }
        }
        break;
      case "start_date":
      case "end_date":
        if (value) {
          const d = new Date(value);
          if (isNaN(d.getTime())) {
            return { isValid: false, message: __("Invalid date", "whizmanage") };
          }
        }
        if (field === "end_date" && value && rowData?.start_date) {
          const sd = new Date(rowData.start_date);
          const ed = new Date(value);
          if (sd.getTime() > ed.getTime()) {
            return {
              isValid: false,
              message: __("End date cannot be before start date", "whizmanage"),
            };
          }
        }
        if (field === "start_date" && value && rowData?.end_date) {
          const sd = new Date(value);
          const ed = new Date(rowData.end_date);
          if (sd.getTime() > ed.getTime()) {
            return {
              isValid: false,
              message: __("Start date cannot be after end date", "whizmanage"),
            };
          }
        }
        break;
      default:
        break;
    }
    return { isValid: true };
  },
};

/** =========================
 *  Trash API
 *  ========================= */
export const discountRulesApiForTrash = {
  fetchPage: async (params) => {
    return discountRulesApi.fetchPage({ ...params, status: "trash" });
  },
};

export const discountRulesTrashApi = {
  // fetchTrash removed
};

/** =========================
 *  masterUpdateCell
 *  ========================= */
export const discountRulesMasterUpdateCell =
  (get) =>
    async (rowId, columnId, value, rowData, isFromHistory = false) => {
      const { updateItemWithHistory } = get();
      const { setSaveState, setLastSaveTime } = useTableSaveStateStore.getState();

      const previousValue = rowData[columnId];

      const isTemp =
        String(rowId).startsWith("temp_") ||
        rowData?._isNew === true ||
        isFromHistory === "temp";

      const fieldsToSync = [
        "status",
        "type",
        "start_date",
        "end_date",
        "priority",
        "updated_at",
        "created_at",
        "actions",
        "message",
        "conditions",
      ];

      try {
        setSaveState?.("saving");

        if (isTemp) {
          const type = rowData?.type || "product_adjustment";
          const defaultActions = getDefaultActionsForType(type);

          const cleanValue =
            typeof value === "object" && value !== null && !Array.isArray(value)
              ? (value.value ?? value.id ?? value)
              : value;

          const payload = {
            name: rowData?.name || "New Discount Rule",
            type: type,
            status: rowData?.status ?? "draft",
            start_date: rowData?.start_date ?? null,
            end_date: rowData?.end_date ?? null,
            priority: Number(rowData?.priority ?? 0),
            conditions: rowData?.conditions || { logic: "all", rules: [] },
            actions: rowData?.actions || defaultActions,
          };
          if (columnId) payload[columnId] = cleanValue;


          const createdRes = await discountRulesApi.create(payload);
          const created = createdRes?.data ?? createdRes ?? {};

          get().setData?.((prev = []) =>
            prev.map((r) =>
              String(r.id) === String(rowId)
                ? { ...created, _isNew: false, _needsSave: false }
                : r
            )
          );

          setSaveState?.("saved");
          setLastSaveTime?.(new Date());
          return true;
        }

        if (!isFromHistory) {
          if (typeof updateItemWithHistory === "function") {
            updateItemWithHistory(rowId, { [columnId]: value }, true);
          } else {
            get().updateItem(rowId, { [columnId]: value });
          }
        } else {
          get().updateItem(rowId, { [columnId]: value });
        }

        const serverRes = await discountRulesApi.updateField(
          rowId,
          columnId,
          value,
          rowData
        );
        const patch = serverRes?.data ?? serverRes ?? {};

        const updates = {};
        fieldsToSync.forEach((f) => {
          if (patch[f] !== undefined && patch[f] !== rowData[f]) {
            updates[f] = patch[f];
          }
        });

        if (Object.keys(updates).length) {
          get().updateItem(rowId, updates);

          if (
            columnId === "type" &&
            updates.status === "draft" &&
            rowData.status !== "draft"
          ) {
            toast.info(__("Rule moved to Draft", "whizmanage"), {
              description: __("Type changed; rule disabled until settings are updated.", "whizmanage"),
              duration: 3500,
            });
          }
        }

        setSaveState?.("saved");
        setLastSaveTime?.(new Date());
        return true;
      } catch (apiError) {
        console.error("masterUpdateCell error:", apiError);

        if (!isTemp) {
          get().updateItem(rowId, { [columnId]: previousValue });
        }

        setSaveState?.("error");
        if (!isFromHistory) {
          toast.error(__("Update error", "whizmanage"), {
            description:
              apiError?.response?.data?.message ||
              apiError.message ||
              __("Error occurred while saving data", "whizmanage"),
            duration: 4000,
          });
        }
        throw apiError;
      }
    };

/** ייצוא בשמות האחידים */
export {
  discountRulesApi as entityApi,
  discountRulesApiForTrash as entityApiForTrash,
  discountRulesTrashApi as entityTrashApi,
  discountRulesMasterUpdateCell as masterUpdateCell,
};
