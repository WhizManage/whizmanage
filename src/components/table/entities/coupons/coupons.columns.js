// src/components/table/entities/coupons/coupons.columns.js

import StatusDisplay from "@/components/table/components/StatusDisplay";
import StatusEdit from "@/components/table/components/StatusEdit";
import { postApi } from "@/services/services";
import CategoryTagsDisplay from "@components/table/components/CategoryTagsDisplay.jsx";
import CategoryTagsEdit from "@components/table/components/CategoryTagsEdit.jsx";
import { EditableCell } from "@components/table/core/EditableCell.jsx";
import CopyableText from "@components/table/entities/coupons/components/CopyableText";
import UsageLimitCell from "@components/table/entities/coupons/components/UsageLimitCell";
import { columnFilterFn } from "@components/table/filters/ColumnFilter.jsx";
import { toast } from "@/lib/utils";
import { createColumnHelper } from "@tanstack/react-table";
import { formatValue } from "../../../../utils/formatValue.js";
import AllowedEmailsCell from "./components/AllowedEmailsCell.jsx";
import { COUPON_STATUS_KEYS } from "./coupons.constants.js";
import MultiSelectEdit from "@components/table/components/MultiSelectEdit.jsx";
import CustomTooltip from "@components/ui/nextUI/Tooltip";

const columnHelper = createColumnHelper();
const toNum = (raw) => {
  const s = String(raw ?? "")
    .replace(",", ".")
    .trim();
  return s === "" ? NaN : Number(s);
};

