// src/components/settings/tabs/WhizManageTab.jsx

import { __ } from "@wordpress/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table2, History, Package, ShoppingCart, Users, Ticket, Percent } from "lucide-react";
import SettingsCardHeader from "../SettingsCardHeader";
import FieldVisibilitySettings from "./FieldVisibilitySettings";
import CustomFieldsVisibilitySettings from "./CustomFieldsVisibilitySettings";

const ROWS_PER_PAGE_OPTIONS = [
  { value: "25", label: "25" },
  { value: "50", label: "50" },
  { value: "100", label: "100" },
  { value: "200", label: "200" },
  { value: "500", label: "500" },
];

// Table entities configuration - ids must match storeName in createTableStore
const TABLE_ENTITIES = [
  { id: "products", label: "Products", icon: Package },
  { id: "orders", label: "Orders", icon: ShoppingCart },
  { id: "customers", label: "Customers", icon: Users },
  { id: "coupons", label: "Coupons", icon: Ticket },
  { id: "discount-rules", label: "Discount Rules", icon: Percent },
];

export default function WhizManageTab({ settings, onUpdate, perPageSettings, onUpdatePerPage }) {
  return (
    <div className="space-y-6 text-start">
      {/* Table Settings Card */}
      <Card className="bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600">
        <SettingsCardHeader
          icon={Table2}
          title={__("Table Settings", "whizmanage")}
          description={__("Configure number of rows for each table", "whizmanage")}
        />
        <CardContent className="space-y-6">
          {/* Rows Per Page for each table */}
          <div className="space-y-4">
            <Label className="text-base font-medium">{__("Rows per page", "whizmanage")}</Label>
            <p className="text-sm text-muted-foreground -mt-2">
              {__(
                "Set the default number of rows displayed for each table. Higher values may affect performance.",
                "whizmanage"
              )}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {TABLE_ENTITIES.map((entity) => {
                const Icon = entity.icon;
                return (
                  <div
                    key={entity.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-600 dark:text-fuchsia-400">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Label className="text-sm font-medium truncate block">
                        {__(entity.label, "whizmanage")}
                      </Label>
                    </div>
                    <Select
                      value={String(perPageSettings?.[entity.id] || "100")}
                      onValueChange={(value) => onUpdatePerPage(entity.id, value)}
                    >
                      <SelectTrigger className="dark:bg-slate-700 w-20 text-start h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROWS_PER_PAGE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value} className="text-start">
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History Settings Card */}
      <Card className="bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600">
        <SettingsCardHeader
          icon={History}
          title={__("History & Tracking", "whizmanage")}
          description={__("Configure change history and tracking options", "whizmanage")}
        />
        <CardContent className="space-y-6">
          {/* Enable History */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5 flex-1">
              <Label>{__("Enable history tracking", "whizmanage")}</Label>
              <p className="text-sm text-muted-foreground">
                {__(
                  "Track changes made to products, orders, and other items",
                  "whizmanage"
                )}
              </p>
            </div>
            <Switch
              checked={settings.whizmanage_enable_history === "yes"}
              onCheckedChange={(checked) =>
                onUpdate("whizmanage_enable_history", checked ? "yes" : "no")
              }
            />
          </div>

          {/* History Retention */}
          {settings.whizmanage_enable_history === "yes" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="history_retention">
                  {__("History retention (days)", "whizmanage")}
                </Label>
                <span className="text-sm font-medium bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-600 dark:text-fuchsia-400 px-3 py-1 rounded-full" dir="ltr">
                  {settings.whizmanage_history_retention_days || 30} {__("days", "whizmanage")}
                </span>
              </div>
              <div className="px-1">
                <Slider
                  id="history_retention"
                  min={1}
                  max={90}
                  step={1}
                  value={[parseInt(settings.whizmanage_history_retention_days, 10) || 30]}
                  onValueChange={([value]) =>
                    onUpdate("whizmanage_history_retention_days", value)
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-2" dir="ltr">
                  <span>1</span>
                  <span>30</span>
                  <span>60</span>
                  <span>90</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {__(
                  "How many days to keep history records. Older records will be automatically deleted.",
                  "whizmanage"
                )}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Field Visibility Settings */}
      <FieldVisibilitySettings settings={settings} onUpdate={onUpdate} />

      {/* Custom Fields Visibility Settings */}
      <CustomFieldsVisibilitySettings settings={settings} onUpdate={onUpdate} />

      {/* About Card */}
      <Card className="border-fuchsia-200/70 dark:border-fuchsia-400/20 bg-gradient-to-br from-fuchsia-50 to-purple-50 dark:!bg-slate-900/70 dark:from-transparent dark:to-transparent">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-lg">W</span>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                {window.hasLicence
                  ? "WhizManage Pro"
                  : "WhizManage"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {__("Version", "whizmanage")} {window?.version || "2.0"}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
            {window.hasLicence
              ? __(
                "Thank you for using WhizManage Pro! For support and documentation, visit our website.",
                "whizmanage"
              )
              : __(
                "Thank you for using WhizManage! For support and documentation, visit our website.",
                "whizmanage"
              )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
