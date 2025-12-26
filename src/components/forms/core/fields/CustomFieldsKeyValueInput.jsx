// src/components/forms/core/fields/CustomFieldsKeyValueInput.jsx

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Info, Plus, Trash2, X, Settings2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
 import { __ } from "@wordpress/i18n";
import { useGenericForm } from "../FormProvider";

export default function CustomFieldsKeyValueInput({
  name = "meta_data",
  label = "Custom Fields",
  helperText,
}) {
   
  const { setValue, watch } = useGenericForm();

  const [keyInput, setKeyInput] = useState("");
  const [valInput, setValInput] = useState("");
  const [rows, setRows] = useState([]);

  const currentValue = watch(name);

  // טעינה ראשונית
  useEffect(() => {
    if (Array.isArray(currentValue) && currentValue.length > 0) {
      setRows(currentValue);
    }
  }, []);

  // עדכון הטופס בכל שינוי
  useEffect(() => {
    setValue(name, rows, { shouldValidate: true, shouldDirty: true });
  }, [rows, name, setValue]);

  const canAdd = useMemo(
    () => keyInput.trim() !== "" && valInput.trim() !== "",
    [keyInput, valInput]
  );

  const addRow = () => {
    if (!canAdd) return;
    setRows((prev) => [...prev, { key: keyInput.trim(), value: valInput }]);
    setKeyInput("");
    setValInput("");
  };

  const removeRow = (idx) => setRows((prev) => prev.filter((_, i) => i !== idx));

  const clearAll = () => setRows([]);

  return (
    <div className="flex flex-col w-full gap-3 px-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {helperText && (
            <HoverCard openDelay={300}>
              <HoverCardTrigger asChild>
                <Info className="h-3 w-3 text-fuchsia-600 opacity-60 hover:opacity-100 cursor-pointer" />
              </HoverCardTrigger>
              <HoverCardContent
                className="max-w-xs text-sm break-words z-[9999] shadow-md p-3"
                align="start"
                avoidCollisions
                collisionPadding={10}
                sideOffset={5}
              >
                <p className="whitespace-pre-wrap break-words">
                  {__(helperText, "whizmanage")}
                </p>
              </HoverCardContent>
            </HoverCard>
          )}
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-fuchsia-600" />
            <Label className="text-lg font-semibold">{__(label, "whizmanage")}</Label>
          </div>
        </div>

        {rows.length > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={clearAll}
            className="h-8 gap-2"
          >
            <X className="w-4 h-4" />
            {__("Clear all", "whizmanage")}
          </Button>
        )}
      </div>
      {/* שורת קלט */}
      <div className="grid grid-cols-1 md:grid-cols-[5fr_6fr_auto] gap-2 items-end">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">{__("Key", "whizmanage")}</Label>
          <Input
            placeholder={__("e.g. customer_note", "whizmanage")}
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            className="h-10 dark:bg-slate-700"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (canAdd) addRow();
              }
            }}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">{__("Value", "whizmanage")}</Label>
          <Input
            placeholder={__("Value", "whizmanage")}
            value={valInput}
            onChange={(e) => setValInput(e.target.value)}
            className="h-10 dark:bg-slate-700"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (canAdd) addRow();
              }
            }}
          />
        </div>

        <Button
          type="button"
          onClick={addRow}
          disabled={!canAdd}
          className="h-10 gap-2"
        >
          <Plus className="w-4 h-4" />
          {__("Add", "whizmanage")}
        </Button>
      </div>
      {/* רשימת שדות */}
      {rows.length > 0 && (
        <div className="mt-2">
          <ul className="divide-y dark:divide-slate-800 rounded-lg border dark:border-slate-800">
            {rows.map((r, idx) => (
              <li
                key={`${r.key}-${idx}`}
                className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{r.key}</p>
                  <p className="text-sm text-muted-foreground break-words">
                    {r.value}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRow(idx)}
                  className="h-8 w-8 text-muted-foreground hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {rows.length === 0 && (
        <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-lg">
          {__("No custom fields added yet", "whizmanage")}
        </div>
      )}
    </div>
  );
}