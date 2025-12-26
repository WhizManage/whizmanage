// src/components/ui/tour.jsx

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
} from "@floating-ui/react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const TourContext = React.createContext(null);

function useTour() {
  const context = React.useContext(TourContext);
  if (!context) {
    throw new Error("Tour components must be used within Tour.Root");
  }
  return context;
}

// Root Component
const Root = React.forwardRef(({
  children,
  open = false,
  onOpenChange,
  defaultStep = 0,
  sideOffset = 12,
  alignOffset = 0,
  totalSteps = 0,
  ...props
}, ref) => {
  const [currentStep, setCurrentStep] = React.useState(defaultStep);
  const [targetRect, setTargetRect] = React.useState(null);

  const goToStep = React.useCallback((step) => {
    setCurrentStep(step);
  }, []);

  const nextStep = React.useCallback(() => {
    setCurrentStep((prev) => {
      const next = prev + 1;
      return next < totalSteps ? next : prev;
    });
  }, [totalSteps]);

  const prevStep = React.useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const close = React.useCallback(() => {
    onOpenChange?.(false);
  }, [onOpenChange]);

  const value = React.useMemo(() => ({
    open,
    currentStep,
    totalSteps,
    setCurrentStep: goToStep,
    nextStep,
    prevStep,
    close,
    targetRect,
    setTargetRect,
    sideOffset,
    alignOffset,
  }), [open, currentStep, totalSteps, goToStep, nextStep, prevStep, close, targetRect, sideOffset, alignOffset]);

  // Reset step when tour closes
  React.useEffect(() => {
    if (!open) {
      setCurrentStep(defaultStep);
      setTargetRect(null);
    }
  }, [open, defaultStep]);

  return (
    <TourContext.Provider value={value}>
      <div ref={ref} {...props}>
        {children}
      </div>
    </TourContext.Provider>
  );
});
Root.displayName = "Tour.Root";

// Portal Component
const Portal = ({ children }) => {
  const { open } = useTour();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Add/remove class on body when tour is open
  React.useEffect(() => {
    if (open) {
      document.body.classList.add("tour-active");
    } else {
      document.body.classList.remove("tour-active");
    }
    return () => {
      document.body.classList.remove("tour-active");
    };
  }, [open]);

  if (!mounted || !open) return null;

  return (
    <div className="fixed inset-0 z-[99999]" data-tour-portal>
      {children}
    </div>
  );
};
Portal.displayName = "Tour.Portal";

// Spotlight Component
const Spotlight = React.forwardRef(({ className, ...props }, ref) => {
  const { targetRect, open } = useTour();

  if (!open) return null;

  const padding = 8;
  const clipPath = targetRect
    ? `polygon(
        0% 0%,
        0% 100%,
        ${targetRect.left - padding}px 100%,
        ${targetRect.left - padding}px ${targetRect.top - padding}px,
        ${targetRect.right + padding}px ${targetRect.top - padding}px,
        ${targetRect.right + padding}px ${targetRect.bottom + padding}px,
        ${targetRect.left - padding}px ${targetRect.bottom + padding}px,
        ${targetRect.left - padding}px 100%,
        100% 100%,
        100% 0%
      )`
    : "none";

  return (
    <div
      ref={ref}
      className={cn(
        "fixed inset-0 bg-black/60 backdrop-blur-[2px] transition-all duration-300",
        className
      )}
      style={{ clipPath }}
      data-state={open ? "open" : "closed"}
      {...props}
    />
  );
});
Spotlight.displayName = "Tour.Spotlight";

// SpotlightRing Component
const SpotlightRing = React.forwardRef(({ className, ...props }, ref) => {
  const { targetRect, open } = useTour();

  if (!open || !targetRect) return null;

  const padding = 8;

  return (
    <div
      ref={ref}
      className={cn(
        "fixed pointer-events-none rounded-lg ring-2 ring-fuchsia-500 ring-offset-2 ring-offset-transparent transition-all duration-300",
        "shadow-[0_0_0_4px_rgba(217,70,219,0.2),0_0_20px_rgba(217,70,219,0.4)]",
        "animate-pulse",
        className
      )}
      style={{
        left: targetRect.left - padding,
        top: targetRect.top - padding,
        width: targetRect.width + padding * 2,
        height: targetRect.height + padding * 2,
      }}
      data-state={open ? "open" : "closed"}
      {...props}
    />
  );
});
SpotlightRing.displayName = "Tour.SpotlightRing";

