// src/components/ui/textarea.jsx

import { cn } from "@/lib/utils";
import * as React from "react";

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[38px] w-full rounded-md dark:!text-slate-300 border border-input bg-background dark:!bg-slate-700 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:!outline-none focus-visible:ring-2 focus-visible:!ring-fuchsia-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
