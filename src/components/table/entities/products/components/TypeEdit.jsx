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
import ProBadge from "@components/ui/nextUI/ProBadge";

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
  const hasLicence = typeof window === "undefined" ? true : window?.hasLicence !== false;

  const handleValueChange = async (newValue) => {
    // 🔒 אין פרו → אל תאפשר בחירה ל-"variable"
    if (!hasLicence && newValue === "variable") {
      // בלוק רך: אל תשנה ערך וסגור/השאר פתוח לפי UX הרצוי
      return;
    }


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
          {editOptions.options?.map((option) => {
            const optionValue = option.value || option.id;
            const optionLabel = option.label || option.name;
            const isVariable = optionValue === "variable";
            const locked = isVariable && !hasLicence;
            return (
              <SelectItem
                key={optionValue}
                value={optionValue}
                disabled={locked}
                className={locked ? "opacity-60 cursor-not-allowed" : undefined}
              >
                <span className="inline-flex items-center gap-2">
                  {optionLabel}
                  {locked && (
                    <span className="relative -mr-1">
                      <ProBadge />
                    </span>
                  )}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Portal>
    </Select>
  );
};

export default TypeEdit;
