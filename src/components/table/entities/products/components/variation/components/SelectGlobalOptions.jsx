// src/components/table/products/components/variation/components/SelectGlobalOptions.jsx

import { cn, toast } from "@/lib/utils";
import { Button } from "@components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@components/ui/command";
import Loader from "@components/ui/custom/Loader";
import { Input } from "@components/ui/input";
import CustomTooltip from "@components/ui/nextUI/Tooltip";
import {
  Check,
  CheckSquare,
  Pencil,
  Plus,
  TextSearch,
  Undo2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
 import { __ } from "@wordpress/i18n";
import { useVariationsStore } from "../store/variationsStore";
import AddFromTerms from "./AddFromTerms";
import SelectOptionsItem from "./SelectOptionsItem";
import { postApi } from "/src/services/services";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/ui/popover-portal";

/**
 * ✅ SelectGlobalOptions - מתוקן עם העברת setAllAttributes ל-AddFromTerms
 */
const SelectGlobalOptions = ({ attribute, index, product }) => {
  const [open, setOpen] = useState(false);
  const [addItem, setAddItem] = useState(false);
  const [addMultiple, setAddMultiple] = useState(false);
  const [newItem, setNewItem] = useState("");
   


  // Store - ✅ כולל setAllAttributes מה-store
  const {
    selectedAttributes,
    setSelectedAttributes,
    allAttributes,
    setAllAttributes,
    termsCache,
    termsLoading,
    loadTermsForAttribute,
    addTerm,
  } = useVariationsStore();

  // ✅ חישוב האופציות הקיימות מ-product.attributes או selectedAttributes
  const getInitialOptions = () => {


    // קודם ננסה מ-selectedAttributes
    const storeAttr = selectedAttributes?.[index];
    if (storeAttr?.options?.length > 0) {
      const opts = storeAttr.options.map((opt) =>
        typeof opt === "string" ? opt : opt.name
      );
      return opts;
    }

    // אחרי זה ננסה מ-product.attributes (למקרה של refresh)
    const productAttr = product?.attributes?.find((a) => a.id === attribute.id);
    if (productAttr?.options?.length > 0) {
      const opts = productAttr.options.map((opt) =>
        typeof opt === "string" ? opt : opt.name
      );
      return opts;
    }

    // לבסוף מה-attribute prop
    const attrOpts =
      attribute.options?.map((opt) =>
        typeof opt === "string" ? opt : opt.name
      ) || [];
    return attrOpts;
  };

  const [itemsExist, setItemsExist] = useState(getInitialOptions);

  // ✅ עדכון itemsExist רק מ-product.attributes (האופציות הזמינות)
  // לא מ-selectedAttributes (שמכיל את האופציות הנבחרות)
  useEffect(() => {
    const productAttr = product?.attributes?.find((a) => a.id === attribute.id);
    if (productAttr?.options?.length > 0) {
      const optionNames = productAttr.options.map((opt) =>
        typeof opt === "string" ? opt : opt.name
      );
      if (JSON.stringify(optionNames) !== JSON.stringify(itemsExist)) {
        setItemsExist(optionNames);
      }
    }
  }, [product?.attributes, attribute.id]);

  // טעינת terms מה-Store
  useEffect(() => {
    if (open && attribute.id && attribute.slug) {
      loadTermsForAttribute(attribute.id, attribute.slug);
    }
  }, [open, attribute.id, attribute.slug, loadTermsForAttribute]);

  const terms = termsCache[attribute.id] || [];
  const isLoading = termsLoading[attribute.id] || false;

  // אופציות נוכחיות (רשימה 3 - chips)
  const currentAttribute = selectedAttributes[index] || { options: [] };
  const selectedOptions = useMemo(() => {
    return (currentAttribute.options || []).map((opt) =>
      typeof opt === "string" ? opt : opt.name
    );
  }, [currentAttribute.options]);

  const selectedCount = selectedOptions.length;

  // האם כל ה-options נבחרו
  const isAllOptionsSelected = useMemo(() => {
    if (!itemsExist?.length) return false;
    return itemsExist.every((item) => selectedOptions.includes(item));
  }, [itemsExist, selectedOptions]);

  // Select all
  const handleSelectAllOptions = () => {
    const updatedSelectedAttributes = [...selectedAttributes];
    updatedSelectedAttributes[index] = {
      ...updatedSelectedAttributes[index],
      options: [...itemsExist],
    };
    setSelectedAttributes(updatedSelectedAttributes);
  };

  // Clear selection
  const handleClearSelection = () => {
    const updatedSelectedAttributes = [...selectedAttributes];
    updatedSelectedAttributes[index] = {
      ...updatedSelectedAttributes[index],
      options: [],
    };
    setSelectedAttributes(updatedSelectedAttributes);
  };

  // בחירת "Any"
  const onSelectAny = () => {
    const updatedSelectedAttributes = [...selectedAttributes];
    updatedSelectedAttributes[index] = {
      ...updatedSelectedAttributes[index],
      options: [],
    };
    setSelectedAttributes(updatedSelectedAttributes);
    setOpen(false);
  };

  // הוספת option חדש - כמו בקוד הישן עם שמירה ל-API
  const addNewItem = async (item) => {
    if (!item.trim()) return;

    try {
      // 1️⃣ הוספת term חדש ל-taxonomy
      const termRes = await postApi(
        `${window.siteUrl}/wp-json/wc/v3/products/attributes/${attribute.id}/terms`,
        { name: item }
      );

      // עדכון cache
      addTerm(attribute.id, termRes?.data);

      // 2️⃣ עדכון product["_"+slug]
      const key = "_" + attribute.slug;
      if (!product[key]) {
        product[key] = [termRes?.data];
      } else {
        product[key].push(termRes?.data);
      }

      // 3️⃣ שליחה ל-API - עדכון attributes במוצר
      const newOptions = [...itemsExist, item];

      const existingProductAttributes = product.attributes || [];
      const attrExistsInProduct = existingProductAttributes.some(
        (attr) => attr.id === attribute.id
      );

      let updatedAttributes;

      if (attrExistsInProduct) {
        updatedAttributes = existingProductAttributes.map((attr) => {
          if (attr.id === attribute.id) {
            return {
              ...attr,
              options: newOptions,
              variation: true,
              visible: true,
            };
          }
          return attr;
        });
      } else {
        updatedAttributes = [
          ...existingProductAttributes,
          {
            id: attribute.id,
            name: attribute.name,
            slug: attribute.slug,
            options: newOptions,
            position: attribute.position || existingProductAttributes.length,
            variation: true,
            visible: true,
          },
        ];
      }

      const data = {
        update: [
          {
            id: product.id,
            attributes: updatedAttributes,
          },
        ],
      };

      const updateRes = await postApi(
        `${window.siteUrl}/wp-json/wc/v3/products/batch`,
        data
      );

      // 4️⃣ עדכון product.attributes
      const responseAttributes = updateRes?.data?.update?.[0]?.attributes;
      if (responseAttributes) {
        product.attributes = responseAttributes;
      }

      // 5️⃣ עדכון local state
      setItemsExist(newOptions);

      // 6️⃣ עדכון selectedAttributes
      const updatedSelectedAttributes = [...selectedAttributes];
      updatedSelectedAttributes[index] = {
        ...updatedSelectedAttributes[index],
        options: newOptions,
      };
      setSelectedAttributes(updatedSelectedAttributes);

      // 7️⃣ עדכון allAttributes
      if (typeof setAllAttributes === "function" && responseAttributes) {
        setAllAttributes((prev) => {
          const prevIds = new Set(responseAttributes.map((attr) => attr.id));
          const filteredPrev = prev.filter((attr) => !prevIds.has(attr.id));
          return [...responseAttributes, ...filteredPrev];
        });
      }

      setNewItem("");
      setAddItem(false);

      toast.success(__("Option added successfully", "whizmanage"));
    } catch (error) {
      toast.error(error?.response?.data?.message || __("Unknown error occurred", "whizmanage"));
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <CustomTooltip title={__("Select options", "whizmanage")}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-400 text-slate-400 dark:hover:text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <Pencil className="w-3 h-3" />
          </Button>
        </PopoverTrigger>
      </CustomTooltip>
      <PopoverContent
        className="w-72 p-0 z-[9999]"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
      >
        <Command className="dark:bg-slate-800">
          {/* Header */}
          {addItem ? (
            <div className="h-10 px-1 gap-1 flex items-center justify-between border-b dark:border-slate-700 w-full">
              <div className="relative w-full !h-8 border rounded-lg dark:bg-slate-700">
                <Input
                  type="text"
                  value={newItem}
                  placeholder={__(`new option`, "whizmanage")}
                  className="!border-none dark:!text-slate-300 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base h-8 p-0"
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter" && newItem.trim()) {
                      addNewItem(newItem.trim());
                    } else if (e.key === "Escape") {
                      setAddItem(false);
                      setNewItem("");
                    }
                  }}
                />
              </div>
              <Button
                variant="outline"
                className="h-8 rounded-md"
                onClick={() => {
                  if (newItem.trim()) {
                    addNewItem(newItem.trim());
                  } else {
                    setAddItem(false);
                    setNewItem("");
                  }
                }}
              >
                {newItem.trim() ? __("Add", "whizmanage") : <Undo2 />}
              </Button>
            </div>
          ) : addMultiple ? (
            <AddFromTerms
              terms={terms}
              product={product}
              attribute={attribute}
              index={index}
              setAddMultiple={setAddMultiple}
              setAllAttributes={setAllAttributes}
            />
          ) : (
            <div className="flex border-b dark:border-slate-700 p-1">
              <CommandInput
                placeholder={__(`Find option`, "whizmanage")}
                className="!border-none !border-b-0 h-8 !ring-0"
              />
              <CustomTooltip title={__("Add new option", "whizmanage")} instantClose>
                <Button
                  variant="ghost"
                  className="size-8 p-0 dark:hover:bg-slate-700 rounded-md"
                  onClick={() => setAddItem(true)}
                >
                  <Plus className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                </Button>
              </CustomTooltip>
              <CustomTooltip title={__("Import from terms", "whizmanage")} instantClose>
                <Button
                  variant="ghost"
                  className="size-8 p-0 dark:hover:bg-slate-700 rounded-md"
                  onClick={() => setAddMultiple(true)}
                >
                  <TextSearch className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                </Button>
              </CustomTooltip>
            </div>
          )}

          {/* Content - only show when not in addMultiple mode */}
          {!addMultiple && (
            <CommandList>
              {/* Select all / Clear buttons */}
              {itemsExist.length > 0 && (
                <div className="flex justify-between items-center gap-2 px-2.5 py-1.5">
                  <div className="flex gap-2">
                    {!isAllOptionsSelected && (
                      <button
                        variant="ghost"
                        size="sm"
                        className="text-xs flex gap-2 h-3 hover:text-muted-foreground hover:bg-transparent p-0 border-0"
                        onClick={handleSelectAllOptions}
                      >
                        <CheckSquare className="size-3.5" />
                        {__("Select all", "whizmanage")}
                      </button>
                    )}
                    {selectedCount > 0 && (
                      <button
                        variant="ghost"
                        size="sm"
                        className="text-xs flex gap-2 h-3 hover:text-muted-foreground hover:bg-transparent p-0 border-0"
                        onClick={handleClearSelection}
                      >
                        <X className="size-3.5" />
                        {__("Clear selection", "whizmanage")}
                      </button>
                    )}
                  </div>
                  {selectedCount > 0 && (
                    <span className="text-xs text-slate-500">
                      {selectedCount} {__("selected", "whizmanage")}
                    </span>
                  )}
                </div>
              )}

              {/* Empty state */}
              {!isLoading && itemsExist.length === 0 && (
                <CommandEmpty>{__("No options yet", "whizmanage")}</CommandEmpty>
              )}

              <CommandGroup>
                {isLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader />
                  </div>
                ) : itemsExist.length > 0 ? (
                  <>
                    {/* "Any" option */}
                    <CommandItem
                      className="cursor-pointer flex"
                      onSelect={onSelectAny}
                    >
                      <Check
                        className={cn(
                          "me-2 h-4 w-4",
                          selectedCount === 0 ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span>
                        {__("Any", "whizmanage")} {attribute.name}
                      </span>
                    </CommandItem>

                    {/* Divider */}
                    <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />

                    {/* Options list */}
                    {itemsExist.map((item, i) => (
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
                    ))}

                    {/* Import from terms */}
                    <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
                    <CommandItem
                      className="cursor-pointer flex text-fuchsia-600"
                      onSelect={() => setAddMultiple(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      <span>{__("Import from terms...", "whizmanage")}</span>
                    </CommandItem>
                  </>
                ) : (
                  // Empty state
                  (<div className="flex flex-col items-center justify-center py-6">
                    <div className="text-center">
                      <h3 className="text-sm font-medium text-slate-900 dark:text-slate-200 my-2">
                        {__("No options yet", "whizmanage")}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-300 mb-4">
                        {__("Create options or import from terms", "whizmanage")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => setAddItem(true)}
                      >
                        <Plus className="size-4" />
                        {__("Add", "whizmanage")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => setAddMultiple(true)}
                      >
                        <TextSearch className="size-4" />
                        {__("Import", "whizmanage")}
                      </Button>
                    </div>
                  </div>)
                )}
              </CommandGroup>
            </CommandList>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default SelectGlobalOptions;
