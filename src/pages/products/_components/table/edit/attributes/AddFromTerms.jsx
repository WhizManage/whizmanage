import { Button } from "@components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
} from "@components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/ui/popover";
import { Input } from "@components/ui/input";
import { Plus, Undo2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { postApi } from "/src/services/services";
import { __ } from '@wordpress/i18n';
import AddFromTermsItem from "./AddFromTermsItem";

const AddFromTerms = ({
  terms,
  setTerms,
  product,
  attribute,
  selectedAttributes,
  setSelectedAttributes,
  index,
}) => {
  const [open, setOpen] = useState(false);
  const [addNew, setAddNew] = useState(false);
  const [newTerm, setNewTerm] = useState("");
   

  const addNewTermToGlobal = async () => {
    if (!newTerm.trim()) return;

    try {
      const response = await postApi(
        `${window.siteUrl}/wp-json/wc/v3/products/attributes/${attribute.id}/terms`,
        {
          name: newTerm.trim(),
        }
      );

      setTerms([...terms, response.data]);
      setNewTerm("");
      setAddNew(false);
      toast.success(t("Term added successfully"));
    } catch (error) {
      toast.error(error?.response?.data?.message || __("Failed to add term", "whizmanage"));
    }
  };

  const addTermToProduct = async (term) => {
    const newAttributes = [...selectedAttributes];
    if (!newAttributes[index].options.includes(term.name)) {
      newAttributes[index] = {
        ...newAttributes[index],
        options: [...newAttributes[index].options, term.name],
      };

      const key = "_" + newAttributes[index].slug; // מוסיף "_" לפני המחרוזת
      if (!Array.isArray(product[key])) {
        product[key] = []; // אתחול המפתח כמערך ריק אם אינו קיים או אינו מערך
    }
      product[key].push(term)

      setSelectedAttributes(newAttributes);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="h-6 w-6 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-400 text-slate-400 dar:hover:text-slate-200 flex justify-center items-center cursor-pointer">
          <Plus className="w-3 h-3" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="p-0 dark:bg-slate-800 w-64">
        <Command className="dark:bg-slate-800">
          {addNew ? (
            <div className="p-2 flex gap-2">
              <Input
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
                placeholder={__("New term", "whizmanage")}
                className="!border-none dark:!text-slate-300 !ring-0 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0 px-4"
              />
              {newTerm.trim() ? (
                <Button
                  variant="outline"
                  className="h-8"
                  onClick={addNewTermToGlobal}
                >
                  {__("Add", "whizmanage")}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="h-8"
                  onClick={() => setAddNew(false)}
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="flex border-b dark:border-slate-700">
                <CommandInput
                  placeholder={__("Search terms", "whizmanage")}
                  className="!border-none !ring-0"
                />
                <Button
                  variant="ghost"
                  className="h-9 px-2"
                  onClick={() => setAddNew(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <CommandList>
                <CommandEmpty>{__("No terms found", "whizmanage")}</CommandEmpty>
                <CommandGroup>
                  {terms.map((term) => (
                    <AddFromTermsItem
                      key={term.id}
                      term={term}
                      onSelect={() => addTermToProduct(term)}
                      isSelected={selectedAttributes[index].options.includes(
                        term.name
                      )}
                    />
                  ))}
                </CommandGroup>
              </CommandList>
            </>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default AddFromTerms;
