import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-fuchsia-600 text-white hover:bg-fuchsia-600/90 dark:bg-fuchsia-600",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        outline:
          "border border-input bg-background hover:bg-neutral-100 hover:text-accent-foreground dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        ghost_1: "dark:bg-neutral-500/20 bg-gray-100/40 hover:bg-gray-100/30 text-gray-500 dark:text-gray-300 text-base border border-gray-300/50 dark:border-gray-700 ",
        link: "text-fuchsia-600 underline-offset-4 hover:underline",
        gradient: "!bg-gradient-to-l rtl:!bg-gradient-to-r from-pink-500 to-fuchsia-600 hover:brightness-110 hover:shadow-md hover:shadow-pink-300/50 dark:hover:shadow-slate-950/80 transition-all duration-200 text-white",
      },
      size: {
        default: "h-10 px-4 py-2",
        xs: "h-8 rounded-md px-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    (<Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />)
  );
})
Button.displayName = "Button"

export default Button;

export { Button, buttonVariants }
