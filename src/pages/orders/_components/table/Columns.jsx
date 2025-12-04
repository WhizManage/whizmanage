import CustomTooltip from "@components/nextUI/Tooltip";
import Button from "@components/ui/button";
import { Checkbox } from "@components/ui/checkbox";
import { Input } from "@components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select";
import { Textarea } from "@components/ui/textarea";
import { Avatar, DatePicker, Image, Tooltip } from "@heroui/react";
import { parseDateTime } from "@internationalized/date";
import { formatDistanceToNow } from "date-fns";
import { enUS, he } from "date-fns/locale";
import { __ } from '@wordpress/i18n';
import {
  Calendar,
  ChevronsRight,
  Code,
  Copy,
  CreditCardIcon,
  Database,
  DollarSignIcon,
  ExternalLink,
  FileText,
  LandmarkIcon,
  Link,
  Mail,
  Package,
  Phone,
  SmartphoneIcon,
  WalletIcon,
} from "lucide-react";
import { useState } from "react";
import { OrderStatusKeys } from "../../../../data/statusKeys";
import { columnFilterFn } from "../header/ColumnFilter";
import { DataTableColumnHeader } from "./DataTableColumnHeader";
import BillingEdit from "./edit/BillingEdit";
import OrderNotesChat from "./edit/OrderNotesChat";
import ShippingEdit from "./edit/ShippingEdit";
import EditableItemsCell from "./EditableItemsCell";
import OrderSummaryModal from "./OrderSummaryModal";
import OrderActions from "./OrderActions";
import { cn } from "@/lib/utils";

// Helper function (assuming it's available or defined elsewhere)
export const HTMLToText = (textHtml) => {
  if (typeof window === "undefined" || !textHtml) return textHtml || ""; // Basic SSR/null check
  try {
    const parser = new DOMParser();
    const htmlString = textHtml?.toString();
    const doc = parser.parseFromString(htmlString, "text/html");
    return doc.body.textContent || "";
  } catch (e) {
    console.error("Error parsing HTML:", e);
    return textHtml?.toString() || ""; // Fallback
  }
};
// Fetch column sizes (similar to coupons)
// Make sure 'orders_columns_width' corresponds to your configuration name
const columnSizes =
  window.getWhizmanage?.find((column) => column.name === "orders_columns_width")
    ?.reservedData || null;

