// src/components/table/products/components/RichTextEdit.jsx
import { useState, useEffect, useRef } from "react";
import { Edit, FileEdit } from "lucide-react";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  useDisclosure,
} from "@heroui/react";
import { Button } from "@components/ui/button";
import { IconBadge } from "@components/ui/custom/IconBadge";
import HtmlEditor from "@components/editor/HtmlEditor";
 import { __ } from "@wordpress/i18n";

const RichTextEdit = ({ 
  value, 
  onChange, 
  onFinish, 
  onCancel,
  onDirectUpdate,
  isLoading,
  error,
  inputRef,
  cellRef,
  editOptions,
  row,
  column,
}) => {
   
  
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [content, setContent] = useState(value || "");
  const [initialContent] = useState(value || "");
  const [isDirty, setIsDirty] = useState(false);
  const isFirstRender = useRef(true);
  
  // 🔑 המפתח: שמירת התא לפני פתיחת המודל
  const parentCellRef = useRef(null);

  // שמור את התא ההורה מיד כשהקומפוננטה נטענת
  useEffect(() => {
    // מצא את ה-TD ההורה
    let currentElement = cellRef?.current || inputRef?.current;
    
    while (currentElement && currentElement.tagName !== 'TD') {
      currentElement = currentElement.parentElement;
    }
    
    if (currentElement && currentElement.tagName === 'TD') {
      parentCellRef.current = currentElement;
    } else {
      console.warn('⚠️ Could not find parent TD');
    }
  }, []); // רק פעם אחת בטעינה!

  // פתח את המודל אוטומטית
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setTimeout(() => {
        onOpen();
      }, 100);
    }
  }, [onOpen]);

  // עדכון isDirty
  useEffect(() => {
    setIsDirty(content !== initialContent);
  }, [content, initialContent]);

  // המרת RGB ל-Hex
  const convertRGBToHex = (html) => {
    if (!html) return html;
    return html.replace(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/gi, (match, r, g, b) => {
      const hex = [r, g, b]
        .map(x => {
          const hexPart = parseInt(x, 10).toString(16);
          return hexPart.length === 1 ? '0' + hexPart : hexPart;
        })
        .join('');
      return '#' + hex;
    });
  };

  // טיפול בעדכון תוכן
  const handleContentUpdate = (newContent) => {
    const processedContent = newContent?.includes('rgb(') 
      ? convertRGBToHex(newContent) 
      : newContent;
    setContent(processedContent);
  };

  // פונקציה להחזרת פוקוס
  const restoreFocus = () => {
    
    if (parentCellRef.current) {
      // נסה לתת פוקוס
      parentCellRef.current.focus();
      
      
      // וודא שהפוקוס באמת חזר
      setTimeout(() => {
        if (document.activeElement !== parentCellRef.current) {
          // console.warn('⚠️ Focus was lost, trying again...');
          parentCellRef.current.focus();
        }
      }, 100);
      
      return true;
    } else {
      console.error('❌ No parent cell reference found!');
      return false;
    }
  };

  // שמירת שינויים
  const handleSave = async () => {
    
    if (isDirty) {
      onChange(content);
      
      if (onDirectUpdate) {
        try {
          await onDirectUpdate(content);
        } catch (error) {
          console.error("Failed to update rich text:", error);
        }
      }
    }
    
    // סגור את המודל
    onClose();
    
    // חכה שהמודל ייסגר
    setTimeout(() => {
      restoreFocus();
      onFinish();
    }, 150);
  };

  // ביטול עריכה
  const handleCancel = () => {
    
    onClose();
    
    setTimeout(() => {
      restoreFocus();
      onCancel();
    }, 150);
  };

  // טיפול בסגירת מודל (X או ESC)
  const handleModalClose = () => {
    if (isDirty) {
      if (window.confirm(__("You have unsaved changes. Do you want to save them?", "whizmanage"))) {
        handleSave();
      } else {
        handleCancel();
      }
    } else {
      handleCancel();
    }
  };

  // כותרת למודל
  const getModalTitle = () => {
    if (column.id === 'description') return __("Edit Description", "whizmanage");
    if (column.id === 'short_description') return __("Edit Short Description", "whizmanage");
    return __("Edit", "whizmanage") + " " + (column.columnDef?.header || column.id);
  };

  // הסרת HTML לתצוגה
  const stripHTML = (html) => {
    if (!html) return "";
    const temp = document.createElement( "div");
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || "";
  };

  const displayText = stripHTML(value);

  return (
    <>
      {/* כפתור שפותח את המודל */}
      <div 
        ref={inputRef}
        className="px-2 py-1 border border-blue-500 rounded bg-white dark:bg-slate-700 
                   cursor-pointer flex items-center justify-between min-h-[32px] hover:bg-slate-50 dark:hover:bg-slate-600"
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpen();
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
          }
        }}
        tabIndex={0}
        role="button"
        aria-label={__("Edit rich text", "whizmanage")}
      >
        <span className="text-sm truncate flex-1">
          {displayText ? 
            (displayText.length > 50 ? displayText.substring(0, 50) + "..." : displayText) : 
            __("Click to edit", "whizmanage")
          }
        </span>
        <Edit className="h-4 w-4 text-slate-400 flex-shrink-0 ml-2" />
      </div>
      {/* מודל עורך הטקסט */}
      <Modal
        size="5xl"
        backdrop="opaque"
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleModalClose();
          }
        }}
        isDismissable={false}
        classNames={{
          backdrop: "bg-gradient-to-t from-zinc-900 to-zinc-900/10 backdrop-opacity-20",
          body: "p-0",
          header: "border-b dark:border-slate-700",
          footer: "border-t dark:border-slate-700",
          wrapper: "modal-wrapper z-[10000]",
          closeButton: "right-2 top-2 z-50 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 rounded-lg",
        }}
      >
        <ModalContent className="dark:bg-slate-800 h-[90vh] overflow-hidden flex flex-col">
          {() => (
            <>
              <ModalHeader className="flex gap-3 justify-center items-center py-4">
                <IconBadge icon={FileEdit} variant="default" size="default" />
                <h2 className="text-xl font-semibold dark:text-slate-200">
                  {getModalTitle()}
                </h2>
              </ModalHeader>

              <ModalBody className="overflow-auto scrollbar-whiz flex-1">
                <HtmlEditor
                  initialContent={content}
                  onSave={handleContentUpdate}
                  height="full"
                  row={row?.original || row}
                />
              </ModalBody>

              <ModalFooter>
                <Button 
                  onClick={handleCancel} 
                  variant="outline"
                  disabled={isLoading}
                >
                  {__("Cancel", "whizmanage")}
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={!isDirty || isLoading}
                  variant="gradient"
                >
                  {isLoading ? __("Saving...", "whizmanage") : __("Save", "whizmanage")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
      {error && (
        <span className="absolute top-full left-0 text-xs text-red-500 mt-1">
          {error}
        </span>
      )}
    </>
  );
};

export default RichTextEdit;