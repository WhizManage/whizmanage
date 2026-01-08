// src/components/settings/tabs/CurrencyTab.jsx

import { useMemo, useState } from "react";
import { __ } from "@wordpress/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import SettingsCardHeader from "../SettingsCardHeader";

const CURRENCY_POSITIONS = [
  { value: "left", label: "Left ($99.99)", labelHe: "שמאל ($99.99)" },
  { value: "right", label: "Right (99.99$)", labelHe: "ימין (99.99$)" },
  { value: "left_space", label: "Left with space ($ 99.99)", labelHe: "שמאל עם רווח ($ 99.99)" },
  { value: "right_space", label: "Right with space (99.99 $)", labelHe: "ימין עם רווח (99.99 $)" },
];

// Helper function to decode HTML entities
const decodeHtmlEntities = (str) => {
  if (!str) return str;
  const textarea = document.createElement("textarea");
  textarea.innerHTML = str;
  return textarea.value;
};

export default function CurrencyTab({ settings, currencies = [], onUpdate }) {
  const [currencyOpen, setCurrencyOpen] = useState(false);

  // Get current currency info
  const currentCurrency = useMemo(() => {
    const found = currencies.find((c) => c.code === settings.woocommerce_currency);
    if (found) {
      return {
        ...found,
        symbol: decodeHtmlEntities(found.symbol),
      };
    }
    return found;
  }, [currencies, settings.woocommerce_currency]);

  // Preview the price format
  const pricePreview = useMemo(() => {
    const symbol = currentCurrency?.symbol || "$";
    const thousand = settings.woocommerce_price_thousand_sep || ",";
    const decimal = settings.woocommerce_price_decimal_sep || ".";
    const decimals = parseInt(settings.woocommerce_price_num_decimals, 10) || 2;
    const position = settings.woocommerce_currency_pos || "left";

    const formattedNumber = `1${thousand}234${decimal}${"0".repeat(decimals)}`;

    switch (position) {
      case "left":
        return `${symbol}${formattedNumber}`;
      case "right":
        return `${formattedNumber}${symbol}`;
      case "left_space":
        return `${symbol} ${formattedNumber}`;
      case "right_space":
        return `${formattedNumber} ${symbol}`;
      default:
        return `${symbol}${formattedNumber}`;
    }
  }, [settings, currentCurrency]);

  return (
    <div className="space-y-6 text-start">
      {/* Currency Options Card */}
      <Card className="bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600">
        <SettingsCardHeader
          icon={Coins}
          title={__("Currency Options", "whizmanage")}
          description={__("Configure how prices are displayed in your store", "whizmanage")}
        />
        <CardContent className="space-y-6">
          {/* Currency Select with Search */}
          <div className="space-y-2">
            <Label>{__("Currency", "whizmanage")}</Label>
            <Popover open={currencyOpen} onOpenChange={setCurrencyOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={currencyOpen}
                  className="w-full justify-between dark:bg-slate-700 dark:hover:bg-slate-600 text-start"
                >
                  {currentCurrency
                    ? `${currentCurrency.name} (${currentCurrency.symbol})`
                    : __("Select currency...", "whizmanage")}
                  <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command className="dark:bg-slate-800">
                  <CommandInput
                    placeholder={__("Search currency...", "whizmanage")}
                    className="text-start"
                  />
                  <CommandList className="max-h-[300px]">
                    <CommandEmpty>
                      {__("No currency found.", "whizmanage")}
                    </CommandEmpty>
                    <CommandGroup>
                      {currencies.map((currency) => (
                        <CommandItem
                          key={currency.code}
                          value={`${currency.name} ${currency.code}`}
                          onSelect={() => {
                            onUpdate("woocommerce_currency", currency.code);
                            setCurrencyOpen(false);
                          }}
                          className="text-start"
                        >
                          <Check
                            className={cn(
                              "me-2 h-4 w-4",
                              settings.woocommerce_currency === currency.code
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <span className="flex-1">{currency.name}</span>
                          <span className="text-muted-foreground ms-2">
                            {decodeHtmlEntities(currency.symbol)}
                          </span>
                          <span className="text-muted-foreground ms-2 text-xs">
                            ({currency.code})
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Currency Position */}
          <div className="space-y-2">
            <Label>{__("Currency Position", "whizmanage")}</Label>
            <Select
              value={settings.woocommerce_currency_pos || "left"}
              onValueChange={(value) =>
                onUpdate("woocommerce_currency_pos", value)
              }
            >
              <SelectTrigger className="dark:bg-slate-700 text-start">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_POSITIONS.map((pos) => (
                  <SelectItem key={pos.value} value={pos.value} className="text-start">
                    {__(pos.label, "whizmanage")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Separators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="thousand_sep">
                {__("Thousand Separator", "whizmanage")}
              </Label>
              <Input
                id="thousand_sep"
                value={settings.woocommerce_price_thousand_sep ?? ","}
                onChange={(e) =>
                  onUpdate("woocommerce_price_thousand_sep", e.target.value)
                }
                maxLength={1}
                className="dark:bg-slate-700 w-20 text-center"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="decimal_sep">
                {__("Decimal Separator", "whizmanage")}
              </Label>
              <Input
                id="decimal_sep"
                value={settings.woocommerce_price_decimal_sep ?? "."}
                onChange={(e) =>
                  onUpdate("woocommerce_price_decimal_sep", e.target.value)
                }
                maxLength={1}
                className="dark:bg-slate-700 w-20 text-center"
                dir="ltr"
              />
            </div>
          </div>

          {/* Number of Decimals */}
          <div className="space-y-2">
            <Label htmlFor="num_decimals">
              {__("Number of Decimals", "whizmanage")}
            </Label>
            <div className="w-24">
              <Input
                id="num_decimals"
                type="number"
                min="0"
                max="8"
                value={settings.woocommerce_price_num_decimals ?? 2}
                onChange={(e) =>
                  onUpdate(
                    "woocommerce_price_num_decimals",
                    parseInt(e.target.value, 10) || 0
                  )
                }
                className="dark:bg-slate-700 text-center"
                dir="ltr"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="bg-slate-100 dark:bg-slate-700/50 rounded-lg p-4">
            <Label className="text-sm text-muted-foreground">
              {__("Price Preview", "whizmanage")}
            </Label>
            <p className="text-2xl font-bold mt-1 text-fuchsia-600 dark:text-fuchsia-400" dir="ltr">
              {pricePreview}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
