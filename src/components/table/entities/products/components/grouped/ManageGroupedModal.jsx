// src/components/table/entities/products/components/grouped/ManageGroupedModal.jsx

import { getApi, postApi } from "@/services/services";
import Button from "@components/ui/button.jsx";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@components/ui/command";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@components/ui/hover-card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/ui/popover";
import {
  cn,
  Image,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Tooltip,
  useDisclosure,
} from "@heroui/react";
import { PuffLoader } from "react-spinners";
import {
  ChevronsUpDown,
  Info,
  RefreshCcw,
  Trash2Icon,
  Check,
  Package,
} from "lucide-react";
import { toast } from "@/lib/utils";
import React, { useState, useMemo, useEffect } from "react";
 import { __ } from "@wordpress/i18n";
import CustomTooltip from "@components/ui/nextUI/Tooltip";
import { IconBadge } from "@components/ui/custom/IconBadge";
import { Layers } from "lucide-react";

const columns = [
  { name: "ID", uid: "id", sortable: true },
  { name: "Image", uid: "image" },
  { name: "Name", uid: "name", sortable: true },
  { name: "Price", uid: "price", sortable: true },
  { name: "Sale", uid: "sale", sortable: true },
  { name: "Actions", uid: "actions" },
];

function ManageGroupedModal({ row, isNew, updateValue, trigger }) {
   
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  // State לטעינת כל המוצרים מה-API
  const [allProducts, setAllProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  const [selectedIds, setSelectedIds] = useState(row?.original?.children || []);
  const [isLoading, setIsLoading] = useState(false);

  // טעינת כל המוצרים כאשר המודל נפתח
  useEffect(() => {
    if (!isOpen) return;

    // אם כבר יש מוצרים ב-window.listProduct, השתמש בהם
    if (Array.isArray(window?.listProduct) && window.listProduct.length > 0) {
      setAllProducts(window.listProduct);
      return;
    }

    // אחרת, טען את כל המוצרים מה-API
    const fetchAllProducts = async () => {
      setIsLoadingProducts(true);
      const url = `${window.siteUrl}/wp-json/whizmanage/v1/get_product_for_coupons/`;
      const perPage = 1000;
      let products = [];
      let currentPage = 1;

      try {
        while (true) {
          const res = await getApi(`${url}?page=${currentPage}&perPage=${perPage}`);
          const parsed = JSON.parse(res.data);
          const flattened = parsed.flatMap((p) => [p, ...(p.subRows || [])]);
          products = [...products, ...flattened];
          setAllProducts([...products]);

          if (flattened.length < perPage) break;
          currentPage++;
        }

        // שמור גם ב-window לשימוש בקומפוננטות אחרות
        window.listProduct = products;
      } catch (e) {
        console.error("Failed to fetch products:", e);
        toast.error(__("Failed to load products", "whizmanage"));
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchAllProducts();
  }, [isOpen, __]);

  // Memoize את הטבלה כדי למנוע re-renders מיותרים
  const selectedTableData = useMemo(() => {
    return allProducts
      ?.filter((item) => selectedIds.includes(item.id))
      .map((item) => ({
        original: item,
        depth: 0,
        id: item.id,
      }));
  }, [allProducts, selectedIds]);

  const onSave = async () => {
    setIsLoading(true);

    if (isNew) {
      updateValue("grouped_products", selectedIds);
      toast.success(__(
        "Changes saved! You can now close the grouped product window and continue editing the new product form.",
        "whizmanage"
      ));
    } else {
      const dataToSend = {
        grouped_products: selectedIds,
      };

      await postApi(
        `${window.siteUrl}/wp-json/wc/v3/products/${row.original.id}`,
        dataToSend
      )
        .then((res) => {
          toast.success(__("The product group has been updated successfully", "whizmanage"));
        })
        .catch((error) => {
          toast.error(error?.response?.data?.message || error || "Unknown error occurred");
        });
    }

    setIsLoading(false);
  };

  return (
    <>
      {trigger && <div onClick={onOpen}>{trigger}</div>}
      <Modal
        size="5xl"
        scrollBehavior="inside"
        backdrop="opaque"
        className="!overflow-hidden"
        classNames={{
          backdrop:
            "bg-gradient-to-t from-zinc-800 to-zinc-800/30 backdrop-opacity-20 !overflow-hidden",
          header: "border-b",
          footer: "border-t",
          body: "py-6",
          closeButton: "hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 rounded-lg",
        }}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        isDismissable={false}
        motionProps={{
          variants: {
            enter: {
              y: 0,
              opacity: 1,
              transition: {
                duration: 0.3,
                ease: "easeOut",
              },
            },
            exit: {
              y: -20,
              opacity: 0,
              transition: {
                duration: 0.2,
                ease: "easeIn",
              },
            },
          },
        }}
      >
        <ModalContent className="dark:bg-[#0f0e1c] !scrollbar-hide">
          {(onClose) => (
            <>
              <ModalHeader className="flex gap-3 text-center justify-center items-center">
                <IconBadge icon={Layers} variant="default" size="default" />
                <h2 className="text-xl font-semibold dark:text-slate-300 flex gap-1">
                  <span>{__("Manage", "whizmanage")}</span>
                  <span>{row?.original?.name && row.original.name}</span>
                  {/* <span>{__("Group")}</span> */}
                </h2>
                <HoverCard openDelay={300}>
                  <HoverCardTrigger asChild>
                    <Info className="h-5 w-5 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer m1-2 mt-1.5" />
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80">
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold">
                        {__("Grouped product", "whizmanage")}
                      </h4>
                      <p className="text-sm font-normal text-muted-foreground">
                        {__(
                          "A grouped product allows you to combine multiple related products that can be purchased together. Customers can select individual items from the group or buy the entire set.",
                          "whizmanage"
                        )}
                      </p>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </ModalHeader>
              <ModalBody className="!scrollbar-hide">
                {isLoadingProducts ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <PuffLoader size={80} color="rgb(192 38 211)" />
                    <p className="text-slate-500 dark:text-slate-300">
                      {__("Loading products...", "whizmanage")}
                    </p>
                  </div>
                ) : (
                  <>
                    <MultiSelectInput
                      columnName="products"
                      itemsExist={allProducts.filter(
                        (item) => item.id !== row?.original?.id
                      )}
                      selectedIds={selectedIds}
                      setSelectedIds={setSelectedIds}
                    />
                    <TableGroup
                      data={selectedTableData}
                      selectedIds={selectedIds}
                      setSelectedIds={setSelectedIds}
                    />
                  </>
                )}
              </ModalBody>
              <ModalFooter>
                <Button
                  color="primary"
                  onClick={() => onSave()}
                  className="flex gap-2"
                >
                  {__("Save changes", "whizmanage")}
                  {isLoading && (
                    <RefreshCcw className="text-white w-5 h-5 animate-spin" />
                  )}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}

const MultiSelectInput = ({
  columnName,
  itemsExist,
  selectedIds,
  setSelectedIds,
}) => {
   
  return (
    <>
      <div className="w-full flex items-center justify-center">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="flex justify-between h-10 dark:bg-slate-700 dark:hover:!bg-slate-800"
            >
              {__("Select", "whizmanage")} {__(columnName, "whizmanage")}
              <ChevronsUpDown className="ml-2 rtl:ml-0 rtl:mr-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 dark:bg-slate-800 w-[400px]" align="start">
            <Command className="dark:bg-slate-800">
              <CommandInput
                placeholder={`${__("Find", "whizmanage")} ${__(columnName, "whizmanage")}`}
                className="!border-none !ring-0 h-12 px-4 text-sm"
              />
              <CommandList className="max-h-[300px]">
                <CommandEmpty>
                  <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-300">
                    {__("No results found.", "whizmanage")}
                  </div>
                </CommandEmpty>
                <CommandGroup
                  heading={`${__(`${columnName} exist`, "whizmanage")}`}
                  className="px-2 py-2"
                >
                  {itemsExist.map((item) => {
                    const isSelected = selectedIds.includes(item.id);
                    // תמיכה בשני מבנים: images[0].src (מהטבלה) או image (מה-API של קופונים)
                    const imageSrc = item.images?.[0]?.src || item.image;

                    return (
                      <CommandItem
                        key={item.id}
                        value={`${item.name || ""} ${item.id || ""}`}
                        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-200 py-2.5 px-3 rounded-md mb-1 group"
                        onSelect={() => {
                          setSelectedIds((prevSelectedIds) => {
                            const isSelected = prevSelectedIds.includes(item.id);
                            const newSelectedIds = isSelected
                              ? prevSelectedIds.filter((id) => id !== item.id)
                              : [...prevSelectedIds, item.id];
                            return newSelectedIds;
                          });
                        }}
                      >
                        <div className="flex items-center gap-3 w-full">
                          {/* Checkbox */}
                          <div className="flex-shrink-0">
                            {isSelected ? (
                              <div className="w-5 h-5 rounded bg-fuchsia-600 flex items-center justify-center transition-all">
                                <Check className="w-3.5 h-3.5 text-white" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-600 group-hover:border-fuchsia-400 transition-colors" />
                            )}
                          </div>

                          {/* Image with fallback */}
                          <div className="flex-shrink-0 w-10 h-10 rounded-md overflow-hidden border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 group-hover:border-fuchsia-400 transition-colors">
                            {imageSrc ? (
                              <img
                                src={imageSrc}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-fuchsia-500 transition-colors" />
                              </div>
                            )}
                          </div>

                          {/* Product info */}
                          <div className="flex-1 min-w-0">
                            <CustomTooltip title={item.name}>
                              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate group-hover:text-fuchsia-600 dark:group-hover:text-fuchsia-400 transition-colors">
                                {item.name}
                              </p>
                            </CustomTooltip>
                            <p className="text-xs text-slate-500 dark:text-slate-300">
                              ID: {item.id}
                            </p>
                          </div>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
};

const TableGroup = ({ data, selectedIds, setSelectedIds }) => {
   
  
  const HTMLToText = (html) => {
    if (!html) return "";
    const temp = document.createElement( "div");
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || "";
  };

  const renderCell = React.useCallback((row, columnKey) => {
    const cellValue = row[columnKey];

    const handleClose = (itemToRemove) => {
      setSelectedIds((prevSelectedIds) => {
        const newSelectedIds = prevSelectedIds.filter(
          (id) => id !== itemToRemove.id
        );
        return newSelectedIds;
      });
    };

    switch (columnKey) {
      case "id":
        return (
          <span className="text-xs font-mono text-slate-500 dark:text-slate-300">
            #{row.original.id}
          </span>
        );
      case "image":
        // תמיכה בשני מבנים: images[0].src (מהטבלה) או image (מה-API של קופונים)
        const imageSrc = row?.original?.images?.[0]?.src || row?.original?.image;

        const imageElement = (
          <div className="w-10 h-10 rounded-md overflow-hidden border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-800">
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={row.original.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-5 h-5 text-slate-400 dark:text-slate-500" />
              </div>
            )}
          </div>
        );

        // הצג Tooltip רק אם יש תמונה
        if (!imageSrc) {
          return imageElement;
        }

        return (
          <Tooltip
            className="p-0 m-0"
            placement={window.user_local == "he_IL" ? "left" : "right"}
            content={
              <Image
                width={300}
                alt="Product Image"
                src={imageSrc}
              />
            }
          >
            {imageElement}
          </Tooltip>
        );
      case "name":
        return (
          <div className="flex items-center gap-2 py-1">
            <p className="font-medium text-slate-900 dark:text-slate-100 truncate max-w-[250px]">
              {row.original.name}
            </p>
          </div>
        );
      case "price":
        // Support both data structures: regular_price (from table) or price (from coupons API)
        const regularPrice = row?.original?.regular_price || row?.original?.price;
        return (
          <p className="font-medium text-slate-700 dark:text-slate-300">
            {regularPrice ? `₪${regularPrice}` : "-"}
          </p>
        );
      case "sale":
        const salePrice = row?.original?.sale_price;
        return (
          <p className={`font-medium ${salePrice ? "text-green-600 dark:text-green-400" : "text-slate-400"}`}>
            {salePrice ? `₪${salePrice}` : "-"}
          </p>
        );
              case "actions":
              return (
                <div className="relative flex items-center justify-center gap-2">
                  <CustomTooltip title={__("Delete from group", "whizmanage")}>
                    <button
                      className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group/delete"
                      onClick={() => handleClose(row)}
                    >
                      <Trash2Icon className="w-4 h-4 text-slate-400 group-hover/delete:text-red-600 dark:group-hover/delete:text-red-400 transition-colors" />
                    </button>
                  </CustomTooltip>
                </div>
              );
              default:
              return cellValue;
    }
  }, []);

              return (
                <Table
                  aria-label="Grouped products table"
                  classNames={{
                    wrapper: "max-h-[382px] dark:bg-slate-800",
                    th: "dark:bg-slate-900",
                  }}
                >
                  <TableHeader columns={columns}>
                    {(column) => (
                      <TableColumn
                        key={column.uid}
                        align={column.uid === "actions" ? "center" : "start"}
                      >
                        {__(column.name, "whizmanage")}
                      </TableColumn>
                    )}
                  </TableHeader>
                  <TableBody emptyContent={__("No product grouped", "whizmanage")} items={data}>
                    {(row) => (
                      <TableRow key={row.id}>
                        {(columnKey) => <TableCell>{renderCell(row, columnKey)}</TableCell>}
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              );
};

              export default ManageGroupedModal;