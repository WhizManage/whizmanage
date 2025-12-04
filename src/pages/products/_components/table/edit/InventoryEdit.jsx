import { convertInventory, inventoryStyles } from "@/data/inventoryStyles";
import { cn } from "@/lib/utils";
import { Button } from "@components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import { Switch } from "@components/ui/switch";
import { RadioGroup } from "@heroui/react";
import { CustomRadio } from "@components/nextUI/CustomRadio";
import React, { useEffect, useState } from "react";
import { __ } from '@wordpress/i18n';

const InventoryEdit = ({ row }) => {
  const [manage, setManage] = useState(row.original.manage_stock);
  const [quantity, setQuantity] = useState(row.original.stock_quantity);
  const [lowQuantity, setLowQuantity] = useState(row.original.low_stock_amount);
 
  const [status, setStatus] = useState(row.original.stock_status);
  const [backorders, setBackorders] = useState(row.original.backorders);
  useEffect(() => {
    row.original.manage_stock = manage;
  }, [manage]);
  const isRTL = document.documentElement.dir === 'rtl';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            inventoryStyles(row.original),
            "h-8 min-w-20 uppercase !px-2"
          )}
        >
          {manage ? quantity : __(status, "whizmanage")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" dir={isRTL ? "rtl" : "ltr"}align={isRTL ? "end" : "start"}>
        {/* ניהול מלאי */}
        <DropdownMenuLabel className="flex items-center justify-between rtl:space-x-reverse rtl:space-x-2">
          <Label htmlFor="airplane-mode" className="flex-1 h-full">
            {__("Manage stock", "whizmanage")}
          </Label>
          <Switch
            id="airplane-mode"
            checked={manage}
            onCheckedChange={() => {
              setManage(!manage);
              row.original.manage_stock = !manage;
            }}
          />
        </DropdownMenuLabel>

        {manage ? (
          <>
            {/* כמות במלאי */}
            <DropdownMenuLabel className="flex flex-col items-start space-y-1 mt-2">
              <span className="text-sm font-medium">{__("Stock quantity", "whizmanage")}</span>
              <Input
                type="number"
                min={0}
                placeholder={__("Enter quantity", "whizmanage")}
                onChange={(e) => {
                  const value = e.target.value || "0";
                  setQuantity(value);
                  row.original.stock_quantity = value;
                }}
                defaultValue={quantity}
                className="h-8 min-w-40 dark:!text-slate-300 text-right"
                onFocus={(event) => event.target.select()}
              />
            </DropdownMenuLabel>

            {/* סף אזל מהמלאי */}
            <DropdownMenuLabel className="flex flex-col items-start space-y-1 mt-2">
              <span className="text-sm font-medium">
                {__("Low stock threshold", "whizmanage")}
              </span>
              <Input
                type="number"
                min={0}
                placeholder={__("Enter low stock amount", "whizmanage")}
                onChange={(e) => {
                  const value = e.target.value || "0";
                  setLowQuantity(value);
                  row.original.low_stock_amount = value;
                }}
                defaultValue={lowQuantity}
                className="h-8 min-w-40 dark:!text-slate-300 text-right"
                onFocus={(event) => event.target.select()}
              />
            </DropdownMenuLabel>

            {/* הזמנות חוזרות */}
            <DropdownMenuLabel className="flex flex-col items-start space-y-1 mt-2">
              <span className="text-sm font-medium">
                {__("Allow backorders?", "whizmanage")}
              </span>
              <RadioGroup
                value={backorders}
                onValueChange={(value) => {
                  setBackorders(value);
                  row.original.backorders = value;
                }}
                className="flex flex-col gap-2 text-sm font-medium"
              >
                <CustomRadio value="no">{__("Do not allow", "whizmanage")}</CustomRadio>
                <CustomRadio value="notify">
                  {__("Allow, but notify customer", "whizmanage")}
                </CustomRadio>
                <CustomRadio value="yes">{__("Allow", "whizmanage")}</CustomRadio>
              </RadioGroup>
            </DropdownMenuLabel>
          </>
        ) : (
          // מצב מלאי רגיל
          (<DropdownMenuGroup>
            <DropdownMenuItem
              onSelect={() => {
                setStatus("instock");
                row.original.stock_status = "instock";
              }}
              className="text-green-600"
            >
              {__("In stock", "whizmanage")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                setStatus("outofstock");
                row.original.stock_status = "outofstock";
              }}
              className="text-pink-500 hover:!text-pink-600"
            >
              {__("Out of stock", "whizmanage")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                setStatus("onbackorder");
                row.original.stock_status = "onbackorder";
              }}
              className="text-yellow-500 hover:!text-yellow-600"
            >
              {__("On backorder", "whizmanage")}
            </DropdownMenuItem>
          </DropdownMenuGroup>)
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default InventoryEdit;
