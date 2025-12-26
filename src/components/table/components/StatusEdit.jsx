// src/.../StatusEdit.jsx (אותו קובץ קיים - שינוי קטן)
import { cn } from "@/lib/utils";
import { Portal } from "@radix-ui/react-portal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select";

const StatusEdit = ({
  value,
  onChange,
  onFinish,
  onCancel,
  onDirectUpdate,
  isLoading,
  error,
  inputRef,
  __,
  editOptions, // 👈 מקבל מכאן
}) => {
  const statusKeys = editOptions?.statusKeys || {};
  const options =
    editOptions?.options ||
    Object.keys(statusKeys).map((k) => ({ value: k, label: __(k, "whizmanage") })); // fallback חכם

  const selected = value || options?.[0]?.value || "draft";

  const handleValueChange = async (newValue) => {
    try {
      if (onDirectUpdate) {
        await onDirectUpdate(newValue);
      } else {
        onChange(newValue);
        setTimeout(() => onFinish(), 100);
      }
    } catch (e) {
      console.error("Failed to update status:", e);
      onCancel();
    }
  };

  return (
    <Select
      value={selected}
      defaultOpen
      disabled={isLoading}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      onValueChange={handleValueChange}
    >
      <SelectTrigger
        ref={inputRef}
        className={cn(
          "h-8 text-sm focus:ring-2 relative z-[60] min-w-[8rem]",
          "font-semibold px-2 py-1 border rounded-md capitalize",
          statusKeys[selected] || "bg-gray-100 border-gray-300",
          isLoading && "opacity-50 cursor-not-allowed",
          error && "border-red-500"
        )}
        autoFocus
      >
        <SelectValue placeholder={__("Select status", "whizmanage")} />
      </SelectTrigger>
      <Portal>
        <SelectContent
          position="popper"
          side="bottom"
          align="start"
          sideOffset={6}
          className="z-[10000] max-h-[280px] min-w-[var(--radix-select-trigger-width)] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg"
        >
          {options.map((opt) => (
            <SelectItem
              key={opt.value}
              value={opt.value}
              className={cn(
                "capitalize cursor-pointer font-semibold text-sm py-2",
                statusKeys[opt.value] // 👈 אותו סטייל של התוית
              )}
            >
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Portal>
    </Select>
  );
};

export default StatusEdit;
