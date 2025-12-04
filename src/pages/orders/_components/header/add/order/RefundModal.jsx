import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Minus,
  Plus,
  X,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Info,
  CreditCard,
  FileText,
} from "lucide-react";
import { useEffect, useState, useMemo, useCallback } from "react";
import { postApi } from "../../../../../../services/services";
import { useOrdersContext } from "@/context/OrdersContext";
import { __ } from '@wordpress/i18n';

const MANUAL_ONLY_GATEWAYS = ["bacs", "cheque", "cod", "bank_transfer", "cash", "offline", "UNKNOWN"];

const GATEWAY_LABELS = {
  paypal: "PayPal",
  "ppcp-gateway": "PayPal (PPCP)",
  stripe: "Stripe",
  stripe_cc: "Stripe",
  stripe_sepa: "Stripe SEPA",
  "woocommerce_payments": "WooPayments",
  square: "Square",
  braintree_cc: "Braintree (Card)",
  braintree_paypal: "Braintree (PayPal)",
  "2checkout": "2Checkout",
  authorize_net_cim: "Authorize.Net",
  klarna_payments: "Klarna",
  afterpay: "Afterpay",
  razorpay: "Razorpay",
  "mollie_wc_gateway_ideal": "Mollie iDEAL",
  "mollie_wc_gateway_creditcard": "Mollie (Card)",
  "mollie_wc_gateway_paypal": "Mollie (PayPal)",
  "payplus-payment-gateway": "PayPlus",
  // הוסף/י כאן בעתיד בקלות
};

const REFUND_REASONS = [
  { value: "defective", label: "Defective item" },
  { value: "wrong_item", label: "Wrong item sent" },
  { value: "not_as_described", label: "Item not as described" },
  { value: "damaged_shipping", label: "Damaged during shipping" },
  { value: "customer_request", label: "Customer request" },
  { value: "duplicate_order", label: "Duplicate order" },
  { value: "other", label: "Other" },
];

/**
 * RefundModal — processes WooCommerce refunds generically (any gateway).
 * - Uses orderData.total as source of truth for amounts (not UI subtotal).
 * - Supports automatic (refund_payment=true) and manual refunds.
 * - Allows partial/full with custom per-line amounts, with guards.
 * - Filters out unsaved/temporary items from refund payload.
 */
