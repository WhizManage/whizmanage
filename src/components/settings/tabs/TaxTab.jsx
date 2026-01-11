// src/components/settings/tabs/TaxTab.jsx

import { __ } from "@wordpress/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Receipt } from "lucide-react";
import SettingsCardHeader from "../SettingsCardHeader";

const TAX_DISPLAY_OPTIONS = [
  { value: "incl", label: "Including tax" },
  { value: "excl", label: "Excluding tax" },
];

export default function TaxTab({ settings, onUpdate }) {
  const taxEnabled = settings.woocommerce_calc_taxes === "yes";

  return (
    <div className="space-y-6 text-start">
      {/* Tax Settings Card */}
      <Card className="bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600">
        <SettingsCardHeader
          icon={Receipt}
          title={__("Tax Settings", "whizmanage")}
          description={__("Configure how taxes are calculated and displayed", "whizmanage")}
        />
        <CardContent className="space-y-6">
          {/* Enable Taxes */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5 flex-1">
              <Label>{__("Enable taxes", "whizmanage")}</Label>
              <p className="text-sm text-muted-foreground">
                {__("Enable tax rates and calculations", "whizmanage")}
              </p>
            </div>
            <Switch
              checked={taxEnabled}
              onCheckedChange={(checked) =>
                onUpdate("woocommerce_calc_taxes", checked ? "yes" : "no")
              }
            />
          </div>

          {/* Tax Options - only show if taxes are enabled */}
          {taxEnabled && (
            <>
              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Prices Include Tax */}
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5 flex-1">
                  <Label>{__("Prices entered with tax", "whizmanage")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {__(
                      "When enabled, product prices include tax by default",
                      "whizmanage"
                    )}
                  </p>
                </div>
                <Switch
                  checked={settings.woocommerce_prices_include_tax === "yes"}
                  onCheckedChange={(checked) =>
                    onUpdate(
                      "woocommerce_prices_include_tax",
                      checked ? "yes" : "no"
                    )
                  }
                />
              </div>

              {/* Display in Shop */}
              <div className="space-y-2">
                <Label>{__("Display prices in the shop", "whizmanage")}</Label>
                <Select
                  value={settings.woocommerce_tax_display_shop || "excl"}
                  onValueChange={(value) =>
                    onUpdate("woocommerce_tax_display_shop", value)
                  }
                >
                  <SelectTrigger className="dark:bg-slate-700 w-[250px] text-start">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TAX_DISPLAY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="text-start">
                        {__(option.label, "whizmanage")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {__(
                    "This option is for prices on the frontend of your store",
                    "whizmanage"
                  )}
                </p>
              </div>

              {/* Display in Cart */}
              <div className="space-y-2">
                <Label>
                  {__("Display prices during cart and checkout", "whizmanage")}
                </Label>
                <Select
                  value={settings.woocommerce_tax_display_cart || "excl"}
                  onValueChange={(value) =>
                    onUpdate("woocommerce_tax_display_cart", value)
                  }
                >
                  <SelectTrigger className="dark:bg-slate-700 w-[250px] text-start">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TAX_DISPLAY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="text-start">
                        {__(option.label, "whizmanage")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {__(
                    "This option is for prices displayed in cart and checkout",
                    "whizmanage"
                  )}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      {taxEnabled && (
        <Card className="border-fuchsia-200 dark:border-fuchsia-800 bg-fuchsia-50 dark:bg-fuchsia-900/20">
          <CardContent className="pt-6">
            <p className="text-sm text-fuchsia-700 dark:text-fuchsia-300">
              <strong>{__("Note:", "whizmanage")}</strong>{" "}
              {__(
                "For detailed tax rate configuration, please visit WooCommerce Settings > Tax in the WordPress admin.",
                "whizmanage"
              )}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
