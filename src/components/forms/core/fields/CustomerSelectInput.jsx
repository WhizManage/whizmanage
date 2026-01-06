// src/components/forms/core/fields/CustomerSelectInput.jsx

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Info, User } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { __ } from "@wordpress/i18n";
import { useGenericForm } from "../FormProvider";
import { getApi } from "/src/services/services";
import Loader from "@/components/ui/custom/Loader";
import { useDebouncedValue } from "@/components/table/hooks/useDebounce";

export default function CustomerSelectInput({
  name = "customer_id",
  label = "Select Customer",
  placeholder = "Choose a customer",
  helperText,
  rules,
  onCustomerSelected, // callback כשבוחרים לקוח
  perPage = 20,
  minChars = 2,
  apiPath = "/wp-json/whizmanage/v1/get_customers", // הנתיב שלך
  isPayingOnly,
  // אם לא רוצים למלא אוטומטית אפשר להעביר autoFill=false, ברירת מחדל true
  autoFill = true,
  // אם אין לשילוח כתובת, להעתיק את החיוב לשילוח
  copyBillingToShippingIfEmpty = true,
}) {

  const { setValue, watch, getValues } = useGenericForm();
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const debouncedSearch = useDebouncedValue(searchTerm, 400);

  const isRTL = window?.document?.documentElement?.dir === "rtl";
  const currentValue = watch(name);
  const mounted = useRef(false);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearch && debouncedSearch.length >= minChars) {
      params.set("search", debouncedSearch);
    }
    params.set("per_page", String(perPage));
    params.set("page", "1");
    if (typeof isPayingOnly === "boolean") {
      params.set("is_paying_customer", isPayingOnly ? "1" : "0");
    }
    return params.toString();
  }, [debouncedSearch, minChars, perPage, isPayingOnly]);

  // שליפה לפי חיפוש (2+ תווים) – מדובנס
  useEffect(() => {
    if (!debouncedSearch || debouncedSearch.length < minChars) {
      setCustomers([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const url = `${window.siteUrl}${apiPath}?${queryParams}`;
        const res = await getApi(url);
        if (!cancelled) {
          const rows = res?.data?.rows ?? res?.data ?? [];
          setCustomers(Array.isArray(rows) ? rows : []);
        }
      } catch (err) {
        if (!cancelled) setCustomers([]);
        console.error("Error fetching customers:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiPath, queryParams, debouncedSearch, minChars]);

  // פרה-פול לפי ID כדי להציג תווית נכונה בערך התחלתי
  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    const id = Number(currentValue);
    if (!id) return;

    let cancelled = false;
    (async () => {
      try {
        const url = `${window.siteUrl}${apiPath}?id=${encodeURIComponent(id)}`;
        const res = await getApi(url);
        const row =
          res?.data?.row ||
          (Array.isArray(res?.data?.rows) ? res.data.rows[0] : null) ||
          null;
        if (!cancelled && row) {
          setSelectedCustomer(row);
        }
      } catch (err) {
        console.warn("Unable to prefetch customer by id:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- עוזרים לנרמול ומיזוג כתובות ----------
  const ensureCountry = (addr, fallback = "IL") => {
    const out = { ...(addr || {}) };
    if (!out.country) out.country = fallback;
    return out;
  };

  const hasAnyValue = (obj = {}) =>
    Object.values(obj).some(
      (v) => v !== null && v !== undefined && String(v).trim() !== ""
    );

  const mergeAddress = (current, incoming) => {
    // דריסה עדינה: incoming גובר, אך משאירים ערכים קיימים אם incoming ריק
    const out = { ...(current || {}) };
    const src = incoming || {};
    const fields = [
      "first_name",
      "last_name",
      "company",
      "address_1",
      "address_2",
      "city",
      "state",
      "postcode",
      "country",
      "email",
      "phone",
    ];
    fields.forEach((k) => {
      const v = src[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        out[k] = v;
      }
    });
    return out;
  };

  // ---------- טיפול בבחירת לקוח ----------
  const handleCustomerSelect = (customerId) => {
    const id = Number(customerId);
    const selected = customers.find((c) => c.id === id) || selectedCustomer;

    // עדכון ערך ה-id עצמו
    setValue(name, id, { shouldValidate: true, shouldDirty: true });

    // מילוי אוטומטי של billing/shipping בטופס
    if (autoFill) {
      const formVals = getValues() || {};

      const incomingBillingRaw = selected?.billing || {};
      // שמור אימייל לקוח אם אין billing.email
      if (!incomingBillingRaw.email && selected?.email) {
        incomingBillingRaw.email = selected.email;
      }
      const incomingBilling = ensureCountry(incomingBillingRaw, formVals?.billing?.country || "IL");

      const mergedBilling = mergeAddress(formVals.billing, incomingBilling);

      let incomingShipping = selected?.shipping || {};
      const shippingHasData = hasAnyValue(incomingShipping);

      if (!shippingHasData && copyBillingToShippingIfEmpty) {
        // מעתיקים מה-billing לשילוח (בלי email/phone כי לא מוצגים בשילוח אצלך)
        const {
          email: _omitEmail,
          phone: _omitPhone,
          ...billingForShipping
        } = incomingBilling;
        incomingShipping = billingForShipping;
      }

      incomingShipping = ensureCountry(
        incomingShipping,
        formVals?.shipping?.country || mergedBilling?.country || "IL"
      );
      const mergedShipping = mergeAddress(formVals.shipping, incomingShipping);

      // קיבוע לטופס
      setValue("billing", mergedBilling, { shouldValidate: true, shouldDirty: true });
      setValue("shipping", mergedShipping, { shouldValidate: true, shouldDirty: true });
    }

    // שמירה מקומית לצורך תווית מוצגת
    if (selected && selected.id === id) {
      setSelectedCustomer(selected);
    } else {
      // fallback: אם לא ברשימה הנוכחית, נביא לפי ID כדי למלא פרטים
      (async () => {
        try {
          const url = `${window.siteUrl}${apiPath}?id=${encodeURIComponent(id)}`;
          const res = await getApi(url);
          const row =
            res?.data?.row ||
            (Array.isArray(res?.data?.rows) ? res.data.rows[0] : null) ||
            null;
          if (row) setSelectedCustomer(row);
        } catch (e) {
          setSelectedCustomer({ id, first_name: "", last_name: "", email: "" });
        }
      })();
    }

    // callback חיצוני אם הועבר
    if (typeof onCustomerSelected === "function") {
      onCustomerSelected(selected || { id });
    }
  };

  const selectedLabel = useMemo(() => {
    if (!selectedCustomer) return __(placeholder, "whizmanage");
    const { first_name = "", last_name = "", email = "" } = selectedCustomer;
    const full =
      [first_name, last_name].filter(Boolean).join(" ") || `#${selectedCustomer.id}`;
    return email ? `${full} (${email})` : full;
  }, [selectedCustomer, placeholder, __]);

  return (
    <div className="flex flex-col w-full gap-1.5 px-2">
      <div className="flex items-center gap-1.5">
        {helperText && (
          <HoverCard openDelay={300}>
            <HoverCardTrigger asChild>
              <Info className="h-3 w-3 text-fuchsia-600 opacity-60 hover:opacity-100 cursor-pointer" />
            </HoverCardTrigger>
            <HoverCardContent
              className="max-w-xs text-sm break-words z-[9999] shadow-md p-3"
              align="start"
              avoidCollisions
              collisionPadding={10}
              sideOffset={5}
            >
              <p className="whitespace-pre-wrap break-words">{__(helperText, "whizmanage")}</p>
            </HoverCardContent>
          </HoverCard>
        )}
        <Label htmlFor={name}>
          {__(label, "whizmanage")}
          {rules?.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      </div>
      <Select
        value={currentValue ? String(currentValue) : undefined}
        onValueChange={handleCustomerSelect}
      >
        <SelectTrigger
          className={`h-10 dark:bg-slate-700 dark:hover:!bg-slate-600 ${isRTL ? "flex-row-reverse text-right" : "text-left"
            }`}
        >
          <SelectValue placeholder={__(placeholder, "whizmanage")}>
            {currentValue ? selectedLabel : __(placeholder, "whizmanage")}
          </SelectValue>
        </SelectTrigger>

        <SelectContent>
          {/* שדה חיפוש + רמז */}
          <div className="px-2 py-1.5 sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={__("Search customer", "whizmanage")}
              className="w-full border rounded px-2 py-1 text-sm dark:bg-slate-700"
              dir={isRTL ? "rtl" : "ltr"}
            />
            <div className="mt-1 text-[11px] text-muted-foreground" dir={isRTL ? "rtl" : "ltr"}>
              {`${__("Type", "whizmanage")} ${minChars}+ ${__("characters to search", "whizmanage")}`}
            </div>
          </div>

          {isLoading && (
            <div className="flex justify-center items-center py-2">
              <Loader />
            </div>
          )}

          {!isLoading &&
            debouncedSearch &&
            debouncedSearch.length >= minChars &&
            customers.length === 0 && (
              <div className="px-2 py-2 text-sm text-muted-foreground">
                {__("No customers found", "whizmanage")}
              </div>
            )}

          {!isLoading &&
            customers.map((customer) => (
              <SelectItem key={customer.id} value={String(customer.id)}>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {customer.first_name} {customer.last_name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({customer.email})
                  </span>
                </div>
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}
