// src/components/table/entities/discount-rules/components/FiltersEditor.jsx

import MultiSelectEdit from "@/components/table/components/MultiSelectEdit";
import { Button } from "@components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu";
import { Input } from "@components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select-portal";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/ui/popover-portal";

import { Chip } from "@heroui/react";
import {
  Check,
  ChevronDown,
  Filter as FilterIcon,
  Plus,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { __ } from "@wordpress/i18n";
import { getApi } from "/src/services/services";
import ProBadge from "@components/ui/nextUI/ProBadge";
import CustomTooltip from "@components/ui/nextUI/Tooltip";
import { useUserRolesStore } from "@/components/table/store/useUserRolesStore";

/* ===== Compact styling ===== */
const baseField =
  "h-8 w-full rounded-md border border-slate-200/80 dark:border-slate-700/70 bg-white dark:bg-slate-700 px-2 text-[14px] leading-[1.1] shadow-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500";
const baseLabel = "block text-[10px] leading-4 mb-1 text-muted-foreground";
const baseCard =
  "rounded-lg dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/70 bg-background shadow-sm transition-all hover:shadow-md";

// אותם שדות כמו קודם (כל מה שהיה)
const ALL_FIELDS = [
  { value: "categories", labelKey: "Categories" },
  { value: "products", labelKey: "Products" },
  { value: "tags", labelKey: "Tags" },
  { value: "attributes", labelKey: "Attributes" },
  { value: "user_roles", labelKey: "User roles" },
  { value: "skus", labelKey: "SKUs" },
  { value: "on_sale", labelKey: "On sale" },
];

// 🔒 פונקציה לבדיקת נעילה - מחשבת בזמן אמת
const isFieldLocked = (fieldValue) => {
  const noLicence = typeof window !== "undefined" && window.hasLicence === false;
  // רק products לא נעול עבור Free users
  return noLicence && fieldValue !== "products";
};

const getDir = () => {
  if (typeof document !== "undefined") {
    return (
      document.documentElement.dir ||
      (window?.user_local === "he_IL" ? "rtl" : "ltr")
    );
  }
  return "ltr";
};

/* -----------------------------------------------------------------------
   AttributesPickerForRules
------------------------------------------------------------------------ */
function AttributesPickerForRules({ value = [], onChange }) {

  const isRTL = window?.document?.documentElement?.dir === "rtl";


  const [attributes, setAttributes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const normalizedSelected = useMemo(() => {
    return (Array.isArray(value) ? value : [])
      .map((v) => {
        if (typeof v === "object" && v !== null) {
          const tax = v.taxonomy || v.tax || v.slug;
          const tid = v.term_id ?? v.id;
          if (tax && tid !== undefined) {
            return { taxonomy: String(tax), term_id: Number(tid) };
          }
        }
        if (typeof v === "string" && v.includes(":")) {
          const [taxonomy, idStr] = v.split(":");
          return { taxonomy, term_id: Number(idStr) };
        }
        return null;
      })
      .filter((item) => item !== null && !isNaN(item.term_id));
  }, [value]);

  const selectedIds = useMemo(
    () => new Set(normalizedSelected.map((p) => `${p.taxonomy}:${p.term_id}`)),
    [normalizedSelected]
  );

  const decodeSafe = (s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  };

  const selectedLabel = useMemo(() => {
    if (!attributes.length || !selectedIds.size)
      return __("Select attributes", "whizmanage");

    const allTerms = attributes.flatMap((a) =>
      (a.options || []).map((opt) => ({
        id: `${a.slug}:${opt.id}`,
        name: `${a.name} — ${decodeSafe(opt.name)}`,
      }))
    );

    const names = [];
    for (const id of selectedIds) {
      const found = allTerms.find((x) => x.id === id);
      if (found) names.push(found.name);
    }
    return names.length > 0 ? names.join(", ") : __("Select attributes", "whizmanage");
  }, [attributes, selectedIds]);

  const toggle = useCallback(
    (taxonomy, term) => {
      const termId = Number(term.id ?? term.term_id);
      if (isNaN(termId)) return;

      const id = `${taxonomy}:${termId}`;
      const exists = selectedIds.has(id);

      const next = exists
        ? normalizedSelected.filter((p) => `${p.taxonomy}:${p.term_id}` !== id)
        : [...normalizedSelected, { taxonomy: String(taxonomy), term_id: termId }];

      onChange(next);
    },
    [normalizedSelected, selectedIds, onChange]
  );

  useEffect(() => {
    if (!open || attributes.length) return;

    setLoading(true);

    try {
      if (
        Array.isArray(window?.listTaxonomies) &&
        window.listTaxonomies.length
      ) {
        const attrs = window.listTaxonomies
          .filter(
            (tax) =>
              tax?.name?.startsWith("pa_") || tax?.name?.startsWith("_pa_")
          )
          .map((tax, index) => {
            let label = tax.label || tax.name;
            if (typeof label === "string") {
              const parts = label.split(" ");
              if (parts.length > 1 && parts[0].toLowerCase() === "product") {
                label = parts.slice(1).join(" ");
              }
            }
            return {
              id: tax.id ?? index + 1,
              name: label,
              slug: tax.name.startsWith("_") ? tax.name.slice(1) : tax.name,
              options: (tax.terms || []).map((term) => ({
                id: term.id ?? term.term_id,
                name: decodeSafe(term.name),
                slug: term.slug,
              })),
            };
          });
        setAttributes(attrs);
        setLoading(false);
        return;
      }
    } catch (e) {
      console.error("Error reading window.listTaxonomies:", e);
    }

    (async () => {
      try {
        const res = await getApi(
          `${window.siteUrl}/wp-json/wc/v3/products/attributes?per_page=100`
        );
        const attrs = Array.isArray(res?.data) ? res.data : [];
        const all = [];

        for (const attr of attrs) {
          try {
            const termsRes = await getApi(
              `${window.siteUrl}/wp-json/wc/v3/products/attributes/${attr.id}/terms?per_page=100`
            );
            const terms = Array.isArray(termsRes?.data) ? termsRes.data : [];
            all.push({
              id: attr.id,
              name: attr.name || attr.slug,
              slug: attr.slug || attr.name,
              options: terms.map((t) => ({
                id: t.id ?? t.term_id,
                name: decodeSafe(t.name),
                slug: t.slug,
              })),
            });
          } catch (e) {
            console.error("Failed to load terms for attribute", attr?.id, e);
          }
        }

        setAttributes(all);
      } catch (e) {
        console.error("Error loading global attributes via API:", e);
        setAttributes([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, attributes.length]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="flex h-8 w-full max-w-full items-center justify-between gap-2 overflow-hidden"
        >
          <span className="min-w-0 flex-1 truncate text-left">
            {selectedLabel}
          </span>
          <ChevronDown className="h-4 w-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[320px] dark:bg-slate-800 z-[10000]"
        align="start"
        sideOffset={6}
        onInteractOutside={(e) => {
          const modalElement =
            e.target.closest(".nextui-modal-wrapper") ||
            e.target.closest('[data-slot="base"]') ||
            e.target.closest(".max-h-\\[60vh\\]");
          if (modalElement) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
        }}
      >
        <Command
          className="dark:bg-slate-800 z-[10001]"
          dir={isRTL ? "rtl" : "ltr"}
        >
          <div className="flex !border-b dark:border-slate-700">
            <CommandInput
              placeholder={__("Find attribute or term", "whizmanage")}
              className="!border-none !ring-0"
            />
          </div>
          <CommandList className="max-h-[360px] overflow-y-auto scrollbar-whiz">
            {!loading && attributes.length === 0 && (
              <CommandEmpty>{__("No attributes found.", "whizmanage")}</CommandEmpty>
            )}

            {loading ? (
              <div className="flex justify-center py-6">
                <span className="text-xs text-muted-foreground">
                  {__("Loading", "whizmanage")}...
                </span>
              </div>
            ) : (
              attributes.map((attr) => (
                <CommandGroup key={attr.slug} heading={attr.name}>
                  {(attr.options || []).map((term) => {
                    const id = `${attr.slug}:${term.id}`;
                    const isSelected = selectedIds.has(id);
                    return (
                      <CommandItem
                        key={id}
                        value={`${term.name || ""} ${term.id || ""}`}
                        onSelect={() => toggle(attr.slug, term)}
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${isSelected ? "opacity-100" : "opacity-0"
                            }`}
                        />
                        <span className="truncate">{term.name}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/* ========================= רכיבי בחירה ========================= */

function FieldSelect({ value, used, onChange, __ }) {
  const options = ALL_FIELDS.filter(
    (f) => !used.has(f.value) || f.value === value
  );
  const dir = getDir();

  const title =
    __(
      ALL_FIELDS.find((f) => f.value === value)?.labelKey || "Field",
      "whizmanage"
    ) || "";

  return (
    <Select
      dir={dir}
      value={value}
      onValueChange={(v) => {
        // 🔒 בדוק אם האפשרות נעולה
        if (isFieldLocked(v)) {
          return; // לא לאפשר בחירה באפשרות נעולה
        }
        onChange(v, v === "on_sale" ? "only" : "include", []);
      }}
    >
      <SelectTrigger
        className={`${baseField} w-full max-w-full overflow-hidden justify-between`}
        title={title}
      >
        <SelectValue placeholder={__("Choose field", "whizmanage")} className="truncate" />
      </SelectTrigger>
      <SelectContent position="popper">
        {options.map((o) => {
          const isLocked = isFieldLocked(o.value);
          return (
            <SelectItem
              key={o.value}
              value={o.value}
              disabled={isLocked}
              className={isLocked ? "opacity-50 cursor-not-allowed" : ""}
            >
              <span className="flex items-center justify-between w-full gap-2">
                <span className={isLocked ? "text-slate-400" : ""}>
                  {__(o.labelKey, "whizmanage")}
                </span>
                {isLocked && (
                  <span className="scale-75">
                    <ProBadge />
                  </span>
                )}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

function ModeSelect({ field, value, onChange, __ }) {
  const dir = getDir();
  const isSale = field === "on_sale";
  const opts = isSale
    ? [
      { v: "only", l: __("Only on-sale items", "whizmanage") },
      { v: "exclude", l: __("Exclude on-sale items", "whizmanage") },
    ]
    : [
      { v: "include", l: __("Include", "whizmanage") },
      { v: "exclude", l: __("Exclude", "whizmanage") },
    ];

  return (
    <Select dir={dir} value={value} onValueChange={onChange}>
      <SelectTrigger
        className={`${baseField} w-full max-w-full overflow-hidden justify-between`}
      >
        <SelectValue placeholder={__("Choose mode", "whizmanage")} className="truncate" />
      </SelectTrigger>
      <SelectContent position="popper">
        {opts.map((o) => (
          <SelectItem key={o.v} value={o.v}>
            {o.l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ========================= ValuesEditor ========================= */

function ValuesEditor({ row, onChange, __ }) {
  // Helper לקבלת שם מזהה
  const getLabelForValue = useCallback((field, val) => {
    const id = typeof val === "object" ? (val.id ?? val.term_id) : val;

    if (field === "categories") {
      const cats = window?.listTaxonomies?.find(tax =>
        tax.name === "product_cat" || tax.name === "_product_cat"
      )?.terms || [];
      const found = cats.find(c => String(c.id) === String(id));
      return found?.name || `#${id}`;
    }

    if (field === "tags") {
      const tags = window?.listTaxonomies?.find(tax =>
        tax.name === "product_tag"
      )?.terms || [];
      const found = tags.find(c => String(c.id) === String(id));
      return found?.name || `#${id}`;
    }

    if (field === "products") {
      const products = Array.isArray(window?.listProduct) ? window.listProduct : [];
      const found = products.find(p => String(p.id) === String(id));
      return found?.name || found?.title || `#${id}`;
    }

    if (field === "user_roles") {
      // שימוש ב-store לקבלת שם מתורגם
      const { getRoleName } = useUserRolesStore.getState();
      return getRoleName(id) || id;
    }

    if (field === "attributes") {
      if (typeof val === "object" && val.taxonomy && val.term_id) {
        const attrs = window?.listTaxonomies?.filter(tax =>
          tax.name?.startsWith("pa_") || tax.name?.startsWith("_pa_")
        ) || [];
        for (const attr of attrs) {
          const slug = attr.name.startsWith("_") ? attr.name.slice(1) : attr.name;
          if (slug === val.taxonomy) {
            const term = (attr.terms || []).find(t => String(t.id ?? t.term_id) === String(val.term_id));
            if (term) {
              let attrLabel = attr.label || attr.name;
              if (typeof attrLabel === "string") {
                const parts = attrLabel.split(" ");
                if (parts.length > 1 && parts[0].toLowerCase() === "product") {
                  attrLabel = parts.slice(1).join(" ");
                }
              }
              return `${attrLabel}: ${term.name}`;
            }
          }
        }
        return `${val.taxonomy}:${val.term_id}`;
      }
    }

    return String(id);
  }, []);

  // Helper להסרת ערך
  const removeValue = useCallback((val) => {
    const id = typeof val === "object" ? (val.id ?? val.term_id) : val;
    const newValues = (row.values || []).filter(v => {
      const vId = typeof v === "object" ? (v.id ?? v.term_id) : v;
      return String(vId) !== String(id);
    });
    onChange(newValues);
  }, [row.values, onChange]);

  // קומפוננט לצ'יפים
  const renderChips = useCallback(() => {
    if (!row.values || row.values.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1 mt-1.5">
        {row.values.map((val, idx) => {
          const id = typeof val === "object" ? (val.id ?? val.term_id ?? idx) : val;
          const label = getLabelForValue(row.field, val);

          return (
            <CustomTooltip key={`${id}-${idx}`} title={label}>
              <Chip
                size="sm"
                onClose={() => removeValue(val)}
                variant="flat"
                classNames={{
                  base: "bg-gradient-to-br from-fuchsia-50 dark:from-slate-700 to-fuchsia-100 dark:to-slate-600 h-6 max-w-[120px]",
                  content: "text-fuchsia-700 dark:text-slate-200 text-xs px-1 truncate",
                  closeButton: "text-fuchsia-600 dark:text-slate-300 hover:text-fuchsia-800 dark:hover:text-white",
                }}
              >
                {label}
              </Chip>
            </CustomTooltip>
          );
        })}
      </div>
    );
  }, [row.values, row.field, getLabelForValue, removeValue]);

  if (row.field === "on_sale") {
    return (
      <Input
        disabled
        className="h-8 text-sm text-slate-500 dark:text-slate-300 dark:border-none dark:!border-0 cursor-not-allowed"
        value={__("Not required", "whizmanage")}
        readOnly
      />
    );
  }

  if (row.field === "attributes") {
    return (
      <div>
        <AttributesPickerForRules
          value={row.values}
          onChange={(pairs) => onChange(pairs)}
        />
        {renderChips()}
      </div>
    );
  }

  if (row.field === "categories") {
    return (
      <MultiSelectEdit
        row={{ original: { categories: row.values } }}
        columnName="categories"
        label={__("categories", "whizmanage")}
        onValueChange={(vals) =>
          onChange(vals.map((v) => (typeof v === "object" ? v.id : v)))
        }
        editOptions={{ taxonomyType: "product_cat", dense: true }}
      />
    );
  }

  if (row.field === "tags") {
    return (
      <MultiSelectEdit
        row={{ original: { tags: row.values } }}
        columnName="tags"
        label={__("Select tags", "whizmanage")}
        onValueChange={(vals) =>
          onChange(vals.map((v) => Number(typeof v === "object" ? v.id : v)))
        }
        editOptions={{ taxonomyType: "product_tag", dense: true }}
      />
    );
  }

  if (row.field === "products") {
    return (
      <MultiSelectEdit
        row={{ original: { products: row.values } }}
        columnName="products"
        label={__("products", "whizmanage")}
        onValueChange={(vals) =>
          onChange(vals.map((v) => (typeof v === "object" ? v.id : v)))
        }
        editOptions={{ source: "products", dense: true }}
      />
    );
  }

  if (row.field === "skus") {
    const toStr = (vals) => (Array.isArray(vals) ? vals.join(",") : "");
    const toArr = (str) =>
      String(str || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    return (
      <div>
        <Input
          className="h-8 px-3"
          placeholder={__("e.g. ABC-1, XYZ-2", "whizmanage")}
          defaultValue={toStr(row.values)}
          onChange={(e) => onChange(toArr(e.target.value))}
        />
        {renderChips()}
      </div>
    );
  }

  if (row.field === "user_roles") {
    return (
      <MultiSelectEdit
        row={{ original: { user_roles: row.values } }}
        columnName="user_roles"
        label={__("roles", "whizmanage")}
        onValueChange={(vals) =>
          onChange(
            (Array.isArray(vals) ? vals : []).map((v) =>
              typeof v === "object" ? (v.id ?? v.name) : v
            )
          )
        }
        editOptions={{ taxonomyType: "user_roles", dense: true }}
      />
    );
  }

  return null;
}

/* ========================= FiltersEditor ========================= */

export default function FiltersEditor({ rows, onChange }) {
  // טעינת תפקידי משתמש כשיש filter מסוג user_roles
  const { loadRolesOnce, isLoaded: rolesLoaded } = useUserRolesStore();

  const list = useMemo(() => (Array.isArray(rows) ? rows : []), [rows]);
  const used = new Set(list.map((r) => r.field));

  // טען את התפקידים אם יש filter של user_roles
  useEffect(() => {
    const hasUserRolesFilter = list.some((r) => r.field === "user_roles");
    if (hasUserRolesFilter && !rolesLoaded) {
      loadRolesOnce();
    }
  }, [list, rolesLoaded, loadRolesOnce]);

  const updateRow = (idx, patch) => {
    const next = list.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    onChange(next);
  };

  const setField = (idx, field, op, values) => {
    const next = list.map((r, i) => (i === idx ? { field, op, values } : r));
    onChange(next);
  };

  const removeRow = (idx) => onChange(list.filter((_, i) => i !== idx));

  const addFilter = (fieldValue) => {
    onChange([
      ...(list || []),
      {
        field: fieldValue,
        op: fieldValue === "on_sale" ? "only" : "include",
        values: [],
      },
    ]);
  };

  const availableFields = ALL_FIELDS.filter((f) => !used.has(f.value));

  return (
    <div className="space-y-2">
      {list.length === 0 && (
        <div className="text-center py-8 px-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 mb-3">
            <FilterIcon className="h-6 w-6 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
            {__("No filters yet", "whizmanage")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {__("Rule applies to all products by default", "whizmanage")}
          </p>
        </div>
      )}
      {list.map((r, idx) => (
        <div className={`${baseCard} p-2`} key={`${r.field}-${idx}`}>
          <div className="mb-1 hidden grid-cols-12 px-1 text-[12px] text-muted-foreground md:grid">
            <div className="col-span-3">{__("Field", "whizmanage")}</div>
            <div className="col-span-3">{__("Mode", "whizmanage")}</div>
            <div className="col-span-5">{__("Values", "whizmanage")}</div>
            <div className="col-span-1" />
          </div>

          <div className="grid grid-cols-1 items-center gap-2 md:grid-cols-12">
            <div className="min-w-0 md:col-span-3">
              <label className={`${baseLabel} md:hidden`}>{__("Field", "whizmanage")}</label>
              <FieldSelect
                value={r.field}
                used={used}
                onChange={(field, op, values) =>
                  setField(idx, field, op, values)
                }
                __={__}
              />
            </div>

            <div className="min-w-0 md:col-span-3">
              <label className={`${baseLabel} md:hidden`}>{__("Mode", "whizmanage")}</label>
              <ModeSelect
                field={r.field}
                value={r.op}
                onChange={(op) => updateRow(idx, { op })}
                __={__}
              />
            </div>

            <div className="min-w-0 overflow-hidden md:col-span-5">
              <label className={`${baseLabel} md:hidden`}>{__("Values", "whizmanage")}</label>
              <div className="min-h-[28px]">
                <ValuesEditor
                  row={r}
                  __={__}
                  onChange={(vals) => updateRow(idx, { values: vals })}
                />
              </div>
            </div>

            <div className="md:col-span-1 flex md:justify-start items-center">
              <Button
                variant="outline"
                size="icon"
                type="button"
                aria-label={__("Remove", "whizmanage")}
                onClick={() => removeRow(idx)}
                className="!size-8 inline-flex items-center justify-center hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
      <div className="flex items-center gap-2">
        {availableFields.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="h-8 rounded-md bg-gradient-to-r from-fuchsia-600 to-pink-500 hover:from-fuchsia-700 hover:to-pink-600 px-3 text-[13px] text-white shadow-sm transition-all inline-flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                {__("Add filter", "whizmanage")}
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {availableFields.map((field) => {
                const isLocked = isFieldLocked(field.value);
                return (
                  <DropdownMenuItem
                    key={field.value}
                    onClick={isLocked ? (e) => e.preventDefault() : () => addFilter(field.value)}
                    disabled={isLocked}
                    className={`cursor-pointer font-normal ${isLocked ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                  >
                    <span className="flex items-center justify-between w-full gap-2">
                      <span className={isLocked ? "text-slate-400" : ""}>
                        {__(field.labelKey, "whizmanage")}
                      </span>
                      {isLocked && (
                        <span className="scale-75">
                          <ProBadge />
                        </span>
                      )}
                    </span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <span className="text-[11px] text-muted-foreground">
            {__("All filter types have been added", "whizmanage")}
          </span>
        )}
      </div>
    </div>
  );
}

/* ---------- helpers to convert rows <-> conditions ---------- */
export function rowsToConditions(rows, logic = "all") {
  const product_cat_ids = new Set();
  const exclude_product_cat_ids = new Set();
  const product_ids = new Set();
  const exclude_product_ids = new Set();
  const user_roles = new Set();
  const user_roles_exclude = new Set();
  const product_tag_ids = new Set();
  const exclude_product_tag_ids = new Set();
  const product_skus = new Set();
  const exclude_product_skus = new Set();
  const attribute_pairs = new Map();
  const attribute_pairs_excl = new Map();

  let require_on_sale = 0;
  let exclude_on_sale = 0;

  const asAttrPair = (v) => {
    if (!v) return null;
    if (typeof v === "string" && v.includes(":")) {
      const [taxonomy, idStr] = v.split(":");
      const term_id = Number(idStr);
      if (!taxonomy || !term_id) return null;
      return { taxonomy, term_id };
    }
    if (typeof v === "object") {
      const taxonomy = v.taxonomy || v.tax || v.slug;
      const term_id = Number(v.term_id ?? v.id);
      if (!taxonomy || !term_id) return null;
      return { taxonomy, term_id };
    }
    return null;
  };

  for (const r of rows || []) {
    if (!r) continue;

    if (r.field === "on_sale") {
      if (r.op === "only") require_on_sale = 1;
      if (r.op === "exclude") exclude_on_sale = 1;
      continue;
    }

    const target = r.op === "exclude" ? "exclude" : "include";
    if (r.field === "categories") {
      for (const v of r.values || []) {
        (target === "include" ? product_cat_ids : exclude_product_cat_ids).add(
          v
        );
      }
    } else if (r.field === "products") {
      for (const v of r.values || []) {
        (target === "include" ? product_ids : exclude_product_ids).add(v);
      }
    } else if (r.field === "tags") {
      for (const v of r.values || []) {
        const id = Number(v);
        if (!Number.isNaN(id)) {
          (target === "include"
            ? product_tag_ids
            : exclude_product_tag_ids
          ).add(id);
        }
      }
    } else if (r.field === "user_roles") {
      for (const v of r.values || []) {
        (target === "include" ? user_roles : user_roles_exclude).add(v);
      }
    } else if (r.field === "attributes") {
      for (const raw of r.values || []) {
        const pair = asAttrPair(raw);
        if (!pair) continue;
        const key = `${pair.taxonomy}:${pair.term_id}`;
        if (target === "include") attribute_pairs.set(key, pair);
        else attribute_pairs_excl.set(key, pair);
      }
    } else if (r.field === "skus") {
      for (const sku of r.values || []) {
        const norm = String(sku).trim();
        if (!norm) continue;
        (target === "include" ? product_skus : exclude_product_skus).add(norm);
      }
    }
  }

  const out = {
    logic: logic === "any" ? "any" : "all",
    product_cat_ids: Array.from(product_cat_ids),
    product_ids: Array.from(product_ids),
    user_roles: Array.from(user_roles),
  };

  if (exclude_product_cat_ids.size)
    out.exclude_product_cat_ids = Array.from(exclude_product_cat_ids);
  if (exclude_product_ids.size)
    out.exclude_product_ids = Array.from(exclude_product_ids);
  if (user_roles_exclude.size)
    out.user_roles_exclude = Array.from(user_roles_exclude);
  if (product_tag_ids.size) out.product_tag_ids = Array.from(product_tag_ids);
  if (exclude_product_tag_ids.size)
    out.exclude_product_tag_ids = Array.from(exclude_product_tag_ids);
  if (product_skus.size) out.product_skus = Array.from(product_skus);
  if (exclude_product_skus.size)
    out.exclude_product_skus = Array.from(exclude_product_skus);
  if (attribute_pairs.size)
    out.attribute_terms = Array.from(attribute_pairs.values());
  if (attribute_pairs_excl.size)
    out.exclude_attribute_terms = Array.from(attribute_pairs_excl.values());
  if (require_on_sale) out.require_on_sale = 1;
  if (exclude_on_sale) out.exclude_on_sale = 1;
  if (require_on_sale) out.on_sale_only = 1;

  return out;
}
