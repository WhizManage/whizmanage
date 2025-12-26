// src/components/forms/core/fields/SwitchInput.jsx

import { Label } from "@components/ui/label";
import { Checkbox } from "@heroui/react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@components/ui/hover-card";
import { Info } from "lucide-react";
import { Controller } from "react-hook-form";
 import { __ } from "@wordpress/i18n";
import { useGenericForm } from "../FormProvider";

export default function SwitchInput({ name, label, rules, helperText }) {
   
  const { control } = useGenericForm();

  return (
    <div className="flex flex-col w-full gap-4 px-2">
      {/* כותרת עם info */}
      <div className="flex items-center gap-1.5">
        {helperText && (
          <HoverCard openDelay={300}>
            <HoverCardTrigger asChild>
              <Info className="h-3 w-3 text-fuchsia-600 opacity-60 hover:opacity-100 cursor-pointer" />
            </HoverCardTrigger>
            <HoverCardContent
              className="max-w-xs text-sm break-words z-[9999] shadow-md p-3"
              align="start"
              side="top"
              avoidCollisions
              collisionPadding={10}
              sideOffset={6}
            >
              <p className="whitespace-pre-wrap break-words">{__(helperText, "whizmanage")}</p>
            </HoverCardContent>
          </HoverCard>
        )}
        <Label htmlFor={name}>{__(label, "whizmanage")}</Label>
      </div>
      {/* Controller לניהול נכון של הערך */}
      <Controller
        name={name}
        control={control}
        defaultValue={false}
        rules={rules}
        render={({ field }) => (
          <Checkbox
            id={name}
            color="primary"
            isSelected={field.value}
            onValueChange={(isSelected) => {
              field.onChange(isSelected);
            }}
            classNames={{
              label: "font-extralight text-base text-muted-foreground",
              base: "w-full rtl:!ml-2",
              wrapper: [
                "after:!bg-fuchsia-600",
                "before:border-slate-300 dark:before:border-slate-600",
                "group-data-[selected=true]:before:!bg-fuchsia-600",
                "group-data-[selected=true]:before:!border-fuchsia-600",
              ].join(" "),
            }}
          >
            {__(label, "whizmanage")}
          </Checkbox>
        )}
      />
    </div>
  );
}