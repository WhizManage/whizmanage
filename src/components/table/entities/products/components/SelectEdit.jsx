// src/products/custom-edit-components/SelectEdit.jsx
import { cn } from "@/lib/utils";
import { Portal } from "@radix-ui/react-portal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select";
import ProBadge from "@components/ui/nextUI/ProBadge";

const SelectEdit = ({ 
  value, 
  onChange, 
  onFinish, 
  onCancel,
  onDirectUpdate,
  isLoading,
  inputRef,
  editOptions,
  t 
}) => {
  const currentValue = typeof value === 'object' ? value?.id || value?.value : value;
  
  const handleValueChange = async (newValue) => {
    
    // עדכן את הערך המקומי מיד
    onChange(newValue);
    
    // אם יש onDirectUpdate, השתמש בו
    if (onDirectUpdate) {
      try {
        await onDirectUpdate(newValue);
      } catch (error) {
        console.error("Failed to update select value:", error);
        onCancel();
      }
    } else {
      setTimeout(() => {
        onFinish();
      }, 100);
    }
  };

  return (
    <Select
      value={currentValue || ""}
      open={true}
      disabled={isLoading}
      onOpenChange={(open) => {
        if (!open) {
          onCancel();
        }
      }}
      onValueChange={handleValueChange}
    >
      <SelectTrigger
        ref={inputRef}
        className={cn(
          "h-8 text-sm focus:ring-2 relative z-[60] min-w-[8rem]",
          isLoading && "opacity-50 cursor-not-allowed"
        )}
        autoFocus
        aria-label={__("Select value", "whizmanage")}
      >
        <SelectValue placeholder={editOptions.placeholder || __("Select option", "whizmanage")} />
      </SelectTrigger>
      <Portal>
        <SelectContent
          position="popper"
          side="bottom"
          align="start"
          sideOffset={6}
          className="z-[10000] max-h-[280px] min-w-[var(--radix-select-trigger-width)]"
        >
          {editOptions.options?.map((option) => {
            const optionValue = option.value || option.id;
            const optionLabel = option.label || option.name;
            const isLocked = option.locked === true;

            return (
              <SelectItem
                key={optionValue}
                value={optionValue}
                disabled={isLocked}
                className={cn(isLocked && "opacity-60 cursor-not-allowed")}
              >
                <span className="flex items-center gap-2">
                  {optionLabel}
                  {isLocked && <span className="scale-75"><ProBadge /></span>}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Portal>
    </Select>
  );
};

export default SelectEdit;