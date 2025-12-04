import {
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import Loader from "@components/Loader";
import Button from "@components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
} from "@components/ui/command";
import { Input } from "@components/ui/input";
import { Plus, Undo2 } from "lucide-react";
import { useEffect, useState } from "react";
import SelectAttributeItem from "./SelectAttributeItem";
import { getApi, postApi } from "/src/services/services";
import { __ } from '@wordpress/i18n';

const decodeUrlString = (encodedString) => {
  try {
    return decodeURIComponent(encodedString);
  } catch (e) {
    console.error("Error decoding URL component:", e);
    return encodedString;
  }
};

const SelectGlobalAttribute = ({
  selectedAttributes,
  setSelectedAttributes,
  setDropdownOpen,
  variationMood,
}) => {
  const [ItemsExist, setItemsExist] = useState([]);
  const [addItem, setAddItem] = useState(false);
  const [open, setOpen] = useState(false);
  const [newItem, setNewItem] = useState("");
);
   

  useEffect(() => {
    setIsLoading(true);
  const [isLoading, setIsLoading] = useState(true); // הוספה של מצב טעינה
   

  useEffect(() => {
    setIsLoading(true); // התחלת טעינה
    getApi(`${window.siteUrl}/wp-json/wc/v3/products/attributes?per_page=100`)
      .then((res) => {
        setItemsExist(res?.data || []);
      })
      .catch((error) => {
        console.log(error);
        setItemsExist([]);
      })
      .finally(() => {
        setIsLoading(false);
      })
     
  }, []);

  const addNewItem = async () => {
    const itemData = {
      name: decodeUrlString(newItem),
      slug: `pa_${decodeUrlString(newItem)}`,
      type: "select",
      order_by: "menu_order",
      has_archives: true,
    };

    await postApi(
      `${window.siteUrl}/wp-json/wc/v3/products/attributes`,
      itemData
    )
      .then((res) => {
        setItemsExist([res?.data, ...ItemsExist]);
        setNewItem(""); // נקה את השדה אחרי הוספה
      })
      .catch((error) =>
        console.log(
          error?.response?.data?.message || error || "Unknown error occurred"
        )
      );
  };

  return (
    <DropdownMenuSub open={open} onOpenChange={setOpen}>
      <DropdownMenuSubTrigger>{t("Global Attribute")}</DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <Command className="dark:bg-slate-800">
          {addItem ? (
            <div className="h-12 px-1 gap-1 flex items-center justify-center">
              <div className="relative h-10 border rounded-lg flex gap-1 items-center px-1 dark:bg-slate-700">
                <Input
                  type="text"
                  id="tagName"
                  value={newItem}
                  placeholder={t(`new attribute`)}
                  className="!border-none dark:!text-slate-300 !ring-0 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0"
                  onChange={(e) => setNewItem(e.target.value)}
                />
              </div>
<<<<<<<< HEAD:src/pages/products/_components/table/edit/attributes/SelectGlobalAttribute.jsx
              {newItem.trim().length > 0 ? (
========
             {newItem.trim().length > 0 ? (
>>>>>>>> main-pro:src/pages/products/_components/header/add/variation/SelectGlobalAttribute.jsx
                <Button
                  variant="outline"
                  className="h-10 border-b rounded-lg"
                  onClick={() => {
                    addNewItem();
                    setAddItem(false);
                  }}
                >
                  {t("Add")}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="h-10 rounded-lg"
                  onClick={() => setAddItem(false)}
                >
                  <Undo2 />
                </Button>
              )}
            </div>
          ) : (
            <div className="flex">
              <CommandInput
                placeholder={t(`Find attribute`)}
                className="!border-none !ring-0"
              />
              <div className="h-12 w-12 border-b dark:border-slate-700 flex justify-center items-center">
                <Button
                  variant="ghost"
                  className="dark:hover:bg-slate-700 px-2 rounded-xl"
                  onClick={() => setAddItem(true)}
                >
                  <Plus className="w-5 h-5 dark:text-slate-400" />
                </Button>
              </div>
            </div>
          )}
          <CommandList>
            {/* CommandEmpty רק כשיש תכונות קיימות ומחפשים */}
            {!isLoading && ItemsExist.length > 0 && (
<<<<<<<< HEAD:src/pages/products/_components/table/edit/attributes/SelectGlobalAttribute.jsx
              <CommandEmpty>{t("No results found.")}</CommandEmpty>
========
              <CommandEmpty>{t("No attributes found.")}</CommandEmpty>
>>>>>>>> main-pro:src/pages/products/_components/header/add/variation/SelectGlobalAttribute.jsx
            )}

            <CommandGroup
              heading={ItemsExist.length > 0 ? t(`Existing attributes`) : ""}
            >
              {isLoading ? (
                <div className="flex justify-center py-6">
                  <Loader />
                </div>
              ) : ItemsExist.length > 0 ? (
                ItemsExist.map((item, index) => (
                  <SelectAttributeItem
                    key={item.id || index}
<<<<<<<< HEAD:src/pages/products/_components/table/edit/attributes/SelectGlobalAttribute.jsx
========
                    variationMood={variationMood}
>>>>>>>> main-pro:src/pages/products/_components/header/add/variation/SelectGlobalAttribute.jsx
                    item={item}
                    ItemsExist={ItemsExist}
                    setItemsExist={setItemsExist}
                    selectedAttributes={selectedAttributes}
                    setSelectedAttributes={setSelectedAttributes}
                    setOpen={setOpen}
                    setDropdownOpen={setDropdownOpen}
                  />
                ))
              ) : (
<<<<<<<< HEAD:src/pages/products/_components/table/edit/attributes/SelectGlobalAttribute.jsx
                <div className="flex flex-col items-center justify-center pt-2">
========
                <div className="flex flex-col items-center justify-center space-y-2">
>>>>>>>> main-pro:src/pages/products/_components/header/add/variation/SelectGlobalAttribute.jsx
                  <div className="text-center">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-slate-200 mb-1">
                      {t("No attributes yet")}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
                      {t("Create your first global attribute to get started")}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full max-w-xs"
                    onClick={() => setAddItem(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t("Create Attribute")}
                  </Button>
                </div>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
};

export default SelectGlobalAttribute;