// src/components/ui/animate-tabs.jsx
// Animated tabs component based on animate-ui design

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { cn } from "@/lib/utils";

const AnimateTabs = TabsPrimitive.Root;

const AnimateTabsList = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "relative inline-flex items-center justify-center rounded-lg sm:rounded-xl bg-slate-100 dark:bg-slate-700/70 p-1 text-slate-500 dark:text-slate-400 dark:border dark:border-slate-600/50",
      className
    )}
    {...props}
  />
));
AnimateTabsList.displayName = "AnimateTabsList";

const AnimateTabsTrigger = React.forwardRef(
  ({ className, children, ...props }, ref) => {
    const [isActive, setIsActive] = React.useState(false);

    return (
      <TabsPrimitive.Trigger
        ref={ref}
        className={cn(
          "relative inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          "data-[state=active]:text-slate-900 dark:data-[state=active]:text-white",
          "data-[state=inactive]:text-slate-600 dark:data-[state=inactive]:text-slate-400",
          "data-[state=inactive]:hover:text-slate-900 dark:data-[state=inactive]:hover:text-slate-200",
          className
        )}
        onFocus={() => setIsActive(true)}
        onBlur={() => setIsActive(false)}
        {...props}
      >
        {({ "data-state": dataState }) => (
          <>
            {dataState === "active" && (
              <motion.span
                layoutId="animate-tabs-indicator"
                className="absolute inset-0 rounded-lg bg-white dark:bg-slate-800 shadow-md dark:shadow-lg dark:shadow-slate-900/50 dark:border dark:border-slate-600/50"
                transition={{
                  type: "spring",
                  bounce: 0.2,
                  duration: 0.5,
                }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {children}
            </span>
          </>
        )}
      </TabsPrimitive.Trigger>
    );
  }
);
AnimateTabsTrigger.displayName = "AnimateTabsTrigger";

// Simple trigger without render props (more compatible)
const AnimateTabsTriggerSimple = React.forwardRef(
  ({ className, children, value, activeTab, layoutId = "animate-tabs-indicator", ...props }, ref) => {
    const isActive = activeTab === value;

    return (
      <TabsPrimitive.Trigger
        ref={ref}
        value={value}
        className={cn(
          "relative inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors z-10",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          isActive
            ? "text-fuchsia-600 dark:text-fuchsia-400"
            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200",
          className
        )}
        {...props}
      >
        {isActive && (
          <motion.span
            layoutId={layoutId}
            className="absolute inset-0 rounded-lg bg-white dark:bg-slate-800 shadow-md dark:shadow-lg dark:shadow-slate-900/50 dark:border dark:border-slate-600/50"
            style={{ zIndex: -1 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 32,
              bounce: 0,
              restDelta: 0.01,
            }}
          />
        )}
        <span className="relative flex items-center gap-2">{children}</span>
      </TabsPrimitive.Trigger>
    );
  }
);
AnimateTabsTriggerSimple.displayName = "AnimateTabsTriggerSimple";

const AnimateTabsContent = React.forwardRef(
  ({ className, children, value, ...props }, ref) => (
    <TabsPrimitive.Content
      ref={ref}
      value={value}
      className={cn(
        "mt-4 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-2 dark:ring-offset-slate-900",
        "data-[state=inactive]:hidden",
        className
      )}
      forceMount
      {...props}
    >
      <motion.div
        key={value}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
          bounce: 0,
        }}
      >
        {children}
      </motion.div>
    </TabsPrimitive.Content>
  )
);
AnimateTabsContent.displayName = "AnimateTabsContent";

// Wrapper for animated content transitions
const AnimateTabsContents = ({ children, activeTab, className }) => (
  <div className={cn("relative", className)}>
    <AnimatePresence mode="wait">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.props.value === activeTab) {
          return React.cloneElement(child, { key: activeTab });
        }
        return null;
      })}
    </AnimatePresence>
  </div>
);

export {
  AnimateTabs,
  AnimateTabsList,
  AnimateTabsTrigger,
  AnimateTabsTriggerSimple,
  AnimateTabsContent,
  AnimateTabsContents,
  LayoutGroup,
};
