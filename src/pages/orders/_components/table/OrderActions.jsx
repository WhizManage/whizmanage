import React, { useEffect, useMemo, useState } from "react";
import {
  useDisclosure,
  Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Select, SelectItem, Spinner
} from "@heroui/react";
import { Plus } from "lucide-react";
import { getApi, postApi } from "../../../../services/services";
import { __ } from '@wordpress/i18n';

export default function OrderActions({ orderId }) {
   
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const [action, setAction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [overrideEmail, setOverrideEmail] = useState("");

  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const actions = useMemo(
    () => [
      { key: "send_order_details", label: "Send order details to customer" },
      { key: "resend_new_order", label: "Resend email / choose template" },
      { key: "regenerate_downloads", label: "Regenerate download permissions" },
    ],
    []
  );

  // Load templates available for this order from the server
  useEffect(() => {
    const loadTemplates = async () => {
      if (action !== "resend_new_order") return;
      
      setTemplatesLoading(true);
      setSelectedTemplateId(null);
      
      try {
        const res = await getApi(
          `${window.siteUrl}/wp-json/wm/v1/orders/${orderId}/available-emails`
        );
        console.log(res.data);
        const items = res?.data?.templates ?? [];
        setTemplates(items);
        // Auto-select first template if exists
        setSelectedTemplateId(items.length ? items[0].id : null);
      } catch (e) {
        console.error(e);
        setTemplates([]);
        setSelectedTemplateId(null);
      } finally {
        setTemplatesLoading(false);
      }
    };

    loadTemplates();
  }, [action, orderId]);

  async function doAction() {
    if (!action) return;
    setIsLoading(true);

    try {
      if (action === "send_order_details") {
        const payload = overrideEmail
          ? { email: overrideEmail, force_email_update: true }
          : {};
        const res = await postApi(
          `${window.siteUrl}/wp-json/wm/v1/orders/${orderId}/send-order-details`,
          payload
        );
        console.log(res.data);
      }

      if (action === "resend_new_order") {
        if (!selectedTemplateId) throw new Error("Please choose a template.");
        const payload = { email_id: selectedTemplateId };
        if (overrideEmail) payload.override_email = overrideEmail;

        const res = await postApi(
          `${window.siteUrl}/wp-json/wm/v1/orders/${orderId}/send-email`,
          payload
        );
      }

      if (action === "regenerate_downloads") {
        await postApi(
          `${window.siteUrl}/wp-json/wm/v1/orders/${orderId}/regenerate-downloads`,
          {}
        );
      }

      alert("Success!");
      onOpenChange(false);
      setAction(null);
      setOverrideEmail("");
      setSelectedTemplateId(null);
      setTemplates([]);
    } catch (e) {
      console.error(e);
      alert("An error occurred. See console for details.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Button
        className="flex group relative overflow-hidden gap-2"
        onPress={onOpen}
        variant="gradient"
      >
        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
        <Plus className="h-4 w-4" />
        {__("Choose action...", "whizmanage")}
      </Button>
      <Modal
        size="lg"
        scrollBehavior="inside"
        backdrop="opaque"
        className="!overflow-hidden"
        classNames={{ 
          backdrop: "bg-gradient-to-t from-zinc-800 to-zinc-800/30 backdrop-opacity-20 !overflow-hidden" 
        }}
        isDismissable={!isLoading}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        motionProps={{
          variants: {
            enter: { y: 0, opacity: 1, transition: { duration: 0.3, ease: "easeOut" } },
            exit: { y: -20, opacity: 0, transition: { duration: 0.2, ease: "easeIn" } },
          },
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                <h3 className="text-xl font-semibold dark:text-gray-300">
                  {__("Order Actions", "whizmanage")}
                </h3>
              </ModalHeader>

              <ModalBody>
                <div className="grid gap-4">
                  <Select
                    aria-label={__("Choose action", "whizmanage")}
                    label={__("Choose action", "whizmanage")}
                    selectedKeys={action ? new Set([action]) : new Set()}
                    onSelectionChange={(keys) => {
                      const [first] = Array.from(keys);
                      setAction(first ?? null);
                    }}
                  >
                    {actions.map((a) => (
                      <SelectItem key={a.key}>{__(a.label, "whizmanage")}</SelectItem>
                    ))}
                  </Select>

                  {(action === "send_order_details" || action === "resend_new_order") && (
                    <input
                      className="w-full border rounded-md p-2 dark:bg-slate-900"
                      placeholder={__("(Optional) customer email to send/update", "whizmanage")}
                      value={overrideEmail}
                      onChange={(e) => setOverrideEmail(e.target.value)}
                    />
                  )}

                  {action === "resend_new_order" && (
                    <div className="grid gap-2">
                      <label className="text-sm text-gray-500 dark:text-gray-400">
                        {__("Choose email template", "whizmanage")}
                      </label>
                      <Select
                        aria-label={__("Choose template", "whizmanage")}
                        selectedKeys={
                          selectedTemplateId ? new Set([selectedTemplateId]) : new Set()
                        }
                        onSelectionChange={(keys) => {
                          const [first] = Array.from(keys);
                          setSelectedTemplateId(first ?? null);
                        }}
                        isDisabled={templatesLoading}
                        placeholder={
                          templatesLoading ? __("Loading templates...", "whizmanage") : __("Choose template", "whizmanage")
                        }
                        startContent={templatesLoading ? <Spinner size="sm" /> : null}
                        emptyContent={
                          !templatesLoading ? __("No templates available for this order", "whizmanage") : null
                        }
                      >
                        {(templatesLoading ? [] : templates).map((tpl) => (
                          <SelectItem key={tpl.id}>{__(tpl.label, "whizmanage")}</SelectItem>
                        ))}
                      </Select>
                    </div>
                  )}
                </div>
              </ModalBody>

              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  {__("Close", "whizmanage")}
                </Button>
                <Button
                  color="primary"
                  isLoading={isLoading}
                  onPress={doAction}
                  isDisabled={
                    !action ||
                    (action === "resend_new_order" &&
                      (!selectedTemplateId || templatesLoading))
                  }
                >
                  {__("Perform", "whizmanage")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
