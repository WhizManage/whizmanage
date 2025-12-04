// src/components/RichEditor/components/Toolbar/FontTools.jsx
import React from "react";
import { __ } from '@wordpress/i18n';
import { ChevronDown, Plus, Minus as MinusIcon } from "lucide-react";
import { Button } from "@components/ui/button";

const FontTools = ({
  currentFontSize,
  showFontSelector,
  fontOptions,
  increaseFontSize,
  decreaseFontSize,
  changeFont,
  setShowFontSelector,
}) => {
   

  // Helper to get font size text
  const getFontSizeText = (size) => {
    if (size < 1) return "Tiny";
    if (size === 1) return "Tiny";
    if (size === 2) return "Small";
    if (size === 3) return "Normal";
    if (size === 4) return "Large";
    if (size === 5) return "X-Large";
    if (size === 6) return "XX-Large";
    return "Huge";
  };

  return (
    <div className="flex items-center gap-0.5">
      {/* Font selector */}
      <div className="relative">
        <Button
          size="xs"
          variant="ghost"
          className="h-7 px-2 rounded-md flex items-center gap-1 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setShowFontSelector(!showFontSelector)
          }}
        >
          <span className="max-w-28 truncate">{__("Font", "whizmanage")}</span>
          <ChevronDown className="size-3" strokeWidth={1.5} />
        </Button>

        {/* Font selector dropdown */}
        {showFontSelector && (
          <div className="absolute start-0 top-full mt-1 w-48 z-10 bg-white dark:bg-slate-800 shadow-lg rounded-md border border-slate-200 dark:border-slate-600 py-1 max-h-64 overflow-y-auto">
            {fontOptions.map((font) => (
              <button
                key={font.value}
                className="w-full text-start px-3 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                style={{ fontFamily: font.value }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  changeFont(font.value)
                }}
              >
                {font.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {/* Font size */}
      <div className="flex items-center rounded-md border border-slate-200 dark:border-slate-600 h-7">
        <Button
          size="xs"
          variant="ghost"
          className="h-6 w-6 p-0 rounded-none rounded-s-md border-e border-slate-200 dark:border-slate-600"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            decreaseFontSize();
          }}
          aria-label={__("Decrease Font Size", "whizmanage")}
        >
          <MinusIcon className="size-3" strokeWidth={1.5} />
        </Button>

        <span className="px-2 text-xs">
          {getFontSizeText(currentFontSize)}
        </span>

        <Button
          size="xs"
          variant="ghost"
          className="h-6 w-6 p-0 rounded-none rounded-e-md border-s border-slate-200 dark:border-slate-600"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            increaseFontSize();
          }}
          aria-label={__("Increase Font Size", "whizmanage")}
        >
          <Plus className="size-3" strokeWidth={1.5} />
        </Button>
      </div>
    </div>
  );
};

export default FontTools;