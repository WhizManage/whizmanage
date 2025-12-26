// src/components/ui/skeleton.jsx

import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn("animate-pulse bg-slate-200 dark:bg-slate-600", className)}
      {...props}
    />
  );
}

export { Skeleton };
