// src/components/table/entities/discount-rules/components/ConditionsCell.jsx

import { toast } from "@/lib/utils";
import { Button } from "@components/ui/button";
import CustomTooltip from "@components/ui/nextUI/Tooltip";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import { AlertCircle, ListChecks, Loader2 } from "lucide-react";
import { IconBadge } from "@components/ui/custom/IconBadge";
import ProBadge from "@components/ui/nextUI/ProBadge";
import { useEffect, useMemo, useState } from "react";
 import { __ } from "@wordpress/i18n";
import ConditionsEditor from "./ConditionsEditor";

function ConditionsSummary({ value }) {
   
  const shaped = useMemo(() => {
    const v = value || {};
    return {
      logic: v.logic === "any" ? "any" : "all",
      rules: Array.isArray(v.rules) ? v.rules : [],
    };
  }, [value]);

  const count = shaped.rules.length;
  const logicLabel = shaped.logic === "any" ? __("any", "whizmanage") : __("all", "whizmanage");

  const summary = count
    ? `${count} ${__("rules", "whizmanage")} (${logicLabel})`
    : __("No conditions", "whizmanage");

  return (
    <span
      className="text-xs flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-slate-700 dark:text-slate-300"
      title={summary}
    >
      {summary}
    </span>
  );
}

