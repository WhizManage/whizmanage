// src/components/table/entities/discount-rules/components/ConditionsEditor.jsx

import MultiSelectEdit from "@/components/table/components/MultiSelectEdit";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import CustomTooltip from "@components/ui/nextUI/Tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select-portal";
import {
  ChevronDown,
  ChevronUp,
  Equal,
  ListChecks,
  Plus,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
 import { __ } from "@wordpress/i18n";

const COMPARES = [
  {
    value: "gte",
    label: "Greater or equal",
    icons: [ChevronUp, Equal], // ↑ עם קו
  },
  {
    value: "lte",
    label: "Less or equal",
    icons: [ChevronDown, Equal], // ↓ עם קו
  },
  {
    value: "gt",
    label: "Greater than",
    icons: [ChevronUp], // רק ↑
  },
  {
    value: "lt",
    label: "Less than",
    icons: [ChevronDown], // רק ↓
  },
  {
    value: "eq",
    label: "Equal",
    icons: [Equal], // =
  },
  {
    value: "neq",
    label: "Not equal",
    icons: [Equal, X], // = עם X
  },
];

const baseLabel = "block text-[10px] leading-4 mb-1 text-muted-foreground";
const baseCard =
  "rounded-lg dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/70 bg-white shadow-sm transition-all hover:shadow-md";

const getDir = () => {
  if (typeof document !== "undefined") {
    return (
      document.documentElement.dir ||
      (window?.user_local === "he_IL" ? "rtl" : "ltr")
    );
  }
  return "ltr";
};

function Segmented({ value, onChange }) {
   
  const opts = [
    { key: "all", label: __("Match ALL", "whizmanage") },
    { key: "any", label: __("Match ANY", "whizmanage") },
  ];
  return (
    <div className="inline-flex rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5 text-[11px] shadow-sm">
      {opts.map((o) => (
        <button
          key={o.key}
          type="button"
          className={[
            "px-3 py-1 rounded-full transition-all font-medium",
            value === o.key
              ? "bg-fuchsia-600 text-white shadow-sm"
              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
          ].join(" ")}
          onClick={() => onChange(o.key)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// קומפוננטה להצגת אייקונים
function CompareIcons({ icons, className = "" }) {
  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {icons.map((Icon, idx) => (
        <Icon key={idx} className="h-3.5 w-3.5" />
      ))}
    </div>
  );
}

function RuleRow({ rule, onChange, onRemove }) {
   
  const dir = getDir();

  // Controlled state for Selects
  const [typeOpen, setTypeOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);

  const handleTypeChange = (newValue) => {
    const [kind, scope] = newValue.split(":");
    onChange({ kind, scope, compare: "gte", amount: 0, ids: [] });
  };

  const hasValues =
    rule.kind === "subtotal" &&
    (rule.scope === "categories" || rule.scope === "products");

  return (
    <div className={`${baseCard} p-2`}>
      {/* header (md+) */}
      <div className="hidden md:grid md:grid-cols-12 md:items-center gap-2 text-[12px] text-muted-foreground mb-2 px-1">
        <div className="col-span-3">{__("Condition Type", "whizmanage")}</div>
        <div className="col-span-2">{__("Compare", "whizmanage")}</div>
        <div className="col-span-3">{__("Values", "whizmanage")}</div>
        <div className="col-span-2 text-right">
          {rule.kind === "item_count" ? __("Qty", "whizmanage") : __("Amount", "whizmanage")}
        </div>
        <div className="col-span-1" />
      </div>
      {/* body */}
      <div className="grid grid-cols-1 md:grid-cols-11 md:items-center gap-2">
        {/* Type */}
        <div className="min-w-0 md:col-span-3">
          <label className={`${baseLabel} md:hidden`}>
            {__("Condition Type", "whizmanage")}
          </label>
          <Select
            dir={dir}
            open={typeOpen}
            onOpenChange={setTypeOpen}
            value={`${rule.kind}:${rule.scope}`}
            onValueChange={handleTypeChange}
          >
            <SelectTrigger className="h-8 text-[14px] leading-[1.1] shadow-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500 w-full !p-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="subtotal:cart">
                {__("Subtotal (cart)", "whizmanage")}
              </SelectItem>
              <SelectItem value="subtotal:categories">
                {__("Category subtotal", "whizmanage")}
              </SelectItem>
              <SelectItem value="subtotal:products">
                {__("Products subtotal", "whizmanage")}
              </SelectItem>
              <SelectItem value="item_count:cart">
                {__("Line Item Count", "whizmanage")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Compare */}
        <div className="min-w-0 md:col-span-2">
          <label className={`${baseLabel} md:hidden`}>{__("Compare", "whizmanage")}</label>
          <Select
            dir={dir}
            open={compareOpen}
            onOpenChange={setCompareOpen}
            value={rule.compare}
            onValueChange={(val) => onChange({ ...rule, compare: val })}
          >
            <CustomTooltip
              title={__(COMPARES.find((c) => c.value === rule.compare)?.label || "", "whizmanage")}
              instantClose
            >
              <SelectTrigger className="h-8 text-[14px] leading-[1.1] shadow-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500 w-full !p-2">
                <CompareIcons
                  icons={
                    COMPARES.find((c) => c.value === rule.compare)?.icons || [
                      Equal,
                    ]
                  }
                  className="text-fuchsia-600 dark:text-fuchsia-500"
                />
              </SelectTrigger>
            </CustomTooltip>
            <SelectContent position="popper">
              {COMPARES.map((cmp) => (
                <SelectItem key={cmp.value} value={cmp.value}>
                  <div className="flex items-center gap-1">
                    <CompareIcons
                      icons={cmp.icons}
                      className="text-fuchsia-600 dark:text-fuchsia-500"
                    />
                    <span className="text-sm">{__(cmp.label, "whizmanage")}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Values */}
        <div className="min-w-0 md:col-span-3 overflow-hidden">
          <label className={`${baseLabel} md:hidden`}>{__("Values", "whizmanage")}</label>

          {hasValues ? (
            rule.scope === "categories" ? (
              <MultiSelectEdit
                row={{ original: { categories: rule.ids } }}
                columnName="categories"
                label={__("Select categories", "whizmanage")}
                onValueChange={(vals) =>
                  onChange({
                    ...rule,
                    ids: (vals || [])
                      .map((v) => Number(typeof v === "object" ? v.id : v))
                      .filter((n) => !Number.isNaN(n)),
                  })
                }
                editOptions={{ taxonomyType: "product_cat", dense: true }}
              />
            ) : (
              <MultiSelectEdit
                row={{ original: { products: rule.ids } }}
                columnName="products"
                label={__("Select products", "whizmanage")}
                onValueChange={(vals) =>
                  onChange({
                    ...rule,
                    ids: (vals || [])
                      .map((v) => Number(typeof v === "object" ? v.id : v))
                      .filter((n) => !Number.isNaN(n)),
                  })
                }
                editOptions={{ source: "products", dense: true }}
              />
            )
          ) : (
            <Input
              disabled
              className="h-8 text-sm text-slate-500 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 cursor-not-allowed"
              value={__("Not required", "whizmanage")}
              readOnly
            />
          )}
        </div>

        {/* Amount / Quantity */}
        <div className="min-w-0 md:col-span-2">
          <label className={`${baseLabel} md:hidden`}>
            {rule.kind === "item_count" ? __("Quantity", "whizmanage") : __("Amount", "whizmanage")}
          </label>
          <Input
            type="number"
            className="h-8 text-sm"
            value={rule.amount ?? 0}
            onChange={(e) =>
              onChange({ ...rule, amount: Number(e.target.value) || 0 })
            }
            min={0}
          />
        </div>

        {/* Remove */}
        <div className="md:col-span-1 flex items-center md:justify-start">
          <Button
            variant="outline"
            size="icon"
            type="button"
            aria-label={__("Remove", "whizmanage")}
            onClick={onRemove}
            className="!size-8 inline-flex items-center justify-center hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ConditionsEditor({
  value,
  onChange,
  logic,
  onLogicChange,
}) {
   

  const normalized = useMemo(() => {
    const current = Array.isArray(value) ? value : [];
    return current.map((r) => ({
      kind: r?.kind || "subtotal",
      scope: r?.scope || "cart",
      compare: r?.compare || "gte",
      amount: typeof r?.amount === "number" ? r.amount : 0,
      ids: Array.isArray(r?.ids) ? r.ids : [],
    }));
  }, [value]);

  const addRule = () => {
    onChange([
      ...(normalized || []),
      { kind: "subtotal", scope: "cart", compare: "gte", amount: 0, ids: [] },
    ]);
  };

  return (
    <div className="space-y-3">
      {/* Logic Selector */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700">
        <Segmented value={logic} onChange={onLogicChange} />
        <span className="text-xs text-slate-600 dark:text-slate-300">
          {logic === "any"
            ? __("Customer must match ANY of the conditions below", "whizmanage")
            : __("Customer must match ALL conditions below", "whizmanage")}
        </span>
      </div>
      {/* Empty State */}
      {normalized.length === 0 && (
        <div className="text-center py-8 px-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 mb-3">
            <ListChecks className="h-6 w-6 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
            {__("No conditions yet", "whizmanage")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {__("Rule will apply to all orders without restrictions", "whizmanage")}
          </p>
        </div>
      )}
      {/* Rules List */}
      {normalized.map((rule, idx) => (
        <RuleRow
          key={idx}
          rule={rule}
          onChange={(next) => {
            const arr = [...normalized];
            arr[idx] = next;
            onChange(arr);
          }}
          onRemove={() => {
            const arr = [...normalized];
            arr.splice(idx, 1);
            onChange(arr);
          }}
        />
      ))}
      {/* Add Button */}
      <div>
        <button
          type="button"
          className="h-8 rounded-md bg-gradient-to-r from-fuchsia-600 to-pink-500 hover:from-fuchsia-700 hover:to-pink-600 px-3 text-[13px] text-white shadow-sm hover:shadow-md transition-all inline-flex items-center gap-1"
          onClick={addRule}
        >
          <Plus className="h-4 w-4" />
          {__("Add Condition", "whizmanage")}
        </button>
      </div>
    </div>
  );
}
