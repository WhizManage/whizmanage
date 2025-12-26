"use client";

import { cn } from "@/lib/utils";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as React from "react";

function getModalPortalContainer() {
  if (typeof document === "undefined") return undefined;
  // חיפוש ה-portal container האחרון (הקרוב ביותר למודל הפעיל)
  // כשיש מספר מודלים מקוננים, נרצה את האחרון שנפתח
  const portals = document.querySelectorAll("#radix-select-portal");
  if (portals.length > 0) {
    // קח את האחרון (הפנימי ביותר)
    return portals[portals.length - 1];
  }
  return (
    document.querySelector("[data-slot='modal-wrapper']") ||
    document.body
  );
}

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const ClosePopover = PopoverPrimitive.Close;

const PopoverContent = React.forwardRef(
  (
    {
      className,
      align = "center",
      sideOffset = 4,
      portalContainer, // אופציונלי – אם תרצה להזרים עוגן ידני
      ...props
    },
    ref
  ) => {
    const container = portalContainer ?? getModalPortalContainer();

    return (
      <PopoverPrimitive.Portal container={container}>
        <PopoverPrimitive.Content
          ref={ref}
          align={align}
          sideOffset={sideOffset}
          // ⛔ חשוב: לא במצב modal כדי לא להתנגש עם focus trap של HeroUI
          modal={false}
          className={cn(
            "z-[2147483647] w-72 rounded-md border bg-popover p-0 text-popover-foreground dark:border-slate-600 shadow-md outline-none dark:bg-slate-800",
            className
          )}
          {...props}
        />
      </PopoverPrimitive.Portal>
    );
  }
);
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { ClosePopover, Popover, PopoverContent, PopoverTrigger };
