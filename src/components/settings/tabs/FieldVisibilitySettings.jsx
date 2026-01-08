// src/components/settings/tabs/FieldVisibilitySettings.jsx

import { useState, useMemo } from "react";
import { __ } from "@wordpress/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Package,
  Tag,
  ShoppingCart,
  Users,
  Percent,
  ChevronDown,
  ChevronRight,
  EyeOff,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import SettingsCardHeader from "../SettingsCardHeader";

// Entity definitions with their fields
const ENTITY_CONFIGS = {
  products: {
    label: "Products",
    icon: Package,
    groups: [
      {
        id: "description",
        title: "Product Description",
        fields: [
          { name: "name", label: "Product Name", required: true },
          { name: "description", label: "Description" },
          { name: "short_description", label: "Short Description" },
        ],
      },
      {
        id: "pricing",
        title: "Pricing",
        fields: [
          { name: "regular_price", label: "Regular Price", required: true },
          { name: "sale_price", label: "Sale Price" },
          { name: "date_on_sale", label: "Sale Schedule" },
        ],
      },
      {
        id: "inventory",
        title: "Inventory",
        fields: [
          { name: "sku", label: "SKU" },
          { name: "manage_stock", label: "Manage Stock" },
          { name: "stock_quantity", label: "Stock Quantity" },
          { name: "backorders", label: "Backorders" },
          { name: "stock_status", label: "Stock Status" },
        ],
      },
      {
        id: "images",
        title: "Images",
        fields: [
          { name: "image", label: "Product Image" },
          { name: "images", label: "Product Gallery" },
        ],
      },
      {
        id: "taxonomy",
        title: "Categories & Tags",
        fields: [
          { name: "tags", label: "Tags" },
          { name: "categories", label: "Categories" },
          { name: "additional_taxonomies", label: "Additional Taxonomies" },
        ],
      },
      {
        id: "additional",
        title: "Additional Fields",
        fields: [
          { name: "status", label: "Product Status" },
          { name: "purchase_note", label: "Purchase Note" },
          { name: "downloadable", label: "Downloadable Settings" },
        ],
      },
      {
        id: "linked",
        title: "Linked Products",
        fields: [
          { name: "upsell_ids", label: "Upsells" },
          { name: "cross_sell_ids", label: "Cross-sells" },
        ],
      },
      {
        id: "custom",
        title: "Custom Fields",
        fields: [{ name: "meta_data", label: "Custom Fields" }],
      },
      {
        id: "type",
        title: "Product Type",
        fields: [{ name: "type", label: "Product Type" }],
      },
    ],
  },
  coupons: {
    label: "Coupons",
    icon: Tag,
    groups: [
      {
        id: "details",
        title: "Coupon Details",
        fields: [
          { name: "code", label: "Coupon Code", required: true },
          { name: "description", label: "Description" },
          { name: "discount_type", label: "Discount Type", required: true },
          { name: "amount", label: "Amount", required: true },
          { name: "free_shipping", label: "Free Shipping" },
          { name: "date_expires", label: "Expiry Date" },
        ],
      },
      {
        id: "usage_limits",
        title: "Usage Limits",
        fields: [
          { name: "usage_limit", label: "Usage Limit" },
          { name: "usage_limit_per_user", label: "Limit Per User" },
          { name: "limit_usage_to_x_items", label: "Limit to X Items" },
        ],
      },
      {
        id: "product_restrictions",
        title: "Product Restrictions",
        fields: [
          { name: "product_ids", label: "Products" },
          { name: "excluded_product_ids", label: "Excluded Products" },
          { name: "product_categories", label: "Categories" },
          { name: "excluded_product_categories", label: "Excluded Categories" },
        ],
      },
      {
        id: "general_restrictions",
        title: "General Restrictions",
        fields: [
          { name: "minimum_amount", label: "Minimum Spend" },
          { name: "maximum_amount", label: "Maximum Spend" },
          { name: "email_restrictions", label: "Email Restrictions" },
          { name: "individual_use", label: "Individual Use" },
          { name: "exclude_sale_items", label: "Exclude Sale Items" },
        ],
      },
    ],
  },
  orders: {
    label: "Orders",
    icon: ShoppingCart,
    groups: [
      {
        id: "details",
        title: "Order Details",
        fields: [
          { name: "status", label: "Order Status", required: true },
          { name: "payment_method", label: "Payment Method" },
          { name: "date_created_gmt", label: "Order Date" },
          { name: "set_paid", label: "Mark as Paid" },
          { name: "customer_note", label: "Customer Note" },
        ],
      },
      {
        id: "customer",
        title: "Customer Information",
        fields: [
          { name: "customer_id", label: "Customer" },
          { name: "billing", label: "Billing Address" },
          { name: "shipping", label: "Shipping Address" },
        ],
      },
      {
        id: "items",
        title: "Order Items",
        fields: [{ name: "line_items", label: "Line Items", required: true }],
      },
      {
        id: "custom",
        title: "Custom Fields",
        fields: [{ name: "meta_data", label: "Custom Fields" }],
      },
    ],
  },
  customers: {
    label: "Customers",
    icon: Users,
    groups: [
      {
        id: "details",
        title: "Customer Details",
        fields: [
          { name: "role", label: "Role" },
          { name: "email", label: "Email", required: true },
          { name: "first_name", label: "First Name" },
          { name: "last_name", label: "Last Name" },
          { name: "username", label: "Username" },
          { name: "password", label: "Password" },
          { name: "note", label: "Internal Note" },
        ],
      },
      {
        id: "billing",
        title: "Billing Address",
        fields: [
          { name: "billing.first_name", label: "Billing First Name" },
          { name: "billing.last_name", label: "Billing Last Name" },
          { name: "billing.company", label: "Company" },
          { name: "billing.address_1", label: "Address Line 1" },
          { name: "billing.address_2", label: "Address Line 2" },
          { name: "billing.city", label: "City" },
          { name: "billing.state", label: "State" },
          { name: "billing.postcode", label: "Postcode" },
          { name: "billing.country", label: "Country" },
          { name: "billing.phone", label: "Phone" },
          { name: "billing.email", label: "Billing Email" },
        ],
      },
      {
        id: "shipping",
        title: "Shipping Address",
        fields: [
          { name: "shipping.first_name", label: "Shipping First Name" },
          { name: "shipping.last_name", label: "Shipping Last Name" },
          { name: "shipping.company", label: "Company" },
          { name: "shipping.address_1", label: "Address Line 1" },
          { name: "shipping.address_2", label: "Address Line 2" },
          { name: "shipping.city", label: "City" },
          { name: "shipping.state", label: "State" },
          { name: "shipping.postcode", label: "Postcode" },
          { name: "shipping.country", label: "Country" },
        ],
      },
    ],
  },
  discount_rules: {
    label: "Discount Rules",
    icon: Percent,
    groups: [
      {
        id: "details",
        title: "Rule Details",
        fields: [
          { name: "name", label: "Rule Name", required: true },
          { name: "type", label: "Discount Type", required: true },
          { name: "status", label: "Status" },
          { name: "priority", label: "Priority" },
        ],
      },
      {
        id: "schedule",
        title: "Schedule",
        fields: [{ name: "date_range", label: "Schedule" }],
      },
      {
        id: "filters",
        title: "Filters",
        fields: [{ name: "filters", label: "Filters" }],
      },
      {
        id: "conditions",
        title: "Conditions",
        fields: [{ name: "conditions", label: "Conditions" }],
      },
    ],
  },
};

