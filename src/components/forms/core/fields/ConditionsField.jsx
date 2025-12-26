import { Controller } from "react-hook-form";
import { useGenericForm } from "../FormProvider";
import ConditionsEditor from "@/components/table/entities/discount-rules/components/ConditionsEditor";

/**
 * שדה טופס לשימוש ב-GenericForm:
 * type: "conditions"
 * שומר ערך בצורה: { logic: "all"|"any", rules: [...] }
 */
export default function ConditionsField({ name, label, rules, description }) {
  const { control } = useGenericForm();

  const ensureShape = (val) => {
    if (!val || typeof val !== "object") return { logic: "all", rules: [] };
    return {
      logic: val.logic === "any" ? "any" : "all",
      rules: Array.isArray(val.rules) ? val.rules : [],
    };
  };

  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-sm">{label}</label>}
      {description && <p className="text-xs text-muted-foreground">{description}</p>}

      <Controller
        name={name}
        control={control}
        rules={rules}
        render={({ field }) => {
          const shaped = ensureShape(field.value);

          return (
            <ConditionsEditor
              value={shaped.rules}
              onChange={(nextRules) => field.onChange({ ...shaped, rules: nextRules })}
              logic={shaped.logic}
              onLogicChange={(nextLogic) => field.onChange({ ...shaped, logic: nextLogic })}
            />
          );
        }}
      />
    </div>
  );
}
