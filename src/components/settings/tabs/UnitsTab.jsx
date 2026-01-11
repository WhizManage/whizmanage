// src/components/settings/tabs/UnitsTab.jsx

import { __ } from "@wordpress/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Ruler } from "lucide-react";
import SettingsCardHeader from "../SettingsCardHeader";

const WEIGHT_UNITS = [
  { value: "kg", label: "Kilograms (kg)" },
  { value: "g", label: "Grams (g)" },
  { value: "lbs", label: "Pounds (lbs)" },
  { value: "oz", label: "Ounces (oz)" },
];

const DIMENSION_UNITS = [
  { value: "m", label: "Meters (m)" },
  { value: "cm", label: "Centimeters (cm)" },
  { value: "mm", label: "Millimeters (mm)" },
  { value: "in", label: "Inches (in)" },
  { value: "yd", label: "Yards (yd)" },
];

export default function UnitsTab({ settings, onUpdate }) {
  return (
    <div className="space-y-6 text-start">
      {/* Measurements Card */}
      <Card className="bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600">
        <SettingsCardHeader
          icon={Ruler}
          title={__("Measurements", "whizmanage")}
          description={__("Set the units used for product weights and dimensions", "whizmanage")}
        />
        <CardContent className="space-y-6">
          {/* Weight Unit */}
          <div className="space-y-2">
            <Label>{__("Weight Unit", "whizmanage")}</Label>
            <Select
              value={settings.woocommerce_weight_unit || "kg"}
              onValueChange={(value) =>
                onUpdate("woocommerce_weight_unit", value)
              }
            >
              <SelectTrigger className="dark:bg-slate-700 w-[250px] text-start">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEIGHT_UNITS.map((unit) => (
                  <SelectItem key={unit.value} value={unit.value} className="text-start">
                    {__(unit.label, "whizmanage")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {__("This controls what unit you will define weights in.", "whizmanage")}
            </p>
          </div>

          {/* Dimension Unit */}
          <div className="space-y-2">
            <Label>{__("Dimensions Unit", "whizmanage")}</Label>
            <Select
              value={settings.woocommerce_dimension_unit || "cm"}
              onValueChange={(value) =>
                onUpdate("woocommerce_dimension_unit", value)
              }
            >
              <SelectTrigger className="dark:bg-slate-700 w-[250px] text-start">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIMENSION_UNITS.map((unit) => (
                  <SelectItem key={unit.value} value={unit.value} className="text-start">
                    {__(unit.label, "whizmanage")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {__("This controls what unit you will define lengths in.", "whizmanage")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-fuchsia-200 dark:border-fuchsia-800 bg-fuchsia-50 dark:bg-fuchsia-900/20">
        <CardContent className="pt-6">
          <p className="text-sm text-fuchsia-700 dark:text-fuchsia-300">
            <strong>{__("Note:", "whizmanage")}</strong>{" "}
            {__(
              "Changing these settings will not automatically convert existing product weights and dimensions. You will need to update your products if you change units.",
              "whizmanage"
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
