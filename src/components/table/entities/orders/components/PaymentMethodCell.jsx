import React, { useMemo, useCallback } from "react";
import { EditableCell } from "@components/table/core/EditableCell.jsx";
import {
  CreditCard as CreditCardIcon,
  DollarSign as DollarSignIcon,
  Landmark as LandmarkIcon,
  Smartphone as SmartphoneIcon,
  Wallet as WalletIcon,
} from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

const iconByMethod = {
  credit_card: CreditCardIcon,
  paypal: DollarSignIcon,
  bank_transfer: LandmarkIcon,
  bit: SmartphoneIcon,
  apple_pay: WalletIcon,
  google_pay: WalletIcon,
};

function PaymentMethodCell({ __ ,handleUpdate, ...props }) {
  const method = props.getValue();
  const rowData = props.row?.original || {};
  const rowId = rowData?.id;

  const options = useMemo(
    () => [
      { value: "credit_card", label: __("Credit Card", "whizmanage") },
      { value: "paypal", label: __("PayPal", "whizmanage") },
      { value: "bank_transfer", label: __("Bank Transfer", "whizmanage") },
      { value: "cod", label: __("Cash on Delivery (COD)", "whizmanage") },
      { value: "bit", label: __("Bit (Israeli Payment App)", "whizmanage") },
      { value: "apple_pay", label: __("Apple Pay", "whizmanage") },
      { value: "google_pay", label: __("Google Pay", "whizmanage") },
      { value: "manual", label: __("Manual Payment", "whizmanage") },
      { value: "cheque", label: __("Check", "whizmanage") },
      { value: "direct_debit", label: __("Standing Order / Direct Debit", "whizmanage") },
    ],
    [__]
  );

  const labelFromValue = useCallback(
    (v) => options.find((o) => o.value === v)?.label || (v ? __(v, "whizmanage") : "—"),
    [options, __]
  );

  const displayTitle = rowData?.payment_method_title || labelFromValue(method);
  const Icon = iconByMethod[method] || CreditCardIcon;

  const doUpdate = useCallback(
    async (value) => {
      await handleUpdate(rowId, "payment_method", value, rowData, false);
      const newTitle = labelFromValue(value);
      if (newTitle && newTitle !== rowData?.payment_method_title) {
        try {
          await handleUpdate(rowId, "payment_method_title", newTitle, rowData, false);
        } catch (e) {
          console.warn("[PaymentMethodCell] title sync failed:", e?.message || e);
        }
      }
      return true;
    },
    [handleUpdate, labelFromValue, rowData, rowId]
  );

  return (
    <EditableCell
      {...props}
      onUpdate={async (_id, _c, value) => doUpdate(value)}
      renderDisplay={() => {
        const isEmpty = !method || method === "" || method === "UNKNOWN" || displayTitle === "—";
        const text = isEmpty ? __("Unknown", "whizmanage") : displayTitle;
        
        return (
          <div className="flex items-center gap-1 truncate">
            <Icon className={`size-4 shrink-0 ${isEmpty ? 'text-muted-foreground' : ''}`} />
            <span className={`text-sm truncate ${isEmpty ? 'text-muted-foreground italic' : ''}`}>
              {text}
            </span>
          </div>
        );
      }}
      renderEditor={({ close }) => (
        <Select
          defaultValue={method || ""}
          onValueChange={async (value) => {
            await doUpdate(value);
            close?.();
          }}
        >
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder={__("Choose Payment Method", "whizmanage")} />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {options.map((o) => {
              const OptIcon = iconByMethod[o.value] || CreditCardIcon;
              return (
                <SelectItem key={o.value} value={o.value} className="pl-2">
                  <div className="flex items-center gap-2">
                    <OptIcon className="size-4 shrink-0" />
                    <span>{o.label}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      )}
    />
  );
}

export default React.memo(PaymentMethodCell);