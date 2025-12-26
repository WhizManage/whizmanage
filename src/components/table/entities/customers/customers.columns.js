// src/components/table/entities/customers/customers.columns.js
import { createColumnHelper } from "@tanstack/react-table";
import { EditableCell } from "@components/table/core/EditableCell.jsx";
import { columnFilterFn } from "@components/table/filters/ColumnFilter.jsx";
import { formatValue } from "../../../../utils/formatValue.js";
import CustomerOrdersPopover from "./components/CustomerOrdersPopover.jsx";

const columnHelper = createColumnHelper();

export const createCustomersColumns = (store, __, handleCellUpdate) => {
  const baseColumns = [
    // --- Email ---
    columnHelper.accessor("email", {
      header: __("Email", "whizmanage"),
      size: 220,
      minSize: 160,
      filterFn: columnFilterFn,
      meta: {
        editable: true,
        editType: "text",
        editOptions: { placeholder: "customer@example.com" },
        validationRules: [
          { pattern: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", message: __("Invalid email address", "whizmanage") },
        ],
      },
      cell: (props) => <EditableCell {...props} onUpdate={handleCellUpdate} />,
    }),

    // --- First name ---
    columnHelper.accessor("first_name", {
      header: __("First name", "whizmanage"),
      size: 150,
      minSize: 120,
      meta: { editable: true, editType: "text", editOptions: { placeholder: __("First name", "whizmanage") } },
      filterFn: columnFilterFn,
      cell: (props) => <EditableCell {...props} onUpdate={handleCellUpdate} />,
    }),

    // --- Last name ---
    columnHelper.accessor("last_name", {
      header: __("Last name", "whizmanage"),
      size: 150,
      minSize: 120,
      meta: { editable: true, editType: "text", editOptions: { placeholder: __("Last name", "whizmanage") } },
      filterFn: columnFilterFn,
      cell: (props) => <EditableCell {...props} onUpdate={handleCellUpdate} />,
    }),

    // --- Username ---
    columnHelper.accessor("username", {
      header: __("Username", "whizmanage"),
      size: 160,
      minSize: 130,
      meta: { editable: false },
      filterFn: columnFilterFn,
      cell: (props) => <EditableCell {...props} onUpdate={handleCellUpdate} />,
    }),

    // --- Role (read-only, no filter) ---
    columnHelper.accessor("role", {
      header: __("Role", "whizmanage"),
      size: 140,
      minSize: 120,
      // בלי filterFn, ו- editable=false
      meta: { editable: false },
      cell: (props) => {
        const v = String(props.getValue() ?? "").toLowerCase();
        if (v === "customer" || v === "") return __("Customer", "whizmanage");
        if (v === "subscriber") return __("Subscriber", "whizmanage");
        return v; // fallback טכני אם יש משהו חריג
      },
    }),

    // --- Orders count ---
    columnHelper.accessor("orders_count", {
      header: __("Orders", "whizmanage"),
      size: 100,
      minSize: 80,
      filterFn: columnFilterFn,
      cell: (props) => (
        <CustomerOrdersPopover
          ordersCount={props.getValue() ?? 0}
          orders={props.row.original.orders ?? []}
          customerId={props.row.original.id}
        />
      ),
    }),

    // --- Total spent ---
    columnHelper.accessor("total_spent", {
      header: __("Total spent", "whizmanage"),
      size: 140,
      minSize: 120,
      meta: { editable: false },
      filterFn: columnFilterFn,
      cell: (props) => formatValue(props.getValue() ?? 0, "currency"),
    }),

    // --- Billing phone ---
    columnHelper.accessor("billing_phone", {
      header: __("Phone", "whizmanage"),
      size: 150,
      minSize: 120,
      meta: { editable: true, editType: "text", editOptions: { placeholder: __("Phone", "whizmanage") } },
      filterFn: columnFilterFn,
      cell: (props) => <EditableCell {...props} onUpdate={handleCellUpdate} />,
    }),

    // --- Billing city ---
    columnHelper.accessor("billing_city", {
      header: __("City", "whizmanage"),
      size: 150,
      minSize: 120,
      meta: { editable: true, editType: "text", editOptions: { placeholder: __("City", "whizmanage") } },
      filterFn: columnFilterFn,
      cell: (props) => <EditableCell {...props} onUpdate={handleCellUpdate} />,
    }),

    // --- Billing country ---
    columnHelper.accessor("billing_country", {
      header: __("Country", "whizmanage"),
      size: 140,
      minSize: 120,
      meta: { editable: true, editType: "text", editOptions: { placeholder: __("Country code (e.g. IL)", "whizmanage") } },
      filterFn: columnFilterFn,
      cell: (props) => <EditableCell {...props} onUpdate={handleCellUpdate} />,
    }),

    // --- Billing postcode ---
    columnHelper.accessor("billing_postcode", {
      header: __("Postcode", "whizmanage"),
      size: 120,
      minSize: 100,
      meta: { editable: true, editType: "text", editOptions: { placeholder: __("Postcode", "whizmanage") } },
      filterFn: columnFilterFn,
      cell: (props) => <EditableCell {...props} onUpdate={handleCellUpdate} />,
    }),

    // --- Is paying customer ---
    columnHelper.accessor("is_paying_customer", {
      header: __("Paying?", "whizmanage"),
      size: 110,
      minSize: 90,
      cell: (props) => (props.getValue() ? __("Yes", "whizmanage") : __("No", "whizmanage")),
      filterFn: columnFilterFn,
    }),

    // --- Date created ---
    columnHelper.accessor("date_created", {
      header: __("Created at", "whizmanage"),
      size: 180,
      minSize: 160,
      meta: { editable: false },
      filterFn: columnFilterFn,
      cell: (props) => {
        const v = props.getValue();
        if (!v) return <span className="text-muted-foreground">—</span>;
        const d = new Date(v);
        if (isNaN(d.getTime())) return v;
        return d.toLocaleString("he-IL", {
          year: "numeric", month: "2-digit", day: "2-digit",
          hour: "2-digit", minute: "2-digit",
        });
      },
    }),

    // --- Date modified ---
    columnHelper.accessor("date_modified", {
      header: __("Updated at", "whizmanage"),
      size: 180,
      minSize: 160,
      meta: { editable: false },
      filterFn: columnFilterFn,
      cell: (props) => {
        const v = props.getValue();
        if (!v) return <span className="text-muted-foreground">—</span>;
        const d = new Date(v);
        if (isNaN(d.getTime())) return v;
        return d.toLocaleString("he-IL", {
          year: "numeric", month: "2-digit", day: "2-digit",
          hour: "2-digit", minute: "2-digit",
        });
      },
    }),
  ];

  return baseColumns;
};

// alias גנרי
export { createCustomersColumns as createEntityColumns };
