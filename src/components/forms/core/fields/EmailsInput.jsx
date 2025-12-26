// src/components/forms/core/fields/EmailsInput.jsx

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Chip } from "@heroui/react";
import { Info } from "lucide-react";
import { useState } from "react";
import { Controller } from "react-hook-form";
 import { __ } from "@wordpress/i18n";
import { useGenericForm } from "../FormProvider";

export default function EmailsInput({
  name,
  label,
  placeholder,
  rules,
  helperText,
}) {
   
  const { control } = useGenericForm();
  const [emailInput, setEmailInput] = useState("");

  const handleAddEmails = (currentValue, onChange) => {
    const newEmails = emailInput
      .split(",")
      .map((email) => email.trim())
      .filter((email) => email);
    
    const uniqueEmails = [...new Set([...(currentValue || []), ...newEmails])];
    onChange(uniqueEmails);
    setEmailInput("");
  };

  const handleRemoveEmail = (emailToRemove, currentValue, onChange) => {
    const updated = (currentValue || []).filter((email) => email !== emailToRemove);
    onChange(updated);
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
      <Controller
        name={name}
        control={control}
        rules={rules}
        defaultValue={[]}
        render={({ field, fieldState: { error } }) => (
          <>
            {/* תצוגת Chips */}
            <div className="flex flex-wrap gap-2 relative min-h-10 items-center dark:bg-slate-700 rounded-lg p-2">
              {field.value && field.value.length > 0 ? (
                field.value.map((email, index) => (
                  <Chip
                    key={index}
                    onClose={() => handleRemoveEmail(email, field.value, field.onChange)}
                    variant="flat"
                    classNames={{
                      base: "bg-gradient-to-br from-fuchsia-50 dark:from-slate-800 to-fuchsia-200 dark:to-slate-700 opacity-100",
                      content: "text-fuchsia-600 dark:text-slate-300",
                      closeButton: "text-fuchsia-600 dark:text-slate-300",
                    }}
                  >
                    {email}
                  </Chip>
                ))
              ) : (
                <div className="font-extralight text-base text-muted-foreground px-2">
                  {__("No email restrictions", "whizmanage")}
                </div>
              )}
            </div>

            {/* שדה קלט + כפתור Add */}
            <div className="w-full flex gap-1.5">
              <div className="relative h-10 border rounded-lg flex items-center px-3 dark:bg-slate-700 flex-1">
                <Input
                  type="text"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder={placeholder ? __(placeholder, "whizmanage") : ""}
                  className="!border-none !ring-0 dark:!text-slate-300 placeholder:text-slate-400 focus-visible:ring-0 h-8 p-0"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddEmails(field.value, field.onChange);
                    }
                  }}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleAddEmails(field.value, field.onChange)}
                className="h-10"
              >
                {__("Add", "whizmanage")}
              </Button>
            </div>

            {/* Error */}
            {error && (
              <p className="text-red-500 dark:text-pink-500 text-sm px-2">
                {__(error.message, "whizmanage")}
              </p>
            )}
          </>
        )}
      />
    </div>
  );
}