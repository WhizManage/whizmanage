// src/components/tour/VariationsTour.jsx

import { useEffect, useState, useCallback } from "react";
import { __ } from "@wordpress/i18n";
import { createPortal } from "react-dom";
import * as Tour from "@components/ui/tour";
import {
  ListPlus,
  Palette,
  Sparkles,
  Globe,
  Package,
  Check,
} from "lucide-react";

const TOUR_STORAGE_KEY = "whizmanage_variations_tour_completed";
const TOUR_VERSION = "1.0.0";

// Check if tour should be shown
export const shouldShowVariationsTour = () => {
  try {
    const stored = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!stored) return true;

    const data = JSON.parse(stored);
    if (data.version !== TOUR_VERSION) return true;

    return !data.completed;
  } catch {
    return true;
  }
};

// Mark tour as completed
export const markVariationsTourCompleted = () => {
  try {
    localStorage.setItem(
      TOUR_STORAGE_KEY,
      JSON.stringify({
        completed: true,
        version: TOUR_VERSION,
        completedAt: new Date().toISOString(),
      })
    );
  } catch (e) {
    console.warn("Failed to save variations tour state:", e);
  }
};

// Reset tour
export const resetVariationsTour = () => {
  try {
    localStorage.removeItem(TOUR_STORAGE_KEY);
  } catch (e) {
    console.warn("Failed to reset variations tour:", e);
  }
};

// Tour steps configuration
const getTourSteps = (__) => [
  {
    target: '[data-tour="variations-step-1"]',
    icon: ListPlus,
    title: __("Step 1: Select Product Attributes", "whizmanage"),
    description: (
      <div className="space-y-2">
        <p>
          {__(
            "Begin by adding attributes to your product. Attributes define the different aspects of your product that may vary, such as color, size, or material.",
            "whizmanage"
          )}
        </p>
        <div className="flex items-start gap-2 mt-2">
          <div className="w-6 h-6 rounded-lg bg-fuchsia-100 dark:bg-fuchsia-900/30 flex items-center justify-center shrink-0 mt-0.5">
            <Package className="w-3.5 h-3.5 text-fuchsia-600 dark:text-fuchsia-400" />
          </div>
          <div>
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {__("Product Attribute:", "whizmanage")}
            </span>{" "}
            <span className="text-slate-600 dark:text-slate-300">
              {__(
                "Unique to this specific product, like 'Storage Capacity' for electronics.",
                "whizmanage"
              )}
            </span>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="w-6 h-6 rounded-lg bg-fuchsia-100 dark:bg-fuchsia-900/30 flex items-center justify-center shrink-0 mt-0.5">
            <Globe className="w-3.5 h-3.5 text-fuchsia-600 dark:text-fuchsia-400" />
          </div>
          <div>
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {__("Global Attribute:", "whizmanage")}
            </span>{" "}
            <span className="text-slate-600 dark:text-slate-300">
              {__(
                "Common across multiple products like 'Size' or 'Color'. Create once, reuse everywhere.",
                "whizmanage"
              )}
            </span>
          </div>
        </div>
      </div>
    ),
    side: "bottom",
  },
  {
    target: '[data-tour="variations-step-2"]',
    icon: Palette,
    title: __("Step 2: Define Attribute Options", "whizmanage"),
    description: (
      <div className="space-y-2">
        <p>
          {__(
            "After selecting an attribute, define the available options. For example, if the attribute is 'Color', specify the available colors like Blue, Red, or Green.",
            "whizmanage"
          )}
        </p>
        <div className="bg-fuchsia-50 dark:bg-fuchsia-900/20 rounded-lg p-2.5 mt-2">
          <p className="text-sm text-fuchsia-700 dark:text-fuchsia-300">
            <strong>{__("Tip:", "whizmanage")}</strong>{" "}
            {__(
              "The 'Any' option displays all available options to customers. Use it when you don't need different settings per variation.",
              "whizmanage"
            )}
          </p>
        </div>
      </div>
    ),
    side: "bottom",
  },
  {
    target: '[data-tour="variations-step-3"]',
    icon: Sparkles,
    title: __("Step 3: Generate Variations", "whizmanage"),
    description: (
      <div className="space-y-2">
        <p>
          {__(
            "Click 'Combine & Generate' to create all possible combinations of your selected attributes and options.",
            "whizmanage"
          )}
        </p>
        <div className="bg-slate-100 dark:bg-slate-700/50 rounded-lg p-3 mt-2">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
            {__("Example:", "whizmanage")}
          </p>
          <div className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{__("Color:", "whizmanage")}</span>
              <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded text-xs">
                Blue
              </span>
              <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded text-xs">
                Green
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{__("Size:", "whizmanage")}</span>
              <span className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded text-xs">
                S
              </span>
              <span className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded text-xs">
                L
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-200 dark:border-slate-600">
              <Check className="w-4 h-4 text-fuchsia-500" />
              <span>
                {__("Creates 4 variations:", "whizmanage")}{" "}
                <span className="font-medium">S-Blue, L-Blue, S-Green, L-Green</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    side: "top",
  },
];

export function VariationsTour({ isOpen, onClose }) {
  const steps = getTourSteps(__);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleComplete = useCallback(() => {
    markVariationsTourCompleted();
    onClose?.();
  }, [onClose]);

  const handleSkip = useCallback(() => {
    markVariationsTourCompleted();
    onClose?.();
  }, [onClose]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <Tour.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleSkip();
      }}
      sideOffset={16}
      totalSteps={steps.length}
    >
      <Tour.Portal>
        <Tour.Spotlight className="transition-all duration-500" />
        <Tour.SpotlightRing className="rounded-lg" />

        {steps.map((step, index) => {
          const Icon = step.icon;
          const isLast = index === steps.length - 1;

          return (
            <Tour.Step
              key={index}
              stepIndex={index}
              target={step.target}
              side={step.side}
              align="center"
            >
              <Tour.Close />
              <Tour.Header>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-pink-500/20 dark:from-fuchsia-500/30 dark:to-pink-500/30">
                    <Icon className="w-5 h-5 text-fuchsia-600 dark:text-fuchsia-400" />
                  </div>
                  <Tour.Title>{step.title}</Tour.Title>
                </div>
                <Tour.Description>{step.description}</Tour.Description>
              </Tour.Header>
              <Tour.Footer>
                <div className="flex items-center gap-2">
                  <Tour.StepCounter totalSteps={steps.length} />
                  <Tour.Skip>{__("Skip tour", "whizmanage")}</Tour.Skip>
                </div>

                <div className="flex items-center gap-2">
                  {index > 0 && (
                    <Tour.Prev>{__("Back", "whizmanage")}</Tour.Prev>
                  )}
                  <Tour.Next isLast={isLast} onComplete={handleComplete}>
                    {isLast
                      ? __("Got it!", "whizmanage")
                      : __("Next", "whizmanage")}
                  </Tour.Next>
                </div>
              </Tour.Footer>
            </Tour.Step>
          );
        })}
      </Tour.Portal>
    </Tour.Root>,
    document.body
  );
}

export default VariationsTour;
