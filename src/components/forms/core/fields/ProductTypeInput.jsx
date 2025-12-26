// src/components/forms/core/fields/ProductTypeInput.jsx

import AddVariations from "@/components/table/entities/products/components/variation/AddVariations";
import ManageGrouped from "@/components/table/entities/products/components/grouped/ManageGrouped";
import ManageExternal from "@/components/table/entities/products/components/external/ManageExternal";
import { postApi } from "@/services/services";
import { Alert, AlertDescription } from "@components/ui/alert";
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
import { Info, Loader2 } from "lucide-react";
import { useState } from "react";
import { Controller } from "react-hook-form";
 import { __ } from "@wordpress/i18n";
import { toast } from "@/lib/utils";
import { useGenericForm } from "../FormProvider";
import ProBadge from "@components/ui/nextUI/ProBadge";

export default function ProductTypeInput({
  name = "type",
  label = "Product type",
  rules,
  requiredField = "name",
  showVariationsButton = true,
  showGroupedButton = true,
  showExternalButton = true,
}) {
   
  const { control, watch, getValues, setValue, onProductSaved } = useGenericForm();

  const [savedProduct, setSavedProduct] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const watchedType = watch(name);
  const currentType = watchedType || "simple";
  const requiredFieldValue = watch(requiredField);

  // ✅ בדיקה האם שדה השם ריק - כולל אחרי מחיקה
  const isDisabled = !requiredFieldValue ||
    (typeof requiredFieldValue === "string" && requiredFieldValue.trim() === "");

  // ✅ mockRow רק ל-Variable (שנשמר)
  const mockRow = savedProduct ? { original: savedProduct } : null;

  // ✅ נציג את כפתור הווריאציות אם יש savedProduct
  // הסוג כבר מובטח להיות variable כי savedProduct נשמר רק עבור variable
  const showVariationsIcon = !!savedProduct;

  const handleTypeChange = async (newType) => {
    // 🔒 חסימה: אין רישיון → לא לאפשר Variable
    if (
      newType === "variable" &&
      typeof window !== "undefined" &&
      window?.hasLicence === false
    ) {
      toast.error(__("This is a Pro feature", "whizmanage"));
      return;
    }

    setValue(name, newType, { shouldValidate: true, shouldDirty: true });

    // ✅ שמירה אוטומטית רק עבור Variable products!
    // Grouped ו-External לא צריכים product.id קיים
    if (newType === "variable" && !savedProduct) {
      setIsSaving(true);

      try {
        const formValues = getValues();
        const dataToSave = {
          ...formValues,
          type: newType,
        };

        // ✅ המרת categories ל-{id: X} - WooCommerce API דורש אובייקטים
        if (Array.isArray(dataToSave.categories)) {
          dataToSave.categories = dataToSave.categories.map((item) => {
            if (typeof item === "object" && item.id) {
              return { id: item.id };
            }
            if (typeof item === "number" || typeof item === "string") {
              return { id: Number(item) };
            }
            return item;
          });
        }

        // ✅ המרת tags ל-{id: X}
        if (Array.isArray(dataToSave.tags)) {
          dataToSave.tags = dataToSave.tags.map((item) => {
            if (typeof item === "object" && item.id) {
              return { id: item.id };
            }
            if (typeof item === "number" || typeof item === "string") {
              return { id: Number(item) };
            }
            return item;
          });
        }

        const endpoint = `${window.siteUrl}/wp-json/wc/v3/products`;
        const response = await postApi(endpoint, dataToSave);
        const newProduct = response.data ?? response;

        // ✅ עדכון ה-form עם ה-ID
        setValue("id", newProduct.id, {
          shouldValidate: false,
          shouldDirty: false,
        });

        // ✅ וודא שה-type נשמר בטופס
        setValue(name, "variable", {
          shouldValidate: true,
          shouldDirty: true,
        });

        // ✅ עדכון savedProduct - יגרום להצגת כפתור הווריאציות
        setSavedProduct(newProduct);

        toast.success(__("Product saved successfully. You can now add variations.", "whizmanage"));

        // ✅ קריאה ל-callback
        if (onProductSaved) {
          onProductSaved(newProduct);
        }
      } catch (error) {
        console.error("Failed to save product:", error);
        setValue(name, "simple", { shouldValidate: true, shouldDirty: true });

        toast.error(
          error?.response?.data?.message ||
          error?.message ||
          __("Failed to save product. Please try again.", "whizmanage")
        );
      } finally {
        setIsSaving(false);
      }
    }
  };

  const productTypes = [
    { value: "simple", label: "Simple product" },
    { value: "grouped", label: "Grouped product" },
    { value: "external", label: "External/Affiliate product" },
    { value: "variable", label: "Variable product" },
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
                    disabled={isDisabled || isSaving}
                  >
                    <SelectTrigger
                      className="h-10 w-fit min-w-[200px] dark:bg-slate-700 dark:hover:!bg-slate-600"
                      disabled={isDisabled || isSaving}
                    >
                      <SelectValue placeholder={__("Select product type", "whizmanage")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>{__("Product Type", "whizmanage")}</SelectLabel>

                        {productTypes.map((type) => {
                          const isVariable = type.value === "variable";
                          const locked =
                            isVariable &&
                            typeof window !== "undefined" &&
                            window?.hasLicence === false;

                          return (
                            <SelectItem
                              key={type.value}
                              value={type.value}
                              // 🔒 חסימת בחירה במצב לא-פרו
                              disabled={locked}
                              className={
                                locked
                                  ? "opacity-60 cursor-not-allowed"
                                  : undefined
                              }
                              title={locked ? __("Pro feature", "whizmanage") : undefined}
                            >
                              <span className="inline-flex items-center gap-2">
                                {__(type.label, "whizmanage")}
                                {locked && (
                                  <span className="relative -mr-1">
                                    <ProBadge />
                                  </span>
                                )}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectGroup>
                    </SelectContent>
                  </Select>

                  {isSaving && (
                    <div className="absolute -end-8 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-5 h-5 animate-spin text-fuchsia-600" />
                    </div>
                  )}
                </div>

                {error && (
                  <p className="text-red-500 dark:text-pink-500 text-sm">
                    {__(error.message, "whizmanage")}
                  </p>
                )}
              </>
            )}
          />

          {/* ✅ כפתור Variations למוצר Variable */}
          {showVariationsIcon && showVariationsButton && (
            <AddVariations row={mockRow} isNew={true} />
          )}

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

        {/* ✅ הודעה רק עבור Variable */}
        {!savedProduct && currentType === "variable" && (
          <Alert className="border-l-4 border-l-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-950/20">
            <Info className="h-4 w-4 text-fuchsia-600" />
            <AlertDescription className="text-sm text-fuchsia-900 dark:text-fuchsia-200">
              {__(
                "Note: Selecting 'Variable product' will save the product so you can add variations.",
                "whizmanage"
              )}
            </AlertDescription>
          </Alert>
        )}

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
