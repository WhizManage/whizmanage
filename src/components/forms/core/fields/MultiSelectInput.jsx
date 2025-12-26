// src/components/forms/core/fields/MultiSelectInput.jsx
import MultiSelectEditItem from "@/components/table/components/MultiSelectEditItem";
import { useCoreTaxonomiesStore } from "@/components/table/store/useCoreTaxonomiesStore";
import { useCustomTaxonomiesStore } from "@/components/table/store/useCustomTaxonomiesStore";
import { Button } from "@components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
} from "@components/ui/command";
import Loader from "@components/ui/custom/Loader";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@components/ui/hover-card";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import CustomTooltip from "@components/ui/nextUI/Tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/ui/popover-portal";
import { Chip } from "@heroui/react";
import { ChevronsUpDown, Info, Plus, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Controller } from "react-hook-form";
 import { __ ,sprintf } from "@wordpress/i18n";
import { useGenericForm } from "../FormProvider";
import { postApi } from "/src/services/services";

const CORE = new Set([
  "product_cat",
  "_product_cat",
  "categories",
  "product_tag",
  "tags",
]);

const isCoreTax = (n) => CORE.has(String(n || ""));

export default function MultiSelectInput({
  name,
  label,
  rules,
  placeholder,
  helperText,
  taxonomyType,
  source,
}) {
   
  const { control } = useGenericForm();

  const [isOpen, setIsOpen] = useState(false);
  const [itemsExist, setItemsExist] = useState([]);
  const [addItem, setAddItem] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // בשביל הפורטל בתוך המודל
  const triggerRef = useRef(null);
  const [portalContainer, setPortalContainer] = useState(null);

  // core store
  const {
    categories,
    tags,
    updateTaxonomy,
    isLoading: isCoreLoading,
    loadTaxonomiesOnce,
  } = useCoreTaxonomiesStore();

  // custom store
  const custom = useCustomTaxonomiesStore();

  const effectiveName = taxonomyType || name; // שם הטקסונומיה בפועל
  const isCore = isCoreTax(effectiveName);

  // apiSlug
  const apiSlug = useMemo(() => {
    if (
      effectiveName === "product_cat" ||
      effectiveName === "_product_cat" ||
      name === "categories"
    ) {
      return "categories";
    }
    if (effectiveName === "product_tag" || name === "tags") {
      return "tags";
    }
    return effectiveName;
  }, [effectiveName, name]);

const toStr = (v) => {
  if (typeof v === "string") return v;
  if (v?.label) return String(v.label);
  if (v?.name) return String(v.name);
  return String(v ?? "");
};

const columnLabel = name === "categories" || name === "tags" ? name : label;
const labelT = __(toStr(columnLabel), "whizmanage");

const TT = (key, ...args) => sprintf(__(key, "whizmanage"), ...args);

  // מיון קטגוריות עם depth
  const sortCategoriesWithDepth = useCallback((cats) => {
    const categoryMap = new Map();
    cats.forEach((c) => categoryMap.set(c.id, { ...c, depth: 0 }));
    const out = [];

    function walk(cat, depth) {
      cat.depth = depth;
      out.push(cat);
      cats
        .filter((x) => x.parent === cat.id)
        .sort((a, b) => (a.menu_order || 0) - (b.menu_order || 0))
        .forEach((child) => walk(categoryMap.get(child.id), depth + 1));
    }

    cats
      .filter((c) => c.parent === 0)
      .sort((a, b) => (a.menu_order || 0) - (b.menu_order || 0))
      .forEach((c) => walk(categoryMap.get(c.id), 0));

    return out;
  }, []);

  // מציאת מיכל פורטל (מודל) קרוב – כמו ב־MultiSelectEdit
  useEffect(() => {
    if (!isOpen || typeof document === "undefined") {
      setPortalContainer(null);
      return;
    }

    const findClosestModal = () => {
      if (!triggerRef.current) return document.body;
      let el = triggerRef.current;

      while (el && el !== document.body) {
        if (el.getAttribute("role") === "dialog") return el;
        el = el.parentElement;
      }

      const openModal =
        document.querySelector('[role="dialog"][aria-hidden="false"]') ||
        document.querySelector('[role="dialog"]:not([aria-hidden])');

      return openModal || document.body;
    };

    setPortalContainer(findClosestModal());
  }, [isOpen]);

  // ✅ טעינה ראשונית של הטקסונומיה (גם ללא פתיחת ה-popover) כדי להציג שמות
  useEffect(() => {
    if (isCore) {
      loadTaxonomiesOnce();
    } else {
      custom.ensure(effectiveName);
    }
  }, [isCore, effectiveName, loadTaxonomiesOnce, custom]);

  // ✅ קביעת רשימת הפריטים להצגה - תמיד, לא רק כשפתוח
  useEffect(() => {
    let data = [];
    if (isCore) {
      if (apiSlug === "categories") data = categories;
      else if (apiSlug === "tags") data = tags;
    } else {
      data = custom.select(effectiveName) || [];
    }

    const sorted =
      apiSlug === "categories" ? sortCategoriesWithDepth(data) : data;

    setItemsExist(sorted);
  }, [
    isCore,
    apiSlug,
    categories,
    tags,
    custom,
    effectiveName,
    sortCategoriesWithDepth,
  ]);

  // הוספת פריט חדש
  const addNewItem = async (itemName, currentValue, onChange) => {
    setIsAdding(true);
    const itemData = { name: itemName, parent: 0 };
    if (apiSlug === "tags") delete itemData.parent;

    try {
      const url =
        apiSlug === "categories" || apiSlug === "tags"
          ? `${window.siteUrl}/wp-json/wc/v3/products/${apiSlug}`
          : `${window.siteUrl}/wp-json/whizmanage/v1/taxonomy/${apiSlug}/term`;

      const res = await postApi(url, itemData);
      const newItemData = res?.data;

      const updated = [newItemData, ...itemsExist];
      setItemsExist(updated);

      // עדכון store מתאים
      if (apiSlug === "categories" || apiSlug === "tags") {
        updateTaxonomy(apiSlug, updated);
      } else {
        custom.setList(effectiveName, updated);
      }

      // ✅ הוספה רק של ה-ID לערך הנוכחי
      const nextValue = [...(currentValue || []), newItemData.id]; // ✅ רק ID
      onChange(nextValue);
    } catch (e) {
      console.error("Error adding new item:", e);
    } finally {
      setIsAdding(false);
      setAddItem(false);
      setNewItem("");
    }
  };

  const isLoading = isCore
    ? isCoreLoading
    : !!custom.isLoadingByName?.[effectiveName];

  return (
    <div className="flex flex-col w-full gap-1.5 px-2">
      <div className="flex items-center gap-1.5">
        {helperText && (
          <HoverCard openDelay={300}>
            <HoverCardTrigger asChild>
              <Info className="h-3 w-3 text-fuchsia-600 opacity-60 hover:opacity-100 cursor-pointer" />
            </HoverCardTrigger>
            <HoverCardContent
              className="max-w-xs text-sm break-words z-[9999] shadow-md p-3"
              align="start"
              avoidCollisions
              collisionPadding={10}
              sideOffset={5}
            >
              <p className="whitespace-pre-wrap break-words">{__(helperText, "whizmanage")}</p>
            </HoverCardContent>
          </HoverCard>
        )}
        <Label htmlFor={name}>
          {__(label, "whizmanage")}
          {rules?.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      </div>
      <Controller
        name={name}
        control={control}
        rules={rules}
        render={({ field, fieldState: { error } }) => (
          <>
            {/* תצוגת הנבחרים */}
            <div className="flex flex-wrap gap-2 relative min-h-10 items-center dark:bg-slate-700 rounded-lg px-2 py-1">
              {field.value &&
              Array.isArray(field.value) &&
              field.value.length > 0 ? (
                field.value.map((item, index) => {
                  // ✅ אם זה מספר, חפש את האובייקט מ-itemsExist
                  let itemName, itemId;

                  if (typeof item === "object") {
                    itemName = item.name;
                    itemId = item.id;
                  } else {
                    // זה ID - חפש את האובייקט
                    itemId = item;
                    const found = itemsExist.find((i) => i.id === item);
                    itemName = found ? found.name : String(item);
                  }

                  return (
                    <Chip
                      key={itemId ?? index}
                      onClose={() => {
                        const nextValue = field.value.filter(
                          (_, i) => i !== index
                        );
                        field.onChange(nextValue);
                      }}
                      variant="flat"
                      classNames={{
                        base: "bg-gradient-to-br from-fuchsia-50 dark:from-slate-800 to-fuchsia-200 dark:to-slate-700 opacity-100",
                        content: "text-fuchsia-600 dark:text-slate-300",
                        closeButton: "text-fuchsia-600 dark:text-slate-300",
                      }}
                    >
                      {itemName}
                    </Chip>
                  );
                })
              ) : (
                <div className="font-extralight text-base text-muted-foreground px-2">
                  {TT("No %s",labelT)}
                </div>
              )}
            </div>

            {/* כפתור לפתיחה */}
            <Popover open={isOpen} onOpenChange={setIsOpen}>
              <PopoverTrigger asChild>
                <Button
                  ref={triggerRef}
                  variant="outline"
                  className="flex justify-between h-10 dark:bg-slate-700 dark:hover:!bg-slate-800 !rounded-lg"
                >
                  {placeholder || TT("Select %s",labelT)}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>

              <PopoverContent
                className="p-0 dark:bg-slate-800 w-[264px]"
                align="start"
                sideOffset={5}
                portalContainer={portalContainer}
                onOpenAutoFocus={(e) => {
                  e.preventDefault();
                  const input = e.currentTarget.querySelector("[cmdk-input]");
                  if (input) input.focus();
                }}
              >
                <Command className="dark:bg-slate-800">
                  {addItem ? (
                    <div className="h-10 p-1 gap-1 flex items-center justify-between border-b dark:border-slate-700">
                      <Input
                        type="text"
                        value={newItem}
                        placeholder={TT("New %s", labelT)}
                        className="h-8 p-0"
                        onChange={(e) => setNewItem(e.target.value)}
                        autoFocus
                      />
                      {newItem.trim().length > 0 ? (
                        <Button
                          variant="outline"
                          className="h-8 rounded-sm"
                          onClick={() =>
                            addNewItem(newItem, field.value, field.onChange)
                          }
                          disabled={isAdding}
                        >
                          {__("Add", "whizmanage")}
                        </Button>
                      ) : (
                        <CustomTooltip title={__("Cancel", "whizmanage")} instantClose>
                          <Button
                            variant="outline"
                            className="h-8 rounded-sm"
                            onClick={() => setAddItem(false)}
                          >
                            <Undo2 />
                          </Button>
                        </CustomTooltip>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-1 gap-1 h-10 border-b dark:border-slate-700">
                      <CommandInput
                        placeholder={TT("Find %s", labelT)}
                        className="!border-none !ring-0 h-8"
                      />
                      <CustomTooltip title={__(`Add new ${label}`, "whizmanage")} instantClose>
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

                  <CommandList className="max-h-[360px] overflow-y-auto scrollbar-whiz">
                    {!isLoading && itemsExist.length === 0 && (
                      <CommandEmpty>{__("No results found.", "whizmanage")}</CommandEmpty>
                    )}

                    <CommandGroup
                      heading={
                        itemsExist.length > 0 ? TT("Existing %s", labelT) : ""
                      }
                    >
                      {isLoading ? (
                        <div className="flex justify-center py-6">
                          <Loader />
                        </div>
                      ) : itemsExist.length > 0 ? (
                        itemsExist.map((item) => {
                          const itemId =
                            typeof item === "object" ? item.id : item;
                          return (
                            <div key={itemId} className="relative">
                              <MultiSelectEditItem
                                item={item}
                                itemsExist={itemsExist}
                                setItemsExist={setItemsExist}
                                itemsProduct={field.value || []}
                                setItemsProduct={(updater) => {
                                  if (typeof updater === "function") {
                                    const next = updater(field.value || []);
                                    field.onChange(next);
                                  } else {
                                    field.onChange(updater);
                                  }
                                }}
                                apiSlug={apiSlug}
                                columnName={name}
                              />
                            </div>
                          );
                        })
                      ) : (
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <div className="text-center">
                            <h3 className="text-sm font-medium text-slate-900 dark:text-slate-200 mb-1">
                              {TT("No %s yet", labelT)}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-300 mb-4">
                              {TT("Create your first %s to get started", labelT)}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full max-w-xs"
                            onClick={() => setAddItem(true)}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            {TT("Create %s")}
                          </Button>
                        </div>
                      )}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {error && (
              <p className="text-red-500 dark:text-pink-500 text-sm px-2">
                {__(error.message, "whizmanage")}
              </p>
            )}
          </>
        )}
      />
    </div>
  );
}