export default function ConditionsCell({ row, column, table }) {
   
  const [isOpen, setIsOpen] = useState(false);
  const store = table?.options?.meta?.store;
  const handleCellUpdate = table?.options?.meta?.handleCellUpdate;

  const current = row?.original?.[column.id] || { logic: "all", rules: [] };

  const [draft, setDraft] = useState({
    logic: current?.logic === "any" ? "any" : "all",
    rules: Array.isArray(current?.rules) ? current.rules : [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState(false);

  // חישוב תנאים לא תקינים (חסרי ערכים או amount)
  const hasInvalidRules = useMemo(() => {
    return draft.rules.some((r) => {
      // בדיקה אם צריך ids (categories או products)
      const needsIds = r.scope === "categories" || r.scope === "products";
      if (needsIds && (!r.ids || r.ids.length === 0)) {
        return true;
      }
      // בדיקה אם amount חסר או לא תקין
      if (r.amount === undefined || r.amount === null || r.amount === "") {
        return true;
      }
      return false;
    });
  }, [draft.rules]);

  // Open modal and sync draft
  const openModal = () => {
    const fresh = row?.original?.[column.id] || { logic: "all", rules: [] };
    setDraft({
      logic: fresh?.logic === "any" ? "any" : "all",
      rules: Array.isArray(fresh?.rules) ? fresh.rules : [],
    });
    setValidationError(false);
    setIsOpen(true);
  };

  // Close modal - only through explicit actions (Cancel/Save buttons, X button)
  const closeModal = () => {
    if (!isLoading) {
      setIsOpen(false);
    }
  };

  const onSave = async () => {
    // ולידציה: בדוק שכל condition תקין
    if (hasInvalidRules) {
      setValidationError(true);
      return;
    }
    setValidationError(false);

    const rowId =
      row.original?.id ?? row.original?._id ?? row.original?.key ?? row.id;
    const prev = row.original?.[column.id] ?? { logic: "all", rules: [] };

    try {
      setIsLoading(true);

      // עדכון אופטימי
      row.original[column.id] = draft;
      store?.updateItem?.(rowId, { [column.id]: draft });

      await handleCellUpdate?.(rowId, column.id, draft, row.original, false);

      toast.success(__("Conditions saved successfully", "whizmanage"), {
        duration: 2000,
      });

      setIsOpen(false);
    } catch (e) {
      console.error("Failed to save conditions:", e);

      // רולבק
      row.original[column.id] = prev;
      store?.updateItem?.(rowId, { [column.id]: prev });

      toast.error(__("Failed to save conditions", "whizmanage"), {
        description:
          e?.response?.data?.message || e?.message || __("Unknown error", "whizmanage"),
        duration: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      // Only handle Escape if no Select/Popover is open
      if (e.key === "Escape" && !isLoading) {
        const hasOpenPopper = document.querySelector("[data-radix-popper-content-wrapper]");
        if (!hasOpenPopper) {
          setIsOpen(false);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (!isLoading) {
          onSave();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading]);

  const rulesCount = draft.rules.length;

  // 🔒 חסימה עבור Free users
  const noLicence = typeof window !== "undefined" && window.hasLicence === false;

  return (
    <>
      <div className="flex items-center gap-2 w-full">
        <ConditionsSummary value={current} />

        <CustomTooltip
          title={noLicence ? __("Pro feature", "whizmanage") : __("Edit conditions", "whizmanage")}
          description={noLicence ? __("Upgrade to Pro to use conditions", "whizmanage") : __("Configure cart and product conditions", "whizmanage")}
        >
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className={`h-7 px-2 flex-shrink-0 text-muted-foreground hover:text-slate-900 dark:hover:text-slate-100 ${
                noLicence ? "opacity-50 cursor-not-allowed pointer-events-none" : ""
              }`}
              onClick={noLicence ? undefined : openModal}
              disabled={noLicence}
            >
              <ListChecks className="h-4 w-4 mr-1" />
              {__("Edit", "whizmanage")}
              {rulesCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[10px] font-medium rounded-full bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-400">
                  {rulesCount}
                </span>
              )}
            </Button>
            {noLicence && (
              <div className="absolute -top-1 -right-1 scale-75">
                <ProBadge />
              </div>
            )}
          </div>
        </CustomTooltip>
      </div>
      <Modal
        size="3xl"
        scrollBehavior="inside"
        backdrop="blur"
        isOpen={isOpen}
        onClose={closeModal}
        isDismissable={false}
        isKeyboardDismissDisabled={true}
        hideCloseButton
        classNames={{
          backdrop: "z-[9990] bg-black/50 dark:bg-black/70",
          base: "z-[9995] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden",
          wrapper: "z-[9995]",
          header: "p-0",
          footer: "p-0",
          body: "p-0",
          closeButton: "hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 rounded-lg",
        }}
        motionProps={{
          variants: {
            enter: {
              y: 0,
              opacity: 1,
              transition: { duration: 0.3, ease: "easeOut" },
            },
            exit: {
              y: -20,
              opacity: 0,
              transition: { duration: 0.2, ease: "easeIn" },
            },
          },
        }}
      >
        <ModalContent className="dark:bg-slate-900">
          <>
            <div id="radix-select-portal" />
            <ModalHeader className="flex gap-3 justify-center items-center px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
              <IconBadge icon={ListChecks} variant="default" size="default" />
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {__("Edit conditions", "whizmanage")}
              </h2>
            </ModalHeader>

            <ModalBody className="p-3 bg-slate-50 dark:bg-slate-900/50">
              <div className="space-y-6 max-h-[70vh] overflow-y-auto scrollbar-whiz p-2">
                <ConditionsEditor
                  value={draft.rules}
                  logic={draft.logic}
                  onChange={(nextRules) =>
                    setDraft((d) => ({ ...d, rules: nextRules }))
                  }
                  onLogicChange={(nextLogic) =>
                    setDraft((d) => ({ ...d, logic: nextLogic }))
                  }
                />
              </div>
            </ModalBody>

            <ModalFooter className="px-6 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 flex items-center justify-between gap-2">
              {/* הודעת שגיאה */}
              {validationError && hasInvalidRules ? (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">
                    {__("Please fill in all required fields", "whizmanage")}
                  </span>
                </div>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9"
                  onClick={closeModal}
                  disabled={isLoading}
                >
                  {__("Cancel", "whizmanage")}
                </Button>
                <Button
                  type="button"
                  className="h-9 bg-gradient-to-r from-fuchsia-600 to-pink-500 hover:from-fuchsia-700 hover:to-pink-600 text-white shadow-sm hover:shadow-md transition-all min-w-24"
                  disabled={isLoading}
                  onClick={onSave}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {__("Saving...", "whizmanage")}
                    </>
                  ) : (
                    __("Save", "whizmanage")
                  )}
                </Button>
              </div>
            </ModalFooter>
          </>
        </ModalContent>
      </Modal>
    </>
  );
}
