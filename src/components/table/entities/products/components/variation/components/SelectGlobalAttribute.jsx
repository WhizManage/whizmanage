// src/components/table/products/components/variation/components/SelectGlobalAttribute.jsx

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
import { getApi, postApi } from "/src/services/services";
import { useVariationsStore } from "../store/variationsStore";
import { toast } from "@/lib/utils";

const decodeUrlString = (encodedString) => {
  try {
    return decodeURIComponent(encodedString);
  } catch (e) {
    console.error("Error decoding URL component:", e);
    return encodedString;
  }
};

/**
 * 🎯 SelectGlobalAttribute - בחירת תכונה גלובלית
 *
 * 🔥 תיקון: העברת product ל-SelectAttributeItem
 */
const SelectGlobalAttribute = ({
  selectedAttributes,
  setSelectedAttributes,
  setDropdownOpen,
  variationMood,
  product, // 🔥 חדש: חייב להעביר ל-SelectAttributeItem
}) => {
  const [ItemsExist, setItemsExist] = useState([]);
  const [addItem, setAddItem] = useState(false);
  const [open, setOpen] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  // 🆕 Multi-select state
  const [checkedItems, setCheckedItems] = useState([]);
  const [isAddingMultiple, setIsAddingMultiple] = useState(false);
   

  const isRTL = window?.document?.documentElement?.dir === "rtl";


  /**
   * ✅ טעינת תכונות גלובליות קיימות
   */
  useEffect(() => {
    setIsLoading(true);

    try {
      // 🧠 קודם ננסה להשתמש ב־window.listTaxonomies
      if (
        Array.isArray(window.listTaxonomies) &&
        window.listTaxonomies.length
      ) {
        // לדוגמה: לקחת רק טקסונומיות של Attributes (pa_)
        const attributesFromWindow = window.listTaxonomies
          .filter(
            (tax) => tax.name.startsWith("_pa_") || tax.name.startsWith("pa_")
          )
          .map((tax, index) => {
            let label = tax.label || tax.name;

            if (typeof label === "string") {
              const parts = label.split(" ");
              // ✅ הסרת תחילית "Product" או "מוצר"
              if (parts.length > 1 && (parts[0].toLowerCase() === "product" || parts[0] === "מוצר")) {
                label = parts.slice(1).join(" ");
              }
            }

            return {
              id: tax.id ?? index + 1,
              name: label,
              slug: tax.name.startsWith("_") ? tax.name.slice(1) : tax.name,
              options: (tax.terms || []).map((term) => ({
                id: term.id,
                name: decodeUrlString(term.name),
                slug: term.slug,
              })),
            };
          });

        setItemsExist(attributesFromWindow);
        setIsLoading(false);
        return; // סיימנו, לא צריך API
      }
    } catch (e) {
      console.error("Error reading window.listTaxonomies:", e);
    }

    // 👇 אם אין window.listTaxonomies / יש בעיה – נ fallback ל־API (אם אתה רוצה)
    getApi(`${window.siteUrl}/wp-json/wc/v3/products/attributes?per_page=100`)
      .then((res) => {
        setItemsExist(res?.data || []);
      })
      .catch((error) => {
        console.error("Error loading global attributes:", error);
        setItemsExist([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  /**
   * ✅ הוספת תכונה גלובלית חדשה
   */
  const addNewItem = async () => {
    const itemData = {
      name: decodeUrlString(newItem),
      slug: `pa_${decodeUrlString(newItem)}`,
      type: "select",
      order_by: "menu_order",
      has_archives: true,
    };

    try {
      const res = await postApi(
        `${window.siteUrl}/wp-json/wc/v3/products/attributes`,
        itemData
      );

      setItemsExist([res?.data, ...ItemsExist]);
      setNewItem("");
    } catch (error) {
      console.error("Error adding attribute:", error);
      alert(error?.response?.data?.message || __("Failed to add attribute", "whizmanage"));
    }
  };

  const { mode, setAllAttributes } = useVariationsStore();

  /**
   * 🆕 הוספת מספר תכונות בו זמנית
   */
  const handleAddMultiple = async () => {
    if (checkedItems.length === 0) return;

    setIsAddingMultiple(true);
    const variationFlag = mode === "full" ? true : false;

    try {
      // בניית רשימת התכונות החדשות
      const newAttributes = checkedItems.map((item, index) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        options: [],
        position: product.attributes.length + index,
        variation: variationFlag,
        visible: true,
      }));

      // הוספה ל-Store (selectedAttributes)
      const newItems = checkedItems.map((item) => ({
        ...item,
        variation: variationFlag,
        options: [],
        visible: true,
      }));
      setSelectedAttributes((prev) => [...prev, ...newItems]);

      // הוספה ל-product.attributes ב-WooCommerce
      if (product && product.id) {
        const updatedAttributes = [...product.attributes, ...newAttributes];

        const data = {
          update: [
            {
              id: product.id,
              attributes: updatedAttributes,
            },
          ],
        };

        const updateRes = await postApi(
          `${window.siteUrl}/wp-json/wc/v3/products/batch`,
          data
        );

        // עדכון product.attributes מהשרת
        product.attributes = updateRes?.data.update[0].attributes;

        // סנכרון allAttributes (Store)
        setAllAttributes((prev) => {
          const productAttributes = product.attributes;
          const prevIds = new Set(productAttributes.map((attr) => attr.id));
          const filteredPrev = prev.filter((attr) => !prevIds.has(attr.id));
          return [...productAttributes, ...filteredPrev];
        });
      }

      toast.success(
        `${checkedItems.length} ${__("attributes added successfully", "whizmanage")}`
      );

      // ניקוי ה-state וסגירת הפופאפ
      setCheckedItems([]);
      setOpen(false);
      setDropdownOpen(false);
    } catch (error) {
      console.error("Error adding multiple attributes:", error);
      toast.error(
        error?.response?.data?.message ||
          __("Failed to add attributes", "whizmanage")
      );
      // במקרה של שגיאה, מבטלים את ההוספה ל-Store
      setSelectedAttributes((prev) =>
        prev.filter(
          (attr) => !checkedItems.some((item) => item.id === attr.id)
        )
      );
    } finally {
      setIsAddingMultiple(false);
    }
  };

  return (
    <DropdownMenuSub
      open={open}
      onOpenChange={setOpen}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <DropdownMenuSubTrigger>{__("Global Attribute", "whizmanage")}</DropdownMenuSubTrigger>
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
                    variationMood={variationMood}
                    item={item}
                    ItemsExist={ItemsExist}
                    setItemsExist={setItemsExist}
                    selectedAttributes={selectedAttributes}
                    setSelectedAttributes={setSelectedAttributes}
                    setOpen={setOpen}
                    setDropdownOpen={setDropdownOpen}
                    product={product}
                    // 🆕 Multi-select props
                    multiSelectMode={true}
                    checkedItems={checkedItems}
                    setCheckedItems={setCheckedItems}
                  />
                )))
              ) : (
                // ✅ Empty state מעוצב
                (<div className="flex flex-col items-center justify-center py-6">
                  <div className="text-center">
                    <h3 className="text-sm font-medium text-slate-900 dark:text-slate-200 my-2">
                      {__("No attributes yet", "whizmanage")}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-300 mb-4">
                      {__("Create your first global attribute to get started", "whizmanage")}
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

          {/* 🆕 כפתור הוספת תכונות מרובות - מחוץ ל-CommandList */}
          {checkedItems.length > 0 && (
            <div className="border-t dark:border-slate-700 p-2">
              <Button
                variant="default"
                size="sm"
                className="w-full gap-2"
                onClick={handleAddMultiple}
                disabled={isAddingMultiple}
              >
                {isAddingMultiple ? (
                  <Loader className="size-4" />
                ) : (
                  <Plus className="size-4" />
                )}
                {__("Add", "whizmanage")} {checkedItems.length} {__("selected", "whizmanage")}
              </Button>
            </div>
          )}
        </Command>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
};

export default SelectGlobalAttribute;
