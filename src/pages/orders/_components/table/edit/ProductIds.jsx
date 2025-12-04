import { useState, useEffect } from "react";
import { __ } from '@wordpress/i18n';
import Loader from "@components/Loader";
import { Button } from "@components/ui/button";
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
import { cn } from "@heroui/react";
import { Check, ChevronsUpDown, Package } from "lucide-react";
import { useOrdersContext } from "@/context/OrdersContext";

const ProductIds = ({
  products,
  row,
  updateValue,
  field,
  setProducts,
  existingIds,
  disabledIds,
  excluded,
}) => {
  const [productIds, setProductIds] = useState(() =>
    existingIds?.length ? existingIds : (products || []).map((item) => item.id)
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
   
  const { ordersData } = useOrdersContext();

  // סימולציה של טעינה אם הנתונים לא זמינים מיד
  useEffect(() => {
    if (isOpen && (!ordersData || ordersData.length === 0)) {
      setIsLoading(true);
      // אם יש צורך לטעון נתונים, כאן יהיה המקום
      // כרגע נסמן שהטעינה הסתיימה
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setIsLoading(false);
    }
  }, [isOpen, ordersData]);

  const handleSelect = (item) => {
    setProductIds((prevProductIds) => {
      const isSelected = prevProductIds.includes(item.id);
      const newProductIds = isSelected
        ? prevProductIds.filter((id) => id !== item.id)
        : [...prevProductIds, item.id];

      // Update row or value
      if (row) {
        if (excluded) row.original.excluded_product_ids = newProductIds;
        else row.original.product_ids = newProductIds;
      } else if (updateValue && field) {
        updateValue(field, newProductIds);
      }

      // Update selected products
      setProducts &&
        setProducts((prevProducts) => {
          const isProductSelected = prevProducts.find(
            (product) => product.id === item.id
          );
          return isProductSelected
            ? prevProducts.filter((product) => product.id !== item.id)
            : [...prevProducts, item];
        });

      return newProductIds;
    });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen} aria-label="Choose">
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            row ? "h-8" : "h-10",
            "flex justify-between dark:bg-slate-700 dark:hover:!bg-slate-600"
          )}
        >
          {__("Select Products", "whizmanage")}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 dark:bg-slate-800" align="start">
        <Command className="dark:bg-slate-800">
          <CommandInput
            placeholder={`${__("Find Products", "whizmanage")}`}
            className="!border-none !ring-0"
          />
          <CommandList>
            {/* CommandEmpty רק כשיש מוצרים קיימים ומחפשים */}
            {!isLoading && ordersData?.length > 0 && (
              <CommandEmpty>{__("No results found.", "whizmanage")}</CommandEmpty>
            )}

            <CommandGroup
              heading={ordersData?.length > 0 ? __("Products exist", "whizmanage") : ""}
            >
              {isLoading ? (
                <div className="flex justify-center py-6">
                  <Loader />
                </div>
              ) : ordersData?.length > 0 ? (
                ordersData.map((item) => (
                  <CommandItem
                    key={item.id}
                    className="cursor-pointer dark:hover:bg-slate-700 group/item flex gap-4"
                    onSelect={() => handleSelect(item)}
                    disabled={disabledIds && disabledIds.includes(item.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        productIds.includes(item.id)
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <span>{item.name.replace(/\\/g, '').replace(/"/g, "''")}</span>
                    <span>({item.id})</span>
                  </CommandItem>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center space-y-2 py-8 max-w-60 mx-auto">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                      <Package className="w-6 h-6 text-gray-400 dark:text-slate-400" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-slate-200 mb-1">
                      {__("No products available", "whizmanage")}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
                      {__(
                        "No products found in the system. Create products first to use this feature.",
                        "whizmanage"
                      )}
                    </p>
                  </div>
                </div>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default ProductIds;
