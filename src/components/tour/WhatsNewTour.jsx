// src/components/tour/WhatsNewTour.jsx

import { useEffect, useState, useCallback } from "react";
 import { __ } from "@wordpress/i18n";
import { createPortal } from "react-dom";
import * as Tour from "@components/ui/tour";
import {
  Sparkles,
  Edit3,
  Palette,
  PlusCircle,
  GripVertical,
  Tag,
  ShoppingCart,
  Users,
  Percent,
} from "lucide-react";

const TOUR_STORAGE_KEY = "whizmanage_tour_completed_v1";
const TOUR_VERSION = "1.3.0"; // Update this when you want to show the tour again for new features

// Check if tour should be shown
export const shouldShowTour = () => {
  try {
    const stored = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!stored) return true;

    const data = JSON.parse(stored);
    // Show tour again if version changed
    if (data.version !== TOUR_VERSION) return true;

    return !data.completed;
  } catch {
    return true;
  }
};

// Mark tour as completed
export const markTourCompleted = () => {
  try {
    localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify({
      completed: true,
      version: TOUR_VERSION,
      completedAt: new Date().toISOString(),
    }));
  } catch (e) {
    console.warn("Failed to save tour state:", e);
  }
};

// Reset tour (for "What's New" button)
export const resetTour = () => {
  try {
    localStorage.removeItem(TOUR_STORAGE_KEY);
  } catch (e) {
    console.warn("Failed to reset tour:", e);
  }
};

// Tour steps configuration
const getTourSteps = (__) => [
  {
    target: '[data-tour="inline-edit"]',
    icon: Edit3,
    title: __("Inline Table Editing", "whizmanage"),
    description: __(
      "Double-click any cell to edit values directly in the table. Changes are saved automatically - no need to open forms!",
      "whizmanage"
    ),
    side: "bottom",
  },
  {
    target: '[data-tour="new-design"]',
    icon: Palette,
    title: __("Fresh New Design", "whizmanage"),
    description: __(
      "We've completely redesigned the interface with a modern look, improved dark mode, and better accessibility.",
      "whizmanage"
    ),
    side: "right",
  },
  {
    target: '[data-tour="add-inline-row"]',
    icon: PlusCircle,
    title: __("Quick Add Products", "whizmanage"),
    description: __(
      "Click the dropdown arrow and select 'Quick add to table' to instantly create a new row and start typing!",
      "whizmanage"
    ),
    side: "bottom",
  },
  {
    target: '[data-tour="drag-reorder"]',
    icon: GripVertical,
    title: __("Drag & Drop Reordering", "whizmanage"),
    description: __(
      "Drag rows to rearrange your products. The new order is automatically saved and reflects in your store.",
      "whizmanage"
    ),
    side: "right",
  },
  {
    target: '[data-tour="coupons-menu"]',
    icon: Tag,
    title: __("Coupons Management", "whizmanage"),
    description: __(
      "Create and manage discount coupons with advanced settings, usage limits, and product restrictions.",
      "whizmanage"
    ),
    side: "right",
  },
  {
    target: '[data-tour="discount-rules-menu"]',
    icon: Percent,
    title: __("Discount Rules", "whizmanage"),
    description: __(
      "Create powerful discount rules with conditions and filters. Set up bulk discounts, category sales, and more.",
      "whizmanage"
    ),
    side: "right",
  },
  {
    target: '[data-tour="orders-menu"]',
    icon: ShoppingCart,
    title: __("Orders Interface", "whizmanage"),
    description: __(
      "View and manage orders with our new streamlined interface. Edit order details, process refunds, and add notes.",
      "whizmanage"
    ),
    side: "right",
  },
  {
    target: '[data-tour="customers-menu"]',
    icon: Users,
    title: __("Customer Management", "whizmanage"),
    description: __(
      "Access detailed customer information, order history, and lifetime value all in one place.",
      "whizmanage"
    ),
    side: "right",
  },
];

export function WhatsNewTour({ isOpen, onClose, forceShow = false }) {
 
  const steps = getTourSteps(__);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleComplete = useCallback(() => {
    markTourCompleted();
    onClose?.();
  }, [onClose]);

  const handleSkip = useCallback(() => {
    markTourCompleted();
    onClose?.();
  }, [onClose]);

  if (!mounted) return null;

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
              onEnter={step.onEnter}
              onExit={step.onExit}
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
                    {isLast ? __("Finish", "whizmanage") : __("Next", "whizmanage")}
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

// Auto-start tour component
export function AutoStartTour() {
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    // Small delay to ensure page is fully loaded
    const timer = setTimeout(() => {
      if (shouldShowTour()) {
        setShowTour(true);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (!showTour) return null;

  return (
    <WhatsNewTour
      isOpen={showTour}
      onClose={() => setShowTour(false)}
    />
  );
}

export default WhatsNewTour;
