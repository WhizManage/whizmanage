// src/components/forms/core/fields/SelectInput.jsx

import { Label } from "@components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@components/ui/hover-card";
import { Info } from "lucide-react";
import { __ } from "@wordpress/i18n";
import { useGenericForm } from "../FormProvider";
import { Controller } from "react-hook-form";

export default function SelectInput({
  name,
  label,
  placeholder,
  rules,
  options = [],
  helperText,
}) {

  const {
    control,
    formState: { errors },
  } = useGenericForm();

  const err = errors?.[name];

  return (
    <div className="grid w-full gap-1.5 px-2">
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
              <p className="whitespace-pre-wrap break-words">{__(helperText, "whizmanage")}</p>
            </HoverCardContent>
          </HoverCard>
        )}
        <Label>
          {__(label, "whizmanage")}
          {rules?.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      </div>
      <Controller
        name={name}
        control={control}
        rules={rules}
        render={({ field }) => (
          <Select
            value={field.value || ""}
            onValueChange={(value) => {
              field.onChange(value);
            }}
          >
            <SelectTrigger className="h-10 dark:bg-slate-700 dark:hover:!bg-slate-600">
              <SelectValue placeholder={placeholder ? __(placeholder, "whizmanage") : __("Select an option", "whizmanage")} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {__(opt.label, "whizmanage")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      {err && (
        <p className="text-red-500 dark:text-pink-500 text-sm px-2">
          {__(err.message, "whizmanage")}
        </p>
      )}
    </div>
  );
}