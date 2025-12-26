// src/components/ui/custom/IconBadge.jsx

import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const backgroundVariants = cva("rounded-md flex items-center justify-center", {
  variants: {
    variant: {
      default:
        "bg-gradient-to-br from-fuchsia-100 to-fuchsia-200 dark:from-fuchsia-900/40 dark:to-fuchsia-800/40 shadow-sm dark:shadow-lg",
      success:
        "bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/40 shadow-sm dark:shadow-lg",
    },
    size: {
      default: "p-2",
      sm: "p-1",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

const iconVariants = cva("", {
  variants: {
    variant: {
      default: "text-fuchsia-600 dark:text-fuchsia-400",
      success: "text-emerald-700 dark:text-emerald-400",
    },
    size: {
      default: "h-5 w-5",
      sm: "h-4 w-4",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

export const IconBadge = ({ icon: Icon, variant, size, className, iconClassName }) => {
  return (
    <div className={cn(backgroundVariants({ variant, size }), className)}>
      <Icon className={cn(iconVariants({ variant, size }), iconClassName)} />
    </div>
  );
};
