// src/components/table/products/components/variation/components/SelectProductAttribute.jsx

import {
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import Button from "@components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
} from "@components/ui/command";
import Loader from "@components/ui/custom/Loader";
import { Input } from "@components/ui/input";
import CustomTooltip from "@components/ui/nextUI/Tooltip";
import { Plus, Undo2 } from "lucide-react";
import { useEffect, useState } from "react";
 import { __ } from "@wordpress/i18n";
import SelectAttributeItem from "./SelectAttributeItem";
import { putApi } from "/src/services/services";

/**
 * 🎯 SelectProductAttribute - בחירת תכונת מוצר
 *
 * שיפורים מהגירסה הישנה:
 * ✅ סינון נכון של תכונות מוצר (id === 0)
 * ✅ Empty state מעוצב
 * ✅ תמיכה ב-RTL
 * ✅ הוספה ישירה למוצר
 *
 * תיקונים:
 * ✅ variationMood עובר ל-SelectAttributeItem
 * ✅ טיפול נכון בשגיאות
 */
const SelectProductAttribute = ({
  product,
  selectedAttributes,
  setSelectedAttributes,
  setDropdownOpen,
  isSimple,
  variationMood, // ⚠️ deprecated - SelectAttributeItem יקרא mode מה-Store
}) => {
  const [addItem, setAddItem] = useState(false);
  const [open, setOpen] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [ItemsExist, setItemsExist] = useState([]);
   

const isRTL = window?.document?.documentElement?.dir === "rtl";


  /**
   * ✅ טעינת תכונות מוצר קיימות (id === 0)
   */
  useEffect(() => {
    setIsLoading(true);

    const productAttributes = Array.isArray(product?.attributes)
      ? product.attributes.filter((attr) => attr?.id === 0)
      : [];

    // סימולציה של זמן טעינה קצר (לחוויית משתמש)
    setTimeout(() => {
      setItemsExist(productAttributes);
      setIsLoading(false);
    }, 100);
  }, [product]);

  /**
   * ✅ הוספת תכונת מוצר חדשה
   */
  const addNewItem = async () => {
    const newData = {
      id: 0,
      name: newItem,
      options: [],
      variation: isSimple ? false : true, // לא לווריאציות במוצר פשוט
      visible: true,
    };

    const data = {
      attributes: [...product.attributes, newData],
    };

    try {
      const res = await putApi(
        `${window.siteUrl}/wp-json/wc/v3/products/${product.id}`,
        data
      );

      setItemsExist((prev) => [...prev, newData]);
      product.attributes = res?.data.attributes;
      setNewItem("");
    } catch (error) {
      console.error("Error adding product attribute:", error);
      alert(error?.response?.data?.message || __("Failed to add attribute", "whizmanage"));
    }
  };

  return (
    <DropdownMenuSub
      open={open}
      onOpenChange={setOpen}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <DropdownMenuSubTrigger>{__("Product Attribute", "whizmanage")}</DropdownMenuSubTrigger>
      <DropdownMenuSubContent sideOffset={2} className="!p-0">
        <Command className="dark:bg-slate-800 !p-0">
          {addItem ? (
            <div className="h-10 p-1 gap-1 flex items-center justify-between border-b dark:border-slate-700 w-full">
              <div className="relative w-full !h-8 border rounded-lg dark:bg-slate-700">
                <Input
                  type="text"
                  value={newItem}
                  placeholder={__(`new attribute`, "whizmanage")}
                  className="!border-none dark:!text-slate-300 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base h-8 p-0"
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newItem.trim().length > 0) {
                      addNewItem();
                      setAddItem(false);
                    } else if (e.key === "Escape") {
                      setAddItem(false);
                      setNewItem("");
                    }
                  }}
                />
              </div>
              {newItem.trim().length > 0 ? (
                <Button
                  variant="outline"
                  className="h-8 rounded-md"
                  onClick={() => {
                    addNewItem();
                    setAddItem(false);
                  }}
                >
                  {__("Add", "whizmanage")}
                </Button>
              ) : (
                <CustomTooltip title={__("Cancel", "whizmanage")} instantClose>
                  <Button
                    variant="outline"
                    className="h-8 rounded-md"
                    onClick={() => {
                      setAddItem(false);
                      setNewItem("");
                    }}
                  >
                    <Undo2 />
                  </Button>
                </CustomTooltip>
              )}
            </div>
          ) : (
            <div className="flex border-b dark:border-slate-700 w-full items-center justify-between h-10 p-1">
              <CommandInput
                placeholder={__(`Find attribute`, "whizmanage")}
                className="!border-none !ring-0 h-8"
              />
              <CustomTooltip title={__("Add new attribute", "whizmanage")} instantClose>
                <Button
                  variant="ghost"
                  className="dark:hover:bg-slate-700 px-2 rounded-sm !size-8"
                  onClick={() => setAddItem(true)}
                >
                  <Plus className="size-4 dark:text-slate-300" />
                </Button>
              </CustomTooltip>
            </div>
          )}

          <CommandList>
            {/* ✅ Empty state רק כשיש תוכן ומחפשים */}
            {!isLoading && ItemsExist.length > 0 && (
              <CommandEmpty>{__("No attributes found.", "whizmanage")}</CommandEmpty>
            )}

            <CommandGroup
              heading={ItemsExist.length > 0 ? __(`Existing attributes`, "whizmanage") : ""}
            >
              {/* ✅ מצב טעינה */}
              {isLoading ? (
                <div className="flex justify-center py-6">
                  <Loader />
                </div>
              ) : ItemsExist.length > 0 ? (
                // ✅ רשימת תכונות קיימות
                (ItemsExist.map((item, index) => (
                  <SelectAttributeItem
                    key={item.id || index}
                    variationMood={variationMood} // ⚠️ SelectAttributeItem יקרא mode מה-Store
                    item={item}
                    ItemsExist={ItemsExist}
                    setItemsExist={setItemsExist}
                    selectedAttributes={selectedAttributes}
                    setSelectedAttributes={setSelectedAttributes}
                    setOpen={setOpen}
                    setDropdownOpen={setDropdownOpen}
                  />
                )))
              ) : (
                // ✅ Empty state מעוצב
                (<div className="flex flex-col items-center justify-center py-6 px-2">
                  <div className="text-center">
                    <h3 className="text-sm font-medium text-slate-900 dark:text-slate-200 my-2">
                      {__("No product attributes yet", "whizmanage")}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-300 mb-4">
                      {__("Create your first product attribute to get started", "whizmanage")}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full max-w-xs gap-2"
                    onClick={() => setAddItem(true)}
                  >
                    <Plus className="size-4" />
                    {__("Create Attribute", "whizmanage")}
                  </Button>
                </div>)
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
};

export default SelectProductAttribute;
