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
import { Check, Pencil, Plus, TextSearch, Undo2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import AddFromTerms from "./AddFromTerms";
import SelectOptionsItem from "./SelectOptionsItem";
import { getApi, postApi } from "/src/services/services";
import { __ } from '@wordpress/i18n';

const decodeUrlString = (encodedString) => {
  try {
    return decodeURIComponent(encodedString);
  } catch (e) {
    console.error("Error decoding URL component:", e);
    return encodedString;
  }
};

const SelectGlobalOptions = ({
  attribute,
  index,
  selectedAttributes,
  setSelectedAttributes,
  product,
}) => {
  const [open, setOpen] = useState(false);
  const [itemsExist, setItemsExist] = useState([...attribute.options]);
  const [addItem, setAddItem] = useState(false);
  const [addMultiple, setAddMultiple] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [terms, setTerms] = useState([]);
  const [values, setValues] = React.useState(new Set([]));
  const [isLoading, setIsLoading] = useState(false);

   

  useEffect(() => {
    setIsLoading(true);
    getApi(
      `${window.siteUrl}/wp-json/whizmanage/v1/taxonomy/_${attribute.slug}/terms`
    )
      .then((res) => {
        setTerms(res?.data || []);
      })
      .catch((error) => {
        console.log(
          error?.response?.data?.message || error || "Unknown error occurred"
        );
        setTerms([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

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

  const addNewItem = async (item) => {
    const itemData = {
      name: item,
    };
    try {
      const res = await postApi(
        `${window.siteUrl}/wp-json/wc/v3/products/attributes/${attribute.id}/terms`,
        itemData
      );
      setTerms((prevTerms) => [...prevTerms, res?.data]);

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
                position: attribute.position,
                variation: true,
                visible: true,
              },
            ],
          },
        ],
      };

      const updateRes = await postApi(
        `${window.siteUrl}/wp-json/wc/v3/products/batch`,
        data
      );
      setItemsExist((prevItems) => [...prevItems, item]);
      product.attributes = updateRes?.data.update[0].attributes;
      setTerms((prevTerms) => [item, ...prevTerms]);
      
      setNewItem(""); // נקה את השדה אחרי הוספה מוצלחת
      
    } catch (error) {
      toast(
        <div className="p-4 dark:bg-slate-800 w-full h-full dark:text-slate-300 !border-l-4 !border-l-red-500 rounded-md flex gap-4 items-center justify-start">
          <XCircle className="w-5 h-5 text-red-500" />
          {error?.response?.data?.message || error || "Unknown error occurred"}
        </div>,
        { duration: 5000 }
      );
    }
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
            <>
              {addMultiple ? (
                <AddFromTerms
                  terms={terms}
                  setTerms={setTerms}
                  values={values}
                  setValues={setValues}
                  itemsExist={itemsExist}
                  setItemsExist={setItemsExist}
                  product={product}
                  attribute={attribute}
                  setAddMultiple={setAddMultiple}
                />
              ) : (
                <div className="flex">
                  <CommandInput
                    placeholder={__(`Find option`, "whizmanage")}
                    className="!border-none !ring-0"
                  />
                  <div className="h-12 w-20 border-b dark:border-slate-700 flex justify-center items-center">
                    <Button
                      variant="ghost"
                      className="dark:hover:bg-slate-700 px-2 rounded-xl"
                      onClick={() => setAddItem(true)}
                    >
                      <Plus className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    </Button>
                    <Button
                      variant="ghost"
                      className="dark:hover:bg-slate-700 px-2 rounded-xl"
                      onClick={() => setAddMultiple(true)}
                    >
                      <TextSearch className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
          <CommandList>
            {/* CommandEmpty רק כשיש אופציות קיימות ומחפשים */}
            {!isLoading && itemsExist && itemsExist.length > 0 && (
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
                <span>{__("Any", "whizmanage")}{decodeUrlString(attribute.name)}</span>
              </CommandItem>
            </CommandGroup>

            <CommandGroup 
              heading={itemsExist && itemsExist.length > 0 ? __(`Options exist`, "whizmanage") : ""}
            >
              {isLoading ? (
                <div className="flex justify-center py-6">
                  <Loader />
                </div>
              ) : itemsExist && itemsExist.length > 0 ? (
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
                  />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center pt-2">
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

export default SelectGlobalOptions;