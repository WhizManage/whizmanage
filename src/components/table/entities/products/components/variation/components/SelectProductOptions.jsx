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
import { Input } from "@components/ui/input";
import CustomTooltip from "@components/ui/nextUI/Tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/ui/popover-portal";
import { Check, CheckSquare, Pencil, Plus, Undo2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
 import { __ } from "@wordpress/i18n";
import { useVariationsStore } from "../store/variationsStore";
import SelectOptionsItem from "./SelectOptionsItem";
import { putApi } from "/src/services/services";

/**
 * ✅ SelectProductOptions - מתוקן עם טעינת אופציות מ-product.attributes
 */
const SelectProductOptions = ({ attribute, index, product }) => {
  const [open, setOpen] = useState(false);
  const [addItem, setAddItem] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [isLoading, setIsLoading] = useState(false);
   

  // ✅ קבלת state מה-store
  const { selectedAttributes, setSelectedAttributes, setAllAttributes } =
    useVariationsStore();

  // ✅ חישוב האופציות הקיימות מ-product.attributes
  const getInitialOptions = () => {
    // קודם ננסה מ-product.attributes (המקור האמיתי)
    // Product attributes have id: 0, so we match by name
    const productAttr = product?.attributes?.find(
      (a) => a.id === 0 && a.name === attribute.name
    );

    if (productAttr?.options?.length > 0) {
      // ✅ סינון ערכים ריקים
      const opts = productAttr.options
        .map((opt) => (typeof opt === "string" ? opt : opt.name))
        .filter((opt) => opt && opt.trim() !== "");
      return opts;
    }

    // fallback ל-attribute prop
    const attrOpts = (attribute.options || [])
      .map((opt) => (typeof opt === "string" ? opt : opt.name))
      .filter((opt) => opt && opt.trim() !== "");
    return attrOpts;
  };

  const [itemsExist, setItemsExist] = useState(getInitialOptions);

  // ✅ עדכון itemsExist כש-product.attributes משתנה
  useEffect(() => {
    const productAttr = product?.attributes?.find(
      (a) => a.id === 0 && a.name === attribute.name
    );
    if (productAttr?.options?.length > 0) {
      // ✅ סינון ערכים ריקים
      const optionNames = productAttr.options
        .map((opt) => (typeof opt === "string" ? opt : opt.name))
        .filter((opt) => opt && opt.trim() !== "");

      if (
        optionNames.length > 0 &&
        JSON.stringify(optionNames) !== JSON.stringify(itemsExist)
      ) {
        setItemsExist(optionNames);
      }
    }
  }, [product?.attributes, attribute.name]);

  // ---------- Select all / clear ----------
  const currentAttribute = selectedAttributes?.[index] || { options: [] };
  const hasIds = !!itemsExist?.[0] && typeof itemsExist[0] === "object";

  const isAllOptionsSelected = useMemo(() => {
    if (!itemsExist?.length) return false;
    if (hasIds) {
      return itemsExist.every((it) =>
        currentAttribute.options?.some((opt) => opt?.id === it?.id)
      );
    }
    return itemsExist.every((val) =>
      (currentAttribute.options || []).includes(val)
    );
  }, [itemsExist, currentAttribute.options, hasIds]);

  const selectedCount = currentAttribute.options?.length || 0;

  const handleSelectAllOptions = () => {
    if (!selectedAttributes) return;
    const updated = selectedAttributes.map((attr, i) =>
      i === index ? { ...attr, options: [...itemsExist] } : attr
    );
    setSelectedAttributes(updated);
  };

  const handleClearSelection = () => {
    if (!selectedAttributes) return;
    const updated = selectedAttributes.map((attr, i) =>
      i === index ? { ...attr, options: [] } : attr
    );
    setSelectedAttributes(updated);
  };

  // ✅ הוספת option חדש - עם PUT endpoint
  const addNewItem = async (item) => {
    if (!item.trim()) return;

    setIsLoading(true);

    try {
      // ✅ סינון ערכים ריקים מ-itemsExist לפני הוספה
      const cleanExisting = itemsExist.filter(
        (opt) => opt && opt.trim() !== ""
      );
      const newOptions = [...cleanExisting, item.trim()];

      // ✅ קבלת כל ה-attributes מ-product
      const existingProductAttributes = product.attributes || [];

      const attrExistsInProduct = existingProductAttributes.some(
        (attr) => attr.id === 0 && attr.name === attribute.name
      );

      let updatedAttributes;

      if (attrExistsInProduct) {
        // עדכון attribute קיים - שמירה על כל השאר
        updatedAttributes = existingProductAttributes.map((attr, idx) => {
          if (attr.id === 0 && attr.name === attribute.name) {
            return {
              id: 0,
              name: attr.name,
              position: attr.position ?? idx,
              visible: true,
              variation: true,
              options: newOptions,
            };
          }
          return {
            id: attr.id,
            name: attr.name,
            slug: attr.slug,
            position: attr.position ?? idx,
            visible: attr.visible ?? true,
            variation: attr.variation ?? true,
            options: attr.options || [],
          };
        });
      } else {
        // הוספת attribute חדש - שמירה על כל הקיימים
        updatedAttributes = [
          ...existingProductAttributes.map((attr, idx) => ({
            id: attr.id,
            name: attr.name,
            slug: attr.slug,
            position: attr.position ?? idx,
            visible: attr.visible ?? true,
            variation: attr.variation ?? true,
            options: attr.options || [],
          })),
          {
            id: 0,
            name: attribute.name,
            position: existingProductAttributes.length,
            visible: true,
            variation: true,
            options: newOptions,
          },
        ];
      }

      // ✅ PUT endpoint
      const url = `${window.siteUrl}/wp-json/wc/v3/products/${product.id}`;
      const data = { attributes: updatedAttributes };

      const updateRes = await putApi(url, data);

      const responseAttributes = updateRes?.data?.attributes;

      if (responseAttributes && responseAttributes.length > 0) {
        product.attributes = responseAttributes;

        // עדכון itemsExist - סינון ערכים ריקים
        const ourAttr = responseAttributes.find(
          (a) => a.id === 0 && a.name === attribute.name
        );
        if (ourAttr?.options) {
          const cleanOpts = ourAttr.options.filter(
            (opt) => opt && opt.trim() !== ""
          );
          setItemsExist(cleanOpts);
        }

        // עדכון allAttributes
        if (typeof setAllAttributes === "function") {
          setAllAttributes((prev) => {
            const prevIds = new Set(responseAttributes.map((attr) => attr.id));
            const filteredPrev = prev.filter((attr) => !prevIds.has(attr.id));
            return [...responseAttributes, ...filteredPrev];
          });
        }

        toast.success(__("Option added successfully", "whizmanage"));
      }

      setNewItem("");
      setAddItem(false);
    } catch (error) {
      console.error("❌ API Error:", error);
      toast.error(
        error?.response?.data?.message || error || __("Unknown error occurred", "whizmanage")
      );
    } finally {
      setIsLoading(false);
    }
  };

  const onSelectAny = () => {
    const areAllSelected =
      itemsExist.length > 0 &&
      (hasIds
        ? itemsExist.every((item) =>
            currentAttribute.options?.find((opt) => opt.id === item.id)
          )
        : itemsExist.every((val) =>
            (currentAttribute.options || []).includes(val)
          ));

    const updatedSelectedAttributes = (selectedAttributes || []).map(
      (attr, idx) => {
        if (idx === index) {
          return {
            ...attr,
            options: areAllSelected ? [] : [...itemsExist],
          };
        }
        return attr;
      }
    );

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
      <PopoverContent className="p-0 dark:bg-slate-800 z-[9999]" align="start">
        <Command className="dark:bg-slate-800">
          {addItem ? (
            <div className="h-10 px-1 gap-1 flex items-center justify-between border-b dark:border-slate-700 w-full">
              <div className="relative w-full !h-8 border rounded-lg dark:bg-slate-700">
                <Input
                  type="text"
                  id="tagName"
                  value={newItem}
                  placeholder={__(`new option`, "whizmanage")}
                  className="!border-none dark:!text-slate-300 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base h-8 p-0"
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newItem.trim()) {
                      addNewItem(newItem);
                    } else if (e.key === "Escape") {
                      setAddItem(false);
                      setNewItem("");
                    }
                  }}
                />
              </div>
              {newItem.trim().length > 0 ? (
                <Button
                  variant="outline"
                  className="h-8 rounded-md"
                  onClick={() => addNewItem(newItem)}
                  disabled={isLoading}
                >
                  {isLoading ? "..." : __("Add", "whizmanage")}
                </Button>
              ) : (
                <CustomTooltip title={__("Cancel", "whizmanage")} instantClose>
                  <Button
                    variant="outline"
                    className="h-8 rounded-md"
                    onClick={() => setAddItem(false)}
                  >
                    <Undo2 />
                  </Button>
                </CustomTooltip>
              )}
            </div>
          ) : (
            <div className="flex border-b dark:border-slate-700 w-full items-center justify-between h-10 p-1">
              <CommandInput
                placeholder={__(`Find option`, "whizmanage")}
                className="!border-none !ring-0 h-8"
              />
              <CustomTooltip title={__("Add new option", "whizmanage")} instantClose>
                <Button
                  variant="ghost"
                  className="dark:hover:bg-slate-700 px-2 rounded-md !size-8"
                  onClick={() => setAddItem(true)}
                >
                  <Plus className="size-4 dark:text-slate-300" />
                </Button>
              </CustomTooltip>
            </div>
          )}

          <CommandList>
            {/* Toolbar: Select all / Clear + counter */}
            {itemsExist?.length > 0 && (
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
                <span className="text-xs p-0 h-3">
                  {selectedCount} {__("Selected", "whizmanage")}
                </span>
              </div>
            )}

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
                    selectedCount > 0 ? "opacity-0" : "opacity-100"
                  )}
                />
                <span className="flex gap-1.5">
                  <span>{__("Any")}</span>
                  <span>{attribute.name}</span>
                </span>
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
                    <h3 className="text-sm font-medium text-slate-900 dark:text-slate-200 mb-1">
                      {__("No options yet", "whizmanage")}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-300 mb-4">
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
