// src/components/forms/AddItemDropdown.jsx

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, FileText, Plus, Grid2x2Plus } from "lucide-react";
import { IconBadge } from "@components/ui/custom/IconBadge";
import { Kbd, KbdGroup } from "@components/ui/kbd";
import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
 import { __ } from "@wordpress/i18n";
import GenericItemModal from "./GenericItemModal";
import { getEntityConfig } from "./registry";
import ProBadge from "@components/ui/nextUI/ProBadge";

const AddItemDropdown = forwardRef(function AddItemDropdown({
  entity,
  onCreated,
  onAddInlineRow,
  triggerLabel,
  currentItemsCount = 0, // מספר הפריטים הקיימים (לשימוש בחסימת Free)
}, ref) {
   
  const [showFormModal, setShowFormModal] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    openDropdown: () => setDropdownOpen(true),
    closeDropdown: () => setDropdownOpen(false),
    openFormModal: () => setShowFormModal(true),
    closeFormModal: () => setShowFormModal(false),
  }), []);

  const cfg = getEntityConfig(entity) || getEntityConfig(entity?.replace(/s$/, ""));
  const uiSingular = cfg?.labels?.singular ?? entity?.replace(/s$/, "");

  const handleAddInline = () => {
    if (typeof onAddInlineRow === "function") onAddInlineRow();
  };

  const noLicence = typeof window !== "undefined" && window.hasLicence === false;
  const lockedQuick = noLicence;

  // חסימת הוספת חוק הנחה נוסף למשתמשי Free (מותר רק 1)
  const lockedAddNew = noLicence && entity === "discount-rules" && currentItemsCount >= 1;

  return (
    <>
      <div className={`inline-flex items-center h-8 rounded-md shadow-lg hover:shadow-xl transition-shadow relative ${
        lockedAddNew
          ? "bg-gradient-to-r from-slate-400 to-slate-500 cursor-not-allowed"
          : "bg-gradient-to-r from-fuchsia-600 to-pink-500"
      }`} data-tour="add-inline-row">
        {lockedAddNew && (
          <span className="pointer-events-none absolute -top-2 -right-2 z-[60] drop-shadow-sm">
            <ProBadge />
          </span>
        )}
        <button
          onClick={lockedAddNew ? undefined : () => setShowFormModal(true)}
          disabled={lockedAddNew}
          className={`flex items-center gap-1.5 sm:gap-2 h-full px-2 sm:px-3 text-white text-sm font-medium rounded-s-md transition-colors ${
            lockedAddNew ? "cursor-not-allowed opacity-80" : "hover:bg-white/10"
          }`}
          title={lockedAddNew ? __("Pro feature - Free users can create only 1 discount rule", "whizmanage") : undefined}
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{__(triggerLabel || cfg?.triggerLabel || `Add ${uiSingular}`, "whizmanage")}</span>
        </button>

        <div className="w-px h-5 bg-white/20" />

        <DropdownMenu open={lockedAddNew ? false : dropdownOpen} onOpenChange={lockedAddNew ? undefined : setDropdownOpen}>
          <DropdownMenuTrigger asChild disabled={lockedAddNew}>
            <button
              className={`flex items-center justify-center h-full px-2 text-white rounded-e-md transition-colors ${
                lockedAddNew ? "cursor-not-allowed opacity-80" : "hover:bg-white/10"
              }`}
              disabled={lockedAddNew}
            >
              <ChevronDown className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-72" data-tour-dropdown="add-item">
            <DropdownMenuItem
              onClick={() => setShowFormModal(true)}
              className="relative flex items-center gap-3 cursor-pointer"
            >
              <IconBadge icon={FileText} variant="default" size="default" />
              <div className="flex flex-col">
                <span className="font-medium">{__("Using form", "whizmanage")}</span>
                <span className="text-xs text-muted-foreground">
                  {__("Complete form with all fields", "whizmanage")}
                </span>
              </div>
              <KbdGroup className="absolute top-2 end-2">
                <Kbd>Shift</Kbd>
                <span className="text-[9px] text-slate-400 dark:text-slate-500">+</span>
                <Kbd>N</Kbd>
              </KbdGroup>
            </DropdownMenuItem>

            {/* Quick add (Pro בפינה הימנית-עליונה, מוזז מעט שמאלה) */}
            <DropdownMenuItem
              onSelect={(e) => {
                if (lockedQuick) {
                  e.preventDefault();
                  e.stopPropagation();
                  return;
                }
                handleAddInline();
              }}
              className={`relative flex items-center gap-3 ${
                lockedQuick ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
              }`}
              aria-disabled={lockedQuick || undefined}
              data-tour="quick-add-row"
            >
              {lockedQuick && (
                <span className="pointer-events-none absolute -top-1 right-2 z-[60] -translate-y-[10%] drop-shadow-sm">
                  <ProBadge />
                </span>
              )}

              <IconBadge icon={Grid2x2Plus} variant="default" size="default" iconClassName="rotate-180" />
              <div className="flex flex-col">
                <span className="font-medium">{__("Quick add to table", "whizmanage")}</span>
                <span className="text-xs text-muted-foreground">
                  {__("Add empty row directly in table", "whizmanage")}
                </span>
              </div>
              <KbdGroup className="absolute top-2 end-2">
                <Kbd>Ctrl</Kbd>
                <span className="text-[9px] text-slate-400 dark:text-slate-500">+</span>
                <Kbd>Enter</Kbd>
              </KbdGroup>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {showFormModal && (
        <GenericItemModal
          entityName={entity}
          config={cfg}
          onItemCreated={(item) => onCreated?.(item)}
          onItemUpdated={(item) => onCreated?.(item)}
          isOpen={showFormModal}
          onClose={() => setShowFormModal(false)}
        />
      )}
    </>
  );
});

export default AddItemDropdown;
