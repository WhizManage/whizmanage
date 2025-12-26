// src/components/table/products/components/variation/components/VariationInventoryEdit.jsx

import {
  getInventoryBadgeClasses,
  getInventoryConfig,
} from "@/data/inventoryStyles";
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
import { CustomRadio } from "@components/ui/nextUI/Radio";
import { Switch } from "@components/ui/switch";
import { RadioGroup } from "@heroui/react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { useEffect, useState } from "react";
 import { __ } from "@wordpress/i18n";
import { useVariationsStore } from "../store/variationsStore";

const VariationInventoryEdit = ({ row }) => {
  // ✅ תיקון: 'parent' = false, אחרת = הערך המקורי
  const initialManage =
    row.original.manage_stock === "parent" ? false : row.original.manage_stock;
  const [manage, setManage] = useState(initialManage);
  const [quantity, setQuantity] = useState(row.original.stock_quantity);
  const [lowQuantity, setLowQuantity] = useState(row.original.low_stock_amount);
   
  const [status, setStatus] = useState(row.original.stock_status);
  const [backorders, setBackorders] = useState(row.original.backorders);

  // ✅ Store
  const { updateVariation, toggleUpdatedTable } = useVariationsStore();

  useEffect(() => {
    row.original.manage_stock = manage;
  }, [manage, row]);

const isRTL = window?.document?.documentElement?.dir === "rtl";


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-auto p-0 hover:bg-transparent">
          {(() => {
            const data = {
              manage_stock: manage,
              stock_quantity: quantity,
              stock_status: status,
              low_stock_amount: lowQuantity,
            };
            const classes = getInventoryBadgeClasses(data);
            const config = getInventoryConfig(data);
            return (
              <div className={classes.container}>
                <div className={classes.dot} />
                <span className={classes.text}>
                  {manage ? quantity : __(config.label, "whizmanage")}
                </span>
              </div>
            );
          })()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuContent
          className="w-56 z-[9999]"
          dir={isRTL ? "rtl" : "ltr"}
        >
          {/* ניהול מלאי */}
          <DropdownMenuLabel className="flex items-center justify-between rtl:space-x-reverse rtl:space-x-2">
            <Label htmlFor="manage-stock-variation" className="flex-1 h-full">
              {__("Manage stock", "whizmanage")}
            </Label>
            <Switch
              id="manage-stock-variation"
              checked={manage}
              onCheckedChange={() => {
                const newManage = !manage;
                setManage(newManage);
                row.original.manage_stock = newManage;

                // ✅ עדכון ב-Store - תיקון: שולח true/false, לא 'parent'
                updateVariation(row.id, {
                  manage_stock: newManage ? true : false,
                  stock_status: newManage
                    ? quantity > 0
                      ? "instock"
                      : "outofstock"
                    : status,
                });
                toggleUpdatedTable();
              }}
            />
          </DropdownMenuLabel>

          {manage ? (
            <>
              {/* כמות במלאי */}
              <DropdownMenuLabel className="flex flex-col items-start space-y-1 mt-2">
                <span className="text-sm font-medium">
                  {__("Stock quantity", "whizmanage")}
                </span>
                <Input
                  type="number"
                  min={0}
                  placeholder={__("Enter quantity", "whizmanage")}
                  onChange={(e) => {
                    const value = e.target.value || "0";
                    setQuantity(value);
                    row.original.stock_quantity = value;

                    // ✅ עדכון ב-Store
                    updateVariation(row.id, {
                      stock_quantity: parseInt(value),
                      stock: parseInt(value),
                      stock_status:
                        parseInt(value) > 0 ? "instock" : "outofstock",
                    });
                    toggleUpdatedTable();
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

                    // ✅ עדכון ב-Store
                    updateVariation(row.id, {
                      low_stock_amount: parseInt(value),
                    });
                    toggleUpdatedTable();
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

                    // ✅ עדכון ב-Store
                    updateVariation(row.id, { backorders: value });
                    toggleUpdatedTable();
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

                  // ✅ עדכון ב-Store
                  updateVariation(row.id, { stock_status: "instock" });
                  toggleUpdatedTable();
                }}
                className="text-green-600"
              >
                {__("In stock", "whizmanage")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  setStatus("outofstock");
                  row.original.stock_status = "outofstock";

                  // ✅ עדכון ב-Store
                  updateVariation(row.id, { stock_status: "outofstock" });
                  toggleUpdatedTable();
                }}
                className="text-pink-500 hover:!text-pink-600"
              >
                {__("Out of stock", "whizmanage")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  setStatus("onbackorder");
                  row.original.stock_status = "onbackorder";

                  // ✅ עדכון ב-Store
                  updateVariation(row.id, { stock_status: "onbackorder" });
                  toggleUpdatedTable();
                }}
                className="text-yellow-500 hover:!text-yellow-600"
              >
                {__("On backorder", "whizmanage")}
              </DropdownMenuItem>
            </DropdownMenuGroup>)
          )}
        </DropdownMenuContent>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenu>
  );
};

export default VariationInventoryEdit;