// Step Component
const Step = React.forwardRef(({
  children,
  target,
  side = "bottom",
  align = "center",
  sideOffset: stepSideOffset,
  alignOffset: stepAlignOffset,
  stepIndex,
  className,
  onEnter,
  onExit,
  ...props
}, ref) => {
  const {
    currentStep,
    setTargetRect,
    sideOffset: globalSideOffset,
    open,
  } = useTour();

  const [targetElement, setTargetElement] = React.useState(null);
  const [isReady, setIsReady] = React.useState(false);
  const onEnterCalledRef = React.useRef(false);

  const effectiveSideOffset = stepSideOffset ?? globalSideOffset;

  const isCurrentStep = currentStep === stepIndex && open;

  // Call onEnter when step becomes active
  React.useEffect(() => {
    if (isCurrentStep && !onEnterCalledRef.current) {
      onEnterCalledRef.current = true;
      onEnter?.();
    }
    if (!isCurrentStep && onEnterCalledRef.current) {
      onEnterCalledRef.current = false;
      onExit?.();
    }
  }, [isCurrentStep, onEnter, onExit]);

  // Find target element
  React.useEffect(() => {
    if (!isCurrentStep) {
      setTargetElement(null);
      setIsReady(false);
      return;
    }

    const findTarget = () => {
      if (typeof target === "string") {
        return document.querySelector(target);
      }
      if (typeof target === "function") {
        return target();
      }
      return null;
    };

    // Try to find element with retry
    let attempts = 0;
    const maxAttempts = 20;
    let timeoutId;

    const tryFindElement = () => {
      const element = findTarget();
      if (element) {
        setTargetElement(element);
        const rect = element.getBoundingClientRect();
        setTargetRect({
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        });

        // Scroll element into view if needed
        element.scrollIntoView({ behavior: "smooth", block: "center" });

        // Small delay to ensure positioning is correct after scroll
        setTimeout(() => {
          const newRect = element.getBoundingClientRect();
          setTargetRect({
            left: newRect.left,
            top: newRect.top,
            right: newRect.right,
            bottom: newRect.bottom,
            width: newRect.width,
            height: newRect.height,
          });
          setIsReady(true);
        }, 100);
      } else if (attempts < maxAttempts) {
        attempts++;
        timeoutId = setTimeout(tryFindElement, 150);
      } else {
        // Element not found, skip to ready anyway to show something
        setIsReady(true);
      }
    };

    tryFindElement();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      setTargetElement(null);
      setIsReady(false);
    };
  }, [isCurrentStep, target, setTargetRect]);

  const { refs, floatingStyles, placement } = useFloating({
    open: isCurrentStep && isReady,
    placement: `${side}${align !== "center" ? `-${align}` : ""}`,
    middleware: [
      offset(effectiveSideOffset),
      flip({ padding: 16 }),
      shift({ padding: 16 }),
    ],
    whileElementsMounted: autoUpdate,
  });

  // Update reference element
  React.useEffect(() => {
    if (targetElement && isReady) {
      refs.setReference(targetElement);
    }
  }, [targetElement, refs, isReady]);

  if (!isCurrentStep || !isReady) {
    return null;
  }

  return (
    <div
      ref={(node) => {
        refs.setFloating(node);
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      className={cn(
        "z-[100000] w-80 max-w-[90vw] rounded-xl border border-slate-200 dark:border-slate-700",
        "bg-white dark:bg-slate-800 p-4 shadow-2xl",
        className
      )}
      style={floatingStyles}
      data-side={placement?.split("-")[0]}
      data-align={placement?.split("-")[1] || "center"}
      {...props}
    >
      {children}
    </div>
  );
});
Step.displayName = "Tour.Step";

// Arrow Component
const Arrow = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "absolute w-3 h-3 bg-white dark:bg-slate-800 rotate-45 border border-slate-200 dark:border-slate-700",
        className
      )}
      {...props}
    />
  );
});
Arrow.displayName = "Tour.Arrow";

