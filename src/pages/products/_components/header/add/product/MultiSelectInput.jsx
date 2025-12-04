import Loader from "@components/Loader";
import { Button } from "@components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
} from "@components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu";
import { Input } from "@components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/ui/popover";
import { Chip } from "@heroui/react";
import {
  ChevronRight,
  ChevronsUpDown,
  Loader2,
  Plus,
  Undo2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { __ } from '@wordpress/i18n';
import MultiSelectEditItem from "../../../table/edit/MultiSelectEditItem";
import { getApi, postApi } from "/src/services/services";

const MultiSelectInput = ({ columnName, updateValue, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [itemsExist, setItemsExist] = useState([]);
  const [itemsProduct, setItemsProduct] = useState([]);
  const [addItem, setAddItem] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [addSubcategory, setAddSubcategory] = useState(null);
  const [newSubcategoryName, setNewSubcategoryName] = useState("");

  const columnLabel =
    columnName == "categories" || columnName == "tags" ? columnName : label;
   

  useEffect(() => {
    updateValue(columnName, itemsProduct);
  }, [itemsProduct]);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      const urlTerms = columnName == "categories" ? "product_cat" : columnName;
      let url;
      if (columnName === "tags") {
        url = `${window.siteUrl}/wp-json/wc/v3/products/${columnName}?per_page=100`;
      } else {
        url = `${window.siteUrl}/wp-json/whizmanage/v1/taxonomy/${urlTerms}/terms`;
      }
      getApi(url)
        .then((res) => {
          const data = res?.data || [];
          const sortedItems =
            columnName !== "tags" ? sortCategoriesWithDepth(data) : data;
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
  }, [isOpen]);

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

  const cleanColumnName = (name) => {
    return name
      .replace(/_pa_/g, "")
      .replace(/pa_/g, "")
      .replace(/pa/g, "")
      .replace(/_/g, " ");
  };

  const addNewItem = async (item, parentId = 0) => {
    setIsAdding(true);
    const itemData = {
      name: item,
      parent: parentId,
    };

    let url;
    if (columnName === "categories" || columnName === "tags") {
      url = `${window.siteUrl}/wp-json/wc/v3/products/${columnName}`;
    } else {
      url = `${window.siteUrl}/wp-json/whizmanage/v1/taxonomy/${columnName}/term`;
    }
     if( columnName === "tags"){
        delete itemData.parent
     }
    try {
      const res = await postApi(url, itemData);

      // הוספת הפריט החדש במקום הנכון בהיררכיה
      const newItem = res?.data;
      if (parentId === 0) {
        // אם זה קטגוריה ראשית, הוסף בהתחלה
        setItemsExist([newItem, ...itemsExist]);
      } else {
        // אם זה תת-קטגוריה, הוסף אחרי הקטגוריה האב ותת-הקטגוריות שלה
        const updatedItems = [...itemsExist];
        const parentIndex = updatedItems.findIndex(cat => cat.id === parentId);

        if (parentIndex !== -1) {
          // מצא את המקום הנכון להוסיף את התת-קטגוריה
          let insertIndex = parentIndex + 1;

          // דלג על כל התת-קטגוריות הקיימות של הקטגוריה האב
          while (insertIndex < updatedItems.length &&
            updatedItems[insertIndex].parent === parentId) {
            insertIndex++;
          }

          // הוסף את התת-קטגוריה החדשה
          newItem.depth = (updatedItems[parentIndex].depth || 0) + 1;
          updatedItems.splice(insertIndex, 0, newItem);
          setItemsExist(updatedItems);
        } else {
          setItemsExist([...itemsExist, newItem]);
        }
      }
    } catch (error) {
      console.error("Error adding new item:", error);
    } finally {
      setIsAdding(false);
      setAddItem(false);
      setAddSubcategory(null);
      setNewItem("");
      setNewSubcategoryName("");
    }
  };

  // קימפוננטה לפריט קטגוריה עם אפשרות הוספת תת-קטגוריה
  const CategoryItemWithSubcategory = ({ item }) => {

  const [isHovered, setIsHovered] = useState(false);
    return (
      <div

        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <MultiSelectEditItem
          item={item}
          itemsExist={itemsExist}
          setItemsExist={setItemsExist}
          itemsProduct={itemsProduct}
          setItemsProduct={setItemsProduct}
          columnName={columnName}
          addNewItem={addNewItem}
          addSubcategory={addSubcategory}
          setAddSubcategory={setAddSubcategory}
          isHovered={isHovered}
          newSubcategoryName={newSubcategoryName}
          setNewSubcategoryName={setNewSubcategoryName}
          isAdding={isAdding}
        />

   
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2 relative min-h-10 items-center dark:bg-slate-700 rounded-lg">
        {itemsProduct.length > 0 ? (
          itemsProduct.map((item, index) => (
            <Chip
              key={index}
              onClose={() =>
                setItemsProduct(itemsProduct.filter((p) => p.id !== item.id))
              }
              variant="flat"
              classNames={{
                base: "bg-gradient-to-br from-fuchsia-50 dark:from-slate-700 to-fuchsia-200 dark:to-slate-600 opacity-100",
                content: "text-fuchsia-600 dark:text-slate-300",
                closeButton: "text-fuchsia-600 dark:text-slate-300",
              }}
            >
              {item.name}
            </Chip>
          ))
        ) : (
          <div className="font-extralight text-base text-muted-foreground px-4">
            No {cleanColumnName(columnName)}
          </div>
        )}
      </div>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="flex justify-between h-10 dark:bg-slate-700 dark:hover:!bg-slate-800"
          >
            {columnName == "tags" || columnName == "categories"
              ? __(`Select ${columnName}`, "whizmanage")
              : __(`Select ${cleanColumnName(columnName)}`, "whizmanage")}

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
                    id={columnName}
                    value={newItem}
                    placeholder={__(`new ${columnName}`, "whizmanage")}
                    className="!border-none dark:!text-slate-300 !ring-0 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0"
                    onChange={(e) => setNewItem(e.target.value)}
                  />
                </div>
                {newItem.length > 0 ? (
                  <Button
                    variant="outline"
                    className="h-10 border-b rounded-lg"
                    onClick={(e) => {
                      addNewItem(newItem);
                     e.preventDefault();
                    }}
                  >
                    {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : __("Add", "whizmanage")}
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
                  placeholder={__(`Find ${cleanColumnName(columnName)}`, "whizmanage")}
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
              {!isLoading && itemsExist.length > 0 && (
                <CommandEmpty>{__("No results found.", "whizmanage")}</CommandEmpty>
              )}

              <CommandGroup
                heading={
                  itemsExist.length > 0
                    ? __(`${cleanColumnName(columnName)} exist`, "whizmanage")
                    : ""
                }
              >
                {isLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader />
                  </div>
                ) : itemsExist.length > 0 ? (
                  itemsExist.map((item) => (
                    <div key={item.id} className="relative">
                      <CategoryItemWithSubcategory item={item} />
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="text-center">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-slate-200 mb-1">
                        {__(`No ${cleanColumnName(columnName)} yet`, "whizmanage")}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
                        {__(
                          `Create your first ${cleanColumnName(columnName)} to get started`,
                          "whizmanage"
                        )}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full max-w-xs"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setAddItem(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {__(`Create ${cleanColumnName(columnName)}`, "whizmanage")}
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