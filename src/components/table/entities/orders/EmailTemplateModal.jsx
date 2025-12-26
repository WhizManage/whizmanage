// src/components/table/entities/orders/EmailTemplateModal.jsx

import { Button } from "@components/ui/button";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
} from "@heroui/react";
import { toast } from "@/lib/utils";
import { Mail, RefreshCcw } from "lucide-react";
import { IconBadge } from "@components/ui/custom/IconBadge";
import { useEffect, useState } from "react";
 import { __ } from "@wordpress/i18n";
import { createOrderActions } from "./orders.actions.js";
import { Input } from "@components/ui/input";

export function EmailTemplateModal({ isOpen, onClose, orderId }) {
   
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [overrideEmail, setOverrideEmail] = useState("");

  const actions = createOrderActions(__);

  useEffect(() => {
    if (!isOpen || !orderId) return;

    const load = async () => {
      setLoading(true);
      setSelectedTemplateId(null);
      setTemplates([]);

      const items = await actions.fetchAvailableTemplates(orderId);
      setTemplates(items);
      if (items.length) setSelectedTemplateId(items[0].id);
      setLoading(false);
    };

    load();
  }, [isOpen, orderId]);

  const handleSend = async () => {
    if (!selectedTemplateId) return;
    setSending(true);

    try {
      await actions.sendEmailWithTemplate(
        [{ id: orderId }],
        selectedTemplateId,
        overrideEmail || null
      );

      toast.success(__("Email sent successfully", "whizmanage"));

      onClose();
      setOverrideEmail("");
      setSelectedTemplateId(null);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || __("Failed to send email", "whizmanage"));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      size="lg"
      scrollBehavior="inside"
      backdrop="opaque"
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      isDismissable={!sending}
      classNames={{
        backdrop:
          "bg-gradient-to-t from-zinc-800 to-zinc-800/30 backdrop-opacity-20",
        header: "border-b",
        footer: "border-t",
        body: "py-6",
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
      <ModalContent className="dark:bg-[#0f0e1c]">
        {(onModalClose) => (
          <>
            <ModalHeader className="flex gap-3 text-center justify-center items-center">
              <IconBadge icon={Mail} variant="default" size="default" />
              <h2 className="text-xl font-semibold dark:text-slate-300">
                {__("Send Email", "whizmanage")}
                {orderId && (
                  <span className="text-fuchsia-600 ml-2">#{orderId}</span>
                )}
              </h2>
            </ModalHeader>

            <ModalBody>
              <div className="flex flex-col gap-6">
                {/* בחירת תבנית */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {__("Email template", "whizmanage")}
                  </label>
                  <Select
                    aria-label={__("Choose template", "whizmanage")}
                    selectedKeys={
                      selectedTemplateId
                        ? new Set([selectedTemplateId])
                        : new Set()
                    }
                    onSelectionChange={(keys) => {
                      const [first] = Array.from(keys);
                      setSelectedTemplateId(first ?? null);
                    }}
                    isDisabled={loading || sending}
                    placeholder={
                      loading ? __("Loading templates...", "whizmanage") : __("Choose template", "whizmanage")
                    }
                    isLoading={loading}
                    classNames={{
                      trigger:
                        "dark:bg-slate-800 dark:border-slate-600 dark:hover:bg-slate-700",
                      listbox: "dark:bg-slate-800",
                      popoverContent: "dark:bg-slate-800",
                    }}
                  >
                    {templates.map((tpl) => (
                      <SelectItem key={tpl.id}>{__(tpl.label, "whizmanage")}</SelectItem>
                    ))}
                  </Select>

                  {!loading && templates.length === 0 && (
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      {__("No email templates available for this order", "whizmanage")}
                    </p>
                  )}
                </div>

                {/* אימייל חלופי */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {__("Override email", "whizmanage")}
                    <span className="text-slate-400 font-normal ml-1">
                      ({__("optional", "whizmanage")})
                    </span>
                  </label>
                  <Input
                    type="email"
                    placeholder={__("Enter email address to override", "whizmanage")}
                    value={overrideEmail}
                    onChange={(e) => setOverrideEmail(e.target.value)}
                    disabled={sending}
                    className="dark:!bg-slate-800 dark:hover:!bg-slate-700 !rounded-xl"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-300">
                    {__("Leave empty to send to the customer's original email", "whizmanage")}
                  </p>
                </div>
              </div>
            </ModalBody>

            <ModalFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  onClose();
                  onModalClose();
                }}
                disabled={sending}
              >
                {__("Cancel", "whizmanage")}
              </Button>
              <Button
                onClick={handleSend}
                disabled={!selectedTemplateId || loading || sending}
                className="flex gap-2"
              >
                {__("Send Email", "whizmanage")}
                {sending && <RefreshCcw className="w-4 h-4 animate-spin" />}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
