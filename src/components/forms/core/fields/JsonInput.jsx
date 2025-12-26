import { Controller } from "react-hook-form";
import { useGenericForm } from "../FormProvider";

export default function JsonInput({ name, label, rules, placeholder }) {
  const { control } = useGenericForm();

  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm">{label}</label>}
      <Controller
        name={name}
        control={control}
        rules={rules}
        render={({ field, fieldState }) => (
          <>
            <textarea
              className="min-h-40 w-full rounded-md border p-2 font-mono text-xs"
              value={
                typeof field.value === "string"
                  ? field.value
                  : JSON.stringify(field.value ?? {}, null, 2)
              }
              onChange={(e) => {
                const txt = e.target.value;
                try {
                  const parsed = txt.trim() ? JSON.parse(txt) : (Array.isArray(field.value) ? [] : {});
                  field.onChange(parsed);
                } catch {
                  // במצב הקלדה לא חוסמים – נשמור טקסט וננסה שוב בהדבקה/פוקוס-אאוט
                  field.onChange(txt);
                }
              }}
              placeholder={placeholder}
            />
            {fieldState.error && (
              <div className="text-xs text-red-500">{fieldState.error.message}</div>
            )}
          </>
        )}
      />
    </div>
  );
}
