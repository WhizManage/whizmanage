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
import { Chip } from "@heroui/react";
import { Plus, PlusIcon, Undo2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { __ } from '@wordpress/i18n';
import MultiSelectEditItem from "../../edit/MultiSelectEditItem";
import { getApi, postApi } from "@/services/services";

const OBJECT_CONFIG = {
  categories: {
    objects: "categories",
    objectSingular: "category",
  },
  products: {
    objects: "products",
    objectSingular: "product",
  },
};

const AddLabelsItem = ({ columnName, index, handleRowChange }) => {
  const [open, setOpen] = useState(false);
    const [dataProduct, setDataProduct] = React.useState([]);
  const [itemsProduct, setItemsProduct] = useState([]);
  const [addItem, setAddItem] = useState(false);
  const [newItem, setNewItem] = useState("");
  const popupRef = useRef(null);
   


  const isCategoryList = columnName.includes("categories");
  const foundCategories = window.listTaxonomies.find((taxonomy) => taxonomy.name === "_product_cat");
  const [existingItems, setExistingItems] = useState([]);
useEffect(() => {
  // לא יודע למה אבל עוזר לי לטעון את המוצרים
    const fetchDataProducts = async () => {
      const url = `${window.siteUrl}/wp-json/whizmanage/v1/get_product/`;
      const perPage = 1; // מספר המוצרים לטעינה בכל בקשה
      let allProducts = [];
      let currentPage = 1;

      try {
          const resProduct =  getApi(`${url}?page=${currentPage}&perPage=${perPage}`);
          setDataProduct(["1"])  
      } catch (error) {
        console.error("Failed to fetch products:", error);
      }
    };

    // קריאה לפונקציה
    fetchDataProducts();
;

  }, []);


  useEffect(() => {
    if (isCategoryList) {
      setExistingItems(foundCategories.terms || []);
    } else if (window.listProducts.length > 0) { // מחכה שהנתונים יגיעו
      setExistingItems(window.listProducts);
    }
  }, [window.listProducts]); // יופעל שוב כש`dataProducts` יתעדכן
  
  const { objects, objectSingular } = isCategoryList
    ? OBJECT_CONFIG.categories
    : OBJECT_CONFIG.products;

  useEffect(() => {
    const selectedIds = itemsProduct.map((item) => item.id);
    handleRowChange(index, "value", selectedIds);
  }, [itemsProduct]);

const handleClose = (itemToRemove) => {
  setItemsProduct(prevItems => {
    const newItemsProduct = prevItems.filter(item => item.id !== itemToRemove.id);
    const selectedIds = newItemsProduct.map(item => item.id);
    handleRowChange(index, "value", selectedIds);
    return newItemsProduct;
  });
};

  const addNewItem = async (item) => {
    const itemData = {
      name: item,
    };
    await postApi(
      `${window.siteUrl}/wp-json/wc/v3/products/${objects}`,
      itemData
    )
      .then((res) => {
        setExistingItems([res?.data, ...existingItems]);
        setItemsProduct([...itemsProduct, res?.data]);
      })
      .catch((error) => console.log(error));
  };

  const handleClickOutside = (event) => {
    if (popupRef.current && !popupRef.current.contains(event.target)) {
      setOpen(false);
    }
  };

  useEffect(() => {
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div ref={popupRef} className="flex gap-2 h-full items-center">
      <Popover open={open}>
        <PopoverTrigger asChild>
          <Button onClick={() => setOpen(!open)} variant="ghost" size="icon">
            <PlusIcon className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 dark:bg-slate-800" align="start">
          <Command className="dark:bg-slate-800">
            {addItem && isCategoryList ? (
              <div className="h-12 px-1 gap-1 flex items-center justify-center">
                <div className="relative h-10 border rounded-lg flex gap-1 items-center px-1 dark:bg-slate-700">
                  <Input
                    type="text"
                    id="tagName"
                    placeholder={__(`new ${objectSingular}`, "whizmanage")}
                    className="!border-none dark:!text-slate-300 !ring-0 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0"
                    onChange={(e) => setNewItem(e.target.value)}
                  />
                </div>
                {newItem.length > 0 ? (
                  <Button
                    variant="outline"
                    className="h-10 border-b rounded-lg"
                    onClick={() => {
                      isCategoryList && addNewItem(newItem);
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
                  placeholder={__(`Find ${objectSingular}`, "whizmanage")}
                  className="!border-none !ring-0"
                />
                {isCategoryList && (
                  <div className="h-12 w-12 border-b dark:border-slate-700 flex justify-center items-center">
                    <Button
                      variant="ghost"
                      className="dark:hover:bg-slate-700 px-2 rounded-xl"
                      onClick={() => setAddItem(true)}
                    >
                      <Plus className="w-5 h-5 dark:text-slate-400" />
                    </Button>
                  </div>
                )}
              </div>
            )}
            <CommandList>
              <CommandEmpty>{__("No results found.", "whizmanage")}</CommandEmpty>
              <CommandGroup heading={__(`${objects} exist`, "whizmanage")}>
                {existingItems.map((item) => (
                  <MultiSelectEditItem
                    key={item.id}
                    item={item}
                    itemsExist={existingItems}
                    setItemsExist={setExistingItems}
                    itemsProduct={itemsProduct}
                    setItemsProduct={setItemsProduct}
                    objects={objects}
                    objectSingular={objectSingular}
                  />
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <div className="flex flex-wrap gap-2 relative min-h-10 items-center">
        {itemsProduct.map((item, index) => (
          <Chip
            key={index}
            onClose={() => handleClose(item)}
            variant="flat"
            classNames={{
              base: "bg-gradient-to-br from-fuchsia-50 dark:from-slate-700 to-fuchsia-200 dark:to-slate-600 opacity-100",
              content: "text-fuchsia-600 dark:text-slate-300",
              closeButton: "text-fuchsia-600 dark:text-slate-300",
            }}
          >
            {item.name}
          </Chip>
        ))}
      </div>
    </div>
  );
};

export default AddLabelsItem;
