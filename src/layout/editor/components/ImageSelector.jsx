import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { __ } from '@wordpress/i18n';
import { Button } from "@components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import ImageEditorDialog from "./ImageEditorDialog";
import { useTheme } from "../../ThemeProvider";
import ImageResizer from "./ImageResizer";
import { confirm } from "@components/CustomConfirm";

const ImageSelector = ({ editorRef, execCommand, onContentChange }) => {
   
  const { theme } = useTheme();
  const [currentImageSize, setCurrentImageSize] = useState({ width: 0, height: 0 });
  const [selectedImage, setSelectedImage] = useState(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const toolbarRef = useRef(null);

  const handleImageResize = (width, height) => setCurrentImageSize({ width, height });

  // מיקום toolbar מעל/מתחת לתמונה
  const positionToolbarAbove = (imgEl) => {
    if (!imgEl || !editorRef.current) return;
    const iframeRect = editorRef.current.getBoundingClientRect();
    const rect = imgEl.getBoundingClientRect();

    const approxH = (toolbarRef.current?.offsetHeight ?? 36);
    const margin = 8;

    let top = rect.top + iframeRect.top - approxH - margin;
    if (top < 0) top = rect.bottom + iframeRect.top + margin;

    setToolbarPosition({
      top,
      left: rect.left + iframeRect.left,
      width: rect.width,
    });

    // ריענון אחרי ציור למדוד גובה אמיתי
    requestAnimationFrame(() => {
      const h = (toolbarRef.current?.offsetHeight ?? approxH);
      let t2 = rect.top + iframeRect.top - h - margin;
      if (t2 < 0) t2 = rect.bottom + iframeRect.top + margin;
      setToolbarPosition((p) => ({ ...p, top: t2 }));
    });
  };

  // style סימון/hover לתמונות
  useEffect(() => {
    if (!editorRef.current) return;
    const doc = editorRef.current.contentDocument;
    if (!doc) return;

    const style = doc.createElement("style");
    style.textContent = `
      img { transition: outline .2s; }
      img:hover { outline: 2px solid #3b82f6; cursor: pointer; }
      img.selected { outline: 2px solid #3b82f6; }
    `;
    doc.head.appendChild(style);

    // בחירה
    const handleImageClick = (e) => {
      if (isDialogOpen) return;
      if (e.target.tagName === "IMG") {
        e.preventDefault();
        e.stopPropagation();

        doc.querySelectorAll("img.selected").forEach((img) => {
          if (img !== e.target) img.classList.remove("selected");
        });

        e.target.classList.add("selected");
        setSelectedImage(e.target);
        positionToolbarAbove(e.target);
        setShowToolbar(true);
      } else if (!e.target.closest(".image-toolbar")) {
        doc.querySelectorAll("img.selected").forEach((img) => img.classList.remove("selected"));
        setSelectedImage(null);
        setShowToolbar(false);
      }
    };

    const onScroll = () => {
      if (selectedImage && !isDialogOpen) positionToolbarAbove(selectedImage);
    };

    doc.addEventListener("click", handleImageClick);
    doc.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      doc.removeEventListener("click", handleImageClick);
      doc.removeEventListener("scroll", onScroll);
      if (style.parentNode) style.parentNode.removeChild(style);
    };
  }, [editorRef, isDialogOpen, selectedImage]);

  // עדכון מיקום כשנבחרה תמונה/נסגר דיאלוג
  useEffect(() => {
    if (selectedImage && editorRef.current && !isDialogOpen) {
      positionToolbarAbove(selectedImage);
    }
  }, [selectedImage, isDialogOpen]);

  // החבא/הצג toolbar בזמן גרירה
  useEffect(() => {
    const doc = editorRef.current?.contentDocument;
    if (!doc) return;
    const onStart = () => setShowToolbar(false);
    const onEnd = () => {
      if (selectedImage) {
        positionToolbarAbove(selectedImage);
        setShowToolbar(true);
      }
    };
    doc.addEventListener("wcimg-resize-start", onStart);
    doc.addEventListener("wcimg-resize-end", onEnd);
    return () => {
      doc.removeEventListener("wcimg-resize-start", onStart);
      doc.removeEventListener("wcimg-resize-end", onEnd);
    };
  }, [editorRef, selectedImage]);

  // דיאלוג עריכה
  const handleEditClick = (e) => {
    e.stopPropagation();
    setIsDialogOpen(true);
    setShowToolbar(false);
  };

  // מחיקה מהטולבר
  const handleDeleteClick = async (e) => {
    e.stopPropagation();
    if (!selectedImage) return;

    const isConfirmed = await confirm({
      title: __("Delete Image", "whizmanage"),
      message: __("Are you sure you want to delete this image?", "whizmanage"),
      confirmText: __("Delete", "whizmanage"),
      cancelText: __("Cancel", "whizmanage"),
    });
    if (!isConfirmed) return;

    const img = selectedImage;
    const wrap = img._wc_wrap || img._wrapper || img.closest(".wcimg-wrap");
    const container = wrap || img;
    const link = container.closest("a");

    if (link && link.childNodes.length === 1) link.remove();
    else container.remove();

    setSelectedImage(null);
    setShowToolbar(false);

    if (editorRef.current) {
      const newContent = editorRef.current.contentDocument.body.innerHTML;
      onContentChange(newContent);
    }
  };

  // מחיקה מהדיאלוג
  const handleDeleteFromDialog = () => {
    if (!selectedImage) return;
    const img = selectedImage;
    const wrap = img._wc_wrap || img._wrapper || img.closest(".wcimg-wrap");
    const container = wrap || img;
    const link = container.closest("a");

    if (link && link.childNodes.length === 1) link.remove();
    else container.remove();

    setSelectedImage(null);
    setShowToolbar(false);

    if (editorRef.current) {
      const newContent = editorRef.current.contentDocument.body.innerHTML;
      onContentChange(newContent);
    }
  };

  // סגירת דיאלוג
  const handleDialogOpenChange = (open) => {
    setIsDialogOpen(open);
    if (!open) {
      setShowToolbar(false);
      if (editorRef.current && selectedImage) {
        try {
          const doc = editorRef.current.contentDocument;
          doc.querySelectorAll("img.selected").forEach((img) => img.classList.remove("selected"));
          setSelectedImage(null);
        } catch (err) {
          console.error("Error clearing image selection:", err);
        }
      }
      setTimeout(() => {
        if (editorRef.current && editorRef.current.contentWindow) {
          try {
            const doc = editorRef.current.contentDocument;
            doc.designMode = "off";
            setTimeout(() => {
              doc.designMode = "on";
              editorRef.current.contentWindow.focus();
            }, 50);
          } catch (error) {
            console.error("Error refocusing editor:", error);
          }
        }
      }, 100);
    }
  };

  // החלת שינויים מהדיאלוג (כמו שהיה אצלך)
  const applyImageChanges = (changes) => {
    if (!selectedImage) return;

    if (changes.width) selectedImage.width = changes.width;
    if (changes.height) selectedImage.height = changes.height;

    if (changes.alt !== undefined) selectedImage.alt = changes.alt;

    selectedImage.style.float = "none";
    selectedImage.style.display = "";
    selectedImage.style.marginLeft = "";
    selectedImage.style.marginRight = "";

    if (changes.align === "left") {
      selectedImage.style.float = "left";
      selectedImage.style.marginRight = "10px";
      selectedImage.style.marginBottom = "10px";
    } else if (changes.align === "right") {
      selectedImage.style.float = "right";
      selectedImage.style.marginLeft = "10px";
      selectedImage.style.marginBottom = "10px";
    } else if (changes.align === "center") {
      selectedImage.style.display = "block";
      selectedImage.style.marginLeft = "auto";
      selectedImage.style.marginRight = "auto";
    }

    if (changes.styles) {
      selectedImage.style.borderRadius = changes.styles.borderRadius || "";
      selectedImage.style.boxShadow = changes.styles.boxShadow || "";
      selectedImage.style.border = changes.styles.border || "";
      selectedImage.style.transform = changes.styles.transform || "";
    }

    const parentLink = selectedImage.closest("a");
    if (changes.link) {
      if (parentLink) {
        parentLink.href = changes.link;
      } else {
        const doc = editorRef.current.contentDocument;
        const range = doc.createRange();
        range.selectNode(selectedImage);
        const selection = doc.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        execCommand("createLink", changes.link);
      }
    } else if (parentLink) {
      const newImg = selectedImage.cloneNode(true);
      parentLink.parentNode.replaceChild(newImg, parentLink);
      setSelectedImage(newImg);
    }

    const before = editorRef.current ? editorRef.current.contentDocument.body.innerHTML : "";
    if (editorRef.current) {
      const after = editorRef.current.contentDocument.body.innerHTML;
      if (after !== before) onContentChange(after);
    }
  };

  // רינדור toolbar
  const renderToolbarPortal = () => {
    if (!showToolbar || !selectedImage || isDialogOpen) return null;

    const isDarkMode = theme === "dark";
    const toolbarStyle = {
      position: "fixed",
      top: `${toolbarPosition.top}px`,
      left: `${toolbarPosition.left}px`,
      zIndex: 1000,
      display: "flex",
      gap: "4px",
      background: isDarkMode ? "#1e293b" : "white",
      borderRadius: "4px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      padding: "4px",
      pointerEvents: "auto",
      border: `1px solid ${isDarkMode ? "#334155" : "#e2e8f0"}`,
    };

    return createPortal(
      <div
        ref={toolbarRef}
        className="image-toolbar dark:bg-slate-800 border dark:border-slate-700"
        style={toolbarStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          size="icon"
          variant="ghost"
          onClick={handleEditClick}
          className="size-8 text-slate-700 dark:text-slate-200"
        >
          <Edit className="size-4" />
        </Button>

        <Button
          size="icon"
          variant="ghost"
          onClick={handleDeleteClick}
          className="size-8 text-slate-700 dark:text-slate-200"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>,
      document.body
    );
  };

  return (
    <>
      {renderToolbarPortal()}

      {selectedImage && !isDialogOpen && (
        <ImageResizer
          selectedImage={selectedImage}
          editorRef={editorRef}
          onContentChange={onContentChange}
        />
      )}

      <ImageEditorDialog
        isOpen={isDialogOpen}
        onOpenChange={handleDialogOpenChange}
        selectedImage={selectedImage}
        onApplyChanges={applyImageChanges}
        onDeleteImage={handleDeleteFromDialog}
        editorRef={editorRef}
        currentSize={currentImageSize}
      />
    </>
  );
};

export default ImageSelector;
