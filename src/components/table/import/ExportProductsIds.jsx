// src/components/table/import/ExportProductsIds.jsx
import { cn, toast } from "@/lib/utils";
import { getApi } from "@/services/services";
import Button from "@components/ui/button";
import { Chip } from "@heroui/react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/ui/popover";
import { Check, ChevronsUpDown, Filter, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
 import { __ } from "@wordpress/i18n";
import { useEntityStore } from "@/components/table/entities/products/products.config";
import { PuffLoader } from "react-spinners";

const ExportProductsIds = ({
  selectedProducts = [],
  onChange,
}) => {
  const [productIds, setProductIds] = useState(selectedProducts);
   

  // State for loading all products from API
  const [allProducts, setAllProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // קטגוריות
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [filterOpen, setFilterOpen] = useState(false);

  // סטטוסים
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);

  // חיפוש
  const [searchValue, setSearchValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Load all products when popover opens
  useEffect(() => {
    if (!isOpen) return;

    // If we already have products in window.listProduct, use them
    if (Array.isArray(window?.listProduct) && window.listProduct.length > 0) {
      setAllProducts(window.listProduct);
      return;
    }

    // Otherwise, fetch all products from API
    const fetchAllProducts = async () => {
      setIsLoadingProducts(true);
      const url = `${window.siteUrl}/wp-json/whizmanage/v1/get_product_for_coupons/`;
      const perPage = 1000;
      let products = [];
      let currentPage = 1;

      try {
        while (true) {
          const res = await getApi(`${url}?page=${currentPage}&perPage=${perPage}`);
          const parsed = JSON.parse(res.data);
          const flattened = parsed.flatMap((p) => [p, ...(p.subRows || [])]);
          products = [...products, ...flattened];
          setAllProducts([...products]);

          if (flattened.length < perPage) break;
          currentPage++;
        }

        // Save to window for use in other components
        window.listProduct = products;
      } catch (e) {
        console.error("Failed to fetch products:", e);
        toast.error(__("Failed to load products"));
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchAllProducts();
  }, [isOpen]);

  // סנכרון עם props
  useEffect(() => {
    setProductIds(selectedProducts);
  }, [selectedProducts]);

  // עדכון ההורה
  useEffect(() => {
    if (onChange) {
      onChange(productIds);
    }
  }, [productIds, onChange]);

  // כל הסטטוסים האפשריים
  const STATUS_OPTIONS = [
    { value: "publish", label: __("Published", "whizmanage") },
    { value: "draft", label: __("Draft", "whizmanage") },
    { value: "pending", label: __("Pending", "whizmanage") },
    { value: "private", label: __("Private", "whizmanage") },
  ];

  const getStatusLabel = (value) => {
    const map = {
      publish: __("Published", "whizmanage"),
      draft: __("Draft", "whizmanage"),
      pending: __("Pending", "whizmanage"),
      private: __("Private", "whizmanage"),
    };
    return map[value] || value;
  };

  // קטגוריות מהמוצרים
  const categories = useMemo(() => {
    if (!Array.isArray(allProducts)) return [];

    return Array.from(
      new Set(
        allProducts
          ?.flatMap((item) => item.categories?.map((cat) => cat.name?.trim()))
          .filter(Boolean)
      )
    );
  }, [allProducts]);

  // סינון לפי קטגוריות + סטטוסים + חיפוש
  const filteredData = useMemo(() => {
    if (!Array.isArray(allProducts)) return [];

    let result = allProducts;

    // לפי קטגוריות
    if (selectedCategories.length > 0) {
      result = result.filter((item) =>
        item.categories?.some((cat) => selectedCategories.includes(cat.name))
      );
    }

    // לפי סטטוס
    if (selectedStatuses.length > 0) {
      result = result.filter((item) => selectedStatuses.includes(item.status));
    }

    // חיפוש
    if (!searchValue.trim()) {
      return result;
    }

    const searchLower = searchValue.toLowerCase();
    return result.filter(
      (item) =>
        item.name?.toLowerCase().includes(searchLower) ||
        String(item.id).includes(searchLower)
    );
  }, [allProducts, selectedCategories, selectedStatuses, searchValue]);

  // מוצרים נבחרים (אובייקטים) - check window.listProduct first
  const selectedProductsData = useMemo(() => {
    if (productIds.length === 0) return [];
    const products = window?.listProduct || allProducts;
    return products.filter((item) => productIds.includes(item.id));
  }, [allProducts, productIds]);

  // בחירת מוצר
  const handleSelect = (item) => {
    setProductIds((prev) => {
      if (prev.includes(item.id)) {
        return prev.filter((id) => id !== item.id);
      } else {
        return [...prev, item.id];
      }
    });
  };

  // בחירת קטגוריה
  const handleCategorySelect = (category) => {
    setSelectedCategories((prev) => {
      if (prev.includes(category)) {
        return prev.filter((cat) => cat !== category);
      } else {
        return [...prev, category];
      }
    });
  };

  const clearCategories = () => setSelectedCategories([]);

  // בחירת סטטוס
  const handleStatusSelect = (status) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((st) => st !== status)
        : [...prev, status]
    );
  };

  const clearStatuses = () => setSelectedStatuses([]);

  // הסרת קטגוריה מהפילטר
  const handleRemoveCategory = (categoryToRemove) => {
    setSelectedCategories((prev) => prev.filter((cat) => cat !== categoryToRemove));
  };

  // הסרת סטטוס מהפילטר
  const handleRemoveStatus = (statusToRemove) => {
    setSelectedStatuses((prev) => prev.filter((st) => st !== statusToRemove));
  };

  return (
    <div className="w-full flex flex-col gap-2">
      {/* תצוגת המוצרים הנבחרים עם Chips */}
      {selectedProductsData.length > 0 && (
        <div className="flex flex-wrap gap-2 min-h-10 items-center dark:bg-slate-700 rounded-lg px-2 py-2 border dark:border-slate-600">
          {selectedProductsData.map((product) => (
            <Chip
              key={product.id}
              onClose={() => {
                setProductIds((prev) => prev.filter((id) => id !== product.id));
              }}
              variant="flat"
              classNames={{
                base: "bg-gradient-to-br from-fuchsia-50 dark:from-slate-800 to-fuchsia-200 dark:to-slate-700",
                content: "text-fuchsia-600 dark:text-slate-300",
                closeButton: "text-fuchsia-600 dark:text-slate-300",
              }}
            >
              {product.name?.replace(/\\/g, "").replace(/"/g, "''")}
            </Chip>
          ))}
        </div>
      )}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "h-10 w-full justify-between",
              "dark:bg-slate-700 dark:border-slate-600 dark:hover:!bg-slate-600"
            )}
          >
            <div className="flex-grow text-start overflow-hidden flex items-center">
              {productIds.length === 0
                ? __("Select Products", "whizmanage")
                : `${productIds.length} ${__("products selected", "whizmanage")}`}
            </div>
            <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="p-0 dark:bg-slate-800 w-[350px]"
          align="start"
        >
          <Command className="dark:bg-slate-800">
            <div className="p-1 w-full dark:border-slate-700">
              <CommandInput
                placeholder={`${__("Find Products", "whizmanage")}`}
                className="!border-none !ring-0 w-full h-8"
                value={searchValue}
                onValueChange={setSearchValue}
              />
            </div>

            {/* 🔽 כאן נכנסים הפילטרים – קטגוריה + סטטוס אחד מתחת לשני */}
            <div className="px-2 pb-1 flex flex-col gap-2 dark:border-slate-700">
              {/* תצוגת קטגוריות נבחרות */}
              {selectedCategories.length > 0 && (
                <div className="flex flex-wrap gap-1 items-center">
                  {selectedCategories.map((cat, idx) => (
                    <Chip
                      key={idx}
                      size="sm"
                      onClose={() => handleRemoveCategory(cat)}
                      variant="flat"
                      classNames={{
                        base: "bg-gradient-to-br from-fuchsia-50 dark:from-slate-800 to-fuchsia-200 dark:to-slate-700 h-6",
                        content: "text-fuchsia-600 dark:text-slate-300 text-xs",
                        closeButton: "text-fuchsia-600 dark:text-slate-300",
                      }}
                    >
                      {cat}
                    </Chip>
                  ))}
                </div>
              )}

              {/* תצוגת סטטוסים נבחרים */}
              {selectedStatuses.length > 0 && (
                <div className="flex flex-wrap gap-1 items-center">
                  {selectedStatuses.map((st, idx) => (
                    <Chip
                      key={idx}
                      size="sm"
                      onClose={() => handleRemoveStatus(st)}
                      variant="flat"
                      classNames={{
                        base: "bg-gradient-to-br from-fuchsia-50 dark:from-slate-800 to-fuchsia-200 dark:to-slate-700 h-6",
                        content: "text-fuchsia-600 dark:text-slate-300 text-xs",
                        closeButton: "text-fuchsia-600 dark:text-slate-300",
                      }}
                    >
                      {getStatusLabel(st)}
                    </Chip>
                  ))}
                </div>
              )}

              {/* פילטר קטגוריה */}
              <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 flex items-center gap-2 dark:bg-slate-700 dark:border-slate-600 dark:hover:bg-slate-600 w-full justify-between"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Filter className="h-4 w-4 shrink-0 text-slate-500" />
                      <span className="text-slate-500 text-sm">
                        {__("Filter by Category", "whizmanage")}
                        {selectedCategories.length > 0 && ` (${selectedCategories.length})`}
                      </span>
                    </div>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="p-0 dark:bg-slate-800 w-[300px]"
                  align="start"
                >
                  <Command className="dark:bg-slate-800">
                    <CommandInput
                      placeholder={__("Search categories...", "whizmanage")}
                      className="!border-none !ring-0"
                    />
                    <CommandList>
                      <div className="p-2 flex justify-between items-center border-b dark:border-slate-700">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`text-xs text-red-500 h-7 ${selectedCategories.length === 0 ? "invisible" : ""}`}
                          onClick={() => {
                            clearCategories();
                            setFilterOpen(false);
                          }}
                        >
                          {__("Clear filters", "whizmanage")}
                        </Button>
                        <span className="text-xs text-slate-500">
                          {selectedCategories.length} {__("selected", "whizmanage")}
                        </span>
                      </div>
                      <CommandEmpty>{__("No categories found.", "whizmanage")}</CommandEmpty>
                      {categories.map((category, index) => (
                        <CommandItem
                          key={index}
                          onSelect={() => handleCategorySelect(category)}
                          className="cursor-pointer dark:hover:bg-slate-700"
                        >
                          <div className="flex items-center w-full">
                            <div
                              className={cn(
                                "mr-2 h-4 w-4 rounded border flex items-center justify-center",
                                selectedCategories.includes(category)
                                  ? "bg-fuchsia-600 border-fuchsia-600 text-white"
                                  : "opacity-50 border-slate-500"
                              )}
                            >
                              {selectedCategories.includes(category) && (
                                <Check className="h-3 w-3" />
                              )}
                            </div>
                            <span className="truncate flex-grow">
                              {category}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* פילטר סטטוס */}
              <Popover
                open={statusFilterOpen}
                onOpenChange={setStatusFilterOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 flex items-center gap-2 dark:bg-slate-700 dark:border-slate-600 dark:hover:bg-slate-600 w-full justify-between"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Filter className="h-4 w-4 shrink-0 text-slate-500" />
                      <span className="text-slate-500 text-sm">
                        {__("Filter by Status", "whizmanage")}
                        {selectedStatuses.length > 0 && ` (${selectedStatuses.length})`}
                      </span>
                    </div>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="p-0 dark:bg-slate-800 w-[260px]"
                  align="start"
                >
                  <Command className="dark:bg-slate-800">
                    <CommandList>
                      <div className="p-2 flex justify-between items-center border-b dark:border-slate-700">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`text-xs text-red-500 h-7 ${selectedStatuses.length === 0 ? "invisible" : ""}`}
                          onClick={() => {
                            clearStatuses();
                            setStatusFilterOpen(false);
                          }}
                        >
                          {__("Clear filters", "whizmanage")}
                        </Button>
                        <span className="text-xs text-slate-500">
                          {selectedStatuses.length} {__("selected", "whizmanage")}
                        </span>
                      </div>
                      <CommandEmpty>{__("No statuses found.", "whizmanage")}</CommandEmpty>
                      <CommandGroup heading={__("Status", "whizmanage")}>
                        {STATUS_OPTIONS.map((status) => (
                          <CommandItem
                            key={status.value}
                            onSelect={() => handleStatusSelect(status.value)}
                            className="cursor-pointer dark:hover:bg-slate-700"
                          >
                            <div className="flex items-center w-full">
                              <div
                                className={cn(
                                  "mr-2 h-4 w-4 rounded border flex items-center justify-center",
                                  selectedStatuses.includes(status.value)
                                    ? "bg-fuchsia-600 border-fuchsia-600 text-white"
                                    : "opacity-50 border-slate-500"
                                )}
                              >
                                {selectedStatuses.includes(status.value) && (
                                  <Check className="h-3 w-3" />
                                )}
                              </div>
                              <span className="truncate flex-grow">
                                {getStatusLabel(status.value)}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* רשימת מוצרים */}
            <CommandList>
              <CommandEmpty>{__("No results found.", "whizmanage")}</CommandEmpty>
              <div className="flex justify-between items-center gap-2 p-1 dark:border-slate-700">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`text-xs text-red-500 h-4 px-1 ${productIds.length === 0 ? "invisible" : ""}`}
                  onClick={() => setProductIds([])}
                >
                  <X className="h-3 w-3 mr-1" />
                  {__("Clear selection", "whizmanage")}
                </Button>
                <span className="text-xs text-slate-500 h-4">
                  {productIds.length} {__("selected", "whizmanage")}
                </span>
              </div>
              <CommandGroup className="p-1" heading={`${__("Products", "whizmanage")}`}>
                {isLoadingProducts ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <PuffLoader size={50} color="rgb(192 38 211)" />
                  </div>
                ) : filteredData.length < 1 ? (
                  <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                    {__("No products available", "whizmanage")}
                  </div>
                ) : (
                  filteredData.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={`${item.name || ""} ${item.id || ""}`}
                      className="cursor-pointer dark:hover:bg-slate-700 group/item"
                      onSelect={() => handleSelect(item)}
                    >
                      <div className="flex items-center w-full gap-2">
                        <div
                          className={cn(
                            "mr-2 h-4 w-4 rounded border flex items-center justify-center",
                            productIds.includes(item.id)
                              ? "bg-fuchsia-600 border-fuchsia-600 text-white"
                              : "opacity-50 border-slate-500"
                          )}
                        >
                          {productIds.includes(item.id) && (
                            <Check className="h-3 w-3" />
                          )}
                        </div>
                        <span className="truncate flex-grow">
                          {item.name?.replace(/\\/g, "").replace(/"/g, "''")}
                        </span>
                        <span className="text-xs text-slate-500 shrink-0">
                          #{item.id}
                        </span>
                      </div>
                    </CommandItem>
                  ))
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default ExportProductsIds;
