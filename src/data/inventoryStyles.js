import { cn } from "../lib/utils";

export const inventoryStyles = (row)=> cn(
    "max-sm:hidden pl-2 rtl:pl-0 rtl:pr-4 text-nowrap",
    !row.manage_stock
      ? row.stock_status == "outofstock"
        ? "text-pink-500 hover:text-pink-600"
        : row.stock_status == "instock"
          ? "text-green-500 hover:text-green-600"
          : "text-yellow-500 hover:text-yellow-600"
      : ""
  )

  export const convertInventory = (status) => {
    if (status == "instock") return "In Stock";
    if (status == "outofstock") return "Out Of Stock";
    if (status == "onbackorder") return "On Backorder";
  };