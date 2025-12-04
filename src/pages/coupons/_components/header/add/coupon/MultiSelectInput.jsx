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
import { Chip, cn } from "@heroui/react";
import { ChevronsUpDown, Plus, Undo2 } from "lucide-react";
import { useEffect, useState } from "react";
import { __ } from '@wordpress/i18n';
import MultiSelectEditItem from "../../../table/edit/MultiSelectEditItem";
import { getApi, postApi } from "/src/services/services";

const MultiSelectInput = ({
  columnName,
  updateValue,
  row = null,
  disabledIds = [],
  excluded = null,
  initialValue = [], // ✅ ערך התחלתי אם row לא קיים
}) => {
  const foundCategories = window.listTaxonomies.find(
    (taxonomy) => taxonomy.name === "_product_cat"
  );

  const [itemsExist, setItemsExist] = useState([]);
  const [itemsProduct, setItemsProduct] = useState(() => {
    const selectedIds = row
      ? row.original?.[columnName] || []
      : initialValue || [];

    return selectedIds.map((id) => {
      const foundItem = foundCategories?.terms.find((obj) => obj.id === id);
      return { id, name: foundItem ? foundItem.name : "Unknown" };
    });
  });

  const [isOpen, setIsOpen] = useState(false);
  const [addItem, setAddItem] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [isLoading, setIsLoading] = useState(false);
   

  const objects =
    ["categories", "tags"].find((item) => columnName.includes(item)) || "";
  const singularObjects = {
    categories: "category",
    tags: "tag",
  };
  const objectSingular = singularObjects[objects] || "";

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      const url = `${window.siteUrl}/wp-json/whizmanage/v1/taxonomy/product_cat/terms`;
      getApi(url)
        .then((res) => {
          const data = res?.data || [];
          const sortedItems =
            objects === "categories" ? sortCategoriesWithDepth(data) : data;

          const updatedItems = sortedItems.map((item) => ({
            ...item,
            selected: itemsProduct.some(
              (selectedItem) => selectedItem.id === item.id
            ),
          }));

          setItemsExist(updatedItems);
        })
        .catch((error) => {
          console.log(error);
          setItemsExist([]);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen]);

  useEffect(() => {
    const selectedIds = itemsProduct.map((item) => item.id);

    if (typeof updateValue === "function") {
      updateValue(columnName, selectedIds);
    }

    if (row) {
      row.original[columnName] = selectedIds;
    }
  }, [itemsProduct]);

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

  const addNewItem = async (item) => {
    const itemData = { name: item };
    await postApi(
      `${window.siteUrl}/wp-json/wc/v3/products/${objects}`,
      itemData
    )
      .then((res) => {
        setItemsExist([res?.data, ...itemsExist]);
        setItemsProduct([...itemsProduct, res?.data]);
        setNewItem("");
      })
      .catch((error) => console.log(error));
  };

  const selectedItems = itemsProduct.map((item) => item.name).join(", ");

  return (
    <div className="flex flex-col gap-2">
      {!row && (
        <div className="flex flex-wrap gap-2 relative min-h-10 items-center dark:bg-slate-700 rounded-lg">
          {itemsProduct.length > 0 ? (
            itemsProduct.map((item, index) => (
              <Chip
                key={index}
                onClose={() => {
                  setItemsProduct(itemsProduct.filter((p) => p.id !== item.id));
                }}
                variant="flat"
                classNames={{
                  base: excluded
                    ? "bg-gradient-to-br from-red-50 dark:from-red-900/20 to-red-200 dark:to-red-800/20 opacity-100"
                    : "bg-gradient-to-br from-fuchsia-50 dark:from-slate-700 to-fuchsia-200 dark:to-slate-600 opacity-100",
                  content: excluded
                    ? "text-red-600 dark:text-red-400"
                    : "text-fuchsia-600 dark:text-slate-300",
                  closeButton: excluded
                    ? "text-red-600 dark:text-red-400"
                    : "text-fuchsia-600 dark:text-slate-300",
                }}
              >
                {item.name}
              </Chip>
            ))
          ) : (
            <div className="font-extralight text-base text-muted-foreground px-4">
              {excluded ? __("No excluded categories", "whizmanage") : __("No categories", "whizmanage")}
            </div>
          )}
        </div>
      )}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              row != null && "!h-8",
              "flex justify-between h-10 dark:bg-slate-700 dark:hover:!bg-slate-800"
            )}
          >
            {row && itemsProduct.length > 0
              ? selectedItems
              : excluded
                ? __(`Select excluded categories`, "whizmanage")
                : __(`Select categories`, "whizmanage")}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
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
                    placeholder={excluded ? __(`new excluded categories`, "whizmanage") : __(`new categories`, "whizmanage")}
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
                  placeholder={excluded ? __(`Find excluded categories`, "whizmanage") : __(`Find categories`, "whizmanage")}
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
              {/* CommandEmpty רק כשיש קטגוריות קיימות ומחפשים */}
              {!isLoading && itemsExist.length > 0 && (
                <CommandEmpty>{__("No results found.", "whizmanage")}</CommandEmpty>
              )}

              <CommandGroup
                heading={itemsExist.length > 0 ? (excluded ? __(`excluded categories exist`, "whizmanage") : __(`categories exist`, "whizmanage")) : ""}
              >
                {isLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader />
                  </div>
                ) : itemsExist.length > 0 ? (
                  itemsExist.map((item) => (
                    <MultiSelectEditItem
                      key={item.id}
                      item={item}
                      itemsExist={itemsExist}
                      setItemsExist={setItemsExist}
                      itemsProduct={itemsProduct}
                      setItemsProduct={setItemsProduct}
                      columnName={columnName}
                      objects={objects}
                      objectSingular={objectSingular}
                      row={row}
                      disabled={disabledIds && disabledIds.includes(item.id)}
                    />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="text-center">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-slate-200 mb-1">
                        {__("No categories yet", "whizmanage")}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
                        {__("Create your first category to get started", "whizmanage")}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full max-w-xs"
                      onClick={() => setAddItem(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {__("Create Category", "whizmanage")}
                    </Button>
                  </div>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default MultiSelectInput;