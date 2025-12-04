import { cn } from "@/lib/utils";
import Button from "@components/ui/button";
import { CommandItem } from "@components/ui/command";
import { Input } from "@components/ui/input";
import { Check, CheckCircle, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { deleteApi, putApi } from "/src/services/services";
import { confirm } from "@components/CustomConfirm";
import { __ } from '@wordpress/i18n';

const AddFromTermsItem = ({
  item,
  terms,
  setTerms,
  values,
  setValues,
  itemsExist,
  setItemsExist,
  attribute,
  setItemFoTaxonomy,
}) => {
  const [isEditItem, setIsEditItem] = useState(false);
  const [newName, setNewName] = useState("");

  const editItem = async () => {
    const url = `${window.siteUrl}/wp-json/wc/v3/products/attributes/${attribute.id}/terms/${item.id}`;
    const itemData = {
      name: newName,
      slug: newName.replace(/\//g, "-"),
    };
    try {
      const response = await putApi(url, itemData);

      const updatedItem = response.data;
      setTerms((prev) => prev.map((i) => (i.id === item.id ? updatedItem : i)));
      toast(
        <div className="p-4 w-full h-full !border-l-4 !border-l-fuchsia-600 dark:bg-slate-800 dark:text-slate-300 rounded-md flex gap-4 items-center justify-start">
          <CheckCircle className="w-5 h-5 text-fuchsia-600" />
          {`The options has been successfully updated to "${updatedItem.name}".`}
        </div>,
        { duration: 5000 }
      );
      setIsEditItem(false);
      setNewName("");
    } catch (error) {
      console.log("Error editing options", error);
    }
  };

  const deleteItem = async () => {
    const isConfirmed = await confirm({
      title: __("Delete Attribute Option", "whizmanage"),
      message: __(
        `Are you sure you want to permanently delete the "${item.name}" option from the term of "${attribute.name}" attribute? This action will remove the option from all products using this global attribute.`,
        "whizmanage"
      ),
      confirmText: __("Delete", "whizmanage"),
      cancelText: __("Cancel", "whizmanage"),
    });

    if (isConfirmed) {
      const url = `${window.siteUrl}/wp-json/wc/v3/products/attributes/${attribute.id}/terms/${item.id}`;
      try {
        await deleteApi(url);

        toast(
          <div className="p-4 w-full h-full !border-l-4 !border-l-fuchsia-600 dark:bg-slate-800 dark:text-slate-300 rounded-md flex gap-4 items-center justify-start">
            <CheckCircle className="w-5 h-5 text-fuchsia-600" />
            {__(
              `The "${item.name}" option has been permanently deleted from the "${attribute.name}" attribute term.`,
              "whizmanage"
            )}
          </div>,
          { duration: 5000 }
        );

        setTerms((prev) => prev.filter((prevItem) => prevItem.id !== item.id));
      } catch (error) {
        console.log("Error deleting item", error);
      }
    }
  };

  const handleSelectionChange = (itemName, item) => {
    setItemFoTaxonomy(item);
    setValues((prevValues) => {
      const newValues = new Set(prevValues);
      if (newValues.has(itemName)) {
        newValues.delete(itemName);
      } else {
        newValues.add(itemName);
      }
      return newValues;
    });
  };
  return (
    <CommandItem
      key={item.name}
      className="cursor-pointer dark:aria-selected:bg-slate-800 flex gap-2 group/item justify-between min-h-9"
      disabled={itemsExist.includes(item.name)}
      onSelect={() => handleSelectionChange(item.name, item)}
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
        <>
          <Check
            className={cn(
              "mr-2 size-4",
              values.has(item.name) ? "opacity-100" : "opacity-0"
            )}
          />
          <span className="flex-1">
            {item?.name?.replace(/\\/g, "").replace(/"/g, "''") || ""}
          </span>

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

export default AddFromTermsItem;
