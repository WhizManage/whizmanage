// src/components/forms/core/fields/ImageInput.jsx

import { Label } from "@components/ui/label";
 import { __ } from "@wordpress/i18n";
import { useGenericForm } from "../FormProvider";
import MediaEdit from "@/components/media/MediaEdit";

export default function ImageInput({
  name,
  label,
  rules,
  multiple = false,
  maxSelection,
}) {
   
  const {
    setValue,
    watch,
    formState: { errors },
  } = useGenericForm();
  
  const err = errors?.[name];
  const currentValue = watch(name);
  
  const handleChange = (selectedValue) => {
    setValue(name, selectedValue, { shouldValidate: true, shouldDirty: true });
  };
  
  return (
    <div className="flex flex-col w-full gap-1.5 px-2">
      <Label htmlFor={name}>
        {__(label, "whizmanage")}
        {rules?.required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <div className="min-h-[140px]">
        <MediaEdit
          value={currentValue}
          onChange={handleChange}
          onFinish={() => {}}
          onCancel={() => {}}
          editOptions={{
            multiple,
            maxSelection,
            title: multiple ? __("Select Images", "whizmanage") : __("Select Image", "whizmanage"),
          }}
          __={__}
          isForm={true} // 🆕 מצב טופס
        />
      </div>
      {err && (
        <p className="text-red-500 dark:text-pink-500 text-sm px-2">
          {__(err.message, "whizmanage")}
        </p>
      )}
    </div>
  );
}