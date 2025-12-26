// src/components/table/products/components/variation/components/AddFromTerms.jsx

import { cn, toast } from "@/lib/utils";
import { Button } from "@components/ui/button";
import {
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@components/ui/command";
import { Input } from "@components/ui/input";
import { Check, CheckSquare, Undo2, X } from "lucide-react";
import { useMemo, useState } from "react";
 import { __ } from "@wordpress/i18n";
import { useVariationsStore } from "../store/variationsStore";
import { postApi, putApi } from "/src/services/services";
import CustomTooltip from "@components/ui/nextUI/Tooltip";

/**
 * 🎯 AddFromTerms
 * ✅ משתמש ב-PUT endpoint כמו הקוד הישן שעבד
 */
const AddFromTerms = ({ terms, product, attribute, index, setAddMultiple }) => {
  const [values, setValues] = useState(new Set());
  const [addNew, setAddNew] = useState(false);
  const [newTerm, setNewTerm] = useState("");
  const [localTerms, setLocalTerms] = useState(terms || []);
  const [isLoading, setIsLoading] = useState(false);
   

  // ✅ קבלת setAllAttributes מה-store
  const {
    selectedAttributes,
    setSelectedAttributes,
    setAllAttributes,
    addTerm,
  } = useVariationsStore();

  // ✅ לקחת את האופציות הקיימות מ-product.attributes (לא מ-selectedAttributes!)
  const itemsExist = useMemo(() => {
    // קודם ננסה מ-product.attributes (המקור האמיתי)
    const productAttr = product?.attributes?.find((a) => a.id === attribute.id);
    if (productAttr?.options?.length > 0) {
      return productAttr.options.map((opt) =>
        typeof opt === "string" ? opt : opt.name
      );
    }

    // fallback ל-selectedAttributes
    const attr = selectedAttributes?.[index];
    if (!attr?.options) return [];
    return attr.options.map((opt) =>
      typeof opt === "string" ? opt : opt.name
    );
  }, [product?.attributes, attribute.id, selectedAttributes, index]);

  const selectableTerms = useMemo(() => {
    return (localTerms || []).filter(
      (term) => term?.name && !itemsExist.includes(term.name)
    );
  }, [localTerms, itemsExist]);

  const isAllSelected = useMemo(() => {
    if (selectableTerms.length === 0) return false;
    return selectableTerms.every((term) => values.has(term.name));
  }, [selectableTerms, values]);

  const selectedCount = values.size;

  const handleTermSelect = (termName) => {
    setValues((prev) => {
      const next = new Set(prev);
      if (next.has(termName)) {
        next.delete(termName);
      } else {
        next.add(termName);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const allNames = new Set(selectableTerms.map((t) => t.name));
    setValues(allNames);
  };

  const handleClearSelection = () => {
    setValues(new Set());
  };

  const addNewTermToGlobal = async () => {
    if (!newTerm.trim()) return;

    try {
      const res = await postApi(
        `${window.siteUrl}/wp-json/wc/v3/products/attributes/${attribute.id}/terms`,
        { name: newTerm.trim() }
      );

      addTerm(attribute.id, res?.data);
      setLocalTerms((prev) => [...prev, res.data]);
      setValues((prev) => new Set([...prev, res.data.name]));
      setNewTerm("");
      setAddNew(false);

      toast.success(__("Term added successfully", "whizmanage"));
    } catch (error) {
      toast.error(
        error?.response?.data?.message || __("Unknown error occurred", "whizmanage")
      );
    }
  };

  /**
   * ✅ שמירה ל-API עם PUT (כמו הקוד הישן שעבד!)
   */
  const addSelectedToProduct = async () => {
    const namesToAdd = Array.from(values);

    if (namesToAdd.length === 0) {
      setAddMultiple(false);
      return;
    }

    setIsLoading(true);

    try {
      // מציאת ה-slugs של ה-terms שנבחרו
      const selectedTerms = (localTerms || []).filter((t) =>
        namesToAdd.includes(t.name)
      );
      const slugsToAdd = selectedTerms.map((t) => t.slug || t.name);

      // ה-options הקיימים - צריך לשלוח slugs!
      const existingOptions = itemsExist.map((optName) => {
        const term = (localTerms || []).find((t) => t.name === optName);
        return term?.slug || optName;
      });

      const newOptions = [...existingOptions, ...slugsToAdd];

      const existingProductAttributes = product.attributes || [];

      const attrExistsInProduct = existingProductAttributes.some(
        (attr) => attr.id === attribute.id
      );

      let updatedAttributes;

      if (attrExistsInProduct) {
        // עדכון attribute קיים
        updatedAttributes = existingProductAttributes.map((attr, idx) => {
          if (attr.id === attribute.id) {
            return {
              id: attr.id,
              name: attr.name,
              slug: attr.slug,
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
        // הוספת attribute חדש
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
            id: attribute.id,
            name: attribute.name,
            slug: attribute.slug,
            position: existingProductAttributes.length,
            options: newOptions,
            variation: true,
            visible: true,
          },
        ];
      }

      // ✅ PUT endpoint - כמו הקוד הישן!
      const url = `${window.siteUrl}/wp-json/wc/v3/products/${product.id}`;
      const data = { attributes: updatedAttributes };

      const updateRes = await putApi(url, data);

      const responseAttributes = updateRes?.data?.attributes;

      if (responseAttributes && responseAttributes.length > 0) {
        // ✅ בדיקה אם ה-attribute שלנו חזר ברספונס
        const ourAttr = responseAttributes.find((a) => a.id === attribute.id);

        if (!ourAttr) {
          console.error(
            "⚠️ Attribute ID",
            attribute.id,
            "not found in response!"
          );
          toast.error(
            __(
              "Error: Attribute not found in WordPress. Please create it first.",
              "whizmanage"
            )
          );
          setAddMultiple(false);
          setIsLoading(false);
          return;
        }

        product.attributes = responseAttributes;

        // עדכון selectedAttributes
        const updatedSelectedAttributes = selectedAttributes.map(
          (attr, idx) => {
            if (idx === index) {
              const updatedAttr = responseAttributes.find(
                (a) => a.id === attribute.id
              );
              return {
                ...attr,
                options: updatedAttr?.options || newOptions,
              };
            }
            return attr;
          }
        );
        setSelectedAttributes(updatedSelectedAttributes);

        if (typeof setAllAttributes === "function") {
          setAllAttributes((prev) => {
            const prevIds = new Set(responseAttributes.map((attr) => attr.id));
            const filteredPrev = prev.filter((attr) => !prevIds.has(attr.id));
            const newAll = [...responseAttributes, ...filteredPrev];
            return newAll;
          });
        } else {
          console.log("❌ setAllAttributes is NOT a function!");
        }

        // עדכון product["_"+slug]
        const key = "_" + attribute.slug;
        if (!Array.isArray(product[key])) {
          product[key] = [];
        }

        const existingKeys = new Set(
          product[key].map((x) => (x?.id ?? x?.name ?? "").toString())
        );

        (localTerms || [])
          .filter((tm) => namesToAdd.includes(tm?.name))
          .forEach((tm) => {
            const k = (tm?.id ?? tm?.name ?? "").toString();
            if (!existingKeys.has(k)) {
              product[key].push(tm);
              existingKeys.add(k);
            }
          });

        toast.success(
          `${__("Options imported successfully", "whizmanage")} (${namesToAdd.length})`
        );
      } else {
        console.error("⚠️ API returned empty attributes!");
        toast.warning(
          __(
            "Warning: Server returned empty attributes. Check if the attribute slug is in English.",
            "whizmanage"
          )
        );
      }

      setAddMultiple(false);
    } catch (error) {
      console.error("❌ API Error:", error);
      console.error("Error details:", error?.response?.data);

      toast.error(error?.response?.data?.message || __("Error saving options", "whizmanage"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {addNew ? (
        <div className="h-10 px-1 gap-1 flex items-center justify-between border-b dark:border-slate-700 w-full">
          <div className="relative w-full !h-8 border rounded-lg dark:bg-slate-700">
            <Input
              type="text"
              value={newTerm}
              placeholder={__(`new term`, "whizmanage")}
              className="!border-none dark:!text-slate-300 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base h-8 p-0"
              onChange={(e) => setNewTerm(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter" && newTerm.trim()) {
                  addNewTermToGlobal();
                } else if (e.key === "Escape") {
                  setAddNew(false);
                  setNewTerm("");
                }
              }}
            />
          </div>
          {newTerm.trim().length > 0 ? (
            <Button
              variant="outline"
              className="h-8 rounded-md"
              onClick={addNewTermToGlobal}
            >
              {__("Add", "whizmanage")}
            </Button>
          ) : (
            <CustomTooltip title={__("Cancel", "whizmanage")} instantClose>
              <Button
                variant="outline"
                className="h-8 rounded-md"
                onClick={() => {
                  setAddNew(false);
                  setNewTerm("");
                }}
              >
                <Undo2 />
              </Button>
            </CustomTooltip>
          )}
        </div>
      ) : (
        <div className="flex border-b dark:border-slate-700 w-full items-center justify-between h-10 p-1">
          <CommandInput
            placeholder={__(`Find term`, "whizmanage")}
            className="!border-none !ring-0 h-8"
          />
        </div>
      )}
      <CommandList>
        {selectableTerms.length > 0 && (
          <div className="flex justify-between items-center gap-2 px-3 py-2 border-b dark:border-slate-700">
            <div className="flex gap-2">
              {!isAllSelected && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-2 h-6 px-2"
                  onClick={handleSelectAll}
                >
                  <CheckSquare className="size-3.5" />
                  {__("Select all", "whizmanage")}
                </Button>
              )}
              {selectedCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-2 h-6 px-2"
                  onClick={handleClearSelection}
                >
                  <X className="size-3.5" />
                  {__("Clear", "whizmanage")}
                </Button>
              )}
            </div>
            {selectedCount > 0 && (
              <span className="text-xs text-slate-500">
                {selectedCount} {__("selected", "whizmanage")}
              </span>
            )}
          </div>
        )}

        <CommandEmpty>{__("No terms found.", "whizmanage")}</CommandEmpty>

        <CommandGroup>
          {localTerms && localTerms.length > 0 ? (
            localTerms.map((term) => {
              const isAlreadyInProduct = itemsExist.includes(term.name);
              const isSelected = values.has(term.name);

              return (
                <CommandItem
                  key={term.id}
                  className="cursor-pointer dark:aria-selected:bg-slate-800 flex gap-2 group/item justify-between min-h-9"
                  disabled={isAlreadyInProduct}
                  onSelect={() => {
                    if (!isAlreadyInProduct) {
                      handleTermSelect(term.name);
                    }
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 size-4",
                      isSelected ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="flex-1">
                    {term?.name?.replace(/\\/g, "").replace(/"/g, "''") || ""}
                  </span>
                  {isAlreadyInProduct && (
                    <span className="text-xs text-slate-400">
                      {__("Already added", "whizmanage")}
                    </span>
                  )}
                </CommandItem>
              );
            })
          ) : (
            <div className="p-4 text-center text-slate-500">
              {__("No terms available", "whizmanage")}
            </div>
          )}
        </CommandGroup>
      </CommandList>
      <div className="p-2 flex justify-end gap-2 border-t dark:border-slate-700">
        <Button
          variant="outline"
          onClick={() => setAddMultiple(false)}
          disabled={isLoading}
        >
          {__("Cancel", "whizmanage")}
        </Button>
        {selectedCount > 0 && (
          <Button
            variant="default"
            onClick={addSelectedToProduct}
            disabled={isLoading}
          >
            {isLoading ? __("Saving...", "whizmanage") : `${__("Import", "whizmanage")} (${selectedCount})`}
          </Button>
        )}
      </div>
    </>
  );
};

export default AddFromTerms;
