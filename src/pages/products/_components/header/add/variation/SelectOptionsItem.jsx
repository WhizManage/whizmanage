import Button from "@components/ui/button";
import { CommandItem } from "@components/ui/command";
import { Input } from "@components/ui/input";
import { cn } from "@heroui/react";
import { Check, CheckCircle, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { __ } from '@wordpress/i18n';
import { postApi } from "/src/services/services";

const SelectOptionsItem = ({
  product,
  item,
  itemsExist,
  setItemsExist,
  attribute,
  optionIndex,
  attributeIndex,
  selectedAttributes,
  setSelectedAttributes,
  setOpen,
  setAllAttributes
}) => {
  const [isEditItem, setIsEditItem] = useState(false);
  const [newName, setNewName] = useState("");
   
  const editItem = async () => {
    if (optionIndex < 0 || optionIndex >= itemsExist.length) {
      console.error("Invalid option index");
      return;
    }

    const updatedOptions = itemsExist.map((option, idx) =>
      idx === optionIndex ? newName : option
    );

    try {
      const data = {
        update: [
          {
            id: product.id,
            attributes: product.attributes.map((attr) =>
              attr.id === attribute.id
                ? { ...attr, options: updatedOptions }
                : attr
            ),
          },
        ],
      };

      const response = await postApi(
        `${window.siteUrl}/wp-json/wc/v3/products/batch`,
        data
      );

      // Update the product's attributes
      product.attributes = response?.data.update[0].attributes;
      
      // Update allAttributes state
      setAllAttributes(prev => {
        const productAttributes = product.attributes;
        const prevIds = new Set(productAttributes.map(attr => attr.id));
        const filteredPrev = prev.filter(attr => !prevIds.has(attr.id));

        return [...productAttributes, ...filteredPrev];
      });
      

      setItemsExist(updatedOptions);
      toast(
        <div className="p-4 w-full h-full !border-l-4 !border-l-fuchsia-600 dark:bg-slate-800 dark:text-slate-300 rounded-md flex gap-4 items-center justify-start">
          <CheckCircle className="w-5 h-5 text-fuchsia-600" />
          {`${__("The options has been successfully updated to", "whizmanage")} "${newName}".`}
        </div>,
        { duration: 5000 }
      );
      setIsEditItem(false);
      setNewName("");
    } catch (error) {
      console.log("Error editing options", error);
    }
  };

  const deleteItem = async () => {
    const updatedOptions = itemsExist.filter((existItem, idx) => idx !== optionIndex);

    setItemsExist(updatedOptions);
    console.log(updatedOptions);
    const updatedAttributes = product.attributes.map((attr) =>
      attr.id === attribute.id ? { ...attr, options: updatedOptions } : attr
    );
    
    const data = {
      update: [
        {
          id: product.id,
          attributes: updatedAttributes,
        },
      ],
    };
    
    try {
      const updateRes = await postApi(
        `${window.siteUrl}/wp-json/wc/v3/products/batch`,
        data
      );
    
      product.attributes = updateRes?.data.update[0].attributes.map(attr => attr.id === attribute.id ? {...attr, options: safeUpdatedOptions} : attr);
      console.log(product.attributes);
      setAllAttributes(prev => {
        const productAttributes = product.attributes;
        const prevIds = new Set(productAttributes.map(attr => attr.id));
        const filteredPrev = prev.filter(attr => !prevIds.has(attr.id));
        return [...updatedAttributes, ...filteredPrev];
      });
    
      toast(
        <div className="p-4 w-full h-full !border-l-4 !border-l-fuchsia-600 dark:bg-slate-800 dark:text-slate-300 rounded-md flex gap-4 items-center justify-start">
          <CheckCircle className="w-5 h-5 text-fuchsia-600" />
          {`${__("The option", "whizmanage")} "${item}" ${__("has been successfully deleted", "whizmanage")}.`}
        </div>,
        { duration: 5000 }
      );
    } catch (error) {
      console.error("Error deleting option", error);npm 
      setItemsExist([...itemsExist]); // מחזירים את האופציה במקרה של שגיאה
    }
  };
      
  const onSelectOption = (item) => {
    const updatedSelectedAttributes = selectedAttributes.map((attr, idx) => {
      if (idx === attributeIndex) {
        const isAlreadySelected = attr.options.some((t) =>
          t.id ? t.id === item.id : t === item
        );
        const newSelectedOptions = isAlreadySelected
          ? attr.options.filter((t) => (t.id ? t.id !== item.id : t !== item))
          : [...attr.options, item];
        return {
          ...attr,
          options: newSelectedOptions,
        };
      }
      return attr;
    });
    setSelectedAttributes(updatedSelectedAttributes);
    setOpen(true);
  };

  return (
    <CommandItem
      className="cursor-pointer dark:hover:bg-slate-700 group/item flex gap-2 justify-between min-h-9"
      key={`${attribute.id}-${optionIndex}-${item}`}
      onSelect={() => onSelectOption(item)}
    >
      {isEditItem ? (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Input
            onChange={(e) => {
              e.stopPropagation();
              setNewName(e.target.value);
            }}
            defaultValue={item}
            className="h-8 w-full"
            onFocus={(event) => {
              event.target.select();
              event.stopPropagation();
            }}
          />
          <Button
            variant="outline"
            className="h-8"
            onClick={(e) => {
              e.stopPropagation();
              editItem();
              setIsEditItem(false);
            }}
          >
            {__("Save", "whizmanage")}
          </Button>
        </div>
      ) : (
        <>
          <Check
            className={cn(
              "mr-2 size-4",
              selectedAttributes[attributeIndex]?.options.some(
                (t) => t === item
              )
                ? "opacity-100"
                : "opacity-0"
            )}
          />

          <span className="flex-1">{item.replace(/\\/g, '').replace(/"/g, "''")}</span>
          <span className="sr-only">{optionIndex}</span>
          <div className="hidden group-hover/item:flex gap-1 !max-w-fit">
            <Button
              size="icon"
              variant="outline"
              className="w-6 h-6"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditItem(true);
              }}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="w-6 h-6"
              onClick={(e) => {
                e.stopPropagation();
                deleteItem();
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </>
      )}
    </CommandItem>
  );
};

export default SelectOptionsItem;