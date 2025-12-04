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

const MultiSelectEdit = ({ row, columnName, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [ItemsExist, setItemsExist] = useState([]);
  const [addItem, setAddItem] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [isLoading, setIsLoading] = useState(false);
   

  const isYoastKey = ["_yoast_wpseo_primary_product_cat", "_yoast_wpseo_primary_product_brand"].includes(columnName);
  const [itemsProduct, setItemsProduct] = useState(() => {
    if (isYoastKey) {
      const item = row?.meta_data?.find(item => item.key === columnName);
      columnName = "_yoast_wpseo_primary_product_cat" ? "product_cat" : "product_brand";
      return item ? [item] : [];
    } else {
      return Array.isArray(row?.original[columnName]) ? [...row.original[columnName]] : [];
    }
  });

  const [isAdding, setIsAdding] = useState(false);
  const [addSubcategory, setAddSubcategory] = useState(null); // מזהה הקטגוריה שמוסיפים לה תת-קטגוריה
  const [newSubcategoryName, setNewSubcategoryName] = useState("");

  const columnLabel =
    columnName == "categories" || columnName == "tags" ? columnName : label;

  // פונקציה להסרת אייטמים זמניים
  const removeTempItems = () => {
    setItemsExist((prevItems) => prevItems.filter((item) => !item.temp));
  };

  const sortCategoriesWithDepth = (categories) => {
    const categoryMap = new Map();

    // יצירת מפת מזהה לקטגוריה
    categories.forEach((category) => {
      categoryMap.set(category.id, { ...category, depth: 0 });
    });

    const sortedCategories = [];

    // פונקציה רקורסיבית למילוי רשימת הקטגוריות לפי הסדר ההיררכי
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

    // הוספת הקטגוריות הראשיות לרשימה
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
      const urlTerms =
        columnName === "categories" || columnName === "_yoast_wpseo_primary_product_cat"
          ? "product_cat"
          : columnName === "_yoast_wpseo_primary_product_brand"
            ? "product_brand"
            : columnName;
      let url;
      if (columnName === 'tags') {
        url = `${window.siteUrl}/wp-json/wc/v3/products/${columnName}?per_page=100`;
      } else {
        url = `${window.siteUrl}/wp-json/whizmanage/v1/taxonomy/${urlTerms}/terms`;
      }
      getApi(url)
        .then((res) => {
          const data = res?.data || [];
          const sortedItems =
            columnName !== "tags"
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

  const addNewItem = async (item, parentId = 0) => {
    setIsAdding(true);

    // הסרת אייטמים זמניים מיד בתחילת הפונקציה
    removeTempItems();

    const itemData = {
      name: item,
      parent: parentId, // הוספת parent ID לתת-קטגוריה
    };

    let url;
    if (columnName === "categories" || columnName === "tags") {
      url = `${window.siteUrl}/wp-json/wc/v3/products/${columnName}`;
    } else {
      url = `${window.siteUrl}/wp-json/whizmanage/v1/taxonomy/${columnName}/term`;
    }
    if (columnName === "tags") {
      delete itemData.parent;
    }
    try {
      const res = await postApi(url, itemData);

      // הוספת הפריט החדש במקום הנכון בהיררכיה
      const newItem = res?.data;
      if (parentId === 0) {
        // אם זה קטגוריה ראשית, הוסף בהתחלה
        setItemsExist([newItem, ...ItemsExist]);
      } else {
        // אם זה תת-קטגוריה, הוסף אחרי הקטגוריה האב ותת-הקטגוריות שלה
        const updatedItems = [...ItemsExist];
        const parentIndex = updatedItems.findIndex(
          (cat) => cat.id === parentId
        );

        if (parentIndex !== -1) {
          // מצא את המקום הנכון להוסיף את התת-קטגוריה
          let insertIndex = parentIndex + 1;

          // דלג על כל התת-קטגוריות הקיימות של הקטגוריה האב
          while (
            insertIndex < updatedItems.length &&
            updatedItems[insertIndex].parent === parentId
          ) {
            insertIndex++;
          }

          // הוסף את התת-קטגוריה החדשה
          newItem.depth = (updatedItems[parentIndex].depth || 0) + 1;
          updatedItems.splice(insertIndex, 0, newItem);
          setItemsExist(updatedItems);
        } else {
          // אם לא מצאנו את הקטגוריה האב, הוסף בסוף
          setItemsExist([...ItemsExist, newItem]);
        }
      }
    } catch (error) {
      console.error("Error adding new item:", error);
    } finally {
      // וידוא שאין אייטמים זמניים גם בסוף
      removeTempItems();
      setIsAdding(false);
      setAddItem(false);
      setAddSubcategory(null);
      setNewItem("");
      setNewSubcategoryName("");
    }
  };

  const selectedItems = itemsProduct?.map((item) => item.name).join(", ");
  // קומפוננטה לפריט קטגוריה עם אפשרות הוספת תת-קטגוריה
  const CategoryItemWithSubcategory = ({ item, index }) => {
    const [isHovered, setIsHovered] = useState(false);
    return (
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <MultiSelectEditItem
          item={item}
          itemsExist={ItemsExist}
          setItemsExist={setItemsExist}
          itemsProduct={itemsProduct}
          setItemsProduct={setItemsProduct}
          columnName={columnName}
          row={row}
          addNewItem={addNewItem}
          addSubcategory={addSubcategory}
          setAddSubcategory={setAddSubcategory}
          newSubcategoryName={newSubcategoryName}
          setNewSubcategoryName={setNewSubcategoryName}
          isAdding={isAdding}
          isLastItem={index === ItemsExist.length - 1}
          allItems={ItemsExist}
          removeTempItems={removeTempItems}
          isYoastKey={isYoastKey}
        />
      </div>
    );
  };

  return (
    <Popover open={false} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="flex gap-2 h-8">
          <span className="capitalize truncate w-36">
            {itemsProduct?.length > 0
              ? selectedItems
              : __(`Select ${columnLabel}`, "whizmanage")}
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
                  placeholder={__(`new ${columnLabel}`, "whizmanage")}
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
                placeholder={__(`Find ${columnLabel}`, "whizmanage")}
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
              heading={ItemsExist.length > 0 ? __(`${columnLabel} exist`, "whizmanage") : ""}
            >

              {isLoading ? (
                <div className="flex justify-center py-6">
                  <Loader />
                </div>
              ) : ItemsExist.length > 0 ? (
                ItemsExist.map((item, index) => (
                  <CategoryItemWithSubcategory key={item.id} item={item} index={index} />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center pt-2">
                  <div className="text-center">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-slate-200 mb-1">
                      {__(`No ${columnLabel} yet`, "whizmanage")}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
                      {__(`Create your first ${columnLabel} to get started`, "whizmanage")}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full max-w-xs"
                    onClick={() => setAddItem(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {__(`Create ${columnLabel}`, "whizmanage")}
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
