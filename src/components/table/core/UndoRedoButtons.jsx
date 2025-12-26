// src/components/table/UndoRedoButtons.jsx
import { cn } from "@/lib/utils";
import Button from "@components/ui/button";
import CustomTooltip from "@components/ui/nextUI/Tooltip.jsx";
import { Redo2, Undo2 } from "lucide-react";
import { useEffect } from "react";
 import { __ } from "@wordpress/i18n";

export function UndoRedoButtons({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  isLoading,
  className,
}) {
   

  // הפוך פונקציות לערכים בוליאניים
  const canUndoVal = typeof canUndo === "function" ? !!canUndo() : !!canUndo;
  const canRedoVal = typeof canRedo === "function" ? !!canRedo() : !!canRedo;

  const handleUndoClick = () => {
    if (canUndoVal && onUndo) onUndo();
  };

  const handleRedoClick = () => {
    if (canRedoVal && onRedo) onRedo();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      // אל תפעיל קיצורים אם המשתמש מקליד בשדה טקסט
      const active = document.activeElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(active?.tagName)) return;

      const isZ = e.code === "KeyZ" || e.key.toLowerCase() === "z" || e.key === "ז";
      const isY = e.code === "KeyY" || e.key.toLowerCase() === "y" || e.key === "ף";

      // Ctrl/Cmd + Z → Undo
      if ((e.ctrlKey || e.metaKey) && isZ && !e.shiftKey) {
        e.preventDefault();
        if (canUndoVal) onUndo?.();
      }

      // Ctrl/Cmd + Shift + Z → Redo
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && isZ) {
        e.preventDefault();
        if (canRedoVal) onRedo?.();
      }

      // Ctrl/Cmd + Y → Redo (Windows)
      if ((e.ctrlKey || e.metaKey) && isY) {
        e.preventDefault();
        if (canRedoVal) onRedo?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onUndo, onRedo, canUndoVal, canRedoVal]);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <CustomTooltip title={__("Undo (Ctrl+Z)", "whizmanage")} instantClose>
        <Button
          className="!size-8 p-0 m-0 text-muted-foreground"
          variant="outline"
          disabled={!canUndoVal || isLoading}
          onClick={handleUndoClick}
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600" />
          ) : (
            <Undo2 className="h-4 w-4" strokeWidth={1.5} />
          )}
        </Button>
      </CustomTooltip>
      <CustomTooltip title={__("Redo (Ctrl+Shift+Z / Ctrl+Y)", "whizmanage")} instantClose>
        <Button
          className="!size-8 p-0 m-0 text-muted-foreground"
          variant="outline"
          disabled={!canRedoVal || isLoading}
          onClick={handleRedoClick}
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600" />
          ) : (
            <Redo2 className="h-4 w-4" strokeWidth={1.5} />
          )}
        </Button>
      </CustomTooltip>
    </div>
  );
}
