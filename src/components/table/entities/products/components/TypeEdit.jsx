import { cn } from "@/lib/utils";
import { Portal } from "@radix-ui/react-portal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select";
import { confirm } from "@components/ui/custom/CustomConfirm";

const TypeEdit = ({
  value,
  onChange,
  onFinish,
  onCancel,
  onDirectUpdate,
  isLoading,
  inputRef,
  editOptions,
  row,
  t
}) => {
  const currentValue = typeof value === 'object' ? value?.id || value?.value : value;

  const handleValueChange = async (newValue) => {
    // אם משנים מ-variable ל-simple עם וריאציות - בקש אישור
    if (
      newValue === "simple" &&
      currentValue === "variable" &&
      row?.original?.has_options === true
    ) {
      const isConfirmed = await confirm({
        title: __("Delete Product Variations", "whizmanage"),
        message: __(
          "Please confirm that you understand deleting the product variations is irreversible and cannot be undone. This action will permanently remove all variations associated with this product from the system.",
          "whizmanage"
        ),
        confirmText: __("Delete Variations", "whizmanage"),
        cancelText: __("Cancel", "whizmanage"),
      });

      if (!isConfirmed) {
        onCancel();
        return;
      }
    }

    // עדכן את הערך המקומי מיד
    onChange(newValue);

    // אם יש onDirectUpdate, השתמש בו
    if (onDirectUpdate) {
      try {
        await onDirectUpdate(newValue);
      } catch (error) {
        console.error("Failed to update type:", error);
        onCancel();
      }
    } else {
      setTimeout(() => {
        onFinish();
      }, 100);
    }
  };

  // Filter out "variable" from options
  const filteredOptions = (editOptions.options || []).filter(
    (option) => (option.value || option.id) !== "variable"
  );

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
        aria-label={__("Select product type", "whizmanage")}
      >
        <SelectValue placeholder={__("Select product type", "whizmanage")} />
      </SelectTrigger>
      <Portal>
        <SelectContent
          position="popper"
          side="bottom"
          align="start"
          sideOffset={6}
          className="z-[10000] max-h-[280px] min-w-[var(--radix-select-trigger-width)]"
        >
          {filteredOptions.map((option) => {
            const optionValue = option.value || option.id;
            const optionLabel = option.label || option.name;
            return (
              <SelectItem
                key={optionValue}
                value={optionValue}
              >
                {optionLabel}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Portal>
    </Select>
  );
};

export default TypeEdit;
