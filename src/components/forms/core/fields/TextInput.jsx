// src/components/forms/core/fields/TextInput.jsx

import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@components/ui/hover-card";
import { Info } from "lucide-react";
 import { __ } from "@wordpress/i18n";
import { useGenericForm } from "../FormProvider";

export default function TextInput({
  name,
  label,
  placeholder,
  rules,
  type = "text",
  step = 1,
  min,
  max,
  helperText,
}) {
   
  const {
    register,
    formState: { errors },
  } = useGenericForm();

  const err = errors?.[name];

  return (
    <div className="flex flex-col w-full gap-1.5 px-2">
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
        <Label htmlFor={name}>
          {__(label, "whizmanage")}
          {rules?.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      </div>
      <Input
        type={type}
        id={name}
        placeholder={placeholder ? __(placeholder, "whizmanage") : undefined}
        step={step}
        min={min}
        max={max}
        className="h-10 p-0 !rounded-lg"
        {...register(name, rules)}
      />
      {err && (
        <p className="text-red-500 dark:text-pink-500 text-sm px-2">
          {__(err.message, "whizmanage")}
        </p>
      )}
    </div>
  );
}