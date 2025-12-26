import { useState } from "react";
import { Copy, Check, Wand2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import CustomTooltip from "@components/ui/nextUI/Tooltip";
 import { __ } from "@wordpress/i18n";

const CopyableText = ({ getValue, row, column, table, onUpdate }) => {
   
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(getValue());
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleCellClick = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    const initialValue = getValue();
    if (value !== initialValue) {
      // ✅ שימוש ב-rowId הנכון כמו ב-EditableCell
      const rowId = row.original.id ?? row.original._id ?? row.original.key ?? row.id;
      
      try {
        await onUpdate(rowId, column.id, value, row.original);
      } catch (error) {
        console.error("Failed to save code:", error);
        // החזר את הערך הישן אם נכשל
        setValue(initialValue);
      }
    }
    setIsEditing(false);
  };

  const handleBlur = () => {
    handleSave();
  };

  const handleGenerateClick = (e) => {
    e.preventDefault(); // ✅ מונע submit אם זה בתוך form
    e.stopPropagation(); // ✅ מונע blur
    
    const newCode = Math.random().toString(36).substr(2, 8).toUpperCase();
    setValue(newCode);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      setValue(getValue());
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex gap-2 items-center w-full">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          aria-label="Enter code"
          className="h-8 flex-1 dark:text-slate-300 border-slate-200 dark:border-slate-800 rounded-md"
          onFocus={(e) => e.target.select()}
          autoFocus
          required
        />
        <CustomTooltip title={__("Generate", "whizmanage")}>
          <Button
            onMouseDown={handleGenerateClick}
            variant="outline"
            type="button"
            className="size-8 px-1.5 rounded-lg dark:bg-slate-700 text-slate-300 flex-shrink-0"
            size="icon"
          >
            <Wand2 className="size-4" />
          </Button>
        </CustomTooltip>
      </div>
    );
  }

  return (
    <div
      className="w-full h-full flex items-center gap-2 cursor-text"
      onClick={handleCellClick}
      title={value}
    >
      <span className="line-clamp-2 truncate text-wrap flex-1">
        {value}
      </span>
      <CustomTooltip title={copied ? __("Copied!", "whizmanage") : __("Copy code", "whizmanage")} instantClose>
        <button
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
          aria-label="Copy code"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4 text-slate-400" />
          )}
        </button>
      </CustomTooltip>
    </div>
  );
};

export default CopyableText;