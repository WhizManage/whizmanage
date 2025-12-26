// src/components/forms/GenericItemModal.jsx

import { postApi } from "@/services/services";
import { Alert, AlertDescription } from "@components/ui/alert";
import { Button } from "@components/ui/button";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ScrollShadow,
  useDisclosure,
  Tooltip,
} from "@heroui/react";
import {
  Plus,
  RefreshCcw,
  RotateCcw,
  FilePlus,
  FileEdit,
} from "lucide-react";
import { IconBadge } from "@components/ui/custom/IconBadge";
import { useState } from "react";
 import { __ } from "@wordpress/i18n";
import { MdError } from "react-icons/md";
import { toast } from "@/lib/utils";
import FormProvider from "./core/FormProvider";
import GenericForm from "./core/GenericForm";
import { buildPayloadForEntity } from "./registry";

const GenericItemModal = ({
  onItemCreated,
  onItemUpdated,
  entityName,
  config,
  isTableImport = false,
  customTrigger = null,
  isOpen: externalIsOpen = null,
  onClose: externalOnClose = null,
}) => {
  if (isTableImport) {
    return null;
  }

  const { isOpen: internalIsOpen, onOpen, onOpenChange } = useDisclosure();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentProductId, setCurrentProductId] = useState(null);
  const [formKey, setFormKey] = useState(0); // מפתח לאיפוס מלא של הטופס
   

  const isOpen = externalIsOpen !== null ? externalIsOpen : internalIsOpen;
  const uiSingular = config?.labels?.singular ?? entityName?.replace(/s$/, "");

  const handleClose = () => {
    setIsEditMode(false);
    setCurrentProductId(null);
    setErrorMessage("");

    if (externalOnClose) {
      externalOnClose();
    } else {
      onOpenChange(false);
    }
  };

  const onSubmit = async (formData) => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      let response;
      let itemData;
      
      // ✅ הוסף beforeSubmit לפני השליחה
      let processedData = formData;
      try {
        processedData = await buildPayloadForEntity(entityName, formData);
      } catch (err) {
        console.error("❌ buildPayloadForEntity failed:", err);
        console.warn("No beforeSubmit handler for entity:", entityName);
        processedData = formData;
      }

      if (formData.id && !String(formData.id).startsWith("temp_")) {
        // מצב עריכה
        const endpoint =
          config?.endpoint ||
          `${window.siteUrl}/wp-json/wc/v3/${entityName}/${formData.id}`;

 

        response = await postApi(endpoint, processedData);
        itemData = response.data ?? response;

        toast.success(__("Item updated successfully", "whizmanage"));

        if (onItemUpdated) {
          onItemUpdated(itemData);
        } else if (onItemCreated) {
          onItemCreated(itemData);
        }
      } else {
        // מצב יצירה
        const endpoint =
          config?.endpoint || `${window.siteUrl}/wp-json/wc/v3/${entityName}`;



        response = await postApi(endpoint, processedData);
        itemData = response.data ?? response;

        try {
          await postApi(`${window.siteUrl}/wp-json/whizmanage/v1/history`, {
            location: entityName,
            items: [itemData],
            action: "add",
          });
        } catch (_) {}

        toast.success(__("Item created successfully", "whizmanage"));

        if (onItemCreated) {
          onItemCreated(itemData);
        }
      }

      setIsLoading(false);
      handleClose();
    } catch (error) {
      setIsLoading(false);
      const errorMsg =
        error?.response?.data?.message ||
        error.message ||
        "Unknown error occurred";
      setErrorMessage(errorMsg);

      toast.error(errorMsg);

      console.error("Failed to create/update item:", error);
    }
  };

  const handleReset = () => {
    setErrorMessage("");
    setIsEditMode(false);
    setCurrentProductId(null);
    // שינוי ה-key יגרום לרינדור מחדש של כל הטופס עם ערכים התחלתיים
    setFormKey((prev) => prev + 1);
  };

  const handleSave = () => {
    window.dispatchEvent(new CustomEvent("generic-form-submit"));
  };

  const handleProductSaved = (product) => {
    setIsEditMode(true);
    setCurrentProductId(product.id);

    if (onItemCreated) {
      onItemCreated(product);
    }
  };

  return (
    <>
      {externalIsOpen === null &&
        (customTrigger ? (
          customTrigger(onOpen)
        ) : (
          <Button
            className="flex group relative overflow-hidden gap-2"
            onClick={onOpen}
            variant="gradient"
          >
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
            <Plus className="h-4 w-4" />
            {__(config?.triggerLabel || `Add ${uiSingular}`, "whizmanage")}
          </Button>
        ))}
      <Modal
        size="5xl"
        scrollBehavior="inside"
        backdrop="opaque"
        className="overflow-hidden"
        classNames={{
          backdrop:
            "bg-gradient-to-t from-zinc-800 to-zinc-800/30 backdrop-opacity-20 !overflow-hidden",
          closeButton:
            "hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 rounded-lg",
        }}
        isOpen={isOpen}
        isDismissable={false}
        onOpenChange={handleClose}
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
          {(onClose) => (
            <>
              <div id="radix-select-portal" />

              <ModalHeader className="flex gap-3 text-center justify-center items-center">
                <IconBadge icon={isEditMode ? FileEdit : FilePlus} variant="default" size="default" />
                <h2 className="text-2xl font-semibold dark:text-slate-300">
                  {isEditMode
                    ? __(`Edit ${uiSingular}`, "whizmanage")
                    : __(config?.title || `Create a new ${uiSingular}`, "whizmanage")}
                </h2>
              </ModalHeader>

              <ModalBody className="!px-3">
                <ScrollShadow
                  size={10}
                  className="w-full h-full scrollbar-whiz px-1"
                >
                  <FormProvider
                    key={formKey}
                    initialRow={config?.defaults || {}}
                    onSubmit={onSubmit}
                    onError={(errors) => {
                      console.warn("Form validation errors:", errors);
                      setErrorMessage(__("Please fix the errors in the form", "whizmanage"));
                    }}
                    onProductSaved={handleProductSaved}
                  >
                    <GenericForm groups={config?.groups || []} />
                  </FormProvider>
                </ScrollShadow>
              </ModalBody>

              <ModalFooter className="flex justify-between">
                <div>
                  <Tooltip content={__("Reset form", "whizmanage")}>
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      className="h-10 text-muted-foreground"
                      size="icon"
                    >
                      <RotateCcw />
                    </Button>
                  </Tooltip>
                </div>

                <div>
                  {errorMessage !== "" && (
                    <Alert
                      variant="primary"
                      className="flex items-center max-w-fit !h-10"
                    >
                      <AlertDescription className="flex gap-4 justify-center items-center">
                        <MdError className="h-4 w-4" />
                        <p className="dark:!text-white">{errorMessage}</p>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <div className="flex gap-4">
                  <Button
                    disabled={isLoading}
                    color="primary"
                    onClick={handleSave}
                    className="flex gap-2"
                  >
                    {isEditMode ? __("Update", "whizmanage") : __("Save", "whizmanage")}
                    {isLoading && (
                      <RefreshCcw className="text-white w-5 h-5 animate-spin" />
                    )}
                  </Button>
                </div>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

export default GenericItemModal;