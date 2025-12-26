// src/layout/editor/components/Toolbar/FontTools.jsx
import { Button } from "@components/ui/button";
import CustomTooltip from "@components/ui/nextUI/Tooltip";
import { ChevronDown, Minus as MinusIcon, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { __ } from "@wordpress/i18n";

const FontTools = ({
  currentFontSize,
  showFontSelector,
  fontOptions,
  increaseFontSize,
  decreaseFontSize,
  changeFont,
  setShowFontSelector,
  compact = false,
}) => {
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);

  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  // החישוב של מיקום ה-dropdown
  useEffect(() => {
    if (showFontSelector && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();

      setDropdownPos({
        top: rect.bottom + 4, // 4px margin
        left: rect.left,
      });
    }
  }, [showFontSelector]);

  // סגירה בלחיצה מחוץ
  useEffect(() => {
    if (!showFontSelector) return;

    const close = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        !buttonRef.current.contains(e.target)
      ) {
        setShowFontSelector(false);
      }
    };

    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [showFontSelector]);


const getFontSizeText = (size) => {
  if (size <= 1) return __("Tiny", "whizmanage");
  if (size === 2) return __("Small", "whizmanage");
  if (size === 3) return __("Normal", "whizmanage");
  if (size === 4) return __("Large", "whizmanage");
  if (size === 5) return __("X-Large", "whizmanage");
  if (size === 6) return __("XX-Large", "whizmanage");
  return __("Huge", "whizmanage");
};


  return (
    <div className="flex items-center gap-0.5">
      {/* Font selector button */}
      <div className="relative">
        <CustomTooltip title={__("Font", "whizmanage")}>
          <Button
            ref={buttonRef}
            size="xs"
            variant="ghost"
            className="h-7 px-2 rounded-md flex items-center gap-1 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setShowFontSelector(!showFontSelector);
            }}
          >
            <span className="max-w-28 truncate">
              {__("Font", "whizmanage")}
            </span>
            <ChevronDown className="size-3" strokeWidth={1.5} />
          </Button>
        </CustomTooltip>

        {/* Dropdown via Portal */}
        {showFontSelector &&
          createPortal(
            <div
              ref={dropdownRef}
              className="fixed z-[999999] bg-white dark:bg-slate-800 shadow-lg rounded-md border border-slate-200 dark:border-slate-600 py-1 max-h-64 overflow-y-auto scrollbar-whiz"
              style={{
                position: "fixed",
                top: dropdownPos.top,
                left: dropdownPos.left,
                width: "190px",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {fontOptions.map((font) => (
                <button
                  key={font.value}
                  className="w-full text-start px-3 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                  style={{ fontFamily: font.value }}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    changeFont(font.value);
                    setShowFontSelector(false);
                  }}
                >
                  {font.label}
                </button>
              ))}
            </div>,
            document.body
          )}
      </div>

      {/* Font size buttons - hidden in compact mode */}
      {!compact && (
        <div className="flex items-center rounded-md border border-slate-200 dark:border-slate-600 h-7">
          <CustomTooltip title={__("Decrease Font Size", "whizmanage")}>
            <Button
              size="xs"
              variant="ghost"
              className="h-6 w-6 p-0 rounded-none rounded-s-md border-e border-slate-200 dark:border-slate-600"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                decreaseFontSize();
              }}
            >
              <MinusIcon className="size-3" strokeWidth={1.5} />
            </Button>
          </CustomTooltip>

          <span className="px-2 text-xs">
            {getFontSizeText(currentFontSize)}
          </span>

          <CustomTooltip title={__("Increase Font Size", "whizmanage")}>
            <Button
              size="xs"
              variant="ghost"
              className="h-6 w-6 p-0 rounded-none rounded-e-md border-s border-slate-200 dark:border-slate-600"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                increaseFontSize();
              }}
            >
              <Plus className="size-3" strokeWidth={1.5} />
            </Button>
          </CustomTooltip>
        </div>
      )}
    </div>
  );
};

export default FontTools;
