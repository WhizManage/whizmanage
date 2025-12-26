import React, { useState, useMemo, useEffect } from "react";
import ReactDOM from "react-dom/client";
import Button from "@components/ui/button";
import CustomTooltip from "@components/ui/nextUI/Tooltip.jsx";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ScrollShadow,
  useDisclosure,
} from "@heroui/react";
import {
  FileText,
  Package,
  MapPin,
  Receipt,
  Tag,
  Calendar,
  Hash,
  CreditCard,
  Printer,
  X,
  Plus,
  ClipboardList,
} from "lucide-react";
import { IconBadge } from "@components/ui/custom/IconBadge";
import { __ } from "@wordpress/i18n";
import { cn } from "@/lib/utils";
import { ORDER_STATUS_KEYS } from "../orders.constants";
import { postApi } from "@/services/services";

// ✅ קומפוננטה להדפסה - ללא שינוי
const PrintableOrderSummary = ({
  row,
  currencySymbol,
  orderDate,
  lineItems,
  refunds,
  coupons,
  shipping,
  billing,
  finalSummaryMetaFields,
  logoUrl,
  storeName,
  getTotal,
  getDiscount,
  cityPostcode,
  toNumber,
}) => {
  const isRtl = (document.documentElement.dir || "ltr") === "rtl";
  const dateStr = orderDate ? new Date(orderDate).toLocaleDateString() : "—";
  const shippingCityPost = cityPostcode(
    shipping?.city,
    shipping?.postcode,
    isRtl
  );
  const billingCityPost = cityPostcode(billing?.city, billing?.postcode, isRtl);

  return (
    <div className="wrap max-w-[800px] mx-auto p-5">
      <style>{`
        @media print {
          body { font-size: 12px; }
          .wrap { padding: 10px; }
          @page { margin: 1cm; }
        }
        .wrap { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .wrap * { box-sizing: border-box; }
      `}</style>
      {/* Header */}
      <div className="text-center mb-8 border-b-2 border-gray-200 pb-5">
        {logoUrl && (
          <img
            src={logoUrl}
            alt={storeName || "Store"}
            className="max-h-[60px] object-contain mx-auto mb-2"
          />
        )}
        {storeName && (
          <div className="text-sm text-gray-600 mb-2">{storeName}</div>
        )}
        <h1 className="text-2xl font-bold text-gray-900 mt-2">
          {__("Order Summary", "whizmanage")}
        </h1>
      </div>
      {/* Grid Cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
          <h3 className="text-gray-600 text-xs uppercase mb-1">
            {__("Order ID", "whizmanage")}
          </h3>
          <p className="text-base font-semibold text-gray-900">
            #{row?.id ?? ""}
          </p>
        </div>

        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
          <h3 className="text-gray-600 text-xs uppercase mb-1">{__("Date", "whizmanage")}</h3>
          <p className="text-base font-semibold text-gray-900">{dateStr}</p>
        </div>

        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
          <h3 className="text-gray-600 text-xs uppercase mb-1">
            {__("Status", "whizmanage")}
          </h3>
          <p className="text-base font-semibold text-gray-900 uppercase">
            {(__(row?.status, "whizmanage") || row?.status || "-").toString()}
          </p>
        </div>

        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
          <h3 className="text-gray-600 text-xs uppercase mb-1">
            {__("Total", "whizmanage")}
          </h3>
          <p className="text-base font-semibold text-gray-900">
            {getTotal()}{" "}
            <span dangerouslySetInnerHTML={{ __html: currencySymbol }} />
          </p>
        </div>

        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
          <h3 className="text-gray-600 text-xs uppercase mb-1">
            {__("Payment Method", "whizmanage")}
          </h3>
          <p className="text-sm font-semibold text-gray-900">
            {__(row?.payment_method_title, "whizmanage") ||
              row?.payment_method_title ||
              __("UNKNOWN", "whizmanage")}
          </p>
        </div>
      </div>
      {/* Order Items */}
      <div className="mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-2 pb-2 border-b border-gray-200">
          {__("Order Items", "whizmanage")}
        </h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left text-xs uppercase font-semibold text-gray-600 p-2 border-b border-gray-200">
                {__("item", "whizmanage")}
              </th>
              <th className="text-left text-xs uppercase font-semibold text-gray-600 p-2 border-b border-gray-200">
                {__("Quantity", "whizmanage")}
              </th>
              <th className="text-left text-xs uppercase font-semibold text-gray-600 p-2 border-b border-gray-200">
                {__("Unit Price", "whizmanage")}
              </th>
              <th className="text-left text-xs uppercase font-semibold text-gray-600 p-2 border-b border-gray-200">
                {__("Total", "whizmanage")}
              </th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((it, idx) => {
              const qty = Math.max(1, toNumber(it?.quantity));
              const total = toNumber(it?.total);
              const unit = qty ? (total / qty).toFixed(2) : total.toFixed(2);
              return (
                <tr key={idx} className="border-b border-gray-200">
                  <td className="p-2">{it?.name ?? "-"}</td>
                  <td className="p-2">{qty}</td>
                  <td className="p-2">
                    {unit}{" "}
                    <span
                      dangerouslySetInnerHTML={{ __html: currencySymbol }}
                    />
                  </td>
                  <td className="p-2">
                    {total.toFixed(2)}{" "}
                    <span
                      dangerouslySetInnerHTML={{ __html: currencySymbol }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Refunds */}
      {refunds.length > 0 && (
        <div className="mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-2 pb-2 border-b border-gray-200">
            {__("Refunds", "whizmanage")}
          </h2>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left text-xs uppercase font-semibold text-gray-600 p-2 border-b border-gray-200">
                  {__("Reason", "whizmanage")}
                </th>
                <th className="text-left text-xs uppercase font-semibold text-gray-600 p-2 border-b border-gray-200">
                  {__("Date", "whizmanage")}
                </th>
                <th className="text-left text-xs uppercase font-semibold text-gray-600 p-2 border-b border-gray-200">
                  {__("Amount", "whizmanage")}
                </th>
              </tr>
            </thead>
            <tbody>
              {refunds.map((rf, i) => {
                const rdate =
                  rf?.date || rf?.date_created || rf?.date_created_gmt || "";
                const ramt = toNumber(rf?.amount).toFixed(2);
                return (
                  <tr key={i} className="text-red-700 border-b border-gray-200">
                    <td className="p-2">{rf?.reason || __("Refund", "whizmanage")}</td>
                    <td className="p-2">
                      {rdate ? new Date(rdate).toLocaleString() : "-"}
                    </td>
                    <td className="p-2">
                      -{ramt}{" "}
                      <span
                        dangerouslySetInnerHTML={{ __html: currencySymbol }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {/* Addresses */}
      <div className="grid grid-cols-2 gap-5 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="text-base font-semibold text-gray-900 mb-2 pb-2 border-b border-gray-200">
            {__("Shipping Address", "whizmanage")}
          </h3>
          <div className="space-y-1 text-sm">
            <div>
              {shipping?.first_name ?? ""} {shipping?.last_name ?? ""}
            </div>
            <div>
              {shipping?.address_1 ?? ""} {shipping?.address_2 ?? ""}
            </div>
            <div>{shippingCityPost}</div>
            <div>{shipping?.country ?? ""}</div>
            {shipping?.phone && (
              <div>
                <strong>{__("Phone", "whizmanage")}:</strong> {shipping.phone}
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="text-base font-semibold text-gray-900 mb-2 pb-2 border-b border-gray-200">
            {__("Billing Address", "whizmanage")}
          </h3>
          <div className="space-y-1 text-sm">
            <div>
              {billing?.first_name ?? ""} {billing?.last_name ?? ""}
            </div>
            <div>
              {billing?.address_1 ?? ""} {billing?.address_2 ?? ""}
            </div>
            <div>{billingCityPost}</div>
            <div>{billing?.country ?? ""}</div>
            {billing?.phone && (
              <div>
                <strong>{__("Phone", "whizmanage")}:</strong> {billing.phone}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Coupons */}
      {coupons.length > 0 && (
        <div className="bg-green-50 p-3 rounded-lg border border-green-200 mb-6">
          <div className="flex justify-between items-center">
            <strong className="text-green-800">{coupons[0]?.code ?? ""}</strong>
            <strong className="text-green-800">
              -{getDiscount()}{" "}
              <span dangerouslySetInnerHTML={{ __html: currencySymbol }} />
            </strong>
          </div>
        </div>
      )}
      {/* Additional Information */}
      {finalSummaryMetaFields.length > 0 && (
        <div className="mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-2 pb-2 border-b border-gray-200">
            {__("Additional Information", "whizmanage")}
          </h2>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left text-xs uppercase font-semibold text-gray-600 p-2 border-b border-gray-200">
                  {__("Key", "whizmanage")}
                </th>
                <th className="text-left text-xs uppercase font-semibold text-gray-600 p-2 border-b border-gray-200">
                  {__("Value", "whizmanage")}
                </th>
              </tr>
            </thead>
            <tbody>
              {finalSummaryMetaFields.map((m, i) => (
                <tr key={i} className="border-b border-gray-200">
                  <td className="p-2">{m.key}</td>
                  <td className="p-2">{String(m.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Total */}
      <div className="text-center bg-red-50 border-2 border-red-200 rounded-lg p-3">
        <div className="text-sm text-gray-700 mb-1">{__("Total Amount", "whizmanage")}</div>
        <div className="text-2xl font-bold text-red-800">
          {getTotal()}{" "}
          <span dangerouslySetInnerHTML={{ __html: currencySymbol }} />
        </div>
      </div>
    </div>
  );
};

const OrderSummaryModal = ({
  row = {},
  compact = false,
  triggerLabel,
  asChild = false,
  triggerClassName = "",
  children,
}) => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const metaDisc = useDisclosure();

  const toNumber = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };

  const currencySymbol = row?.currency_symbol || window?.currency_symbol || "";
  const orderDate =
    row?.date_created ||
    row?.date_created_gmt ||
    row?.date ||
    row?.date_modified ||
    null;

  const lineItems = Array.isArray(row?.line_items) ? row.line_items : [];
  const refunds = Array.isArray(row?.refunds) ? row.refunds : [];
  const coupons = Array.isArray(row?.coupon_lines) ? row.coupon_lines : [];
  const shipping = row?.shipping || {};
  const billing = row?.billing || {};

  const logoUrl = window?.store_logo;
  const storeName = window?.store_name;

  const getTotal = () => toNumber(row?.total).toFixed(2);
  const getDiscount = () => toNumber(coupons[0]?.discount).toFixed(2);

  // רשימת כל השדות הזמינים - רק מ-listOrdersMetaData
  const allMetaItems = (
    Array.isArray(window?.listOrdersMetaData) ? window.listOrdersMetaData : []
  ).map((it) =>
    typeof it === "string"
      ? { key: it, label: it }
      : { key: it.key, label: it.label || it.key }
  );
  const allMetaKeys = allMetaItems.map((i) => i.key);

  // השדות הנבחרים להצגה - רק מ-summary_meta
  const initialSelected = useMemo(() => {
    return Array.isArray(window?.summary_meta) ? window.summary_meta : [];
  }, []);

  const [selectedMetaKeys, setSelectedMetaKeys] = useState(initialSelected);
  // ✅ משתנה זמני לעריכה
  const [editKeys, setEditKeys] = useState([]);

  const [metaSearch, setMetaSearch] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const [saveError, setSaveError] = useState("");

  // עדכון המשתנה הראשי כשפותחים את הטופס הראשי
  useEffect(() => {
    if (!isOpen) return;
    const configured = Array.isArray(window?.summary_meta)
      ? window.summary_meta
      : [];
    setSelectedMetaKeys(configured);
  }, [isOpen]);

  // ✅ עדכון המשתנה הזמני כשפותחים את מודל העריכה
  useEffect(() => {
    if (metaDisc.isOpen) {
      setEditKeys(selectedMetaKeys);
    }
  }, [metaDisc.isOpen]); // תלות ב-isOpen כדי לאפס בפתיחה

  // השדות להצגה בסיכום - מסוננים לפי summary_meta
  const summaryMetaKeys = Array.isArray(window?.summary_meta)
    ? window.summary_meta
    : [];
  const finalSummaryMetaFields = (row?.meta_data || [])
    .filter((m) => summaryMetaKeys.includes(m.key))
    .map((m) => ({ key: m.key, value: m.value }));

  const saveSelectedMetaKeys = async (keys) => {
    setSavingMeta(true);
    setSaveError("");
    window.summary_meta = keys;
    try {
      const res = await postApi(
        `${window.siteUrl}/wp-json/wm/v1/summary-meta-fields`,
        { keys }
      );
      const data = res?.data;
      if (Array.isArray(data?.keys)) {
        window.summary_meta = data.keys;
        // העדכון כבר נעשה אופטימית, אבל ליתר ביטחון נעדכן שוב מהשרת
        setSelectedMetaKeys(data.keys);
      }
    } catch (e) {
      setSaveError(e?.message || "Failed to save");
    } finally {
      setSavingMeta(false);
    }
  };

  const cityPostcode = (city, postcode, isRtl) => {
    if (!city && !postcode) return "";
    if (city && postcode)
      return isRtl ? `${city} ${postcode}` : `${city}, ${postcode}`;
    return city || postcode || "";
  };

  const printPage = () => {
    const win = window.open("", "_blank");

    const isRtl = (document.documentElement.dir || "ltr") === "rtl";
    const lang = (
      document.documentElement.lang ||
      navigator.language ||
      "en"
    ).toLowerCase();

    win.document.write(`
    <!DOCTYPE html>
    <html dir="${isRtl ? "rtl" : "ltr"}" lang="${lang}">
      <head>
        <meta charset="utf-8" />
        <title>${__("Order Summary", "whizmanage")} - #${row?.id ?? ""}</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body>
        <div id="print-root"></div>
      </body>
    </html>
  `);

    win.document.close();

    const checkTailwind = setInterval(() => {
      if (win.document.getElementById("print-root")) {
        clearInterval(checkTailwind);

        const root = ReactDOM.createRoot(
          win.document.getElementById("print-root")
        );
        root.render(
          <PrintableOrderSummary
            row={row}
            currencySymbol={currencySymbol}
            orderDate={orderDate}
            lineItems={lineItems}
            refunds={refunds}
            coupons={coupons}
            shipping={shipping}
            billing={billing}
            finalSummaryMetaFields={finalSummaryMetaFields}
            logoUrl={logoUrl}
            storeName={storeName}
            getTotal={getTotal}
            getDiscount={getDiscount}
            cityPostcode={cityPostcode}
            toNumber={toNumber}
          />
        );

        setTimeout(() => {
          win.print();
          win.close();
        }, 500);
      }
    }, 100);
  };

  const onTriggerClick = (e) => {
    e?.stopPropagation?.();
    onOpen();
  };

  const triggerNode = (() => {
    if (asChild && children) {
      return (
        <span
          role="button"
          tabIndex={0}
          onClick={onTriggerClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onTriggerClick(e);
          }}
          className={cn("block w-full h-full", triggerClassName)}
        >
          {children}
        </span>
      );
    }
    if (compact) {
      return (
        <Button
          onClick={onOpen}
          variant="light"
          size="sm"
          className="!h-8 px-2"
          title={triggerLabel || __("Order Summary", "whizmanage")}
        >
          <FileText className="size-4" />
        </Button>
      );
    }
    return (
      <Button
        onClick={onOpen}
        variant="outline"
        size="sm"
        className="mr-2 rtl:ml-2 rtl:mr-0 !h-8 flex gap-2"
      >
        <FileText className="size-4" />
        <span>
          {triggerLabel ||
            `${billing?.first_name ?? ""} ${billing?.last_name ?? ""}`.trim()}
        </span>
      </Button>
    );
  })();

  return (
    <>
      {triggerNode}
      {/* ✅ מודל ראשי */}
      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        backdrop="blur"
        placement="top-center"
        isDismissable
        scrollBehavior="inside"
        size="5xl"
        classNames={{
          backdrop: "bg-black/50 backdrop-blur-sm",
          base: "border border-slate-200 dark:border-slate-700 max-h-[90vh]",
          body: "p-0",
          closeButton:
            "hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 rounded-lg",
        }}
        motionProps={{
          variants: {
            enter: {
              y: 0,
              opacity: 1,
              transition: { duration: 0.3, ease: "easeOut" },
            },
            exit: {
              y: -20,
              opacity: 0,
              transition: { duration: 0.2, ease: "easeIn" },
            },
          },
        }}
      >
        <ModalContent className="bg-white dark:bg-slate-900 overflow-hidden shadow-xl">
          {() => (
            <>
              {/* ✅ Header קבוע */}
              <ModalHeader className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700">
                <div className="w-full text-center flex flex-col items-center gap-2 py-3">
                  {logoUrl && (
                    <img
                      src={logoUrl}
                      alt={storeName || "Store"}
                      className="h-8 object-contain"
                    />
                  )}
                  {storeName && (
                    <div className="text-xs text-slate-600 dark:text-slate-300">
                      {storeName}
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <IconBadge
                      icon={ClipboardList}
                      variant="default"
                      size="default"
                    />
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      {__("Order Summary", "whizmanage")}
                    </h2>
                  </div>
                </div>
              </ModalHeader>

              {/* ✅ כרטיסי פרטים */}
              <div className="flex-shrink-0 bg-slate-50 dark:bg-slate-900 p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Hash className="size-3.5 text-fuchsia-600 dark:text-fuchsia-400" />
                      <span className="text-slate-600 dark:text-slate-300 text-xs">
                        {__("Order ID", "whizmanage")}
                      </span>
                    </div>
                    <p className="font-bold text-base text-slate-900 dark:text-white">
                      #{row?.id ?? ""}
                    </p>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Calendar className="size-3.5 text-fuchsia-600 dark:text-fuchsia-400" />
                      <span className="text-slate-600 dark:text-slate-300 text-xs">
                        {__("Date", "whizmanage")}
                      </span>
                    </div>
                    <p className="font-bold text-xs text-slate-900 dark:text-white">
                      {orderDate
                        ? new Date(orderDate).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Package className="size-3.5 text-fuchsia-600 dark:text-fuchsia-400" />
                      <span className="text-slate-600 dark:text-slate-300 text-xs">
                        {__("Status", "whizmanage")}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "capitalize font-semibold px-2 py-0.5 rounded-full text-[10px] w-fit",
                        ORDER_STATUS_KEYS?.[row?.status] ||
                          "bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200"
                      )}
                    >
                      {(__(row?.status, "whizmanage") || row?.status || "—")
                        .toString()
                        .toUpperCase()}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-1.5 mb-1">
                      <CreditCard className="size-3.5 text-fuchsia-600 dark:text-fuchsia-400" />
                      <span className="text-slate-600 dark:text-slate-300 text-xs">
                        {__("Total", "whizmanage")}
                      </span>
                    </div>
                    <p className="font-bold text-base text-slate-900 dark:text-white">
                      {getTotal()}{" "}
                      <span
                        dangerouslySetInnerHTML={{ __html: currencySymbol }}
                      />
                    </p>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-1.5 mb-1">
                      <CreditCard className="size-3.5 text-fuchsia-600 dark:text-fuchsia-400" />
                      <span className="text-slate-600 dark:text-slate-300 text-xs">
                        {__("Payment method", "whizmanage")}
                      </span>
                    </div>
                    <p className="text-xs text-slate-900 dark:text-white font-medium truncate">
                      {__(row?.payment_method_title, "whizmanage") ||
                        row?.payment_method_title ||
                        "-"}
                    </p>
                  </div>
                </div>
              </div>

              {/* ✅ Body עם גלילה */}
              <ScrollShadow
                size={20}
                className="flex-1 overflow-y-auto scrollbar-whiz"
                hideScrollBar={false}
              >
                <ModalBody className="p-6 text-slate-700 dark:text-slate-200">
                  {/* פריטי הזמנה */}
                  <section className="mb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-fuchsia-100 dark:bg-fuchsia-900/30 rounded-lg">
                        <Package className="size-4 text-fuchsia-600 dark:text-fuchsia-400" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {__("Order Items", "whizmanage")}
                      </h3>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                      <div className="divide-y divide-slate-200 dark:divide-slate-700">
                        {lineItems.map((item, idx) => {
                          const qty = Math.max(1, toNumber(item?.quantity));
                          const total = toNumber(item?.total);
                          const unit = qty
                            ? (total / qty).toFixed(2)
                            : total.toFixed(2);
                          return (
                            <div
                              key={idx}
                              className="p-3 hover:bg-fuchsia-50 dark:hover:bg-slate-700 transition-colors"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-slate-900 dark:text-white mb-1">
                                    {item?.name ?? "-"}
                                  </h4>
                                  <p className="text-sm text-slate-500 dark:text-slate-300">
                                    {__("Quantity", "whizmanage")}: {qty}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-slate-900 dark:text-white">
                                    {total.toFixed(2)}{" "}
                                    <span
                                      dangerouslySetInnerHTML={{
                                        __html: currencySymbol,
                                      }}
                                    />
                                  </p>
                                  <p className="text-sm text-slate-500 dark:text-slate-300">
                                    {unit} {__("each", "whizmanage")}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </section>

                  {/* החזרים */}
                  {refunds.length > 0 && (
                    <section className="mb-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                          <Receipt className="size-4 text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                          {__("Refunds", "whizmanage")}
                        </h3>
                      </div>

                      <div className="bg-red-50 dark:bg-red-950/30 overflow-hidden border border-red-200 dark:border-red-800 rounded-xl">
                        <div className="divide-y divide-red-200 dark:divide-red-800">
                          {refunds.map((rf, i) => {
                            const rdate =
                              rf?.date ||
                              rf?.date_created ||
                              rf?.date_created_gmt ||
                              "";
                            const ramt = toNumber(rf?.amount).toFixed(2);
                            return (
                              <div key={rf?.id || i} className="p-3">
                                <div className="flex justify-between">
                                  <div>
                                    <p className="font-semibold text-red-800 dark:text-red-400">
                                      {__("Reason", "whizmanage")}:{" "}
                                      {rf?.reason || __("Refund", "whizmanage")}
                                    </p>
                                    <p className="text-sm text-slate-500 dark:text-slate-300">
                                      {rdate
                                        ? new Date(rdate).toLocaleString()
                                        : "-"}
                                    </p>
                                  </div>
                                  <div className="text-right font-bold text-red-700 dark:text-red-300">
                                    -{ramt}{" "}
                                    <span
                                      dangerouslySetInnerHTML={{
                                        __html: currencySymbol,
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </section>
                  )}

                  {/* כתובות */}
                  <section className="mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-fuchsia-100 dark:bg-fuchsia-900/30 rounded-lg">
                            <MapPin className="size-4 text-fuchsia-600 dark:text-fuchsia-400" />
                          </div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">
                            {__("Shipping Information", "whizmanage")}
                          </h3>
                        </div>
                        <div className="bg-fuchsia-50 dark:bg-slate-800 rounded-xl p-4 border border-fuchsia-200 dark:border-slate-700 space-y-1.5 text-sm">
                          <p className="font-medium text-slate-900 dark:text-white">
                            {shipping?.first_name ?? ""}{" "}
                            {shipping?.last_name ?? ""}
                          </p>
                          <p className="text-slate-600 dark:text-slate-300">
                            {shipping?.address_1} {shipping?.address_2}
                          </p>
                          <p className="text-slate-600 dark:text-slate-300">
                            {cityPostcode(
                              shipping?.city,
                              shipping?.postcode,
                              (document.documentElement.dir || "ltr") === "rtl"
                            )}
                          </p>
                          <p className="text-slate-600 dark:text-slate-300">
                            {shipping?.country}
                          </p>
                          {shipping?.phone && (
                            <p className="text-slate-600 dark:text-slate-300">
                              <span className="font-medium">
                                {__("Phone", "whizmanage")}:
                              </span>{" "}
                              {shipping.phone}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-fuchsia-100 dark:bg-fuchsia-900/30 rounded-lg">
                            <MapPin className="size-4 text-fuchsia-600 dark:text-fuchsia-400" />
                          </div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">
                            {__("Billing Information", "whizmanage")}
                          </h3>
                        </div>
                        <div className="bg-fuchsia-50 dark:bg-slate-800 rounded-xl p-4 border border-fuchsia-200 dark:border-slate-700 space-y-1.5 text-sm">
                          <p className="font-medium text-slate-900 dark:text-white">
                            {billing?.first_name ?? ""}{" "}
                            {billing?.last_name ?? ""}
                          </p>
                          <p className="text-slate-600 dark:text-slate-300">
                            {billing?.address_1} {billing?.address_2}
                          </p>
                          <p className="text-slate-600 dark:text-slate-300">
                            {cityPostcode(
                              billing?.city,
                              billing?.postcode,
                              (document.documentElement.dir || "ltr") === "rtl"
                            )}
                          </p>
                          <p className="text-slate-600 dark:text-slate-300">
                            {billing?.country}
                          </p>
                          {billing?.phone && (
                            <p className="text-slate-600 dark:text-slate-300">
                              <span className="font-medium">
                                {__("Phone", "whizmanage")}:
                              </span>{" "}
                              {billing.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* קופונים */}
                  {coupons.length > 0 && (
                    <section className="mb-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                          <Tag className="size-4 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                          {__("Coupons", "whizmanage")}
                        </h3>
                      </div>
                      <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-3 border border-green-200 dark:border-green-800 flex items-center justify-between">
                        <p className="font-bold text-green-800 dark:text-green-400">
                          {coupons[0]?.code ?? ""}
                        </p>
                        <p className="font-bold text-green-800 dark:text-green-400">
                          -{getDiscount()}{" "}
                          <span
                            dangerouslySetInnerHTML={{ __html: currencySymbol }}
                          />
                        </p>
                      </div>
                    </section>
                  )}

                  {/* מידע נוסף */}
                  <section className="mb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-fuchsia-100 dark:bg-fuchsia-900/30 rounded-lg">
                        <FileText className="size-4 text-fuchsia-600 dark:text-fuchsia-400" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {__("Additional Information", "whizmanage")}
                      </h3>
                    </div>

                    {finalSummaryMetaFields.length > 0 ? (
                      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                        <table
                          className="w-full border-collapse"
                          dir={document.documentElement.dir || "ltr"}
                        >
                          <thead className="bg-slate-50 dark:bg-slate-800">
                            <tr>
                              <th className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 text-left rtl:text-right">
                                {__("Key", "whizmanage")}
                              </th>
                              <th className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 text-left rtl:text-right">
                                {__("Value", "whizmanage")}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {finalSummaryMetaFields.map((m, i) => (
                              <tr
                                key={i}
                                className="bg-white dark:bg-slate-800"
                              >
                                <td className="px-4 py-2 text-slate-900 dark:text-white">
                                  {m.key}
                                </td>
                                <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                                  {String(m.value)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4 text-slate-500 dark:text-slate-300 flex items-center justify-between text-sm">
                        <span>
                          {__("No fields selected or no values found for this order.", "whizmanage")}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={metaDisc.onOpen}
                        >
                          {__("Customize Fields", "whizmanage")}
                        </Button>
                      </div>
                    )}
                  </section>

                  {/* סכום כולל */}
                  <section className="mb-4">
                    <div className="bg-fuchsia-50 dark:bg-slate-800 rounded-xl p-4 border border-fuchsia-200 dark:border-slate-700 space-y-3">
                      {/* סכום ביניים */}
                      <div className="flex items-center justify-between text-sm border-b border-fuchsia-200 dark:border-slate-600 pb-2">
                        <span className="text-slate-600 dark:text-slate-300">
                          {__("Subtotal", "whizmanage")}
                        </span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {(() => {
                            const itemsTotal = lineItems.reduce(
                              (acc, item) => acc + toNumber(item?.total),
                              0
                            );
                            return itemsTotal.toFixed(2);
                          })()}{" "}
                          <span
                            dangerouslySetInnerHTML={{ __html: currencySymbol }}
                          />
                        </span>
                      </div>

                      {/* משלוח */}
                      {toNumber(row?.shipping_total) > 0 && (
                        <div className="flex items-center justify-between text-sm border-b border-fuchsia-200 dark:border-slate-600 pb-2">
                          <span className="text-slate-600 dark:text-slate-300">
                            {__("Shipping", "whizmanage")}
                          </span>
                          <span className="font-medium text-slate-900 dark:text-white">
                            {toNumber(row?.shipping_total).toFixed(2)}{" "}
                            <span
                              dangerouslySetInnerHTML={{
                                __html: currencySymbol,
                              }}
                            />
                          </span>
                        </div>
                      )}

                      {/* סך הכל */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-lg font-bold text-slate-900 dark:text-white">
                          {__("Total Amount", "whizmanage")}
                        </span>
                        <span className="text-2xl font-bold text-fuchsia-600 dark:text-white">
                          {getTotal()}{" "}
                          <span
                            dangerouslySetInnerHTML={{ __html: currencySymbol }}
                          />
                        </span>
                      </div>
                    </div>
                  </section>
                </ModalBody>
              </ScrollShadow>

              {/* ✅ Footer קבוע */}
              <ModalFooter className="flex-shrink-0 border-t border-slate-200 dark:border-slate-700 justify-end gap-3 p-4">
                <Button
                  variant="outline"
                  onClick={metaDisc.onOpen}
                  className="px-4 gap-2"
                  size="sm"
                >
                  <Plus className="size-4" />
                  {__("Customize Fields", "whizmanage")}
                </Button>
                <Button
                  color="primary"
                  onClick={printPage}
                  className="px-6 gap-2 bg-fuchsia-600 hover:bg-fuchsia-700"
                  size="sm"
                >
                  <Printer className="size-4" />
                  {__("Print Order", "whizmanage")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
      {/* ✅ מודל התאמת שדות - מתוקן עם עריכה זמנית */}
      <Modal
        isOpen={metaDisc.isOpen}
        onOpenChange={metaDisc.onOpenChange}
        backdrop="blur"
        placement="center"
        isDismissable
        size="lg"
        classNames={{
          base: "border border-slate-200 dark:border-slate-700",
          closeButton:
            "hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 rounded-lg",
        }}
      >
        <ModalContent className="bg-white dark:bg-slate-900 overflow-hidden shadow-xl">
          {(onClose) => (
            <>
              <ModalHeader>
                <div className="w-full flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <IconBadge
                      icon={FileText}
                      variant="default"
                      size="default"
                    />
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      {__("Customize Fields", "whizmanage")}
                    </h3>
                  </div>
                  <div className="flex gap-2">
                    {/* ✅ שימוש ב-setEditKeys */}
                    <Button
                      variant="flat"
                      size="sm"
                      onClick={() => setEditKeys(allMetaKeys)}
                    >
                      {__("Select All", "whizmanage")}
                    </Button>
                    <Button
                      variant="flat"
                      size="sm"
                      onClick={() => setEditKeys([])}
                    >
                      {__("Clear", "whizmanage")}
                    </Button>
                  </div>
                </div>
              </ModalHeader>

              <ModalBody className="p-6">
                <input
                  type="text"
                  value={metaSearch}
                  onChange={(e) => setMetaSearch(e.target.value)}
                  placeholder={__("Search fields...", "whizmanage")}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-fuchsia-400 mb-4"
                  dir={document.documentElement.dir || "ltr"}
                />

                <div className="max-h-[320px] overflow-auto scrollbar-whiz rounded-lg border border-slate-200 dark:border-slate-700">
                  <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                    {allMetaItems
                      .filter((it) => {
                        const q = metaSearch.trim().toLowerCase();
                        if (!q) return true;
                        return (
                          it.key.toLowerCase().includes(q) ||
                          (it.label || "").toLowerCase().includes(q)
                        );
                      })
                      .map((it) => {
                        // ✅ בדיקה מול editKeys
                        const checked = editKeys.includes(it.key);
                        const preview = (row?.meta_data || []).find(
                          (m) => m.key === it.key
                        )?.value;
                        return (
                          <li
                            key={it.key}
                            className="flex items-center justify-between p-3"
                          >
                            <label className="flex items-center gap-3 cursor-pointer flex-1">
                              <input
                                type="checkbox"
                                checked={checked}
                                // ✅ עדכון editKeys
                                onChange={(e) =>
                                  setEditKeys((prev) =>
                                    e.target.checked
                                      ? Array.from(new Set([...prev, it.key]))
                                      : prev.filter((k) => k !== it.key)
                                  )
                                }
                              />
                              <div className="flex flex-col">
                                <span
                                  className="font-medium text-slate-900 dark:text-white"
                                  dir={document.documentElement.dir || "ltr"}
                                >
                                  {it.label}
                                </span>
                                {preview != null && (
                                  <span
                                    className="text-xs text-slate-500 dark:text-slate-300 truncate max-w-[360px]"
                                    dir={document.documentElement.dir || "ltr"}
                                  >
                                    {String(preview)}
                                  </span>
                                )}
                              </div>
                            </label>
                            <CustomTooltip title={__("Remove", "whizmanage")} instantClose>
                              <button
                                type="button"
                                // ✅ עדכון editKeys
                                onClick={() =>
                                  setEditKeys((prev) =>
                                    prev.filter((k) => k !== it.key)
                                  )
                                }
                                className="ml-3 rtl:mr-3 text-slate-400 hover:text-red-500"
                              >
                                <X className="size-4" />
                              </button>
                            </CustomTooltip>
                          </li>
                        );
                      })}
                  </ul>
                </div>

                {!!saveError && (
                  <div className="mt-3 text-sm text-red-600">{saveError}</div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="ghost" onClick={onClose}>
                    {__("Cancel", "whizmanage")}
                  </Button>
                  <Button
                    color="primary"
                    disabled={savingMeta}
                    onClick={async () => {
                      // ✅ עדכון מיידי של התצוגה במודל הראשי
                      setSelectedMetaKeys(editKeys);
                      await saveSelectedMetaKeys(editKeys);
                      if (!saveError) onClose();
                    }}
                    className="bg-fuchsia-600 hover:bg-fuchsia-700"
                  >
                    {savingMeta ? __("Saving...", "whizmanage") : __("Save", "whizmanage")}
                  </Button>
                </div>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

export default OrderSummaryModal;
