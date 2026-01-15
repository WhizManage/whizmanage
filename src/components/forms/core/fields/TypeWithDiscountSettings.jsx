// src/components/forms/core/fields/TypeWithDiscountSettings.jsx
import { Settings2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller } from "react-hook-form";
 import { __ } from "@wordpress/i18n";

import { Button } from "@/components/ui/button";
import { IconBadge } from "@/components/ui/custom/IconBadge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Info } from "lucide-react";

import MultiSelectEdit from "@/components/table/components/MultiSelectEdit.jsx";
import CustomTooltip from "@components/ui/nextUI/Tooltip";
import {
  Chip,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import { decodeHtml } from "../../../../utils/formatValue.js";
import { useGenericForm } from "../FormProvider";

/* -------------------------------------------------------------------------- */
/* Utils                                                                      */
/* -------------------------------------------------------------------------- */
const toNumber = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const clampPct = (v) => Math.max(0, Math.min(100, toNumber(v, 0)));

const getCurrencyInfo = () => {
  if (typeof window === "undefined") return { symbol: "$", position: "left" };

  const rawSymbol = window.currencySymbol || window.currency || "$";
  const symbol = decodeHtml(rawSymbol);
  const position = window.currencyPos || "left";

  return { symbol, position };
};

// src/components/forms/core/fields/TypeWithDiscountSettings.jsx

// הוסף את ה-import בראש הקובץ:

/* -------------------------------------------------------------------------- */
/* Discount Type Info Banner                                                  */
/* -------------------------------------------------------------------------- */
export function DiscountTypeInfo({ type, __ }) {
  const info = useMemo(() => {
    switch (type) {
      case "product_adjustment":
        return {
          title: __("Product price adjustment", "whizmanage"),
          description: __(
            "Apply a percentage or fixed discount directly to product prices. The discount is calculated per product unit.",
            "whizmanage"
          ),
          steps: [
            __(
              "Set the discount value and method (percentage or fixed amount)",
              "whizmanage"
            ),
            __("Optionally apply as a coupon to show separately in cart", "whizmanage"),
          ],
        };

      case "cart_adjustment":
        return {
          title: __("Cart total adjustment", "whizmanage"),
          description: __(
            "Apply a percentage or fixed discount to the entire cart total. The discount affects the final cart amount.",
            "whizmanage"
          ),
          steps: [
            __(
              "Set the discount value and method (percentage or fixed amount)",
              "whizmanage"
            ),
            __(
              "Optionally apply as a coupon to show separately in cart totals",
              "whizmanage"
            ),
          ],
        };

      case "bulk_discount":
        return {
          title: __("Bulk quantity discount", "whizmanage"),
          description: __(
            "Offer progressive discounts based on quantity purchased. Create tiers with different discount rates for different quantity ranges.",
            "whizmanage"
          ),
          steps: [
            __("Add tiers with min/max quantities", "whizmanage"),
            __("Set discount type and value for each tier", "whizmanage"),
            __("Optionally add labels to display in cart", "whizmanage"),
          ],
        };

      case "bogo_discount":
        return {
          title: __("Buy X Get Y (BOGO)", "whizmanage"),
          description: __(
            "Classic Buy X Get Y offer - when customer buys X quantity, they get Y quantity at a discount. Perfect for 'Buy 2 Get 1 Free' promotions.",
            "whizmanage"
          ),
          steps: [
            __("Set how many items to buy (X)", "whizmanage"),
            __("Set how many items to get (Y)", "whizmanage"),
            __("Set the discount percentage on Y items", "whizmanage"),
            __("Enable recursive to repeat the offer multiple times", "whizmanage"),
          ],
        };

      case "bxgy_discount":
        return {
          title: __("Buy X Get Y (Different products)", "whizmanage"),
          description: __(
            "Buy specific products (X) and get discount on different products (Y). Great for cross-selling campaigns.",
            "whizmanage"
          ),
          steps: [
            __("Select which products must be bought (Buy side - X)", "whizmanage"),
            __("Select which products get the discount (Get side - Y)", "whizmanage"),
            __("Set quantities and discount percentage", "whizmanage"),
            __("Enable recursive to repeat the offer", "whizmanage"),
          ],
        };

      case "shipping_discount":
        return {
          title: __("Shipping discount", "whizmanage"),
          description: __(
            "Reduce or eliminate shipping costs. Apply percentage or fixed discount to shipping methods.",
            "whizmanage"
          ),
          steps: [
            __("Set the discount value and method", "whizmanage"),
            __("Optionally add a label to show in cart", "whizmanage"),
            __("The discount applies to eligible shipping methods", "whizmanage"),
          ],
        };

      case "spend_bundle":
        return {
          title: __("Spend X Get discount", "whizmanage"),
          description: __(
            "Reward customers for spending more. For every X spent, they get a discount. Example: Spend $100, get $10 off.",
            "whizmanage"
          ),
          steps: [
            __("Set the spending threshold (X)", "whizmanage"),
            __("Set the discount value and method", "whizmanage"),
            __(
              "Enable recursive to apply multiple times (spend $200 = $20 off)",
              "whizmanage"
            ),
            __("Optionally apply as a coupon", "whizmanage"),
          ],
        };

      default:
        return null;
    }
  }, [type, __]);

  if (!info) return null;

  return (
    <div className="rounded-xl border-1 border-fuchsia-200/60 dark:border-fuchsia-800/50 bg-gradient-to-r from-fuchsia-50/50 to-pink-50/50 dark:from-fuchsia-900/15 dark:to-pink-900/15 p-5 shadow-sm">
      <div className="flex items-start gap-3">
        {/* אייקון עם IconBadge */}
        <div className="flex-shrink-0 mt-0.5">
          <IconBadge icon={Info} variant="default" size="default" />
        </div>

        {/* תוכן */}
        <div className="flex-1 min-w-0 space-y-2">
          <h3 className="text-sm font-semibold text-fuchsia-800 dark:text-fuchsia-100">
            {info.title}
          </h3>
          <p className="!mt-0 text-xs text-fuchsia-700 dark:text-fuchsia-200 leading-relaxed">
            {info.description}
          </p>

          {/* שלבים עם מספרים בעיצוב IconBadge */}
          <div className="mt-3 space-y-1.5">
            {info.steps.map((step, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br from-fuchsia-100 to-fuchsia-200 dark:from-fuchsia-900/40 dark:to-fuchsia-800/40 shadow-sm dark:shadow-lg flex items-center justify-center mt-0.5">
                  <span className="text-fuchsia-600 dark:text-fuchsia-400 font-semibold text-[10px]">
                    {idx + 1}
                  </span>
                </span>
                <span className="text-fuchsia-700 dark:text-fuchsia-300 leading-relaxed">
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export const defaultActionsForKind = (kind, prev = {}) => {
  switch (kind) {
    case "product_adjustment":
    case "cart_adjustment":
      return {
        method: prev.method ?? "percentage",
        value: typeof prev.value === "number" ? prev.value : 10,
        apply_as_coupon: !!prev.apply_as_coupon,
        coupon_label: prev.coupon_label ?? "",
      };
    case "bulk_discount":
      return {
        tiers: Array.isArray(prev.tiers) ? prev.tiers : [],
        apply_as_coupon: !!prev.apply_as_coupon,
        coupon_label: prev.coupon_label ?? "",
      };
    case "bogo_discount":
      return {
        x_qty: toNumber(prev.x_qty, 2),
        y_qty: toNumber(prev.y_qty, 1),
        discount_pct: toNumber(prev.discount_pct, 100),
        target_product_ids: Array.isArray(prev.target_product_ids)
          ? prev.target_product_ids
          : [],
        recursive: !!prev.recursive,
      };
    case "bxgy_discount":
      return {
        x_qty: toNumber(prev.x_qty, 1),
        y_qty: toNumber(prev.y_qty, 1),
        discount_pct: toNumber(prev.discount_pct, 100),
        buy_product_ids: Array.isArray(prev.buy_product_ids)
          ? prev.buy_product_ids
          : [],
        get_product_ids: Array.isArray(prev.get_product_ids)
          ? prev.get_product_ids
          : [],
        recursive: !!prev.recursive,
      };
    case "shipping_discount":
      return {
        method: prev.method ?? "percentage",
        value: toNumber(prev.value, 50),
        shipping_methods: Array.isArray(prev.shipping_methods)
          ? prev.shipping_methods
          : [],
        label: typeof prev.label === "string" ? prev.label : "",
      };
    case "spend_bundle":
      return {
        unit_amount: toNumber(prev.unit_amount, 10),
        method: prev.method ?? "fixed",
        value: toNumber(prev.value, 3),
        apply_as_coupon: !!prev.apply_as_coupon,
        coupon_label: prev.coupon_label ?? "",
        recursive: !!prev.recursive,
      };
    default:
      return {};
  }
};

/* -------------------------------------------------------------------------- */
/* UI helpers                                                                 */
/* -------------------------------------------------------------------------- */
function RowGrid({ children }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
  );
}

/* גריד מותאם לשדות מספריים – יכנסו עד 4–5 בשורה במסכים רחבים */
function NumbersGrid({ children }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {children}
    </div>
  );
}

function SummaryPill({ text }) {
  return (
    <span className="inline-flex items-center text-xs rounded-full px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm">
      {text}
    </span>
  );
}

/* כרטיס אלגנטי ל־sections עם תמיכה מלאה בדארק */
function PrettyCard({ title, hint, children }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 backdrop-blur-sm shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </div>
        {hint ? (
          <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
            {hint}
          </div>
        ) : null}
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

/* Input עם Adornment - עם validations */
function InputWithAdornment({
  value,
  onChange,
  type = "number",
  adornmentType = "currency",
  className = "",
  min,
  max,
  ...props
}) {
  const { symbol: currencySymbol, position } = getCurrencyInfo();

  const showCurrencyLeft =
    adornmentType === "currency" &&
    (position === "left" || position === "left_space");
  const showCurrencyRight =
    adornmentType === "currency" &&
    (position === "right" || position === "right_space");

  const showPercentRight = adornmentType === "percent";

  const showLeft = showCurrencyLeft;
  const showRight = showCurrencyRight || showPercentRight;

  const finalMin = min !== undefined ? min : 0;
  const finalMax =
    adornmentType === "percent" ? (max !== undefined ? max : 100) : max;

  const handleChange = (e) => {
    const newValue = e.target.value;

    if (newValue === "") {
      onChange(e);
      return;
    }

    const numValue = Number(newValue);

    if (numValue < 0) {
      e.target.value = 0;
      onChange(e);
      return;
    }

    if (adornmentType === "percent" && numValue > 100) {
      e.target.value = 100;
      onChange(e);
      return;
    }

    onChange(e);
  };

  // Position adornments on the physical right side (for RTL Hebrew layout)
  // Use right-2 for the symbol, and pr-7 for input padding to prevent overlap
  return (
    <div className="relative">
      {showLeft && (
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none"
          dangerouslySetInnerHTML={{ __html: currencySymbol }}
        />
      )}

      <Input
        type={type}
        value={value}
        onChange={handleChange}
        min={finalMin}
        max={finalMax}
        className={`h-10 !rounded-lg ${showLeft ? "!pl-5" : ""} ${showRight ? "!pr-14 ltr:!pr-14" : ""
          } ${className} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
        {...props}
      />

      {showRight && (
        <span className="absolute right-6 ltr:right-6 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
          {showPercentRight ? (
            "%"
          ) : (
            <span dangerouslySetInnerHTML={{ __html: currencySymbol }} />
          )}
        </span>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Pickers: שימוש ב-MultiSelectEdit לבחירת מוצרים                             */
/* -------------------------------------------------------------------------- */

function LocalProductPicker({
  label,
  placeholder,
  selectedIds,
  onChangeIds,
  disabledIds = [],
}) {
   
  // נעטוף במודל "וירטואלי" כדי לספק ל-MultiSelectEdit את ה-row/column שהוא מצפה להם
  const row = { original: { product_ids: selectedIds || [] } };
  const columnName = "product_ids";

  // מיפוי ID לשם מוצר
  const getProductName = (id) => {
    if (Array.isArray(window?.listProduct)) {
      const product = window.listProduct.find((p) => String(p.id) === String(id));
      if (product) return product.name || product.title || `#${id}`;
    }
    return `#${id}`;
  };

  const removeProduct = (idToRemove) => {
    const newIds = (selectedIds || []).filter(
      (id) => String(id) !== String(idToRemove)
    );
    onChangeIds(newIds);
  };

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
        {label}
      </div>
      {/* chips של המוצרים שנבחרו */}
      <div className="flex flex-wrap gap-2 min-h-10 items-center bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2">
        {selectedIds && selectedIds.length > 0 ? (
          selectedIds.map((id) => {
            const productName = getProductName(id);
            return (
              <CustomTooltip key={id} title={productName}>
                <Chip
                  onClose={() => removeProduct(id)}
                  variant="flat"
                  classNames={{
                    base: "bg-gradient-to-br from-fuchsia-50 dark:from-slate-800 to-fuchsia-200 dark:to-slate-700 max-w-[120px]",
                    content: "text-fuchsia-600 dark:text-slate-300 truncate",
                    closeButton: "text-fuchsia-600 dark:text-slate-300",
                  }}
                >
                  {productName}
                </Chip>
              </CustomTooltip>
            );
          })
        ) : (
          <div className="font-extralight text-sm text-muted-foreground px-2">
            {__("No products selected", "whizmanage")}
          </div>
        )}
      </div>
      <MultiSelectEdit
        row={row}
        columnName={columnName}
        label={label}
        placeholder={placeholder}
        onClose={() => { }}
        onValueChange={(arr) => {
          const ids = Array.isArray(arr)
            ? arr.map((x) => (typeof x === "object" ? x.id : x))
            : [];
          onChangeIds(ids);
        }}
        autoFocus={false}
        editOptions={{
          source: "products",
          creatable: false,
          namesField: "product_names",
          disabledIds,
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Coupon-row helpers                                                          */
/* -------------------------------------------------------------------------- */
function ApplyAsCouponRow({
  checked,
  onChange,
  labelValue,
  setLabelValue,
  __,
  id,
}) {
  return (
    <div className="flex items-center flex-wrap gap-3">
      <div className="flex items-center gap-2">
        <Switch
          id={id}
          checked={!!checked}
          onCheckedChange={onChange}
          aria-labelledby={`${id}-label`}
        />
        <label
          id={`${id}-label`}
          htmlFor={id}
          className="text-sm select-none cursor-pointer text-slate-900 dark:text-slate-100 font-medium"
        >
          {__("Apply as coupon", "whizmanage")}
        </label>
      </div>
      {!!checked && (
        <Input
          className="h-9 w-full sm:w-72"
          value={labelValue ?? ""}
          onChange={(e) => setLabelValue(e.target.value)}
          placeholder={__("Coupon label (optional)", "whizmanage")}
          onKeyDown={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Discount body UI                                                            */
/* -------------------------------------------------------------------------- */
export function DiscountActionsBody({ type, local, setLocal, __ }) {
  const wrap = (inner) => (
    <div className="space-y-6">
      <PrettyCard
        title={__("Discount details", "whizmanage")}
        hint={__("Configure discount parameters", "whizmanage")}
      >
        <div className="space-y-5">{inner}</div>
      </PrettyCard>
    </div>
  );

  if (!local) {
    return (<div className="text-sm text-muted-foreground">{__("Not configured", "whizmanage")}</div>);
  }

  /* ----------------------- Product/Cart adjustment ----------------------- */
  if (type === "product_adjustment" || type === "cart_adjustment") {
    const id = "apply-as-coupon-a";
    return wrap(
      <>
        <NumbersGrid>
          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
              {__("Value", "whizmanage")}
            </label>
            <InputWithAdornment
              autoFocus
              type="number"
              step="0.01"
              min={0}
              max={local.method === "percentage" ? 100 : undefined}
              className="h-10"
              value={local.value ?? 0}
              onChange={(e) =>
                setLocal((p) => ({ ...p, value: toNumber(e.target.value, 0) }))
              }
              adornmentType={
                local.method === "percentage" ? "percent" : "currency"
              }
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
              {__("Discount method", "whizmanage")}
            </label>
            <Select
              value={local.method || "percentage"}
              onValueChange={(value) =>
                setLocal((p) => ({ ...p, method: value }))
              }
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">{__("Percentage", "whizmanage")}</SelectItem>
                <SelectItem value="fixed">{__("Fixed amount", "whizmanage")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </NumbersGrid>

        <Separator className="bg-slate-200 dark:bg-slate-700" />

        <ApplyAsCouponRow
          id={id}
          checked={!!local.apply_as_coupon}
          onChange={(v) => setLocal((p) => ({ ...p, apply_as_coupon: v }))}
          labelValue={local.coupon_label ?? ""}
          setLabelValue={(v) => setLocal((p) => ({ ...p, coupon_label: v }))}
          __={__}
        />
      </>
    );
  }

  /* ------------------------------- Bulk tiers ---------------------------- */
  if (type === "bulk_discount") {
    const id = "apply-as-coupon-bulk";
    return wrap(
      <>
        {/* נשאר כמו שהיה – העורך המפורט של הטיירים */}
        {/* אתה כבר מחזיק BulkTiersEditor, אז לא משנים את פריסתו */}
        {/* נניח שהוא מיובא/מוגדר למעלה – אם לא, השאר את המימוש הקיים שלך */}
        <BulkTiersEditor
          __={__}
          tiers={local.tiers || []}
          onChange={(tiers) => setLocal((p) => ({ ...p, tiers }))}
        />
        <Separator className="bg-slate-200 dark:bg-slate-700" />
        <ApplyAsCouponRow
          id={id}
          checked={!!local.apply_as_coupon}
          onChange={(v) => setLocal((p) => ({ ...p, apply_as_coupon: v }))}
          labelValue={local.coupon_label ?? ""}
          setLabelValue={(v) => setLocal((p) => ({ ...p, coupon_label: v }))}
          __={__}
        />
      </>
    );
  }

  /* --------------------------------- BOGO -------------------------------- */
  if (type === "bogo_discount") {
    return wrap(
      <>
        <NumbersGrid>
          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
              {__("Buy quantity (BOGO)", "whizmanage")}
            </label>
            <Input
              autoFocus
              type="number"
              min={1}
              className="h-10"
              value={local.x_qty ?? 0}
              onChange={(e) =>
                setLocal((p) => ({ ...p, x_qty: toNumber(e.target.value, 1) }))
              }
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
              {__("Get quantity", "whizmanage")}
            </label>
            <Input
              type="number"
              min={1}
              className="h-10"
              value={local.y_qty ?? 0}
              onChange={(e) =>
                setLocal((p) => ({ ...p, y_qty: toNumber(e.target.value, 1) }))
              }
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
              {__("Discount (%)", "whizmanage")}
            </label>
            <InputWithAdornment
              type="number"
              min={0}
              max={100}
              className="h-10"
              value={local.discount_pct ?? 100}
              onChange={(e) =>
                setLocal((p) => ({
                  ...p,
                  discount_pct: toNumber(e.target.value, 100),
                }))
              }
              adornmentType="percent"
            />
          </div>
        </NumbersGrid>

        <Separator className="bg-slate-200 dark:bg-slate-700" />

        <div className="mt-1 flex items-center gap-2">
          <Switch
            id="bogo-recursive"
            checked={!!local.recursive}
            onCheckedChange={(v) => setLocal((p) => ({ ...p, recursive: v }))}
          />
          <label
            htmlFor="bogo-recursive"
            className="text-sm cursor-pointer select-none text-slate-900 dark:text-slate-100 font-medium"
          >
            {__("Repeat the offer (recursive)", "whizmanage")}
          </label>
        </div>
      </>
    );
  }

  /* --------------------------------- BXGY -------------------------------- */
  if (type === "bxgy_discount") {
    const buyIds = Array.isArray(local.buy_product_ids)
      ? local.buy_product_ids
      : [];
    const getIds = Array.isArray(local.get_product_ids)
      ? local.get_product_ids
      : [];

    return (
      <div className="space-y-6">
        <PrettyCard
          title={__("Discount details", "whizmanage")}
          hint={__("Configure discount parameters", "whizmanage")}
        >
          <NumbersGrid>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                {__("Buy quantity (X)", "whizmanage")}
              </label>
              <Input
                autoFocus
                type="number"
                min={1}
                className="h-10"
                value={local.x_qty ?? 1}
                onChange={(e) =>
                  setLocal((p) => ({
                    ...p,
                    x_qty: toNumber(e.target.value, 1),
                  }))
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                {__("Get quantity (Y)", "whizmanage")}
              </label>
              <Input
                type="number"
                min={1}
                className="h-10"
                value={local.y_qty ?? 1}
                onChange={(e) =>
                  setLocal((p) => ({
                    ...p,
                    y_qty: toNumber(e.target.value, 1),
                  }))
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                {__("Discount on Y (%)", "whizmanage")}
              </label>
              <InputWithAdornment
                type="number"
                min={0}
                max={100}
                className="h-10"
                value={local.discount_pct ?? 100}
                onChange={(e) =>
                  setLocal((p) => ({
                    ...p,
                    discount_pct: toNumber(e.target.value, 100),
                  }))
                }
                adornmentType="percent"
              />
            </div>
          </NumbersGrid>
        </PrettyCard>
        <PrettyCard
          title={__("Products", "whizmanage")}
          hint={__(
            "Choose which products must be bought (X) and which are discounted (Y)",
            "whizmanage"
          )}
        >
          <RowGrid>
            <div>
              <div className="text-[11px] text-muted-foreground mb-1">
                {__("Buy side (X) — the trigger products", "whizmanage")}
              </div>
              <LocalProductPicker
                label={__("Buy products", "whizmanage")}
                placeholder={__("Select buy products", "whizmanage")}
                selectedIds={buyIds}
                disabledIds={getIds.map(String)}
                onChangeIds={(ids) =>
                  setLocal((p) => ({ ...p, buy_product_ids: ids }))
                }
              />
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground mb-1">
                {__("Get side (Y) — discounted products", "whizmanage")}
              </div>
              <LocalProductPicker
                label={__("Get products", "whizmanage")}
                placeholder={__("Select get products", "whizmanage")}
                selectedIds={getIds}
                disabledIds={buyIds.map(String)}
                onChangeIds={(ids) =>
                  setLocal((p) => ({ ...p, get_product_ids: ids }))
                }
              />
            </div>
          </RowGrid>
        </PrettyCard>
        <div className="mt-1 flex items-center gap-2">
          <Switch
            id="bxgy-recursive"
            checked={!!local.recursive}
            onCheckedChange={(v) => setLocal((p) => ({ ...p, recursive: v }))}
          />
          <label
            htmlFor="bxgy-recursive"
            className="text-sm cursor-pointer select-none text-slate-900 dark:text-slate-100 font-medium"
          >
            {__("Repeat the offer (recursive)", "whizmanage")}
          </label>
        </div>
      </div>
    );
  }

  /* --------------------------- Shipping discount -------------------------- */
  if (type === "shipping_discount") {
    return wrap(
      <>
        <NumbersGrid>
          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
              {__("Value", "whizmanage")}
            </label>
            <InputWithAdornment
              autoFocus
              type="number"
              step="0.01"
              min={0}
              max={local.method === "percentage" ? 100 : undefined}
              className="h-10"
              value={local.value ?? 0}
              onChange={(e) =>
                setLocal((p) => ({ ...p, value: toNumber(e.target.value, 0) }))
              }
              adornmentType={
                local.method === "percentage" ? "percent" : "currency"
              }
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
              {__("Method", "whizmanage")}
            </label>
            <Select
              value={local.method || "percentage"}
              onValueChange={(value) =>
                setLocal((p) => ({ ...p, method: value }))
              }
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">{__("Percentage", "whizmanage")}</SelectItem>
                <SelectItem value="fixed">{__("Fixed amount", "whizmanage")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </NumbersGrid>

        <Separator className="bg-slate-200 dark:bg-slate-700" />

        <div>
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
            {__("Label (optional)", "whizmanage")}
          </label>
          <Input
            className="h-10 w-full sm:w-72"
            placeholder={__("Shown in totals optionally", "whizmanage")}
            value={local.label ?? ""}
            onChange={(e) => setLocal((p) => ({ ...p, label: e.target.value }))}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
      </>
    );
  }

  /* ------------------------------ Spend bundle ---------------------------- */
  if (type === "spend_bundle") {
    const id = "apply-as-coupon-spend";
    return wrap(
      <>
        <NumbersGrid>
          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
              {__("Spend (X)", "whizmanage")}
            </label>
            <InputWithAdornment
              autoFocus
              type="number"
              step="0.01"
              min={0.01}
              className="h-10"
              value={local.unit_amount ?? 10}
              onChange={(e) =>
                setLocal((p) => ({
                  ...p,
                  unit_amount: toNumber(e.target.value, 10),
                }))
              }
              adornmentType="currency"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
              {__("Discount method", "whizmanage")}
            </label>
            <Select
              value={local.method || "fixed"}
              onValueChange={(value) =>
                setLocal((p) => ({ ...p, method: value }))
              }
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">{__("Fixed amount", "whizmanage")}</SelectItem>
                <SelectItem value="percentage">{__("Percentage", "whizmanage")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
              {local.method === "percentage"
                ? __("Value (%)", "whizmanage")
                : __("Value (amount)", "whizmanage")}
            </label>
            <InputWithAdornment
              type="number"
              step="0.01"
              min={0}
              max={local.method === "percentage" ? 100 : undefined}
              className="h-10"
              value={local.value ?? 0}
              onChange={(e) =>
                setLocal((p) => ({ ...p, value: toNumber(e.target.value, 0) }))
              }
              adornmentType={
                local.method === "percentage" ? "percent" : "currency"
              }
            />
          </div>
        </NumbersGrid>

        <Separator className="bg-slate-200 dark:bg-slate-700" />

        <ApplyAsCouponRow
          id={id}
          checked={!!local.apply_as_coupon}
          onChange={(v) => setLocal((p) => ({ ...p, apply_as_coupon: v }))}
          labelValue={local.coupon_label ?? ""}
          setLabelValue={(v) => setLocal((p) => ({ ...p, coupon_label: v }))}
          __={__}
        />

        <div className="mt-1 flex items-center gap-2">
          <Switch
            id="spend-recursive"
            checked={!!local.recursive}
            onCheckedChange={(v) => setLocal((p) => ({ ...p, recursive: v }))}
          />
          <label
            htmlFor="spend-recursive"
            className="text-sm cursor-pointer select-none text-slate-900 dark:text-slate-100 font-medium"
          >
            {__("Repeat per bundle (recursive)", "whizmanage")}
          </label>
        </div>
      </>
    );
  }

  return (
    <div className="text-sm text-slate-500 dark:text-slate-300 text-center py-8">
      {__("Select a type to configure discount details", "whizmanage")}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Field: Type + settings button                                               */
/* -------------------------------------------------------------------------- */
export default function TypeWithDiscountSettings({
  name = "type",
  label = "Type",
  rules,
  options = [],
  actionsField = "actions",
}) {
   
  const { control, watch, setValue } = useGenericForm();

  const type = watch(name) || (options[0]?.value ?? "product_adjustment");
  const actions = watch(actionsField);

  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState(() =>
    defaultActionsForKind(type, actions || {})
  );
  const isOpen = open;
  const onOpenChange = setOpen;
  const isLoading = false;

  useEffect(() => {
    if (actions) {
      setLocal(defaultActionsForKind(type, actions));
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setLocal(defaultActionsForKind(type, actions || {}));
  }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

  const summary = useMemo(() => {
    const a = actions || local;
    if (!a) return __("Not configured", "whizmanage");

    switch (type) {
      case "product_adjustment":
      case "cart_adjustment":
        return `${a.method === "percentage" ? a.value + "%" : a.value}${a.apply_as_coupon ? " • coupon" : ""
          }`;
      case "bulk_discount":
        return `${(a.tiers || []).length} ${__("tiers", "whizmanage")}${a.apply_as_coupon ? " • coupon" : ""
          }`;
      case "bogo_discount":
        return `BOGO ${a.x_qty || 0}/${a.y_qty || 0} • ${a.discount_pct || 0}%`;
      case "bxgy_discount":
        return `BXGY ${a.x_qty || 0}/${a.y_qty || 0} • ${a.discount_pct || 0}%`;
      case "shipping_discount":
        return `${a.method === "percentage" ? a.value + "%" : a.value} ${__("shipping", "whizmanage")}`;
      case "spend_bundle":
        return `${__("Spend", "whizmanage")} ${a.unit_amount} → ${a.method === "percentage" ? a.value + "%" : a.value
          }${a.apply_as_coupon ? " • coupon" : ""}`;
      default:
        return __("Not configured", "whizmanage");
    }
  }, [type, actions, local, __]);

  const onOpen = () => {
    if (!local) {
      setLocal(defaultActionsForKind(type, actions || {}));
    }
    setOpen(true);
  };

  // Handler לסגירת המודל - מונע סגירה כשיש Select/Popover פתוח
  const handleOpenChange = (openState) => {
    if (!openState) {
      const activePopper = document.querySelector(
        "[data-radix-popper-content-wrapper]"
      );
      if (activePopper) {
        return;
      }
    }
    setOpen(openState);
  };

  const onSave = () => {
    if (local) {
      const normalized =
        type === "product_adjustment" || type === "cart_adjustment"
          ? {
            ...local,
            value:
              local.method === "percentage"
                ? clampPct(local.value ?? 0)
                : (local.value ?? 0),
          }
          : type === "shipping_discount"
            ? {
              ...local,
              value:
                local.method === "percentage"
                  ? clampPct(local.value ?? 0)
                  : (local.value ?? 0),
            }
            : type === "spend_bundle"
              ? {
                ...local,
                value:
                  local.method === "percentage"
                    ? clampPct(local.value ?? 0)
                    : (local.value ?? 0),
              }
              : type === "bogo_discount" || type === "bxgy_discount"
                ? { ...local, discount_pct: clampPct(local.discount_pct ?? 100) }
                : local;

      setValue(actionsField, normalized, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
    setOpen(false);
  };

  const handleTypeChange = (newType) => {
    setValue(name, newType, { shouldValidate: true, shouldDirty: true });
  };

  const discountTypes =
    options.length > 0
      ? options
      : [
        { value: "product_adjustment", label: "Product adjustment" },
        { value: "cart_adjustment", label: "Cart adjustment" },
        { value: "bulk_discount", label: "Bulk discount" },
        { value: "bogo_discount", label: "BOGO" },
        { value: "bxgy_discount", label: "BXGY" },
        { value: "shipping_discount", label: "Shipping discount" },
        { value: "spend_bundle", label: "Spend bundle" },
      ];

  return (
    <div className="flex flex-col w-full gap-3 px-2">
      {label && (
        <Label htmlFor={name}>
          {__(label, "whizmanage")}
          {rules?.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <div className="flex w-full flex-col gap-3">
        <div className="flex w-full flex-wrap gap-2 items-center">
          <Controller
            name={name}
            control={control}
            rules={rules}
            defaultValue={discountTypes[0]?.value}
            render={({ field, fieldState: { error } }) => (
              <>
                <div className="relative flex w-full items-center gap-2">
                  <Select
                    className="!w-full"
                    value={field.value}
                    onValueChange={handleTypeChange}
                  >
                    <SelectTrigger className="h-10 !w-full dark:bg-slate-700 dark:hover:!bg-slate-600">
                      <SelectValue placeholder={__("Select discount type", "whizmanage")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>{__("Discount Type", "whizmanage")}</SelectLabel>
                        {discountTypes.map((discountType) => (
                          <SelectItem
                            key={discountType.value}
                            value={discountType.value}
                          >
                            {__(discountType.label, "whizmanage")}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-10 w-10 shrink-0 hover:shadow-md transition-all bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-700"
                    onClick={onOpen}
                    aria-label={__("Open discount settings", "whizmanage")}
                    title={__("Discount settings", "whizmanage")}
                  >
                    <Settings2 className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                  </Button>
                </div>

                {error && (
                  <p className="text-red-500 dark:text-pink-500 text-sm">
                    {__(error.message, "whizmanage")}
                  </p>
                )}
              </>
            )}
          />
        </div>

        <div>
          <SummaryPill text={summary} />
        </div>
      </div>
      <Modal
        size="3xl"
        scrollBehavior="inside"
        backdrop="blur"
        isOpen={isOpen}
        onOpenChange={handleOpenChange}
        isDismissable={!isLoading}
        classNames={{
          backdrop: "z-[9990] bg-black/50 dark:bg-black/70",
          base: "z-[9995] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden",
          wrapper: "z-[9995]",
          header: "p-0",
          footer: "p-0",
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
        <ModalContent>
          {(onClose) => (
            <>
            
              <div id="radix-select-portal" />
              <ModalHeader className="flex gap-3 justify-center items-center px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                <IconBadge icon={Settings2} variant="default" size="default" />
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  {__("Discount settings", "whizmanage")}
                </h2>
              </ModalHeader>

              <ModalBody className="p-3 bg-slate-50 dark:bg-slate-900/50">
                <div className="space-y-6 max-h-[70vh] overflow-y-auto scrollbar-whiz p-2">
                  <DiscountTypeInfo type={type || "product_adjustment"} __={__} />

                  <DiscountActionsBody
                    type={type || "product_adjustment"}
                    local={local}
                    setLocal={setLocal}
                    __={__}
                  />
                </div>
              </ModalBody>

              <ModalFooter className="px-6 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isLoading}
                  className="h-9"
                >
                  {__("Cancel", "whizmanage")}
                </Button>
                <Button
                  onClick={onSave}
                  disabled={isLoading}
                  className="h-9 bg-gradient-to-r from-fuchsia-600 to-pink-500 hover:from-fuchsia-700 hover:to-pink-600 text-white shadow-sm hover:shadow-md transition-all min-w-24"
                >
                  {isLoading ? __("Saving...", "whizmanage") : __("Save", "whizmanage")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}

/* ------------------------------ BulkTiersEditor ---------------------------- */
/* אם כבר קיים אצלך, הסר את הבלוק הבא. אחרת – השאר כפי שהיה בקובץ הקודם שלך. */
function BulkTiersEditor({ __ ,tiers, onChange }) {
  const rows = Array.isArray(tiers) ? tiers : [];
  const update = (idx, patch) =>
    onChange(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const add = () =>
    onChange([
      ...rows,
      { min: 1, max: null, method: "percentage", amount: 5, label: "" },
    ]);
  const remove = (idx) => onChange(rows.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 p-3">
        <div className="grid grid-cols-12 gap-2 text-[11px] sm:text-xs font-medium text-slate-600 dark:text-slate-300 px-1">
          <div className="col-span-2 text-start">{__("Min qty", "whizmanage")}</div>
          <div className="col-span-2 text-start">{__("Max qty", "whizmanage")}</div>
          <div className="col-span-3 text-start">{__("Type", "whizmanage")}</div>
          <div className="col-span-2 text-start">{__("Value", "whizmanage")}</div>
          <div className="col-span-2 text-start">{__("Label", "whizmanage")}</div>
          <div className="col-span-1 text-start">{__("Actions", "whizmanage")}</div>
        </div>
        <Separator className="my-2 bg-slate-2 00 dark:bg-slate-700" />
        <div className="space-y-2">
          {rows.length ? (
            rows.map((row, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 gap-2 items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-2 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="col-span-2">
                  <Input
                    type="number"
                    className="h-9 text-center text-sm"
                    value={row.min ?? 1}
                    onChange={(e) =>
                      update(idx, { min: toNumber(e.target.value, 1) })
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    placeholder={__("∞", "whizmanage")}
                    className="h-9 text-center !rounded-md text-sm"
                    value={row.max ?? ""}
                    onChange={(e) =>
                      update(idx, {
                        max:
                          e.target.value === ""
                            ? null
                            : toNumber(e.target.value),
                      })
                    }
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="col-span-3">
                  <Select
                    value={row.method || "percentage"}
                    onValueChange={(value) => update(idx, { method: value })}
                    onCloseAutoFocus={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent
                      onCloseAutoFocus={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      <SelectItem value="percentage">
                        {__("Percentage", "whizmanage")}
                      </SelectItem>
                      <SelectItem value="fixed">{__("Fixed amount", "whizmanage")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <InputWithAdornment
                    type="number"
                    step="0.01"
                    className="h-9 !rounded-md text-center text-sm"
                    value={row.amount ?? 0}
                    onChange={(e) =>
                      update(idx, { amount: toNumber(e.target.value, 0) })
                    }
                    adornmentType={
                      row.method === "percentage" ? "percent" : "currency"
                    }
                  />
                </div>
                <Input
                  type="text"
                  className="h-9 text-sm !rounded-md col-span-2"
                  placeholder={__("Optional", "whizmanage")}
                  value={row.label ?? ""}
                  onChange={(e) => update(idx, { label: e.target.value })}
                  onKeyDown={(e) => e.stopPropagation()}
                />
                <div className="col-span-1 text-center">
                  <Button
                    size="sm"
                    variant="outline"
                    className="size-9 p-1 flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-800 transition-all"
                    onClick={() => remove(idx)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-slate-500 dark:text-slate-300 px-1 py-4 text-center">
              {__("No tiers yet. Click 'Add tier' to create one.", "whizmanage")}
            </div>
          )}
        </div>
      </div>
      <Button
        onClick={add}
        className="h-9 bg-gradient-to-r from-fuchsia-600 to-pink-500 hover:from-fuchsia-700 hover:to-pink-600 text-white shadow-sm hover:shadow-md transition-all"
      >
        {__("Add tier", "whizmanage")}
      </Button>
    </div>
  );
}
