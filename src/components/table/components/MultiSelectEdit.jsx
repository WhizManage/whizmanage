// src/components/table/components/MultiSelectEdit.jsx
import { useCoreTaxonomiesStore } from "@/components/table/store/useCoreTaxonomiesStore";
import { useCustomTaxonomiesStore } from "@/components/table/store/useCustomTaxonomiesStore";
import { useUserRolesStore } from "@/components/table/store/useUserRolesStore";
import { cn } from "@/lib/utils";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/ui/popover-portal";
import { Chip } from "@heroui/react";
import { Check, ChevronsUpDown, Package, Plus, Undo2 } from "lucide-react";
import CustomTooltip from "@components/ui/nextUI/Tooltip.jsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { __, sprintf } from "@wordpress/i18n";
import MultiSelectEditItem from "./MultiSelectEditItem";
import { postApi } from "@/services/services";

const CORE_TAXONOMIES = new Set([
  "product_cat",
  "_product_cat",
  "categories",
  "product_tag",
  "tags",
]);

const isCore = (name) => CORE_TAXONOMIES.has(String(name || ""));

const MultiSelectEdit = ({
  row,
  columnName,
  label,
  onClose,
  onFinish,
  value,
  onChange,
  onValueChange,
  autoFocus = false,
  editOptions = {},
  placeholder,
}) => {
  const [isOpen, setIsOpen] = useState(autoFocus);
  const [itemsExist, setItemsExist] = useState([]);
  const [addItem, setAddItem] = useState(false);
  const [newItem, setNewItem] = useState("");

  const triggerRef = useRef(null);
  const [portalContainer, setPortalContainer] = useState(null);

  const initialArray =
    (Array.isArray(value) ? value : row?.original?.[columnName]) || [];
  const [itemsProduct, setItemsProduct] = useState([...initialArray]);

  const [isAdding, setIsAdding] = useState(false);
  const [addSubcategory, setAddSubcategory] = useState(null);
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [productsCount, setProductsCount] = useState(0);

  const source = editOptions?.source || null;
  const explicitTaxonomy = editOptions?.taxonomyType || null;
  const isUserRoles = String(explicitTaxonomy || columnName) === "user_roles";

  const apiSlug =
    explicitTaxonomy === "product_cat" ||
    explicitTaxonomy === "_product_cat" ||
    columnName === "categories"
      ? "categories"
      : explicitTaxonomy === "product_tag" || columnName === "tags"
        ? "tags"
        : explicitTaxonomy || columnName;

  const objectSingular =
    editOptions?.objectSingularLabel || __("Item", "whizmanage");

  const oppositeColumnName = editOptions?.oppositeColumn || null;
  const oppositeColumnData =
    (oppositeColumnName && row?.original && row.original[oppositeColumnName]) ||
    [];

  const normalizeIds = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr.map((x) => String(typeof x === "object" ? x.id : x));
  };

  const disabledIds = [
    ...new Set([
      ...normalizeIds(editOptions?.disabledIds || []),
      ...normalizeIds(oppositeColumnData),
    ]),
  ];

  const disabledIdsKey = useMemo(
    () => disabledIds.map(String).sort().join(","),
    [disabledIds]
  );

  const columnLabel =
    columnName === "categories" || columnName === "tags" ? columnName : label;

  const labelT = __(columnLabel, "whizmanage");
  const TT = (key, extra = {}) => {
    const lbl = extra.label ?? labelT;
    return sprintf(__(key, "whizmanage"), lbl);
  };

  // ✅ portalContainer בטוח: רק dialog "שבאמת עוטף את הטריגר", בלי querySelector גלובלי
  useEffect(() => {
    if (!isOpen || typeof document === "undefined") {
      setPortalContainer(null);
      return;
    }

    const findClosestModal = () => {
      if (!triggerRef.current) return document.body;

      let el = triggerRef.current;
      while (el && el !== document.body) {
        if (el.getAttribute?.("role") === "dialog") return el;
        el = el.parentElement;
      }
      return document.body;
    };

    setPortalContainer(findClosestModal());
  }, [isOpen]);

  const emitChange = useCallback(
    (next) => {
      onChange?.(next);
      onValueChange?.(next);
    },
    [onChange, onValueChange]
  );

  const handleOpenChange = useCallback(
    (open) => {
      setIsOpen(open);
      if (!open) {
        onFinish?.();
        onClose?.();
      }
    },
    [onFinish, onClose]
  );

  const removeTempItems = () => {
    setItemsExist((prev) => prev.filter((item) => !item.temp));
  };

  // stores – core
  const {
    categories,
    tags,
    updateTaxonomy,
    isLoading: isCoreLoading,
    isLoaded,
    loadTaxonomiesOnce,
  } = useCoreTaxonomiesStore();

  // store – custom
  const customStore = useCustomTaxonomiesStore();
  const { ensure: ensureCustomTax, isLoading: isCustomLoadingFn } = customStore;

  // store – user roles
  const {
    roles: userRolesFromStore,
    isLoaded: userRolesLoaded,
    isLoading: userRolesLoading,
    loadRolesOnce: loadUserRolesOnce,
  } = useUserRolesStore();

  // שם הטקסונומיה בפועל
  const taxonomyName = explicitTaxonomy || columnName;
  const isCoreTax = isCore(taxonomyName);
  const isCustomTax =
    !!taxonomyName && !isCoreTax && !isUserRoles && source !== "products";

  // ⬅️ טעינה lazy: core taxonomies
  useEffect(() => {
    if (!isOpen) return;

    const needsCore =
      columnName === "categories" ||
      columnName === "tags" ||
      explicitTaxonomy === "product_cat" ||
      explicitTaxonomy === "_product_cat" ||
      explicitTaxonomy === "product_tag";

    if (needsCore && !isLoaded && !isCoreLoading) {
      loadTaxonomiesOnce();
    }
  }, [
    isOpen,
    columnName,
    explicitTaxonomy,
    isLoaded,
    isCoreLoading,
    loadTaxonomiesOnce,
  ]);

  // ⬅️ טעינה lazy: custom taxonomies
  useEffect(() => {
    if (!isOpen) return;
    if (source === "products" || isUserRoles) return;
    if (!taxonomyName || isCore(taxonomyName)) return;

    if (typeof ensureCustomTax === "function") {
      ensureCustomTax(taxonomyName);
    }
  }, [isOpen, source, isUserRoles, taxonomyName, ensureCustomTax]);

  // ⬅️ טעינה lazy: user roles
  useEffect(() => {
    if (!isOpen) return;
    if (!isUserRoles) return;
    if (!userRolesLoaded && !userRolesLoading) {
      loadUserRolesOnce();
    }
  }, [
    isOpen,
    isUserRoles,
    userRolesLoaded,
    userRolesLoading,
    loadUserRolesOnce,
  ]);

  // ⬅️ טעינת מוצרים
  useEffect(() => {
    if (!isOpen) return;
    if (source !== "products") return;

    const checkProductsLoading = () => {
      const products = window?.listProduct;
      const currentCount = Array.isArray(products) ? products.length : 0;

      if (currentCount > 0) {
        setIsProductsLoading(false);
        setProductsCount(currentCount);
      } else {
        setIsProductsLoading(true);
      }
      return currentCount;
    };

    let lastCount = checkProductsLoading();

    const interval = setInterval(() => {
      const products = window?.listProduct;
      const currentCount = Array.isArray(products) ? products.length : 0;

      if (currentCount > 0) {
        setIsProductsLoading(false);
        if (currentCount !== lastCount) {
          setProductsCount(currentCount);
          lastCount = currentCount;
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isOpen, source]);

  // ⬅️ השתמש ב-store לתפקידי משתמש עם תרגומים
  const loadUserRoles = () => {
    if (userRolesFromStore.length > 0) return userRolesFromStore;
    try {
      if (Array.isArray(window?.whizUserRoles) && window.whizUserRoles.length)
        return window.whizUserRoles.map((r) => ({
          id: String(r),
          name: String(r),
        }));
      if (window?.wp_roles && typeof window.wp_roles.roles === "object")
        return Object.entries(window.wp_roles.roles).map(([id, name]) => ({
          id,
          name,
        }));
    } catch {}
    return [
      { id: "administrator", name: "Administrator" },
      { id: "shop_manager", name: "Shop Manager" },
      { id: "customer", name: "Customer" },
      { id: "subscriber", name: "Subscriber" },
      { id: "editor", name: "Editor" },
      { id: "author", name: "Author" },
      { id: "contributor", name: "Contributor" },
    ];
  };

  const normalizeSelected = (selected, sourceList) => {
    if (!Array.isArray(selected)) return [];
    if (!Array.isArray(sourceList) || sourceList.length === 0) {
      return selected.map((x) =>
        typeof x === "object" ? x : { id: x, name: String(x) }
      );
    }
    return selected.map((x) => {
      if (typeof x === "object" && x.id) return x;
      const found = sourceList.find((s) => String(s.id) === String(x));
      return found || { id: x, name: String(x) };
    });
  };

  const addNewItem = async (item, parentId = 0) => {
    setIsAdding(true);
    removeTempItems();

    const itemData = { name: item, parent: parentId };

    const isCoreTaxLocal = columnName === "categories" || columnName === "tags";
    const taxonomyNameForStore = explicitTaxonomy || columnName;

    let url;
    if (isCoreTaxLocal) {
      url = `${window.siteUrl}/wp-json/wc/v3/products/${columnName}`;
    } else {
      url = `${window.siteUrl}/wp-json/whizmanage/v1/taxonomy/${taxonomyNameForStore}/term`;
    }

    if (columnName === "tags") delete itemData.parent;

    try {
      const res = await postApi(url, itemData);
      const created = res?.data;

      if (parentId === 0) {
        setItemsExist((prev) => [created, ...prev]);
      } else {
        setItemsExist((prev) => {
          const updatedItems = [...prev];
          const parentIndex = updatedItems.findIndex(
            (cat) => cat.id === parentId
          );
          if (parentIndex !== -1) {
            let insertIndex = parentIndex + 1;
            while (
              insertIndex < updatedItems.length &&
              updatedItems[insertIndex].parent === parentId
            ) {
              insertIndex++;
            }
            created.depth = (updatedItems[parentIndex].depth || 0) + 1;
            updatedItems.splice(insertIndex, 0, created);
            return updatedItems;
          }
          return [...updatedItems, created];
        });
      }

      if (isCoreTaxLocal) {
        updateTaxonomy(columnName, (prev) => [created, ...prev]);
      } else if (!isUserRoles && taxonomyNameForStore) {
        const currentList = customStore.select(taxonomyNameForStore) || [];
        customStore.setList(taxonomyNameForStore, [created, ...currentList]);
      }
    } catch (error) {
      console.error("Error adding new item:", error);
    } finally {
      removeTempItems();
      setIsAdding(false);
      setAddItem(false);
      setAddSubcategory(null);
      setNewItem("");
      setNewSubcategoryName("");
    }
  };

  const buildSourceList = () => {
    if (source === "products") {
      const all = Array.isArray(window?.listProduct) ? window.listProduct : [];
      return all.map((p) => ({
        id: p.id,
        name: p.name || p.title || `#${p.id}`,
        image: p.image || p.images?.[0]?.src || null,
        price: p.price ?? p.regular_price ?? "",
      }));
    }
    if (isUserRoles) return loadUserRoles();

    const explicit = editOptions?.taxonomyType || null;
    if (
      explicit === "product_cat" ||
      explicit === "_product_cat" ||
      columnName === "categories"
    )
      return categories;
    if (explicit === "product_tag" || columnName === "tags") return tags;

    const name = explicit || columnName;
    return isCore(name) ? [] : customStore.select(name) || [];
  };

  useEffect(() => {
    const data = buildSourceList();
    if (!data || data.length === 0) return;

    const fromParent = Array.isArray(value) ? value : null;
    const fromServer = fromParent || row?.original?.[columnName] || [];

    const allAreObjects =
      Array.isArray(fromServer) &&
      fromServer.every((x) => typeof x === "object" && x.name);

    if (allAreObjects) {
      setItemsProduct(fromServer);
      if (!isOpen) setItemsExist((prev) => (prev.length ? prev : data));
      return;
    }
    const normalized = normalizeSelected(fromServer, data);
    setItemsProduct(normalized);
    if (!isOpen) setItemsExist((prev) => (prev.length ? prev : data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    value,
    row?.original?.[columnName],
    categories,
    tags,
    customStore,
    source,
    columnName,
    explicitTaxonomy,
    isUserRoles,
  ]);

  useEffect(() => {
    if (!isOpen) return;

    const data = buildSourceList();

    const sortCategoriesWithDepth = (cats) => {
      const categoryMap = new Map();
      cats.forEach((c) => categoryMap.set(c.id, { ...c, depth: 0 }));
      const out = [];
      function walk(cat, depth) {
        cat.depth = depth;
        out.push(cat);
        cats
          .filter((x) => x.parent === cat.id)
          .sort((a, b) => a.menu_order - b.menu_order)
          .forEach((child) => walk(categoryMap.get(child.id), depth + 1));
      }
      cats
        .filter((c) => c.parent === 0)
        .sort((a, b) => a.menu_order - b.menu_order)
        .forEach((c) => walk(categoryMap.get(c.id), 0));
      return out;
    };

    const sortTagsBySelected = (list) =>
      list.sort((a, b) => {
        const aSel = itemsProduct.some((it) => (it.name || it.id) === a.name);
        const bSel = itemsProduct.some((it) => (it.name || it.id) === b.name);
        return Number(bSel) - Number(aSel);
      });

    const sorted =
      source === "products"
        ? data.sort((a, b) => (a.name || "").localeCompare(b.name || ""))
        : isUserRoles
          ? data.sort((a, b) => (a.name || "").localeCompare(b.name || ""))
          : columnName === "categories" ||
              editOptions?.taxonomyType === "product_cat" ||
              editOptions?.taxonomyType === "_product_cat"
            ? sortCategoriesWithDepth(data)
            : sortTagsBySelected(data);

    setItemsExist(sorted);

    const currentSelected =
      (Array.isArray(value) ? value : null) ||
      row?.original?.[columnName] ||
      itemsProduct;

    const normalized = normalizeSelected(currentSelected, sorted);

    const cleaned =
      source === "products"
        ? normalized.filter(
            (x) =>
              !disabledIds.includes(String(typeof x === "object" ? x.id : x))
          )
        : normalized;

    setItemsProduct(cleaned);
    if (cleaned.length !== normalized.length) emitChange(cleaned);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isOpen,
    source,
    categories,
    tags,
    customStore,
    columnName,
    editOptions,
    row?.original,
    disabledIdsKey,
    isUserRoles,
    value,
    productsCount,
  ]);

  const selectedItems = itemsProduct
    .map((it) => (typeof it === "object" ? it.name || `#${it.id}` : `#${it}`))
    .join(", ");

  const emptyText = placeholder || TT("Select %s");

  const isItemSelected = (item) => {
    const id = typeof item === "object" ? item.id : item;
    return itemsProduct.some(
      (sel) => String(typeof sel === "object" ? sel.id : sel) === String(id)
    );
  };

  const isCustomLoading =
    isCustomTax && typeof isCustomLoadingFn === "function"
      ? !!isCustomLoadingFn(taxonomyName)
      : false;

  const isAnyLoading =
    isCoreLoading ||
    isCustomLoading ||
    (source === "products" && isProductsLoading);

  const removeSelectedItem = useCallback(
    (itemToRemove) => {
      const idToRemove =
        typeof itemToRemove === "object" ? itemToRemove.id : itemToRemove;
      setItemsProduct((prev) => {
        const next = prev.filter(
          (x) => String(typeof x === "object" ? x.id : x) !== String(idToRemove)
        );
        emitChange(next);
        return next;
      });
    },
    [emitChange]
  );

  const itemLabelsMap = useMemo(() => {
    const map = new Map();
    itemsProduct.forEach((item) => {
      const id = typeof item === "object" ? item.id : item;
      let lbl = `#${id}`;
      if (typeof item === "object" && item.name) lbl = item.name;
      else {
        const found = itemsExist.find((x) => String(x.id) === String(id));
        if (found?.name) lbl = found.name;
      }
      map.set(String(id), lbl);
    });
    return map;
  }, [itemsProduct, itemsExist]);

  const getItemLabel = useCallback(
    (item) => {
      const id = typeof item === "object" ? item.id : item;
      return itemLabelsMap.get(String(id)) || `#${id}`;
    },
    [itemLabelsMap]
  );

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          type="button"
          variant="outline"
          className="flex h-8 w-full max-w-full items-center justify-between gap-2 overflow-hidden focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          <span className="capitalize min-w-0 flex-1 truncate whitespace-nowrap text-ellipsis text-left">
            {itemsProduct.length > 0 ? selectedItems : emptyText}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="p-0 dark:bg-slate-800 w-[264px] z-[999999]"
        align="start"
        sideOffset={5}
        portalContainer={
          portalContainer ||
          (typeof document !== "undefined" ? document.body : null)
        }
        onMouseDownCapture={(e) => e.stopPropagation()}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          const input = e.currentTarget.querySelector("[cmdk-input]");
          if (input) input.focus();
        }}
      >
        <Command className="dark:bg-slate-800">
          {addItem && source !== "products" && !isUserRoles ? (
            <div className="h-10 p-1 border-b dark:border-slate-700 gap-1 flex items-center justify-between">
              <Input
                type="text"
                id="tagName"
                value={newItem}
                placeholder={TT("New %s")}
                className="h-8 p-0"
                onChange={(e) => setNewItem(e.target.value)}
                autoFocus
              />
              {newItem.trim().length > 0 ? (
                <CustomTooltip title={__("Add", "whizmanage")} instantClose>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 rounded-sm"
                    onClick={() => {
                      addNewItem(newItem);
                      setAddItem(false);
                    }}
                    disabled={isAdding}
                  >
                    {__("Add", "whizmanage")}
                  </Button>
                </CustomTooltip>
              ) : (
                <CustomTooltip title={__("Cancel", "whizmanage")} instantClose>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 rounded-sm"
                    onClick={() => setAddItem(false)}
                  >
                    <Undo2 className="text-muted-foreground" />
                  </Button>
                </CustomTooltip>
              )}
            </div>
          ) : (
            <div className="flex justify-between items-center !border-b dark:border-slate-700 h-10 p-1">
              <CommandInput
                placeholder={TT("Find %s")}
                className="!border-none !ring-0 h-8"
                onPointerDown={(e) => e.stopPropagation()}
              />
              {source !== "products" && !isUserRoles && (
                <CustomTooltip title={__("Add new", "whizmanage")} instantClose>
                  <Button
                    type="button"
                    variant="ghost"
                    className="dark:hover:bg-slate-700 size-8 rounded-md"
                    size="icon"
                    onClick={() => setAddItem(true)}
                  >
                    <Plus className="size-4 text-muted-foreground" />
                  </Button>
                </CustomTooltip>
              )}
            </div>
          )}

          <CommandList className="max-h-[360px] overflow-y-auto scrollbar-whiz">
            {(() => {
              const validItems = itemsProduct.filter((item) => {
                const lbl = getItemLabel(item);
                const id = typeof item === "object" ? item.id : item;
                const isOnlyId =
                  /^#?\d+$/.test(lbl) &&
                  String(lbl).replace("#", "") === String(id);
                return !isOnlyId;
              });

              if (validItems.length === 0) return null;

              return (
                <div className="p-2 border-b dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                    {__("Selected", "whizmanage")} ({validItems.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {validItems.map((item) => {
                      const id = typeof item === "object" ? item.id : item;
                      const lbl = getItemLabel(item);
                      return (
                        <CustomTooltip key={id} title={lbl}>
                          <Chip
                            size="sm"
                            onClose={() => removeSelectedItem(item)}
                            variant="flat"
                            classNames={{
                              base: "bg-gradient-to-br from-fuchsia-50 dark:from-slate-700 to-fuchsia-100 dark:to-slate-600 h-6 max-w-[120px]",
                              content:
                                "text-fuchsia-700 dark:text-slate-200 text-xs px-1 truncate",
                              closeButton:
                                "text-fuchsia-600 dark:text-slate-300 hover:text-fuchsia-800 dark:hover:text-white",
                            }}
                          >
                            {lbl}
                          </Chip>
                        </CustomTooltip>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {!isAnyLoading && itemsExist.length === 0 && (
              <CommandEmpty>
                {__("No results found.", "whizmanage")}
              </CommandEmpty>
            )}

            <CommandGroup
              heading={itemsExist.length > 0 ? TT("Existing %s") : ""}
            >
              {isAnyLoading ? (
                <div className="flex justify-center py-6">
                  <Loader />
                </div>
              ) : itemsExist.length > 0 ? (
                source === "products" ? (
                  itemsExist.map((item) => {
                    const selected = isItemSelected(item);
                    const locked = disabledIds.includes(String(item.id));
                    return (
                      <CommandItem
                        key={item.id}
                        value={`${item.name || ""} ${item.id || ""}`}
                        disabled={locked}
                        onSelect={() => {
                          if (locked) return;
                          setItemsProduct((prev) => {
                            const exists = prev.some(
                              (x) => String(x.id ?? x) === String(item.id)
                            );
                            const next = exists
                              ? prev.filter(
                                  (x) => String(x.id ?? x) !== String(item.id)
                                )
                              : [...prev, item];
                            emitChange(next);
                            return next;
                          });
                        }}
                        className={cn(
                          "group/item flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer",
                          "hover:bg-slate-100/80 dark:hover:bg-slate-700/40"
                        )}
                      >
                        <Check
                          className={cn(
                            "h-4 w-4 shrink-0 transition-opacity",
                            selected ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {item.image ? (
                          <img
                            src={item.image}
                            alt=""
                            className="size-10 rounded-md object-cover border border-solid border-slate-200 dark:border-slate-600"
                          />
                        ) : (
                          <div className="size-10 rounded-md grid place-items-center bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 group-hover/item:dark:border-slate-600">
                            <Package className="h-4 w-4 opacity-60" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div
                            className={cn(
                              "text-sm truncate",
                              locked && "line-through opacity-60"
                            )}
                          >
                            {item.name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-300 flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                              #{item.id}
                            </span>
                            {String(item.price || "").length > 0 && (
                              <span className="truncate">
                                {window?.currency ? (
                                  <span
                                    dangerouslySetInnerHTML={{
                                      __html: window.currency,
                                    }}
                                  />
                                ) : null}
                                {item.price}
                              </span>
                            )}
                          </div>
                        </div>
                      </CommandItem>
                    );
                  })
                ) : isUserRoles ? (
                  itemsExist.map((item) => {
                    const selected = isItemSelected(item);
                    return (
                      <CommandItem
                        key={item.id}
                        value={`${item.name || ""} ${item.id || ""}`}
                        onSelect={() => {
                          setItemsProduct((prev) => {
                            const exists = prev.some(
                              (x) => String(x.id ?? x) === String(item.id)
                            );
                            const next = exists
                              ? prev.filter(
                                  (x) => String(x.id ?? x) !== String(item.id)
                                )
                              : [...prev, item];
                            emitChange(next);
                            return next;
                          });
                        }}
                        className={cn(
                          "flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer",
                          "hover:bg-slate-100/80 dark:hover:bg-slate-700/40"
                        )}
                      >
                        <Check
                          className={cn(
                            "h-4 w-4 shrink-0 transition-opacity",
                            selected ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <CustomTooltip title={item.name}>
                          <span className="text-sm truncate">{item.name}</span>
                        </CustomTooltip>
                      </CommandItem>
                    );
                  })
                ) : (
                  itemsExist.map((item) => {
                    const itemId = String(
                      typeof item === "object" ? item.id : item
                    );
                    const isDisabled = disabledIds.includes(itemId);
                    const isSelected = isItemSelected(item);

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "relative",
                          isSelected && "bg-slate-100/40 dark:bg-slate-700/20",
                          isDisabled && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <MultiSelectEditItem
                          item={item}
                          itemsExist={itemsExist}
                          setItemsExist={setItemsExist}
                          itemsProduct={itemsProduct}
                          setItemsProduct={(updater) => {
                            if (typeof updater === "function") {
                              setItemsProduct((prev) => {
                                const next = updater(prev);
                                emitChange(next);
                                return next;
                              });
                            } else {
                              setItemsProduct(updater);
                              emitChange(updater);
                            }
                          }}
                          row={row}
                          apiSlug={apiSlug}
                          objectSingular={objectSingular}
                          disabled={isDisabled}
                          columnName={columnName}
                          taxonomyType={explicitTaxonomy}
                        />
                      </div>
                    );
                  })
                )
              ) : (
                <div className="flex flex-col items-center justify-center pt-2">
                  <div className="text-center">
                    <h3 className="text-sm font-medium text-slate-900 dark:text-slate-200 mb-1">
                      {TT("No %s yet")}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-300 mb-4">
                      {TT("Create your first %s to get started")}
                    </p>
                  </div>
                  {source !== "products" && !isUserRoles && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full max-w-xs"
                      onClick={() => setAddItem(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {TT("Create %s")}
                    </Button>
                  )}
                </div>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default MultiSelectEdit;
