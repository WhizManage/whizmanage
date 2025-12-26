// src/components/forms/core/fields/InventoryInput.jsx

import { CustomRadio } from "@components/ui/nextUI/Radio";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import { Checkbox, RadioGroup, Tab, Tabs } from "@heroui/react";
import { useState, useEffect } from "react";
 import { __ } from "@wordpress/i18n";
import { useGenericForm } from "../FormProvider";

export default function InventoryInput({
  name = "inventory",
  label,
  skuField = "sku",
  manageStockField = "manage_stock",
  stockQuantityField = "stock_quantity",
  backordersField = "backorders",
  stockStatusField = "stock_status",
}) {
   
  const {
    register,
    setValue,
    watch,
    getValues,
    formState: { errors },
  } = useGenericForm();

  // ✅ State מקומי לUI + סנכרון עם הטופס
  const [manageStock, setManageStock] = useState(() => getValues(manageStockField) ?? false);
  const [stockQuantity, setStockQuantity] = useState(() => getValues(stockQuantityField) ?? "");
  const [backorders, setBackorders] = useState(() => getValues(backordersField) ?? "no");
  const [stockStatus, setStockStatus] = useState(() => getValues(stockStatusField) ?? "instock");

  // סנכרון ראשוני מהטופס ל-state (למקרה של reset או שינוי חיצוני)
  const formManageStock = watch(manageStockField);
  const formStockQuantity = watch(stockQuantityField);
  const formBackorders = watch(backordersField);
  const formStockStatus = watch(stockStatusField);

  useEffect(() => {
    if (formManageStock !== undefined && formManageStock !== manageStock) {
      setManageStock(formManageStock);
    }
  }, [formManageStock]);

  useEffect(() => {
    if (formStockQuantity !== undefined && formStockQuantity !== stockQuantity) {
      setStockQuantity(formStockQuantity ?? "");
    }
  }, [formStockQuantity]);

  useEffect(() => {
    if (formBackorders !== undefined && formBackorders !== backorders) {
      setBackorders(formBackorders);
    }
  }, [formBackorders]);

  useEffect(() => {
    if (formStockStatus !== undefined && formStockStatus !== stockStatus) {
      setStockStatus(formStockStatus);
    }
  }, [formStockStatus]);

  const handleManageStockChange = (isSelected) => {
    setManageStock(isSelected);
    setValue(manageStockField, isSelected, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const handleStockQuantityChange = (e) => {
    const value = e.target.value;
    setStockQuantity(value);
    // המרה ל-number או null אם ריק
    const numValue = value === "" ? null : parseInt(value, 10);
    setValue(stockQuantityField, numValue, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const handleBackordersChange = (value) => {
    setBackorders(value);
    setValue(backordersField, value, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const handleStockStatusChange = (value) => {
    setStockStatus(value);
    setValue(stockStatusField, value, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const selectedTab = manageStock ? "Inventory tracking" : "Set status";

  return (
    <div className="flex flex-col gap-4 px-2">
      {/* SKU */}
      <div className="flex flex-col w-full gap-1.5">
        <Label htmlFor={skuField}>{__("SKU", "whizmanage")}</Label>
        <Input
          type="text"
          id={skuField}
          placeholder={__("SKU", "whizmanage")}
          className="h-10 p-0 !rounded-lg"
          {...register(skuField)}
        />
      </div>
      {/* Stock Management Checkbox */}
      <div className="flex flex-col w-full gap-1.5">
        <Label>{__("Stock management", "whizmanage")}</Label>
        <Checkbox
          color="primary"
          isSelected={manageStock}
          onValueChange={handleManageStockChange}
          classNames={{
            label: "flex gap-2 font-extralight text-base text-muted-foreground",
            base: "w-full rtl:!ml-2",
            wrapper:
              "!ring-fuchsia-600 [&:focus-visible]:!ring-fuchsia-600 [&:focus]:!ring-fuchsia-600",
          }}
        >
          {__("Track stock quantity for this product", "whizmanage")}
        </Checkbox>
      </div>
      {/* Tabs - Inventory tracking vs Set status */}
      <div className="flex flex-col w-full gap-1.5">
        <Tabs
          fullWidth
          size="md"
          aria-label="Tabs form"
          selectedKey={selectedTab}
          disabledKeys={manageStock ? ["Set status"] : ["Inventory tracking"]}
          classNames={{
            tabList: "dark:bg-slate-700 !rounded-md",
            tab: "!rounded-md",
            cursor: "dark:!bg-slate-800 !rounded-md",
            panel: "!rounded-md",
            tabContent: "!rounded-md",
          }}
        >
          {/* Tab 1: Inventory tracking */}
          <Tab key="Inventory tracking" title={__("Inventory tracking", "whizmanage")}>
            <div className="flex flex-col gap-4">
              {/* Quantity */}
              <div className="flex flex-col w-full gap-1.5">
                <Label htmlFor={stockQuantityField}>{__("Quantity", "whizmanage")}</Label>
                <Input
                  type="number"
                  id={stockQuantityField}
                  placeholder="0"
                  className="h-10 p-0"
                  value={stockQuantity}
                  onChange={handleStockQuantityChange}
                />
                {errors[stockQuantityField] && (
                  <p className="text-red-500 dark:text-pink-500 text-sm px-2">
                    {__(errors[stockQuantityField].message, "whizmanage")}
                  </p>
                )}
              </div>

              {/* Backorders */}
              <div className="flex flex-col w-full gap-1.5">
                <Label>{__("Allow backorders?", "whizmanage")}</Label>
                <RadioGroup
                  value={backorders}
                  onValueChange={handleBackordersChange}
                  classNames={{
                    wrapper: "gap-1.5",
                  }}
                >
                  <CustomRadio
                    value="no"
                    className="!rounded-md"
                    classNames={{
                      wrapper:
                        "!ring-fuchsia-600 [&:focus-visible]:!ring-fuchsia-600 [&:focus]:!ring-fuchsia-600",
                    }}
                  >
                    {__("Do not allow", "whizmanage")}
                  </CustomRadio>
                  <CustomRadio
                    value="notify"
                    className="!rounded-md"
                    classNames={{
                      wrapper:
                        "!ring-fuchsia-600 [&:focus-visible]:!ring-fuchsia-600 [&:focus]:!ring-fuchsia-600",
                    }}
                  >
                    {__("Allow, but notify customer", "whizmanage")}
                  </CustomRadio>
                  <CustomRadio
                    value="yes"
                    className="!rounded-md"
                    classNames={{
                      wrapper:
                        "!ring-fuchsia-600 [&:focus-visible]:!ring-fuchsia-600 [&:focus]:!ring-fuchsia-600",
                    }}
                  >
                    {__("Allow", "whizmanage")}
                  </CustomRadio>
                </RadioGroup>
              </div>
            </div>
          </Tab>

          {/* Tab 2: Set status */}
          <Tab key="Set status" title={__("Set status", "whizmanage")}>
            <div className="grid w-full gap-1.5">
              <Label>{__("Stock status", "whizmanage")}</Label>
              <RadioGroup
                value={stockStatus}
                onValueChange={handleStockStatusChange}
                classNames={{
                  wrapper: "gap-1.5",
                }}
              >
                <CustomRadio value="instock" className="!rounded-md !h-10">
                  {__("In stock", "whizmanage")}
                </CustomRadio>
                <CustomRadio value="outofstock" className="!rounded-md !h-10">
                  {__("Out of stock", "whizmanage")}
                </CustomRadio>
                <CustomRadio value="onbackorder" className="!rounded-md !h-10">
                  {__("On backorder", "whizmanage")}
                </CustomRadio>
              </RadioGroup>
            </div>
          </Tab>
        </Tabs>
      </div>
    </div>
  );
}