const createCustomField = (custom, index) => ({
  accessorKey: custom,
  header: ({ column }) => (
    <DataTableColumnHeader column={column} title={custom} className="mr-1" />
  ),
  cell: ({ row }) => {
    const match = row.original.meta_data?.find(
      (metaProduct) => metaProduct.key === custom
    );

    const value = match?.value;

    const renderValue = () => {
      if (!value || value === "") {
        return <span className="text-gray-400 italic">—</span>;
      }

      // אם זה תמונה (סיומת jpg/png/webp/svg וכו')
      if (
        typeof value === "string" &&
        value.match(/\.(jpeg|jpg|png|webp|gif|svg)$/i)
      ) {
        return (
          <Tooltip
            className="p-0 m-0"
            placement={window.user_local == "he_IL" ? "left" : "right"}
            content={
              <Image width={200} height={200} alt={custom} src={value} />
            }
          >
            <Avatar src={value} radius="sm" />
          </Tooltip>
        );
      }

      // אם זה PDF
      if (typeof value === "string" && value.match(/\.pdf$/i)) {
        return (
          <Button
            onClick={() => window.open(value, "_blank", "noopener,noreferrer")}
            variant="outline"
            size="sm"
            className="mr-2 rtl:ml-2 rtl:mr-0 !h-8 flex gap-2 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-900/20 transition-all duration-200"
          >
            <div className="relative">
              <FileText className="size-4" />
              <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-fuchsia-500 rounded-full"></div>
            </div>
            <span>PDF</span>
            <ExternalLink className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Button>
        );
      }

      // אם זה קובץ אחר (doc, docx, xls, xlsx, txt, zip וכו')
      if (
        typeof value === "string" &&
        value.match(/\.(doc|docx|xls|xlsx|txt|zip|rar|csv|ppt|pptx)$/i)
      ) {
        const getFileIcon = (extension) => {
          const ext = extension.toLowerCase();
          if (["doc", "docx"].includes(ext))
            return { icon: FileText, color: "blue" };
          if (["xls", "xlsx", "csv"].includes(ext))
            return { icon: Database, color: "green" };
          if (["ppt", "pptx"].includes(ext))
            return { icon: FileText, color: "orange" };
          if (["zip", "rar"].includes(ext))
            return { icon: FileText, color: "purple" };
          return { icon: FileText, color: "gray" };
        };

        const extension = value.split(".").pop();
        const { icon: Icon, color } = getFileIcon(extension);

        return (
          <Button
            onClick={() => window.open(value, "_blank", "noopener,noreferrer")}
            variant="outline"
            size="sm"
            className="mr-2 rtl:ml-2 rtl:mr-0 !h-8 flex gap-2 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-900/20 transition-all duration-200"
          >
            <div className="relative">
              <Icon className="size-4" />
              <div
                className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-${color}-500 rounded-full`}
              ></div>
            </div>
            <span className="uppercase text-xs font-medium">{extension}</span>
            <ExternalLink className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Button>
        );
      }

      // אם זה אימייל
      if (
        typeof value === "string" &&
        value.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
      ) {
        return (
          <div className="flex items-center gap-2">
            <Mail className="size-4 text-fuchsia-500" />
            <a
              href={`mailto:${value}`}
              className="text-fuchsia-600 hover:text-fuchsia-700 dark:text-fuchsia-400 dark:hover:text-fuchsia-300 underline transition-colors"
            >
              {value}
            </a>
          </div>
        );
      }

      // אם זה טלפון
      if (typeof value === "string" && value.match(/^[\+]?[\d\s\-\(\)]{7,}$/)) {
        return (
          <div className="flex items-center gap-2">
            <Phone className="size-4 text-fuchsia-500" />
            <a
              href={`tel:${value}`}
              className="text-fuchsia-600 hover:text-fuchsia-700 dark:text-fuchsia-400 dark:hover:text-fuchsia-300 underline transition-colors"
            >
              {value}
            </a>
          </div>
        );
      }

      // אם זה תאריך (ISO format או תאריכים נפוצים)
      if (
        typeof value === "string" &&
        (value.match(/^\d{4}-\d{2}-\d{2}/) || Date.parse(value))
      ) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return (
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-fuchsia-500" />
              <span className="text-slate-700 dark:text-slate-300">
                {date.toLocaleDateString()}
              </span>
            </div>
          );
        }
      }

      // אם זה מספר עם מטבע (מתחיל ב$ או € או ₪)
      if (typeof value === "string" && value.match(/^[\$€₪£¥]\d+/)) {
        return (
          <div className="flex items-center gap-2">
            <DollarSign className="size-4 text-green-500" />
            <span className="text-green-700 dark:text-green-300 font-medium">
              {value}
            </span>
          </div>
        );
      }

      // אם זה מספר ID או קוד (רק מספרים או מספרים עם מקפים)
      if (typeof value === "string" && value.match(/^[\d\-_#]+$/)) {
        return (
          <div
            className="group relative cursor-pointer flex items-center gap-0.5 transition-opacity duration-200 font-mono text-sm"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(value);
                // אתה יכול להוסיף כאן notification של העתקה מוצלחת
              } catch (err) {
                console.error("Failed to copy text: ", err);
              }
            }}
          >
            <span className="flex-1 select-none">{value}</span>
            <Copy className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          </div>
        );
      }

      // אם זה URL כללי
      if (typeof value === "string" && value.startsWith("http")) {
        return (
          <Button
            onClick={() => window.open(value, "_blank", "noopener,noreferrer")}
            variant="outline"
            size="sm"
            className="mr-2 rtl:ml-2 rtl:mr-0 !h-8 flex gap-2 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-900/20 transition-all duration-200"
          >
            <Link className="size-4" />
            <span className="truncate max-w-[100px]">
              {value.replace(/^https?:\/\//, "").split("/")[0]}
            </span>
            <ExternalLink className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Button>
        );
      }

      // אם זה מערך
      if (Array.isArray(value)) {
        return (
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <Code className="size-4 text-fuchsia-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Array ({value.length} items)
              </span>
            </div>
            <pre className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words max-h-24 overflow-y-auto">
              {JSON.stringify(value, null, 2)}
            </pre>
          </div>
        );
      }

      // אם זה אובייקט
      if (typeof value === "object") {
        return (
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <Database className="size-4 text-fuchsia-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Object ({Object.keys(value).length} keys)
              </span>
            </div>
            <pre className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words max-h-24 overflow-y-auto">
              {JSON.stringify(value, null, 2)}
            </pre>
          </div>
        );
      }

      // אם זה טקסט ארוך (יותר מ-100 תווים)
      if (typeof value === "string" && value.length > 100) {
        return (
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="size-4 text-fuchsia-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Text ({value.length} chars)
              </span>
            </div>
            <div className="text-sm text-slate-700 dark:text-slate-300 max-h-16 overflow-y-auto">
              {value}
            </div>
          </div>
        );
      }

      // סטרינג רגיל
      return (
        <span className="text-slate-700 dark:text-slate-300">
          {String(value)}
        </span>
      );
    };

    return (
      <div key={custom} title={custom} className="max-w-[300px] break-words">
        {renderValue()}
      </div>
    );
  },

  edit: ({ row }) => {
    const match = row.original.meta_data.find(
      (metaProduct) => metaProduct.key === custom
    );

    const value = match?.value;

    // קביעה של ערך עריכה תמיד כמחרוזת
    let editableValue = "";

    if (typeof value === "object") {
      try {
        editableValue = JSON.stringify(value, null, 2);
      } catch (e) {
        editableValue = "";
      }
    } else if (value !== undefined && value !== null) {
      editableValue = String(value);
    }

    return (
      <Input
        className="w-full"
        value={editableValue}
        placeholder={`Edit ${custom}`}
        onChange={(e) => {
          const newValue = e.target.value;

          // שלב השמירה – עדכן ב־meta_data של השורה (אם צריך)
          match.value = newValue; // כאן אתה מחליף ב־string בלבד
        }}
      />
    );
  },

  size: columnSizes[custom] || 150,
});

const customFieldsOrder = Array.isArray(window?.listOrdersMetaData)
  ? window.listOrdersMetaData.map(createCustomField)
  : [];

const formatDateTime = (dateString) => {
   
  if (!dateString) return __("Not defined", "whizmanage");
  try {
    return dateString.replace("T", " ").replace("Z", "").substring(0, 19);
  } catch (e) {
    return dateString;
  }
};

const getRelativeTime = (dateString) => {
  if (typeof dateString !== "string" || !dateString) return __("Not defined", "whizmanage");

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return __("Invalid date", "whizmanage");

  return formatDistanceToNow(date, {
    addSuffix: true,
    locale: window.user_local === "he_IL" ? he : enUS,
  });
};

export const columns = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => {
          table.toggleAllPageRowsSelected(!!value);
        }}
        aria-label="Select all"
        className="m-auto"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="m-auto"
      />
    ),
    edit: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="m-auto"
      />
    ),
    enablePinning: true,
    size: 50,
  },
  {
    id: "expand",
    header: ({ table }) => (
      <button onClick={table.getToggleAllRowsExpandedHandler()}>
        {table.getIsAllRowsExpanded() ? (
          <ChevronsRight className="rotate-90 w-5 h-5 text-fuchsia-600" />
        ) : (
          <ChevronsRight className="w-5 h-5 text-fuchsia-600 rtl:rotate-180" />
        )}
      </button>
    ),
    cell: ({ row }) =>
      row.getCanExpand() ? (
        <button onClick={row.getToggleExpandedHandler()} className="m-auto">
          {row.getIsExpanded() ? (
            <ChevronsRight className="rotate-90 w-5 h-5 text-fuchsia-600" />
          ) : (
            <ChevronsRight className="w-5 h-5 text-fuchsia-600 rtl:rotate-180" />
          )}
        </button>
      ) : null,
    edit: ({ row }) =>
      row.getCanExpand() ? (
        <button onClick={row.getToggleExpandedHandler()} className="m-auto">
          {row.getIsExpanded() ? (
            <ChevronsRight className="rotate-90 w-5 h-5 text-fuchsia-600" />
          ) : (
            <ChevronsRight className="w-5 h-5 text-fuchsia-600 rtl:rotate-180" />
          )}
        </button>
      ) : null,
    enablePinning: true,
    size: 50,
  },
  {
    accessorKey: "order",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title={"Order"}
          className="mr-1"
        />
      );
    },
    cell: ({ row }) => (
      <p>
        {`${row.original?.billing?.first_name || ""} ${row.original?.billing?.last_name || ""} #${row.original.id}`.trim()}
      </p>
    ),
    // Editing Order ID is usually not allowed
    edit: ({ row }) => (
      <div
        title={`${row.original.name} #${row.original.id}`}
        className="font-medium text-muted-foreground"
      >
        <p>
          {`${row.original?.billing?.first_name || ""} ${row.original?.billing?.last_name || ""}`.trim()}
        </p>
        <p className="text-center">#{row.original.id}</p>
      </div>
    ),
    size: columnSizes?.customer_name || 130, // Adjust default size
  },
  {
    accessorKey: "order_summary",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title={"Order Summary"}
          className="mr-1"
        />
      );
    },
    cell: ({ row }) => (
      <div>
        <OrderSummaryModal row={row.original} />
      </div>
    ),
    edit: ({ row }) => (
      <div>
        <OrderSummaryModal row={row.original} />
      </div>
    ),
    size: columnSizes?.order_summary || 150, // Adjust default size
  },
  {
    accessorKey: "actions",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Actions" className="mr-1" />
    ),
    cell: ({ row }) => (
      <OrderActions orderId={row.original.id} />
    ),
    edit: ({ row }) => (
      <OrderActions orderId={row.original.id} />
    ),
    size: columnSizes?.actions || 100,
  },
  {
    accessorKey: "shipping",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={"Shipping"}
        className="mr-1"
      />
    ),
    cell: ({ row, table }) => <ShippingEdit row={row} table={table} isEditing={false} />,
    edit: ({ row, table }) => (
      <ShippingEdit row={row} table={table} isEditing={true} />
    ),
    size: columnSizes?.shipping || 200,
  },
  {
    accessorKey: "shipping_phone",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Shipping Phone"
        className="mr-1"
      />
    ),
    cell: ({ row }) => {
      const phone = row.original.shipping?.phone || "";

      return (
        <div className="flex flex-col">
          <div className="!line-clamp-1 truncate text-nowrap">
            {__(phone || "No Phone", "whizmanage")}
          </div>
        </div>
      );
    },
    edit: ({ row }) => (
      <input
        className="w-full border h-9 dark:bg-slate-700 px-2 dark:!text-slate-300 !border-slate-200 dark:!border-slate-800 !rounded-md"
        defaultValue={row.original.shipping?.phone}
        onChange={(e) => {
          if (row.original.shipping) {
            row.original.shipping.phone = e.target.value;
          }
        }}
      />
    ),
    size: columnSizes?.shipping_phone || 200,
  },
  {
    accessorKey: "shipping_company",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Shipping Company"
        className="mr-1"
      />
    ),
    cell: ({ row }) => {
      const company = row.original.shipping?.company || "";

      return (
        <div className="flex flex-col">
          <div className="!line-clamp-1 truncate text-nowrap">
            {__(company || "No Company", "whizmanage")}
          </div>
        </div>
      );
    },
    edit: ({ row }) => (
      <input
        className="w-full border h-9 dark:bg-slate-700 px-2 dark:!text-slate-300 !border-slate-200 dark:!border-slate-800 !rounded-md"
        defaultValue={row.original.shipping?.company}
        onChange={(e) => {
          if (row.original.shipping) {
            row.original.shipping.company = e.target.value;
          }
        }}
      />
    ),
    size: columnSizes?.shipping_company || 200,
  },
  {
    accessorKey: "shipping_city",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Shipping City"
        className="mr-1"
      />
    ),
    cell: ({ row }) => {
      const city = row.original.shipping?.city || "";

      return (
        <div className="flex flex-col">
          <div className="!line-clamp-1 truncate text-nowrap">
            {city || "No City"}
          </div>
        </div>
      );
    },
    edit: ({ row }) => (
      <input
        className="w-full border h-9 dark:bg-slate-700 px-2 dark:!text-slate-300 !border-slate-200 dark:!border-slate-800 !rounded-md"
        defaultValue={row.original.shipping?.city}
        onChange={(e) => {
          if (row.original.shipping) {
            row.original.shipping.city = e.target.value;
          }
        }}
      />
    ),
    size: columnSizes?.shipping_city || 200,
  },
  {
    accessorKey: "shipping_country",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Shipping Country"
        className="mr-1"
      />
    ),
    cell: ({ row }) => {
      const country = row.original.shipping?.country || "";

      return (
        <div className="flex flex-col">
          <div className="!line-clamp-1 truncate text-nowrap">
            {country || "No Country"}
          </div>
        </div>
      );
    },
    edit: ({ row }) => (
      <input
        className="w-full border h-9 dark:bg-slate-700 px-2 dark:!text-slate-300 !border-slate-200 dark:!border-slate-800 !rounded-md"
        defaultValue={row.original.shipping?.country}
        onChange={(e) => {
          if (row.original.shipping) {
            row.original.shipping.country = e.target.value;
          }
        }}
      />
    ),
    size: columnSizes?.shipping_country || 200,
  },
  {
    accessorKey: "shipping_postcode",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Shipping Postcode"
        className="mr-1"
      />
    ),
    cell: ({ row }) => {
      const postcode = row.original.shipping?.postcode || "";

      return (
        <div className="flex flex-col">
          <div className="!line-clamp-1 truncate text-nowrap">
            {__(postcode || "No Postcode", "whizmanage")}
          </div>
        </div>
      );
    },
    edit: ({ row }) => (
      <input
        className="w-full border h-9 dark:bg-slate-700 px-2 dark:!text-slate-300 !border-slate-200 dark:!border-slate-800 !rounded-md"
        defaultValue={row.original.shipping?.postcode}
        onChange={(e) => {
          if (row.original.shipping) {
            row.original.shipping.postcode = e.target.value;
          }
        }}
      />
    ),
    size: columnSizes?.shipping_postcode || 200,
  },
  {
    accessorKey: "shipping_address_1",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Shipping Address 1"
        className="mr-1"
      />
    ),
    cell: ({ row }) => {
      const address = row.original.shipping?.address_1 || "";

      return (
        <div className="flex flex-col">
          <div className="!line-clamp-1 truncate text-nowrap">
            {__(address || "No Address", "whizmanage")}
          </div>
        </div>
      );
    },
    edit: ({ row }) => (
      <input
        className="w-full border h-9 dark:bg-slate-700 px-2 dark:!text-slate-300 !border-slate-200 dark:!border-slate-800 !rounded-md"
        defaultValue={row.original.shipping?.address_1}
        onChange={(e) => {
          if (row.original.shipping) {
            row.original.shipping.address_1 = e.target.value;
          }
        }}
      />
    ),
    size: columnSizes?.shipping_address_1 || 200,
  },
  {
    accessorKey: "shipping_address_2",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Shipping Address 2"
        className="mr-1"
      />
    ),
    cell: ({ row }) => {
      const address = row.original.shipping?.address_2 || "";

      return (
        <div className="flex flex-col">
          <div className="!line-clamp-1 truncate text-nowrap">
            {__(address || "No Address", "whizmanage")}
          </div>
        </div>
      );
    },
    edit: ({ row }) => (
      <input
        className="w-full border h-9 dark:bg-slate-700 px-2 dark:!text-slate-300 !border-slate-200 dark:!border-slate-800 !rounded-md"
        defaultValue={row.original.shipping?.address_2}
        onChange={(e) => {
          if (row.original.shipping) {
            row.original.shipping.address_2 = e.target.value;
          }
        }}
      />
    ),
    size: columnSizes?.shipping_address_2 || 200,
  },
  {
    accessorKey: "shipping_name",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Shipping Name"
        className="mr-1"
      />
    ),
    cell: ({ row }) => {
      const shipping = row.original.shipping;

      const name =
        shipping && (shipping.first_name || shipping.last_name)
          ? `${shipping.first_name ?? ""} ${shipping.last_name ?? ""}`.trim()
          : "";

      return (
        <div className="flex flex-col">
          <div className="!line-clamp-1 truncate text-nowrap">
            {name || "No Name"}
          </div>
        </div>
      );
    },
    edit: ({ row }) => {
      const shipping = row.original.shipping;

      const name =
        shipping && (shipping.first_name || shipping.last_name)
          ? `${shipping.first_name ?? ""} ${shipping.last_name ?? ""}`.trim()
          : "";

      return (
        <input
          className="w-full border h-9 dark:bg-slate-700 px-2 dark:!text-slate-300 !border-slate-200 dark:!border-slate-800 !rounded-md"
          defaultValue={name}
          onChange={(e) => {
            if (row.original.shipping) {
              row.original.shipping.first_name = e.target.value;
            }
          }}
        />
      );
    },
    size: columnSizes?.shipping_name || 200,
  },
  {
    accessorKey: "shipping_state",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Shipping State"
        className="mr-1"
      />
    ),
    cell: ({ row }) => {
      const state = row.original.shipping?.state || "";

      return (
        <div className="flex flex-col">
          <div className="!line-clamp-1 truncate text-nowrap">
            {__(state || "No State", "whizmanage")}
          </div>
        </div>
      );
    },
    edit: ({ row }) => (
      <input
        className="w-full border h-9 dark:bg-slate-700 px-2 dark:!text-slate-300 !border-slate-200 dark:!border-slate-800 !rounded-md"
        defaultValue={row.original.shipping?.state}
        onChange={(e) => {
          if (row.original.shipping) {
            row.original.shipping.state = e.target.value;
          }
        }}
      />
    ),
    size: columnSizes?.shipping_state || 200,
  },
  {
    accessorKey: "source",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={__("Source", "whizmanage")} className="mr-1" />
    ),
    cell: ({ row }) => {
      const s = row.original.source || {};

      const refHost = s.referring_domain || (s.referrer ? (() => {
        try { return new URL(s.referrer).host; } catch { return ""; }
      })() : "");

      // זיהוי מקורות פופולריים מוקדם
      const getKnownSource = (host) => {
        if (!host) return null;
        const lower = host.toLowerCase();

        // Social Media
        if (lower.includes('facebook.com') || lower.includes('fb.com')) return { name: 'Facebook', icon: 'F', color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200' };
        if (lower.includes('instagram.com')) return { name: 'Instagram', icon: 'IG', color: 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900 dark:text-pink-200' };
        if (lower.includes('twitter.com') || lower.includes('x.com')) return { name: 'X (Twitter)', icon: '𝕏', color: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900 dark:text-slate-200' };
        if (lower.includes('linkedin.com')) return { name: 'LinkedIn', icon: 'in', color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200' };
        if (lower.includes('youtube.com')) return { name: 'YouTube', icon: '▶', color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200' };
        if (lower.includes('tiktok.com')) return { name: 'TikTok', icon: '♪', color: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900 dark:text-slate-200' };
        if (lower.includes('pinterest.com')) return { name: 'Pinterest', icon: 'P', color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200' };
        if (lower.includes('reddit.com')) return { name: 'Reddit', icon: 'R', color: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-200' };
        if (lower.includes('whatsapp.com')) return { name: 'WhatsApp', icon: 'WA', color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200' };
        if (lower.includes('telegram.org') || lower.includes('t.me')) return { name: 'Telegram', icon: 'TG', color: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900 dark:text-sky-200' };
        if (lower.includes('snapchat.com')) return { name: 'Snapchat', icon: '👻', color: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200' };

        // Search Engines
        if (lower.includes('google.com') || lower.includes('google.co.il')) return { name: 'Google', icon: 'G', color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200' };
        if (lower.includes('bing.com')) return { name: 'Bing', icon: 'B', color: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900 dark:text-teal-200' };
        if (lower.includes('yahoo.com')) return { name: 'Yahoo', icon: 'Y!', color: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-200' };
        if (lower.includes('duckduckgo.com')) return { name: 'DuckDuckGo', icon: 'DDG', color: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-200' };
        if (lower.includes('yandex')) return { name: 'Yandex', icon: 'Ya', color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200' };

        return null;
      };

      const knownSource = getKnownSource(refHost);

      // יש דאטה אטריביושן? (בלי device/views)
      const hasAny = !!(
        s.source_type || s.utm_source || s.utm_medium || s.utm_campaign || s.referring_domain || s.referrer || s.label
      );
      if (!hasAny) {
        return (
          <div className="text-gray-500 text-xs px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 w-fit">
            {__("Unknown", "whizmanage")}
          </div>
        );
      }

      // היררכיה כמו Woo: UTM > Referral > Admin > Direct > Unknown
      let badgeType = "Unknown";
      if (s.source_type === "utm" && (s.utm_source || s.utm_medium || s.utm_campaign)) {
        badgeType = "UTM";
      } else if (s.source_type === "referral") {
        badgeType = "Referral";
      } else if (s.source_type === "admin") {
        badgeType = "Admin";
      } else if (s.source_type === "typein" || s.source_type === "direct") {
        badgeType = "Direct";
      }

      const styles = (type) => {
        if (type === "UTM") return { color: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200", icon: "🎯" };
        if (type === "Referral") return { color: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-200", icon: "🔗" };
        if (type === "Direct") return { color: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900 dark:text-gray-200", icon: "👤" };
        if (type === "Admin") return { color: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900 dark:text-amber-200", icon: "🛠️" };
        return { color: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-200", icon: "❓" };
      };

      const copyToClipboard = async (text) => {
        try { await navigator.clipboard.writeText(text); } catch { }
      };

      const utmQuery = (() => {
        const params = [];
        if (s.utm_source) params.push(`utm_source=${encodeURIComponent(s.utm_source)}`);
        if (s.utm_medium) params.push(`utm_medium=${encodeURIComponent(s.utm_medium)}`);
        if (s.utm_campaign) params.push(`utm_campaign=${encodeURIComponent(s.utm_campaign)}`);
        if (s.utm_content) params.push(`utm_content=${encodeURIComponent(s.utm_content)}`);
        if (s.utm_term) params.push(`utm_term=${encodeURIComponent(s.utm_term)}`);
        return params.length ? `?${params.join("&")}` : "";
      })();

      // אם יש מקור מוכר, נשתמש בו
      let displayInfo;
      if (knownSource && badgeType === "Referral") {
        displayInfo = {
          color: knownSource.color,
          icon: knownSource.icon,
          label: knownSource.name
        };
      } else {
        const { color, icon } = styles(badgeType);
        displayInfo = { color, icon, label: badgeType };
      }

      // תוכן הטולטיפ — כל הטקסטים עטופים ב-t()
      const descriptionContent = (
        <div className="space-y-3 text-right" dir="rtl">
          {/* שורה עליונה: מקור + סוג */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-base">{displayInfo.icon}</span>
              <span className="text-xs px-2 py-0.5 border rounded-md bg-gray-50 dark:bg-gray-900">
                {__("Source Type", "whizmanage")}: <b>{__(badgeType, "whizmanage")}</b>
              </span>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-300">
              {__("Origin", "whizmanage")}: <b>{knownSource ? knownSource.name : (s.label || (refHost && badgeType === "Unknown" ? refHost : __(badgeType, "whizmanage")))}</b>
            </div>
          </div>

          {/* Badges מהירים */}
          <div className="flex flex-wrap gap-1">
            {s.device_type ? (
              <span className="text-[11px] px-2 py-0.5 border rounded-md">{__("Device", "whizmanage")}: {s.device_type}</span>
            ) : null}
            {Number.isFinite(s.session_page_views) ? (
              <span className="text-[11px] px-2 py-0.5 border rounded-md">{__("Page Views", "whizmanage")}: {s.session_page_views}</span>
            ) : null}
            {refHost ? (
              <span className="text-[11px] px-2 py-0.5 border rounded-md">{__("Referring Domain", "whizmanage")}: {refHost}</span>
            ) : null}
          </div>

          {/* אזור UTM שימושי */}
          {(s.utm_source || s.utm_medium || s.utm_campaign || s.utm_content || s.utm_term) ? (
            <div className="border-t pt-2">
              <div className="flex items-center justify-between">
                <div className="font-medium text-xs text-gray-600">{__("UTM Parameters", "whizmanage")}</div>
                <div className="flex items-center gap-2">
                  {utmQuery ? (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(utmQuery)}
                      className="text-[11px] underline"
                    >
                      {__("Copy UTM query", "whizmanage")}
                    </button>
                  ) : null}
                  {s.referrer ? (
                    <a
                      href={s.referrer}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] underline"
                    >
                      {__("Open referrer", "whizmanage")}
                    </a>
                  ) : null}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 text-xs">
                {s.utm_source ? <div><span className="font-medium">{__("UTM Source", "whizmanage")}:</span> {s.utm_source}</div> : null}
                {s.utm_medium ? <div><span className="font-medium">{__("UTM Medium", "whizmanage")}:</span> {s.utm_medium}</div> : null}
                {s.utm_campaign ? <div><span className="font-medium">{__("UTM Campaign", "whizmanage")}:</span> {s.utm_campaign}</div> : null}
                {s.utm_content ? <div><span className="font-medium">{__("UTM Content", "whizmanage")}:</span> {s.utm_content}</div> : null}
                {s.utm_term ? <div><span className="font-medium">{__("UTM Term", "whizmanage")}:</span> {s.utm_term}</div> : null}
              </div>
            </div>
          ) : null}
        </div>
      );

      return (
        <CustomTooltip
          title={__("Source details", "whizmanage")}
          description={descriptionContent}
          contentClassName="max-w-[420px] w-fit max-h-96 overflow-auto p-3 rounded-md shadow-md border text-xs bg-white dark:bg-gray-800"
        >
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 border rounded-lg text-xs w-fit cursor-pointer hover:shadow-sm transition-shadow",
            displayInfo.color
          )}>
            <span className="text-xs">{displayInfo.icon}</span>
            <span className="font-medium">
              {badgeType === "UTM"
                ? __("UTM: {{value}}", { value: s.utm_campaign || s.utm_medium || s.utm_source || __("Campaign", "whizmanage") })
                : knownSource && badgeType === "Referral"
                  ? knownSource.name
                  : __(displayInfo.label, "whizmanage")}
            </span>
          </div>
        </CustomTooltip>
      );
    },
    edit: () => <></>,
    size: columnSizes?.source || 170,
  },
  {
    accessorKey: "billing",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={"Billing"}
        className="mr-1"
      />
    ),
    cell: ({ row, table }) => {
      return <BillingEdit row={row} table={table} isEditing={false} />;
    },
    edit: ({ row, table }) => {
      return <BillingEdit row={row} table={table} isEditing={true} />;
    },
    size: columnSizes?.billing || 200,
  },
  {
    accessorKey: "billing_phone",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Billing Phone"
        className="mr-1"
      />
    ),
    cell: ({ row }) => {
      const phone = row.original.billing?.phone || "";

      return (
        <div className="flex flex-col">
          <div className="!line-clamp-1 truncate text-nowrap">
            {__(phone || "No Phone", "whizmanage")}
          </div>
        </div>
      );
    },
    edit: ({ row }) => (
      <input
        className="w-full border h-9 dark:bg-slate-700 px-2 dark:!text-slate-300 !border-slate-200 dark:!border-slate-800 !rounded-md"
        defaultValue={row.original.billing?.phone}
        onChange={(e) => {
          if (row.original.billing) {
            row.original.billing.phone = e.target.value;
          }
        }}
      />
    ),
    size: columnSizes?.billing_phone || 200,
  },
  {
    accessorKey: "billing_company",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Billing Company"
        className="mr-1"
      />
    ),
    cell: ({ row }) => {
      const company = row.original.billing?.company || "";

      return (
        <div className="flex flex-col">
          <div className="!line-clamp-1 truncate text-nowrap">
            {__(company || "No Company", "whizmanage")}
          </div>
        </div>
      );
    },
    edit: ({ row }) => (
      <input
        className="w-full border h-9 dark:bg-slate-700 px-2 dark:!text-slate-300 !border-slate-200 dark:!border-slate-800 !rounded-md"
        defaultValue={row.original.billing?.company}
        onChange={(e) => {
          if (row.original.billing) {
            row.original.billing.company = e.target.value;
          }
        }}
      />
    ),
    size: columnSizes?.billing_company || 200,
  },
  {
    accessorKey: "billing_city",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Billing City"
        className="mr-1"
      />
    ),
    cell: ({ row }) => {
      const city = row.original.billing?.city || "";

      return (
        <div className="flex flex-col">
          <div className="!line-clamp-1 truncate text-nowrap">
            {city || "No City"}
          </div>
        </div>
      );
    },
    edit: ({ row }) => (
      <input
        className="w-full border h-9 dark:bg-slate-700 px-2 dark:!text-slate-300 !border-slate-200 dark:!border-slate-800 !rounded-md"
        defaultValue={row.original.billing?.city}
        onChange={(e) => {
          if (row.original.billing) {
            row.original.billing.city = e.target.value;
          }
        }}
      />
    ),
    size: columnSizes?.billing_city || 200,
  },
  {
    accessorKey: "billing_country",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Billing Country"
        className="mr-1"
      />
    ),
    cell: ({ row }) => {
      const country = row.original.billing?.country || "";

      return (
        <div className="flex flex-col">
          <div className="!line-clamp-1 truncate text-nowrap">
            {country || "No Country"}
          </div>
        </div>
      );
    },
    edit: ({ row }) => (
      <input
        className="w-full border h-9 dark:bg-slate-700 px-2 dark:!text-slate-300 !border-slate-200 dark:!border-slate-800 !rounded-md"
        defaultValue={row.original.billing?.country}
        onChange={(e) => {
          if (row.original.billing) {
            row.original.billing.country = e.target.value;
          }
        }}
      />
    ),
    size: columnSizes?.billing_country || 200,
  },
  {
    accessorKey: "billing_postcode",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Billing Postcode"
        className="mr-1"
      />
    ),
    cell: ({ row }) => {
      const postcode = row.original.billing?.postcode || "";

      return (
        <div className="flex flex-col">
          <div className="!line-clamp-1 truncate text-nowrap">
            {__(postcode || "No Postcode", "whizmanage")}
          </div>
        </div>
      );
    },
    edit: ({ row }) => (
      <input
        className="w-full border h-9 dark:bg-slate-700 px-2 dark:!text-slate-300 !border-slate-200 dark:!border-slate-800 !rounded-md"
        defaultValue={row.original.billing?.postcode}
        onChange={(e) => {
          if (row.original.billing) {
            row.original.billing.postcode = e.target.value;
          }
        }}
      />
    ),
    size: columnSizes?.billing_postcode || 200,
  },
  {
    accessorKey: "billing_address_1",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Billing Address 1"
        className="mr-1"
      />
    ),
    cell: ({ row }) => {
      const address = row.original.billing?.address_1 || "";

      return (
        <div className="flex flex-col">
          <div className="!line-clamp-1 truncate text-nowrap">
            {__(address || "No Address", "whizmanage")}
          </div>
        </div>
      );
    },
    edit: ({ row }) => (
      <input
        className="w-full border h-9 dark:bg-slate-700 px-2 dark:!text-slate-300 !border-slate-200 dark:!border-slate-800 !rounded-md"
        defaultValue={row.original.billing?.address_1}
        onChange={(e) => {
          if (row.original.billing) {
            row.original.billing.address_1 = e.target.value;
          }
        }}
      />
    ),
    size: columnSizes?.billing_address_1 || 200,
  },
  {
    accessorKey: "billing_address_2",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Billing Address 2"
        className="mr-1"
      />
    ),
    cell: ({ row }) => {
      const address = row.original.billing?.address_2 || "";

      return (
        <div className="flex flex-col">
          <div className="!line-clamp-1 truncate text-nowrap">
            {__(address || "No Address", "whizmanage")}
          </div>
        </div>
      );
    },
    edit: ({ row }) => (
      <input
        className="w-full border h-9 dark:bg-slate-700 px-2 dark:!text-slate-300 !border-slate-200 dark:!border-slate-800 !rounded-md"
        defaultValue={row.original.billing?.address_2}
        onChange={(e) => {
          if (row.original.billing) {
            row.original.billing.address_2 = e.target.value;
          }
        }}
      />
    ),
    size: columnSizes?.billing_address_2 || 200,
  },
  {
    accessorKey: "billing_name",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Billing Name"
        className="mr-1"
      />
    ),
    cell: ({ row }) => {
      const billing = row.original.billing;

      const name =
        billing && (billing.first_name || billing.last_name)
          ? `${billing.first_name ?? ""} ${billing.last_name ?? ""}`.trim()
          : "";

      return (
        <div className="flex flex-col">
          <div className="!line-clamp-1 truncate text-nowrap">
            {name || "No Name"}
          </div>
        </div>
      );
    },
    edit: ({ row }) => {
      const billing = row.original.billing;

      const name =
        billing && (billing.first_name || billing.last_name)
          ? `${billing.first_name ?? ""} ${billing.last_name ?? ""}`.trim()
          : "";

      return (
        <input
          className="w-full border h-9 dark:bg-slate-700 px-2 dark:!text-slate-300 !border-slate-200 dark:!border-slate-800 !rounded-md"
          defaultValue={name}
          onChange={(e) => {
            if (row.original.billing) {
              row.original.billing.first_name = e.target.value;
            }
          }}
        />
      );
    },
    size: columnSizes?.billing_name || 200,
  },
  {
    accessorKey: "billing_state",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Billing State"
        className="mr-1"
      />
    ),
    cell: ({ row }) => {
      const state = row.original.billing?.state || "";

      return (
        <div className="flex flex-col">
          <div className="!line-clamp-1 truncate text-nowrap">
            {__(state || "No State", "whizmanage")}
          </div>
        </div>
      );
    },
    edit: ({ row }) => (
      <input
        className="w-full border h-9 dark:bg-slate-700 px-2 dark:!text-slate-300 !border-slate-200 dark:!border-slate-800 !rounded-md"
        defaultValue={row.original.billing?.state}
        onChange={(e) => {
          if (row.original.billing) {
            row.original.billing.state = e.target.value;
          }
        }}
      />
    ),
    size: columnSizes?.billing_state || 200,
  },
  {
    accessorKey: "billing_email",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Billing Email"
        className="mr-1"
      />
    ),
    cell: ({ row }) => {
      const email = row.original.billing?.email || "";

      return (
        <div className="flex flex-col">
          <div className="!line-clamp-1 truncate text-nowrap">
            {__(email || "No Email", "whizmanage")}
          </div>
        </div>
      );
    },
    edit: ({ row }) => (
      <input
        className="w-full border h-9 dark:bg-slate-700 px-2 dark:!text-slate-300 !border-slate-200 dark:!border-slate-800 !rounded-md"
        defaultValue={row.original.billing?.email}
        onChange={(e) => {
          if (row.original.billing) {
            row.original.billing.email = e.target.value;
          }
        }}
      />
    ),
    size: columnSizes?.billing_email || 200,
  },
  {
    accessorKey: "items",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Items" className="mr-1" />
    ),
    cell: ({ row }) => {
      const itemsCount =
        row?.original?.line_items?.filter(
          (item) => parseInt(item?.quantity) > 0
        )?.length || 0;
      const total = row.original.total || "0";

      return (
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">
            {__('cart_summary', { count: parseInt(itemsCount), total })}
          </span>
        </div>
      );
    },
    edit: ({ row }) => <EditableItemsCell row={row} />,
    size: columnSizes?.items || 220,
  },
  {
    accessorKey: "payment_method",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title={"Payment method"}
          className="mr-1"
        />
      );
    },
    cell: ({ row }) => {
      const getPaymentIcon = (payment_method) => {
        switch (payment_method) {
          case "credit_card":
            return <CreditCardIcon className="w-4 h-4 mr-1" />;
          case "paypal":
            return <DollarSignIcon className="w-4 h-4 mr-1" />;
          case "bank_transfer":
            return <LandmarkIcon className="w-4 h-4 mr-1" />;
          case "bit":
            return <SmartphoneIcon className="w-4 h-4 mr-1" />;
          case "apple_pay":
          case "google_pay":
            return <WalletIcon className="w-4 h-4 mr-1" />;
          default:
            return <CreditCardIcon className="w-4 h-4 mr-1" />;
        }
      };

      return (
        <div className="flex items-center !line-clamp-1 truncate">
          {getPaymentIcon(row.original.payment_method)}
          <span className="font-medium">
            {__(row.original.payment_method_title || "UNKNOWN", "whizmanage")}
          </span>
        </div>
      );
    },
    edit: ({ row }) => {
      return (
        <Select
          defaultValue={row.original.payment_method || ""}
          onValueChange={(value) => {
            row.original.payment_method = value;
          }}
        >
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder={__("Choose Payment Method", "whizmanage")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="credit_card">{__("Credit Card", "whizmanage")}</SelectItem>
            <SelectItem value="paypal">{__("PayPal", "whizmanage")}</SelectItem>
            <SelectItem value="bank_transfer">{__("Bank Transfer", "whizmanage")}</SelectItem>
            <SelectItem value="cod">{__("Cash on Delivery (COD)", "whizmanage")}</SelectItem>
            <SelectItem value="bit">{__("Bit (Israeli Payment App)", "whizmanage")}</SelectItem>
            <SelectItem value="apple_pay">{__("Apple Pay", "whizmanage")}</SelectItem>
            <SelectItem value="google_pay">{__("Google Pay", "whizmanage")}</SelectItem>
            <SelectItem value="manual">{__("Manual Payment", "whizmanage")}</SelectItem>
            <SelectItem value="cheque">{__("Check", "whizmanage")}</SelectItem>
            <SelectItem value="direct_debit">
              {__("Standing Order / Direct Debit", "whizmanage")}
            </SelectItem>
          </SelectContent>
        </Select>
      );
    },
    size: columnSizes?.payment_method || 190, // הגדלתי את הרוחב המוגדר כברירת מחדל
    filterFn: columnFilterFn,
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={"Status"}
        className="mr-1"
      />
    ),
    cell: ({ row }) => {
      const status = row.original.status;
      const statusDescriptions = {
        pending: "The order has been received, but no payment has been made.",
        processing: "Payment has been received (paid), and the stock has been reduced. The order is awaiting fulfillment.",
        "on-hold": "The order is awaiting payment confirmation. Stock is reduced, but you need to confirm payment.",
        completed: "Order fulfilled and complete. Requires no further action.",
        cancelled: "The order was canceled by an admin or the customer.",
        refunded: "Orders are automatically put in the Refunded status when an admin or shop manager has fully refunded the order’s value.",
        failed: "The customer’s payment failed or was declined, and no payment has been successfully made.",
      };

      const desc = statusDescriptions[status] || '';

      return (
        <CustomTooltip
          description={__(desc, "whizmanage")}
          contentClassName={cn("max-w-[120px] w-fit max-h-60 overflow-auto p-2 rounded-md shadow-sm border text-xs", OrderStatusKeys[status])}
        >
          <div
            className={cn(
              "capitalize font-semibold px-2 py-1 border rounded-lg text-xs w-fit rtl:mr-2 cursor-pointer flex items-center gap-1",
              OrderStatusKeys[status]
            )}
          >
            {__(status, "whizmanage").toUpperCase()}
          </div>
        </CustomTooltip>
      );
    },
    edit: ({ row }) => {
      const [value, setValue] = useState(row.original.status);
       

      return (
        <Select
          onValueChange={(selectedValue) => {
            setValue(selectedValue);
            row.original.status = selectedValue;
          }}
          aria-label="Choose status"
        >
          <SelectTrigger className="appearance-none flex items-center gap-2 capitalize font-semibold px-2 border rounded-md text-xs w-fit rtl:mr-2 py-0 h-9 focus-visible:ring-0 focus:ring-offset-0 min-w-[100px]">
            <SelectValue placeholder={<span>{__(value, "whizmanage")}</span>} />
          </SelectTrigger>
          <SelectContent className="!p-0 min-w-fit max-w-fit dark:border-slate-600">
            {Object.keys(OrderStatusKeys).map((status) => (
              <SelectItem
                key={status}
                value={status}
                className={cn(
                  "capitalize cursor-pointer font-semibold text-xs w-full rtl:mr-2 py-1.5 pr-1 pl-2 hover:border-slate-500 !rounded-none",
                  OrderStatusKeys[status]
                )}
              >
                <span>{__(status, "whizmanage").toUpperCase()}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    },
    filterFn: columnFilterFn,
    size: columnSizes?.status || 120,
  },
  {
    accessorKey: "date_created",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title={"Date"}
          className="mr-1"
        />
      );
    },
    cell: ({ row }) => {
      return (
        <div className="flex flex-col">
          <div className="!line-clamp-1 truncate text-nowrap">
            {formatDateTime(row.original.date_created_gmt)}
          </div>
          <div className="text-xs text-center text-gray-500 dark:text-gray-400">
            {getRelativeTime(row.original.date_created_gmt)}
          </div>
        </div>
      );
    },
    edit: ({ row }) => {
      const [value, setValue] = useState(() =>
        parseDateTime(row.original.date_created_gmt.substring(0, 19))
      );
      const handleDateChange = (newDate) => {
        setValue(newDate);
        row.original.date_created_gmt = newDate.toString();
      };

      return (
        <div className="w-full max-w-xl flex flex-row gap-4">
          <DatePicker
            hideTimeZone
            showMonthAndYearPickers
            value={value}
            onChange={handleDateChange}
            aria-label="Event Date"
            classNames={{
              base: "rounded-md dark:!bg-slate-800 dark:!text-slate-300",
              inputWrapper:
                "rounded-md !h-8 !max-h-8 !py-1 !m-0 border dark:!border-slate-800 bg-white dark:!bg-slate-700 dark:!text-slate-300",
              timeInput: "rounded-md dark:!bg-slate-800 dark:!text-slate-300",
              selectorButton:
                "rounded-md dark:!bg-slate-700 dark:!text-slate-400",
            }}
            hourCycle={24}
          />
        </div>
      );
    },
    size: columnSizes?.date_created_gmt || 150, // Adjust default size
  },
  {
    accessorKey: "total",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title={"Total"}
          className="mr-1 justify-end text-right"
        />
      );
    },
    cell: ({ row }) => {
      const total = parseFloat(row.original.total || "0");
      const discount = parseFloat(row.original.discount_total || "0");
      const salePrice = discount > 0;
      const beforeDiscountTotal = (total + discount).toFixed(2);

      return (
        <div
          title={`${__("Order total", "whizmanage")}: ${total.toFixed(2)}`}
          className="flex flex-col items-center"
        >
          <div className="text-nowrap">
            <span className="text-gray-500 text-sm font-medium">
              <span
                dangerouslySetInnerHTML={{ __html: window.currency || "$" }}
              />
              {total.toFixed(2)}
            </span>
          </div>
          {salePrice && (
            <div className="text-nowrap">
              <span className="text-sm line-through text-slate-300">
                <span
                  dangerouslySetInnerHTML={{ __html: window.currency || "$" }}
                />
                {beforeDiscountTotal}
              </span>
            </div>
          )}
        </div>
      );
    },
    edit: ({ row }) => (
      <div
        title={`Order total: ${row.original.total}`}
        className="flex items-center gap-1 justify-end text-right"
      >
        <span
          className="text-gray-400 text-sm" // Adjusted style
          dangerouslySetInnerHTML={{ __html: window.currency || "$" }} // Add fallback
        />
        <Input
          type="number"
          step="0.01"
          min={0}
          disabled // Make it non-editable
          value={parseFloat(row.original.total || 0).toFixed(2)}
          aria-label="Order total"
          className="h-8 !w-20 text-right dark:!text-slate-400 !border-slate-200 dark:!border-slate-800 !rounded-md bg-gray-100 dark:bg-slate-800 cursor-not-allowed" // Style as disabled
          readOnly
        />
      </div>
    ),
    size: columnSizes?.total || 100, // Adjust default size
  },
  {
    accessorKey: "tax",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title={"Tax"}
          className="mr-1 justify-end text-right" // Align right for currency
        />
      );
    },
    cell: ({ row }) => {
      const total_tax = parseFloat(row.original.total_tax || "0");
      const discount = parseFloat(row.original.discount_tax || "0");
      const salePrice = discount > 0;
      const beforeDiscountTotal = (total_tax + discount).toFixed(2);

      return (
        <div
          title={`Order total: ${total_tax.toFixed(2)}`}
          className="flex flex-col items-center"
        >
          <div className="text-nowrap">
            <span className="text-gray-500 text-sm font-medium">
              <span
                dangerouslySetInnerHTML={{ __html: window.currency || "$" }}
              />
              {total_tax.toFixed(2)}
            </span>
          </div>

          {salePrice && (
            <div className="text-nowrap">
              <span className="text-sm line-through text-slate-300">
                <span
                  dangerouslySetInnerHTML={{ __html: window.currency || "$" }}
                />
                {beforeDiscountTotal}
              </span>
            </div>
          )}
        </div>
      );
    },
    // Order total is calculated, not usually directly editable.
    edit: ({ row }) => (
      <div
        title={`Order total: ${row.original.total_tax}`}
        className="flex items-center gap-1 justify-end text-right"
      >
        {/* Assume window.currency holds the HTML entity for the currency symbol */}
        <span
          className="text-gray-400 text-sm" // Adjusted style
          dangerouslySetInnerHTML={{ __html: window.currency || "$" }} // Add fallback
        />
        {/* Display only or disabled input */}
        <Input
          type="number"
          step="0.01" // Allow decimals
          min={0}
          disabled // Make it non-editable
          value={parseFloat(row.original.total_tax || 0).toFixed(2)}
          aria-label="Order total"
          className="h-9 !w-20 text-right dark:!text-slate-400 !border-slate-200 dark:!border-slate-800 !rounded-md bg-gray-100 dark:bg-slate-800 cursor-not-allowed" // Style as disabled
          readonly
        />
      </div>
    ),
    size: columnSizes?.tax || 100, // Adjust default size
  },
  {
    accessorKey: "version",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={"Version"}
        className="mr-1"
      />
    ),
    cell: ({ row }) => (
      <div className="font-medium" title={row.original.version}>
        <p>{row.original.version}</p>
      </div>
    ),
    edit: ({ row }) => (
      <div
        className="font-medium text-muted-foreground"
        title={row.original.version}
      >
        <p>{row.original.version}</p>
      </div>
    ),
    size: columnSizes?.version || 100,
  },
  {
    accessorKey: "created_via",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={"Created via"}
        className="mr-1"
      />
    ),
    cell: ({ row }) => (
      <div className="font-medium" title={row.original.created_via}>
        <p>{row.original.created_via}</p>
      </div>
    ),
    edit: ({ row }) => (
      <div className="font-medium text-muted-foreground">
        {row.original.created_via}
      </div>
    ),
    size: columnSizes?.created_via || 150,
  },
  {
    accessorKey: "date_modified",
    header: ({ column }) => (
      <DataTableColumnHeader
        title={"Date modified"}
        column={column}
        className="mr-1"
      />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex flex-col">
          <div className="!line-clamp-1 truncate text-nowrap">
            {formatDateTime(row.original.date_modified_gmt)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {getRelativeTime(row.original.date_modified_gmt)}
          </div>
        </div>
      );
    },
    edit: ({ row }) => (
      <div className="flex flex-col">
        <div className="!line-clamp-1 truncate text-nowrap">
          {formatDateTime(row.original.date_modified_gmt)}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {getRelativeTime(row.original.date_modified_gmt)}
        </div>
      </div>
    ),
    size: columnSizes?.date_modified || 150,
  },
  {
    accessorKey: "customer_note",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title={"Customer note"}
          className="mr-1"
        />
      );
    },
    cell: ({ row }) => (
      <div
        className="capitalize truncate description-img !line-clamp-2 text-wrap max-sm:!hidden"
        title={row.original.customer_note}
      >
        {row.original.customer_note}
      </div>
    ),
    edit: ({ row }) => {
      return (
        <div
          className="w-full"
          style={{
            maxWidth: `${columnSizes?.customer_note || 170}px`,
          }}
        >
          <Textarea
            onChange={(e) => {
              row.original.customer_note = e.target.value;
            }}
            defaultValue={row.original.customer_note}
            className="w-full h-9 !max-h-9 invalid:border-red-500 rounded-md overflow-hidden resize-y"
            onFocus={(event) => event.target.select()}
            rows={2}
          />
        </div>
      );
    },
    size: columnSizes?.customer_note || 150,
  },
  {
    accessorKey: "note",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title={"Note"}
          className="mr-1"
        />
      );
    },
    cell: ({ row }) => <OrderNotesChat row={row.original} />,
    edit: ({ row }) => {
      <OrderNotesChat row={row.original} />;
    },
    size: columnSizes?.customer_note || 150,
  },
  ...customFieldsOrder,
];
