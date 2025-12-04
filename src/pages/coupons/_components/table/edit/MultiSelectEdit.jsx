import Loader from "@components/Loader";
import { Button } from "@components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
} from "@components/ui/command";
import { Input } from "@components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/ui/popover";
import { ChevronsUpDown, Plus, Undo2 } from "lucide-react";
import { useEffect, useState } from "react";
import MultiSelectEditItem from "./MultiSelectEditItem";
import { getApi, postApi } from "/src/services/services";
import { __ } from '@wordpress/i18n';

const MultiSelectEdit = ({ row, columnName }) => {
  const [ItemsExist, setItemsExist] = useState([]);
  const [addItem, setAddItem] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
   
  const [itemsProduct, setItemsProduct] = useState([
    ...row.original[columnName],
  ]);

  const sortCategoriesWithDepth = (categories) => {
    const categoryMap = new Map();

    categories.forEach((category) => {
      categoryMap.set(category.id, { ...category, depth: 0 });
    });

    const sortedCategories = [];

    function addCategoryWithChildren(category, depth) {
      category.depth = depth;
      sortedCategories.push(category);
      categories
        .filter((cat) => cat.parent === category.id)
        .sort((a, b) => a.menu_order - b.menu_order)
        .forEach((childCategory) =>
          addCategoryWithChildren(categoryMap.get(childCategory.id), depth + 1)
        );
    }

    categories
      .filter((category) => category.parent === 0)
      .sort((a, b) => a.menu_order - b.menu_order)
      .forEach((category) =>
        addCategoryWithChildren(categoryMap.get(category.id), 0)
      );

    return sortedCategories;
  };

  const sortTagsBySelected = (tags) => {
    return tags.sort((a, b) => {
      const aIsSelected = itemsProduct.some((item) => item.name === a.name);
      const bIsSelected = itemsProduct.some((item) => item.name === b.name);
      return bIsSelected - aIsSelected;
    });
  };

  const fetchCategoryAndTags = () => {
    if (isOpen) {
      setIsLoading(true);
      getApi(
        `${window.siteUrl}/wp-json/wc/v3/products/${columnName}?per_page=100`
      )
        .then((res) => {
          const data = res?.data || [];
          const sortedItems =
            columnName == "categories"
              ? sortCategoriesWithDepth(data)
              : sortTagsBySelected(data);
          setItemsExist(sortedItems);
        })
        .catch((error) => {
          console.log(error);
          setItemsExist([]);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  };

  useEffect(() => {
    fetchCategoryAndTags();
  }, [isOpen]);

  const addNewItem = async (item) => {
    const itemData = {
      name: item,
    };
    await postApi(
      `${window.siteUrl}/wp-json/wc/v3/products/${columnName}`,
      itemData
    )
      .then((res) => {
        setItemsExist([res?.data, ...ItemsExist]);
        setItemsProduct([...itemsProduct, res?.data]);
        setNewItem(""); // נקה את השדה אחרי הוספה
      })
      .catch((error) => console.log(error));
  };

  const selectedItems = itemsProduct.map((item) => item.name).join(", ");

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="flex gap-2 h-8">
          <span className="capitalize truncate w-36">
            {itemsProduct.length > 0 ? selectedItems : __(`Select ${columnName}`, "whizmanage")}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 dark:bg-slate-800" align="start">
        <Command className="dark:bg-slate-800">
          {addItem ? (
            <div className="h-12 px-1 gap-1 flex items-center justify-center">
              <div className="relative h-10 border rounded-lg flex gap-1 items-center px-1 dark:bg-slate-700">
                <Input
                  type="text"
                  id="tagName"
                  value={newItem}
                  placeholder={__(`new ${columnName}`, "whizmanage")}
                  className="!border-none dark:!text-slate-300 !ring-0 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0"
                  onChange={(e) => setNewItem(e.target.value)}
                />
              </div>
              {newItem.trim().length > 0 ? (
                <Button
                  variant="outline"
                  className="h-10 border-b rounded-lg"
                  onClick={() => {
                    addNewItem(newItem);
                    setAddItem(false);
                  }}
                >
                  {__("Add", "whizmanage")}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="h-10 rounded-lg"
                  onClick={() => {
                    setAddItem(false);
                  }}
                >
                  <Undo2 />
                </Button>
              )}
            </div>
          ) : (
            <div className="flex">
              <CommandInput
                placeholder={__(`Find ${columnName}`, "whizmanage")}
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
            {/* CommandEmpty רק כשיש פריטים קיימים ומחפשים */}
            {!isLoading && ItemsExist.length > 0 && (
              <CommandEmpty>{__("No results found.", "whizmanage")}</CommandEmpty>
            )}

            <CommandGroup
              heading={ItemsExist.length > 0 ? __(`${columnName} exist`, "whizmanage") : ""}
            >
              {isLoading ? (
                <div className="flex justify-center py-6">
                  <Loader />
                </div>
              ) : ItemsExist.length > 0 ? (
                ItemsExist.map((item) => (
                  <MultiSelectEditItem
                    key={item.id}
                    item={item}
                    ItemsExist={ItemsExist}
                    setItemsExist={setItemsExist}
                    itemsProduct={itemsProduct}
                    setItemsProduct={setItemsProduct}
                    columnName={columnName}
                    row={row}
                  />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center space-y-2 py-8">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                      <Plus className="w-6 h-6 text-gray-400 dark:text-slate-400" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-slate-200 mb-1">
                      {__(`No ${columnName} yet`, "whizmanage")}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
                      {__(`Create your first ${columnName} to get started`, "whizmanage")}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full max-w-xs"
                    onClick={() => setAddItem(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {__(`Create ${columnName}`, "whizmanage")}
                  </Button>
                </div>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default MultiSelectEdit;