import { Controller } from "react-hook-form";
import { useGenericForm } from "../FormProvider";
import FiltersEditor from "@/components/table/entities/discount-rules/components/FiltersEditor";

/** ערך השדה הוא Array<{field,op,values}> */
export default function FiltersField({ name, label, description, rules }) {
  const { control } = useGenericForm();

  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-sm">{label}</label>}
      {description && <p className="text-xs text-muted-foreground">{description}</p>}

      <Controller
        name={name}
        control={control}
        rules={rules}
        render={({ field }) => (
          <FiltersEditor
            rows={Array.isArray(field.value) ? field.value : []}
            onChange={(next) => field.onChange(next)}
          />
        )}
      />
    </div>
  );
}
