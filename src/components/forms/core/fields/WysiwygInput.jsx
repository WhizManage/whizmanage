// src/components/forms/core/fields/WysiwygInput.jsx

import { Button } from "@components/ui/button";
import { Label } from "@components/ui/label";
import { IconBadge } from "@components/ui/custom/IconBadge";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  useDisclosure,
} from "@heroui/react";
import { FileEdit } from "lucide-react";
import { useEffect, useState } from "react";
 import { __ } from "@wordpress/i18n";
import { useGenericForm } from "../FormProvider";
import HtmlEditor from "@components/editor/HtmlEditor";

const convertRGBToHex = (html) => {
  return html.replace(
    /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/gi,
    (match, r, g, b) => {
      const hex = [r, g, b]
        .map((x) => {
          const hexPart = parseInt(x, 10).toString(16);
          return hexPart.length === 1 ? "0" + hexPart : hexPart;
        })
        .join("");
      return "#" + hex;
    }
  );
};

export default function WysiwygInput({
  name,
  label,
  placeholder,
  rules,
  height = "full",
}) {
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const {
    setValue,
    watch,
    formState: { errors },
  } = useGenericForm();

  const err = errors?.[name];
  const currentValue = watch(name) || "";
  const [content, setContent] = useState(currentValue);
  const [modalContent, setModalContent] = useState("");
  const [editorInstanceKey, setEditorInstanceKey] = useState(0);
  const [compactEditorKey, setCompactEditorKey] = useState(0);

  // המרת RGB ל-Hex אוטומטית
  useEffect(() => {
    if (content && content.includes("rgb(")) {
      const newContent = convertRGBToHex(content);
      if (newContent !== content) {
        setContent(newContent);
        setValue(name, newContent, { shouldValidate: true, shouldDirty: true });
      }
    }
  }, [content, name, setValue]);

  const handleContentUpdate = (newContent) => {
    setContent(newContent);
    setValue(name, newContent, { shouldValidate: true, shouldDirty: true });
  };

  // פתיחת המודל עם העורך המלא
  const handleOpenFullEditor = () => {
    setModalContent(content);
    setEditorInstanceKey((prev) => prev + 1);
    onOpen();
  };

  // עדכון תוכן במודל
  const handleModalContentUpdate = (newContent) => {
    setModalContent(newContent);
  };

  // שמירה מהמודל
  const handleModalSave = () => {
    setContent(modalContent);
    setValue(name, modalContent, { shouldValidate: true, shouldDirty: true });
    // רענון ה-compact editor כדי שיציג את התוכן החדש
    setCompactEditorKey((prev) => prev + 1);
    onClose();
  };

  return (
    <div className="flex flex-col w-full gap-1.5 px-2">
      <Label htmlFor={name}>
        {__(label, "whizmanage")}
        {rules?.required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <div className="relative h-fit border rounded-lg overflow-hidden flex gap-1 items-center dark:bg-slate-700">
        <HtmlEditor
          key={`${name}-${compactEditorKey}`}
          initialContent={content}
          onSave={handleContentUpdate}
          height={height}
          compact
          onOpenFullEditor={handleOpenFullEditor}
        />
      </div>
      {err && (
        <p className="text-red-500 dark:text-pink-500 text-sm px-2">
          {__(err.message, "whizmanage")}
        </p>
      )}

      {/* מודל עם העורך המלא */}
      <Modal
        size="5xl"
        backdrop="opaque"
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        isDismissable={false}
        classNames={{
          backdrop:
            "bg-gradient-to-t from-zinc-900 to-zinc-900/10 backdrop-opacity-20",
          body: "p-0",
          header: "border-b dark:border-slate-700",
          footer: "border-t dark:border-slate-700",
          wrapper: "modal-wrapper",
          closeButton:
            "absolute right-2 top-2 z-50 w-8 h-8 min-w-0 p-0 rounded-full inline-flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 rounded-lg",
        }}
      >
        <ModalContent className="dark:bg-slate-800 h-[90vh] overflow-hidden flex flex-col modal-content-wrapper">
          {(onCloseFunc) => (
            <>
              <ModalHeader className="flex gap-3 justify-center items-center py-4">
                <IconBadge icon={FileEdit} variant="default" size="default" />
                <h2 className="text-xl font-semibold dark:text-slate-200">
                  {__("Edit")} {__(label)}
                </h2>
              </ModalHeader>
              <ModalBody className="overflow-auto scrollbar-whiz flex-1">
                <HtmlEditor
                  key={editorInstanceKey}
                  initialContent={modalContent}
                  onSave={handleModalContentUpdate}
                  height="full"
                />
              </ModalBody>
              <ModalFooter className="border-t dark:border-slate-700">
                <Button onClick={onCloseFunc} variant="outline">
                  {__("Close")}
                </Button>
                <Button onClick={handleModalSave}>
                  {__("Save")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}