// src/components/pages/table/orders/orders.columns.js
import { toast } from "@/lib/utils";
import { postApi } from "@/services/services";
import { formatValue } from "@/utils/formatValue.js";
import StatusDisplay from "@components/table/components/StatusDisplay";
import StatusEdit from "@components/table/components/StatusEdit";
import { EditableCell } from "@components/table/core/EditableCell.jsx";
import { columnFilterFn } from "@components/table/filters/ColumnFilter.jsx";
import CustomTooltip from "@components/ui/nextUI/Tooltip";
import ProBadge from "@components/ui/nextUI/ProBadge";
import { createColumnHelper } from "@tanstack/react-table";
import { FileText, Package, Truck, User } from "lucide-react";
import React from "react";
import OrderBillingModal from "./components/OrderBillingModal";
import OrderItemsModal from "./components/OrderItemsModal";
import OrderNotesChat from "./components/OrderNotesChat";
import OrderShippingModal from "./components/OrderShippingModal";
import OrderSourceBadge from "./components/OrderSourceBadge";
import OrderSummaryModal from "./components/OrderSummaryModal";
import PaymentMethodCell from "./components/PaymentMethodCell.jsx";
import { ORDER_STATUS_KEYS } from "./orders.constants";

// ✅ מערכת לניהול פתיחה אוטומטית של מודלים
const NEW_ORDER_HANDLERS = new Map();

const registerNewOrderHandler = (orderId, openItemsModal) => {
  NEW_ORDER_HANDLERS.set(String(orderId), openItemsModal);
};

const triggerNewOrderItemsModal = (orderId) => {
  const handler = NEW_ORDER_HANDLERS.get(String(orderId));
  if (handler) {
    setTimeout(() => handler(), 50);
    NEW_ORDER_HANDLERS.delete(String(orderId));
  }
};

// ——————————————————————————————————————————————————————————————
// Helpers
// ——————————————————————————————————————————————————————————————
const columnHelper = createColumnHelper();

const paymentOptions = (__) => [
  { value: "credit_card", label: __("Credit Card", "whizmanage") },
  { value: "paypal", label: __("PayPal", "whizmanage") },
  { value: "bank_transfer", label: __("Bank Transfer", "whizmanage") },
  { value: "cod", label: __("Cash on Delivery (COD)", "whizmanage") },
  { value: "bit", label: __("Bit (Israeli Payment App)", "whizmanage") },
  { value: "apple_pay", label: __("Apple Pay", "whizmanage") },
  { value: "google_pay", label: __("Google Pay", "whizmanage") },
  { value: "manual", label: __("Manual Payment", "whizmanage") },
  { value: "cheque", label: __("Check", "whizmanage") },
  { value: "direct_debit", label: __("Standing Order / Direct Debit", "whizmanage") },
];

