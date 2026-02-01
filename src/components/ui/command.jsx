// src/components/ui/command.jsx

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";
import * as React from "react";

const Command = React.forwardRef(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      "flex h-full w-full flex-col overflow-hidden rounded-md bg-white dark:bg-slate-800 text-popover-foreground dark:border-slate-600",
      className
    )}
    {...props}
  />
));
Command.displayName = CommandPrimitive.displayName;

const CommandDialog = ({ children, ...props }) => {
  return (
    <Dialog {...props}>
      <DialogContent className="overflow-hidden p-0 shadow-lg dark:border-slate-600">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  );
};

const CommandInput = React.forwardRef(({ className, ...props }, ref) => (
  <div
    className={cn(
      "flex items-center border-b dark:border-slate-700 px-1",
      className
    )}
  >
    <Search className="mx-2 h-4 w-4 shrink-0 opacity-50 dark:text-slate-300" />
    <CommandPrimitive.Input
      ref={ref}
      type="search"
      className={cn(
        "flex h-11 w-full border-none bg-transparent py-3 text-sm placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        "!ring-0 !ring-offset-0 !outline-none !shadow-none focus:!ring-0 focus:!ring-offset-0 focus:!outline-none focus:!shadow-none focus-visible:!ring-0 focus-visible:!ring-offset-0 focus-visible:!outline-none focus-visible:!shadow-none",
        "dark:!bg-slate-800 dark:!text-slate-300 rounded-md [&::-webkit-search-cancel-button]:hidden",
        className
      )}
      {...props}
    />
  </div>
));

CommandInput.displayName = CommandPrimitive.Input.displayName;

const CommandList = React.forwardRef(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn(
      "max-h-[300px] overflow-y-auto overflow-x-hidden scrollbar-whiz",
      className
    )}
    {...props}
  />
));

CommandList.displayName = CommandPrimitive.List.displayName;

const CommandEmpty = React.forwardRef((props, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className="py-6 text-center text-sm"
    {...props}
  />
));

CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

const CommandGroup = React.forwardRef(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
      className
    )}
    {...props}
  />
));

CommandGroup.displayName = CommandPrimitive.Group.displayName;

const CommandSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 h-px bg-border", className)}
    {...props}
  />
));
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;

const CommandItem = React.forwardRef(({ className, value, ...props }, ref) => {
  // Sanitize value to prevent querySelector errors with special characters
  const sanitizedValue = value
    ? String(value).replace(/["'\\[\]]/g, "")
    : value;

  return (
    <CommandPrimitive.Item
      ref={ref}
      value={sanitizedValue}
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent dark:aria-selected:bg-slate-700 aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-30",
        className
      )}
      {...props}
    />
  );
});

CommandItem.displayName = CommandPrimitive.Item.displayName;

const CommandShortcut = ({ className, ...props }) => {
  return (
    <span
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground",
        className
      )}
      {...props}
    />
  );
};
CommandShortcut.displayName = "CommandShortcut";

export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
};
