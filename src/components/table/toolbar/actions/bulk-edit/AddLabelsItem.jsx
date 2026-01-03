// src/components/table/toolbar/actions/bulk-edit/AddLabelsItem.jsx

import MultiSelectEditItem from "@components/table/components/MultiSelectEditItem";
import { Button } from "@components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
} from "@components/ui/command";
import Loader from "@components/ui/custom/Loader";
import { Input } from "@components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/ui/popover-portal";
import { Chip } from "@heroui/react";
import { Plus, PlusIcon, Undo2, MinusIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
 import { __ } from "@wordpress/i18n";
import { postApi } from "/src/services/services";

// ✅ הוספת ה־stores
import { useCoreTaxonomiesStore } from "@/components/table/store/useCoreTaxonomiesStore";
import { useCustomTaxonomiesStore } from "@/components/table/store/useCustomTaxonomiesStore";
import CustomTooltip from "@components/ui/nextUI/Tooltip";

const CORE = new Set([
  "product_cat",
  "_product_cat",
  "categories",
  "product_tag",
  "tags",
]);
const isCoreName = (n) => CORE.has(String(n || ""));

const AddLabelsItem = ({
  columnName,
  index,
  updateValue,
  label,
  mode = "add", // "add" or "remove"
  disabledItems = [], // items selected in the opposite mode
}) => {
  const [open, setOpen] = useState(false);
  const [itemsExist, setItemsExist] = useState([]);
  const [itemsProduct, setItemsProduct] = useState([]);
  const [addItem, setAddItem] = useState(false);
  const [newItem, setNewItem] = useState("");

  // בשביל הפורטל בתוך המודל
  const triggerRef = useRef(null);
  const [portalContainer, setPortalContainer] = useState(null);

  // מציאת מיכל פורטל (מודל) קרוב
  useEffect(() => {
    if (!open || typeof document === "undefined") {
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
  }, [open]);

   

  // ✅ Core store
  const {
    categories,
    tags,
    isLoaded: coreLoaded,
    isLoading: coreLoading,
    updateTaxonomy,
    loadTaxonomiesOnce,
  } = useCoreTaxonomiesStore();

  // ✅ Custom store
  const custom = useCustomTaxonomiesStore();

  // ✅ apiSlug אחיד (כמו בשאר הקומפוננטים)
  const apiSlug = useMemo(() => {
    if (
      columnName === "categories" ||
      columnName === "product_cat" ||
      columnName === "_product_cat"
    ) {
      return "categories";
    }
    if (columnName === "tags" || columnName === "product_tag") {
      return "tags";
    }
    return columnName;
  }, [columnName]);

  const columnLabel = useMemo(() => {
    return columnName === "categories" || columnName === "tags"
      ? columnName
      : label || columnName;
  }, [columnName, label]);

  // ✅ מיון קטגוריות עם עומק
  const sortCategoriesWithDepth = useCallback((cats) => {
    const list = Array.isArray(cats) ? cats : [];
    const map = new Map(list.map((c) => [c.id, { ...c, depth: 0 }]));
    const out = [];
    const walk = (cat, depth) => {
      cat.depth = depth;
      out.push(cat);
      list
        .filter((x) => x.parent === cat.id)
        .sort((a, b) => (a.menu_order || 0) - (b.menu_order || 0))
        .forEach((child) => walk(map.get(child.id), depth + 1));
    };
    list
      .filter((c) => c.parent === 0)
      .sort((a, b) => (a.menu_order || 0) - (b.menu_order || 0))
      .forEach((c) => walk(map.get(c.id), 0));
    return out;
  }, []);

  // ✅ טוען כשנפתח: Core ⇒ פעם אחת; Custom ⇒ רק אם אין נתונים ב־store
  useEffect(() => {
    if (!open) return;

    if (isCoreName(columnName)) {
      // טען קטגוריות/תגיות פעם אחת (אם עוד לא נטען)
      if (!coreLoaded && !coreLoading) {
        loadTaxonomiesOnce();
      }
    } else {
      // טקסונומיה מותאמת: אם אין ב־store – טען; אחרת קח מה־store
      const list = custom.select(columnName);
      if (!Array.isArray(list) || list.length === 0) {
        custom.ensure(columnName);
      }
    }
  }, [open, columnName, coreLoaded, coreLoading, loadTaxonomiesOnce, custom]);

  // ✅ קבע רשימת פריטים להצגה מתוך ה־stores בלבד
  useEffect(() => {
    if (!open) return;

    let data = [];
    if (apiSlug === "categories") {
      data = categories;
      data = sortCategoriesWithDepth(data);
    } else if (apiSlug === "tags") {
      data = tags;
    } else {
      data = custom.select(columnName) || [];
    }

    setItemsExist(Array.isArray(data) ? data : []);
  }, [
    open,
    apiSlug,
    categories,
    tags,
    custom,
    columnName,
    sortCategoriesWithDepth,
  ]);

  // ✅ עדכון הורה — שומרים מנגנון ללא לופים
  const prevItemsProductRef = useRef(itemsProduct);
  useEffect(() => {
    const prev = prevItemsProductRef.current;
    const curr = itemsProduct;
    const same =
      prev.length === curr.length &&
      prev.every((p, i) => (p?.id ?? p) === (curr[i]?.id ?? curr[i]));
    if (!same) {
      updateValue(index, "value", curr);
      prevItemsProductRef.current = curr;
    }
  }, [itemsProduct, index, updateValue]);

  // ✅ יצירת פריט חדש — שולח לשרת ומעדכן את ה־store המתאים
  const addNewItem = async (item) => {
    const name = String(item || "").trim();
    if (!name) return;

    const itemData = apiSlug === "categories" ? { name, parent: 0 } : { name };

    try {
      const url =
        apiSlug === "categories" || apiSlug === "tags"
          ? `${window.siteUrl}/wp-json/wc/v3/products/${apiSlug}`
          : `${window.siteUrl}/wp-json/whizmanage/v1/taxonomy/${columnName}/term`;

      const res = await postApi(url, itemData);
      const created = res?.data;

      if (!created) return;

      const next = [created, ...itemsExist];
      setItemsExist(next);

      // עדכון store
      if (apiSlug === "categories" || apiSlug === "tags") {
        useCoreTaxonomiesStore.getState().updateTaxonomy(apiSlug, next);
      } else {
        custom.setList(columnName, next);
      }

      // אם רוצים להוסיף אותו גם לנבחרים:
      setItemsProduct((prev) => [...prev, created]);
      setNewItem("");
      setAddItem(false);
    } catch (e) {
      console.error("Error adding new item:", e);
    }
  };

  const isLoading =
    apiSlug === "categories" || apiSlug === "tags"
      ? coreLoading
      : !!custom.isLoadingByName?.[columnName];

  const handleClose = (itemToRemove) => {
    const next = itemsProduct.filter((x) => x !== itemToRemove);
    setItemsProduct(next);
    updateValue(index, "value", next);
  };

  // Set of disabled item IDs for quick lookup
  const disabledIdsSet = useMemo(() => {
    return new Set(
      disabledItems.map((item) =>
        String(typeof item === "object" ? item.id : item)
      )
    );
  }, [disabledItems]);

  const isItemDisabled = useCallback(
    (item) => {
      const itemId = String(typeof item === "object" ? item.id : item);
      return disabledIdsSet.has(itemId);
    },
    [disabledIdsSet]
  );

  return (
    <div className="flex gap-2 h-full items-center">
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverTrigger asChild>
          <Button
            ref={triggerRef}
            onClick={() => setOpen((p) => !p)}
            variant="ghost"
            size="icon"
          >
            {mode === "remove" ? (
              <MinusIcon className="size-4" />
            ) : (
              <PlusIcon className="size-4" />
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          strategy="fixed"
          className="p-0 dark:bg-slate-800 w-[264px] z-[2147483647]"
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
              <div className="h-12 px-1 gap-1 flex items-center justify-center">
                <div className="relative h-10 border rounded-lg flex gap-1 items-center px-1 dark:bg-slate-700">
                  <Input
                    type="text"
                    id="tagName"
                    value={newItem}
                    placeholder={__(`new ${columnLabel}`, "whizmanage")}
                    className="!border-none dark:!text-slate-300 !ring-0 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0"
                    onChange={(e) => setNewItem(e.target.value)}
                  />
                </div>
                {newItem.trim().length > 0 ? (
                  <Button
                    variant="outline"
                    className="h-10 border-b rounded-lg"
                    onClick={() => addNewItem(newItem)}
                    disabled={isLoading}
                  >
                    {__("Add", "whizmanage")}
                  </Button>
                ) : (
                  <CustomTooltip title={__("Cancel", "whizmanage")} instantClose>
                    <Button
                      variant="outline"
                      className="h-10 rounded-lg"
                      onClick={() => setAddItem(false)}
                    >
                      <Undo2 />
                    </Button>
                  </CustomTooltip>
                )}
              </div>
            ) : (
              <div className="flex border-b dark:border-slate-700">
                <CommandInput
                  placeholder={__(`Find ${columnLabel}`, "whizmanage")}
                  className="!border-none !ring-0"
                />
                <div className="h-12 w-12 flex justify-center items-center">
                  <CustomTooltip
                    title={__(`Add new ${columnLabel}`, "whizmanage")}
                    instantClose
                  >
                    <Button
                      variant="ghost"
                      className="dark:hover:bg-slate-700 px-2 rounded-xl"
                      onClick={() => setAddItem(true)}
                    >
                      <Plus className="w-5 h-5 dark:text-slate-300" />
                    </Button>
                  </CustomTooltip>
                </div>
              </div>
            )}

            <CommandList className="max-h-[360px] overflow-y-auto scrollbar-whiz">
              {!isLoading && itemsExist.length === 0 && (
                <CommandEmpty>{__("No results found.", "whizmanage")}</CommandEmpty>
              )}

              <CommandGroup
                heading={itemsExist.length > 0 ? __(`${columnLabel} exist`, "whizmanage") : ""}
              >
                {isLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader />
                  </div>
                ) : itemsExist.length > 0 ? (
                  itemsExist.map((item) => (
                    <MultiSelectEditItem
                      key={item.id}
                      item={item}
                      itemsExist={itemsExist}
                      setItemsExist={setItemsExist}
                      itemsProduct={itemsProduct}
                      setItemsProduct={setItemsProduct}
                      columnName={columnName}
                      apiSlug={apiSlug}
                      disabled={isItemDisabled(item)}
                      objectSingular={
                        apiSlug === "categories"
                          ? __("Product category", "whizmanage")
                          : apiSlug === "tags"
                            ? __("Tag", "whizmanage")
                            : __("Item", "whizmanage")
                      }
                    />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center pt-2">
                    <div className="text-center">
                      <h3 className="text-sm font-medium text-slate-900 dark:text-slate-200 mb-1">
                        {__(`No ${columnLabel} yet`, "whizmanage")}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-300 mb-4">
                        {__(`Create your first ${columnLabel} to get started`, "whizmanage")}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full max-w-xs"
                      onClick={() => setAddItem(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {__(`Create ${columnLabel}`, "whizmanage")}
                    </Button>
                  </div>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <div className="flex flex-wrap gap-2 relative min-h-10 items-center">
        {itemsProduct.map((item, idx) => (
          <Chip
            key={idx}
            onClose={() => handleClose(item)}
            variant="flat"
            classNames={
              mode === "remove"
                ? {
                    base: "bg-gradient-to-br from-red-50 dark:from-red-900/30 to-red-200 dark:to-red-800/40 opacity-100",
                    content: "text-red-600 dark:text-red-300",
                    closeButton: "text-red-600 dark:text-red-300",
                  }
                : {
                    base: "bg-gradient-to-br from-fuchsia-50 dark:from-slate-800 to-fuchsia-200 dark:to-slate-700 opacity-100",
                    content: "text-fuchsia-600 dark:text-slate-300",
                    closeButton: "text-fuchsia-600 dark:text-slate-300",
                  }
            }
          >
            {typeof item === "object" ? item.name : String(item)}
          </Chip>
        ))}
      </div>
    </div>
  );
};

export default AddLabelsItem;
