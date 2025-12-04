import { cn } from "@/lib/utils";
import Loader from "@components/Loader";
import CustomTooltip from "@components/nextUI/Tooltip";
import { Button } from "@components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@components/ui/command";
import { Input } from "@components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/ui/popover";
import { Check, Pencil, Plus, Undo2, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { __ } from '@wordpress/i18n';
import SelectOptionsItem from "./SelectOptionsItem";
import { postApi } from "/src/services/services";

const SelectProductOptions = ({
  attribute,
  index,
  selectedAttributes,
  setSelectedAttributes,
  product,
  setAllAttributes
}) => {
  const [open, setOpen] = useState(false);
  const [itemsExist, setItemsExist] = useState([...attribute.options]);
  const [addItem, setAddItem] = useState(false);
  const [newItem, setNewItem] = useState("");
   

  const addNewItem = async (item) => {
    const data = {
      update: [
        {
          id: product.id,
          attributes: [
            ...product.attributes,
            {
              id: attribute.id,
              name: attribute.name,
              slug: attribute.slug,
              options: [...itemsExist, item],
              variation: true,
              visible: true,
            },
          ],
        },
      ],
    };
    await postApi(`${window.siteUrl}/wp-json/wc/v3/products/batch`, data)
      .then((res) => {
        setItemsExist([...itemsExist, item]);
        product.attributes = res?.data.update[0].attributes;
        setAllAttributes(prev => {
          const productAttributes = product.attributes;
          const prevIds = new Set(productAttributes.map(attr => attr.id)); // מזהה מזהים קיימים מהחדשים
          const filteredPrev = prev.filter(attr => !prevIds.has(attr.id)); // מסנן כפילויות
          
          return [...productAttributes, ...filteredPrev]; // שם את החדשים בהתחלה
        });
        
        setNewItem(""); // נקה את השדה אחרי הוספה מוצלחת
        
      })
      .catch((error) => {
        toast(
          <div className="p-4 dark:bg-slate-800 w-full h-full dark:text-slate-300 !border-l-4 !border-l-red-500 rounded-md flex gap-4 items-center justify-start">
            <XCircle className="w-5 h-5 text-red-500" />
            {error?.response?.data?.message ||
              error ||
              "Unknown error occurred"}
          </div>,
          { duration: 5000 }
        );
      });
  };

  const onSelectAny = () => {
    const currentAttribute = selectedAttributes[index];

    const areAllSelected =
      itemsExist.length > 0 &&
      itemsExist.every((item) =>
        currentAttribute.options.find((opt) => opt.id === item.id)
      );

    const updatedSelectedAttributes = selectedAttributes.map((attr, idx) => {
      if (idx === index) {
        return {
          ...attr,
          options: areAllSelected ? [] : [...itemsExist],
        };
      }
      return attr;
    });

    setSelectedAttributes(updatedSelectedAttributes);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (!newOpen) setAddItem(false);
      }}
    >
      <CustomTooltip title={__("Add options", "whizmanage")}>
        <PopoverTrigger asChild>
          <div className="h-6 w-6 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-400 text-slate-400 dark:hover:text-slate-200 flex justify-center items-center cursor-pointer">
            <Pencil className="w-3 h-3" />
          </div>
        </PopoverTrigger>
      </CustomTooltip>
      <PopoverContent className="p-0 dark:bg-slate-800" align="start">
        <Command className="dark:bg-slate-800">
          {addItem ? (
            <div className="h-12 px-1 gap-1 flex items-center justify-center">
              <div className="relative h-10 border rounded-lg flex gap-1 items-center px-1 dark:bg-slate-700">
                <Input
                  type="text"
                  id="tagName"
                  value={newItem}
                  placeholder={__(`new option`, "whizmanage")}
                  className="!border-none dark:!text-slate-300 !ring-0 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0"
                  onChange={(e) => setNewItem(e.target.value)}
                />
              </div>
              {newItem.trim().length > 0 ? (
                <Button
                  variant="outline"
                  className="h-10 border-b rounded-lg"
                  onClick={() => {
                    addNewItem(newItem);
                    setAddItem(false);
                  }}
                >
                  {__("Add", "whizmanage")}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="h-10 rounded-lg"
                  onClick={() => {
                    setAddItem(false);
                  }}
                >
                  <Undo2 />
                </Button>
              )}
            </div>
          ) : (
            <div className="flex">
              <CommandInput
                placeholder={__(`Find option`, "whizmanage")}
                className="!border-none !ring-0"
              />
              <div className="h-12 w-12 border-b dark:border-slate-700 flex justify-center items-center">
                <Button
                  variant="ghost"
                  className="dark:hover:bg-slate-700 px-2 rounded-xl"
                  onClick={() => setAddItem(true)}
                >
                  <Plus className="w-5 h-5 dark:text-slate-400" />
                </Button>
              </div>
            </div>
          )}
          <CommandList>
            {/* CommandEmpty רק כשיש אופציות קיימות ומחפשים */}
            {itemsExist.length > 0 && (
              <CommandEmpty>{__("No results found.", "whizmanage")}</CommandEmpty>
            )}

            <CommandGroup>
              <CommandItem
                className="cursor-pointer dark:hover:bg-slate-700 flex"
                onSelect={onSelectAny}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedAttributes[index]?.options.length > 0
                      ? "opacity-0"
                      : "opacity-100"
                  )}
                />
                <span>{__("Any", "whizmanage")}{attribute.name}</span>
              </CommandItem>
            </CommandGroup>

            <CommandGroup 
              heading={itemsExist.length > 0 ? __(`Options exist`, "whizmanage") : ""}
            >
              {itemsExist.length > 0 ? (
                itemsExist.map((item, i) => (
                  <SelectOptionsItem
                    key={`${attribute.id}-${i}`}
                    product={product}
                    item={item}
                    itemsExist={itemsExist}
                    setItemsExist={setItemsExist}
                    attribute={attribute}
                    optionIndex={i}
                    attributeIndex={index}
                    selectedAttributes={selectedAttributes}
                    setSelectedAttributes={setSelectedAttributes}
                    setOpen={setOpen}
                    setAllAttributes={setAllAttributes}
                  />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center space-y-2 pt-2">
                  <div className="text-center">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-slate-200 mb-1">
                      {__("No options yet", "whizmanage")}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
                      {__("Create your first option to get started", "whizmanage")}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full max-w-xs"
                    onClick={() => setAddItem(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {__("Create Option", "whizmanage")}
                  </Button>
                </div>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default SelectProductOptions;