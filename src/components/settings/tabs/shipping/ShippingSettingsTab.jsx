// src/components/settings/tabs/shipping/ShippingSettingsTab.jsx

import { useState, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { Settings, Calculator, MapPin, Save, Loader2 } from "lucide-react";
import { addToast } from "@heroui/react";
import SettingsCardHeader from "../../SettingsCardHeader";
import {
  getShippingSettings,
  updateShippingSettings,
} from "@/services/shippingService";

export default function ShippingSettingsTab() {
  const [settings, setSettings] = useState({
    woocommerce_enable_shipping_calc: "yes",
    woocommerce_shipping_cost_requires_address: "no",
    woocommerce_ship_to_destination: "billing",
    woocommerce_shipping_debug_mode: "no",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await getShippingSettings();
      setSettings(data);
      setOriginalSettings(data);
    } catch (error) {
      addToast({
        title: __("Error", "whizmanage"),
        description: __("Failed to load shipping settings", "whizmanage"),
        color: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings((prev) => {
      const updated = { ...prev, [key]: value };
      setHasChanges(JSON.stringify(updated) !== JSON.stringify(originalSettings));
      return updated;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateShippingSettings(settings);
      setOriginalSettings(settings);
      setHasChanges(false);
      addToast({
        title: __("Success", "whizmanage"),
        description: __("Shipping settings saved", "whizmanage"),
        color: "success",
      });
    } catch (error) {
      addToast({
        title: __("Error", "whizmanage"),
        description: __("Failed to save settings", "whizmanage"),
        color: "danger",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(originalSettings);
    setHasChanges(false);
  };

  const isRtl = window?.document?.documentElement?.dir === "rtl";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-fuchsia-600" />
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {__("Loading settings...", "whizmanage")}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      {/* Calculations Card */}
      <Card className="bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600">
        <SettingsCardHeader
          icon={Calculator}
          title={__("Calculations", "whizmanage")}
          description={__("Configure how shipping costs are calculated", "whizmanage")}
        />
        <CardContent className="space-y-6">
          {/* Enable shipping calculator */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{__("Enable shipping calculator on cart page", "whizmanage")}</Label>
              <p className="text-sm text-muted-foreground">
                {__("Allow customers to estimate shipping before checkout", "whizmanage")}
              </p>
            </div>
            <Switch
              checked={settings.woocommerce_enable_shipping_calc === "yes"}
              onCheckedChange={(checked) =>
                updateSetting("woocommerce_enable_shipping_calc", checked ? "yes" : "no")
              }
            />
          </div>

          {/* Hide shipping costs until address entered */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{__("Hide shipping costs until an address is entered", "whizmanage")}</Label>
              <p className="text-sm text-muted-foreground">
                {__("Shipping rates will only show after customer enters their address", "whizmanage")}
              </p>
            </div>
            <Switch
              checked={settings.woocommerce_shipping_cost_requires_address === "yes"}
              onCheckedChange={(checked) =>
                updateSetting("woocommerce_shipping_cost_requires_address", checked ? "yes" : "no")
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Shipping Destination Card */}
      <Card className="bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600">
        <SettingsCardHeader
          icon={MapPin}
          title={__("Shipping Destination", "whizmanage")}
          description={__("Choose where to ship orders", "whizmanage")}
        />
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>{__("Shipping destination", "whizmanage")}</Label>
            <Select
              value={settings.woocommerce_ship_to_destination || "billing"}
              onValueChange={(value) =>
                updateSetting("woocommerce_ship_to_destination", value)
              }
            >
              <SelectTrigger className="dark:bg-slate-700 w-full max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="billing">
                  {__("Default to customer billing address", "whizmanage")}
                </SelectItem>
                <SelectItem value="shipping">
                  {__("Default to customer shipping address", "whizmanage")}
                </SelectItem>
                <SelectItem value="billing_only">
                  {__("Force shipping to customer billing address", "whizmanage")}
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {__("This controls which address is used for shipping by default.", "whizmanage")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Debug Mode Card */}
      <Card className="bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600">
        <SettingsCardHeader
          icon={Settings}
          title={__("Debug Mode", "whizmanage")}
          description={__("Troubleshooting options", "whizmanage")}
        />
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{__("Enable debug mode", "whizmanage")}</Label>
              <p className="text-sm text-muted-foreground">
                {__("Enable shipping debug mode to show matching shipping zones on cart/checkout", "whizmanage")}
              </p>
            </div>
            <Switch
              checked={settings.woocommerce_shipping_debug_mode === "yes"}
              onCheckedChange={(checked) =>
                updateSetting("woocommerce_shipping_debug_mode", checked ? "yes" : "no")
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={handleReset} disabled={isSaving}>
            {__("Reset", "whizmanage")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-fuchsia-600 hover:bg-fuchsia-700"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 me-2 animate-spin" />
                {__("Saving...", "whizmanage")}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 me-2" />
                {__("Save Changes", "whizmanage")}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
