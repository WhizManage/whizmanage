// src/components/forms/core/fields/NumberInput.jsx

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
import { decodeHtml } from "../../../../utils/formatValue.js";

export default function NumberInput({
  name,
  label,
  placeholder,
  rules,
  step = "any",
  min,
  max,
  showCurrency = false,
  helperText,
}) {
   
  const {
    register,
    formState: { errors },
  } = useGenericForm();
  
  const err = errors?.[name];
  
  const currencySymbol = showCurrency 
    ? decodeHtml(window?.currencySymbol || window?.currency || "")
    : null;
  
  const position = window?.currencyPos || "left";
  const showLeft = currencySymbol && (position === "left" || position === "left_space");
  const showRight = currencySymbol && (position === "right" || position === "right_space");
  
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
        <Label htmlFor={name}>
          {__(label, "whizmanage")}
          {rules?.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      </div>
      <div className="relative">
        {showLeft && (
          <span
            className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none"
            dangerouslySetInnerHTML={{ __html: currencySymbol }}
          />
        )}

        <Input
          type="number"
          id={name}
          placeholder={placeholder || "0.00"}
          step={step}
          min={min}
          max={max}
          className={`h-10 !rounded-lg ${showLeft ? '!ps-7' : ''} ${showRight ? '!pe-7' : ''}`}
          {...register(name, rules)}
        />

        {showRight && (
          <span
            className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none"
            dangerouslySetInnerHTML={{ __html: currencySymbol }}
          />
        )}
      </div>
      {err && (
        <p className="text-red-500 dark:text-pink-500 text-sm px-2">
          {__(err.message, "whizmanage")}
        </p>
      )}
    </div>
  );
}