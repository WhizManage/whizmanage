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
import { __ } from '@wordpress/i18n';
import SelectAttributeItem from "./SelectAttributeItem";
import { putApi } from "/src/services/services";

const SelectProductAttribute = ({
  product,
  selectedAttributes,
  setSelectedAttributes,
  setDropdownOpen,
  isSimple,
  variationMood,
}) => {
  const [addItem, setAddItem] = useState(false);
  const [open, setOpen] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [ItemsExist, setItemsExist] = useState([]);
  

  const isRTL = document.documentElement.dir === 'rtl';

  useEffect(() => {
    setIsLoading(true);
    // סימולציה של טעינה - במקרה הזה הנתונים זמינים מיד
    const productAttributes = Array.isArray(product?.attributes)
      ? product.attributes.filter((attr) => attr?.id === 0)
      : [];

    // סימולציה של זמן טעינה קצר
    setTimeout(() => {
      setItemsExist(productAttributes);
      setIsLoading(false);
    }, 100);
  }, [product]);

  const addNewItem = async () => {
    const newData = {
      id: 0,
      name: newItem,
      options: [],
      variation: isSimple ? false : true,
      visible: true,
    };

    const data = {
      attributes: [...product.attributes, newData],
    };

    await putApi(`${window.siteUrl}/wp-json/wc/v3/products/${product.id}`, data)
      .then((res) => {
        setItemsExist((prev) => [...prev, newData]);
        product.attributes = res?.data.attributes;
        setNewItem(""); // נקה את השדה אחרי הוספה
      })
      .catch((error) => console.log(error));
  };

  return (
    <DropdownMenuSub
      open={open}
      onOpenChange={setOpen}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <DropdownMenuSubTrigger>{__("Product Attribute", "whizmanage")}</DropdownMenuSubTrigger>
      <DropdownMenuSubContent sideOffset={2}>
        <Command className="dark:bg-slate-800">
          {addItem ? (
            <div className="h-12 px-1 gap-1 flex items-center justify-center">
              <div className="relative h-10 border rounded-lg flex gap-1 items-center px-1 dark:bg-slate-700">
                <Input
                  type="text"
                  id="tagName"
                  value={newItem}
                  placeholder={__(`new attribute`, "whizmanage")}
                  className="!border-none dark:!text-slate-300 !ring-0 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0"
                  onChange={(e) => setNewItem(e.target.value)}
                />
              </div>
              {newItem.trim().length > 0 ? (
                <Button
                  variant="outline"
                  className="h-10 border-b rounded-lg"
                  onClick={() => {
                    addNewItem();
                    setAddItem(false);
                  }}
                >
                  {__("Add", "whizmanage")}
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
                placeholder={__(`Find attribute`, "whizmanage")}
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
              <CommandEmpty>{__("No attributes found.", "whizmanage")}</CommandEmpty>
            )}

            <CommandGroup
              heading={ItemsExist.length > 0 ? __(`Existing attributes`, "whizmanage") : ""}
            >
              {isLoading ? (
                <div className="flex justify-center py-6">
                  <Loader />
                </div>
              ) : ItemsExist.length > 0 ? (
                ItemsExist.map((item, index) => (
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
                  />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <div className="text-center">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-slate-200 my-2">
                      {__("No product attributes yet", "whizmanage")}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
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
                </div>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
};

export default SelectProductAttribute;
