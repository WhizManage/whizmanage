// src/components/forms/core/fields/ProductTypeInput.jsx

import ManageGrouped from "@/components/table/entities/products/components/grouped/ManageGrouped";
import ManageExternal from "@/components/table/entities/products/components/external/ManageExternal";
import { Label } from "@components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select";
import { Controller } from "react-hook-form";
import { __ } from "@wordpress/i18n";
import { useGenericForm } from "../FormProvider";

export default function ProductTypeInput({
  name = "type",
  label = "Product type",
  rules,
  requiredField = "name",
  showGroupedButton = true,
  showExternalButton = true,
}) {

  const { control, watch, getValues, setValue } = useGenericForm();

  const watchedType = watch(name);
  const currentType = watchedType || "simple";
  const requiredFieldValue = watch(requiredField);

  // ✅ בדיקה האם שדה השם ריק - כולל אחרי מחיקה
  const isDisabled = !requiredFieldValue ||
    (typeof requiredFieldValue === "string" && requiredFieldValue.trim() === "");

  const handleTypeChange = async (newType) => {
    setValue(name, newType, { shouldValidate: true, shouldDirty: true });
  };

  // Variable product removed from options
  const productTypes = [
    { value: "simple", label: "Simple product" },
    { value: "grouped", label: "Grouped product" },
    { value: "external", label: "External/Affiliate product" },
  ];

  return (
    <div className="flex flex-col w-full gap-3 px-2">
      {label && (
        <Label htmlFor={name}>
          {__(label, "whizmanage")}
          {rules?.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2 items-center">
          <Controller
            name={name}
            control={control}
            rules={rules}
            defaultValue="simple"
            render={({ field, fieldState: { error } }) => (
              <>
                <div className="relative">
                  <Select
                    value={field.value}
                    onValueChange={handleTypeChange}
                    disabled={isDisabled}
                  >
                    <SelectTrigger
                      className="h-10 w-fit min-w-[200px] dark:bg-slate-700 dark:hover:!bg-slate-600"
                      disabled={isDisabled}
                    >
                      <SelectValue placeholder={__("Select product type", "whizmanage")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>{__("Product Type", "whizmanage")}</SelectLabel>

                        {productTypes.map((type) => (
                          <SelectItem
                            key={type.value}
                            value={type.value}
                          >
                            {__(type.label, "whizmanage")}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                {error && (
                  <p className="text-red-500 dark:text-pink-500 text-sm">
                    {__(error.message, "whizmanage")}
                  </p>
                )}
              </>
            )}
          />

          {/* ✅ כפתור Grouped למוצר Grouped - לא צריך שמירה! */}
          {currentType === "grouped" && showGroupedButton && (
            <ManageGrouped
              row={{ original: getValues() }}
              isNew={true}
            />
          )}

          {/* ✅ כפתור External למוצר External - לא צריך שמירה! */}
          {currentType === "external" && showExternalButton && (
            <ManageExternal
              row={{ original: getValues() }}
              isNew={true}
              updateValue={(field, value) => {
                setValue(field, value, { shouldValidate: false, shouldDirty: true });
              }}
            />
          )}
        </div>

        {isDisabled && (
          <p className="text-xs text-muted-foreground px-2">
            {__(
              "Please fill in the product name first to enable product type selection",
              "whizmanage"
            )}
          </p>
        )}
      </div>
    </div>
  );
}
