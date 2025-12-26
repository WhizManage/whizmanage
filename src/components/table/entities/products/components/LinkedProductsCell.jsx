// src/components/table/entities/products/components/LinkedProductsCell.jsx

import { getApi } from "@/services/services";
import { toast } from "@/lib/utils";
import { Button } from "@components/ui/button";
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
  Chip,
  cn,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  useDisclosure,
} from "@heroui/react";
 import { __ } from "@wordpress/i18n";
import { PuffLoader } from "react-spinners";
import { Check, ChevronsUpDown, Info, Link2, Loader2 } from "lucide-react";
import { IconBadge } from "@components/ui/custom/IconBadge";
import { useState, useMemo, useEffect } from "react";
import CustomTooltip from "@components/ui/nextUI/Tooltip";

/**
 * LinkedProductsCell
 * Compact single-line display with edit modal
 */
export default function LinkedProductsCell({ row, table }) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
   
  const store = table?.options?.meta?.store;
  const handleCellUpdate = table?.options?.meta?.handleCellUpdate;

  const [isLoading, setIsLoading] = useState(false);
  const [upSellIds, setUpSellIds] = useState([]);
  const [crossSellIds, setCrossSellIds] = useState([]);

  // Sync with row data when modal opens
  useEffect(() => {
    if (isOpen) {
      setUpSellIds(row?.original?.upsell_ids || []);
      setCrossSellIds(row?.original?.cross_sell_ids || []);
    }
  }, [isOpen, row?.original?.upsell_ids, row?.original?.cross_sell_ids]);

  // Handler to prevent modal closing when Select/Popover is open
  const handleOpenChange = (open) => {
    if (!open) {
      const activePopper = document.querySelector(
        "[data-radix-popper-content-wrapper]"
      );
      if (activePopper) {
        return;
      }
    }
    onOpenChange(open);
  };

  const handleSave = async (onClose) => {
    setIsLoading(true);
    const rowId = row?.original?.id;

    try {
      if (handleCellUpdate) {
        await handleCellUpdate(rowId, "upsell_ids", upSellIds, row?.original, false);
        await handleCellUpdate(rowId, "cross_sell_ids", crossSellIds, row?.original, false);
      }
      onClose?.();
    } catch (error) {
      console.error("Failed to save linked products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Count for display
  const upCount = (row?.original?.upsell_ids || []).length;
  const crossCount = (row?.original?.cross_sell_ids || []).length;
  const totalCount = upCount + crossCount;

  // Tooltip content
  const tooltipDescription = totalCount > 0
    ? `${upCount} ${__("Upsells", "whizmanage")}, ${crossCount} ${__("Cross-sells", "whizmanage")}`
    : __("No linked products", "whizmanage");

  return (
    <>
      {/* Compact single-line cell display */}
      <div className="flex items-center gap-2 px-2">
        <CustomTooltip
          title={__("Linked Products", "whizmanage")}
          description={tooltipDescription}
        >
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 flex-shrink-0 text-muted-foreground hover:text-slate-900 dark:hover:text-slate-100"
            onClick={onOpen}
          >
            <Link2 className="h-4 w-4 mr-1" />
            {__("Edit", "whizmanage")}
            {totalCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-4 h-4 text-[10px] font-medium rounded-full bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-400 px-1">
                {totalCount}
              </span>
            )}
          </Button>
        </CustomTooltip>
      </div>
      {/* Edit Modal */}
      <Modal
        size="2xl"
        scrollBehavior="inside"
        backdrop="blur"
        isOpen={isOpen}
        onOpenChange={handleOpenChange}
        isDismissable={!isLoading}
        classNames={{
          backdrop: "z-[9990] bg-black/50 dark:bg-black/70",
          base: "z-[9995] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden",
          wrapper: "z-[9995]",
          header: "p-0",
          footer: "p-0",
          body: "p-0",
          closeButton: "hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 rounded-lg",
        }}
        motionProps={{
          variants: {
            enter: {
              y: 0,
              opacity: 1,
              transition: { duration: 0.3, ease: "easeOut" },
            },
            exit: {
              y: -20,
              opacity: 0,
              transition: { duration: 0.2, ease: "easeIn" },
            },
          },
        }}
      >
        <ModalContent className="dark:bg-slate-900">
          {(onClose) => (
            <>
              <ModalHeader className="flex gap-3 justify-center items-center px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                <IconBadge icon={Link2} variant="default" size="default" />
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-300">
                  {__("Linked Products", "whizmanage")}
                </h2>
                <HoverCard openDelay={300}>
                  <HoverCardTrigger asChild>
                    <Info className="h-5 w-5 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer" />
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80 z-[10000]">
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold">
                        {__("Linked Products", "whizmanage")}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {__(
                          "Linked products are related items that appear on the product page as additional or complementary suggestions. This enhances the shopping experience by offering customers more options.",
                          "whizmanage"
                        )}
                      </p>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </ModalHeader>

              <ModalBody className="p-6 bg-slate-50 dark:bg-slate-900/50">
                <div className="space-y-6 max-h-[60vh] py-2 overflow-y-auto scrollbar-whiz">
                  {/* Upsells Section */}
                  <div className="space-y-3 px-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {__("Upsells", "whizmanage")}
                      </h3>
                      <HoverCard openDelay={300}>
                        <HoverCardTrigger asChild>
                          <Info className="h-4 w-4 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer" />
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80 z-[10000]">
                          <div className="space-y-1">
                            <h4 className="text-sm font-semibold">{__("Upsells", "whizmanage")}</h4>
                            <p className="text-sm text-muted-foreground">
                              {__(
                                "Upsells are products which you recommend instead of the currently viewed product, for example, products that are more profitable or better quality or more expensive.",
                                "whizmanage"
                              )}
                            </p>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                      <span className="text-xs text-muted-foreground">
                        ({upSellIds.length} {__("selected", "whizmanage")})
                      </span>
                    </div>
                    <MultiSelectInput
                      columnName="Upsells"
                      currentProductId={row?.original?.id}
                      selectedIds={upSellIds}
                      setSelectedIds={setUpSellIds}
                    />
                  </div>

                  {/* Cross-sells Section */}
                  <div className="space-y-3 px-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {__("Cross-sells", "whizmanage")}
                      </h3>
                      <HoverCard openDelay={300}>
                        <HoverCardTrigger asChild>
                          <Info className="h-4 w-4 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer" />
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80 z-[10000]">
                          <div className="space-y-1">
                            <h4 className="text-sm font-semibold">
                              {__("Cross-sells", "whizmanage")}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {__(
                                "Cross-sells are products which you promote in the cart, based on the current product.",
                                "whizmanage"
                              )}
                            </p>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                      <span className="text-xs text-muted-foreground">
                        ({crossSellIds.length} {__("selected", "whizmanage")})
                      </span>
                    </div>
                    <MultiSelectInput
                      columnName="Cross-sells"
                      currentProductId={row?.original?.id}
                      selectedIds={crossSellIds}
                      setSelectedIds={setCrossSellIds}
                    />
                  </div>
                </div>
              </ModalBody>

              <ModalFooter className="px-6 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                  className="h-9"
                >
                  {__("Cancel", "whizmanage")}
                </Button>
                <Button
                  onClick={() => handleSave(onClose)}
                  disabled={isLoading}
                  className="h-9 bg-gradient-to-r from-fuchsia-600 to-pink-500 hover:from-fuchsia-700 hover:to-pink-600 text-white shadow-sm hover:shadow-md transition-all min-w-24"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {__("Saving...", "whizmanage")}
                    </>
                  ) : (
                    __("Save", "whizmanage")
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
  currentProductId,
  selectedIds,
  setSelectedIds,
}) => {
   
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Load all products when popover opens
  useEffect(() => {
    if (!isPopoverOpen) return;

    // If we already have products in window.listProduct, use them
    if (Array.isArray(window?.listProduct) && window.listProduct.length > 0) {
      setAllProducts(window.listProduct.filter((p) => p.id !== currentProductId));
      return;
    }

    // Otherwise, fetch all products from API
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
          setAllProducts(products.filter((p) => p.id !== currentProductId));

          if (flattened.length < perPage) break;
          currentPage++;
        }

        // Save to window for use in other components
        window.listProduct = products;
      } catch (e) {
        console.error("Failed to fetch products:", e);
        toast.error(__("Failed to load products.", "whizmanage"));
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchAllProducts();
  }, [isPopoverOpen, currentProductId, __]);

  const handleClose = (itemToRemove) => {
    const newSelectedIds = selectedIds.filter((id) => id !== itemToRemove.id);
    setSelectedIds(newSelectedIds);
  };

  // Get product name for chips - check window.listProduct first
  const getProductName = (id) => {
    const products = window?.listProduct || allProducts;
    const item = products.find((p) => p.id === id);
    return item?.name || `ID: ${id}`;
  };

  return (
    <div className="space-y-3">
      {/* Selected items display */}
      <div className="flex flex-wrap gap-2 min-h-12 items-center border rounded-lg p-3 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
        {selectedIds.length === 0 ? (
          <span className="text-sm text-muted-foreground">
            {__("No products selected", "whizmanage")}
          </span>
        ) : (
          selectedIds.map((id) => (
            <Chip
              key={id}
              onClose={() => handleClose({ id })}
              variant="flat"
              classNames={{
                base: "bg-gradient-to-br from-fuchsia-50 dark:from-slate-700 to-fuchsia-200 dark:to-slate-600",
                content: "text-fuchsia-600 dark:text-slate-300 text-sm",
                closeButton: "text-fuchsia-600 dark:text-slate-300",
              }}
            >
              <span>{getProductName(id)}</span>
            </Chip>
          ))
        )}
      </div>
      {/* Product selector */}
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full flex justify-between h-10 dark:bg-slate-800 dark:hover:!bg-slate-700 dark:border-slate-700"
          >
            <span>{__("Select", "whizmanage")} {__(columnName, "whizmanage")}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 dark:bg-slate-800 w-80 z-[10000]" align="start">
          <Command className="dark:bg-slate-800">
            <CommandInput
              placeholder={`${__("Find", "whizmanage")} ${__(columnName, "whizmanage")}...`}
              className="!border-none !ring-0"
            />
            <CommandList className="max-h-64">
               <CommandEmpty>{__("No results found.", "whizmanage")}</CommandEmpty>
              <CommandGroup heading={__("Available products", "whizmanage")}>
                {isLoadingProducts ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <PuffLoader size={50} color="rgb(192 38 211)" />
                  </div>
                ) : allProducts.length < 1 ? (
                  <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                    {__("No products available", "whizmanage")}
                  </div>
                ) : (
                  allProducts.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={`${item.name || ""} ${item.id || ""}`}
                      className="cursor-pointer dark:hover:bg-slate-700 group/item flex gap-2"
                      onSelect={() => {
                        setSelectedIds((prevSelectedIds) => {
                          const isSelected = prevSelectedIds.includes(item.id);
                          return isSelected
                            ? prevSelectedIds.filter((id) => id !== item.id)
                            : [...prevSelectedIds, item.id];
                        });
                      }}
                    >
                      <Check
                        className={cn(
                          "h-4 w-4 flex-shrink-0",
                          selectedIds.includes(item.id)
                            ? "opacity-100 text-fuchsia-600"
                            : "opacity-0"
                        )}
                      />
                      <span className="truncate flex-1">{item.name}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        #{item.id}
                      </span>
                    </CommandItem>
                  ))
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};
