import Button from "@components/ui/button";
import { CommandItem } from "@components/ui/command";
import { Input } from "@components/ui/input";
import { cn } from "@heroui/react";
import { Check, CheckCircle, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { deleteApi, putApi } from "/src/services/services";
import { __ } from '@wordpress/i18n';
import { confirm } from "@components/CustomConfirm";

const MultiSelectEditItem = ({
  item,
  itemsExist,
  setItemsExist,
  itemsProduct,
  setItemsProduct,
  columnName,
  objects,
  objectSingular,
  row,
  combinedIdEndName,
  setCombinedIdEndName,
  disabled,
}) => {
  const [isEditItem, setIsEditItem] = useState(false);
  const [newName, setNewName] = useState("");
   
  const editItem = async () => {
    const url = `${window.siteUrl}/wp-json/wc/v3/products/${objects}/${item.id}`;
    const itemData = {
      name: newName,
    };
    try {
      const response = await putApi(url, itemData);
      const updatedItem = response.data;
      setItemsExist(
        itemsExist.map((i) => (i.id === item.id ? updatedItem : i))
      );
      setItemsProduct(
        itemsProduct.map((i) => (i === item.id ? updatedItem : i))
      );
      setCombinedIdEndName(
        combinedIdEndName.map((i) => (i.id === item.id ? updatedItem : i))
      );
      toast(
        <div className="p-4 w-full h-full !border-l-4 !border-l-fuchsia-600 dark:bg-slate-800 dark:text-slate-300 rounded-md flex gap-4 items-center justify-start">
          <CheckCircle className="w-5 h-5 text-fuchsia-600" />
          {__(`The ${objectSingular} has been successfully updated to `, "whizmanage")}
          {updatedItem.name}
        </div>,
        { duration: 5000 }
      );
      setIsEditItem(false);
      setNewName("");
    } catch (error) {
      console.log("Error editing item", error);
    }
  };

  const deleteItem = async () => {
    const isConfirmed = await confirm({
      title: __("Delete Item", "whizmanage"),
      message: `${__("Are you sure you want to permanently delete this", "whizmanage")} "${item.name}"?`,
      confirmText: __("Delete", "whizmanage"),
      cancelText: __("Cancel", "whizmanage"),
    });

    if (isConfirmed) {
      try {
        const url = `${window.siteUrl}/wp-json/wc/v3/products/${objects}/${item.id}`;
        await deleteApi(url);

        toast(
          <div className="p-4 w-full h-full !border-l-4 !border-l-fuchsia-600 dark:bg-slate-800 dark:text-slate-300 rounded-md flex gap-4 items-center justify-start">
            <CheckCircle className="w-5 h-5 text-fuchsia-600" />
            {__("The", "whizmanage")} {item.name} {__("has been permanently deleted", "whizmanage")}.
          </div>,
          { duration: 5000 }
        );

        setItemsExist(
          itemsExist.filter((existItem) => existItem.id !== item.id)
        );
        setItemsProduct(
          itemsProduct.filter((productItem) => productItem.id !== item.id)
        );
      } catch (error) {
        console.log("Error deleting item", error);
      }
    }
  };

  const getPaddingClass = (depth) => {
    switch (depth) {
      case 0:
        return "pl-0 ";
      case 1:
        return "pl-4 rtl:pr-4";
      case 2:
        return "pl-8 rtl:pr-8";
      case 3:
        return "pl-12 rtl:pr-12";
      case 4:
        return "pl-16 rtl:pr-16";
      case 5:
        return "pl-20 rtl:pr-20";
      default:
        return "pl-0 ";
    }
  };

  return (
    <CommandItem
      className="cursor-pointer h-8 dark:hover:bg-slate-700 group/item flex justify-between"
      key={item.name}
      onSelect={(value) => {
        console.log("🟢 Item clicked:", item);
        setItemsProduct((prevItemsProduct) => {
          const isAlreadySelected = prevItemsProduct?.some(
            (existingItem) => existingItem.id === item.id
          );
          let newItemsProduct;
          if (isAlreadySelected) {
            newItemsProduct = prevItemsProduct.filter(
              (existingItem) => existingItem.id !== item.id
            );
          } else {
            newItemsProduct = [...prevItemsProduct, item];
          }
          if (row) {
            const ids = newItemsProduct.map((i) => i.id);
            row.original[columnName] = ids;
          }

          return newItemsProduct;
        });
      }}
      disabled={disabled}
    >
      {isEditItem ? (
        <div className="flex gap-2">
          <Input
            onChange={(e) => {
              e.stopPropagation();
              setNewName(e.target.value);
            }}
            defaultValue={item.name}
            className="h-8 w-full"
            onFocus={(event) => event.target.select()}
          />
          <Button
            variant="outline"
            className="h-8"
            onClick={(e) => {
              e.stopPropagation();
              editItem();
              setIsEditItem(false);
            }}
          >
            {__("Save", "whizmanage")}
          </Button>
        </div>
      ) : (
        <div className="flex !justify-between w-full items-center">
          <div className="flex gap-2 items-center">
            <Check
              className={cn(
                "h-4 w-4",
                itemsProduct.some(
                  (productElement) => productElement.id === item.id
                )
                  ? "opacity-100"
                  : "opacity-0"
              )}
            />

            <span className={cn("flex-1", getPaddingClass(item.depth))}>
              {item.name.replace(/\\/g, "").replace(/"/g, "''")}
            </span>
          </div>
          <div className="hidden group-hover/item:flex gap-1 !max-w-fit">
            <Button
              size="icon"
              variant="outline"
              className="w-6 h-6"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditItem(true);
              }}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="w-6 h-6"
              onClick={(e) => {
                e.stopPropagation();
                deleteItem();
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </CommandItem>
  );
};

export default MultiSelectEditItem;
