// ============================
// File: src/components/RichEditor/RichEditorModal.jsx (no shortcode logic needed here)
// ============================
import { useRef, useState, useEffect } from "react";
import { __ } from '@wordpress/i18n';
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, useDisclosure } from "@heroui/react";
import { Button } from "@components/ui/button";
import { Edit } from "lucide-react";
import HtmlEditor from "./HtmlEditor";

const convertRGBToHex = (html) => {
  return html.replace(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/gi, (match, r, g, b) => {
    const hex = [r, g, b].map((x) => {
      const hexPart = parseInt(x, 10).toString(16);
      return hexPart.length === 1 ? "0" + hexPart : hexPart;
    }).join("");
    return "#" + hex;
  });
};

const RichEditorModal = ({ row, title }) => {
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
   
  const modalContentRef = useRef(null);
  const [editorInstanceKey, setEditorInstanceKey] = useState(0);

  const [content, setContent] = useState(row[title] || "");
  const [initialContent, setInitialContent] = useState(row[title] || "");
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setIsDirty(content !== initialContent);
  }, [content, initialContent]);

  useEffect(() => {
    if (isOpen) {
      const rawContent = row[title] || "";
      const preparedContent = rawContent.replace(/\r?\n/g, "<br />");
      setContent(preparedContent);
      setEditorInstanceKey((prev) => prev + 1);
      setInitialContent(preparedContent);
      setIsDirty(false);
    }
  }, [isOpen, row, title]);

  const handleContentUpdate = (newContent) => {
    setContent(newContent);
    setIsDirty(true);
  };
  const handleSave = () => {
    if (row && title && isDirty) {
      row[title] = content;
      setInitialContent(content);
      setIsDirty(false);
      onClose();
    }
  };

  useEffect(() => {
    if (content && content.includes("rgb(")) {
      const newContent = convertRGBToHex(content);
      if (newContent !== content) setContent(newContent);
    }
  }, [content]);

  return (
    <>
      <Button onClick={onOpen} variant="outline" className="flex gap-2 h-8 capitalize">
        {__("Edit", "whizmanage")}<Edit className="ml-2 rtl:mr-2 rtl:ml-0 h-4 w-4 shrink-0 opacity-50" />
      </Button>
      <Modal
        size="5xl"
        backdrop="opaque"
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        isDismissable={false}
        classNames={{
          backdrop: "bg-gradient-to-t from-zinc-900 to-zinc-900/10 backdrop-opacity-20",
          body: "p-0",
          header: "border-b dark:border-slate-700",
          footer: "border-t dark:border-slate-700",
          wrapper: "modal-wrapper",
          // חשוב: החזרת absolute + מידות קומפקטיות לכפתור הסגירה
          closeButton: "absolute right-2 top-2 z-50 w-8 h-8 min-w-0 p-0 rounded-full inline-flex items-center justify-center",
        }}
      >
        <ModalContent ref={modalContentRef} className="dark:bg-slate-800 h-[90vh] overflow-hidden flex flex-col modal-content-wrapper">
          {(onCloseFunc) => (
            <>
              <ModalHeader className="flex flex-col gap-1 py-4">
                <h2 className="text-2xl text-center dark:text-slate-200 font-semibold">{__("Edit", "whizmanage")} {__(title, "whizmanage")}</h2>
              </ModalHeader>
              <ModalBody className="overflow-auto flex-1">
                <HtmlEditor
                  key={editorInstanceKey}
                  row={row}
                  initialContent={content}
                  onSave={handleContentUpdate}
                  height="full"
                />
              </ModalBody>
              <ModalFooter className="border-t dark:border-slate-700">
                <Button onClick={onCloseFunc} variant="outline">{__("Close", "whizmanage")}</Button>
                <Button onClick={handleSave} disabled={!isDirty}>{__("Save", "whizmanage")}</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

export default RichEditorModal;
