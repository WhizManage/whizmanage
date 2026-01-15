// src/components/settings/tabs/FieldVisibilitySettings.jsx

import { useState, useMemo, useCallback } from "react";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Package,
  Tag,
  ShoppingCart,
  Users,
  Percent,
  ChevronRight,
  Eye,
  EyeOff,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import SettingsCardHeader from "../SettingsCardHeader";
import { cn } from "@/lib/utils";

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

// Single field item component
function FieldItem({ field, isHidden, onToggle }) {
  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 p-3 rounded-xl transition-all duration-300",
        "border border-transparent",
        "hover:border-slate-200 dark:hover:border-slate-600",
        "hover:bg-white dark:hover:bg-slate-800/50",
        "hover:shadow-sm",
        isHidden && "opacity-60"
      )}
    >
      {/* Field info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-sm font-medium truncate transition-colors",
              isHidden
                ? "text-slate-400 dark:text-slate-500"
                : "text-slate-700 dark:text-slate-200"
            )}
          >
            {__(field.label, "whizmanage")}
            {field.required && (
              <span className="text-red-500 ms-1">*</span>
            )}
          </span>
        </div>
        <code
          className={cn(
            "text-[10px] font-mono px-1.5 py-0.5 rounded mt-1 inline-block transition-colors",
            isHidden
              ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600"
              : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
          )}
        >
          {field.name}
        </code>
      </div>

      {/* Visibility toggle */}
      <div className="flex items-center gap-2 shrink-0">
        {isHidden && (
          <Badge
            variant="secondary"
            className="hidden sm:flex bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px] px-1.5 py-0.5"
          >
            <EyeOff className="w-3 h-3 me-1" />
            {__("Hidden", "whizmanage")}
          </Badge>
        )}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Switch
                  checked={!isHidden}
                  onCheckedChange={onToggle}
                  disabled={field.required}
                  className="data-[state=checked]:bg-fuchsia-600"
                />
              </div>
            </TooltipTrigger>
            {field.required && (
              <TooltipContent side="top" className="text-xs">
                {__("Required field cannot be hidden", "whizmanage")}
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

// Entity group component (like SourceGroup in CustomFieldsVisibilitySettings)
function EntityGroup({
  entityKey,
  config,
  hiddenFields,
  onToggleField,
  onShowAll,
  onHideAll,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = config.icon;

  const allFields = useMemo(() => {
    return config.groups.flatMap((group) => group.fields);
  }, [config.groups]);

  const visibleCount = useMemo(() => {
    const entityHidden = hiddenFields[entityKey] || [];
    return allFields.filter((f) => !entityHidden.includes(f.name)).length;
  }, [allFields, hiddenFields, entityKey]);

  const hiddenCount = allFields.length - visibleCount;
  const allHidden = hiddenCount === allFields.length;
  const allVisible = visibleCount === allFields.length;

  const isFieldHidden = (fieldName) => {
    const entityHidden = hiddenFields[entityKey] || [];
    return entityHidden.includes(fieldName);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="group/entity">
      <div
        className={cn(
          "rounded-2xl border transition-all duration-300 overflow-hidden",
          "border-slate-200 dark:border-slate-700",
          isOpen ? "shadow-md" : "shadow-sm hover:shadow-md"
        )}
      >
        {/* Entity header */}
        <CollapsibleTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-3 p-4 cursor-pointer transition-all duration-300",
              "bg-slate-50 dark:bg-slate-800/50",
              "hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            {/* Entity icon with brand gradient background */}
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-fuchsia-500 to-purple-600 shadow-lg">
              <Icon className="w-5 h-5 text-white" />
            </div>

            {/* Entity info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm sm:text-base text-slate-800 dark:text-slate-200">
                {__(config.label, "whizmanage")}
              </h4>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {allFields.length} {__("fields", "whizmanage")}
                </span>
                {hiddenCount > 0 && (
                  <>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <EyeOff className="w-3 h-3" />
                      {hiddenCount} {__("hidden", "whizmanage")}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Stats badge */}
            <div className="hidden sm:flex items-center gap-2">
              <Badge
                variant="secondary"
                className="text-xs px-2 py-1 bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-700 dark:text-fuchsia-300"
              >
                <Eye className="w-3 h-3 me-1" />
                {visibleCount}/{allFields.length}
              </Badge>
            </div>

            {/* Chevron */}
            <div
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300",
                "bg-white/50 dark:bg-slate-700/50",
                isOpen && "rotate-90"
              )}
            >
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        </CollapsibleTrigger>

        {/* Fields list */}
        <CollapsibleContent>
          <div className="bg-slate-50/50 dark:bg-slate-900/30">
            {/* Bulk actions */}
            <div className="flex items-center justify-end gap-2 px-4 py-2 border-b border-slate-200/50 dark:border-slate-700/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={onShowAll}
                disabled={allVisible}
                className={cn(
                  "text-xs h-7 px-2",
                  "text-slate-500 hover:text-fuchsia-600 dark:text-slate-400 dark:hover:text-fuchsia-400",
                  "disabled:opacity-40"
                )}
              >
                <Eye className="w-3 h-3 me-1" />
                {__("Show All", "whizmanage")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onHideAll}
                disabled={allHidden}
                className={cn(
                  "text-xs h-7 px-2",
                  "text-slate-500 hover:text-fuchsia-600 dark:text-slate-400 dark:hover:text-fuchsia-400",
                  "disabled:opacity-40"
                )}
              >
                <EyeOff className="w-3 h-3 me-1" />
                {__("Hide All", "whizmanage")}
              </Button>
            </div>

            {/* Fields by group */}
            <div className="p-3 space-y-4">
              {config.groups.map((group) => (
                <div key={group.id}>
                  <h5 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 px-1">
                    {__(group.title, "whizmanage")}
                  </h5>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-1">
                    {group.fields.map((field) => (
                      <FieldItem
                        key={field.name}
                        field={field}
                        isHidden={isFieldHidden(field.name)}
                        onToggle={() => onToggleField(entityKey, field.name)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </div>
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

  const handleToggleField = useCallback(
    (entityKey, fieldName) => {
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
    },
    [hiddenFields, onUpdate]
  );

  const handleShowAllInEntity = useCallback(
    (entityKey) => {
      const current = { ...hiddenFields };
      delete current[entityKey];
      onUpdate("whizmanage_hidden_fields", JSON.stringify(current));
    },
    [hiddenFields, onUpdate]
  );

  const handleHideAllInEntity = useCallback(
    (entityKey) => {
      const config = ENTITY_CONFIGS[entityKey];
      if (!config) return;

      const allFields = config.groups.flatMap((group) =>
        group.fields.filter((f) => !f.required).map((f) => f.name)
      );

      const current = { ...hiddenFields };
      current[entityKey] = allFields;
      onUpdate("whizmanage_hidden_fields", JSON.stringify(current));
    },
    [hiddenFields, onUpdate]
  );

  const handleResetAll = useCallback(() => {
    onUpdate("whizmanage_hidden_fields", JSON.stringify({}));
  }, [onUpdate]);

  const totalHiddenCount = useMemo(() => {
    return Object.values(hiddenFields).reduce(
      (sum, fields) => sum + (fields?.length || 0),
      0
    );
  }, [hiddenFields]);

  const entityOrder = ["products", "coupons", "orders", "customers", "discount_rules"];

  return (
    <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 overflow-hidden">
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
            <span className="hidden sm:inline">{__("Show All", "whizmanage")}</span>
          </Button>
        )}
      </SettingsCardHeader>

      <CardContent className="pt-0">
        <div className="space-y-4">
          {entityOrder.map((entityKey) => {
            const config = ENTITY_CONFIGS[entityKey];
            if (!config) return null;
            return (
              <EntityGroup
                key={entityKey}
                entityKey={entityKey}
                config={config}
                hiddenFields={hiddenFields}
                onToggleField={handleToggleField}
                onShowAll={() => handleShowAllInEntity(entityKey)}
                onHideAll={() => handleHideAllInEntity(entityKey)}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