export const createCouponsColumns = (store, __, handleCellUpdate) => {
  const toIdArray = (value) =>
    Array.isArray(value)
      ? value
        .map((v) => (typeof v === "object" ? v.id : v))
        .filter((v) => typeof v === "number" || typeof v === "string")
      : [];

  // ✅ עטיפה מעל handleCellUpdate שמטפלת בשורות חדשות
  const onUpdate = async (id, field, value, rowData, isFromHistory = false) => {
    const stringId = String(id);
    const isTempId = stringId.startsWith("temp_");
    const isNewRow = rowData?._isNew === true;

    // ✅ טיפול בשורה חדשה (temp_)
    if ((isTempId || isNewRow) && !isFromHistory) {
      try {
        const updatedData = { ...rowData, [field]: value };

        // ✅ payload נקי - רק שדות שה-API של WooCommerce מכיר
        const payload = {
          code: updatedData.code || `coupon_${Date.now()}`,
          discount_type: updatedData.discount_type || "fixed_cart",
          amount: String(updatedData.amount || "0"),
          description: updatedData.description || "",
          date_expires: updatedData.date_expires || null,
          individual_use: Boolean(updatedData.individual_use),
          free_shipping: Boolean(updatedData.free_shipping),
          exclude_sale_items: Boolean(updatedData.exclude_sale_items),
        };

        // ✅ הוסף שדות אופציונליים רק אם יש להם ערך
        if (updatedData.usage_limit != null && updatedData.usage_limit !== "") {
          payload.usage_limit = Number(updatedData.usage_limit);
        }

        if (
          updatedData.usage_limit_per_user != null &&
          updatedData.usage_limit_per_user !== ""
        ) {
          payload.usage_limit_per_user = Number(
            updatedData.usage_limit_per_user
          );
        }

        if (
          updatedData.limit_usage_to_x_items != null &&
          updatedData.limit_usage_to_x_items !== ""
        ) {
          payload.limit_usage_to_x_items = Number(
            updatedData.limit_usage_to_x_items
          );
        }

        if (updatedData.minimum_amount && updatedData.minimum_amount !== "") {
          payload.minimum_amount = String(updatedData.minimum_amount);
        }

        if (updatedData.maximum_amount && updatedData.maximum_amount !== "") {
          payload.maximum_amount = String(updatedData.maximum_amount);
        }

        if (
          Array.isArray(updatedData.product_ids) &&
          updatedData.product_ids.length > 0
        ) {
          payload.product_ids = updatedData.product_ids;
        }

        if (
          Array.isArray(updatedData.excluded_product_ids) &&
          updatedData.excluded_product_ids.length > 0
        ) {
          payload.excluded_product_ids = updatedData.excluded_product_ids;
        }

        if (
          Array.isArray(updatedData.product_categories) &&
          updatedData.product_categories.length > 0
        ) {
          payload.product_categories = updatedData.product_categories;
        }

        if (
          Array.isArray(updatedData.excluded_product_categories) &&
          updatedData.excluded_product_categories.length > 0
        ) {
          payload.excluded_product_categories =
            updatedData.excluded_product_categories;
        }

        if (
          Array.isArray(updatedData.email_restrictions) &&
          updatedData.email_restrictions.length > 0
        ) {
          payload.email_restrictions = updatedData.email_restrictions;
        }

        // endpoint ליצירת קופון חדש
        const endpoint = `${window.siteUrl}/wp-json/wc/v3/coupons`;
        const response = await postApi(endpoint, payload);
        const newItem = response.data;

        // ✅ עדכון השורה הזמנית עם הקופון החדש
        if (typeof store.updateItem === "function") {
          store.updateItem(stringId, {
            ...newItem,
            _isNew: false,
            _needsSave: false,
          });

          // ✅ עדכן גם את ה-ID
          if (typeof store.setData === "function") {
            store.setData((prev) =>
              prev.map((row) =>
                String(row.id) === stringId ? { ...row, id: newItem.id } : row
              )
            );
          }
        } else {
          console.warn("Could not update store after coupon creation");
        }

        toast.success(__("Coupon created successfully", "whizmanage"));
        return true;
      } catch (error) {
        console.error("Failed to create coupon:", error);
        toast.error(__("Failed to create coupon", "whizmanage"), {
          description: error?.response?.data?.message || error.message,
        });
        throw error;
      }
    }

    // ✅ עדכון רגיל דרך handleCellUpdate (masterUpdateCell)
    if (typeof handleCellUpdate === "function") {
      return await handleCellUpdate(id, field, value, rowData, isFromHistory);
    }

    // fallback
    store.updateItem(id, { [field]: value });
    return true;
  };

  const baseColumns = [
    // --- Code ---
    columnHelper.accessor("code", {
      header: __("Code", "whizmanage"),
      size: 200,
      minSize: 140,
      filterFn: columnFilterFn,
      cell: (props) => <CopyableText {...props} onUpdate={onUpdate} />,
    }),

    // --- Discount type ---
    columnHelper.accessor("discount_type", {
      header: __("Discount type", "whizmanage"),
      size: 160,
      minSize: 140,
      meta: {
        editable: true,
        editType: "select",
        editOptions: {
          options: [
            { value: "percent", label: __("percent", "whizmanage") },
            { value: "fixed_cart", label: __("Fixed cart", "whizmanage") },
            { value: "fixed_product", label: __("Fixed product", "whizmanage") },
          ],
        },
      },
      filterFn: columnFilterFn,
      cell: (props) => <EditableCell {...props} onUpdate={onUpdate} />,
    }),

    columnHelper.accessor("amount", {
      header: __("Amount", "whizmanage"),
      size: 120,
      minSize: 100,
      meta: {
        editable: true,
        editType: "number",
        editOptions: { min: 0, step: 0.01, placeholder: "0" },
      },
      cell: (props) => (
        <EditableCell
          {...props}
          onUpdate={onUpdate}
          renderDisplay={(value) => {
            const isPercent = props.row.original?.discount_type === "percent";
            return formatValue(value, isPercent ? "percent" : "currency");
          }}
        />
      ),
    }),

    columnHelper.accessor("usage_limit", {
      header: __("Usage / Limit", "whizmanage"),
      size: 120,
      minSize: 120,
      cell: (props) => <UsageLimitCell {...props} onUpdate={onUpdate} />,
    }),

    // --- Expiry date ---
    columnHelper.accessor("date_expires", {
      header: __("Expiry date", "whizmanage"),
      size: 180,
      minSize: 160,
      meta: {
        editable: true,
        editType: "date",
        displayFormat: {
          formatValue: (value) => {
            if (!value) return <span className="text-muted-foreground">—</span>;
            const d = new Date(value);
            if (isNaN(d.getTime())) return value;
            return d.toLocaleString("he-IL", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            });
          },
        },
      },
      cell: (props) => <EditableCell {...props} onUpdate={onUpdate} />,
    }),

    // --- Description ---
    columnHelper.accessor("description", {
      header: __("Description", "whizmanage"),
      size: 260,
      minSize: 200,
      meta: {
        editable: true,
        editType: "text",
        editOptions: {
          placeholder: __("Optional description", "whizmanage"),
        },
      },
      cell: (props) => <EditableCell {...props} onUpdate={onUpdate} />,
    }),

    // --- Individual use (Switch) ---
    columnHelper.accessor("individual_use", {
      header: __("Individual use", "whizmanage"),
      size: 150,
      minSize: 120,
      meta: {
        editable: true,
        editType: "switch",
        filterType: "boolean",
      },
      cell: (props) => <EditableCell {...props} onUpdate={onUpdate} />,
    }),

    // --- Allowed emails (inline cell) ---
    columnHelper.accessor(
      (row) =>
        Array.isArray(row.email_restrictions) ? row.email_restrictions : [],
      {
        id: "email_restrictions",
        header: __("Allowed emails", "whizmanage"),
        size: 220,
        minSize: 180,
        filterFn: columnFilterFn,
        cell: (props) => (
          <AllowedEmailsCell
            {...props}
            onUpdate={(id, _colId, value, rowData, isFromHistory) =>
              onUpdate(
                id,
                "email_restrictions",
                Array.isArray(value) ? value : [],
                rowData,
                isFromHistory
              )
            }
          />
        ),
      }
    ),

    // --- Minimum spend ---
    columnHelper.accessor("minimum_amount", {
      header: __("Minimum spend", "whizmanage"),
      size: 140,
      minSize: 120,
      meta: {
        editable: true,
        editType: "text",
        editOptions: { placeholder: "0" },
        validationRules: [
          {
            pattern: "^\\d*(?:[\\.,]\\d{1,2})?$",
            message: __("Enter a valid amount", "whizmanage"),
          },
        ],
        onValidate: (val, row) => {
          const v = toNum(val);
          if (Number.isFinite(v) && v < 0) return __("Value must be ≥ 0", "whizmanage");

          const maxRaw = row?.maximum_spend;
          const max = toNum(maxRaw);
          const maxCmp = Number.isFinite(max) ? max : Infinity;

          if (Number.isFinite(v) && v > maxCmp) {
            return __("Minimum cannot be greater than maximum", "whizmanage");
          }
          return null;
        },
        displayFormat: {
          formatValue: (value) =>
            value == null || value === ""
              ? <span className="text-muted-foreground">—</span>
              : formatValue(toNum(value), "currency"),
        },
      },
      filterFn: columnFilterFn,
      cell: (props) => (
        <EditableCell
          {...props}
          onUpdate={onUpdate}
          renderDisplay={(value) =>
            value == null || value === ""
              ? <span className="text-muted-foreground">—</span>
              : formatValue(toNum(value), "currency")
          }
        />
      ),
    }),

    // --- Maximum spend ---
    columnHelper.accessor("maximum_amount", {
      header: __("Maximum spend", "whizmanage"),
      size: 140,
      minSize: 120,
      meta: {
        editable: true,
        editType: "text",
        editOptions: { placeholder: "0" },
        validationRules: [
          {
            pattern: "^\\d*(?:[\\.,]\\d{1,2})?$",
            message: __("Enter a valid amount", "whizmanage"),
          },
        ],
        onValidate: (val, row) => {
          const v = toNum(val);
          if (Number.isFinite(v) && v < 0) return __("Value must be ≥ 0", "whizmanage");

          const minRaw = row?.minimum_spend;
          const min = toNum(minRaw);
          const minCmp = Number.isFinite(min) ? min : -Infinity;

          if (Number.isFinite(v) && v < minCmp) {
            return __("Maximum cannot be less than minimum", "whizmanage");
          }
          return null;
        },
        displayFormat: {
          formatValue: (value) =>
            value == null || value === ""
              ? "∞"
              : formatValue(toNum(value), "currency"),
        },
      },
      filterFn: columnFilterFn,
      cell: (props) => <EditableCell {...props} onUpdate={onUpdate} />,
    }),

    // --- NEW: Date (start/created) ---
    columnHelper.accessor("date", {
      header: __("Date", "whizmanage"),
      size: 180,
      minSize: 160,
      meta: {
        editable: true,
        editType: "date",
        displayFormat: {
          formatValue: (value) => {
            if (!value) return <span className="text-muted-foreground">—</span>;
            const d = new Date(value);
            if (isNaN(d.getTime())) return value;
            return d.toLocaleString("he-IL", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            });
          },
        },
      },
      filterFn: columnFilterFn,
      cell: (props) => <EditableCell {...props} onUpdate={onUpdate} />,
    }),

    // --- Exclude sale items (Switch) ---
    columnHelper.accessor("exclude_sale_items", {
      header: __("Exclude sale items", "whizmanage"),
      size: 170,
      minSize: 130,
      meta: {
        editable: true,
        editType: "switch",
        filterType: "boolean",
      },
      cell: (props) => <EditableCell {...props} onUpdate={onUpdate} />,
    }),

    // --- Free shipping (Switch) ---
    columnHelper.accessor("free_shipping", {
      header: __("Free shipping", "whizmanage"),
      size: 150,
      minSize: 120,
      meta: {
        editable: true,
        editType: "switch",
        filterType: "boolean",
      },
      cell: (props) => <EditableCell {...props} onUpdate={onUpdate} />,
    }),

    // --- Status ---
    columnHelper.accessor("status", {
      header: __("Status", "whizmanage"),
      size: 120,
      minSize: 100,
      meta: {
        editable: true,
        editType: "select",
        customDisplayComponent: StatusDisplay,
        customEditComponent: StatusEdit,
        editOptions: {
          statusKeys: COUPON_STATUS_KEYS,
          options: [
            { value: "publish", label: __("Published", "whizmanage") },
            { value: "draft", label: __("Draft", "whizmanage") },
            { value: "pending", label: __("Pending", "whizmanage") },
          ],
        },
      },
      filterFn: columnFilterFn,
      cell: (props) => <EditableCell {...props} onUpdate={onUpdate} />,
    }),

    // --- Product categories (custom) ---
    columnHelper.accessor((row) => row.product_categories || [], {
      id: "product_categories",
      header: __("Product categories", "whizmanage"),
      size: 240,
      minSize: 190,
      meta: {
        editable: true,
        editType: "custom",
        customDisplayComponent: CategoryTagsDisplay,
        customEditComponent: CategoryTagsEdit,
        autoFinishOnChange: false,
        editOptions: {
          label: __("Product categories", "whizmanage"),
          objectSingularLabel: __("Product category", "whizmanage"),
          hierarchical: true,
          taxonomyType: "product_cat",
          oppositeColumn: "excluded_product_categories",
        },
      },
      filterFn: columnFilterFn,
      cell: (props) => (
        <EditableCell
          {...props}
          onUpdate={(id, _colId, value, rowData, isFromHistory) => {
            const ids = toIdArray(value);
            return onUpdate(
              id,
              "product_categories",
              ids,
              rowData,
              isFromHistory
            );
          }}
        />
      ),
    }),

    // --- Excluded product categories (custom) ---
    columnHelper.accessor((row) => row.excluded_product_categories || [], {
      id: "excluded_product_categories",
      header: __("Excluded product categories", "whizmanage"),
      size: 240,
      minSize: 190,
      meta: {
        editable: true,
        editType: "custom",
        customDisplayComponent: CategoryTagsDisplay,
        customEditComponent: CategoryTagsEdit,
        autoFinishOnChange: false,
        editOptions: {
          label: __("Excluded product categories", "whizmanage"),
          objectSingularLabel: __("Excluded product category", "whizmanage"),
          hierarchical: true,
          taxonomyType: "product_cat",
          oppositeColumn: "product_categories",
        },
      },
      filterFn: columnFilterFn,
      cell: (props) => (
        <EditableCell
          {...props}
          onUpdate={(id, _colId, value, rowData, isFromHistory) => {
            const ids = toIdArray(value);
            return onUpdate(
              id,
              "excluded_product_categories",
              ids,
              rowData,
              isFromHistory
            );
          }}
        />
      ),
    }),

    // --- Products (custom) ---
    columnHelper.accessor((row) => row.product_ids || [], {
      id: "product_ids",
      header: __("Products", "whizmanage"),
      size: 220,
      minSize: 180,
      meta: {
        editable: true,
        editType: "custom",
        customEditComponent: MultiSelectEdit,
        autoFinishOnChange: false,
        editOptions: {
          oppositeColumn: "excluded_product_ids",
          source: "products",
          creatable: false,
          namesField: "product_names",
        },
      },
      filterFn: columnFilterFn,
      cell: (props) => (
        <EditableCell
          {...props}
          onUpdate={(id, _colId, value, rowData, isFromHistory) => {
            const toIdArray = (value) =>
              Array.isArray(value)
                ? value
                  .map((v) => (typeof v === "object" ? v.id : v))
                  .filter((v) => typeof v === "number" || typeof v === "string")
                : [];
            const ids = toIdArray(value);
            return onUpdate(id, "product_ids", ids, rowData, isFromHistory);
          }}
          renderDisplay={(value) => {
            const ids = Array.isArray(value) ? value : [];
            if (!ids.length) return <span className="text-muted-foreground">—</span>;
            const row = props.row?.original || {};
            const namesField = "product_names";
            const rowNames = Array.isArray(row[namesField]) ? row[namesField] : [];
            const productList = Array.isArray(window?.listProduct) ? window.listProduct : [];
            const map = productList.length > 0
              ? Object.fromEntries(
                productList.map((p) => [
                  String(p.id),
                  p.name || p.title || `#${p.id}`,
                ])
              )
              : {};
            // שימוש ב-ID בלבד לקבלת השם
            const labelFor = (id) => map[String(id)] || rowNames.find((name, idx) => {
              const rowId = typeof ids[idx] === "object" ? ids[idx].id : ids[idx];
              return rowId === id;
            }) || `#${id}`;
            // סנן מוצרים מחוקים רק אם יש לנו את רשימת המוצרים המלאה
            // rowNames עלול להיות חלקי ולא לכלול את כל השמות, לכן לא נסנן לפיו
            const validIds = productList.length > 0
              ? ids.filter((raw) => {
                  const id = typeof raw === "object" ? raw.id : raw;
                  const label = map[String(id)];
                  // אם אין label ב-map, המוצר לא קיים ברשימה (מחוק)
                  return !!label;
                })
              : ids; // אם אין רשימת מוצרים עדיין, הצג את כל ה-IDs
            if (!validIds.length) return <span className="text-muted-foreground">—</span>;
            const MAX = 2;
            const shown = validIds.slice(0, MAX);
            const rest = validIds.length - shown.length;
            return (
              <div
                className="flex items-center gap-1 py-0.5 min-w-0 overflow-hidden"
                title={validIds
                  .map((raw) => labelFor(typeof raw === "object" ? raw.id : raw))
                  .join(", ")}
              >
                {shown.map((raw) => {
                  const id = typeof raw === "object" ? raw.id : raw;
                  const label = labelFor(id);
                  return (
                    <CustomTooltip key={id} title={label}>
                      <span className="px-1.5 h-5 rounded-sm text-xs bg-slate-100 dark:bg-slate-600 dark:text-slate-300 inline-flex items-center max-w-[100px] truncate">
                        {label}
                      </span>
                    </CustomTooltip>
                  );
                })}
                {rest > 0 && productList.length > 0 && (
                  <span className="text-xs text-muted-foreground">+{rest}</span>
                )}
                {rest > 0 && productList.length === 0 && (
                  <span className="text-xs text-muted-foreground">...</span>
                )}
              </div>
            );
          }}
        />
      ),
    }),

    // --- Excluded products (custom) ---
    columnHelper.accessor((row) => row.excluded_product_ids || [], {
      id: "excluded_product_ids",
      header: __("Excluded products", "whizmanage"),
      size: 240,
      minSize: 190,
      meta: {
        editable: true,
        editType: "custom",
        customEditComponent: MultiSelectEdit,
        autoFinishOnChange: false,
        editOptions: {
          oppositeColumn: "product_ids",
          source: "products",
          creatable: false,
          namesField: "excluded_product_names",
        },
      },
      filterFn: columnFilterFn,
      cell: (props) => (
        <EditableCell
          {...props}
          onUpdate={(id, _colId, value, rowData, isFromHistory) => {
            const toIdArray = (value) =>
              Array.isArray(value)
                ? value
                  .map((v) => (typeof v === "object" ? v.id : v))
                  .filter((v) => typeof v === "number" || typeof v === "string")
                : [];
            const ids = toIdArray(value);
            return onUpdate(
              id,
              "excluded_product_ids",
              ids,
              rowData,
              isFromHistory
            );
          }}
          renderDisplay={(value) => {
            const ids = Array.isArray(value) ? value : [];
            if (!ids.length) return <span className="text-muted-foreground">—</span>;
            const row = props.row?.original || {};
            const namesField = "excluded_product_names";
            const rowNames = Array.isArray(row[namesField]) ? row[namesField] : [];
            const productList = Array.isArray(window?.listProduct) ? window.listProduct : [];
            const map = productList.length > 0
              ? Object.fromEntries(
                productList.map((p) => [
                  String(p.id),
                  p.name || p.title || `#${p.id}`,
                ])
              )
              : {};
            // שימוש ב-ID בלבד לקבלת השם
            const labelFor = (id) => map[String(id)] || rowNames.find((name, idx) => {
              const rowId = typeof ids[idx] === "object" ? ids[idx].id : ids[idx];
              return rowId === id;
            }) || `#${id}`;
            // סנן מוצרים מחוקים רק אם יש לנו את רשימת המוצרים המלאה
            // rowNames עלול להיות חלקי ולא לכלול את כל השמות, לכן לא נסנן לפיו
            const validIds = productList.length > 0
              ? ids.filter((raw) => {
                  const id = typeof raw === "object" ? raw.id : raw;
                  const label = map[String(id)];
                  // אם אין label ב-map, המוצר לא קיים ברשימה (מחוק)
                  return !!label;
                })
              : ids; // אם אין רשימת מוצרים עדיין, הצג את כל ה-IDs
            if (!validIds.length) return <span className="text-muted-foreground">—</span>;
            const MAX = 2;
            const shown = validIds.slice(0, MAX);
            const rest = validIds.length - shown.length;
            return (
              <div
                className="flex items-center gap-1 py-0.5 min-w-0 overflow-hidden"
                title={validIds
                  .map((raw) => labelFor(typeof raw === "object" ? raw.id : raw))
                  .join(", ")}
              >
                {shown.map((raw) => {
                  const id = typeof raw === "object" ? raw.id : raw;
                  const label = labelFor(id);
                  return (
                    <CustomTooltip key={id} title={label}>
                      <span className="px-1.5 h-5 rounded-sm text-xs bg-slate-100 dark:bg-slate-600 dark:text-slate-300 inline-flex items-center max-w-[100px] truncate">
                        {label}
                      </span>
                    </CustomTooltip>
                  );
                })}
                {rest > 0 && productList.length > 0 && (
                  <span className="text-xs text-muted-foreground">+{rest}</span>
                )}
                {rest > 0 && productList.length === 0 && (
                  <span className="text-xs text-muted-foreground">...</span>
                )}
              </div>
            );
          }}
        />
      ),
    }),
  ];

  return baseColumns;
};

export { createCouponsColumns as createEntityColumns };
