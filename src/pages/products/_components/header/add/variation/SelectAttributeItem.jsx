import Button from "@components/ui/button";
import { CommandItem } from "@components/ui/command";
import { Input } from "@components/ui/input";
import { Check, CheckCircle, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { deleteApi, putApi } from "/src/services/services";
import { cn } from "@/lib/utils";
import { __ } from '@wordpress/i18n';
import { confirm } from "@components/CustomConfirm";
const decodeUrlString = (encodedString) => {
  try {
    return decodeURIComponent(encodedString);
  } catch (e) {
    console.error("Error decoding URL component:", e);
    return encodedString;
  }
};
const SelectAttributeItem = ({
  item,
  ItemsExist,
  setItemsExist,
  selectedAttributes,
  setSelectedAttributes,
  setOpen,
  setDropdownOpen,
  variationMood
}) => {
  const [isEditItem, setIsEditItem] = useState(false);
  const [newName, setNewName] = useState("");
   
  const editItem = async () => {
    const url = `${window.siteUrl}/wp-json/wc/v3/products/attributes/${item.id}`;
    const itemData = {
      name: decodeUrlString(newName),
    };
    try {
      const response = await putApi(url, itemData);
      const updatedItem = response.data;
      setItemsExist(
        ItemsExist.map((i) => (i.id === item.id ? updatedItem : i))
      );
      setItemsProduct(
        ItemsProduct.map((i) => (i.id === item.id ? updatedItem : i))
      );
      toast(
        <div className="p-4 w-full h-full !border-l-4 !border-l-fuchsia-600 dark:bg-slate-800 dark:text-slate-300 rounded-md flex gap-4 items-center justify-start">
          <CheckCircle className="w-5 h-5 text-fuchsia-600" />
          {`${__("The attribute has been successfully updated to", "whizmanage")} "${updatedItem.name}".`}
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
      title: __("Delete Attribute", "whizmanage"),
      message: __(
        `Are you sure you want to permanently delete this attribute?`,
        "whizmanage"
      ),
      confirmText: __("Delete", "whizmanage"),
      cancelText: __("Cancel", "whizmanage"),
    });

    if (isConfirmed) {
      const url = `${window.siteUrl}/wp-json/wc/v3/products/attributes/${item.id}`;
      try {
        await deleteApi(url);

        toast(
          <div className="p-4 w-full h-full !border-l-4 !border-l-fuchsia-600 dark:bg-slate-800 dark:text-slate-300 rounded-md flex gap-4 items-center justify-start">
            <CheckCircle className="w-5 h-5 text-fuchsia-600" />
            {__("The attribute", "whizmanage")} {item.name} {__("has been permanently deleted", "whizmanage")}
            .
          </div>,
          { duration: 5000 }
        );

        setItemsExist(
          ItemsExist.filter((existItem) => existItem.id !== item.id)
        );
        // setItemsProduct(
        //   ItemsProduct.filter((productItem) => productItem.id !== item.id)
        // );
      } catch (error) {
        console.log("Error deleting item", error);
      }
    }
  };

  return (
    <CommandItem
      className="cursor-pointer dark:hover:bg-slate-700 group/item flex justify-between min-h-9"
      key={item.name + item.id}
      onSelect={() => {
        const newItem = {
          ...item,
          variation: variationMood,
          options: [],
        };
        setOpen(false);
        setDropdownOpen(false);
        setSelectedAttributes((prev) => [...prev, newItem]);
      }}
      disabled={selectedAttributes.some((attr) =>
        item.id === 0 ? attr.name === item.name : attr.id === item.id
      )}
    >
      {isEditItem ? (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
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
        <>
          <Check
            className={cn(
              "mr-2 h-4 w-4",
              selectedAttributes.some((attr) =>
                item.id === 0 ? attr.name === item.name : attr.id === item.id
              )
                ? "opacity-100"
                : "opacity-0"
            )}
          />
          <span className="flex-1">
            {decodeUrlString(item.name.replace(/\\/g, "").replace(/"/g, "''"))}
          </span>
          <span className="sr-only">{item.id}</span>
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
        </>
      )}
    </CommandItem>
  );
};

export default SelectAttributeItem;
