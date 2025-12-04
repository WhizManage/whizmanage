import { useProductsContext } from "@/context/ProductsContext";
import { inventoryStyles } from "@/data/inventoryStyles";
import { postApi } from "@/services/services";
import Loader from "@components/Loader";
import CustomTooltip from "@components/nextUI/Tooltip";
import Button from "@components/ui/button";
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
  Avatar,
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
import {
  CheckCircle,
  ChevronsUpDown,
  Info,
  RefreshCcw,
  Settings2,
  Square,
  Trash2Icon,
} from "lucide-react";
import React, { useState } from "react";
import { __ } from '@wordpress/i18n';
import { toast } from "sonner";
import { HTMLToText } from "../Columns";

const columns = [
  { name: "ID", uid: "id", sortable: true },
  { name: "Image", uid: "image" },
  { name: "Name", uid: "name", sortable: true },
  { name: "Price", uid: "price", sortable: true },
  { name: "Sale", uid: "sale", sortable: true },
  { name: "Description", uid: "description", sortable: true },
  { name: "Inventory", uid: "inventory", sortable: true },
  { name: "Actions", uid: "actions" },
];

function EditGrouped({ row, isNew, updateValue }) {
   
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { data } = useProductsContext();
  const [selectedIds, setSelectedIds] = useState(row?.original?.children || []);
  const [isLoading, setIsLoading] = useState(false);

  const onSave = async () => {
    setIsLoading(true);

    if (isNew) {
      updateValue("grouped_products", selectedIds);
      toast(
        <div className="p-4 dark:bg-slate-800 w-full h-full dark:text-slate-400 !border-l-4 !border-l-fuchsia-600 rounded-md flex gap-4 items-center justify-start">
          <CheckCircle className="w-5 h-5 text-fuchsia-600" />
          {__(
            "Changes saved! You can now close the grouped product window and continue editing the new product form.",
            "whizmanage"
          )}
        </div>,
        { duration: 5000 }
      );
    } else {
      const data = {
        grouped_products: selectedIds,
      };

      await postApi(
        `${window.siteUrl}/wp-json/wc/v3/products/${row.original.id}`,
        data
      )
        .then((res) => {
          toast(
            <div className="p-4 dark:bg-slate-800 w-full h-full dark:text-slate-400 !border-l-4 !border-l-fuchsia-600 rounded-md flex gap-4 items-center justify-start">
              <CheckCircle className="w-5 h-5 text-fuchsia-600" />
              {__("The product group has been updated successfully", "whizmanage")}
            </div>,
            { duration: 5000 }
          );
        })
        .catch((error) => {
          toast(
            <div className="p-4 dark:bg-slate-800 w-full h-full dark:text-slate-300 !border-l-4 !border-l-red-500 rounded-md flex gap-4 items-center justify-start">
              <XCircle className="w-5 h-5 text-red-500" />
              {error?.response?.data?.message ||
                error ||
                "Unknown error occurred"}
            </div>,
            { duration: 5000 }
          );
        });
    }

    setIsLoading(false);
  };

  const prepareSelectedTableData = (data, selectedIds) => {
    return data
      ?.filter((item) => selectedIds.includes(item.id))
      .map((item) => ({
        original: item,
        depth: 0,
        id: item.id,
      }));
  };

  return (
    <>
      <CustomTooltip title={__("Manage group", "whizmanage")}>
        <Button
          className={cn(
            "flex px-2",
            isNew ? "!min-h-10 !min-w-10 !h-10 !w-10" : "!size-8"
          )}
          variant="outline"
          size="icon"
          onClick={onOpen}
        >
          <Settings2 className="!size-5" />
        </Button>
      </CustomTooltip>
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
              <ModalHeader className="flex gap-2 text-center text-3xl justify-center items-center">
                <h2 className="text-center dark:text-gray-400 flex gap-1">
                  <span>{__("Manage", "whizmanage")}</span>
                  <span>{row?.original?.name && row.original.name}</span>
                  <span>{__("Group", "whizmanage")}</span>
                </h2>
                <HoverCard openDelay={300}>
                  <HoverCardTrigger asChild>
                    <Info className="h-5 w-5 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer mt-2" />
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80">
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold">
                        {__("Grouped Product", "whizmanage")}
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
                <MultiSelectInput
                  columnName="product"
                  itemsExist={data.filter(
                    (item) => item.id !== row?.original?.id
                  )}
                  selectedIds={selectedIds}
                  setSelectedIds={setSelectedIds}
                />
                <TableGroup
                  data={prepareSelectedTableData(data, selectedIds)}
                  selectedIds={selectedIds}
                  setSelectedIds={setSelectedIds}
                />
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
                            const isSelected = prevSelectedIds.includes(
                              item.id
                            );
                            const newSelectedIds = isSelected
                              ? prevSelectedIds.filter((id) => id !== item.id)
                              : [...prevSelectedIds, item.id];
                            return newSelectedIds;
                          });
                        }}
                      >
                        <>
                          {selectedIds.includes(item.id) ? (
                            <svg
                              className={cn("transition-opacity")}
                              xmlns="http://www.w3.org/2000/svg"
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              class="lucide lucide-square-check-big"
                            >
                              <path d="M21 10.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.5" />
                              <path d="m9 11 3 3L22 4" />
                            </svg>
                          ) : (
                            <Square
                              size={24}
                              className={cn("transition-opacity")}
                            />
                          )}
                        </>
                        <Avatar
                          isBordered
                          size="md"
                          radius="sm"
                          src={item.images[0].src}
                          fallback={
                            <img
                              className="w-full h-full object-fill"
                              src={window.placeholderImg}
                            />
                          }
                        />
                        <span>({item.id})</span>
                        <span>{item.name}</span>
                      </CommandItem>
                    ))
                  )}
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
      case "image":
        return (
          <Tooltip
            className="p-0 m-0"
            placement={window.user_local == "he_IL" ? "left" : "right"}
            content={
              <Image
                width={300}
                alt="NextUI hero Image"
                src={
                  row.depth == 0
                    ? row?.original?.images[0] != null
                      ? row.original.images[0].src
                      : window.placeholderImg
                    : row?.original?.image != null
                      ? row.original.image.src
                      :window.placeholderImg
                }
              />
            }
          >
            <Avatar
              src={
                row.depth == 0
                  ? row?.original?.images[0] != null &&
                    row.original.images[0].src
                  : row?.original?.image != null && row.original.image.src
              }
              radius="sm"
              fallback={
                <img
                  className="w-full h-full object-fill"
                  src={window.placeholderImg}
                />
              }
            />
          </Tooltip>
        );
      case "name":
        return <p>{row.original.name}</p>;
      case "price":
        return <p>{row?.original?.regular_price}</p>;
      case "sale":
        return <p>{row?.original?.sale_price}</p>;
      case "description":
        return (
          <div
            className="capitalize truncate description-img !line-clamp-2 text-wrap max-sm:!hidden"
            title={HTMLToText(row.original.description)}
          >
            {HTMLToText(row.original.description)}
          </div>
        );
      case "inventory":
        return (
          <div
            className={cn(
              inventoryStyles(row.original),
              "uppercase !text-sm font-semibold"
            )}
          >
            {row.original.manage_stock
              ? row.original.stock_quantity
              : __(row.original.stock_status, "whizmanage")}
          </div>
        );
      case "actions":
        return (
          <div className="relative flex items-center gap-2">
            <CustomTooltip title={__("Delete variation", "whizmanage")}>
              <span
                className="text-lg cursor-pointer active:opacity-50 text-fuchsia-600 hover:text-slate-500 flex justify-end"
                onClick={() => handleClose(row)}
              >
                <Trash2Icon className="w-4 h-4" />
              </span>
            </CustomTooltip>
          </div>
        );
      default:
        return cellValue;
    }
  }, []);

  return (
    <Table
      aria-label="Example table with custom cells"
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
            {column.name}
          </TableColumn>
        )}
      </TableHeader>
      <TableBody emptyContent={__("No product grouped", "whizmanage")} items={data}>
        {(row) => (
          <TableRow key={row.id || index}>
            {(columnKey) => <TableCell>{renderCell(row, columnKey)}</TableCell>}
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};

export default EditGrouped;
