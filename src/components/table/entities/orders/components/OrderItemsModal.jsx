// src/components/table/entities/orders/components/OrderItemsModal.jsx
import Button from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IconBadge } from "@components/ui/custom/IconBadge";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  useDisclosure,
} from "@heroui/react";
import { Package } from "lucide-react";
import React, { useMemo, useState } from "react";
 import { __ } from "@wordpress/i18n";
import { useEntityStore } from "../orders.config";
import OrderLineItems from "./OrderLineItems";

export default function OrderItemsModal({
  row,
  onUpdate,
  asChild = false,
  triggerClassName = "",
  children,
}) {
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
   

  const products =
    window.listProduct || useEntityStore((s) => s.products) || [];

  const [form, setForm] = useState({
    line_items: Array.isArray(row?.line_items) ? [...row.line_items] : [],
    total: row?.total,
    coupon_lines: row?.coupon_lines,
  });

  const [isLoading, setIsLoading] = useState(false);

  const originalItems = useMemo(
    () => (Array.isArray(row?.line_items) ? [...row.line_items] : []),
    [row?.line_items]
  );

  const updateValue = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const buildPayload = () => {
    const current = Array.isArray(form.line_items) ? form.line_items : [];
    const out = [];

    current.forEach((item) => {
      const qty = Number(item?.quantity ?? 0);
      const price = Number(item?.price ?? 0);

      if (item?.id && Number(item.id) < 1000000) {
        out.push({ id: item.id, quantity: qty, price });
      } else {
        out.push({ product_id: item.product_id, quantity: qty, price });
      }
    });

    const currentIds = new Set(current.map((it) => it?.id).filter(Boolean));
    originalItems.forEach((orig) => {
      if (orig?.id && !currentIds.has(orig.id)) {
        out.push({ id: orig.id, quantity: 0 });
      }
    });

    return out;
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const id = row?.id;
      const lineItemsPayload = buildPayload();

      await onUpdate?.(id, "line_items", lineItemsPayload, row, false);

      const couponLinesPayload = (form.coupon_lines || [])
        .filter((c) => c.code)
        .map((c) => ({ code: c.code }));

      if (couponLinesPayload != null) {
        await onUpdate?.(id, "coupon_lines", couponLinesPayload, row, false);
      }

      onClose();
    } catch (e) {
      console.error("Items save error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const trigger =
    asChild && React.isValidElement(children) ? (
      React.cloneElement(children, {
        onClick: (e) => {
          children.props?.onClick?.(e);
          onOpen();
        },
        className: cn(children.props?.className, triggerClassName),
      })
    ) : (
      <Button
        variant="flat"
        size="sm"
        onClick={onOpen}
        className={cn("border", triggerClassName)}
      >
        Edit Items
      </Button>
    );

  return (
    <>
      {trigger}
      <Modal
        size="5xl"
        scrollBehavior="inside"
        backdrop="opaque"
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        classNames={{
          closeButton: "hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 rounded-lg",
        }}
      >
        <ModalContent className="dark:bg-slate-900">
          <ModalHeader className="flex w-full gap-3 items-center justify-center">
            <IconBadge icon={Package} variant="default" size="default" />
            <h2 className="text-2xl font-semibold dark:text-slate-300">
              {__("edit Order Items", { id: row?.id })}
            </h2>
          </ModalHeader>

          <ModalBody className="pb-6 scrollbar-whiz">
            <OrderLineItems
              updateValue={updateValue}
              products={products}
              line_items={form.line_items}
              row={{ original: row }}
              coupon_lines={form.coupon_lines}
              email={row?.billing?.email}
            />
          </ModalBody>

          <ModalFooter>
            <Button variant="light" type="button" onClick={onClose}>
              {__("Cancel", "whizmanage")}
            </Button>
            <Button
              color="primary"
              type="button"
              onClick={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {__("Saving...", "whizmanage")}
                </span>
              ) : (
                <>{__("Save Changes", "whizmanage")}</>
              )}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
