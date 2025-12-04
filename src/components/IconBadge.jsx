import { cva }  from "class-variance-authority";
import { cn } from "../lib/utils";


const backgroundVariants = cva(
  "rounded-full flex items-center justify-center",
  {
    variants: {
      variant: {
        default: "bg-fuchsia-100 dark:bg-slate-100/20",
        success: "bg-emerald-100",
      },
      size: {
        default: "p-2",
        sm: "p-1",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    }
  }
);

const iconVariants = cva(
  "",
  {
    variants: {
      variant: {
        default: "text-fuchsia-600 dark:text-fuchsia-600",
        success: "text-emerald-700",
      },
      size: {
        default: "h-8 w-8",
        sm: "h-4 w-4"
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    }
  }
);


export const IconBadge = ({
  icon: Icon,
  variant,
  size,
}) => {
  return (
    <div className={cn(backgroundVariants({ variant, size }))}>
      <Icon className={cn(iconVariants({ variant, size }))} />
    </div>
  )
};