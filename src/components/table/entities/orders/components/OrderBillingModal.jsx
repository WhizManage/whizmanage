import React, { useEffect, useMemo, useState, cloneElement } from "react";
import CustomTooltip from "@components/ui/nextUI/Tooltip";
import Button from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  cn,
  useDisclosure,
} from "@heroui/react";
import { toast } from "@/lib/utils";
import { ExternalLink, Eye, User, Receipt } from "lucide-react";
import { IconBadge } from "@components/ui/custom/IconBadge";
 import { __ } from "@wordpress/i18n";
import { putApi } from "../../../../../services/services";

/**
 * OrderBillingModal
 * - Always editable (no isEditing flag)
 * - Calls onUpdate(id, 'billing', patch)
 * - RTL-aware; email/phone forced LTR
 * - Export buttons toggle visibility of billing columns that already exist
 * - **Keeps the modal open** when exporting/hiding columns by restoring state after table re-render
 */
const OrderBillingModal = ({
  row,
  onUpdate, // (id, field, value, rowData, isFromHistory)
  table,
  asChild = false,
  triggerClassName,
  children,
}) => {
   
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  // Direction
const isRTL = (document.documentElement.dir || "ltr") === "rtl";

  const inputPaddingClass = isRTL ? "pl-14" : "pr-14";
  const buttonPosClass = isRTL ? "left-1" : "right-1";

  // Persisted table visibility map
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const ordersDisplay = window?.getWhizmanage?.find((c) => c.name === "orders_visible_columns")?.reservedData;
    return ordersDisplay || {};
  });

  // Reopen token so the modal won't close after table re-renders on column toggle
  const REOPEN_KEY = "__wm_modal_reopen__";
  const MODAL_TYPE = "billing";
  useEffect(() => {
    const token = window?.[REOPEN_KEY];
    if (token && token.type === MODAL_TYPE && token.id === row?.id) {
      onOpen();
      window[REOPEN_KEY] = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initialBilling = useMemo(
    () =>
      row?.billing || {
        first_name: "",
        last_name: "",
        company: "",
        address_1: "",
        address_2: "",
        city: "",
        postcode: "",
        country: "",
        email: "",
        phone: "",
      },
    [row]
  );

  const [billingData, setBillingData] = useState(initialBilling);

  useEffect(() => {
    if (row) row.billing = billingData;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billingData]);

  const handleInputChange = (field, value) => {
    const next = { ...billingData, [field]: value };
    setBillingData(next);
  };

  const handleSave = async (close) => {
    try {
      await onUpdate?.(row?.id, "billing", billingData, row, false);
    } finally {
      close?.();
    }
  };

  // --- column visibility export helpers ---
  const updateVisibleColumn = async (data) => {
    const currentVisibleColumns =
      window?.getWhizmanage?.find((c) => c.name === "orders_visible_columns")?.reservedData || {};

    const msg = { name: "orders_visible_columns", reservedData: { ...currentVisibleColumns, ...data } };
    const url = `${window.siteUrl}/wp-json/whizmanage/v1/columns/${msg.name}`;

    try {
      const idx = window?.getWhizmanage?.findIndex((c) => c.name === "orders_visible_columns");
      if (typeof idx === "number" && idx !== -1) {
        window.getWhizmanage[idx].reservedData = { ...currentVisibleColumns, ...data };
      }
      if (table?.setColumnVisibility) {
        table.setColumnVisibility((old) => ({ ...old, ...data }));
      }
      await putApi(url, msg);

      toast.success(
        Object.values(data).some((val) => val === true)
          ? __("Column has been exported successfully", "whizmanage")
          : __("Column has been unexported successfully", "whizmanage")
      );
    } catch (error) {
      console.error("Error saving column visibility:", error);
      setVisibleColumns((prev) => {
        const reverted = { ...prev };
        Object.keys(data).forEach((key) => {
          reverted[key] = !data[key];
        });
        return reverted;
      });
    }
  };

  const isFieldExported = (key) => visibleColumns?.[key] === true;
  const handleToggleField = async (key, also = []) => {
    const allExported = [key, ...also].every((k) => isFieldExported(k));
    const willExport = !allExported;
    const payload = Object.fromEntries([key, ...also].map((k) => [k, willExport]));
    setVisibleColumns((prev) => ({ ...prev, ...payload }));

    // mark to reopen after table rerender
    if (isOpen) {
      window[REOPEN_KEY] = { type: MODAL_TYPE, id: row?.id };
    }

    await updateVisibleColumn(payload);
  };

  const ExportButton = ({ fieldKey, also = [], label }) => {
    const allExported = [fieldKey, ...also].every((k) => isFieldExported(k));
    const tooltipTitle = __(allExported ? "tooltip.hideColumn" : "tooltip.showColumn", { label: __(label, "whizmanage") });
    const tooltipDescription = allExported
      ? __(
      "Remove this field from the table and keep it only in the billing details",
      "whizmanage"
    )
      : __("Display this field as a separate column in the table", "whizmanage");

    return (
      <CustomTooltip title={tooltipTitle} description={tooltipDescription}>
        <Button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleToggleField(fieldKey, also);
          }}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 h-8 w-8 p-0 transition-all duration-200",
            buttonPosClass,
            allExported
              ? "text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
              : "text-slate-600 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-300"
          )}
          variant="outline"
          size="icon"
        >
          {allExported ? <Eye className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
        </Button>
      </CustomTooltip>
    );
  };

  const triggerNode = useMemo(() => {
    const fallback = (
      <div
        className={cn(
          "w-full h-full px-3 py-2 flex items-center gap-2  cursor-pointer",
          triggerClassName
        )}
        onClick={onOpen}
      >
        <User className="size-4 shrink-0" />
        <span className="truncate">{__("Billing", "whizmanage")}</span>
      </div>
    );

    if (!asChild || !children) return fallback;
    return cloneElement(children, {
      onClick: (e) => {
        children.props?.onClick?.(e);
        onOpen();
      },
      className: cn(children.props?.className, triggerClassName),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children, asChild, triggerClassName, onOpen, __]);

  const fullName = `${billingData.first_name || ""} ${billingData.last_name || ""}`.trim();

  return (
    <>
      {triggerNode}
      <Modal
        size="3xl"
        scrollBehavior="inside"
        backdrop="opaque"
        className="!overflow-hidden"
        classNames={{ backdrop: "bg-gradient-to-t from-zinc-800 to-zinc-800/30 backdrop-opacity-20 !overflow-hidden", header: "border-b", footer: "border-t", body: "py-6", closeButton: "hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 rounded-lg" }}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        isDismissable
        motionProps={{
          variants: {
            enter: { y: 0, opacity: 1, transition: { duration: 0.3, ease: "easeOut" } },
            exit: { y: -20, opacity: 0, transition: { duration: 0.2, ease: "easeIn" } },
          },
        }}
      >
        <ModalContent className="dark:bg-[#0f0e1c] !scrollbar-hide" dir={isRTL}>
          {(onClose) => (
            <>
              <ModalHeader className="flex gap-3 text-center justify-center items-center">
                <IconBadge icon={Receipt} variant="default" size="default" />
                <h2 className="text-xl font-semibold dark:text-gray-400">
                  {__("Billing Information", "whizmanage")} {fullName ? `– ${fullName}` : ""}
                </h2>
              </ModalHeader>

              <ModalBody className="!scrollbar-hide">
                <div className="flex flex-col gap-4 p-4 text-muted-foreground">
                  {/* Name Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="billing-first-name">{__("First Name", "whizmanage")}</Label>
                      <div className="relative w/full">
                        <Input
                          id="billing-first-name"
                          type="text"
                          value={billingData.first_name}
                          onChange={(e) => handleInputChange("first_name", e.target.value)}
                          className={cn("h-10 dark:bg-slate-700 dark:!border-none dark:!ring-0 dark:!text-slate-300", inputPaddingClass)}
                        />
                        <ExportButton fieldKey="billing_name" also={["billing_name"]} label="Name" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="billing-last-name">{__("Last Name", "whizmanage")}</Label>
                      <div className="relative w/full">
                        <Input
                          id="billing-last-name"
                          type="text"
                          value={billingData.last_name}
                          onChange={(e) => handleInputChange("last_name", e.target.value)}
                          className={cn("h-10 dark:bg-slate-700 dark:!border-none dark:!ring-0 dark:!text-slate-300", inputPaddingClass)}
                        />
                        <ExportButton fieldKey="billing_name" also={["billing_name"]} label="Name" />
                      </div>
                    </div>
                  </div>

                  {/* Company */}
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="billing-company">{__("Company", "whizmanage")}</Label>
                    <div className="relative w/full">
                      <Input
                        id="billing-company"
                        type="text"
                        value={billingData.company}
                        onChange={(e) => handleInputChange("company", e.target.value)}
                        className={cn("h-10 dark:bg-slate-700 dark:!border-none dark:!ring-0 dark:!text-slate-300", inputPaddingClass)}
                      />
                      <ExportButton fieldKey="billing_company" label="Company" />
                    </div>
                  </div>

                  {/* Address Fields */}
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="billing-address-1">{__("Address Line 1", "whizmanage")}</Label>
                    <div className="relative w/full">
                      <Input
                        id="billing-address-1"
                        type="text"
                        value={billingData.address_1}
                        onChange={(e) => handleInputChange("address_1", e.target.value)}
                        className={cn("h-10 dark:bg-slate-700 dark:!border-none dark:!ring-0 dark:!text-slate-300", inputPaddingClass)}
                      />
                      <ExportButton fieldKey="billing_address_1" label="Address 1" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="billing-address-2">{__("Address Line 2", "whizmanage")}</Label>
                    <div className="relative w/full">
                      <Input
                        id="billing-address-2"
                        type="text"
                        value={billingData.address_2}
                        onChange={(e) => handleInputChange("address_2", e.target.value)}
                        className={cn("h-10 dark:bg-slate-700 dark:!border-none dark:!ring-0 dark:!text-slate-300", inputPaddingClass)}
                      />
                      <ExportButton fieldKey="billing_address_2" label="Address 2" />
                    </div>
                  </div>

                  {/* City + Postcode + Country */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="billing-city">{__("City", "whizmanage")}</Label>
                      <div className="relative w/full">
                        <Input
                          id="billing-city"
                          type="text"
                          value={billingData.city}
                          onChange={(e) => handleInputChange("city", e.target.value)}
                          className={cn("h-10 dark:bg-slate-700 dark:!border-none dark:!ring-0 dark:!text-slate-300", inputPaddingClass)}
                        />
                        <ExportButton fieldKey="billing_city" label="City" />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="billing-postcode">{__("Postcode", "whizmanage")}</Label>
                      <div className="relative w/full">
                        <Input
                          id="billing-postcode"
                          type="text"
                          value={billingData.postcode}
                          onChange={(e) => handleInputChange("postcode", e.target.value)}
                          className={cn("h-10 dark:bg-slate-700 dark:!border-none dark:!ring-0 dark:!text-slate-300", inputPaddingClass)}
                        />
                        <ExportButton fieldKey="billing_postcode" label="Postcode" />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="billing-country">{__("Country", "whizmanage")}</Label>
                      <div className="relative w/full">
                        <Input
                          id="billing-country"
                          type="text"
                          value={billingData.country}
                          onChange={(e) => handleInputChange("country", e.target.value)}
                          className={cn("h-10 dark:bg-slate-700 dark:!border-none dark:!ring-0 dark:!text-slate-300", inputPaddingClass)}
                        />
                        <ExportButton fieldKey="billing_country" label="Country" />
                      </div>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="billing-email">{__("Email", "whizmanage")}</Label>
                    <div className="relative w/full">
                      <Input
                        id="billing-email"
                        type="email"
                        dir="ltr"
                        value={billingData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        className={cn("h-10 dark:bg-slate-700 dark:!border-none dark:!ring-0 dark:!text-slate-300 text-left", inputPaddingClass)}
                      />
                      <ExportButton fieldKey="billing_email" label="Email" />
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="billing-phone">{__("Phone", "whizmanage")}</Label>
                    <div className="relative w/full">
                      <Input
                        id="billing-phone"
                        type="tel"
                        dir="ltr"
                        value={billingData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                        className={cn("h-10 dark:bg-slate-700 dark:!border-none dark:!ring-0 dark:!text-slate-300", inputPaddingClass)}
                      />
                      <ExportButton fieldKey="billing_phone" label="Phone" />
                    </div>
                  </div>
                </div>
              </ModalBody>

              <ModalFooter>
                <Button className="gap-2" onClick={() => handleSave(onClose)}>
                  {__("Save", "whizmanage")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

export default OrderBillingModal;