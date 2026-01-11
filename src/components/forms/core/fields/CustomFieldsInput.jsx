// src/components/forms/core/fields/CustomFieldsInput.jsx

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@components/ui/hover-card";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select";
import { Switch } from "@components/ui/switch";
import { Textarea } from "@components/ui/textarea";
import { Checkbox } from "@heroui/react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller } from "react-hook-form";
 import { __ } from "@wordpress/i18n";
import { useGenericForm } from "../FormProvider";
import ImageInput from "./ImageInput";
import WysiwygInput from "./WysiwygInput";

export default function CustomFieldsInput({
  name = "meta_data",
  label = "Custom Fields",
  fieldsSource = "window.WhizManageCustomFields", // מקור השדות
  defaultOpen = false,
}) {
   
  const { control, watch, setValue } = useGenericForm();

  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [customFields, setCustomFields] = useState([]);

  // טעינת השדות המותאמים
  useEffect(() => {
    let fields = [];

    if (fieldsSource === "window.WhizManageCustomFields" && window?.WhizManageCustomFields) {
      fields = Array.isArray(window.WhizManageCustomFields) ? window.WhizManageCustomFields : [];
    } else if (
      typeof fieldsSource === "object" &&
      Array.isArray(fieldsSource)
    ) {
      fields = fieldsSource;
    }

    // קבלת רשימת השדות המוסתרים מההגדרות
    let hiddenCustomFields = [];
    try {
      const stored = window?.WhizManageSettings?.whizmanage_hidden_custom_fields;
      if (stored) {
        hiddenCustomFields = typeof stored === "string" ? JSON.parse(stored) : stored;
      }
    } catch (e) {
      console.warn("Failed to parse hidden custom fields settings:", e);
    }

    // סינון multi-select ושדות מוסתרים
    const filtered = fields.filter(
      (field) =>
        field &&
        typeof field === "object" &&
        field.type !== "multi-select" &&
        !hiddenCustomFields.includes(field.key)
    );

    setCustomFields(filtered);
  }, [fieldsSource]);

  // יצירת meta_data מהשדות
  const buildMetaData = () => {
    const metaData = [];

    customFields.forEach((field) => {
      const value = watch(field.key);

      if (value !== undefined && value !== null && value !== "") {
        metaData.push({
          key: field.key,
          value: String(value),
        });
      }
    });

    return metaData;
  };

  // עדכון meta_data כשמשנים שדה
  useEffect(() => {
    const subscription = customFields.map((field) =>
      watch((value, { name: changedField }) => {
        if (changedField === field.key) {
          const metaData = buildMetaData();
          setValue(name, metaData, { shouldValidate: true, shouldDirty: true });
        }
      })
    );

    return () => subscription.forEach((unsub) => unsub?.unsubscribe?.());
  }, [customFields, watch, setValue, name]);

  const renderField = (field) => {
    const fieldKey = field.key;
    const currentValue = watch(fieldKey) || field.value || "";

    switch (field.type) {
      case "text":
        return (
          <Controller
            name={fieldKey}
            control={control}
            defaultValue={currentValue}
            render={({ field: controllerField }) => (
                <Input
                  type="text"
                  placeholder={field.placeholder || __(field.label, "whizmanage")}
                  {...controllerField}
                  onFocus={(e) => e.target.select()}
                  className="h-10 !rounded-lg p-0"
                />
            )}
          />
        );

      case "textarea":
        return (
          <Controller
            name={fieldKey}
            control={control}
            defaultValue={currentValue}
            render={({ field: controllerField }) => (
              <Textarea
                placeholder={field.placeholder || __(field.label, "whizmanage")}
                {...controllerField}
                rows={4}
                className="w-full p-3 bg-transparent border rounded-lg dark:bg-slate-700 dark:text-slate-300 placeholder:text-slate-400 placeholder:dark:text-slate-300/90"
              />
            )}
          />
        );

      case "number":
        return (
          <Controller
            name={fieldKey}
            control={control}
            defaultValue={currentValue}
            render={({ field: controllerField }) => (
                <Input
                  type="number"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  placeholder={field.placeholder || __(field.label, "whizmanage")}
                  {...controllerField}
                  onFocus={(e) => e.target.select()}
                  className="h-10 !rounded-lg p-0"
                />
            )}
          />
        );

      case "date":
        return (
          <Controller
            name={fieldKey}
            control={control}
            defaultValue={currentValue}
            render={({ field: controllerField }) => (
                <Input
                  type="date"
                  {...controllerField}
                  className="h-10 !rounded-lg p-0"
                />
            )}
          />
        );

      case "select":
        return (
          <Controller
            name={fieldKey}
            control={control}
            defaultValue={currentValue}
            render={({ field: controllerField }) => (
              <Select
                value={controllerField.value}
                onValueChange={controllerField.onChange}
              >
                <SelectTrigger className="h-10 dark:bg-slate-700 dark:hover:!bg-slate-600">
                  <SelectValue placeholder={__(`Select ${field.label}`, "whizmanage")} />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(field.choices || {}).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        );

      case "checkbox":
        return (
          <Controller
            name={fieldKey}
            control={control}
            defaultValue={currentValue === "1"}
            render={({ field: controllerField }) => (
              <div className="flex items-center gap-2 p-2">
                <Checkbox
                  isSelected={
                    controllerField.value === "1" ||
                    controllerField.value === true
                  }
                  onValueChange={(isSelected) =>
                    controllerField.onChange(isSelected ? "1" : "0")
                  }
                  color="primary"
                  classNames={{
                    label: "text-base text-muted-foreground font-extralight",
                    wrapper:
                      "!ring-fuchsia-600 [&:focus-visible]:!ring-fuchsia-600 [&:focus]:!ring-fuchsia-600",
                  }}
                >
                  {field.label}
                </Checkbox>
              </div>
            )}
          />
        );

      case "switcher":
        return (
          <Controller
            name={fieldKey}
            control={control}
            defaultValue={currentValue === "1"}
            render={({ field: controllerField }) => (
              <div className="flex items-center gap-2 p-2">
                <Switch
                  checked={
                    controllerField.value === "1" ||
                    controllerField.value === true
                  }
                  onCheckedChange={(checked) =>
                    controllerField.onChange(checked ? "1" : "0")
                  }
                />
                <Label
                  htmlFor={fieldKey}
                  className="text-sm text-muted-foreground"
                >
                  {controllerField.value === "1" ||
                  controllerField.value === true
                    ? __("Enabled", "whizmanage")
                    : __("Disabled", "whizmanage")}
                </Label>
              </div>
            )}
          />
        );

      case "wysiwyg":
        return <WysiwygInput name={fieldKey} label="" height="200px" />;

      case "image":
      case "media":
        return <ImageInput name={fieldKey} label="" multiple={false} />;

      case "gallery":
        return (
          <ImageInput
            name={fieldKey}
            label=""
            multiple={true}
            maxSelection={10}
          />
        );

      default:
        return (
          <div className="p-3 border rounded-lg bg-slate-100 dark:bg-slate-800 text-sm text-muted-foreground">
            {__("Unsupported field type", "whizmanage")}: {field.type}
          </div>
        );
    }
  };

  if (!customFields || customFields.length === 0) {
    return (
      <div className="flex flex-col w-full gap-2 px-2">
        <div className="p-4 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800/50">
          <div className="flex flex-col items-center text-center gap-2">
            <span className="text-sm text-muted-foreground">
              {__("No custom fields configured", "whizmanage")}
            </span>
            <span className="text-xs text-muted-foreground/70">
              {__("Custom fields can be added using ACF or JetEngine plugins", "whizmanage")}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full gap-3 px-2">
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full flex items-center justify-between p-3 hover:bg-slate-100 dark:hover:bg-slate-800 border border-input rounded-lg"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {__("Custom Product Fields", "whizmanage")}
              </span>
              <span className="text-xs text-muted-foreground">
                ({customFields.length} {__("fields available", "whizmanage")})
              </span>
            </div>
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-4 pt-2 !px-0">
          <div className="grid grid-cols-1 gap-4 p-0 bg-slate-50 dark:bg-slate-900 rounded-lg">
            {customFields.map((field, index) => {
              try {
                return (
                  <div
                    key={field.key || index}
                    className="flex flex-col gap-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <Label htmlFor={field.key}>
                        {__(field.label || "", "whizmanage")}
                        {field.source && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({field.source})
                          </span>
                        )}
                      </Label>

                      {field.help && (
                        <HoverCard openDelay={300}>
                          <HoverCardTrigger asChild>
                            <Info className="h-4 w-4 text-fuchsia-600 opacity-60 hover:opacity-100 cursor-pointer" />
                          </HoverCardTrigger>
                          <HoverCardContent
                            className="max-w-xs text-sm break-words z-[9999] shadow-md p-3"
                            align="start"
                            avoidCollisions
                            collisionPadding={10}
                            sideOffset={5}
                          >
                            <p className="whitespace-pre-wrap break-words">
                              {__(field.help || "", "whizmanage")}
                            </p>
                          </HoverCardContent>
                        </HoverCard>
                      )}
                    </div>
                    {renderField(field)}
                    {field.value &&
                      typeof field.value === "string" &&
                      field.value && (
                        <div className="text-xs text-muted-foreground px-2">
                          {__("Default", "whizmanage")}:{" "}
                          {field.value
                            .replace(/&quot;/g, '"')
                            .replace(/&amp;/g, "&")}
                        </div>
                      )}
                  </div>
                );
              } catch (err) {
                console.error("⚠️ Error rendering field:", field, err);
                return (
                  <div
                    key={index}
                    className="p-3 bg-red-100 text-red-700 rounded"
                  >
                    ⚠️ שגיאה ברינדור שדה{" "}
                    <strong>{field?.label || "ללא תווית"}</strong>
                  </div>
                );
              }
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
