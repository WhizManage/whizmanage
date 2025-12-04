import CustomTooltip from "@components/nextUI/Tooltip";
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
import { CheckIcon, Edit, ExternalLink, Eye } from "lucide-react";
import { useEffect, useState } from "react";
import { __ } from '@wordpress/i18n';
import { toast } from "sonner";
import { putApi } from "../../../../../services/services";

/**
 * BillingEdit (simple RTL)
 * - RTL/LTR based only on i18n.language (he => RTL, else LTR)
 * - Inputs get logical padding to avoid overlap with the floating button
 */
const BillingEdit = ({ row, table, isEditing = false }) => {
  
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  // Simple direction: if language starts with "he" → RTL, else LTR
  const isRTL = (i18n?.language || "").startsWith("he");
  const dir = isRTL ? "rtl" : "ltr";
  const inputPaddingClass = isRTL ? "pl-14" : "pr-14";
  const buttonPosClass = isRTL ? "left-1" : "right-1";

  const [visibleColumns, setVisibleColumns] = useState(() => {
    const ordersDisplay = window?.getWhizmanage?.find(
      (column) => column.name === "orders_visible_columns"
    )?.reservedData;
    return ordersDisplay || {};
  });

  const [billingData, setBillingData] = useState(() => {
    return (
      row?.original?.billing || {
        first_name: "",
        last_name: "",
        company: "",
        address_1: "",
        address_2: "",
        city: "",
        state: "",
        postcode: "",
        country: "",
        email: "",
        phone: "",
      }
    );
  });

  const updateVisibleColumn = async (data) => {
    const currentVisibleColumns =
      window?.getWhizmanage?.find((column) => column.name === "orders_visible_columns")
        ?.reservedData || {};

    const msg = {
      name: "orders_visible_columns",
      reservedData: { ...currentVisibleColumns, ...data },
    };

    const url = `${window.siteUrl}/wp-json/whizmanage/v1/columns/${msg.name}`;

    try {
      const ordersDisplayIndex = window?.getWhizmanage?.findIndex(
        (column) => column.name === "orders_visible_columns"
      );
      if (typeof ordersDisplayIndex === "number" && ordersDisplayIndex !== -1) {
        window.getWhizmanage[ordersDisplayIndex].reservedData = {
          ...currentVisibleColumns,
          ...data,
        };
      }

      if (typeof table !== "undefined" && table?.setColumnVisibility) {
        table.setColumnVisibility((old) => ({ ...old, ...data }));
      }

      await putApi(url, msg);

      toast(
        <div className="p-4 w-full h-full !border-l-4 !border-l-fuchsia-600 dark:bg-slate-800 dark:!text-slate-300 rounded-md flex gap-4 items-center justify-start">
          <CheckIcon className="w-5 h-5 text-fuchsia-600" />
          {Object.values(data).some((val) => val === true)
            ? __("Column has been exported successfully", "whizmanage")
            : __("Column has been unexported successfully", "whizmanage")}
        </div>,
        { duration: 5000 }
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

  useEffect(() => {
    if (row && row.original) {
      row.original.billing = billingData;
    }
  }, [billingData, row]);

  const handleInputChange = (field, value) => {
    const newBillingData = { ...billingData, [field]: value };
    setBillingData(newBillingData);
    if (row) row.original.billing = newBillingData;
  };

  const isFieldExported = (fieldKey) => visibleColumns[fieldKey] === true;

  const handleToggleField = async (fieldKey, additionalFields = []) => {
    const isCurrentlyExported = isFieldExported(fieldKey);
    const allCurrentlyExported =
      additionalFields.length === 0
        ? isCurrentlyExported
        : additionalFields.every((f) => isFieldExported(f)) && isCurrentlyExported;

    const willExport = !allCurrentlyExported;
    const fieldsToUpdate = { [fieldKey]: willExport };
    additionalFields.forEach((f) => (fieldsToUpdate[f] = willExport));

    setVisibleColumns((prev) => ({ ...prev, ...fieldsToUpdate }));
    await updateVisibleColumn(fieldsToUpdate);
  };

  const ExportButton = ({ fieldKey, additionalFields = [], label }) => {
    const isExported = isFieldExported(fieldKey);
    const allExported =
      additionalFields.length === 0
        ? isExported
        : additionalFields.every((f) => isFieldExported(f)) && isExported;

    const tooltipTitle = __(
      allExported ? "tooltip.hideColumn" : "tooltip.showColumn",
      { label: __(label, "whizmanage") }
    );

    const tooltipDescription = allExported
      ? __(
      "Remove this field from the table and keep it only in the billing details",
      "whizmanage"
    )
      : __("Display this field as a separate column in the table", "whizmanage");

    return (
      <CustomTooltip title={tooltipTitle} description={tooltipDescription}>
        <Button
          onMouseDown={(e) => {
            e.preventDefault();
            handleToggleField(fieldKey, additionalFields);
          }}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 h-8 w-8 p-0 transition-all duration-200",
            buttonPosClass,
            allExported
              ? "text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
              : "text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          )}
          variant="outline"
          size="icon"
        >
          {allExported ? <Eye className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
        </Button>
      </CustomTooltip>
    );
  };

  return (
    <>
      <CustomTooltip title={isEditing ? __("Edit Billing Information", "whizmanage") : __("View Billing Information", "whizmanage")}>
        <Button
          className={cn("flex gap-2 capitalize", "h-9 dark:bg-slate-700")}
          variant="outline"
          size="icon"
          onClick={onOpen}
        >
          <Edit className="size-4" />
        </Button>
      </CustomTooltip>
      <Modal
        size="3xl"
        scrollBehavior="inside"
        backdrop="opaque"
        className=" !overflow-hidden"
        classNames={{
          backdrop: "bg-gradient-to-t from-zinc-800 to-zinc-800/30 backdrop-opacity-20 !overflow-hidden",
          header: "border-b",
          footer: "border-t",
          body: "py-6",
        }}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        isDismissable={true}
        motionProps={{
          variants: {
            enter: { y: 0, opacity: 1, transition: { duration: 0.3, ease: "easeOut" } },
            exit: { y: -20, opacity: 0, transition: { duration: 0.2, ease: "easeIn" } },
          },
        }}
      >
        <ModalContent className="dark:bg-[#0f0e1c] !scrollbar-hide" dir={dir}>
          {(onClose) => (
            <>
              <ModalHeader className="flex gap-2 text-center text-2xl justify-center items-center">
                <h2 className="text-center dark:text-gray-400">
                  {isEditing ? __("Edit Billing Information", "whizmanage") : __("Billing Information", "whizmanage")}
                </h2>
              </ModalHeader>
              <ModalBody className="!scrollbar-hide">
                <div className="flex flex-col gap-4 p-4 text-muted-foreground">
                  {/* Name Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="billing-first-name">{__("First Name", "whizmanage")}</Label>
                      <div className="relative w-full">
                        <Input
                          id="billing-first-name"
                          type="text"
                          value={billingData.first_name}
                          onChange={(e) => handleInputChange("first_name", e.target.value)}
                          className={cn(
                            "h-10 dark:bg-slate-700 dark:!border-none dark:!ring-0 dark:!text-slate-300",
                            inputPaddingClass
                          )}
                          disabled={!isEditing}
                        />
                        <ExportButton fieldKey="billing_name" additionalFields={["billing_name"]} label="Name" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="billing-last-name">{__("Last Name", "whizmanage")}</Label>
                      <div className="relative w-full">
                        <Input
                          id="billing-last-name"
                          type="text"
                          value={billingData.last_name}
                          onChange={(e) => handleInputChange("last_name", e.target.value)}
                          className={cn(
                            "h-10 dark:bg-slate-700 dark:!border-none dark:!ring-0 dark:!text-slate-300",
                            inputPaddingClass
                          )}
                          disabled={!isEditing}
                        />
                        <ExportButton fieldKey="billing_name" additionalFields={["billing_name"]} label="Name" />
                      </div>
                    </div>
                  </div>

                  {/* Company */}
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="billing-company">{__("Company", "whizmanage")}</Label>
                    <div className="relative w-full">
                      <Input
                        id="billing-company"
                        type="text"
                        value={billingData.company}
                        onChange={(e) => handleInputChange("company", e.target.value)}
                        className={cn(
                          "h-10 dark:bg-slate-700 dark:!border-none dark:!ring-0 dark:!text-slate-300",
                          inputPaddingClass
                        )}
                        disabled={!isEditing}
                      />
                      <ExportButton fieldKey="billing_company" label="Company" />
                    </div>
                  </div>

                  {/* Address Fields */}
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="billing-address-1">{__("Address Line 1", "whizmanage")}</Label>
                    <div className="relative w-full">
                      <Input
                        id="billing-address-1"
                        type="text"
                        value={billingData.address_1}
                        onChange={(e) => handleInputChange("address_1", e.target.value)}
                        className={cn(
                          "h-10 dark:bg-slate-700 dark:!border-none dark:!ring-0 dark:!text-slate-300",
                          inputPaddingClass
                        )}
                        disabled={!isEditing}
                      />
                      <ExportButton fieldKey="billing_address_1" label="Address 1" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="billing-address-2">{__("Address Line 2", "whizmanage")}</Label>
                    <div className="relative w-full">
                      <Input
                        id="billing-address-2"
                        type="text"
                        value={billingData.address_2}
                        onChange={(e) => handleInputChange("address_2", e.target.value)}
                        className={cn(
                          "h-10 dark:bg-slate-700 dark:!border-none dark:!ring-0 dark:!text-slate-300",
                          inputPaddingClass
                        )}
                        disabled={!isEditing}
                      />
                      <ExportButton fieldKey="billing_address_2" label="Address 2" />
                    </div>
                  </div>

                  {/* City, State and Postcode */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="billing-city">{__("City", "whizmanage")}</Label>
                      <div className="relative w-full">
                        <Input
                          id="billing-city"
                          type="text"
                          value={billingData.city}
                          onChange={(e) => handleInputChange("city", e.target.value)}
                          className={cn(
                            "h-10 dark:bg-slate-700 dark:!border-none dark:!ring-0 dark:!text-slate-300",
                            inputPaddingClass
                          )}
                          disabled={!isEditing}
                        />
                        <ExportButton fieldKey="billing_city" label="City" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="billing-state">{__("State", "whizmanage")}</Label>
                      <div className="relative w-full">
                        <Input
                          id="billing-state"
                          type="text"
                          value={billingData.state}
                          onChange={(e) => handleInputChange("state", e.target.value)}
                          className={cn(
                            "h-10 dark:bg-slate-700 dark:!border-none dark:!ring-0 dark:!text-slate-300",
                            inputPaddingClass
                          )}
                          disabled={!isEditing}
                        />
                        <ExportButton fieldKey="billing_state" label="State" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="billing-postcode">{__("Postcode", "whizmanage")}</Label>
                      <div className="relative w-full">
                        <Input
                          id="billing-postcode"
                          type="text"
                          value={billingData.postcode}
                          onChange={(e) => handleInputChange("postcode", e.target.value)}
                          className={cn(
                            "h-10 dark:bg-slate-700 dark:!border-none dark:!ring-0 dark:!text-slate-300",
                            inputPaddingClass
                          )}
                          disabled={!isEditing}
                        />
                        <ExportButton fieldKey="billing_postcode" label="Postcode" />
                      </div>
                    </div>
                  </div>

                  {/* Country */}
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="billing-country">{__("Country", "whizmanage")}</Label>
                    <div className="relative w-full">
                      <Input
                        id="billing-country"
                        type="text"
                        value={billingData.country}
                        onChange={(e) => handleInputChange("country", e.target.value)}
                        className={cn(
                          "h-10 dark:bg-slate-700 dark:!border-none dark:!ring-0 dark:!text-slate-300",
                          inputPaddingClass
                        )}
                        disabled={!isEditing}
                      />
                      <ExportButton fieldKey="billing_country" label="Country" />
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="billing-email">{__("Email", "whizmanage")}</Label>
                    <div className="relative w-full">
                      <Input
                        id="billing-email"
                        type="email"
                        dir="ltr"
                        value={billingData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        className={cn(
                          "h-10 dark:bg-slate-700 dark:!border-none dark:!ring-0 dark:!text-slate-300 text-left",
                          inputPaddingClass
                        )}
                        disabled={!isEditing}
                      />
                      <ExportButton fieldKey="billing_email" label="Email" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="billing-phone">{__("Phone", "whizmanage")}</Label>
                    <div className="relative w-full">
                      <input
                        id="billing-phone"
                        type="tel"
                        value={billingData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                        className={cn(
                          "h-10 dark:bg-slate-700 dark:!border-none dark:!ring-0 dark:!text-slate-300",
                          inputPaddingClass
                        )}
                        disabled={!isEditing}
                      />
                      <ExportButton fieldKey="billing_phone" label="Phone" />
                    </div>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button className="gap-2" onClick={onClose}>
                  {isEditing ? __("Save", "whizmanage") : __("Close", "whizmanage")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

export default BillingEdit;
