// src/components/table/entities/discount-rules/components/FiltersCell.jsx

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
import { AlertCircle, Filter as FilterIcon, Loader2 } from "lucide-react";
import { IconBadge } from "@components/ui/custom/IconBadge";
import { useEffect, useMemo, useState } from "react";
 import { __ } from "@wordpress/i18n";
import FiltersEditor from "./FiltersEditor";

/** סיכום קצר ליד הכפתור */
function FiltersSummary({ rows }) {
   
  const list = Array.isArray(rows) ? rows : [];

  const { summary, title } = useMemo(() => {
    if (!list.length) {
      const empty = __("No filters", "whizmanage");
      return {
        summary: empty,
        title: empty,
      };
    }

    const fields = list.map((r) => r?.field).filter(Boolean);
    const uniq = Array.from(new Set(fields));

    // ⬅ פה אנחנו מתרגמים כל field לפי המפתח שלו
    const translated = uniq.map((field) => __(field, "whizmanage"));

    const head = translated.slice(0, 3).join(", ");
    const more = translated.length > 3 ? ` +${translated.length - 3}` : "";
    const base = `${list.length} ${__("filters", "whizmanage")}`;
    const summary = translated.length ? `${base} • ${head}${more}` : base;
    const title = translated.length
      ? `${base} • ${translated.join(", ")}`
      : base;

    return { summary, title };
  }, [list, __]);

  return (
    <span
      className="text-xs flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-slate-700 dark:text-slate-300"
      title={title}
    >
      {summary}
    </span>
  );
}

/**
 * קומפוננטה לעריכת filters בלבד.
 * לא שולחת conditions, לא ממירה, ולא נוגעת בשדה conditions.
 */
export default function FiltersCell({ row, column, table }) {
   
  const [isOpen, setIsOpen] = useState(false);
  const store = table?.options?.meta?.store;
  const handleCellUpdate = table?.options?.meta?.handleCellUpdate;

  // filters נוכחיים מהשורה
  const current = row?.original?.[column.id] || [];

  const [draft, setDraft] = useState(Array.isArray(current) ? current : []);
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState(false);

  // חישוב פילטרים לא תקינים (חסרי ערכים)
  const invalidFilterFields = useMemo(() => {
    return new Set(
      (Array.isArray(draft) ? draft : [])
        .filter(
          (f) =>
            f?.field !== "on_sale" && (!f?.values || f.values.length === 0)
        )
        .map((f) => f?.field)
    );
  }, [draft]);

  // Open modal and sync draft
  const openModal = () => {
    const fresh = Array.isArray(row.original?.[column.id])
      ? row.original[column.id]
      : [];
    setDraft(fresh);
    setValidationError(false);
    setIsOpen(true);
  };

  // Close modal - only through explicit actions (Cancel/Save buttons)
  const closeModal = () => {
    if (!isLoading) {
      setIsOpen(false);
    }
  };

  const onSave = async () => {
    // ולידציה: כל פילטר שדורש values חייב לקבל ערך (מלבד on_sale)
    if (invalidFilterFields.size > 0) {
      setValidationError(true);
      return;
    }
    setValidationError(false);

    const rowId =
      row.original?.id ?? row.original?._id ?? row.original?.key ?? row.id;

    const prevFilters = row.original?.[column.id] ?? [];

    try {
      setIsLoading(true);

      // עדכון אופטימי – filters בלבד
      row.original[column.id] = draft;
      store?.updateItem?.(rowId, { [column.id]: draft });

      // שליחה לשרת – filters בלבד
      await handleCellUpdate?.(
        rowId,
        column.id, // בד״כ "filters"
        draft,
        row.original,
        false
      );

      toast.success(__("Filters saved successfully", "whizmanage"), { duration: 2000 });
      setIsOpen(false);
    } catch (e) {
      console.error("Failed to save filters:", e);

      // רולבק מקומי
      row.original[column.id] = prevFilters;
      store?.updateItem?.(rowId, { [column.id]: prevFilters });

      toast.error(__("Failed to save filters", "whizmanage"), {
        description:
          e?.response?.data?.message || e?.message || __("Unknown error", "whizmanage"),
        duration: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // קיצורי מקלדת (Esc לסגירה, Ctrl/Cmd+S לשמירה)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      // Only handle Escape if no Select/Popover is open
      if (e.key === "Escape" && !isLoading) {
        const hasOpenPopper = document.querySelector(
          "[data-radix-popper-content-wrapper]"
        );
        if (!hasOpenPopper) {
          setIsOpen(false);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (!isLoading) onSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading]);

  return (
    <>
      <div className="flex items-center gap-2 w-full">
        {/* סיכום קצר של הפילטרים */}
        <FiltersSummary rows={current} />

        <CustomTooltip
          title={__("Edit filters", "whizmanage")}
          description={__("Configure product filters for this rule", "whizmanage")}
        >
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 flex-shrink-0 text-muted-foreground hover:text-slate-900 dark:hover:text-slate-100"
            onClick={openModal}
          >
            <FilterIcon className="h-4 w-4 mr-1" />
            {__("Edit", "whizmanage")}
            {Array.isArray(current) && current.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[10px] font-medium rounded-full bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-400">
                {current.length}
              </span>
            )}
          </Button>
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
          closeButton:
            "hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 rounded-lg",
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
              <IconBadge icon={FilterIcon} variant="default" size="default" />
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {__("Edit filters", "whizmanage")}
              </h2>
            </ModalHeader>

            <ModalBody className="p-3 bg-slate-50 dark:bg-slate-900/50">
              <div className="space-y-6 max-h-[70vh] overflow-y-auto scrollbar-whiz p-2">
                <FiltersEditor rows={draft} onChange={setDraft} />
              </div>
            </ModalBody>

            <ModalFooter className="px-6 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 flex items-center justify-between gap-2">
              {/* הודעת שגיאה */}
              {validationError && invalidFilterFields.size > 0 ? (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">
                    {__("Please select values for all filters", "whizmanage")}
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
