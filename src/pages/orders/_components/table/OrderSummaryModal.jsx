import React, { useState } from "react";
import Button from "@components/ui/button";
import { Modal, ModalBody, ModalContent, ModalHeader, useDisclosure } from "@heroui/react";
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
} from "lucide-react";
import { __ } from '@wordpress/i18n';
import { cn } from "@/lib/utils";
import { OrderStatusKeys } from "../../../../data/statusKeys";
import { postApi } from "@/services/services";

const OrderSummaryModal = ({ row }) => {
   
  const { isOpen, onOpen, onOpenChange } = useDisclosure();


  // --- Modal for managing custom fields ---
  const {
    isOpen: isMetaOpen,
    onOpen: onMetaOpen,
    onOpenChange: onMetaOpenChange,
  } = useDisclosure();

  // Parse available meta keys (supports ["key", ...] or [{key,label}, ...])
  const allMetaItemsRaw = Array.isArray(window.listOrdersMetaData) ? window.listOrdersMetaData : [];
  const allMetaItems = allMetaItemsRaw.map((it) =>
    typeof it === "string" ? { key: it, label: it } : { key: it.key, label: it.label || it.key }
  );
  const allMetaKeys = Array.from(new Set(allMetaItems.map((i) => i.key)));

  // Initial selection from window.summary_meta (already set by PHP)
  const initialSelected = Array.isArray(window.summary_meta)
    ? window.summary_meta.filter((k) => allMetaKeys.includes(k))
    : [];

  const [selectedMetaKeys, setSelectedMetaKeys] = useState(initialSelected);
  const [metaSearch, setMetaSearch] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Compute fields to render according to selection
  const finalSummaryMetaFields = (row.meta_data || [])
    .filter((meta) => selectedMetaKeys.includes(meta.key))
    .map((meta) => ({ key: meta.key, value: meta.value }));

  // Save to server + update window
  const saveSelectedMetaKeys = async (keys) => {
    setSavingMeta(true);
    setSaveError("");

    // Update window immediately so UI refreshes
    window.summary_meta = keys;

    try {
      console.log(keys)
      const res = await postApi(`${window.siteUrl}/wp-json/wm/v1/summary-meta-fields`, { keys });
      const data = await res.data;
      if (Array.isArray(data?.keys)) {
        window.summary_meta = data.keys;        // trust server canonical list
        setSelectedMetaKeys(data.keys);
      }
    } catch (e) {
      console.log(e);
      setSaveError(e?.message || "Failed to save");
    } finally {
      setSavingMeta(false);
    }
  };

  const getTotal = () => parseFloat(row.total).toFixed(2);
  const getDiscount = () =>
    row.coupons_data?.length
      ? parseFloat(row.coupons_data[0].discount).toFixed(2)
      : "0.00";

  const shipping = row.shipping || {};
  const billing = row.billing || {};

  const logoUrl = window.store_logo;
  const storeName = window.store_name;

  const printPage = () => {
    const printWindow = window.open("", "_blank");

    const isRTL = document.documentElement.dir === 'rtl';
    const lang = (i18n.language || navigator.language || "en").toLowerCase();

    const printHTML = `
      <!DOCTYPE html>
      <html dir="${isRTL ? "rtl" : "ltr"}" lang="${lang}">
        <head>
          <meta charset="utf-8" />
          <title>${__("Order Summary", "whizmanage")} - #${row.id}</title>
          <style>
            * { margin:0; padding:0; box-sizing:border-box; }
            body {
              font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height:1.6; color:#333; background:white; font-size:14px;
              direction:${isRTL ? "rtl" : "ltr"};
              text-align:${isRTL ? "right" : "left"};
            }
            .print-container { max-width:800px; margin:0 auto; padding:20px; }
            .header { text-align:center; margin-bottom:30px; border-bottom:2px solid #e5e7eb; padding-bottom:20px; }
            .header h1 { font-size:28px; color:#1f2937; margin-bottom:10px; }
            .header p { color:#6b7280; font-size:16px; }
            .header-logo { max-height:60px; margin-bottom:10px; object-fit:contain; }
            .order-info { display:grid; grid-template-columns:repeat(5,1fr); gap:20px; margin-bottom:30px; }
            .info-card { background:#f9fafb; padding:15px; border-radius:8px; border:1px solid #e5e7eb; }
            .info-card h3 { color:#374151; font-size:12px; text-transform:uppercase; letter-spacing:.5px; margin-bottom:5px; }
            .info-card p { font-size:16px; font-weight:600; color:#1f2937; }
            .section { margin-bottom:30px; }
            .section-title { font-size:18px; font-weight:600; color:#1f2937; margin-bottom:15px; padding-bottom:8px; border-bottom:1px solid #e5e7eb; }
            .items-table { width:100%; border-collapse:collapse; margin-bottom:20px; }
            .items-table th, .items-table td { padding:12px; text-align:${isRTL ? "right" : "left"}; border-bottom:1px solid #e5e7eb; }
            .items-table th { background:#f9fafb; font-weight:600; color:#374151; font-size:12px; text-transform:uppercase; letter-spacing:.5px; }
            .items-table .item-name { font-weight:500; }
            .items-table .item-price { text-align:${isRTL ? "left" : "right"}; font-weight:600; }
            .address-section { display:grid; grid-template-columns:repeat(2,1fr); gap:30px; margin-bottom:30px; }
            .address-card { background:#f9fafb; padding:20px; border-radius:8px; border:1px solid #e5e7eb; }
            .address-card h3 { color:#1f2937; font-size:16px; margin-bottom:15px; }
            .address-card p { color:#4b5563; margin-bottom:5px; }
            .address-card .name { font-weight:600; color:#1f2937; }
            .coupon-section { background:#f0fdf4; padding:20px; border-radius:8px; border:1px solid #dcfce7; margin-bottom:30px; }
            .coupon-section h3 { color:#15803d; margin-bottom:10px; }
            .coupon-info { display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap; }
            .coupon-code, .coupon-discount { font-weight:600; color:#166534; }
            .total-section { background:#fef3f2; padding:8px; border-radius:8px; border:2px solid #fecaca; text-align:center; }
            .total-section h3 { color:#991b1b; margin-bottom:10px; font-size:18px; }
            .total-amount { font-size:32px; font-weight:700; color:#991b1b; }
            .footer { margin-top:40px; text-align:center; padding-top:20px; border-top:1px solid #e5e7eb; color:#6b7280; font-size:12px; }
            ${isRTL ? `th, td { direction:rtl; }` : ``}
            @media print {
              body { font-size:12px; }
              .print-container { padding:10px; }
              .header h1 { font-size:24px; }
              .total-amount { font-size:28px; }
              .section { margin-bottom:20px; }
              .address-section { gap:20px; }
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            <div class="header">
              ${logoUrl ? `<img class="header-logo" src="${logoUrl}" alt="${storeName || "Store"}" />` : ""}
              ${storeName ? `<div style="font-weight:600; color:#374151; margin-bottom:6px;">${storeName}</div>` : ""}
              <h1>${__("Order Summary", "whizmanage")}</h1>
            </div>

            <div class="order-info">
              <div class="info-card">
                <h3>${__("Order ID", "whizmanage")}</h3>
                <p>#${row.id}</p>
              </div>
              <div class="info-card">
                <h3>${__("Date", "whizmanage")}</h3>
                <p>${new Date(row.date).toLocaleDateString()}</p>
              </div>
              <div class="info-card">
                <h3>${__("Status", "whizmanage")}</h3>
                <p>${__(row.status, "whizmanage").toUpperCase()}</p>
              </div>
              <div class="info-card">
                <h3>${__("Total", "whizmanage")}</h3>
                <p>${getTotal()} ${row.currency_symbol}</p>
              </div>
              <div class="info-card">
                <h3>${__("Payment Method", "whizmanage")}</h3>
                <p>${__(row.payment_method_title, "whizmanage") || __("UNKNOWN", "whizmanage")}</p>
              </div>
            </div>

            <div class="section">
              <h2 class="section-title">${__("Order Items", "whizmanage")}</h2>
              <table class="items-table">
                <thead>
                  <tr>
                    <th>${__("item", "whizmanage").toUpperCase()}</th>
                    <th>${__("Quantity", "whizmanage")}</th>
                    <th>${__("Unit Price", "whizmanage")}</th>
                    <th>${__("Total", "whizmanage")}</th>
                  </tr>
                </thead>
                <tbody>
                   ${(row.line_items || []).map(item => `
                    <tr>
                      <td class="item-image">
                        ${item.image
                        ? `<img src="${item.image}" alt="${item.name}" style="width:50px;height:50px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb;" />`
                        : `<div style="width:50px;height:50px;border-radius:6px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:12px;">—</div>`
                      }
                      </td>
                      <td class="item-name">${item.name}</td>
                      <td>${item.quantity}</td>
                      <td>${(parseFloat(item.total) / item.quantity).toFixed(2)} ${row.currency_symbol}</td>
                      <td class="item-price">${parseFloat(item.total).toFixed(2)} ${row.currency_symbol}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            ${row.refunds?.length > 0 ? `
              <div class="section">
                <h2 class="section-title">${__("Refunds", "whizmanage")}</h2>
                <table class="items-table">
                  <thead>
                    <tr>
                      <th>${__("Reason", "whizmanage")}</th>
                      <th>${__("Date", "whizmanage")}</th>
                      <th>${__("Amount", "whizmanage")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${row.refunds.map(refund => `
                      <tr style="color:#991b1b;">
                        <td class="item-name">${refund.reason || __("Refund", "whizmanage")}</td>
                        <td>${new Date(refund.date).toLocaleString()}</td>
                        <td class="item-price">- ${parseFloat(refund.amount).toFixed(2)} ${row.currency_symbol}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : ""}

            <div class="address-section">
              <div class="address-card">
                <h3>${__("Shipping Address", "whizmanage")}</h3>
                <p class="name">${shipping?.first_name ?? ""} ${shipping?.last_name ?? ""}</p>
                <p>${shipping?.address_1 ?? ""} ${shipping?.address_2 ?? ""}</p>
                <p>${shipping?.city ?? ""}${shipping?.postcode ? (isRTL ? " " : ", ") + shipping.postcode : ""}</p>
                <p>${shipping?.country ?? ""}</p>
                ${shipping?.phone ? `<p><strong>${__("Phone", "whizmanage")}:</strong> ${shipping.phone}</p>` : ""}
              </div>
              <div class="address-card">
                <h3>${__("Billing Address", "whizmanage")}</h3>
                <p class="name">${billing?.first_name ?? ""} ${billing?.last_name ?? ""}</p>
                <p>${billing?.address_1 ?? ""} ${billing?.address_2 ?? ""}</p>
                <p>${billing?.city ?? ""}${billing?.postcode ? (isRTL ? " " : ", ") + billing.postcode : ""}</p>
                <p>${billing?.country ?? ""}</p>
                ${billing?.phone ? `<p><strong>${__("Phone", "whizmanage")}:</strong> ${billing.phone}</p>` : ""}
              </div>
            </div>

            ${row.coupons_data?.length > 0 ? `
              <div class="coupon-section">
                <h3>${__("Coupons", "whizmanage")}</h3>
                <div class="coupon-info">
                  <p class="coupon-code">${row.coupons_data[0].code}</p>
                  <div class="coupon-discount">-${getDiscount()} ${row.currency_symbol}</div>
                </div>
              </div>
            ` : ""}

            ${finalSummaryMetaFields?.length > 0 ? `
              <div class="section">
                <h2 class="section-title">${__("Additional Information", "whizmanage")}</h2>
                <table class="items-table">
                  <thead>
                    <tr>
                      <th>${__("Key", "whizmanage")}</th>
                      <th>${__("Value", "whizmanage")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${finalSummaryMetaFields.map(meta => `
                      <tr>
                        <td>${meta.key}</td>
                        <td>${meta.value}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
          ` : ""}

            <div class="total-section">
              <h3>${__("Total Amount", "whizmanage")}</h3>
              <div class="total-amount">${getTotal()} ${row.currency_symbol}</div>
            </div>

            <div class="footer">
              <p>${__("generated_on", {
        date: new Date().toLocaleDateString(i18n.language || navigator.language),
        time: new Date().toLocaleTimeString(i18n.language || navigator.language, {
          hour: "2-digit", minute: "2-digit", second: "2-digit",
          ...((i18n.language || "").startsWith("he") ? { hour12: false } : {})
        })
      })}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printHTML);
    printWindow.document.close();

    const tryPrint = () => {
      const imgs = printWindow.document.images;
      if (!imgs.length) return printWindow.print(), printWindow.close();
      let loaded = 0;
      for (const img of imgs) {
        if (img.complete) { loaded++; continue; }
        img.addEventListener("load", () => { if (++loaded === imgs.length) { printWindow.print(); printWindow.close(); } });
        img.addEventListener("error", () => { if (++loaded === imgs.length) { printWindow.print(); printWindow.close(); } });
      }
      if (loaded === imgs.length) { printWindow.print(); printWindow.close(); }
    };
    setTimeout(tryPrint, 200);
  };


  return (
    <>
      {/* כפתור פתיחת המודל */}
      <Button
        onClick={onOpen}
        variant="outline"
        size="sm"
        className="mr-2 rtl:ml-2 rtl:mr-0 !h-8 flex gap-2 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-900/20 transition-all duration-200"
      >
        <FileText className="size-4" />
        <span>{row?.billing?.first_name + " " + row?.billing?.last_name}</span>
      </Button>
      {/* מודל ראשי */}
      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        backdrop="blur"
        placement="top-center"
        isDismissable
        scrollBehavior="inside"
        size="2xl"
        classNames={{
          backdrop: "bg-black/50 backdrop-blur-sm",
          base: "border border-slate-200 dark:border-slate-700",
          body: "p-0",
        }}
        motionProps={{
          variants: {
            enter: { y: 0, opacity: 1, transition: { duration: 0.3, ease: "easeOut" } },
            exit: { y: -20, opacity: 0, transition: { duration: 0.2, ease: "easeIn" } },
          },
        }}
      >
        <ModalContent className="bg-white dark:bg-slate-900 overflow-hidden shadow-xl">
          {(onClose) => (
            <>
              <ModalHeader>
                <div className="w-full text-center flex flex-col items-center gap-2">
                  {logoUrl && (
                    <img
                      src={logoUrl}
                      alt={storeName || "Store"}
                      className="h-10 object-contain"
                      style={{ maxHeight: 40 }}
                    />
                  )}
                  {storeName && (
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      {storeName}
                    </div>
                  )}
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {__("Order Summary", "whizmanage")}
                  </h2>
                </div>
              </ModalHeader>

              {/* Header with Order Info */}
              <div className="relative bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 p-8 border-b border-slate-200 dark:border-slate-700">
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-fuchsia-100 dark:bg-fuchsia-900/30 rounded-xl">
                        <Receipt className="size-6 text-fuchsia-600 dark:text-fuchsia-400" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                          {__("Order Details", "whizmanage")}
                        </h3>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 mb-2">
                        <Hash className="size-4 text-fuchsia-600 dark:text-fuchsia-400" />
                        <span className="text-slate-600 dark:text-slate-400 text-sm">
                          {__("Order ID", "whizmanage")}
                        </span>
                      </div>
                      <p className="font-bold text-lg text-slate-900 dark:text-white">#{row.id}</p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="size-4 text-fuchsia-600 dark:text-fuchsia-400" />
                        <span className="text-slate-600 dark:text-slate-400 text-sm">{__("Date", "whizmanage")}</span>
                      </div>
                      <p className="font-bold text-sm text-slate-900 dark:text-white">
                        {new Date(row.date).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 col-span-2 md:col-span-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="size-4 text-fuchsia-600 dark:text-fuchsia-400" />
                        <span className="text-slate-600 dark:text-slate-400 text-sm">{__("Status", "whizmanage")}</span>
                      </div>
                      <div
                        className={cn(
                          "capitalize font-semibold px-3 py-1 rounded-full text-xs w-fit",
                          OrderStatusKeys[row.status] ||
                          "bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200"
                        )}
                      >
                        {__(row.status, "whizmanage").toUpperCase()}
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="size-4 text-fuchsia-600 dark:text-fuchsia-400" />
                        <span className="text-slate-600 dark:text-slate-400 text-sm">{__("Total", "whizmanage")}</span>
                      </div>
                      <p className="font-bold text-lg text-slate-900 dark:text-white">
                        {getTotal()} <span dangerouslySetInnerHTML={{ __html: row.currency_symbol }} />
                      </p>
                      <p className="text-xs mt-1 text-slate-500 dark:text-slate-400">
                        {__("Payment Method", "whizmanage")}: {__(row.payment_method_title, "whizmanage") || row.payment_method_title || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <ModalBody className="p-8 text-slate-700 dark:text-slate-200">
                {/* Order Items */}
                <section className="mb-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-fuchsia-100 dark:bg-fuchsia-900/30 rounded-lg">
                      <Package className="size-5 text-fuchsia-600 dark:text-fuchsia-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      {__("Order Items", "whizmanage")}
                    </h3>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                    <div className="divide-y divide-slate-200 dark:divide-slate-700">
                      {row.line_items?.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-4 flex items-center gap-4 hover:bg-fuchsia-50 dark:hover:bg-slate-700 transition-colors"
                        >
                          {/* תמונת המוצר */}
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-16 h-16 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                              <Package className="size-6" />
                            </div>
                          )}

                          {/* פרטי המוצר */}
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-900 dark:text-white mb-1">{item.name}</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {__("Quantity", "whizmanage")}: {item.quantity}
                            </p>
                          </div>

                          {/* מחיר */}
                          <div className="text-right">
                            <p className="font-bold text-slate-900 dark:text-white">
                              {parseFloat(item.total).toFixed(2)}{" "}
                              <span dangerouslySetInnerHTML={{ __html: row.currency_symbol }} />
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {(parseFloat(item.total) / item.quantity).toFixed(2)} {__("each", "whizmanage")}
                            </p>
                          </div>
                        </div>
                      ))}

                      {/* Refunds Section */}
                      {row.refunds?.length > 0 && (
                        <section className="mt-8 mb-8">
                          <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                              <Receipt className="size-5 text-red-600 dark:text-red-400" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                              {__("Refunds", "whizmanage")}
                            </h3>
                          </div>

                          <div className="bg-red-50 dark:bg-red-950/30 overflow-hidden border border-red-200 dark:border-red-800">
                            <div className="divide-y divide-red-200 dark:divide-red-800">
                              {row.refunds.map((refund) => (
                                <div key={refund.id} className="p-4">
                                  <div className="flex justify-between">
                                    <div>
                                      <p className="font-semibold text-red-800 dark:text-red-400">
                                        {__("Reason", "whizmanage")}: {refund.reason}
                                      </p>
                                      <p className="text-sm text-slate-500 dark:text-slate-400">
                                        {new Date(refund.date).toLocaleString()}
                                      </p>
                                    </div>
                                    <div className="text-right font-bold text-red-700 dark:text-red-300">
                                      -{parseFloat(refund.amount).toFixed(2)}{" "}
                                      <span dangerouslySetInnerHTML={{ __html: row.currency_symbol }} />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </section>
                      )}
                    </div>
                  </div>
                </section>

                {/* Shipping */}
                <section className="mb-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-fuchsia-100 dark:bg-fuchsia-900/30 rounded-lg">
                      <MapPin className="size-5 text-fuchsia-600 dark:text-fuchsia-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{__("Shipping Information", "whizmanage")}</h3>
                  </div>

                  <div className="bg-fuchsia-50 dark:bg-slate-800 rounded-xl p-6 border border-fuchsia-200 dark:border-slate-700">
                    <div className="space-y-2">
                      <p className="font-medium text-slate-900 dark:text-white">
                        {shipping?.first_name} {shipping?.last_name}
                      </p>
                      <p className="text-slate-600 dark:text-slate-400">
                        {shipping?.address_1} {shipping?.address_2}
                      </p>
                      <p className="text-slate-600 dark:text-slate-400">
                        {shipping?.city}, {shipping?.postcode}
                      </p>
                      <p className="text-slate-600 dark:text-slate-400">{shipping?.country}</p>
                      {shipping?.phone && (
                        <p className="text-slate-600 flex gap-1 dark:text-slate-400">
                          <span className="font-medium">{__("Phone", "whizmanage")}:</span>
                          {shipping?.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </section>

                {/* Billing */}
                <section className="mb-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-fuchsia-100 dark:bg-fuchsia-900/30 rounded-lg">
                      <MapPin className="size-5 text-fuchsia-600 dark:text-fuchsia-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{__("Billing Information", "whizmanage")}</h3>
                  </div>

                  <div className="bg-fuchsia-50 dark:bg-slate-800 rounded-xl p-6 border border-fuchsia-200 dark:border-slate-700">
                    <div className="space-y-2">
                      <p className="font-medium text-slate-900 dark:text-white">
                        {billing?.first_name} {billing?.last_name}
                      </p>
                      <p className="text-slate-600 dark:text-slate-400">
                        {billing?.address_1} {billing?.address_2}
                      </p>
                      <p className="text-slate-600 dark:text-slate-400">
                        {billing?.city}, {billing?.postcode}
                      </p>
                      <p className="text-slate-600 dark:text-slate-400">{billing?.country}</p>
                      {billing?.phone && (
                        <p className="text-slate-600 flex gap-1 dark:text-slate-400">
                          <span className="font-medium">{__("Phone", "whizmanage")}:</span>
                          {billing?.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </section>

                {/* Coupon */}
                {row.coupons_data?.length > 0 && (
                  <section className="mb-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <Tag className="size-5 text-green-600 dark:text-green-400" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">{__("Coupons", "whizmanage")}</h3>
                    </div>

                    <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-4 border border-green-200 dark:border-green-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-green-800 dark:text-green-400">
                            {row.coupons_data[0].code}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-800 dark:text-green-400">
                            -{getDiscount()} <span dangerouslySetInnerHTML={{ __html: row.currency_symbol }} />
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {/* Additional Information (custom fields) */}
                {finalSummaryMetaFields?.length > 0 && (
                  <section className="mb-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <FileText className="size-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        {__("Additional Information", "whizmanage")}
                      </h3>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                      <table className="w-full border-collapse" dir={i18n.dir()}>
                        <thead className="bg-slate-50 dark:bg-slate-800">
                          <tr>
                            <th className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 text-left rtl:text-right">
                              {__("Key", "whizmanage")}
                            </th>
                            <th className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 text-left rtl:text-right">
                              {__("Value", "whizmanage")}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                          {finalSummaryMetaFields.map((meta, idx) => (
                            <tr key={idx} className="bg-white dark:bg-slate-800">
                              <td className="px-4 py-2 text-slate-900 dark:text-white text-left rtl:text-right">
                                {meta.key}
                              </td>
                              <td className="px-4 py-2 text-slate-600 dark:text-slate-300 text-left rtl:text-right">
                                {meta.value}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {/* Total */}
                <section className="border-t-1 border-slate-2 dark:border-slate-700 pt-6 mb-8">
                  <div className="bg-fuchsia-50 dark:!bg-slate-800 rounded-xl p-6 border border-fuchsia-200 dark:border-slate-700">
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-bold text-slate-900 dark:text-white">{__("Total Amount", "whizmanage")}</span>
                      <span className="text-3xl font-bold text-fuchsia-600 dark:text-white">
                        {getTotal()} <span dangerouslySetInnerHTML={{ __html: row.currency_symbol }} />
                      </span>
                    </div>
                  </div>
                </section>

                {/* Actions */}
                <div className="flex gap-4 justify-end pt-4">
                  <Button
                    variant="outline"
                    onClick={onMetaOpen}
                    className="px-4 gap-2 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200"
                  >
                    <Plus className="size-4" />
                    {__("Customize Fields", "whizmanage")}
                  </Button>

                  <Button
                    color="primary"
                    onClick={printPage}
                    className="px-6 gap-2 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-700 transition-all duration-200"
                  >
                    <Printer className="size-4" />
                    {__("Print Order", "whizmanage")}
                  </Button>
                </div>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
      {/* Modal: Customize Meta Fields */}
      <Modal
        isOpen={isMetaOpen}
        onOpenChange={onMetaOpenChange}
        backdrop="blur"
        placement="center"
        isDismissable
        size="lg"
        classNames={{ base: "border border-slate-200 dark:border-slate-700" }}
      >
        <ModalContent className="bg-white dark:bg-slate-900 overflow-hidden shadow-xl">
          {(onCloseMeta) => (
            <>
              <ModalHeader>
                <div className="w-full flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {__("Customize Fields", "whizmanage")}
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      variant="flat"
                      size="sm"
                      onClick={() => setSelectedMetaKeys(allMetaKeys)}
                    >
                      {__("Select All", "whizmanage")}
                    </Button>
                    <Button
                      variant="flat"
                      size="sm"
                      onClick={() => setSelectedMetaKeys([])}
                    >
                      {__("Clear", "whizmanage")}
                    </Button>
                  </div>
                </div>
              </ModalHeader>

              <ModalBody className="p-6">
                {/* Search */}
                <div className="mb-4">
                  <input
                    type="text"
                    value={metaSearch}
                    onChange={(e) => setMetaSearch(e.target.value)}
                    placeholder={__("Search field...", "whizmanage")}
                    className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-fuchsia-400"
                    dir={i18n.dir()}
                  />
                </div>

                {/* List */}
                <div className="max-h-[320px] overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
                  <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                    {allMetaItems
                      .filter((it) => {
                        const q = metaSearch.trim().toLowerCase();
                        if (!q) return true;
                        return it.key.toLowerCase().includes(q) || (it.label || "").toLowerCase().includes(q);
                      })
                      .map((it) => {
                        const checked = selectedMetaKeys.includes(it.key);
                        const preview = (row.meta_data || []).find((m) => m.key === it.key)?.value;
                        return (
                          <li key={it.key} className="flex items-center justify-between p-3">
                            <label className="flex items-center gap-3 cursor-pointer flex-1">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedMetaKeys((prev) => Array.from(new Set([...prev, it.key])));
                                  } else {
                                    setSelectedMetaKeys((prev) => prev.filter((k) => k !== it.key));
                                  }
                                }}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium text-slate-900 dark:text-white" dir={i18n.dir()}>
                                  {it.label}
                                </span>
                                {preview != null && (
                                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[360px]" dir={i18n.dir()}>
                                    {String(preview)}
                                  </span>
                                )}
                              </div>
                            </label>
                            <button
                              type="button"
                              onClick={() => setSelectedMetaKeys((prev) => prev.filter((k) => k !== it.key))}
                              className="ml-3 rtl:mr-3 text-slate-400 hover:text-red-500"
                              title={__("Remove", "whizmanage")}
                            >
                              <X className="size-4" />
                            </button>
                          </li>
                        );
                      })}
                  </ul>
                </div>

                {/* Error */}
                {!!saveError && (
                  <div className="mt-3 text-sm text-red-600">{saveError}</div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="ghost" onClick={onCloseMeta}>
                    {__("Cancel", "whizmanage")}
                  </Button>
                  <Button
                    color="primary"
                    disabled={savingMeta}
                    onClick={async () => {
                      await saveSelectedMetaKeys(selectedMetaKeys);
                      if (!saveError) onCloseMeta();
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
