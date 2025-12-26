// src/components/table/toolbar/actions/bulk-edit/BulkCustomFields.jsx

import { useEffect, useState, useCallback, useRef } from "react";
 import { __ } from "@wordpress/i18n";
import { Label } from "@components/ui/label";
import { Input } from "@components/ui/input";
import { Button } from "@components/ui/button";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@components/ui/select";
import { Switch } from "@components/ui/switch";
import { Checkbox } from "@heroui/react";
import HtmlEditor from "@components/editor/HtmlEditor";
import { Info, ImagePlus } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@components/ui/hover-card";
import MediaPicker from "@components/media/MediaPicker";
import { useDebounceFn } from "../../../hooks/useDebounce";

export default function BulkCustomFields({ onChange }) {
   
  const customMetaData = window?.WhizManageCustomFields || [];
  const [values, setValues] = useState({}); // key -> string ("" = לא יישלח)
  const pushMeta = useDebounceFn((meta) => onChange?.(meta), { wait: 300, maxWait: 1200 });

  // אתחול: כל המפתחות מתחילים כריקים
  useEffect(() => {
    if (Array.isArray(customMetaData) && customMetaData.length) {
      const init = {};
      customMetaData.forEach((f) => {
        if (f && typeof f === "object" && f.type !== "multi-select" && f.key) {
          init[f.key] = ""; // ריק = אל תשלח בבאלק
        }
      });
      setValues(init);
    }
  }, [customMetaData]);

  useEffect(() => {
    const meta = Object.entries(values)
      .filter(([_, value]) => {
        if (value === "" || value == null) return false;      // דלג ריק/נול
        if (Array.isArray(value)) return value.length > 0;    // גלריה ריקה – דלג
        return true;
      })
      .map(([key, value]) => ({ key, value }));
    pushMeta(meta);
  }, [values, pushMeta]);


  const setField = (key, newValue) => {
    setValues((prev) => ({ ...prev, [key]: newValue }));
  };

  const decode = (s) =>
    (s || "").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

  const renderField = (field) => {
    const current = values[field.key] ?? "";

    switch (field.type) {
      case "text":
        return (
          <div className="relative h-10 border rounded-lg flex gap-1 items-center px-1 dark:bg-slate-700">
            <Input
              id={field.key}
              placeholder={`${__("Set for all", "whizmanage")} • ${__(field.label || "", "whizmanage")}`}
              value={current}
              onChange={(e) => setField(field.key, e.target.value)}
              onFocus={(e) => e.target.select()}
              className="!border-none dark:!text-slate-300 !ring-0 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0"
            />
          </div>
        );

      case "textarea":
        return (
          <div className="relative border rounded-lg dark:bg-slate-700">
            <textarea
              id={field.key}
              placeholder={`${__("Set for all", "whizmanage")} • ${__(field.label || "", "whizmanage")}`}
              value={current}
              onChange={(e) => setField(field.key, e.target.value)}
              rows={4}
              className="w-full p-3 bg-transparent border-none resize-none dark:text-slate-300 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base focus:outline-none focus:ring-0"
            />
          </div>
        );

      case "number":
        return (
          <div className="relative h-10 border rounded-lg flex gap-1 items-center px-1 dark:bg-slate-700">
            <Input
              type="number"
              id={field.key}
              placeholder={`${__("Set for all", "whizmanage")} • ${__(field.label || "", "whizmanage")}`}
              value={current}
              onChange={(e) => setField(field.key, e.target.value)}
              onFocus={(e) => e.target.select()}
              className="!border-none dark:!text-slate-300 !ring-0 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0"
            />
          </div>
        );

      case "date":
        return (
          <div className="relative h-10 border rounded-lg flex gap-1 items-center px-1 dark:bg-slate-700">
            <Input
              type="date"
              id={field.key}
              value={current}
              onChange={(e) => setField(field.key, e.target.value)}
              className="!border-none dark:!text-slate-300 !ring-0 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0"
            />
          </div>
        );

      case "select":
        return (
          <Select
            value={current}
            onValueChange={(v) => setField(field.key, v)}
          >
            <SelectTrigger className="h-10 dark:bg-slate-700 dark:hover:!bg-slate-600">
              <SelectValue placeholder={`${__("Select", "whizmanage")} ${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(field.choices || {}).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "checkbox":
        return (
          <div className="flex items-center gap-2 p-2">
            <Checkbox
              isSelected={current === "1"}
              onValueChange={(isSel) => setField(field.key, isSel ? "1" : "0")}
              color="primary"
              classNames={{
                label: "text-base text-muted-foreground font-extralight",
              }}
            >
              {field.label}
            </Checkbox>
          </div>
        );

      case "switcher":
        return (
          <div className="flex items-center gap-2 p-2">
            <Switch
              id={field.key}
              checked={current === "1"}
              onCheckedChange={(checked) =>
                setField(field.key, checked ? "1" : "0")
              }
            />
          </div>
        );

      case "wysiwyg":
        return (
          <div className="relative border rounded-xl overflow-hidden dark:bg-slate-700">
            <HtmlEditor
              key={field.key}
              initialContent={current}
              onSave={(content) => setField(field.key, content)}
              height="200px"
              compact
            />
          </div>
        );

      case "image":
      case "media": {
        const valueObj = (current && typeof current === "object") ? current : null;
        return (
          <div className="w-full">
            <MediaPicker
              value={valueObj}
              onChange={(val) => setField(field.key, val || null)}
              onClose={() => { }}
              multiple={false}
              title={__(field.label || "Select Image", "whizmanage")}
              autoOpen={false}
              trigger={
                <Button className="h-10 px-3 rounded-md flex items-center gap-2">
                  <ImagePlus className="w-4 h-4" />
                  <span>{__("Select Image", "whizmanage")}</span>
                </Button>
              }
            />
            {/* תצוגה מקדימה קטנה */}
            {valueObj?.src ? (
              <div className="mt-2">
                <img
                  src={valueObj.src}
                  alt={valueObj.name || "preview"}
                  className="h-12 w-12 object-cover rounded-md border"
                />
              </div>
            ) : (
              <div className="mt-2 text-xs text-muted-foreground">
                {__("No image selected", "whizmanage")}
              </div>
            )}
          </div>
        );
      }

      case "gallery": {
        const valueArr = Array.isArray(current) ? current : [];
        return (
          <div className="w-full">
            <MediaPicker
              value={valueArr}
              onChange={(val) => setField(field.key, Array.isArray(val) ? val : [])}
              onClose={() => { }}
              multiple={true}
              maxSelection={100}
              title={__(field.label || "Select Gallery Images", "whizmanage")}
              autoOpen={false}
              trigger={
                <Button className="h-10 px-3 rounded-md flex items-center gap-2">
                  <ImagePlus className="w-4 h-4" />
                  <span>{__("Edit Gallery", "whizmanage")}</span>
                </Button>
              }
            />
            {/* תצוגה מקדימה קומפקטית */}
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {valueArr.length > 0 ? (
                valueArr.slice(0, 10).map((img) => (
                  <img
                    key={img.id}
                    src={img.src}
                    alt={img.name || "preview"}
                    className="h-9 w-9 object-cover rounded-md border"
                  />
                ))
              ) : (
                <span className="text-xs text-muted-foreground">
                  {__("No images selected", "whizmanage")}
                </span>
              )}
            </div>
          </div>
        );
      }

      default:
        return (
          <div className="p-3 border rounded-lg bg-slate-100 dark:bg-slate-800 text-sm text-muted-foreground">
            {__("Unsupported field type", "whizmanage")}: {field.type}
          </div>
        );
    }
  };

  if (!customMetaData || !customMetaData.length) return null;

  return (
    <div className="w-full">
      <h2 className="w-full text-start text-xl dark:text-gray-300 p-2 font-semibold">
        {__("Custom fields", "whizmanage")}
        <span className="text-xs text-muted-foreground ml-2">  ({customMetaData.length})</span>
      </h2>
      <div className="grid grid-cols-1 gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
        {customMetaData.map((field, idx) => {
          if (!field || typeof field !== "object" || field.type === "multi-select")
            return null;

          return (
            <div key={field.key || idx} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Label htmlFor={field.key}>{__(field.label || "", "whizmanage")}</Label>
                {field.source && (
                  <span className="text-xs text-muted-foreground ml-1">
                    ({field.source})
                  </span>
                )}
                {field.help && (
                  <HoverCard openDelay={300}>
                    <HoverCardTrigger asChild>
                      <Info className="h-4 w-4 text-fuchsia-500 opacity-60 hover:opacity-100 cursor-pointer" />
                    </HoverCardTrigger>
                    <HoverCardContent className="max-w-xs text-sm break-words z-[9999] shadow-md p-3">
                      <p className="whitespace-pre-wrap break-words">
                        {__(field.help || "", "whizmanage")}
                      </p>
                    </HoverCardContent>
                  </HoverCard>
                )}
              </div>
              {renderField(field)}
              {typeof field.value === "string" && field.value && (
                <div className="text-xs text-muted-foreground px-2">
                  {__("Default", "whizmanage")}: {decode(field.value)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-2 px-2">
        {__(
          "Only fields with non-empty values will be applied to all selected products.",
          "whizmanage"
        )}
      </p>
    </div>
  );
}