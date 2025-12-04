import { useProductsContext } from "@/context/ProductsContext";
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
import { Chip, cn } from "@heroui/react";
import { PopoverClose } from "@radix-ui/react-popover";
import { __ } from '@wordpress/i18n';
import { Check, ChevronsUpDown, Edit, Info, RefreshCcw } from "lucide-react";
import { useState } from "react";

const LinkedProducts = ({ row, edit }) => {

  
  const { data ,isTableImport } = useProductsContext();
  if(isTableImport){
    return
  }
   
  const subProducts = data.flatMap((product) => [
    product,
    ...(product.subRows || []),
  ]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Ensure upsell_ids and cross_sell_ids are initialized
  const [upSellIds, setUpSellIds] = useState(row?.original?.upsell_ids || []);
  const [crossSellIds, setCrossSellIds] = useState(
    row?.original?.cross_sell_ids || []
  );

  const handleSave = async () => {
    setIsLoading(true);
    if (row && row.original) {
      row.original.upsell_ids = upSellIds;
      row.original.cross_sell_ids = crossSellIds;
    }
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsLoading(false);
    setIsOpen(false); 
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="flex gap-2 h-8 capitalize">
          {__("Open", "whizmanage")}
          {edit && (
            <Edit className="ml-2 rtl:mr-2 rtl:ml-0 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="!w-96 mx-4">
        <div className="dark:bg-slate-800">
          <div className="flex flex-col gap-1 text-center text-3xl justify-center pb-4 border-b dark:border-slate-700">
            <div className="flex items-center justify-center space-x-2">
              <h2 className="text-center dark:text-gray-400">
                {__("Linked Products", "whizmanage")}
              </h2>
              <HoverCard openDelay={300}>
                <HoverCardTrigger asChild>
                  <Info className="h-5 w-5 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer mt-2" />
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
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
            </div>
          </div>
          {!edit && (
            <div className="px-8 py-2 bg-fuchsia-100/85 dark:bg-slate-700 text-fuchsia-600 dark:text-white/60">
              <p className="text-center font-semibold">
                {__(
                  "To edit the linked products, please switch the product to edit mode.",
                  "whizmanage"
                )}
              </p>
            </div>
          )}
          <div className="py-4 flex flex-col gap-4">
            <div className="w-full flex items-center justify-center text-center gap-2">
              <p className="text-xs font-bold text-slate-300">{__("Up sells", "whizmanage")}</p>
              <HoverCard openDelay={300}>
                <HoverCardTrigger asChild>
                  <Info className="h-3 w-3 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer" />
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
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
            </div>
            <MultiSelectInput
              columnName="Upsells"
              itemsExist={subProducts}
              selectedIds={upSellIds}
              setSelectedIds={setUpSellIds}
            />
            <div className="w-full flex items-center justify-center text-center gap-2">
              <p className="text-xs font-bold text-slate-300">{__("Cross sells", "whizmanage")}</p>
              <HoverCard openDelay={300}>
                <HoverCardTrigger asChild>
                  <Info className="h-3 w-3 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer" />
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
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
            </div>
            <MultiSelectInput
              columnName="Cross-sells"
              itemsExist={subProducts}
              selectedIds={crossSellIds}
              setSelectedIds={setCrossSellIds}
            />
          </div>
          <div className="px-4 pb-4 flex justify-center gap-2">
            <Button onClick={handleSave} className="flex gap-2 items-center justify-center">
            {isLoading ? __("Saving...", "whizmanage") : __("Save", "whizmanage")}
              {isLoading && (
                <RefreshCcw className="text-white w-5 h-5 animate-spin" />
              )}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

const MultiSelectInput = ({
  columnName,
  itemsExist,
  selectedIds,
  setSelectedIds,
}) => {
  const handleClose = (itemToRemove) => {
    const newSelectedIds = selectedIds.filter((id) => id !== itemToRemove.id);
    setSelectedIds(newSelectedIds);
  };
   
  return (
    <>
      <div className="flex flex-wrap gap-2 relative min-h-12 items-center border rounded-lg p-2 border-slate-300 dark:border-slate-600 dark:bg-slate-900/50">
        {selectedIds.map((id) => {
          const item = itemsExist.find((product) => product.id === id);
          return (
            <Chip
              key={id}
              onClose={() => handleClose(item)}
              variant="flat"
              classNames={{
                base: "bg-gradient-to-br from-fuchsia-50 dark:from-slate-700 to-fuchsia-200 dark:to-slate-600 opacity-100",
                content: "text-fuchsia-600 dark:text-slate-300",
                closeButton: "text-fuchsia-600 dark:text-slate-300",
              }}
            >
              <span>{item?.name || "Unknown"}</span>
            </Chip>
          );
        })}
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="flex justify-between h-10 dark:bg-slate-700 dark:hover:!bg-slate-600"
          >
            {__("Select", "whizmanage")} {__(columnName, "whizmanage")}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 dark:bg-slate-800" align="start">
          <Command className="dark:bg-slate-800">
            <CommandInput
              placeholder={`${__("Find", "whizmanage")} ${__(columnName, "whizmanage")}`}
              className="!border-none !ring-0"
            />
            <CommandList>
              <CommandEmpty>{__("No results found.", "whizmanage")}</CommandEmpty>
              <CommandGroup heading={`${__(columnName, "whizmanage")} ${__("exist", "whizmanage")}`}>
                {itemsExist.length < 1 ? (
                  <Loader />
                ) : (
                  itemsExist.map((item) => (
                    <CommandItem
                      key={item.id}
                      className="cursor-pointer dark:hover:bg-slate-700 group/item flex gap-4"
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
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedIds.includes(item.id)
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      <span>{item.name}</span>
                      <span>({item.id})</span>
                    </CommandItem>
                  ))
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
};

export default LinkedProducts;
