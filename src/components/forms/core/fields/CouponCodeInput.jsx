// src/components/forms/core/fields/CouponCodeInput.jsx

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Info, Sparkles } from "lucide-react";
import { useState } from "react";
 import { __ } from "@wordpress/i18n";
import { useGenericForm } from "../FormProvider";

/**
 * מחולל קוד קופון רנדומלי
 */
function generateCouponCode(length = 8) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function CouponCodeInput({
  name = "code",
  label = "Coupon code",
  placeholder = "Enter coupon code",
  rules,
  helperText,
  codeLength = 8,
}) {
   
  const {
    register,
    setValue,
    formState: { errors },
  } = useGenericForm();

  const [isGenerating, setIsGenerating] = useState(false);
  const err = errors?.[name];

  const handleGenerate = () => {
    setIsGenerating(true);
    
    // אנימציה קצרה
    setTimeout(() => {
      const newCode = generateCouponCode(codeLength);
      setValue(name, newCode, { 
        shouldValidate: true, 
        shouldDirty: true 
      });
      setIsGenerating(false);
    }, 300);
  };

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
      <div className="flex gap-2">
        <Input
          type="text"
          id={name}
          placeholder={__(placeholder, "whizmanage")}
          className="h-10 p-0 !rounded-lg flex-1 uppercase"
          {...register(name, rules)}
        />

        <HoverCard openDelay={300}>
          <HoverCardTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="h-10 w-10"
            >
              <Sparkles
                className={`h-4 w-4 ${isGenerating ? "animate-spin" : ""}`}
              />
            </Button>
          </HoverCardTrigger>
          <HoverCardContent
            className="max-w-xs text-sm break-words z-[9999] shadow-md p-3"
            align="start"
            avoidCollisions
            collisionPadding={10}
            sideOffset={5}
          >
            <p className="whitespace-pre-wrap break-words">
              {__("Generate a random coupon code automatically", "whizmanage")}
            </p>
          </HoverCardContent>
        </HoverCard>
      </div>
      {err && (
        <p className="text-red-500 dark:text-pink-500 text-sm px-2">
          {__(err.message, "whizmanage")}
        </p>
      )}
    </div>
  );
}