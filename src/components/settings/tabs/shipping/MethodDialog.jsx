// src/components/settings/tabs/shipping/MethodDialog.jsx

import { useState, useEffect } from "react";
import { __ } from "@wordpress/i18n";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Truck, Gift, Store, Loader2, HelpCircle, Tag } from "lucide-react";
import { getShippingClasses } from "@/services/shippingService";

const METHOD_ICONS = {
  flat_rate: Truck,
  free_shipping: Gift,
  local_pickup: Store,
};

const METHOD_TITLES = {
  flat_rate: "Flat Rate",
  free_shipping: "Free Shipping",
  local_pickup: "Local Pickup",
};

const FREE_SHIPPING_REQUIRES_OPTIONS = [
  { value: "", label: "N/A" },
  { value: "coupon", label: "A valid free shipping coupon" },
  { value: "min_amount", label: "A minimum order amount" },
  { value: "either", label: "A minimum order amount OR coupon" },
  { value: "both", label: "A minimum order amount AND coupon" },
];

const CALCULATION_TYPE_OPTIONS = [
  { value: "class", label: "Per class: Charge shipping for each shipping class individually" },
  { value: "order", label: "Per order: Charge shipping for the most expensive shipping class" },
];

export default function MethodDialog({
  open,
  onOpenChange,
  method,
  onSave,
  isSaving,
}) {
  const [title, setTitle] = useState("");
  const [settings, setSettings] = useState({});
  const [shippingClasses, setShippingClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  // Fetch shipping classes when dialog opens for flat_rate
  useEffect(() => {
    if (open && method?.method_id === "flat_rate") {
      setLoadingClasses(true);
      getShippingClasses()
        .then((classes) => {
          setShippingClasses(classes || []);
        })
        .catch((err) => {
          console.error("Failed to load shipping classes:", err);
          setShippingClasses([]);
        })
        .finally(() => {
          setLoadingClasses(false);
        });
    }
  }, [open, method?.method_id]);

  // Initialize form when dialog opens
  useEffect(() => {
    if (open && method) {
      setTitle(method.title || "");
      setSettings(method.settings || {});
    }
  }, [open, method]);

  const handleSave = async () => {
    await onSave({
      title,
      settings,
    });
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const updateSetting = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateClassCost = (termId, value) => {
    setSettings((prev) => ({
      ...prev,
      class_costs: {
        ...(prev.class_costs || {}),
        [termId]: value,
      },
    }));
  };

  const isRtl = window?.document?.documentElement?.dir === "rtl";

  if (!method) return null;

  const Icon = METHOD_ICONS[method.method_id] || Truck;
  const methodTitle = METHOD_TITLES[method.method_id] || method.method_id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} dir={isRtl ? "rtl" : "ltr"}>
      <DialogContent className="sm:max-w-[450px] max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-fuchsia-600" />
            {__("Edit", "whizmanage")} {__(methodTitle, "whizmanage")}
          </DialogTitle>
          <DialogDescription>
            {__("Configure the shipping method settings.", "whizmanage")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 flex-1 overflow-y-auto -mx-6 px-6 pe-4 scrollbar-whiz">
          {/* Method Title */}
          <div className="space-y-2">
            <Label htmlFor="method-title">
              {__("Method Title", "whizmanage")}
            </Label>
            <Input
              id="method-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={__(methodTitle, "whizmanage")}
              className="dark:bg-slate-700"
            />
            <p className="text-sm text-muted-foreground">
              {__("This is shown to customers during checkout.", "whizmanage")}
            </p>
          </div>

          {/* Flat Rate Settings */}
          {method.method_id === "flat_rate" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="flat-rate-cost">
                  {__("Cost", "whizmanage")}
                </Label>
                <Input
                  id="flat-rate-cost"
                  type="text"
                  value={settings.cost || ""}
                  onChange={(e) => updateSetting("cost", e.target.value)}
                  placeholder="10.00"
                  className="dark:bg-slate-700"
                />
                <p className="text-sm text-muted-foreground">
                  {__(
                    "Enter a cost (e.g., 10.00) or use [qty] for quantity-based costs.",
                    "whizmanage"
                  )}
                </p>
              </div>

              <div className="space-y-2">
                <Label>{__("Tax Status", "whizmanage")}</Label>
                <Select
                  value={settings.tax_status || "taxable"}
                  onValueChange={(value) => updateSetting("tax_status", value)}
                >
                  <SelectTrigger className="dark:bg-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="taxable">
                      {__("Taxable", "whizmanage")}
                    </SelectItem>
                    <SelectItem value="none">
                      {__("None", "whizmanage")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Shipping Class Costs */}
              {(loadingClasses || shippingClasses.length > 0) && (
                <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-fuchsia-600" />
                    <Label className="text-base font-medium">
                      {__("Shipping Class Costs", "whizmanage")}
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p>
                            {__(
                              "These costs can optionally be added for each shipping class. Leave blank to disable.",
                              "whizmanage"
                            )}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  {loadingClasses ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{__("Loading shipping classes...", "whizmanage")}</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {shippingClasses.map((shippingClass) => (
                        <div key={shippingClass.term_id} className="space-y-1">
                          <Label
                            htmlFor={`class-cost-${shippingClass.term_id}`}
                            className="text-sm"
                          >
                            {`"${shippingClass.name}" ${__("shipping class cost", "whizmanage")}`}
                          </Label>
                          <Input
                            id={`class-cost-${shippingClass.term_id}`}
                            type="text"
                            value={settings.class_costs?.[shippingClass.term_id] || ""}
                            onChange={(e) =>
                              updateClassCost(shippingClass.term_id, e.target.value)
                            }
                            placeholder={__("N/A", "whizmanage")}
                            className="dark:bg-slate-700"
                          />
                        </div>
                      ))}

                      {/* No Shipping Class Cost */}
                      <div className="space-y-1">
                        <Label htmlFor="no-class-cost" className="text-sm">
                          {__("No shipping class cost", "whizmanage")}
                        </Label>
                        <Input
                          id="no-class-cost"
                          type="text"
                          value={settings.no_class_cost || ""}
                          onChange={(e) =>
                            updateSetting("no_class_cost", e.target.value)
                          }
                          placeholder={__("N/A", "whizmanage")}
                          className="dark:bg-slate-700"
                        />
                        <p className="text-xs text-muted-foreground">
                          {__(
                            "Cost for products with no shipping class.",
                            "whizmanage"
                          )}
                        </p>
                      </div>

                      {/* Calculation Type */}
                      <div className="space-y-2 pt-2">
                        <Label>{__("Calculation Type", "whizmanage")}</Label>
                        <Select
                          value={settings.type || "class"}
                          onValueChange={(value) => updateSetting("type", value)}
                        >
                          <SelectTrigger className="dark:bg-slate-700">
                            <SelectValue
                              placeholder={__(
                                "Per class: Charge shipping for each shipping class individually",
                                "whizmanage"
                              )}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {CALCULATION_TYPE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {__(option.label, "whizmanage")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Free Shipping Settings */}
          {method.method_id === "free_shipping" && (
            <>
              <div className="space-y-2">
                <Label>{__("Free shipping requires...", "whizmanage")}</Label>
                <Select
                  value={settings.requires || ""}
                  onValueChange={(value) => updateSetting("requires", value)}
                >
                  <SelectTrigger className="dark:bg-slate-700">
                    <SelectValue
                      placeholder={__("Select requirement", "whizmanage")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {FREE_SHIPPING_REQUIRES_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {__(option.label, "whizmanage")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(settings.requires === "min_amount" ||
                settings.requires === "either" ||
                settings.requires === "both") && (
                <div className="space-y-2">
                  <Label htmlFor="min-amount">
                    {__("Minimum Order Amount", "whizmanage")}
                  </Label>
                  <Input
                    id="min-amount"
                    type="text"
                    value={settings.min_amount || ""}
                    onChange={(e) => updateSetting("min_amount", e.target.value)}
                    placeholder="50.00"
                    className="dark:bg-slate-700"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{__("Ignore discounts", "whizmanage")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {__(
                      "Apply minimum order rule before discount",
                      "whizmanage"
                    )}
                  </p>
                </div>
                <Switch
                  checked={settings.ignore_discounts === "yes"}
                  onCheckedChange={(checked) =>
                    updateSetting("ignore_discounts", checked ? "yes" : "no")
                  }
                />
              </div>
            </>
          )}

          {/* Local Pickup Settings */}
          {method.method_id === "local_pickup" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="pickup-cost">
                  {__("Cost", "whizmanage")}
                </Label>
                <Input
                  id="pickup-cost"
                  type="text"
                  value={settings.cost || ""}
                  onChange={(e) => updateSetting("cost", e.target.value)}
                  placeholder={__("Free", "whizmanage")}
                  className="dark:bg-slate-700"
                />
                <p className="text-sm text-muted-foreground">
                  {__(
                    "Enter a cost or leave blank for free pickup.",
                    "whizmanage"
                  )}
                </p>
              </div>

              <div className="space-y-2">
                <Label>{__("Tax Status", "whizmanage")}</Label>
                <Select
                  value={settings.tax_status || "taxable"}
                  onValueChange={(value) => updateSetting("tax_status", value)}
                >
                  <SelectTrigger className="dark:bg-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="taxable">
                      {__("Taxable", "whizmanage")}
                    </SelectItem>
                    <SelectItem value="none">
                      {__("None", "whizmanage")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            {__("Cancel", "whizmanage")}
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
              __("Save Changes", "whizmanage")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
