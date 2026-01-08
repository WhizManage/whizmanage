// src/components/settings/tabs/InventoryTab.jsx

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
import { Package, Bell, LayoutGrid } from "lucide-react";
import SettingsCardHeader from "../SettingsCardHeader";

const CATALOG_ORDERBY_OPTIONS = [
  { value: "menu_order", label: "Default sorting (custom ordering + name)" },
  { value: "popularity", label: "Popularity (sales)" },
  { value: "rating", label: "Average rating" },
  { value: "date", label: "Sort by most recent" },
  { value: "price", label: "Sort by price (asc)" },
  { value: "price-desc", label: "Sort by price (desc)" },
];

export default function InventoryTab({ settings, onUpdate }) {
  return (
    <div className="space-y-6 text-start">
      {/* Stock Management Card */}
      <Card className="bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600">
        <SettingsCardHeader
          icon={Package}
          title={__("Stock Management", "whizmanage")}
          description={__("Configure how stock is managed in your store", "whizmanage")}
        />
        <CardContent className="space-y-6">
          {/* Enable Stock Management */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{__("Enable stock management", "whizmanage")}</Label>
              <p className="text-sm text-muted-foreground">
                {__(
                  "Track stock levels for products",
                  "whizmanage"
                )}
              </p>
            </div>
            <Switch
              checked={settings.woocommerce_manage_stock === "yes"}
              onCheckedChange={(checked) =>
                onUpdate("woocommerce_manage_stock", checked ? "yes" : "no")
              }
            />
          </div>

          {/* Hold Stock Minutes */}
          <div className="space-y-2">
            <Label>{__("Hold stock (minutes)", "whizmanage")}</Label>
            <div className="w-32">
              <Input
                type="number"
                min="0"
                max="1440"
                className="dark:bg-slate-700"
                value={settings.woocommerce_hold_stock_minutes || "60"}
                onChange={(e) =>
                  onUpdate("woocommerce_hold_stock_minutes", e.target.value)
                }
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {__(
                "Hold stock for unpaid orders for this many minutes. Set to 0 to disable.",
                "whizmanage"
              )}
            </p>
          </div>

          {/* Hide Out of Stock Items */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{__("Hide out of stock items", "whizmanage")}</Label>
              <p className="text-sm text-muted-foreground">
                {__(
                  "Hide out of stock items from the catalog",
                  "whizmanage"
                )}
              </p>
            </div>
            <Switch
              checked={settings.woocommerce_hide_out_of_stock_items === "yes"}
              onCheckedChange={(checked) =>
                onUpdate("woocommerce_hide_out_of_stock_items", checked ? "yes" : "no")
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Stock Notifications Card */}
      <Card className="bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600">
        <SettingsCardHeader
          icon={Bell}
          title={__("Stock Notifications", "whizmanage")}
          description={__("Configure email notifications for stock levels", "whizmanage")}
        />
        <CardContent className="space-y-6">
          {/* Low Stock Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{__("Low stock notifications", "whizmanage")}</Label>
              <p className="text-sm text-muted-foreground">
                {__(
                  "Enable email notifications for low stock",
                  "whizmanage"
                )}
              </p>
            </div>
            <Switch
              checked={settings.woocommerce_notify_low_stock === "yes"}
              onCheckedChange={(checked) =>
                onUpdate("woocommerce_notify_low_stock", checked ? "yes" : "no")
              }
            />
          </div>

          {/* Out of Stock Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{__("Out of stock notifications", "whizmanage")}</Label>
              <p className="text-sm text-muted-foreground">
                {__(
                  "Enable email notifications when products go out of stock",
                  "whizmanage"
                )}
              </p>
            </div>
            <Switch
              checked={settings.woocommerce_notify_no_stock === "yes"}
              onCheckedChange={(checked) =>
                onUpdate("woocommerce_notify_no_stock", checked ? "yes" : "no")
              }
            />
          </div>

          {/* Notification Email Recipient */}
          <div className="space-y-2">
            <Label>{__("Notification recipient", "whizmanage")}</Label>
            <Input
              type="email"
              className="dark:bg-slate-700 w-full max-w-md"
              placeholder="email@example.com"
              value={settings.woocommerce_stock_email_recipient || ""}
              onChange={(e) =>
                onUpdate("woocommerce_stock_email_recipient", e.target.value)
              }
            />
            <p className="text-sm text-muted-foreground">
              {__(
                "Email address to receive stock notifications",
                "whizmanage"
              )}
            </p>
          </div>

          {/* Low Stock Threshold */}
          <div className="space-y-2">
            <Label>{__("Low stock threshold", "whizmanage")}</Label>
            <div className="w-24">
              <Input
                type="number"
                min="0"
                className="dark:bg-slate-700"
                value={settings.woocommerce_notify_low_stock_amount || "2"}
                onChange={(e) =>
                  onUpdate("woocommerce_notify_low_stock_amount", e.target.value)
                }
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {__(
                "When product stock reaches this amount, a notification will be sent",
                "whizmanage"
              )}
            </p>
          </div>

          {/* Out of Stock Threshold */}
          <div className="space-y-2">
            <Label>{__("Out of stock threshold", "whizmanage")}</Label>
            <div className="w-24">
              <Input
                type="number"
                min="0"
                className="dark:bg-slate-700"
                value={settings.woocommerce_low_stock_amount || "0"}
                onChange={(e) =>
                  onUpdate("woocommerce_low_stock_amount", e.target.value)
                }
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {__(
                "When product stock reaches this amount, it will be considered out of stock",
                "whizmanage"
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Products Display Card */}
      <Card className="bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600">
        <SettingsCardHeader
          icon={LayoutGrid}
          title={__("Products Display", "whizmanage")}
          description={__("Configure how products are displayed in your catalog", "whizmanage")}
        />
        <CardContent className="space-y-6">
          {/* Catalog Columns */}
          <div className="space-y-2">
            <Label>{__("Products per row", "whizmanage")}</Label>
            <div className="w-24">
              <Input
                type="number"
                min="1"
                max="6"
                className="dark:bg-slate-700"
                value={settings.woocommerce_catalog_columns || "4"}
                onChange={(e) =>
                  onUpdate("woocommerce_catalog_columns", e.target.value)
                }
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {__(
                "Number of products to display per row in the catalog (1-6)",
                "whizmanage"
              )}
            </p>
          </div>

          {/* Catalog Rows */}
          <div className="space-y-2">
            <Label>{__("Rows per page", "whizmanage")}</Label>
            <div className="w-24">
              <Input
                type="number"
                min="1"
                max="10"
                className="dark:bg-slate-700"
                value={settings.woocommerce_catalog_rows || "4"}
                onChange={(e) =>
                  onUpdate("woocommerce_catalog_rows", e.target.value)
                }
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {__(
                "Number of rows to display per page in the catalog (1-10)",
                "whizmanage"
              )}
            </p>
          </div>

          {/* Default Sort Order */}
          <div className="space-y-2">
            <Label>{__("Default product sorting", "whizmanage")}</Label>
            <Select
              value={settings.woocommerce_default_catalog_orderby || "menu_order"}
              onValueChange={(value) =>
                onUpdate("woocommerce_default_catalog_orderby", value)
              }
            >
              <SelectTrigger className="dark:bg-slate-700 w-full max-w-md text-start">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATALOG_ORDERBY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-start">
                    {__(option.label, "whizmanage")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {__(
                "Default sorting order for products in the catalog",
                "whizmanage"
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