function EntityFieldSettings({ entityKey, config, hiddenFields, onToggleField, onResetEntity }) {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = config.icon;

  const hiddenCount = useMemo(() => {
    const entityHidden = hiddenFields[entityKey] || [];
    return entityHidden.length;
  }, [hiddenFields, entityKey]);

  const totalFields = useMemo(() => {
    return config.groups.reduce((sum, group) => sum + group.fields.length, 0);
  }, [config.groups]);

  const isFieldHidden = (fieldName) => {
    const entityHidden = hiddenFields[entityKey] || [];
    return entityHidden.includes(fieldName);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-fuchsia-100 dark:bg-fuchsia-900/30 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-fuchsia-600 dark:text-fuchsia-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm sm:text-base text-slate-800 dark:text-slate-200 truncate">
              {__(config.label, "whizmanage")}
            </h4>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {totalFields} {__("fields", "whizmanage")}
              {hiddenCount > 0 && (
                <span className="text-amber-600 dark:text-amber-400 ms-1">
                  • {hiddenCount} {__("hidden", "whizmanage")}
                </span>
              )}
            </p>
          </div>
          {hiddenCount > 0 && (
            <Badge variant="secondary" className="hidden sm:flex bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs shrink-0">
              <EyeOff className="w-3 h-3 me-1" />
              {hiddenCount}
            </Badge>
          )}
          {isOpen ? (
            <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 shrink-0" />
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-2 sm:px-4 pb-4 space-y-3 sm:space-y-4">
          {hiddenCount > 0 && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onResetEntity(entityKey)}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-xs sm:text-sm"
              >
                <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 me-1 sm:me-2" />
                {__("Show all fields", "whizmanage")}
              </Button>
            </div>
          )}

          {config.groups.map((group) => (
            <div key={group.id} className="space-y-2">
              <h5 className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-600 pb-1">
                {__(group.title, "whizmanage")}
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                {group.fields.map((field) => (
                  <div
                    key={field.name}
                    className="flex items-center justify-between p-1.5 sm:p-2 rounded-md bg-slate-50 dark:bg-slate-700/30"
                  >
                    <Label className="text-xs sm:text-sm cursor-pointer">
                      {__(field.label, "whizmanage")}
                      {field.required && (
                        <span className="text-red-500 ms-1">*</span>
                      )}
                    </Label>
                    <Switch
                      checked={!isFieldHidden(field.name)}
                      onCheckedChange={() => onToggleField(entityKey, field.name)}
                      disabled={field.required}
                      className="scale-90 sm:scale-100"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function FieldVisibilitySettings({ settings, onUpdate }) {
  // Parse hidden fields from settings
  const hiddenFields = useMemo(() => {
    const stored = settings.whizmanage_hidden_fields;
    if (!stored) return {};
    if (typeof stored === "string") {
      try {
        return JSON.parse(stored);
      } catch {
        return {};
      }
    }
    return stored;
  }, [settings.whizmanage_hidden_fields]);

  const handleToggleField = (entityKey, fieldName) => {
    const current = { ...hiddenFields };
    if (!current[entityKey]) {
      current[entityKey] = [];
    }

    const idx = current[entityKey].indexOf(fieldName);
    if (idx === -1) {
      // Hide the field
      current[entityKey] = [...current[entityKey], fieldName];
    } else {
      // Show the field
      current[entityKey] = current[entityKey].filter((f) => f !== fieldName);
    }

    // Clean up empty arrays
    if (current[entityKey].length === 0) {
      delete current[entityKey];
    }

    onUpdate("whizmanage_hidden_fields", JSON.stringify(current));
  };

  const handleResetEntity = (entityKey) => {
    const current = { ...hiddenFields };
    delete current[entityKey];
    onUpdate("whizmanage_hidden_fields", JSON.stringify(current));
  };

  const handleResetAll = () => {
    onUpdate("whizmanage_hidden_fields", JSON.stringify({}));
  };

  const totalHiddenCount = useMemo(() => {
    return Object.values(hiddenFields).reduce(
      (sum, fields) => sum + (fields?.length || 0),
      0
    );
  }, [hiddenFields]);

  return (
    <Card className="bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600">
      <SettingsCardHeader
        icon={SlidersHorizontal}
        title={__("Form Fields Visibility", "whizmanage")}
        description={__("Choose which fields to show or hide in creation forms. Required fields cannot be hidden.", "whizmanage")}
      >
        {totalHiddenCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetAll}
            className="dark:bg-slate-700 dark:hover:bg-slate-600 shrink-0"
          >
            <RotateCcw className="w-4 h-4 sm:me-2" />
            <span className="hidden sm:inline">{__("Reset all", "whizmanage")}</span>
          </Button>
        )}
      </SettingsCardHeader>
      <CardContent className="space-y-2">
        {Object.entries(ENTITY_CONFIGS).map(([key, config]) => (
          <EntityFieldSettings
            key={key}
            entityKey={key}
            config={config}
            hiddenFields={hiddenFields}
            onToggleField={handleToggleField}
            onResetEntity={handleResetEntity}
          />
        ))}
      </CardContent>
    </Card>
  );
}
