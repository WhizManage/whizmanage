import { IconBadge } from "@components/IconBadge";
import { CustomRadio } from "@components/nextUI/CustomRadio";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import { Checkbox, RadioGroup, Tab, Tabs } from "@heroui/react";
import { Container } from "lucide-react";
import { useState } from "react";
import { __ } from '@wordpress/i18n';

const InventoryGroup = ({ register, updateValue }) => {
   
  const [menageStock, setMenageStock] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-x-2">
        <IconBadge icon={Container} />
        <h2 className="text-xl dark:text-gray-400">{__("Inventory", "whizmanage")}</h2>
      </div>
      <div className="flex flex-col w-full gap-1.5">
        <Label htmlFor="sku">{__("SKU", "whizmanage")}</Label>
        <div className="relative h-10 border rounded-lg flex gap-1 items-center px-1 dark:bg-slate-700">
          <Input
            type="text"
            id="sku"
            placeholder={__("SKU", "whizmanage")}
            className="!border-none !ring-0 dark:!text-slate-300 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0"
            {...register("sku")}
          />
        </div>
      </div>
      <div className="flex flex-col w-full gap-1.5">
        <Label>{__("Stock management", "whizmanage")}</Label>
        <Checkbox
          color="primary"
          onValueChange={(isSelected) => {
            setMenageStock(isSelected);         
            updateValue("manage_stock", isSelected);
            
          }}
          classNames={{ label: "flex gap-2 font-extralight text-base text-muted-foreground", base: "w-full rtl:!ml-2" }}
        >
          {__("Track stock quantity for this product", "whizmanage")}
        </Checkbox>
      </div>
      <div className="flex flex-col w-full gap-1.5">
        <Tabs
          fullWidth
          size="md"
          aria-label="Tabs form"
          selectedKey={menageStock ? "Inventory tracking" : "Set status"}
          disabledKeys={menageStock ? ["Set status"] : ["Inventory tracking"]}
          classNames={{
            tabList: "dark:bg-slate-700",
            tab: "dark:group-data-[selected=true]:!bg-slate-800",
          }}
        >
          <Tab key="Inventory tracking" title={__("Inventory tracking", "whizmanage")}>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col w-full gap-1.5">
                <Label htmlFor="quantity">{__("Quantity", "whizmanage")}</Label>
                <div className="relative h-10 dark:bg-slate-700 border rounded-lg flex gap-1 items-center px-1">
                  <Input
                    type="number"
                    id="quantity"
                    placeholder="0"
                    className="!border-none dark:!text-slate-300 !ring-0 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0"
                    {...register("stock_quantity", { min: 0 })}
                  />
                </div>
              </div>
              <div className="flex flex-col w-full gap-1.5">
                <Label>{__("Allow backorders?", "whizmanage")}</Label>
                <RadioGroup
                  defaultValue="no"
                  onValueChange={(value) => {
                    updateValue("backorders", value);
                  }}
                >
                  <CustomRadio value="no">{__("Do not allow", "whizmanage")}</CustomRadio>
                  <CustomRadio value="notify">
                    {__("Allow, but notify customer", "whizmanage")}
                  </CustomRadio>
                  <CustomRadio value="yes">{__("Allow", "whizmanage")}</CustomRadio>
                </RadioGroup>
              </div>
            </div>
          </Tab>
          <Tab key="Set status" title={__("Set status", "whizmanage")}>
            <div className="grid w-full gap-1.5">
              <Label>{__("Stock status", "whizmanage")}</Label>
              <RadioGroup
                defaultValue="instock"
                onValueChange={(value) => {
                  updateValue("stock_status", value);
                }}
              >
                <CustomRadio value="instock">{__("In stock", "whizmanage")}</CustomRadio>
                <CustomRadio value="outofstock">{__("Out of stock", "whizmanage")}</CustomRadio>
                <CustomRadio value="onbackorder">{__("On backorder", "whizmanage")}</CustomRadio>
              </RadioGroup>
            </div>
          </Tab>
        </Tabs>
      </div>
    </div>
  );
};

export default InventoryGroup;
