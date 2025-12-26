// src/components/forms/core/fields/ProductIdsInput.jsx

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import Loader from "@components/ui/custom/Loader";
import { Label } from "@/components/ui/label";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Chip } from "@heroui/react";
import { Check, ChevronsUpDown, Info, Package } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { Controller } from "react-hook-form";
 import { __ } from "@wordpress/i18n";
import { useGenericForm } from "../FormProvider";
import CustomTooltip from "@components/ui/nextUI/Tooltip";

/* ========================= ProductSelectItem ========================= */
function ProductSelectItem({ product, isSelected, onToggle }) {
   

  const STOCK_LABELS = {
    instock: "In stock",
    outofstock: "Out of stock",
    onbackorder: "On backorder",
  };

  const priceDisplay = useMemo(() => {
    if (product.price) {
      const currency = window?.currencySymbol || "$";
      const position = window?.currencyPos || "left";

      if (position === "left" || position === "left_space") {
        return `${currency}${product.price}`;
      }
      return `${product.price}${currency}`;
    }
    return null;
  }, [product.price]);

  // תמונה יכולה להגיע משני סוגי מבנים:
  // - מה־API הרגיל: images[0].src
  // - מה־API של הקופונים: image (URL)
  const firstImageSrc = product?.images?.[0]?.src || product?.image || null;

  const stockStatusLabel = STOCK_LABELS[product.stock_status] || null;

  return (
    <CommandItem
      onSelect={onToggle}
      className="cursor-pointer"
      // מאפשר חיפוש לפי שם, SKU וגם מזהה המוצר
      value={`${product?.name ?? ""} ${product?.sku ?? ""} ${product?.id ?? ""}`}
      // אם אתם על גרסה שתומכת keywords אפשר גם:
      // keywords={[product?.sku, String(product?.id)]}
    >
      <div className="flex items-start gap-2 w-full">
        <Check
          className={`h-4 w-4 mt-0.5 shrink-0 ${
            isSelected ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* תמונה או אייקון ברירת מחדל */}
        {firstImageSrc ? (
          <img
            src={firstImageSrc}
            alt={product.name}
            className="w-10 h-10 object-cover rounded border dark:border-slate-600"
          />
        ) : (
          <div className="w-10 h-10 flex items-center justify-center rounded border dark:border-slate-600 bg-slate-100 dark:bg-slate-700">
            <Package className="w-5 h-5 opacity-60" />
          </div>
        )}

        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <CustomTooltip title={product.name}>
            <span className="text-sm font-medium truncate">{product.name}</span>
          </CustomTooltip>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {product.sku && (
              <span className="truncate">SKU: {product.sku}</span>
            )}
            {priceDisplay && (
              <>
                <span>•</span>
                <span>{priceDisplay}</span>
              </>
            )}
          </div>

          {/* סטטוס מלאי אמיתי מה־API */}
          {stockStatusLabel && (
            <span
              className={`text-xs ${
                product.stock_status === "instock"
                  ? "text-green-600 dark:text-green-400"
                  : product.stock_status === "outofstock"
                  ? "text-red-600 dark:text-red-400"
                  : "text-orange-600 dark:text-orange-400"
              }`}
            >
              {__(stockStatusLabel, "whizmanage")}
            </span>
          )}
        </div>
      </div>
    </CommandItem>
  );
}

/* ========================= ProductIdsInput ========================= */
export default function ProductIdsInput({
  name,
  label,
  rules,
  placeholder,
  helperText,
  excluded = false,
}) {
   
  const { control } = useGenericForm();

  const [isOpen, setIsOpen] = useState(false);

  // נטען ישירות מה־window, בלי קריאה לשרת
  const [productsExist, setProductsExist] = useState(() => {
    return Array.isArray(window?.listProduct) ? window.listProduct : [];
  });

  const [isLoading, setIsLoading] = useState(false);

  // כשפותחים את הפופאבר – נוודא שיש לנו את הרשימה המעודכנת מה־window
  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    try {
      const data = Array.isArray(window?.listProduct) ? window.listProduct : [];
      setProductsExist(data);
    } finally {
      setIsLoading(false);
    }
  }, [isOpen]);

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
              <p className="whitespace-pre-wrap break-words">
                {__(helperText, "whizmanage")}
              </p>
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
        defaultValue={[]}
        render={({ field, fieldState: { error } }) => {
          const selectedProducts = useMemo(() => {
            if (!Array.isArray(field.value)) return [];

            return field.value
              .map((id) => {
                if (typeof id === "object" && id.id) return id;
                const product = productsExist.find((p) => p.id === id);
                return product || { id, name: `Product #${id}` };
              })
              .filter(Boolean);
          }, [field.value, productsExist]);

          const selectedIds = new Set(selectedProducts.map((p) => p.id));

          const toggleProduct = (product) => {
            const isSelected = selectedIds.has(product.id);

            if (isSelected) {
              const nextValue = field.value.filter((id) => {
                const productId = typeof id === "object" ? id.id : id;
                return productId !== product.id;
              });
              field.onChange(nextValue);
            } else {
              field.onChange([...field.value, product.id]);
            }
          };

          return (
            <>
              {/* chips של המוצרים שנבחרו */}
              <div className="flex flex-wrap gap-2 relative min-h-10 items-center dark:bg-slate-700 rounded-lg p-2">
                {selectedProducts.length > 0 ? (
                  selectedProducts.map((product) => (
                    <CustomTooltip key={product.id} title={product.name}>
                      <Chip
                        onClose={() => toggleProduct(product)}
                        variant="flat"
                        classNames={{
                          base: excluded
                            ? "bg-gradient-to-br from-red-50 dark:from-red-900/20 to-red-200 dark:to-red-800/20 opacity-100"
                            : "bg-gradient-to-br from-fuchsia-50 dark:from-slate-800 to-fuchsia-200 dark:to-slate-700 opacity-100",
                          content: excluded
                            ? "text-red-600 dark:text-red-400"
                            : "text-fuchsia-600 dark:text-slate-300",
                          closeButton: excluded
                            ? "text-red-600 dark:text-red-400"
                            : "text-fuchsia-600 dark:text-slate-300",
                        }}
                      >
                        {product.name}
                      </Chip>
                    </CustomTooltip>
                  ))
                ) : (
                  <div className="font-extralight text-base text-muted-foreground px-2">
                    {excluded ? __("No excluded products", "whizmanage") : __("No products", "whizmanage")}
                  </div>
                )}
              </div>
              {/* כפתור לפתיחת הפופאבר – עכשיו עם w-full */}
              <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex justify-between h-10 dark:bg-slate-700 dark:hover:!bg-slate-800 !rounded-lg w-full"
                  >
                    {placeholder ||
                      (excluded
                        ? __("Select excluded products", "whizmanage")
                        : __("Select products", "whizmanage"))}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>

                <PopoverContent
                  className="p-0 dark:bg-slate-800 w-[360px]"
                  align="start"
                >
                  {/* cmdk מבצע סינון מובנה לפי value/טקסט של CommandItem */}
                  <Command className="dark:bg-slate-800">
                    <div className="flex !border-b dark:border-slate-700">
                      <CommandInput
                        placeholder={__("Find products by name or SKU", "whizmanage")}
                        className="!border-none !ring-0 w-full"
                      />
                    </div>

                    <CommandList className="max-h-[360px] overflow-y-auto scrollbar-whiz">
                      {!isLoading && productsExist.length === 0 && (
                        <CommandEmpty>{__("No products found.", "whizmanage")}</CommandEmpty>
                      )}

                      <CommandGroup
                        heading={
                          productsExist.length > 0
                            ? excluded
                              ? __("Excluded products", "whizmanage")
                              : __("Available products", "whizmanage")
                            : ""
                        }
                      >
                        {isLoading ? (
                          <div className="flex justify-center py-6">
                            <Loader />
                          </div>
                        ) : (
                          productsExist.map((product) => (
                            <ProductSelectItem
                              key={product.id}
                              product={product}
                              isSelected={selectedIds.has(product.id)}
                              onToggle={() => toggleProduct(product)}
                            />
                          ))
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
          );
        }}
      />
    </div>
  );
}
