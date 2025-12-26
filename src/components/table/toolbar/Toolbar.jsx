import React, { memo, useState } from "react";
 import { __ } from "@wordpress/i18n";
import { X, Copy, Trash2, RotateCcw, Loader2, Skull, Pencil, Archive, Settings2 } from "lucide-react";
import { FloatingDock } from "@components/ui/aceternity/floating-dock";
import { Button } from "@components/ui/button";
import ProBadge from "@components/ui/nextUI/ProBadge";

const ICONS = {
  Copy: <Copy className="h-full w-full text-slate-500 dark:text-slate-300" />,
  Trash2: <Trash2 className="h-full w-full text-red-500 dark:text-red-400" />,
  RotateCcw: <RotateCcw className="h-full w-full text-blue-500 dark:text-blue-400" />,
  DeleteForever: <Skull className="h-full w-full text-red-600 dark:text-red-500" />,
  Pencil: <Pencil className="h-full w-full text-slate-600 dark:text-slate-300" />,
  Archive: <Archive className="h-full w-full text-slate-500" />,
  Settings2: <Settings2 className="h-full w-full text-slate-600 dark:text-slate-300" />,
};

export const SelectionToolbar = memo(
  ({ selectedCount, onClear, actions = [], onRequestClose }) => {
     
    const [busy, setBusy] = useState(false);
    if (selectedCount === 0) return null;

    // קבל רק אובייקטי פעולה חוקיים, לא JSX
    const normalized = (actions || []).filter(
      (a) =>
        a &&
        typeof a === "object" &&
        !React.isValidElement(a) &&
        typeof a.onClick === "function" &&
        (typeof a.label === "string" || React.isValidElement(a.icon))
    );

    const filteredActions = normalized.filter((action) => {
      if (!action.showWhen) return true;
      if (action.showWhen === "single" && selectedCount === 1) return true;
      if (action.showWhen === "multiple" && selectedCount > 1) return true;
      if (action.showWhen === "any") return true;
      return false;
    });

    const dockItems = filteredActions.map((action) => {
      const iconName = typeof action.icon === "string" ? action.icon : null;
      const isBulkEdit =
        iconName === "Settings2" ||
        (typeof action.label === "string" && action.label.toLowerCase().includes("bulk"));
      const isDuplicate =
        iconName === "Copy" ||
        (typeof action.label === "string" && action.label.toLowerCase().includes("duplicate"));

      // 🔒 תנאי נעילה — בלי רישיון: Bulk תמיד נעול; Duplicate נעול כשנבחרו 2+
      // או אם הפעולה עצמה סומנה כנעולה (lockedFeature / disabled)
      const noLicence = (typeof window !== "undefined" && window?.hasLicence === false);
      const shouldLock = action.lockedFeature || (noLicence && (isBulkEdit || (isDuplicate && selectedCount > 1)));
      const disabled = action.disabled || shouldLock;

      const baseIcon =
        typeof action.icon === "string" ? (ICONS[action.icon] ?? null) : action.icon ?? null;

      const iconWithBadge = (
        <div
          className={
            "relative h-full w-full " +
            (disabled ? "cursor-not-allowed pointer-events-none" : "")
          }
          aria-disabled={disabled ? "true" : "false"}
          title={
            disabled
              ? __("Pro feature", "whizmanage")
              : typeof action.label === "string"
              ? action.label
              : undefined
          }
        >
          {/* את ההחיוורון שמים רק על האייקון, לא על כל העטיפה */}
          <div className={disabled ? "opacity-50 grayscale" : ""}>
            {baseIcon}
          </div>

          {/* ה־ProBadge נשאר צבעוני כמו ב־Import */}
          {shouldLock && (
            <div className="absolute -top-1 -right-1 scale-90 grayscale-0 opacity-100 drop-shadow">
              <ProBadge />
            </div>
          )}
        </div>
      );

      return {
        title: action.label,
        icon: iconWithBadge,
        onClick: async (e) => {
          e?.preventDefault?.();
          if (busy || disabled) return; // חסימת לחיצה

          const keepOpen = !!action.keepOpen;
          const closeFirst = !!action.closeFirst;
          const shouldClear = action.clearSelection !== false;

          try {
            if (closeFirst) {
              if (shouldClear) onClear?.();
              onRequestClose?.();
            }

            const res = action.onClick?.();
            if (res && typeof res.then === "function") {
              setBusy(true);
              await res;
            }
          } catch (err) {
            console.error(err);
          } finally {
            setBusy(false);
            if (!closeFirst && !keepOpen) {
              if (shouldClear) onClear?.();
              onRequestClose?.();
            }
          }
        },
      };
    });

    return (
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-0">
        <div className={busy ? "pointer-events-none opacity-75" : ""}>
          <FloatingDock items={dockItems} desktopClassName="shadow-xl" mobileClassName="shadow-xl" />
        </div>
        <Button
          onClick={() => {
            if (busy) return;
            onClear?.();
            onRequestClose?.();
          }}
          variant="gradient"
          size="sm"
          className="mt-[-6px] shadow-lg !py-0.5 h-6 gap-2"
          disabled={busy}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          <span className="text-sm font-medium">
            {selectedCount} {selectedCount === 1 ? __("row selected", "whizmanage") : __("rows selected", "whizmanage")}
          </span>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  },
  (prev, next) => prev.selectedCount === next.selectedCount && prev.actions === next.actions
);

SelectionToolbar.displayName = "SelectionToolbar";