const RefundModal = ({
  isOpen,
  onClose,
  orderId,
  lineItems,
  total,
  renderCurrency,
  getProductImage,
  orderData,
}) => {
   
  const [refundItems, setRefundItems] = useState({});
  const [refundAmounts, setRefundAmounts] = useState({});
  const [refundReason, setRefundReason] = useState("");
  const [refundNote, setRefundNote] = useState("");
  const [refundType, setRefundType] = useState("partial"); // 'partial' | 'full'
  const [refundMethod, setRefundMethod] = useState("manual"); // 'manual' | 'automatic'
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);
  const [refundError, setRefundError] = useState("");
  const [refundSuccess, setRefundSuccess] = useState("");
  const { setData } = useOrdersContext();

  // Normalize gateway ids and detect capabilities
  // Normalize gateway ids and detect capabilities
  const paymentInfo = useMemo(() => {
    const normalize = (s) =>
      String(s || "").toLowerCase().replace(/[^a-z0-9_/-]+/g, "");

    const methodId = normalize(orderData?.payment_method);
    const manualOnly = MANUAL_ONLY_GATEWAYS
      .map(normalize)
      .some((g) => methodId.includes(g) || methodId === g);

    // תווית תצוגה יפה
    const pretty =
      GATEWAY_LABELS[methodId] ||
      GATEWAY_LABELS[Object.keys(GATEWAY_LABELS).find((k) => methodId.includes(k)) || ""] ||
      orderData?.payment_method_title ||
      orderData?.payment_method ||
      "Unknown";

    return {
      id: methodId,
      name: orderData?.payment_method_title || orderData?.payment_method || "Unknown",
      label: pretty,
      manualOnly,
      automaticSupported: !manualOnly, // כל מה שלא ידני בלבד — ננסה להחזיר דרכו
    };
  }, [orderData?.payment_method, orderData?.payment_method_title]);

  // Source of truth for order total
  const orderTotal = useMemo(() => {
    const v = parseFloat(orderData?.total ?? total ?? 0);
    return Number.isFinite(v) ? v : 0;
  }, [orderData?.total, total]);

  // Build refunded summary (by item + grand total) from subRows/refunds
  const refundedData = useMemo(() => {
    const itemRefunds = {};
    let totalRefunded = 0;

    if (Array.isArray(orderData?.subRows) && orderData.subRows.length > 0) {
      orderData.subRows.forEach((subRow) => {
        totalRefunded += Math.abs(parseFloat(subRow.total || 0));
        subRow.line_items?.forEach((refundItem) => {
          const refundedItemId = refundItem?.meta_data?.find(
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

    if (Array.isArray(orderData?.refunds) && orderData.refunds.length > 0) {
      const refundsTotal = orderData.refunds.reduce(
        (sum, refund) => sum + Math.abs(parseFloat(refund.amount || 0)),
        0
      );
      if (Math.abs(totalRefunded - refundsTotal) > 0.01) {
        totalRefunded = refundsTotal; // prefer summarized total if mismatch
      }
    }
    return { itemRefunds, totalRefunded };
  }, [orderData?.subRows, orderData?.refunds]);

  // Remaining refundable amount for the entire order
  const remainingRefundableAmount = useMemo(
    () => Math.max(0, orderTotal - refundedData.totalRefunded),
    [orderTotal, refundedData.totalRefunded]
  );

  // Helpers per item
  const getItemRefundInfo = useCallback(
    (itemId) => refundedData.itemRefunds[itemId] || { qty: 0, amount: 0 },
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
    (item) => getAvailableAmount(item) <= 0.01,
    [getAvailableAmount]
  );

  // Reset local state on open — אפס כמות/סכום לכל שורה
  useEffect(() => {
    if (!isOpen) return;

    const zeroQty = {};
    const zeroAmt = {};
    (Array.isArray(lineItems) ? lineItems : []).forEach((it) => {
      zeroQty[it.id] = 0;
      zeroAmt[it.id] = 0;
    });

    setRefundItems(zeroQty);
    setRefundAmounts(zeroAmt);
    setRefundReason("");
    setRefundNote("");
    setRefundType("partial");
    setRefundError("");
    setRefundSuccess("");
    setRefundMethod("manual");
  }, [isOpen, lineItems]);

  // Amount to refund in this operation (מוגבל ליתרה פר פריט וליתרה הכוללת)
  const refundAmount = useMemo(() => {
    if (refundType === "full") {
      return Math.max(0, orderTotal - refundedData.totalRefunded);
    }

    const itemIds = new Set([
      ...Object.keys(refundItems),
      ...Object.keys(refundAmounts),
    ]);
    const sum = Array.from(itemIds).reduce((acc, itemId) => {
      const item = lineItems.find(
        (i) => i.id?.toString() === itemId.toString()
      );
      if (!item) return acc;

      const quantity = parseInt(refundItems[itemId] || 0) || 0;
      const customAmount = refundAmounts[itemId];
      const hasCustom = customAmount !== undefined && customAmount >= 0;
      if (quantity <= 0 && !hasCustom) return acc;

      const itemAvailable = getAvailableAmount(item);
      const defaultAmount = parseFloat(item.price) * quantity;
      const perItemRaw = hasCustom
        ? parseFloat(String(customAmount))
        : defaultAmount;
      const perItemCapped = Math.min(perItemRaw, itemAvailable); // cap per item

      return acc + perItemCapped;
    }, 0);

    // cap by order-level remaining refundable amount
    return Math.min(sum, remainingRefundableAmount);
  }, [
    refundType,
    orderTotal,
    refundedData.totalRefunded,
    refundItems,
    refundAmounts,
    lineItems,
    getAvailableAmount,
    remainingRefundableAmount,
  ]);

  // Quantity change (עדכון כמות + תיקון סכום מותאם אם חורג)
  // Quantity change (עדכון כמות + סנכרון סכום ברירת־מחדל לכמות)
  const handleQuantityChange = useCallback(
    (itemId, quantity) => {
      const item = lineItems.find(
        (i) => i.id?.toString() === itemId.toString()
      );
      if (!item) return;

      const availableQty = getAvailableQty(item);
      const validQuantity = Math.max(
        0,
        Math.min(availableQty, parseInt(quantity) || 0)
      );
      setRefundItems((prev) => ({ ...prev, [itemId]: validQuantity }));

      // חשב סכום ברירת־מחדל לפי הכמות החדשה, עם תקרה לפר־פריט
      const availableAmount = getAvailableAmount(item);
      const defaultAmountForQty = parseFloat(item.price) * validQuantity;

      // אם הכמות 0 – גם הסכום 0; אחרת הגבֵל לתקרה
      const newAmount =
        validQuantity === 0
          ? 0
          : Math.min(defaultAmountForQty, availableAmount);

      setRefundAmounts((prev) => ({
        ...prev,
        [itemId]: newAmount,
      }));
    },
    [lineItems, getAvailableQty, getAvailableAmount]
  );

  // Custom amount field change (כבר מוגבל לתקרה פר פריט)
  const handleAmountChange = useCallback(
    (itemId, amount) => {
      const item = lineItems.find(
        (i) => i.id?.toString() === itemId.toString()
      );
      if (!item) return;

      const quantity = refundItems[itemId] || 0;
      const availableAmount = getAvailableAmount(item);
      const maxAmountForQuantity =
        quantity > 0 ? parseFloat(item.price) * quantity : availableAmount;
      const maxAmount = Math.min(availableAmount, maxAmountForQuantity);

      let value = parseFloat(amount);
      if (!Number.isFinite(value) || value < 0) value = 0;
      if (value > maxAmount) value = maxAmount;

      setRefundAmounts((prev) => ({ ...prev, [itemId]: value }));
    },
    [lineItems, refundItems, getAvailableAmount]
  );

  // Process refund (manual/automatic)
  const processRefund = useCallback(
    async (method) => {
      if (!orderId || !refundReason || refundAmount <= 0) {
        setRefundError(
          __(
            "Please fill all required fields and ensure refund amount is greater than 0",
            "whizmanage"
          )
        );
        return;
      }

      if (
        refundType === "partial" &&
        Object.values(refundItems).every((qty) => qty <= 0) &&
        Object.values(refundAmounts).every((amt) => !amt || amt <= 0)
      ) {
        setRefundError(
          __("Please select at least one item or amount to refund", "whizmanage")
        );
        return;
      }

      setIsProcessingRefund(true);
      setRefundError("");
      setRefundSuccess("");
      setRefundMethod(method);

      try {
        // Build line items payload; skip unsaved/temp items (e.g. Date.now ids)
        const ids = Array.from(
          new Set([...Object.keys(refundItems), ...Object.keys(refundAmounts)])
        );
        const payloadLines =
          refundType === "full"
            ? []
            : ids
                .filter((itemId) => {
                  const quantity = parseInt(refundItems[itemId] || 0) || 0;
                  const custom = refundAmounts[itemId];
                  return quantity > 0 || (custom !== undefined && custom > 0);
                })
                .map((itemId) => {
                  const item = lineItems.find(
                    (i) => i.id?.toString() === itemId.toString()
                  );
                  if (
                    !item ||
                    !Number.isInteger(item.id) ||
                    item.id >= 1_000_000
                  )
                    return null;
                  const quantity = parseInt(refundItems[itemId] || 0) || 0;
                  const customAmount = refundAmounts[itemId];
                  const refundQty = quantity;
                  const refundTotal =
                    customAmount !== undefined && customAmount >= 0
                      ? customAmount
                      : parseFloat(item.price) * refundQty;
                  // cap per line again for safety
                  const cappedTotal = Math.min(
                    refundTotal,
                    getAvailableAmount(item)
                  );
                  return {
                    id: parseInt(String(itemId), 10),
                    qty: refundQty,
                    refund_total: parseFloat(Number(cappedTotal).toFixed(2)),
                  };
                })
                .filter(Boolean);

        const refundData = {
          order_id: orderId,
          amount: Number(refundAmount).toFixed(2),
          reason: refundReason,
          note: refundNote,
          refund_method: method, // for UI/logging
          refund_payment: method === "automatic", // Woo "refund_payment"
          line_items: payloadLines,
        };

        const response = await postApi(
          `${window.siteUrl}/wp-json/whizmanage/v1/refund/`,
          refundData
        );
        const result = response.data;
        console.log(result);

        if (result?.success) {
          const newSubRow = {
            id: result.refund_id,
            total: `-${Number(result.refund_amount).toFixed(2)}`,
            line_items: (refundData.line_items || []).map((li) => ({
              quantity: li.qty,
              total: `-${Number(li.refund_total).toFixed(2)}`,
              meta_data: [{ key: "_refunded_item_id", value: String(li.id) }],
            })),
            source: { ...(result.order?.source || {}) }, // 👈 שורה אחת שמורישה את ה-source מההזמנה
            source: { ...(result.order?.source || {}) }, // 👈 שורה אחת שמורישה את ה-source מההזמנה
          };

          console.log(result);
          console.log(newSubRow);
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
            `${__("Refund processed successfully!", "whizmanage")} ${
              method === "automatic"
                ? __(" (Automatically refunded to payment method)", "whizmanage")
                : __(" (Manual refund - please process payment manually)", "whizmanage")
            }`
          );
          onClose();
        } else {
          console.log(result);

          throw new Error(result?.error || __("Failed to process refund", "whizmanage"));
        }
      } catch (error) {
        console.log(error);
        setRefundError(error?.message || __("Failed to process refund", "whizmanage"));
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
      t,
      setData,
      getAvailableAmount,
    ]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={!isProcessingRefund ? onClose : undefined}
      />
      <div className="relative bg-white dark:bg-slate-900 rounded-lg shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-blue-600" />
            {__("Process Refund for Order", "whizmanage")} #{orderId}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={isProcessingRefund}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Alerts */}
          {refundSuccess && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {refundSuccess}
              </AlertDescription>
            </Alert>
          )}

          {refundError && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {refundError}
              </AlertDescription>
            </Alert>
          )}

          {/* Payment Method Info */}
          {/* Payment Method Info */}
          <div className="bg-slate-50 rounded-lg p-4 border">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-slate-600" />
              <h3 className="font-medium">{__("Payment Method", "whizmanage")}</h3>
            </div>
            <div className="text-sm text-slate-600">
              <span className="font-medium">{paymentInfo.label}</span>
              {paymentInfo.automaticSupported && !paymentInfo.manualOnly && (
                <span className="ml-2 text-green-600 font-medium">
                  {__("Can refund back to this method", "whizmanage")}
                </span>
              )}
              {paymentInfo.manualOnly && (
                <span className="ml-2 text-orange-600 font-medium">
                  {__("Manual refund only", "whizmanage")}
                </span>
              )}
            </div>
          </div>

          {/* Refund Summary */}
          {refundedData.totalRefunded > 0 && (
            <div className="bg-slate-50 rounded-lg p-4 border">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-slate-600" />
                <h3 className="font-medium">{__("Refund Summary", "whizmanage")}</h3>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-slate-600">{__("Order Total:", "whizmanage")}</span>
                  <div className="font-medium">
                    {renderCurrency()}
                    {orderTotal.toFixed(2)}
                  </div>
                </div>
                <div>
                  <span className="text-slate-600">
                    {__("Already Refunded:", "whizmanage")}
                  </span>
                  <div className="font-medium text-red-600">
                    -{renderCurrency()}
                    {refundedData.totalRefunded.toFixed(2)}
                  </div>
                </div>
                <div>
                  <span className="text-slate-600">
                    {__("Available to Refund:", "whizmanage")}
                  </span>
                  <div className="font-medium text-green-600">
                    {renderCurrency()}
                    {remainingRefundableAmount.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Refund Type Selection */}
          <div className="grid grid-cols-2 gap-3">
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
            ].map(({ type, title, description }) => (
              <button
                key={type}
                onClick={() => setRefundType(type)}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  refundType === type
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200"
                } ${type === "full" && remainingRefundableAmount <= 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                disabled={
                  isProcessingRefund ||
                  (type === "full" && remainingRefundableAmount <= 0)
                }
              >
                <div className="font-medium">{title}</div>
                <div className="text-sm text-slate-600">{description}</div>
              </button>
            ))}
          </div>

          {/* Items Selection (Partial) */}
          {refundType === "partial" && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 font-medium border-b">
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-4">{__("Product", "whizmanage")}</div>
                  <div className="col-span-2">{__("Unit Price", "whizmanage")}</div>
                  <div className="col-span-1">{__("Ordered", "whizmanage")}</div>
                  <div className="col-span-1">{__("Refunded", "whizmanage")}</div>
                  <div className="col-span-2">{__("Refund Qty", "whizmanage")}</div>
                  <div className="col-span-2">{__("Custom Amount", "whizmanage")}</div>
                </div>
              </div>

              <div className="divide-y">
                {lineItems.map((item) => {
                  const refundInfo = getItemRefundInfo(item.id);
                  const availableQty = getAvailableQty(item);
                  const availableAmount = getAvailableAmount(item);
                  const refundQty = refundItems[item.id] || 0;
                  const customAmount = refundAmounts[item.id];

                  const maxCustomAmount = Math.min(
                    availableAmount,
                    refundQty > 0
                      ? parseFloat(item.price) * refundQty
                      : availableAmount
                  );

                  const fullyRefunded = isItemFullyRefunded(item);

                  // החזר שיוצג בשורה — מוגבל ליתרה לשורה
                  const displayRefundTotalRaw =
                    customAmount !== undefined && customAmount >= 0
                      ? customAmount
                      : parseFloat(item.price) * refundQty;
                  const displayRefundTotal = Math.min(
                    displayRefundTotalRaw,
                    availableAmount
                  );

                  return (
                    <div
                      key={item.id}
                      className={`p-4 ${fullyRefunded ? "bg-red-50" : ""}`}
                    >
                      <div className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-4 flex items-center gap-3">
                          {getProductImage && getProductImage(item)}
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-slate-500">
                              ID: {item.product_id}
                            </p>
                            <p className="text-xs text-slate-500">
                              {__("Total:", "whizmanage")} {renderCurrency()}
                              {parseFloat(
                                item.total || item.price * item.quantity
                              ).toFixed(2)}
                            </p>
                            {refundInfo.amount > 0 && (
                              <p className="text-xs text-red-500">
                                {__("Refunded:", "whizmanage")} -{renderCurrency()}
                                {refundInfo.amount.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="col-span-2 font-medium">
                          {renderCurrency()}
                          {parseFloat(item.price).toFixed(2)}
                        </div>

                        <div className="col-span-1 text-slate-600">
                          {item.quantity}
                        </div>
                        <div className="col-span-1 text-red-600">
                          {refundInfo.qty > 0 ? refundInfo.qty : "-"}
                        </div>

                        <div className="col-span-2">
                          {fullyRefunded ? (
                            <div className="text-sm text-red-600 font-medium">
                              {__("Fully Refunded", "whizmanage")}
                              <div className="text-xs text-slate-500 mt-1">
                                {__("Available:", "whizmanage")} {renderCurrency()}
                                {availableAmount.toFixed(2)}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() =>
                                  handleQuantityChange(item.id, refundQty - 1)
                                }
                                className="size-7"
                                disabled={refundQty <= 0 || isProcessingRefund}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>

                              <Input
                                type="number"
                                min={0}
                                max={availableQty}
                                value={refundQty}
                                onChange={(e) =>
                                  handleQuantityChange(item.id, e.target.value)
                                }
                                className="w-16 h-7 text-center text-sm"
                                disabled={isProcessingRefund}
                              />

                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() =>
                                  handleQuantityChange(item.id, refundQty + 1)
                                }
                                className="size-7"
                                disabled={
                                  refundQty >= availableQty ||
                                  isProcessingRefund
                                }
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>

                        <div className="col-span-2">
                          {!fullyRefunded && availableAmount > 0.01 ? (
                            <div className="space-y-1">
                              <Input
                                type="number"
                                value={
                                  customAmount !== undefined &&
                                  customAmount >= 0
                                    ? customAmount
                                    : ""
                                }
                                onChange={(e) =>
                                  handleAmountChange(item.id, e.target.value)
                                }
                                min={0}
                                max={maxCustomAmount}
                                className="w-24 h-7 text-sm"
                                disabled={isProcessingRefund}
                              />
                              <p className="text-xs text-slate-500">
                                {__("Max:", "whizmanage")} {renderCurrency()}
                                {maxCustomAmount.toFixed(2)}
                              </p>
                              <p className="text-xs text-blue-600">
                                {__("Will refund:", "whizmanage")} {renderCurrency()}
                                {displayRefundTotal.toFixed(2)}
                              </p>
                            </div>
                          ) : (
                            <div className="text-sm text-red-600 font-medium">
                              {__("No Amount Available", "whizmanage")}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Refund Amount Display */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex justify-between items-center">
              <span className="font-medium">{__("Total Refund Amount", "whizmanage")}</span>
              <span className="text-2xl font-bold text-blue-600">
                {renderCurrency()}
                {refundAmount.toFixed(2)}
              </span>
            </div>
            {refundType === "full" &&
              remainingRefundableAmount !== orderTotal && (
                <div className="mt-2 text-sm text-slate-600">
                  <Info className="w-4 h-4 inline-block mr-1" />
                  {__(
                    "Full refund will include only the remaining refundable amount",
                    "whizmanage"
                  )}
                </div>
              )}
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label>
                {__("Refund Reason", "whizmanage")} <span className="text-red-500">*</span>
              </Label>
              <Select
                value={refundReason}
                onValueChange={setRefundReason}
                disabled={isProcessingRefund}
              >
                <SelectTrigger>
                  <SelectValue placeholder={__("Select refund reason", "whizmanage")} />
                </SelectTrigger>
                <SelectContent>
                  {REFUND_REASONS.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {__(label, "whizmanage")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>
                {__("Refund Note", "whizmanage")}{" "}
                <span className="text-slate-500">{__("(Optional)", "whizmanage")}</span>
              </Label>
              <Textarea
                placeholder={__("Add a note about this refund", "whizmanage")}
                value={refundNote}
                onChange={(e) => setRefundNote(e.target.value)}
                rows={3}
                disabled={isProcessingRefund}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessingRefund}
          >
            {__("Cancel", "whizmanage")}
          </Button>

          <Button
            onClick={() => processRefund("manual")}
            disabled={
              isProcessingRefund ||
              remainingRefundableAmount <= 0 ||
              refundAmount <= 0
            }
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isProcessingRefund && refundMethod === "manual" ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                {__("Processing...", "whizmanage")}
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                {__("Manual Refund", "whizmanage")} ({renderCurrency()}{refundAmount.toFixed(2)})
              </>
            )}
          </Button>

          {paymentInfo.automaticSupported && !paymentInfo.manualOnly && remainingRefundableAmount > 0 && (
            <Button
              onClick={() => processRefund("automatic")}
              disabled={isProcessingRefund || remainingRefundableAmount <= 0 || refundAmount <= 0}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isProcessingRefund && refundMethod === "automatic" ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  {__("Processing...", "whizmanage")}
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  {__("Refund via {{gateway}}", { gateway: paymentInfo.label })} ({renderCurrency()}{refundAmount.toFixed(2)})
                </>
              )}
            </Button>
          )}
        </div>

      </div>
    </div>
  );
};

export default RefundModal;
