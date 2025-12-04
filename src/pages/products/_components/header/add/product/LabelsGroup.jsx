import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { IconBadge } from "@components/IconBadge";
import { Label } from "@components/ui/label";
import { ChevronDown, ChevronUp, Tags } from "lucide-react";
import React from "react";
import { __ } from '@wordpress/i18n';
import MultiSelectInput from "./MultiSelectInput";

const LabelsGroup = ({ updateValue }) => {
   
  const showTaxonomies = window.listTaxonomies || [];

  const filteredAttributes = showTaxonomies.filter((taxonomy) => {
    try {
      return (
        taxonomy?.name &&
        !taxonomy.name.startsWith("_pa_") &&
        !taxonomy.name.startsWith("_product_cat")
      );
    } catch (error) {
      console.warn("Error filtering taxonomy:", taxonomy, error);
      return false;
    }
  });

  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-x-2">
        <IconBadge icon={Tags} />
        <h2 className="text-xl dark:text-gray-400">
          {__("Tags & Categories & Taxonomies", "whizmanage")}
        </h2>
      </div>
      <div className="flex flex-col w-full gap-1.5">
        <Label htmlFor="tags">{__("Product tags", "whizmanage")}</Label>
        <MultiSelectInput columnName="tags" updateValue={updateValue} />
      </div>
      <div className="flex flex-col w-full gap-1.5">
        <Label htmlFor="categories">{__("Product categories", "whizmanage")}</Label>
        <MultiSelectInput columnName="categories" updateValue={updateValue} />
      </div>
      {filteredAttributes.length > 0 && (
        <Collapsible
          open={isOpen}
          onOpenChange={setIsOpen}
          className="space-y-2"
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full flex items-center justify-between p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <h4 className="text-sm font-medium">
                {__("Additional Taxonomies", "whizmanage")} ({filteredAttributes.length})
              </h4>
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              <span className="sr-only">Toggle</span>
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="">
            {filteredAttributes.map((taxonomy) => (
              <div
                key={taxonomy.name}
                className="flex flex-col w-full gap-1.5 rounded-lg bg-slate-50 py-4 dark:bg-slate-900"
              >
                <Label htmlFor={taxonomy.name}>
                  {__("Product {{label}}", {
                    label: taxonomy.label || taxonomy.name,
                  })}
                </Label>
                <MultiSelectInput
                  columnName={taxonomy.name}
                  updateValue={updateValue}
                  label={taxonomy.label || taxonomy.name}
                />
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};

export default LabelsGroup;
