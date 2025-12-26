// src/components/forms/core/fields/AdditionalTaxonomiesInput.jsx

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useMemo, useState } from "react";
 import { __ } from "@wordpress/i18n";
import MultiSelectInput from "./MultiSelectInput";

export default function AdditionalTaxonomiesInput({
  name = "additional_taxonomies",
  label = "Additional Taxonomies",
  defaultOpen = false,
}) {
   
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // סינון הטקסונומיות
  const filteredTaxonomies = useMemo(() => {
    const showTaxonomies = window.listTaxonomies || [];

    return showTaxonomies.filter((taxonomy) => {
      try {
        return (
          taxonomy?.name &&
          !taxonomy.name.startsWith("_pa_") &&
          !taxonomy.name.startsWith("_product_cat") &&
          taxonomy.name !== "product_cat" &&
          taxonomy.name !== "product_tag"
        );
      } catch (error) {
        console.warn("Error filtering taxonomy:", taxonomy, error);
        return false;
      }
    });
  }, []);

  // אם אין טקסונומיות נוספות, לא מציגים כלום
  if (filteredTaxonomies.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col w-full gap-3 px-2">
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full flex items-center justify-between p-3 hover:bg-slate-100 dark:hover:bg-slate-800 border border-input rounded-lg"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{__(label, "whizmanage")}</span>
              <span className="text-xs text-muted-foreground">
                {__("available", { count: filteredTaxonomies.length })}
              </span>
            </div>
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-4 px-0 pt-2">
          <div className="flex flex-col gap-4 py-0 px-0 bg-slate-50 dark:bg-slate-900 rounded-lg">
            {filteredTaxonomies.map((taxonomy) => (
              <MultiSelectInput
                key={taxonomy.name}
                name={taxonomy.name}
                label={taxonomy.label || taxonomy.name}
                taxonomyType={taxonomy.name}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
