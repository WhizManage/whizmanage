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
import { CaretSortIcon } from "@radix-ui/react-icons";
import { Undo2 } from "lucide-react";
import AddFromTermsItem from "./AddFromTermsItem";
import { putApi } from "/src/services/services";
import { __ } from '@wordpress/i18n';
import { useState } from "react";


const AddFromTerms = ({
  terms,
  setTerms,
  values,
  setValues,
  itemsExist,
  setItemsExist,
  product,
  attribute,
  setAddMultiple,
  setAllAttributes
}) => {
   
  const [itemFoTaxonomy, setItemFoTaxonomy] = useState({})
  const addNewItems = async (items) => {
    const itemsArray = Array.isArray(items) ? items : [items];

    const newData = {
      id: attribute.id,
      name: attribute.name,
      slug: attribute.slug,
      options: [...itemsExist, ...itemsArray],
      // position: attribute.position || product.attributes.length,
      variation: true,
      visible: true,
    };
    const data = {
      attributes: [...product.attributes, newData],
    };

    try {
      const response = await putApi(
        `${window.siteUrl}/wp-json/wc/v3/products/${product.id}`,
        data
      );
      setItemsExist(itemsExist.concat(itemsArray));
      const key = "_" + attribute.slug;

      // בדיקה אם המפתח קיים, ואם לא - יצירת מערך ריק
      if (!product[key]) {
        product[key] = [];
      }

      // עכשיו ניתן לבצע push בבטחה
      product[key].push(itemFoTaxonomy);

      product.attributes = response?.data.attributes;
      setAllAttributes(prev => {
        const prevIds = new Set(product.attributes.map(pr => pr.id));
        const filteredPrev = prev.filter(attr => !prevIds.has(attr.id));
        return [...product.attributes, ...filteredPrev];
      })

      setValues(new Set([]));
    } catch (error) {
      console.error(
        "Failed to add items:",
        error?.response?.data?.message || error || "Unknown error occurred"
      );
    }
  };

  const isAllSelected = terms.length > 0 && values.size === terms.length;
  const remainingTerms = terms.filter(
    (t) => !values.has(t.name) && !itemsExist.includes(t.name)
  );
  const hasRemaining = remainingTerms.length > 0;

  const handleSelectAll = () => {
    const newValues = new Set(values);
    remainingTerms.forEach((t) => newValues.add(t.name)); // או t.id אם אתה שומר id
    setValues(newValues);
  };



  const handleClearAll = () => {
    setValues(new Set([]));
  };

  return (
    <div className="h-12 px-1 gap-1 flex items-center justify-center">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-10 rounded-lg w-52 gap-2">
            <span className="truncate flex-1">
              {values.size > 0
                ? Array.from(values).join(", ")
                : __("Select from terms", "whizmanage")}
            </span>
            <CaretSortIcon className="w-4 h-4" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="p-0 dark:bg-slate-700 w-52">
          <Command className="dark:bg-slate-700">
            <CommandList>
              <CommandInput
                placeholder={__(`Find in terms`, "whizmanage")}
                className="!border-none !ring-0 dark:!bg-slate-700"
              />
              <CommandEmpty>{__("No results found.", "whizmanage")}</CommandEmpty>
              <CommandGroup>
                <div className="flex justify-between items-center gap-2 px-3 pt-2">
                  <div className="flex gap-2">
                    {hasRemaining && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs gap-2 h-6 px-2 hover:bg-transparent hover:text-fuchsia-600"
                        onClick={handleSelectAll}
                      >
                        {__("Select all", "whizmanage")}
                      </Button>
                    )}

                    {!hasRemaining && values.size > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs gap-2 h-6 px-2 hover:bg-transparent hover:text-fuchsia-600"
                        onClick={handleClearAll}
                      >
                        {__("Clear all", "whizmanage")}
                      </Button>
                    )}

                  </div>
                  <span className="text-xs p-0">
                    {values.size} {__("Selected", "whizmanage")}
                  </span>
                </div>

                {terms.map((item) => (
                  <AddFromTermsItem
                    terms={terms}
                    item={item}
                    setTerms={setTerms}
                    values={values}
                    setValues={setValues}
                    itemsExist={itemsExist}
                    setItemsExist={setItemsExist}
                    attribute={attribute}
                    setItemFoTaxonomy={setItemFoTaxonomy}
                  />
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {values.size > 0 ? (
        <Button
          variant="outline"
          className="h-10 border-b rounded-lg"
          onClick={() => {
            const arrValues = [...values];
            addNewItems(arrValues);
            setAddMultiple(false);
          }}
        >
          {__("Add", "whizmanage")}
        </Button>
      ) : (
        <Button
          variant="outline"
          className="h-10 border-b rounded-lg"
          onClick={() => {
            setAddMultiple(false);
          }}
        >
          <Undo2 />
        </Button>
      )}
    </div>
  );
};

export default AddFromTerms;
