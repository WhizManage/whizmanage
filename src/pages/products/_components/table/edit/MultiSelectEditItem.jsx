import Button from "@components/ui/button";
import CustomTooltip from "@components/nextUI/Tooltip";
import { CommandItem } from "@components/ui/command";
import { Input } from "@components/ui/input";
import { cn } from "@heroui/react";
import {
  Check,
  CheckCircle,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Undo2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { useState } from "react";
import { __ } from '@wordpress/i18n';
import { toast } from "sonner";
import { deleteApi, putApi } from "/src/services/services";
import { confirm } from "@components/CustomConfirm";

const MultiSelectEditItem = ({
  item,
  setItemsExist,
  itemsProduct,
  setItemsProduct,
  columnName,
  row,
  addNewItem,
  setAddSubcategory,
  addSubcategory,
  newSubcategoryName,
  setNewSubcategoryName,
  isAdding,
  isLastItem,
  removeTempItems,
  isYoastKey
}) => {
  const [isEditItem, setIsEditItem] = useState(false);
  const [newName, setNewName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
   

  // פונקציה לטוסט הצלחה
  const showSuccessToast = (message) => {
    toast(
      <div className="p-4 w-full h-full !border-l-4 !border-l-fuchsia-600 dark:bg-slate-800 dark:text-slate-300 rounded-md flex gap-4 items-center justify-start">
        <CheckCircle className="w-5 h-5 text-fuchsia-600" />
        {message}
      </div>,
      { duration: 5000 }
    );
  };

  // פונקציה לטוסט שגיאה
  const showErrorToast = (message) => {
    toast(
      <div className="p-4 w-full h-full !border-l-4 !border-l-red-500 dark:bg-slate-800 dark:text-slate-300 rounded-md flex gap-4 items-center justify-start">
        <XCircle className="w-5 h-5 text-red-500" />
        {message}
      </div>,
      { duration: 7000 }
    );
  };

  // פונקציה לטוסט אזהרה
  const showWarningToast = (message) => {
    toast(
      <div className="p-4 w-full h-full !border-l-4 !border-l-yellow-500 dark:bg-slate-800 dark:text-slate-300 rounded-md flex gap-4 items-center justify-start">
        <AlertTriangle className="w-5 h-5 text-yellow-500" />
        {message}
      </div>,
      { duration: 6000 }
    );
  };

  // פונקציה לטיפול בשגיאות API - פשוט
  const handleApiError = (error, defaultMessage) => {
    if (error.response) {
      console.log(error.response.data.message);
      // אם התקבלה שגיאה מהשרת
      showErrorToast(error.response.data.message || defaultMessage);
    } else {
      // שגיאת רשת או שגיאה כללית
      showErrorToast(defaultMessage);
    }
    console.error("API error:", error);
  };

  const editItem = async () => {
    // בדיקה ששם חדש קיים
    if (!newName || !newName.trim()) {
      showWarningToast(t("Please provide a valid name."));
      return;
    }

    // בדיקה ששם השונה מהקיים
    if (newName.trim() === item.name) {
      showWarningToast(t("The new name is the same as the current name."));
      return;
    }

    setIsLoading(true);

    try {
      // יצירת ה-URL
      let url;
      if (columnName === "categories" || columnName === "tags") {
        url = `${window.siteUrl}/wp-json/wc/v3/products/${columnName}/${item.id}`;
      } else {
        url = `${window.siteUrl}/wp-json/whizmanage/v1/taxonomy/${columnName}/term/${item.id}`;
      }

      const itemData = { name: newName.trim() };

      // קריאה ל-API
      const response = await putApi(url, itemData);
      const updatedItem = response.data;

      // עדכון מערכים - הסרת אייטמים זמניים לפני העדכון
      setItemsExist((prevItems) =>
        prevItems
          .filter((item) => !item.temp) // הסרת אייטמים זמניים
          .map((i) => (i.id === item.id ? updatedItem : i))
      );
      setItemsProduct((prevProducts) =>
        prevProducts.map((i) => (i.id === item.id ? updatedItem : i))
      );

      // הודעת הצלחה
      showSuccessToast(
        `${__("The item has been successfully updated to", "whizmanage")} "${updatedItem.name}".`
      );

      // איפוס ערכי העריכה
      setIsEditItem(false);
      setNewName("");
    } catch (error) {
      handleApiError(
        error,
        __("Failed to update the item. Please try again later.", "whizmanage")
      );
    } finally {
      setIsLoading(false);
    }
  };

  const deleteItem = async () => {
    const isConfirmed = await confirm({
      title: __("Delete Item", "whizmanage"),
      message: `${__("Are you sure you want to permanently delete", "whizmanage")} "${item.name || __("this item", "whizmanage")}"?\n\n${__("This action cannot be undone.", "whizmanage")}`,
      confirmText: __("Delete", "whizmanage"),
      cancelText: __("Cancel", "whizmanage"),
    });

    if (!isConfirmed) return;

    setIsLoading(true);

    try {
      let url;

      if (columnName === "categories" || columnName === "tags") {
        url = `${window.siteUrl}/wp-json/wc/v3/products/${columnName}/${item.id}`;
      } else {
        url = `${window.siteUrl}/wp-json/whizmanage/v1/taxonomy/${columnName}/term/${item.id}`;
      }

      await deleteApi(url);

      // הודעת הצלחה
      showSuccessToast(
        `"${item.name || __("Item", "whizmanage")}" ${__("has been permanently deleted", "whizmanage")}.`
      );

      // עדכון מערכים
      setItemsExist((prevItems) =>
        prevItems.filter(
          (existItem) => existItem.id !== item.id && !existItem.temp
        )
      );
      setItemsProduct((prevProducts) =>
        prevProducts.filter((productItem) => productItem.id !== item.id)
      );
    } catch (error) {
      handleApiError(
        error,
        __("Failed to delete the item. Please try again later.", "whizmanage")
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSubcategory = () => {
    if (!newSubcategoryName || !newSubcategoryName.trim()) {
      showWarningToast(t("Please enter a subcategory name."));
      return;
    }

    // הסרת אייטמים זמניים לפני הוספה
    if (removeTempItems) removeTempItems();
    addNewItem(newSubcategoryName.trim(), item.id);
  };

  const handleCancelSubcategory = () => {
    // הסרת אייטמים זמניים בביטול
    if (removeTempItems) removeTempItems();
    setAddSubcategory(null);
    setNewSubcategoryName("");
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
        setItemsProduct((prevItemsProduct) => {
          let newItemsProduct;
          const isAlreadySelected = prevItemsProduct?.some(
            (existingItem) => existingItem.id === item.id
          );

          if (isYoastKey) {
            // Single select עבור Yoast
            newItemsProduct = isAlreadySelected ? [] : [item];
          } else {
            // Multi select רגיל
            if (isAlreadySelected) {
              newItemsProduct = prevItemsProduct.filter(
                (existingItem) => existingItem.id !== item.id
              );
            } else {
              newItemsProduct = [...prevItemsProduct, item];
            }
          }

          if (row) {
            if (isYoastKey) {
              const item = row.meta_data?.find(item => item.key === columnName);
              if (item) {
                item.value = newItemsProduct[newItemsProduct.length - 1]?.id || '';
              } else if (newItemsProduct.length > 0) {
                row.meta_data?.push({ key: columnName, value: newItemsProduct[0].id });
              }
            } else {
              row.original[columnName] = newItemsProduct;
            }
          }
          return newItemsProduct;
        });
      }}
    >
      {isEditItem ? (
        <div className="flex gap-2 !p-0.5" onClick={(e) => e.stopPropagation()}>
          <Input
            defaultValue={item.name}
            className="h-8 w-full dark:!border-slate-600"
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isLoading) {
                editItem();
              }
              if (e.key === "Escape") {
                setIsEditItem(false);
                setNewName("");
              }
            }}
            autoFocus
            disabled={isLoading}
          />
          <Button
            variant="outline"
            className="h-8 dark:!border-slate-600"
            onPointerDown={(e) => {
              e.stopPropagation();
              if (!isLoading) editItem();
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              __("Save", "whizmanage")
            )}
          </Button>
          <Button
            variant="outline"
            className="h-8 dark:!border-slate-600"
            onPointerDown={(e) => {
              e.stopPropagation();
              setIsEditItem(false);
              setNewName("");
            }}
            disabled={isLoading}
          >
            <Undo2 className="w-4 h-4" />
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

          <div className="hidden group-hover/item:flex gap-1 !max-w-fit items-center">
            <CustomTooltip title={__("Edit", "whizmanage")}>
              <Button
                size="icon"
                variant="outline"
                className="w-6 h-6"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setIsEditItem(true);
                  setNewName(item.name);
                }}
                disabled={isLoading}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            </CustomTooltip>

            <CustomTooltip title={__("Delete", "whizmanage")}>
              <Button
                size="icon"
                variant="outline"
                className="w-6 h-6"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  if (!isLoading) deleteItem();
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            </CustomTooltip>

            {columnName === "categories" && (
              <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-1" />
            )}

            {columnName === "categories" && (
              <CustomTooltip title={__("Add subcategory", "whizmanage")}>
                <Button
                  size="icon"
                  variant="outline"
                  className="w-6 h-6"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setAddSubcategory(item.id);

                    // יצירת אייטם זמני רק אם זה האייטם האחרון ברשימה
                    // כדי שהאינפוט לא ייחתך
                    if (isLastItem) {
                      const tempItem = {
                        id: "temp-spacer-" + item.id,
                        name: "",
                        temp: true,
                        depth: 0,
                      };
                      setItemsExist((prevItems) => [...prevItems, tempItem]);
                    }
                  }}
                  disabled={isLoading}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </CustomTooltip>
            )}
          </div>

          {addSubcategory === item.id && (
            <div className="absolute z-50 top-full left-0 mt-1 w-full">
              <div className="bg-white dark:bg-slate-700 border dark:border-slate-600 rounded-lg px-1 py-0.5 shadow-lg">
                <div className="flex gap-1 items-center">
                  <div className="relative flex-1 border rounded-lg flex gap-1 items-center px-0 dark:bg-slate-800">
                    <Input
                      type="text"
                      placeholder={__("Subcategory to {{name}}", {
                        name: item.name,
                      })}
                      value={newSubcategoryName}
                      onChange={(e) => setNewSubcategoryName(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="!border-none dark:!text-slate-300 !rounded-lg !ring-0 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-sm focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0"
                      autoFocus
                      disabled={isAdding}
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" &&
                          newSubcategoryName.trim() &&
                          !isAdding
                        ) {
                          handleAddSubcategory();
                          e.preventDefault();
                        }
                        if (e.key === "Escape") {
                          handleCancelSubcategory();
                        }
                      }}
                    />
                  </div>
                  {newSubcategoryName.trim().length > 0 ? (
                    <Button
                      variant="outline"
                      className="h-8 rounded-lg"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        if (!isAdding) handleAddSubcategory();
                      }}
                      disabled={isAdding}
                    >
                      {isAdding ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        __("Add", "whizmanage")
                      )}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="h-8 rounded-lg"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        handleCancelSubcategory();
                      }}
                      disabled={isAdding}
                    >
                      <Undo2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </CommandItem>
  );
};

export default MultiSelectEditItem;
