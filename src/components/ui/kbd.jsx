import * as React from "react";
import { cn } from "@/lib/utils";

const Kbd = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <kbd
      ref={ref}
      className={cn(
        "pointer-events-none inline-flex h-4 select-none items-center gap-0.5 rounded border border-slate-200 bg-slate-100 px-1 font-mono text-[9px] font-medium text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300",
        className
      )}
      {...props}
    />
  );
});
Kbd.displayName = "Kbd";

const KbdGroup = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <span
      ref={ref}
      className={cn("inline-flex items-center gap-0.5", className)}
      {...props}
    />
  );
});
KbdGroup.displayName = "KbdGroup";

export { Kbd, KbdGroup };
