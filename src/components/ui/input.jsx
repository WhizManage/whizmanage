// src/components/ui/input.jsx

import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import * as React from "react";

const Input = React.forwardRef(
  ({ className, type, hideArrows = false, ...props }, ref) => {
    const inputRef = React.useRef(null);
    const combinedRef = (node) => {
      inputRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    };

    const increment = () => {
      if (inputRef.current) {
        inputRef.current.stepUp();
        inputRef.current.dispatchEvent(new Event("input", { bubbles: true }));
      }
    };

    const decrement = () => {
      if (inputRef.current) {
        inputRef.current.stepDown();
        inputRef.current.dispatchEvent(new Event("input", { bubbles: true }));
      }
    };

    const isNumber = type === "number";
    const showCustomArrows = isNumber && !hideArrows;

    if (showCustomArrows) {
      return (
        <div className="relative group w-full">
          <input
            type={type}
            className={cn(
              "flex h-10 w-full rounded-md dark:!text-slate-300 border border-input bg-background dark:!bg-slate-700 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:!ring-fuchsia-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              // number
              "[&[type=number]]:border [&[type=number]]:!border-input [&[type=number]]:focus-visible:ring-2 [&[type=number]]:focus-visible:ring-offset-2 [&[type=number]]:focus-visible:outline-none",
              "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
              "pe-10",
              className
            )}
            ref={combinedRef}
            {...props}
          />

          {/* Custom arrows with RTL/LTR support */}
          <div
            className="
              absolute
              end-0.5
              top-0.5
              h-[calc(100%-0.25rem)]
              flex flex-col
              opacity-0 group-focus-within:opacity-100
              transition-opacity"
          >
            <button
              type="button"
              onClick={increment}
              onMouseDown={(e) => e.preventDefault()}
              tabIndex={-1}
              className="h-1/2 w-5 rounded-sm flex items-center justify-center text-slate-500 hover:text-fuchsia-600 dark:text-slate-300 dark:hover:text-fuchsia-400 transition-colors rounded-t bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600"
            >
              <ChevronUp className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={decrement}
              onMouseDown={(e) => e.preventDefault()}
              tabIndex={-1}
              className="h-1/2 w-5 rounded-sm flex items-center justify-center text-slate-500 hover:text-fuchsia-600 dark:text-slate-300 dark:hover:text-fuchsia-400 transition-colors rounded-b bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>
      );
    }

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md dark:!text-slate-300 border border-input bg-background dark:!bg-slate-700 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:dark:!ring-offset-slate-700 focus-visible:ring-2 focus-visible:!ring-fuchsia-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          // text
          "[&[type=text]]:border [&[type=text]]:!border-input [&[type=text]]:focus-visible:ring-2 [&[type=text]]:focus-visible:ring-offset-2 [&[type=text]]:focus-visible:outline-none",
          // number
          "[&[type=number]]:border [&[type=number]]:!border-input [&[type=number]]:focus-visible:ring-2 [&[type=number]]:focus-visible:ring-offset-2 [&[type=number]]:focus-visible:outline-none",
          // email
          "[&[type=email]]:border [&[type=email]]:!border-input [&[type=email]]:focus-visible:ring-2 [&[type=email]]:focus-visible:ring-offset-2 [&[type=email]]:focus-visible:outline-none",
          // password
          "[&[type=password]]:border [&[type=password]]:!border-input [&[type=password]]:focus-visible:ring-2 [&[type=password]]:focus-visible:ring-offset-2 [&[type=password]]:focus-visible:outline-none",
          // tel
          "[&[type=tel]]:border [&[type=tel]]:!border-input [&[type=tel]]:focus-visible:ring-2 [&[type=tel]]:focus-visible:ring-offset-2 [&[type=tel]]:focus-visible:outline-none",
          // url
          "[&[type=url]]:border [&[type=url]]:!border-input [&[type=url]]:focus-visible:ring-2 [&[type=url]]:focus-visible:ring-offset-2 [&[type=url]]:focus-visible:outline-none",
          // search
          "[&[type=search]]:border [&[type=search]]:!border-input [&[type=search]]:focus-visible:ring-2 [&[type=search]]:focus-visible:ring-offset-2 [&[type=search]]:focus-visible:outline-none",
          // date
          "[&[type=date]]:border [&[type=date]]:!border-input [&[type=date]]:focus-visible:ring-2 [&[type=date]]:focus-visible:ring-offset-2 [&[type=date]]:focus-visible:outline-none",
          // time
          "[&[type=time]]:border [&[type=time]]:!border-input [&[type=time]]:focus-visible:ring-2 [&[type=time]]:focus-visible:ring-offset-2 [&[type=time]]:focus-visible:outline-none",
          // datetime-local
          "[&[type=datetime-local]]:border [&[type=datetime-local]]:!border-input [&[type=datetime-local]]:focus-visible:ring-2 [&[type=datetime-local]]:focus-visible:ring-offset-2 [&[type=datetime-local]]:focus-visible:outline-none",
          // month
          "[&[type=month]]:border [&[type=month]]:!border-input [&[type=month]]:focus-visible:ring-2 [&[type=month]]:focus-visible:ring-offset-2 [&[type=month]]:focus-visible:outline-none",
          // week
          "[&[type=week]]:border [&[type=week]]:!border-input [&[type=week]]:focus-visible:ring-2 [&[type=week]]:focus-visible:ring-offset-2 [&[type=week]]:focus-visible:outline-none",
          // color
          "[&[type=color]]:border [&[type=color]]:!border-input [&[type=color]]:focus-visible:ring-2 [&[type=color]]:focus-visible:ring-offset-2 [&[type=color]]:focus-visible:outline-none [&[type=color]]:h-10 [&[type=color]]:p-1",
          // range
          "[&[type=range]]:border-0 [&[type=range]]:p-0",
          // hide native arrows
          type === "number" &&
            hideArrows &&
            "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input };
