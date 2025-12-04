import { IconBadge } from "@components/IconBadge";
import { Label } from "@components/ui/label";
import { GaugeCircle, Info } from "lucide-react";
import MultiSelectInput from "./MultiSelectInput";
import { __ } from '@wordpress/i18n';
import ProductIds from "../../../table/edit/ProductIds";
<<<<<<<< HEAD:src/pages/coupons/_components/header/add/coupon/AdvancedUsageRestrictions.jsx
import { useState, useEffect } from "react";
========
import { useState } from "react";
>>>>>>>> main-pro:src/pages/orders/_components/header/add/order/AdvancedUsageRestrictions.jsx
import { Chip } from "@heroui/react";
import { Separator } from "@components/ui/separator";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@components/ui/hover-card";

const AdvancedUsageRestrictions = ({ updateValue }) => {
   
  const [products, setProducts] = useState([]);
  const [excludeProducts, setExcludeProducts] = useState([]);
  const [productCategories, setProductCategories] = useState([]);
  const [excludedProductCategories, setExcludedProductCategories] = useState([]);

  const productHandleClose = (itemToRemove) => {
    const newProducts = products.filter((item) => item !== itemToRemove);
    setProducts(newProducts);
    updateValue("product_ids", newProducts);
  };

  const excludeProductsHandleClose = (itemToRemove) => {
    const newExcludeProducts = excludeProducts.filter(
      (item) => item !== itemToRemove
    );
    setExcludeProducts(newExcludeProducts);
    updateValue("excluded_product_ids", newExcludeProducts);
  };


  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-x-2 mb-2">
        <IconBadge icon={GaugeCircle} />
        <h2 className="text-xl dark:text-gray-400">
          {__("Advanced Usage Restrictions")}
        </h2>
      </div>
      <div className="flex flex-col w-full gap-1.5">
        <div className="w-full flex items-center justify-start gap-1.5">
          <HoverCard openDelay={300}>
            <HoverCardTrigger asChild>
              <Info className="h-3 w-3 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer" />
            </HoverCardTrigger>
            <HoverCardContent className="w-80 z-50" side="top" align="start">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">{__("Products")}</h4>
                <p className="text-sm text-muted-foreground">
                  {__(
                    "Products that the coupon will be applied to, or that need to be in the cart in order for the \"Fixed cart discount\" to be applied."
                  )}

                </p>
              </div>
            </HoverCardContent>
          </HoverCard>
          <Label htmlFor="product_ids">{__("Products")}</Label>
        </div>
        <div className="flex flex-wrap gap-2 relative min-h-10 items-center dark:bg-slate-700 rounded-lg">
          {products.length > 0 ? (
            products.map((item, index) => (
              <Chip
                key={index}
                onClose={() => productHandleClose(item)}
                variant="flat"
                classNames={{
                  base: "bg-gradient-to-br from-fuchsia-50 dark:from-slate-700 to-fuchsia-200 dark:to-slate-600 opacity-100",
                  content: "text-fuchsia-600 dark:text-slate-300",
                  closeButton: "text-fuchsia-600 dark:text-slate-300",
                }}
              >
                {item.name}
              </Chip>
            ))
          ) : (
            <div className="font-extralight text-base text-muted-foreground px-4">
              {__("No products")}
            </div>
          )}
        </div>
        <ProductIds
          products={products}
          setProducts={setProducts}
          updateValue={updateValue}
          field="product_ids"
        />
      </div>
      <Separator className="mb-2" />
      <div className="flex flex-col w-full gap-1.5">
        <div className="w-full flex items-center justify-start gap-1.5">
          <HoverCard openDelay={300}>
            <HoverCardTrigger asChild>
              <Info className="h-3 w-3 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer" />
            </HoverCardTrigger>
            <HoverCardContent className="w-80 z-50" side="top" align="start">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">
                  {__("Exclude products")}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {__(
                    "Products that the coupon will not be applied to, or that cannot be in the cart in order for the \"Fixed cart discount\" to be applied."
                  )}
                </p>
              </div>
            </HoverCardContent>
          </HoverCard>
          <Label htmlFor="excluded_product_ids">{__("Exclude products")}</Label>
        </div>
        <div className="flex flex-wrap gap-2 relative min-h-10 items-center dark:bg-slate-700 rounded-lg">
          {excludeProducts.length > 0 ? (
            excludeProducts.map((item, index) => (
              <Chip
                key={index}
                onClose={() => excludeProductsHandleClose(item)}
                variant="flat"
                classNames={{
                  base: "bg-gradient-to-br from-fuchsia-50 dark:from-slate-700 to-fuchsia-200 dark:to-slate-600 opacity-100",
                  content: "text-fuchsia-600 dark:text-slate-300",
                  closeButton: "text-fuchsia-600 dark:text-slate-300",
                }}
              >
                {item.name}
              </Chip>
            ))
          ) : (
            <div className="font-extralight text-base text-muted-foreground px-4">
              {__("No products")}
            </div>
          )}
        </div>
        <ProductIds
          products={excludeProducts}
          setProducts={setExcludeProducts}
          updateValue={updateValue}
          field="excluded_product_ids"
        />
      </div>
      <Separator className="mb-2" />
      <div className="flex flex-col w-full gap-1.5">
        <div className="w-full flex items-center justify-start gap-1.5">
          <HoverCard openDelay={300}>
            <HoverCardTrigger asChild>
              <Info className="h-3 w-3 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer" />
            </HoverCardTrigger>
            <HoverCardContent className="w-80 z-50" side="top" align="start">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">
                  {__("Product categories")}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {__(
                    "Product categories that the coupon will be applied to, or that need to be in the cart in order for the \"Fixed cart discount\" to be applied."
                  )}

                </p>
              </div>
            </HoverCardContent>
          </HoverCard>
          <Label htmlFor="product_categories">{__("Product categories")}</Label>
        </div>
        <MultiSelectInput
          columnName="product_categories"
          updateValue={(field, values) => { updateValue(field, values), setProductCategories(values) }}
          excluded={false}
          disabledIds={excludedProductCategories}
        />
      </div>
      <Separator className="mb-2" />
      <div className="flex flex-col w-full gap-1.5">
        <div className="w-full flex items-center justify-start gap-1.5">
          <HoverCard openDelay={300}>
            <HoverCardTrigger asChild>
              <Info className="h-3 w-3 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer" />
            </HoverCardTrigger>
            <HoverCardContent className="w-80 z-50" side="top" align="start">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">
                  {__("Exclude categories")}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {__(
                    "Product categories that the coupon will be applied to"
                  )}

                </p>
              </div>
            </HoverCardContent>
          </HoverCard>
          <Label htmlFor="excluded_product_categories">
            {__("Exclude categories")}
          </Label>
        </div>
        <MultiSelectInput
          columnName="excluded_product_categories"
          updateValue={(field, values) => { updateValue(field, values), setExcludedProductCategories(values) }}
          excluded={true}
          disabledIds={productCategories}
        />
      </div>
    </div>
  );
};

export default AdvancedUsageRestrictions;
