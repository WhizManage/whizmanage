// src/components/table/entities/discount-rules/components/TypeWithDiscountSettingsCell.jsx

import {
  defaultActionsForKind,
  DiscountActionsBody,
  DiscountTypeInfo,
} from "@/components/forms/core/fields/TypeWithDiscountSettings.jsx";
import { EditableCell } from "@/components/table/core/EditableCell.jsx";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/utils";
import CustomTooltip from "@components/ui/nextUI/Tooltip";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  useDisclosure,
} from "@heroui/react";
import { Settings2 } from "lucide-react";
import { IconBadge } from "@components/ui/custom/IconBadge";
import { useMemo, useRef, useState } from "react";
 import { __ } from "@wordpress/i18n";

/**
 * 🎯 TypeWithDiscountSettingsCell
 *
 * תא מורכב המציג את סוג ההנחה + כפתור הגדרות
 * מעוצב בהתאם לסטייל של TypeDisplay מטבלת המוצרים
 */
export default function TypeWithDiscountSettingsCell(props) {
  const { row, table } = props;
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

   
  const handleCellUpdate = table?.options?.meta?.handleCellUpdate;

  const kind = row?.original?.type || "product_adjustment";
  const existingActions = row?.original?.actions || {};
  const rowId = row?.original?.id ?? row?.original?._id ?? row?.id;

  const [local, setLocal] = useState(() =>
    defaultActionsForKind(kind, existingActions)
  );
  const [isLoading, setIsLoading] = useState(false);

  const modalRef = useRef(null);

  // טקסט הסבר דינמי לפי סוג ההנחה
  const hint = useMemo(() => {
    switch (kind) {
      case "product_adjustment":
      case "cart_adjustment":
        return __("Configure method/value & coupon", "whizmanage");
      case "bulk_discount":
        return __("Configure quantity tiers", "whizmanage");
      case "bogo_discount":
        return __("Configure BOGO quantities & products", "whizmanage");
      case "bxgy_discount":
        return __("Configure X/Y quantities & products", "whizmanage");
      case "shipping_discount":
        return __("Configure shipping discount", "whizmanage");
      case "spend_bundle":
        return __("Configure spend bundle", "whizmanage");
      default:
        return __("Configure discount settings", "whizmanage");
    }
  }, [kind, __]);

  // Handler לסגירת המודל - מונע סגירה כשיש Select/Popover פתוח
  const handleOpenChange = (open) => {
    if (!open) {
      // בדוק אם יש Select/Popover פתוח
      const activePopper = document.querySelector(
        "[data-radix-popper-content-wrapper]"
      );
      if (activePopper) {
        return; // מנע סגירת המודל
      }
    }
    onOpenChange(open);
  };

  // שמירת השינויים
  const handleSave = async () => {
    try {
      setIsLoading(true);

      let payload = local;
      if (kind === "bxgy_discount" || kind === "bogo_discount") {
        payload = { ...payload };
        payload.x_qty = Number(payload.x_qty) > 0 ? Number(payload.x_qty) : 1;
        payload.y_qty = Number(payload.y_qty) > 0 ? Number(payload.y_qty) : 1;
        payload.discount_pct = Math.max(
          0,
          Math.min(100, Number(payload.discount_pct ?? 0))
        );
        delete payload.method;
        delete payload.value;
        delete payload.apply_as_coupon;
        delete payload.coupon_label;
      }

      await handleCellUpdate?.(rowId, "actions", payload, row?.original, false);

      toast.success(__("Discount settings saved successfully", "whizmanage"));

      onOpenChange(false);
    } catch (error) {
      console.error("Error saving discount settings:", error);
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          __("Failed to save discount settings", "whizmanage")
      );
    } finally {
      setIsLoading(false);
    }
  };

  // פונקציה לעצירת propagation
  const handleButtonClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
  };

  return (
    <>
      {/* תצוגה בתא - שילוב של EditableCell + כפתור הגדרות */}
      <div className="flex items-center gap-2 w-full min-w-0">
        {/* החלק של הטקסט - editable */}
        <div className="flex-1 min-w-0">
          <EditableCell
            {...props}
            onUpdate={handleCellUpdate}
            wrapperClassName="w-full"
          />
        </div>

        {/* מפריד */}
        <div className="w-px h-5 bg-border flex-shrink-0 dark:bg-slate-700" />

        {/* כפתור הגדרות - בדיוק כמו במוצרים */}
        <div onClick={handleButtonClick}>
          <CustomTooltip
            title={__("Discount settings", "whizmanage")}
            description={hint}
            contentClassName="z-[60] text-xs"
          >
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="flex px-2 !size-8"
              aria-label={__("Open discount settings", "whizmanage")}
              onClick={onOpen}
            >
              <Settings2 className="!size-5" />
            </Button>
          </CustomTooltip>
        </div>
      </div>
      <Modal
        size="3xl"
        scrollBehavior="inside"
        backdrop="blur"
        isOpen={isOpen}
        onOpenChange={handleOpenChange}
        isDismissable={!isLoading}
        classNames={{
          backdrop: "z-[9990] bg-black/50 dark:bg-black/70",
          base: "z-[9995] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl !overflow-visible",
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
        <ModalContent ref={modalRef}>
          {(onClose) => (
            <>
              <div id="radix-select-portal" />
              <ModalHeader className="flex gap-3 justify-center items-center px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                <IconBadge icon={Settings2} variant="default" size="default" />
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  {__("Discount settings", "whizmanage")}
                </h2>
              </ModalHeader>
              <ModalBody className="p-3 bg-slate-50 dark:bg-slate-900/50">
                <div className="space-y-6 max-h-[70vh] overflow-y-auto scrollbar-whiz p-2">
                  <DiscountTypeInfo
                    type={row?.original?.type || "product_adjustment"}
                    __={__}
                  />
                  <DiscountActionsBody
                    type={row?.original?.type || "product_adjustment"}
                    local={local}
                    setLocal={setLocal}
                    __={__}
                  />
                </div>
              </ModalBody>

              <ModalFooter className="px-6 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                  className="h-9"
                >
                  {__("Cancel", "whizmanage")}
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="h-9 bg-gradient-to-r from-fuchsia-600 to-pink-500 hover:from-fuchsia-700 hover:to-pink-600 text-white shadow-sm hover:shadow-md transition-all min-w-24"
                >
                  {isLoading ? __("Saving...", "whizmanage") : __("Save", "whizmanage")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
