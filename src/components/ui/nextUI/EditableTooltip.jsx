// src/components/ui/nextUI/EditableTooltip.jsx

import { Popover, PopoverTrigger, PopoverContent } from "@heroui/react";
import { Pencil, Check, X, AlignLeft, AlignRight } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { __ } from "@wordpress/i18n";

/**
 * EditableTooltip - Tooltip with inline editing capability
 * Shows full text preview, clicking edit transforms the text into an editable textarea
 */
export default function EditableTooltip({
  children,
  value,
  onSave,
  title,
  minChars = 50,
  disabled = false,
  className,
  portalContainer,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || "");
  const [textDirection, setTextDirection] = useState("auto");
  const textareaRef = useRef(null);

  // Sync editValue when value changes (and not editing)
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value || "");
    }
  }, [value, isEditing]);

  // Focus and select textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Move cursor to end
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [isEditing]);

  const handleStartEdit = useCallback((e) => {
    e?.stopPropagation();
    setEditValue(value || "");
    setIsEditing(true);
  }, [value]);

  const handleSave = useCallback(async (e) => {
    e?.stopPropagation();

    console.log("🔍 EditableTooltip handleSave:", {
      editValue,
      value,
      hasChanged: editValue !== value,
      hasOnSave: !!onSave,
    });

    if (editValue !== value && onSave) {
      console.log("💾 Calling onSave...");
      await onSave(editValue);
    }

    setIsEditing(false);
    setIsOpen(false);
  }, [editValue, value, onSave]);

  const handleCancel = useCallback((e) => {
    e?.stopPropagation();
    setEditValue(value || "");
    setIsEditing(false);
  }, [value]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      handleCancel(e);
    }
    // Ctrl/Cmd + Enter to save
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      e.stopPropagation();
      handleSave(e);
    }
  }, [handleCancel, handleSave]);

  const toggleDirection = useCallback(() => {
    setTextDirection((prev) => (prev === "rtl" ? "ltr" : "rtl"));
  }, []);

  // Reset editing state when popover closes
  const handleOpenChange = useCallback((open) => {
    setIsOpen(open);
    if (!open) {
      setIsEditing(false);
      setEditValue(value || "");
    }
  }, [value]);

  // Don't show tooltip for short text
  const textLength = String(value || "").length;
  if (textLength < minChars || disabled) {
    return children;
  }

  return (
    <Popover
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      placement="top"
      showArrow
      offset={10}
      portalContainer={portalContainer}
      classNames={{
        content: "!border !border-input dark:!bg-slate-800 !z-[9999] p-0",
      }}
    >
      <PopoverTrigger>{children}</PopoverTrigger>
      <PopoverContent>
        <div
          className={cn(
            "p-2 w-[352px]", // Fixed width (320px content + 32px padding)
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-200 dark:border-slate-600">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {title || __("Full content", "whizmanage")}
            </span>

            <div className="flex items-center gap-0.5">
              {/* Direction toggle - only in edit mode */}
              {isEditing && (
                <button
                  type="button"
                  onClick={toggleDirection}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  title={textDirection === "rtl" ? __("Left to Right", "whizmanage") : __("Right to Left", "whizmanage")}
                >
                  {textDirection === "rtl" ? (
                    <AlignLeft className="h-3.5 w-3.5" />
                  ) : (
                    <AlignRight className="h-3.5 w-3.5" />
                  )}
                </button>
              )}

              {/* Edit / Save / Cancel buttons */}
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition-colors"
                    title={__("Cancel", "whizmanage")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/30 text-slate-400 hover:text-green-500 transition-colors"
                    title={__("Save", "whizmanage")}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-fuchsia-500 transition-colors"
                  title={__("Edit", "whizmanage")}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Content - same container, fixed width */}
          <div className="w-[320px]">
            {isEditing ? (
              <textarea
                ref={textareaRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                dir={textDirection}
                className={cn(
                  "w-full min-h-[100px] max-h-[250px] p-2 text-sm resize-none",
                  "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200",
                  "border-0 outline-none rounded-md",
                  "focus:ring-0 focus:outline-none",
                  "scrollbar-whiz leading-relaxed"
                )}
                placeholder={__("Enter text...", "whizmanage")}
              />
            ) : (
              <div
                dir="auto"
                className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200 min-h-[60px] max-h-[200px] overflow-y-auto scrollbar-whiz leading-relaxed p-2"
              >
                {value}
              </div>
            )}
          </div>

          {/* Keyboard hint - only in edit mode */}
          {isEditing && (
            <div className="mt-1 text-[10px] text-slate-400 text-end">
              Ctrl+Enter {__("to save", "whizmanage")}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