const fmtDateTime = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("he-IL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

// Read a meta value by key from Woo-like meta_data (array of {key,value})
const getMeta = (row, key) => {
  const arr = Array.isArray(row?.meta_data) ? row.meta_data : [];
  const f = arr.find((m) => m && m.key === key);
  return f ? f.value : "";
};

// ——————————————————————————————————————————————————————————————
// Dynamic custom fields (from window.listOrdersMetaData)
// ——————————————————————————————————————————————————————————————
const createCustomMetaColumns = (__, onUpdate) => {
  const defs = Array.isArray(window?.listOrdersMetaData)
    ? window.listOrdersMetaData
    : [];

  return defs
    .filter((k) => typeof k === "string" && k.trim().length > 0)
    .map((key) =>
      columnHelper.accessor((row) => getMeta(row, key), {
        id: key,
        header: __(key, "whizmanage"),
        size: 160,
        minSize: 120,
        meta: {
          editable: true,
          editType: "text",
          displayFormat: {
            formatValue: (val) => {
              if (val == null || val === "") return <span className="text-muted-foreground">—</span>;
              if (Array.isArray(val)) return `[${val.length} items]`;
              if (typeof val === "object")
                return `{${Object.keys(val).length} keys}`;
              const s = String(val);
              return s.length > 120 ? `${s.slice(0, 120)}…` : s;
            },
          },
        },
        filterFn: columnFilterFn,
        cell: (props) => (
          <EditableCell
            {...props}
            onUpdate={(id, _colId, value, rowData, isFromHistory) =>
              onUpdate(id, key, value, rowData, isFromHistory)
            }
          />
        ),
      })
    );
};

// ——————————————————————————————————————————————————————————————
// Main factory — ordered to match DB columnOrder
// ——————————————————————————————————————————————————————————————
export const createOrdersColumns = (store, __ ,handleCellUpdate) => {
  // ✅ עטיפה מעל handleCellUpdate שמטפלת בשורות חדשות
  const onUpdate = async (id, field, value, rowData, isFromHistory = false) => {
    const stringId = String(id);
    const isTempId = stringId.startsWith("temp_");
    const isNewRow = rowData?._isNew === true;

    // ✅ טיפול בשורה חדשה (temp_)
    if ((isTempId || isNewRow) && !isFromHistory) {
      // ✅ אם זה עדכון ראשוני (לא line_items), פתח את המודל
      if (field !== "line_items") {
        triggerNewOrderItemsModal(stringId);
      }

      // ✅ וולידציה: אסור לשמור בלי line_items
      const items = field === "line_items" ? value : rowData.line_items;
      if (!Array.isArray(items) || items.length === 0) {
        toast.error(__("Cannot save order", "whizmanage"), {
          description: __("Please add at least one product to the order", "whizmanage"),
          duration: 5000,
        });
        return false;
      }

      try {
        const updatedData = { ...rowData, [field]: value };

        // ✅ נקה את line_items - הסר שדות שלא צריך
        const cleanLineItems = (updatedData.line_items || []).map((item) => {
          const cleanItem = {
            product_id: item.product_id,
            quantity: item.quantity || 1,
          };

          if (item.variation_id) {
            cleanItem.variation_id = item.variation_id;
          }

          if (Array.isArray(item.meta_data) && item.meta_data.length > 0) {
            cleanItem.meta_data = item.meta_data;
          }

          return cleanItem;
        });

        // ✅ payload מינימליסטי
        const payload = {
          status: updatedData.status || "pending",
          line_items: cleanLineItems,
        };

        // ✅ הוסף billing רק אם יש תוכן אמיתי
        const billing = updatedData.billing || {};
        if (
          billing.email ||
          billing.first_name ||
          billing.last_name ||
          billing.phone
        ) {
          payload.billing = billing;
        }

        // ✅ הוסף shipping רק אם יש תוכן אמיתי
        const shipping = updatedData.shipping || {};
        if (shipping.first_name || shipping.last_name || shipping.address_1) {
          payload.shipping = shipping;
        }

        // ✅ הוסף payment_method רק אם לא ריק
        if (updatedData.payment_method && updatedData.payment_method.trim()) {
          payload.payment_method = updatedData.payment_method;
          if (
            updatedData.payment_method_title &&
            updatedData.payment_method_title.trim()
          ) {
            payload.payment_method_title = updatedData.payment_method_title;
          }
        }

        // ✅ הוסף customer_note רק אם לא ריק
        if (updatedData.customer_note && updatedData.customer_note.trim()) {
          payload.customer_note = updatedData.customer_note;
        }

        // ✅ שאר השדות האופציונליים
        if (updatedData.customer_id) {
          payload.customer_id = Number(updatedData.customer_id);
        }

        if (updatedData.date_created) {
          payload.date_created = updatedData.date_created;
        }

        if (updatedData.set_paid !== undefined) {
          payload.set_paid = Boolean(updatedData.set_paid);
        }

        if (updatedData.transaction_id && updatedData.transaction_id.trim()) {
          payload.transaction_id = String(updatedData.transaction_id);
        }

  

        // endpoint ליצירת הזמנה חדשה
        const endpoint = `${window.siteUrl}/wp-json/wc/v3/orders`;
        const response = await postApi(endpoint, payload);
        const newItem = response.data;


        // ✅ עדכון השורה הזמנית עם ההזמנה החדשה
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
          console.warn("Could not update store after order creation");
        }

        toast.success(__("Order created successfully", "whizmanage"));
        return true;
      } catch (error) {
        console.error("Failed to create order:", error);
        console.error("Error response:", error?.response?.data);
        toast.error(__("Failed to create order", "whizmanage"), {
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

  const base = [
    // order
    columnHelper.accessor(
      (row) => ({
        id: row?.id,
        first: row?.billing?.first_name || "",
        last: row?.billing?.last_name || "",
      }),
      {
        id: "order",
        header: __("Order", "whizmanage"),
        size: 220,
        minSize: 160,
        filterFn: columnFilterFn,
        meta: {
          editable: false,
          displayFormat: {
            formatValue: (v) => {
              if (!v) return "—";
              const name = `${v.first || ""} ${v.last || ""}`.trim();
              return `${name}${name ? " " : ""}#${v.id ?? ""}`.trim();
            },
          },
        },
        cell: (props) => (
          <div title={`#${props.row.original?.id}`} className="truncate">
            {props.column.columnDef.meta?.displayFormat?.formatValue(
              props.getValue()
            )}
          </div>
        ),
      }
    ),

    // ——— Order summary (modal trigger) ———
    columnHelper.display({
      id: "order_summary",
      header: __("Order Summary", "whizmanage"),
      size: 150,
      minSize: 100,
      cell: (props) => {
        const row = props.row.original;
        const name =
          `${row?.billing?.first_name ?? ""} ${row?.billing?.last_name ?? ""}`.trim() ||
          `#${row?.id ?? ""}`;
        return (
          <OrderSummaryModal
            row={row}
            asChild
            triggerClassName="cursor-pointer"
          >
            <div className="w-full h-full px-3 py-2 flex items-center gap-2 ">
              <FileText className="size-4 shrink-0" />
              <span className="truncate">{name}</span>
            </div>
          </OrderSummaryModal>
        );
      },
    }),

    // status
    columnHelper.accessor("status", {
      id: "status",
      header: __("Status", "whizmanage"),
      size: 140,
      minSize: 120,
      filterFn: columnFilterFn,
      meta: {
        editable: true,
        editType: "select",
        customDisplayComponent: StatusDisplay,
        customEditComponent: StatusEdit,
        editOptions: {
          statusKeys: ORDER_STATUS_KEYS,
          options: Object.keys(ORDER_STATUS_KEYS).map((k) => ({
            value: k,
            label: __(k, "whizmanage"),
          })),
        },
      },
      cell: (props) => <EditableCell {...props} onUpdate={onUpdate} />,
    }),

    // total
    columnHelper.accessor("total", {
      id: "total",
      header: __("Total", "whizmanage"),
      size: 120,
      minSize: 110,
      meta: {
        editable: false,
        displayFormat: {
          formatValue: (v) =>
            v != null && v !== "" ? formatValue(v, "currency") : "",
        },
      },
      cell: (props) => <EditableCell {...props} onUpdate={onUpdate} />,
    }),

    // customer_note
    columnHelper.accessor("customer_note", {
      id: "customer_note",
      header: __("Customer note", "whizmanage"),
      size: 220,
      minSize: 180,
      meta: {
        editable: true,
        editType: "text",
        editOptions: { placeholder: __("Add a note for the order", "whizmanage") },
        displayFormat: {
          formatValue: (v) => {
            if (!v) return "";
            const s = String(v);
            return s.length > 160 ? `${s.slice(0, 160)}…` : s;
          },
        },
      },
      cell: (props) => <EditableCell {...props} onUpdate={onUpdate} />,
    }),

    // ——— Source ———
    columnHelper.display({
      id: "source",
      header: __("Source", "whizmanage"),
      size: 170,
      minSize: 140,
      cell: ({ row }) => <OrderSourceBadge row={row.original} __={__} />,
    }),

    // ========== PAYMENT METHOD ==========
    columnHelper.accessor("payment_method", {
      id: "payment_method",
      header: __("Payment method", "whizmanage"),
      size: 190,
      minSize: 150,
      filterFn: columnFilterFn,
      meta: {
        editable: true,
        editType: "select",
        editOptions: { options: paymentOptions(__) },
        displayFormat: {
          formatValue: (_v, row) => row?.payment_method_title || _v || "—",
        },
      },
      cell: (props) => (
        <PaymentMethodCell {...props} __={__} handleUpdate={onUpdate} />
      ),
    }),

    // date_created_gmt
    columnHelper.accessor("date_created_gmt", {
      id: "date_created_gmt",
      header: __("Date", "whizmanage"),
      size: 180,
      minSize: 160,
      meta: {
        editable: true,
        editType: "date",
        displayFormat: { formatValue: (v) => fmtDateTime(v) },
      },
      cell: (props) => <EditableCell {...props} onUpdate={onUpdate} />,
    }),

    // date_modified_gmt
    columnHelper.accessor("date_modified_gmt", {
      id: "date_modified_gmt",
      header: __("Date modified", "whizmanage"),
      size: 180,
      minSize: 160,
      meta: {
        editable: false,
        displayFormat: { formatValue: (v) => fmtDateTime(v) },
      },
      cell: (props) => <EditableCell {...props} onUpdate={onUpdate} />,
    }),

    // total_tax
    columnHelper.accessor("total_tax", {
      id: "total_tax",
      header: __("Tax", "whizmanage"),
      size: 120,
      minSize: 110,
      meta: {
        editable: false,
        displayFormat: {
          formatValue: (v) =>
            v != null && v !== "" ? formatValue(v, "currency") : "",
        },
      },
      cell: (props) => <EditableCell {...props} onUpdate={onUpdate} />,
    }),

    // ========== LINE ITEMS (Modal) ==========
    columnHelper.display({
      id: "line_items",
      header: __("Items", "whizmanage"),
      size: 220,
      minSize: 180,
      cell: (props) => {
        const row = props.row.original;
        const items = Array.isArray(row?.line_items) ? row.line_items : [];
        const count = items.reduce(
          (acc, it) => acc + Number(it?.quantity ?? 0),
          0
        );
        const totalLabel =
          row?.total != null ? formatValue(row.total, "currency") : "—";
        const isNewRow = row?._isNew === true;
        const [modalOpen, setModalOpen] = React.useState(false);

        // 🔒 חסימה עבור Free users
        const noLicence = typeof window !== "undefined" && window.hasLicence === false;

        // ✅ רישום הפונקציה לפתיחת המודל עבור שורות חדשות
        React.useEffect(() => {
          if (isNewRow && items.length === 0 && !noLicence) {
            registerNewOrderHandler(row.id, () => setModalOpen(true));
          }
        }, [isNewRow, row.id, items.length, noLicence]);

        const tooltip = (
          <div className="text-xs space-y-1">
            {items.slice(0, 8).map((it, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <span className="truncate max-w-[220px]">
                  {it?.name || it?.product_id || "#"}
                </span>
                <span className="shrink-0">×{it?.quantity ?? 0}</span>
              </div>
            ))}
            {items.length > 8 ? (
              <div className="text-muted-foreground">
                {__("+{{n}} more", { n: items.length - 8 })}
              </div>
            ) : null}
          </div>
        );

        // 🔒 אם אין רישיון - הצג תצוגה נעולה
        if (noLicence) {
          return (
            <CustomTooltip
              title={__("Pro feature", "whizmanage")}
              description={__("Upgrade to Pro to edit order items", "whizmanage")}
            >
              <div className="relative w-full h-full px-3 py-2 flex items-center gap-2 opacity-50 cursor-not-allowed">
                <Package className="size-4 shrink-0" />
                <span className="truncate text-sm">
                  {`${count} ${__("items", "whizmanage")} • ${totalLabel}`}
                </span>
                <div className="absolute -top-1 -right-1 scale-75">
                  <ProBadge />
                </div>
              </div>
            </CustomTooltip>
          );
        }

        return (
          <OrderItemsModal
            row={row}
            onUpdate={onUpdate}
            open={modalOpen}
            onOpenChange={setModalOpen}
            asChild
            triggerClassName="cursor-pointer"
          >
            <div
              className={`w-full h-full px-3 py-2 flex items-center gap-2 ${
                isNewRow && items.length === 0 ? "ring-2 ring-fuchsia-500" : ""
              }`}
            >
              <Package className="size-4 shrink-0" />
              <CustomTooltip
                title={__("Items", "whizmanage")}
                description={tooltip}
                contentClassName="max-w-[360px] w-fit max-h-96 overflow-auto scrollbar-whiz p-3 rounded-md shadow-md border text-xs bg-white dark:bg-gray-800"
              >
                <span className="truncate text-sm">
                  {isNewRow && items.length === 0
                    ? __("⚠️ Click to add products", "whizmanage")
                    : `${count} ${__("items", "whizmanage")} • ${totalLabel}`}
                </span>
              </CustomTooltip>
            </div>
          </OrderItemsModal>
        );
      },
    }),

    // ----- Billing -----
    columnHelper.display({
      id: "billing",
      header: __("Billing", "whizmanage"),
      size: 150,
      minSize: 150,
      maxSize: 200,
      cell: (props) => {
        const row = props.row.original;
        const b = row?.billing || {};
        const hasBilling =
          b.first_name ||
          b.last_name ||
          b.address_1 ||
          b.city ||
          b.country ||
          b.email;
        const label = hasBilling
          ? `${b.first_name || ""} ${b.last_name || ""}`.trim() ||
            `#${row?.id ?? ""}`
          : __("No details", "whizmanage");

        return (
          <OrderBillingModal
            row={row}
            onUpdate={onUpdate}
            table={props.table}
            asChild
            triggerClassName="cursor-pointer"
          >
            <div
              className={`w-full h-full px-3 py-2 flex items-center gap-2 ${!hasBilling ? "text-muted-foreground" : ""}`}
            >
              <User
                className={`size-4 shrink-0 ${!hasBilling ? "text-muted-foreground" : ""}`}
              />
              <span className={`truncate ${!hasBilling ? "italic" : ""}`}>
                {label}
              </span>
            </div>
          </OrderBillingModal>
        );
      },
    }),

    columnHelper.accessor((row) => row?.billing?.email || "", {
      id: "billing_email",
      header: __("Billing Email", "whizmanage"),
      size: 200,
      minSize: 160,
      filterFn: columnFilterFn,
      meta: { editable: true, editType: "text" },
      cell: (props) => (
        <EditableCell
          {...props}
          onUpdate={(id, _c, value, rowData, isFromHistory) => {
            const patch = { ...rowData.billing, email: value };
            return onUpdate(id, "billing", patch, rowData, isFromHistory);
          }}
        />
      ),
    }),

    columnHelper.accessor((row) => row?.billing?.phone || "", {
      id: "billing_phone",
      header: __("Billing Phone", "whizmanage"),
      size: 160,
      minSize: 140,
      filterFn: columnFilterFn,
      meta: { editable: true, editType: "text" },
      cell: (props) => (
        <EditableCell
          {...props}
          onUpdate={(id, _c, value, rowData, isFromHistory) => {
            const patch = { ...rowData.billing, phone: value };
            return onUpdate(id, "billing", patch, rowData, isFromHistory);
          }}
        />
      ),
    }),

    columnHelper.accessor(
      (row) => {
        const b = row?.billing || {};
        return `${b.first_name || ""} ${b.last_name || ""}`.trim();
      },
      {
        id: "billing_name",
        header: __("Billing Name", "whizmanage"),
        size: 200,
        minSize: 160,
        filterFn: columnFilterFn,
        meta: { editable: true, editType: "text" },
        cell: (props) => (
          <EditableCell
            {...props}
            onUpdate={(id, _c, value, rowData, isFromHistory) => {
              const [first, ...rest] = String(value || "").split(" ");
              const last = rest.join(" ");
              const patch = {
                ...rowData.billing,
                first_name: first,
                last_name: last,
              };
              return onUpdate(id, "billing", patch, rowData, isFromHistory);
            }}
          />
        ),
      }
    ),

    columnHelper.accessor((row) => row?.billing?.company || "", {
      id: "billing_company",
      header: __("Billing Company", "whizmanage"),
      size: 180,
      minSize: 150,
      filterFn: columnFilterFn,
      meta: { editable: true, editType: "text" },
      cell: (props) => (
        <EditableCell
          {...props}
          onUpdate={(id, _c, value, rowData, isFromHistory) => {
            const patch = { ...rowData.billing, company: value };
            return onUpdate(id, "billing", patch, rowData, isFromHistory);
          }}
        />
      ),
    }),

    columnHelper.accessor((row) => row?.billing?.city || "", {
      id: "billing_city",
      header: __("Billing City", "whizmanage"),
      size: 160,
      minSize: 140,
      filterFn: columnFilterFn,
      meta: { editable: true, editType: "text" },
      cell: (props) => (
        <EditableCell
          {...props}
          onUpdate={(id, _c, value, rowData, isFromHistory) => {
            const patch = { ...rowData.billing, city: value };
            return onUpdate(id, "billing", patch, rowData, isFromHistory);
          }}
        />
      ),
    }),

    columnHelper.accessor((row) => row?.billing?.country || "", {
      id: "billing_country",
      header: __("Billing Country", "whizmanage"),
      size: 160,
      minSize: 140,
      filterFn: columnFilterFn,
      meta: { editable: true, editType: "text" },
      cell: (props) => (
        <EditableCell
          {...props}
          onUpdate={(id, _c, value, rowData, isFromHistory) => {
            const patch = { ...rowData.billing, country: value };
            return onUpdate(id, "billing", patch, rowData, isFromHistory);
          }}
        />
      ),
    }),

    columnHelper.accessor((row) => row?.billing?.postcode || "", {
      id: "billing_postcode",
      header: __("Billing Postcode", "whizmanage"),
      size: 160,
      minSize: 140,
      filterFn: columnFilterFn,
      meta: { editable: true, editType: "text" },
      cell: (props) => (
        <EditableCell
          {...props}
          onUpdate={(id, _c, value, rowData, isFromHistory) => {
            const patch = { ...rowData.billing, postcode: value };
            return onUpdate(id, "billing", patch, rowData, isFromHistory);
          }}
        />
      ),
    }),

    columnHelper.accessor((row) => row?.billing?.address_1 || "", {
      id: "billing_address_1",
      header: __("Billing Address 1", "whizmanage"),
      size: 200,
      minSize: 170,
      filterFn: columnFilterFn,
      meta: { editable: true, editType: "text" },
      cell: (props) => (
        <EditableCell
          {...props}
          onUpdate={(id, _c, value, rowData, isFromHistory) => {
            const patch = { ...rowData.billing, address_1: value };
            return onUpdate(id, "billing", patch, rowData, isFromHistory);
          }}
        />
      ),
    }),

    columnHelper.accessor((row) => row?.billing?.address_2 || "", {
      id: "billing_address_2",
      header: __("Billing Address 2", "whizmanage"),
      size: 200,
      minSize: 170,
      filterFn: columnFilterFn,
      meta: { editable: true, editType: "text" },
      cell: (props) => (
        <EditableCell
          {...props}
          onUpdate={(id, _c, value, rowData, isFromHistory) => {
            const patch = { ...rowData.billing, address_2: value };
            return onUpdate(id, "billing", patch, rowData, isFromHistory);
          }}
        />
      ),
    }),

    // ----- Shipping -----
    columnHelper.display({
      id: "shipping",
      header: __("Shipping", "whizmanage"),
      size: 150,
      minSize: 150,
      maxSize: 200,
      cell: (props) => {
        const row = props.row.original;
        const s = row?.shipping || {};
        const hasShipping =
          s.first_name || s.last_name || s.address_1 || s.city || s.country;
        const label = hasShipping
          ? `${s.first_name || ""} ${s.last_name || ""}`.trim() ||
            `#${row?.id ?? ""}`
          : __("No details", "whizmanage");

        return (
          <OrderShippingModal
            row={row}
            onUpdate={onUpdate}
            table={props.table}
            asChild
            triggerClassName="cursor-pointer"
          >
            <div
              className={`w-full h-full px-3 py-2 flex items-center gap-2 ${!hasShipping ? "text-muted-foreground" : ""}`}
            >
              <Truck
                className={`size-4 shrink-0 ${!hasShipping ? "text-muted-foreground" : ""}`}
              />
              <span className={`truncate ${!hasShipping ? "italic" : ""}`}>
                {label}
              </span>
            </div>
          </OrderShippingModal>
        );
      },
    }),

    columnHelper.accessor((row) => row?.shipping?.phone || "", {
      id: "shipping_phone",
      header: __("Shipping Phone", "whizmanage"),
      size: 160,
      minSize: 140,
      filterFn: columnFilterFn,
      meta: { editable: true, editType: "text" },
      cell: (props) => (
        <EditableCell
          {...props}
          onUpdate={(id, _c, value, rowData, isFromHistory) => {
            const patch = { ...rowData.shipping, phone: value };
            return onUpdate(id, "shipping", patch, rowData, isFromHistory);
          }}
        />
      ),
    }),

    columnHelper.accessor(
      (row) => {
        const s = row?.shipping || {};
        return `${s.first_name || ""} ${s.last_name || ""}`.trim();
      },
      {
        id: "shipping_name",
        header: __("Shipping Name", "whizmanage"),
        size: 200,
        minSize: 160,
        filterFn: columnFilterFn,
        meta: { editable: true, editType: "text" },
        cell: (props) => (
          <EditableCell
            {...props}
            onUpdate={(id, _c, value, rowData, isFromHistory) => {
              const [first, ...rest] = String(value || "").split(" ");
              const last = rest.join(" ");
              const patch = {
                ...rowData.shipping,
                first_name: first,
                last_name: last,
              };
              return onUpdate(id, "shipping", patch, rowData, isFromHistory);
            }}
          />
        ),
      }
    ),

    columnHelper.accessor((row) => row?.shipping?.company || "", {
      id: "shipping_company",
      header: __("Shipping Company", "whizmanage"),
      size: 180,
      minSize: 150,
      filterFn: columnFilterFn,
      meta: { editable: true, editType: "text" },
      cell: (props) => (
        <EditableCell
          {...props}
          onUpdate={(id, _c, value, rowData, isFromHistory) => {
            const patch = { ...rowData.shipping, company: value };
            return onUpdate(id, "shipping", patch, rowData, isFromHistory);
          }}
        />
      ),
    }),

    columnHelper.accessor((row) => row?.shipping?.city || "", {
      id: "shipping_city",
      header: __("Shipping City", "whizmanage"),
      size: 160,
      minSize: 140,
      filterFn: columnFilterFn,
      meta: { editable: true, editType: "text" },
      cell: (props) => (
        <EditableCell
          {...props}
          onUpdate={(id, _c, value, rowData, isFromHistory) => {
            const patch = { ...rowData.shipping, city: value };
            return onUpdate(id, "shipping", patch, rowData, isFromHistory);
          }}
        />
      ),
    }),

    columnHelper.accessor((row) => row?.shipping?.country || "", {
      id: "shipping_country",
      header: __("Shipping Country", "whizmanage"),
      size: 160,
      minSize: 140,
      filterFn: columnFilterFn,
      meta: { editable: true, editType: "text" },
      cell: (props) => (
        <EditableCell
          {...props}
          onUpdate={(id, _c, value, rowData, isFromHistory) => {
            const patch = { ...rowData.shipping, country: value };
            return onUpdate(id, "shipping", patch, rowData, isFromHistory);
          }}
        />
      ),
    }),

    columnHelper.accessor((row) => row?.shipping?.postcode || "", {
      id: "shipping_postcode",
      header: __("Shipping Postcode", "whizmanage"),
      size: 160,
      minSize: 140,
      filterFn: columnFilterFn,
      meta: { editable: true, editType: "text" },
      cell: (props) => (
        <EditableCell
          {...props}
          onUpdate={(id, _c, value, rowData, isFromHistory) => {
            const patch = { ...rowData.shipping, postcode: value };
            return onUpdate(id, "shipping", patch, rowData, isFromHistory);
          }}
        />
      ),
    }),

    columnHelper.accessor((row) => row?.shipping?.address_1 || "", {
      id: "shipping_address_1",
      header: __("Shipping Address 1", "whizmanage"),
      size: 200,
      minSize: 170,
      filterFn: columnFilterFn,
      meta: { editable: true, editType: "text" },
      cell: (props) => (
        <EditableCell
          {...props}
          onUpdate={(id, _c, value, rowData, isFromHistory) => {
            const patch = { ...rowData.shipping, address_1: value };
            return onUpdate(id, "shipping", patch, rowData, isFromHistory);
          }}
        />
      ),
    }),

    columnHelper.accessor((row) => row?.shipping?.address_2 || "", {
      id: "shipping_address_2",
      header: __("Shipping Address 2", "whizmanage"),
      size: 200,
      minSize: 170,
      filterFn: columnFilterFn,
      meta: { editable: true, editType: "text" },
      cell: (props) => (
        <EditableCell
          {...props}
          onUpdate={(id, _c, value, rowData, isFromHistory) => {
            const patch = { ...rowData.shipping, address_2: value };
            return onUpdate(id, "shipping", patch, rowData, isFromHistory);
          }}
        />
      ),
    }),

    // version
    columnHelper.accessor("version", {
      id: "version",
      header: __("Version", "whizmanage"),
      size: 120,
      minSize: 100,
      meta: { editable: false },
      cell: (props) => <EditableCell {...props} onUpdate={onUpdate} />,
    }),

    columnHelper.display({
      id: "note",
      header: __("Notes", "whizmanage"),
      size: 170,
      minSize: 150,
      cell: (props) => <OrderNotesChat row={props.row.original} />,
    }),

    // created_via
    columnHelper.accessor("created_via", {
      id: "created_via",
      header: __("Created via", "whizmanage"),
      size: 140,
      minSize: 120,
      meta: { editable: false },
      cell: (props) => <EditableCell {...props} onUpdate={onUpdate} />,
    }),

    // is_vat_exempt
    columnHelper.accessor(
      (row) => {
        const raw = row?.is_vat_exempt ?? getMeta(row, "is_vat_exempt");
        const norm = String(raw ?? "").toLowerCase();
        return norm === "1" || norm === "true" || norm === "yes";
      },
      {
        id: "is_vat_exempt",
        header: __("VAT exempt", "whizmanage"),
        size: 140,
        minSize: 120,
        filterFn: columnFilterFn,
        meta: {
          editable: true,
          editType: "select",
          editOptions: {
            options: [
              { value: "true", label: __("Yes", "whizmanage") },
              { value: "false", label: __("No", "whizmanage") },
            ],
          },
          displayFormat: {
            formatValue: (v) => (v ? __("Yes", "whizmanage") : __("No", "whizmanage")),
          },
        },
        cell: (props) => (
          <EditableCell
            {...props}
            onUpdate={(id, _c, value, rowData, isFromHistory) => {
              const bool =
                String(value).toLowerCase() === "true" || value === true;
              return onUpdate(
                id,
                "is_vat_exempt",
                bool ? "yes" : "no",
                rowData,
                isFromHistory
              );
            }}
          />
        ),
      }
    ),
  ];

  // Append dynamic custom meta columns
  const existingIds = new Set(
    base.map((c) => (c?.id ? String(c.id) : undefined)).filter(Boolean)
  );
  const customMetaColumns = createCustomMetaColumns(__, onUpdate).filter(
    (col) => col?.id && !existingIds.has(String(col.id))
  );

  return [...base, ...customMetaColumns];
};

// Generic alias
export { createOrdersColumns as createEntityColumns };
