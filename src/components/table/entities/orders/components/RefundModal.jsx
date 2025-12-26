// src/components/table/entities/orders/components/RefundModal.jsx

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select-portal";
import { Textarea } from "@/components/ui/textarea";
import { postApi } from "@/services/services";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import {
  AlertTriangle,
  CheckCircle,
  CreditCard,
  FileText,
  Info,
  Minus,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
 import { __ } from "@wordpress/i18n";
import { useEntityStore } from "../orders.config";
import { cn } from "@/lib/utils";
import { IconBadge } from "@components/ui/custom/IconBadge";

// Gateways
const AUTOMATIC_REFUND_GATEWAYS = [
  "paypal",
  "ppcp-gateway",
  "stripe",
  "stripe_cc",
  "stripe_sepa",
  "woocommerce_payments",
  "square",
  "braintree_cc",
  "braintree_paypal",
  "2checkout",
  "authorize_net_cim",
  "klarna_payments",
  "afterpay",
  "razorpay",
  "mollie_wc_gateway_ideal",
  "mollie_wc_gateway_creditcard",
  "mollie_wc_gateway_paypal",
];

const MANUAL_ONLY_GATEWAYS = [
  "bacs",
  "cheque",
  "cod",
  "bank_transfer",
  "cash",
  "offline",
];

const REFUND_REASONS = [
  { value: "defective", label: "Defective item" },
  { value: "wrong_item", label: "Wrong item sent" },
  { value: "not_as_described", label: "Item not as described" },
  { value: "damaged_shipping", label: "Damaged during shipping" },
  { value: "customer_request", label: "Customer request" },
  { value: "duplicate_order", label: "Duplicate order" },
  { value: "other", label: "Other" },
];

const RefundModal = ({
  isOpen,
  onClose,
  orderId,
  lineItems,
  total,
  formatCurrency,
  getProductImage,
  orderData,
}) => {
   
  const [refundItems, setRefundItems] = useState({});
  const [refundAmounts, setRefundAmounts] = useState({});
  const [refundReason, setRefundReason] = useState("");
  const [refundNote, setRefundNote] = useState("");
  const [refundType, setRefundType] = useState("partial");
  const [refundMethod, setRefundMethod] = useState("manual");
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);
  const [refundError, setRefundError] = useState("");
  const [refundSuccess, setRefundSuccess] = useState("");
  const [reasonSelectOpen, setReasonSelectOpen] = useState(false);
  const setData = useEntityStore((state) => state.setData);

  const paymentInfo = useMemo(() => {
    if (!orderData?.payment_method)
      return { name: "Unknown", automaticSupported: false, manualOnly: false };

    const method = orderData.payment_method.toLowerCase();
    const automaticSupported = AUTOMATIC_REFUND_GATEWAYS.some(
      (gateway) => method.includes(gateway) || method === gateway
    );
    const manualOnly = MANUAL_ONLY_GATEWAYS.some(
      (gateway) => method.includes(gateway) || method === gateway
    );

    return {
      name: orderData.payment_method_title || orderData.payment_method,
      automaticSupported,
      manualOnly,
    };
  }, [orderData?.payment_method, orderData?.payment_method_title]);

  const refundedData = useMemo(() => {
    const itemRefunds = {};
    let totalRefunded = 0;

    if (orderData?.subRows?.length > 0) {
      orderData.subRows.forEach((subRow) => {
        totalRefunded += Math.abs(parseFloat(subRow.total || 0));
        subRow.line_items?.forEach((refundItem) => {
          const refundedItemId = refundItem.meta_data?.find(
            (meta) => meta.key === "_refunded_item_id"
          )?.value;
          if (refundedItemId) {
            if (!itemRefunds[refundedItemId]) {
              itemRefunds[refundedItemId] = { qty: 0, amount: 0 };
            }
            itemRefunds[refundedItemId].qty += Math.abs(
              parseInt(refundItem.quantity || 0)
            );
            itemRefunds[refundedItemId].amount += Math.abs(
              parseFloat(refundItem.total || 0)
            );
          }
        });
      });
    }

    if (orderData?.refunds?.length > 0) {
      const refundsTotal = orderData.refunds.reduce(
        (sum, refund) => sum + Math.abs(parseFloat(refund.amount || 0)),
        0
      );
      if (Math.abs(totalRefunded - refundsTotal) > 0.01) {
        totalRefunded = refundsTotal;
      }
    }

    return { itemRefunds, totalRefunded };
  }, [orderData?.subRows, orderData?.refunds]);

  const refundAmount = useMemo(() => {
    if (refundType === "full") {
      return Math.max(0, parseFloat(total) - refundedData.totalRefunded);
    }
    const itemIds = new Set([
      ...Object.keys(refundItems),
      ...Object.keys(refundAmounts),
    ]);
    return Array.from(itemIds).reduce((acc, itemId) => {
      const item = lineItems.find((i) => i.id.toString() === itemId.toString());
      if (!item) return acc;
      const quantity = parseInt(refundItems[itemId] || 0) || 0;
      const customAmount = refundAmounts[itemId];
      const hasCustom = customAmount !== undefined && customAmount >= 0;
      if (quantity <= 0 && !hasCustom) return acc;
      const defaultAmount = parseFloat(item.price) * quantity;
      return acc + (hasCustom ? parseFloat(customAmount) : defaultAmount);
    }, 0);
  }, [
    refundType,
    total,
    refundedData.totalRefunded,
    refundItems,
    refundAmounts,
    lineItems,
  ]);

  const getItemRefundInfo = useCallback(
    (itemId) => {
      return refundedData.itemRefunds[itemId] || { qty: 0, amount: 0 };
    },
    [refundedData.itemRefunds]
  );

  const getAvailableQty = useCallback(
    (item) => {
      const { qty: refundedQty } = getItemRefundInfo(item.id);
      return Math.max(0, parseInt(item.quantity) - refundedQty);
    },
    [getItemRefundInfo]
  );

  const getAvailableAmount = useCallback(
    (item) => {
      const { amount: refundedAmount } = getItemRefundInfo(item.id);
      const originalTotal = parseFloat(
        item.total || item.price * item.quantity
      );
      return Math.max(0, originalTotal - refundedAmount);
    },
    [getItemRefundInfo]
  );

  const isItemFullyRefunded = useCallback(
    (item) => {
      const availableAmount = getAvailableAmount(item);
      return availableAmount <= 0.01;
    },
    [getAvailableAmount]
  );

  useEffect(() => {
    if (isOpen) {
      setRefundItems({});
      setRefundAmounts({});
      setRefundReason("");
      setRefundNote("");
      setRefundType("partial");
      setRefundError("");
      setRefundSuccess("");
      setRefundMethod("manual");
    }
  }, [isOpen]);

  const handleQuantityChange = useCallback(
    (itemId, quantity) => {
      const item = lineItems.find((i) => {
        if (!i || i.id === undefined) return false;
        return i.id.toString() === itemId.toString();
      });
      if (!item) return;

      const availableQty = getAvailableQty(item);
      const validQuantity = Math.max(
        0,
        Math.min(availableQty, parseInt(quantity) || 0)
      );
      setRefundItems((prev) => ({ ...prev, [itemId]: validQuantity }));
    },
    [lineItems, getAvailableQty]
  );

  const handleAmountChange = useCallback(
    (itemId, amount) => {
      const item = lineItems.find((i) => {
        if (!i || i.id === undefined) return false;
        return i.id.toString() === itemId.toString();
      });
      if (!item) return;

      const quantity = refundItems[itemId] || 0;
      const availableAmount = getAvailableAmount(item);
      const maxAmountForQuantity =
        quantity > 0 ? parseFloat(item.price) * quantity : availableAmount;
      const maxAmount = Math.min(availableAmount, maxAmountForQuantity);

      let value = parseFloat(amount);
      if (isNaN(value) || value < 0) value = 0;
      if (value > maxAmount) value = maxAmount;

      setRefundAmounts((prev) => ({ ...prev, [itemId]: value }));
    },
    [lineItems, refundItems, getAvailableAmount]
  );

  const processRefund = useCallback(
    async (method) => {
      if (!orderId || refundAmount <= 0) {
        setRefundError(
          __("Please ensure refund amount is greater than 0", "whizmanage")
        );
        return;
      }
      if (
        refundType === "partial" &&
        Object.values(refundItems).every((qty) => qty <= 0) &&
        Object.values(refundAmounts).every((amt) => !amt || amt <= 0)
      ) {
        setRefundError(__("Please select at least one item or amount to refund", "whizmanage"));
        return;
      }

      setIsProcessingRefund(true);
      setRefundError("");
      setRefundSuccess("");
      setRefundMethod(method);

      try {
        // Get the translated label for the selected reason
        const selectedReason = REFUND_REASONS.find(r => r.value === refundReason);
        const translatedReason = selectedReason ? __(selectedReason.label, "whizmanage") : "";

        const refundData = {
          order_id: orderId,
          amount: refundAmount.toFixed(2),
          reason: translatedReason,
          note: refundNote,
          refund_method: method,
          line_items:
            refundType === "full"
              ? []
              : (() => {
                const ids = Array.from(
                  new Set([
                    ...Object.keys(refundItems),
                    ...Object.keys(refundAmounts),
                  ])
                );
                return ids
                  .filter((itemId) => {
                    const quantity = parseInt(refundItems[itemId] || 0) || 0;
                    const custom = refundAmounts[itemId];
                    return quantity > 0 || (custom !== undefined && custom > 0);
                  })
                  .map((itemId) => {
                    const item = lineItems.find(
                      (i) => i.id.toString() === itemId.toString()
                    );
                    const quantity = parseInt(refundItems[itemId] || 0) || 0;
                    const customAmount = refundAmounts[itemId];
                    const refundQty = quantity;
                    const refundTotal =
                      customAmount !== undefined && customAmount >= 0
                        ? customAmount
                        : parseFloat(item.price) * refundQty;

                    const realItemId = item.line_item_id || item.id;

                    return {
                      id: parseInt(realItemId),
                      qty: refundQty,
                      refund_total: parseFloat(refundTotal.toFixed(2)),
                    };
                  });
              })(),
        };

        const response = await postApi(
          `${window.siteUrl}/wp-json/whizmanage/v1/refund/`,
          refundData
        );
        const result = response.data;

        if (result.success) {
          const newSubRow = {
            id: result.refund_id,
            total: `-${Number(result.refund_amount).toFixed(2)}`,
            line_items: (refundData.line_items || []).map((li) => ({
              quantity: li.qty,
              total: `-${Number(li.refund_total).toFixed(2)}`,
              meta_data: [{ key: "_refunded_item_id", value: String(li.id) }],
            })),
          };

          setData((prev) =>
            prev.map((item) => {
              if (Number(item.id) !== Number(orderId)) return item;

              const prevRefunds = Array.isArray(item.refunds)
                ? item.refunds
                : [];
              const prevSubRows = Array.isArray(item.subRows)
                ? item.subRows
                : [];

              return {
                ...item,
                status: result.order?.status ?? item.status,
                refundedAmount: Number(
                  (
                    Number(item.refundedAmount || 0) +
                    Number(result.refund_amount)
                  ).toFixed(2)
                ),
                refunds: [
                  ...prevRefunds,
                  {
                    id: result.refund_id,
                    amount: Number(result.refund_amount),
                    method,
                    reason: refundReason,
                    note: refundNote,
                    line_items: refundData.line_items || [],
                    date: new Date().toISOString(),
                  },
                ],
                subRows: [...prevSubRows, newSubRow],
              };
            })
          );

          setRefundSuccess(
            `${__("Refund processed successfully!", "whizmanage")} ${method === "automatic"
              ? __(" (Automatically refunded to payment method)", "whizmanage")
              : __(" (Manual refund - please process payment manually)", "whizmanage")
            }`
          );
          setTimeout(onClose, 3000);
        } else {
          throw new Error(result.error || __("Failed to process refund", "whizmanage"));
        }
      } catch (error) {
        console.error(error);
        setRefundError(error.message || __("Failed to process refund", "whizmanage"));
      } finally {
        setIsProcessingRefund(false);
      }
    },
    [
      orderId,
      refundReason,
      refundAmount,
      refundType,
      refundItems,
      refundNote,
      refundAmounts,
      lineItems,
      onClose,
      __,
      setData,
    ]
  );

  const remainingRefundableAmount = Math.max(
    0,
    parseFloat(total) - refundedData.totalRefunded
  );

  return (
    <Modal
      size="4xl"
      scrollBehavior="inside"
      backdrop="blur"
      isOpen={isOpen}
      onClose={() => !isProcessingRefund && onClose()}
      isDismissable={false}
      isKeyboardDismissDisabled={true}
      hideCloseButton
      classNames={{
        backdrop: "z-[9990] bg-black/50 dark:bg-black/70",
        base: "z-[9995] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl max-h-[90vh] overflow-hidden",
        wrapper: "z-[9995]",
        header: "p-0",
        footer: "p-0",
        body: "p-0",
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
      <ModalContent className="dark:bg-slate-900" dir={document.documentElement.dir || "ltr"}>
        <>
          {/* Portal container for Select dropdowns */}
          <div id="radix-select-portal" />

          {/* Header */}
          <ModalHeader className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900">
            <div className="flex items-center gap-3">
              <IconBadge icon={RotateCcw} variant="default" size="default" />
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                  {__("Process Refund", "whizmanage")}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {__("Order", "whizmanage")} #{orderId}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              disabled={isProcessingRefund}
              className="hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </Button>
          </ModalHeader>

          {/* Content */}
          <ModalBody className="p-0 bg-slate-50 dark:bg-slate-900/50">
            <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto scrollbar-whiz">
              {/* Alerts */}
              {refundSuccess && (
                <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertDescription className="text-green-800 dark:text-green-300">
                    {refundSuccess}
                  </AlertDescription>
                </Alert>
              )}

              {refundError && (
                <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <AlertDescription className="text-red-800 dark:text-red-300">
                    {refundError}
                  </AlertDescription>
                </Alert>
              )}

              {/* Payment Method Info */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  <h3 className="font-medium text-slate-900 dark:text-white">
                    {__("Payment Method", "whizmanage")}
                  </h3>
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-300">
                  <span className="font-medium">{paymentInfo.name}</span>
                  {paymentInfo.automaticSupported &&
                    !paymentInfo.manualOnly &&
                    !!orderData.transaction_id?.trim() && (
                      <span className="ms-2 text-green-600 dark:text-green-400 font-medium">
                        {__("(Supports automatic refunds)", "whizmanage")}
                      </span>
                    )}
                  {paymentInfo.manualOnly && !orderData.transaction_id?.trim() && (
                    <span className="ms-2 text-orange-600 dark:text-orange-400 font-medium">
                      {__("(Manual refund only)", "whizmanage")}
                    </span>
                  )}
                </div>
              </div>

              {/* Refund Summary */}
              {refundedData.totalRefunded > 0 && (
                <div className="bg-fuchsia-50 dark:bg-fuchsia-900/20 rounded-xl p-4 border border-fuchsia-200 dark:border-fuchsia-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="w-4 h-4 text-fuchsia-600 dark:text-fuchsia-400" />
                    <h3 className="font-medium text-slate-900 dark:text-white">
                      {__("Refund Summary", "whizmanage")}
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-slate-600 dark:text-slate-300 text-xs">
                        {__("Order Total:", "whizmanage")}
                      </span>
                      <div className="font-semibold text-lg text-slate-900 dark:text-white">
                        {formatCurrency(total)}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-600 dark:text-slate-300 text-xs">
                        {__("Already Refunded:", "whizmanage")}
                      </span>
                      <div className="font-semibold text-lg text-red-600 dark:text-red-400">
                        -{formatCurrency(refundedData.totalRefunded)}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-600 dark:text-slate-300 text-xs">
                        {__("Available to Refund:", "whizmanage")}
                      </span>
                      <div className="font-semibold text-lg text-green-600 dark:text-green-400">
                        {formatCurrency(remainingRefundableAmount)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Refund Type Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" dir={document.documentElement.dir || "ltr"}>
                {[
                  {
                    type: "partial",
                    title: __("Partial Refund", "whizmanage"),
                    description: __("Refund selected items with custom amounts", "whizmanage"),
                  },
                  {
                    type: "full",
                    title: __("Full Refund", "whizmanage"),
                    description:
                      remainingRefundableAmount <= 0
                        ? __("Not available - order fully refunded", "whizmanage")
                        : __("Refund remaining order amount", "whizmanage"),
                  },
                ].map(({ type, title, description }) => {
                  const selected = refundType === type;
                  const disabled =
                    isProcessingRefund ||
                    (type === "full" && remainingRefundableAmount <= 0);
                  return (
                    <button
                      key={type}
                      onClick={() => setRefundType(type)}
                      disabled={disabled}
                      className={cn(
                        "p-4 rounded-xl text-start transition-all border",
                        selected
                          ? "border-fuchsia-500 bg-fuchsia-50/70 dark:bg-fuchsia-900/20 dark:border-fuchsia-600 shadow-sm"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600",
                        disabled && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="font-medium text-slate-900 dark:text-white">
                        {title}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                        {description}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Items Selection */}
              {refundType === "partial" && (
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                  {/* Header */}
                  <div
                    className="bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-800/80 dark:to-slate-800/40 px-5 py-3.5 border-b border-slate-200/80 dark:border-slate-700/80"
                    dir={document.documentElement.dir || "ltr"}
                  >
                    <div className="grid grid-cols-12 gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      <div className="col-span-4 text-start">{__("Product", "whizmanage")}</div>
                      <div className="col-span-2 text-start">{__("Unit Price", "whizmanage")}</div>
                      <div className="col-span-1 text-start">{__("Qty", "whizmanage")}</div>
                      <div className="col-span-1 text-start text-red-500 dark:text-red-400">{__("Ref", "whizmanage")}</div>
                      <div className="col-span-2 text-start">{__("Refund Qty", "whizmanage")}</div>
                      <div className="col-span-2 text-start">{__("Amount", "whizmanage")}</div>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {lineItems.map((item) => {
                      const refundInfo = getItemRefundInfo(item.id);
                      const availableQty = getAvailableQty(item);
                      const availableAmount = getAvailableAmount(item);
                      const refundQty = refundItems[item.id] || 0;
                      const customAmount = refundAmounts[item.id];
                      const refundTotal =
                        customAmount !== undefined && customAmount >= 0
                          ? customAmount
                          : parseFloat(item.price) * refundQty;
                      const maxCustomAmount = Math.min(
                        availableAmount,
                        refundQty > 0
                          ? parseFloat(item.price) * refundQty
                          : availableAmount
                      );
                      const fullyRefunded = isItemFullyRefunded(item);
                      const hasRefund = refundQty > 0 || (customAmount !== undefined && customAmount > 0);

                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "group transition-all duration-200",
                            fullyRefunded
                              ? "bg-red-50/50 dark:bg-red-950/20"
                              : hasRefund
                                ? "bg-fuchsia-50/30 dark:bg-fuchsia-950/10"
                                : "hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                          )}
                        >
                          <div className="px-5 py-4" dir={document.documentElement.dir || "ltr"}>
                            <div className="grid grid-cols-12 gap-3 items-center">
                              {/* Product Info */}
                              <div className="col-span-12 sm:col-span-4 flex items-center gap-3">
                                <div className="relative">
                                  {getProductImage && getProductImage(item)}
                                  {fullyRefunded && (
                                    <div className="absolute -top-1 -end-1 size-4 bg-red-500 rounded-full flex items-center justify-center">
                                      <span className="text-white text-[8px] font-bold">!</span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-slate-900 dark:text-white truncate text-sm">
                                    {item.name}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                                      #{item.product_id}
                                    </span>
                                    <span className="text-[10px] text-slate-300 dark:text-slate-600">•</span>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                      {__("Total:", "whizmanage")} {formatCurrency(item.total || item.price * item.quantity)}
                                    </span>
                                  </div>
                                  {refundInfo.amount > 0 && (
                                    <div className="flex items-center gap-1 mt-1">
                                      <span className="inline-flex items-center gap-1 text-[10px] text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded-full font-medium">
                                        {__("Refunded:", "whizmanage")} {formatCurrency(refundInfo.amount)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Unit Price */}
                              <div className="col-span-6 sm:col-span-2 text-start">
                                <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm">
                                  {formatCurrency(item.price)}
                                </span>
                              </div>

                              {/* Ordered Qty */}
                              <div className="col-span-3 sm:col-span-1 text-start">
                                <span className="inline-flex items-center justify-center size-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-medium">
                                  {item.quantity}
                                </span>
                              </div>

                              {/* Refunded Qty */}
                              <div className="col-span-3 sm:col-span-1 text-start">
                                <span className={cn(
                                  "inline-flex items-center justify-center size-7 rounded-lg text-sm font-medium",
                                  refundInfo.qty > 0
                                    ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                                    : "text-slate-300 dark:text-slate-600"
                                )}>
                                  {refundInfo.qty > 0 ? refundInfo.qty : "—"}
                                </span>
                              </div>

                              {/* Refund Qty Input */}
                              <div className="col-span-6 sm:col-span-2">
                                {fullyRefunded ? (
                                  <div className="flex flex-col items-start gap-0.5">
                                    <span className="text-[10px] font-semibold text-red-500 dark:text-red-400 uppercase tracking-wide">
                                      {__("Fully Refunded", "whizmanage")}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex flex-row items-center justify-start gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleQuantityChange(item.id, refundQty - 1)}
                                      className="size-7 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                      disabled={refundQty <= 0 || isProcessingRefund}
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>

                                    <Input
                                      type="number"
                                      min="0"
                                      max={availableQty}
                                      value={refundQty}
                                      onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                      className="w-12 h-7 text-center text-sm font-medium !py-0 !px-1 rounded-lg border-slate-200 dark:border-slate-700 focus:border-fuchsia-400 focus:ring-fuchsia-400/20"
                                      disabled={isProcessingRefund}
                                      hideArrows
                                    />

                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleQuantityChange(item.id, refundQty + 1)}
                                      className="size-7 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                      disabled={refundQty >= availableQty || isProcessingRefund}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>

                              {/* Custom Amount Input */}
                              <div className="col-span-6 sm:col-span-2">
                                {!fullyRefunded && availableAmount > 0.01 ? (
                                  <Input
                                    type="number"
                                    value={customAmount !== undefined && customAmount >= 0 ? customAmount : ""}
                                    onChange={(e) => handleAmountChange(item.id, e.target.value)}
                                    min={0}
                                    max={maxCustomAmount}
                                    placeholder="0.00"
                                    className="w-full h-7 text-sm font-medium !py-0 rounded-lg border-slate-200 dark:border-slate-700 focus:border-fuchsia-400 focus:ring-fuchsia-400/20"
                                    disabled={isProcessingRefund}
                                  />
                                ) : (
                                  <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium text-start">
                                    {__("N/A", "whizmanage")}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Refund Summary Row */}
                            {!fullyRefunded && availableAmount > 0.01 && hasRefund && (
                              <div className="flex items-center justify-end gap-3 mt-3 pt-3 border-t border-dashed border-slate-200 dark:border-slate-700/50">
                                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                  {__("Max:", "whizmanage")} <span className="font-medium text-slate-500 dark:text-slate-400">{formatCurrency(maxCustomAmount)}</span>
                                </span>
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-fuchsia-600 dark:text-fuchsia-400 bg-fuchsia-100 dark:bg-fuchsia-900/30 px-2.5 py-1 rounded-full">
                                  {__("Will refund:", "whizmanage")} {formatCurrency(refundTotal)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Total Refund Bar */}
              <div
                className="rounded-xl p-5 border-2 bg-gradient-to-r from-fuchsia-50 to-purple-50 dark:from-fuchsia-900/20 dark:to-purple-900/20 border-fuchsia-200 dark:border-fuchsia-800"
                dir={document.documentElement.dir || "ltr"}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {__("Total Refund Amount", "whizmanage")}
                  </span>
                  <span className="text-3xl font-extrabold tracking-tight text-fuchsia-600 dark:text-fuchsia-400">
                    {formatCurrency(refundAmount)}
                  </span>
                </div>
                {refundType === "full" &&
                  remainingRefundableAmount !== parseFloat(total) && (
                    <div className="mt-3 text-sm text-slate-600 dark:text-slate-300 flex items-start gap-2">
                      <Info className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>
                        {__(
                          "Full refund will include only the remaining refundable amount",
                          "whizmanage"
                        )}
                      </span>
                    </div>
                  )}
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label className="text-slate-900 dark:text-white">
                    {__("Refund Reason", "whizmanage")}
                  </Label>
                  <Select
                    dir={document.documentElement.dir || "ltr"}
                    open={reasonSelectOpen}
                    onOpenChange={setReasonSelectOpen}
                    value={refundReason}
                    onValueChange={setRefundReason}
                    disabled={isProcessingRefund}
                    modal={true}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder={__("Select refund reason", "whizmanage")} />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {REFUND_REASONS.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>
                          {__(label, "whizmanage")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {refundReason === "other" && (
                  <div>
                    <Label className="text-slate-900 dark:text-white">
                      {__("Refund Note", "whizmanage")}{" "}
                      <span className="text-slate-500 dark:text-slate-300">
                        {__("(Optional)", "whizmanage")}
                      </span>
                    </Label>
                    <Textarea
                      placeholder={__("Add a note about this refund", "whizmanage")}
                      value={refundNote}
                      onChange={(e) => setRefundNote(e.target.value)}
                      rows={3}
                      disabled={isProcessingRefund}
                      className="mt-1.5"
                    />
                  </div>
                )}
              </div>
            </div>
          </ModalBody>

          {/* Footer */}
          <ModalFooter className="flex flex-col sm:flex-row justify-between gap-3 p-6 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isProcessingRefund}
              className="order-last sm:order-first"
            >
              {__("Cancel", "whizmanage")}
            </Button>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => processRefund("manual")}
                disabled={isProcessingRefund}
                className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white"
              >
                {isProcessingRefund && refundMethod === "manual" ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white me-2" />
                    {__("Processing...", "whizmanage")}
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 me-2" />
                    {__("Manual Refund", "whizmanage")} ({formatCurrency(refundAmount)})
                  </>
                )}
              </Button>

              {paymentInfo.automaticSupported &&
                !paymentInfo.manualOnly &&
                !!orderData.transaction_id?.trim() && (
                  <Button
                    onClick={() => processRefund("automatic")}
                    disabled={isProcessingRefund}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isProcessingRefund && refundMethod === "automatic" ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white me-2" />
                        {__("Processing...", "whizmanage")}
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 me-2" />
                        {__("Auto Refund", "whizmanage")} ({formatCurrency(refundAmount)})
                      </>
                    )}
                  </Button>
                )}
            </div>
          </ModalFooter>
        </>
      </ModalContent>
    </Modal>
  );
};

export default RefundModal;
