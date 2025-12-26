// src/components/forms/core/fields/TextareaInput.jsx

import { Textarea } from "@components/ui/textarea";
import { Label } from "@components/ui/label";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@components/ui/hover-card";
import { Info } from "lucide-react";
 import { __ } from "@wordpress/i18n";
import { useGenericForm } from "../FormProvider";

export default function TextareaInput({
  name,
  label,
  placeholder,
  rules,
  rows = 3,
  helperText,
}) {
   
  const {
    register,
    formState: { errors },
  } = useGenericForm();
  
  const err = errors?.[name];
  
  return (
    <div className="px-2">
      <div className="flex items-center gap-1.5 mb-1">
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
        <Label htmlFor={name} className="text-sm font-medium dark:text-gray-200">
          {__(label, "whizmanage")}
          {rules?.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      </div>
      <Textarea
        id={name}
        placeholder={placeholder ? __(placeholder, "whizmanage") : undefined}
        rows={rows}
        className="w-full !rounded-lg"
        {...register(name, rules)}
      />
      {err && (
        <p className="text-red-600 text-sm">
          {__(err.message, "whizmanage")}
        </p>
      )}
    </div>
  );
}