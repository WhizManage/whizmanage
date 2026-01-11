// src/components/settings/tabs/WhizManageTab.jsx

import { __ } from "@wordpress/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table2, History } from "lucide-react";
import SettingsCardHeader from "../SettingsCardHeader";
import FieldVisibilitySettings from "./FieldVisibilitySettings";
import CustomFieldsVisibilitySettings from "./CustomFieldsVisibilitySettings";

const ROWS_PER_PAGE_OPTIONS = [
  { value: "25", label: "25 rows" },
  { value: "50", label: "50 rows" },
  { value: "100", label: "100 rows" },
  { value: "200", label: "200 rows" },
  { value: "500", label: "500 rows" },
];

export default function WhizManageTab({ settings, onUpdate }) {
  return (
    <div className="space-y-6 text-start">
      {/* Table Settings Card */}
      <Card className="bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600">
        <SettingsCardHeader
          icon={Table2}
          title={__("Table Settings", "whizmanage")}
          description={__("Configure default table behavior", "whizmanage")}
        />
        <CardContent className="space-y-6">
          {/* Default Rows Per Page */}
          <div className="space-y-2">
            <Label>{__("Default rows per page", "whizmanage")}</Label>
            <Select
              value={String(settings.whizmanage_default_rows_per_page || "100")}
              onValueChange={(value) =>
                onUpdate("whizmanage_default_rows_per_page", parseInt(value, 10))
              }
            >
              <SelectTrigger className="dark:bg-slate-700 w-[200px] text-start">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROWS_PER_PAGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-start">
                    {__(option.label, "whizmanage")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {__(
                "The default number of rows displayed in tables. Higher values may affect performance.",
                "whizmanage"
              )}
            </p>
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
            <div className="space-y-2">
              <Label htmlFor="history_retention">
                {__("History retention (days)", "whizmanage")}
              </Label>
              <div className="w-24">
                <Input
                  id="history_retention"
                  type="number"
                  min="1"
                  max="365"
                  value={settings.whizmanage_history_retention_days || 30}
                  onChange={(e) =>
                    onUpdate(
                      "whizmanage_history_retention_days",
                      parseInt(e.target.value, 10) || 30
                    )
                  }
                  className="dark:bg-slate-700 text-center"
                  dir="ltr"
                />
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
      <Card className="border-fuchsia-200 dark:border-fuchsia-800 bg-gradient-to-br from-fuchsia-50 to-purple-50 dark:from-fuchsia-900/20 dark:to-purple-900/20">
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