// Close Component
const Close = React.forwardRef(({ className, asChild, ...props }, ref) => {
  const { close } = useTour();
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      ref={ref}
      className={cn(
        "absolute top-3 end-3 rounded-full p-1.5",
        "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300",
        "hover:bg-slate-100 dark:hover:bg-slate-700",
        "transition-colors focus:outline-none focus:ring-2 focus:ring-fuchsia-500",
        className
      )}
      onClick={close}
      {...props}
    >
      <X className="h-4 w-4" />
    </Comp>
  );
});
Close.displayName = "Tour.Close";

// Header Component
const Header = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("mb-3 pe-6", className)}
      {...props}
    />
  );
});
Header.displayName = "Tour.Header";

// Title Component
const Title = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <h3
      ref={ref}
      className={cn(
        "text-base font-semibold text-slate-900 dark:text-white",
        className
      )}
      {...props}
    />
  );
});
Title.displayName = "Tour.Title";

// Description Component
const Description = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn(
        "mt-1.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed",
        className
      )}
      {...props}
    />
  );
});
Description.displayName = "Tour.Description";

// Footer Component
const Footer = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-700",
        className
      )}
      {...props}
    />
  );
});
Footer.displayName = "Tour.Footer";

// StepCounter Component
const StepCounter = React.forwardRef(({ className, ...props }, ref) => {
  const { currentStep, totalSteps } = useTour();

  return (
    <span
      ref={ref}
      className={cn(
        "text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums",
        className
      )}
      {...props}
    >
      {currentStep + 1} / {totalSteps}
    </span>
  );
});
StepCounter.displayName = "Tour.StepCounter";

// Prev Component
const Prev = React.forwardRef(({ className, asChild, children, ...props }, ref) => {
  const { prevStep, currentStep } = useTour();
  const Comp = asChild ? Slot : "button";
  const isDisabled = currentStep === 0;

  return (
    <Comp
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg",
        "text-slate-600 dark:text-slate-300",
        "hover:bg-slate-100 dark:hover:bg-slate-700",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "transition-colors focus:outline-none focus:ring-2 focus:ring-fuchsia-500",
        className
      )}
      onClick={prevStep}
      disabled={isDisabled}
      {...props}
    >
      <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
      {children}
    </Comp>
  );
});
Prev.displayName = "Tour.Prev";

// Next Component
const Next = React.forwardRef(({ className, asChild, children, isLast, onComplete, ...props }, ref) => {
  const { nextStep, close } = useTour();
  const Comp = asChild ? Slot : "button";

  const handleClick = () => {
    if (isLast) {
      onComplete?.();
      close();
    } else {
      nextStep();
    }
  };

  return (
    <Comp
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg",
        "bg-gradient-to-r from-fuchsia-600 to-pink-500 text-white",
        "hover:from-fuchsia-700 hover:to-pink-600",
        "shadow-md shadow-fuchsia-500/20",
        "transition-all focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:ring-offset-2",
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {children}
      {!isLast && <ChevronRight className="h-4 w-4 rtl:rotate-180" />}
    </Comp>
  );
});
Next.displayName = "Tour.Next";

// Skip Component
const Skip = React.forwardRef(({ className, asChild, ...props }, ref) => {
  const { close } = useTour();
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      ref={ref}
      className={cn(
        "text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300",
        "transition-colors underline-offset-2 hover:underline",
        className
      )}
      onClick={close}
      {...props}
    />
  );
});
Skip.displayName = "Tour.Skip";

export {
  Root,
  Portal,
  Spotlight,
  SpotlightRing,
  Step,
  Arrow,
  Close,
  Header,
  Title,
  Description,
  Footer,
  StepCounter,
  Prev,
  Next,
  Skip,
  useTour,
};
