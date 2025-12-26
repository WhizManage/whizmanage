// src/data/inventoryStyles.js

import { cn } from "@/lib/utils";

// קונפיגורציה מרכזית לכל הסטטוסים
export const inventoryStatusConfig = {
  instock: {
    bg: "bg-green-50 dark:bg-green-900/20",
    dot: "bg-green-500",
    text: "text-green-700 dark:text-green-400",
    label: "In stock",
  },
  outofstock: {
    bg: "bg-red-50 dark:bg-red-900/20",
    dot: "bg-red-500",
    text: "text-red-600 dark:text-red-400",
    label: "Out of stock",
  },
  onbackorder: {
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
    dot: "bg-yellow-500",
    text: "text-yellow-600 dark:text-yellow-400",
    label: "On backorder",
  },
  lowstock: {
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
    dot: "bg-yellow-500",
    text: "text-yellow-600 dark:text-yellow-400",
    label: "Low stock",
  },
};

// מחזיר את הקונפיגורציה המתאימה לפי הנתונים
export const getInventoryConfig = (data) => {
  if (!data) return inventoryStatusConfig.instock;

  const { manage_stock, stock_quantity, stock_status, low_stock_amount = 0 } = data;

  if (manage_stock) {
    if (stock_quantity <= 0) return inventoryStatusConfig.outofstock;
    if (low_stock_amount > 0 && stock_quantity <= low_stock_amount) return inventoryStatusConfig.lowstock;
    return inventoryStatusConfig.instock;
  }

  return inventoryStatusConfig[stock_status] || inventoryStatusConfig.instock;
};

// קלאסים לתצוגת badge עם נקודה
export const getInventoryBadgeClasses = (data) => {
  const config = getInventoryConfig(data);
  return {
    container: cn("inline-flex items-center gap-2 px-2.5 py-1 rounded-md", config.bg),
    dot: cn("w-2 h-2 rounded-full", config.dot),
    text: cn("font-semibold text-sm", config.text),
  };
};

// Legacy - לתאימות אחורה
export const inventoryStyles = (row) =>
  cn(
    "max-sm:hidden ps-2 text-nowrap",
    !row.manage_stock
      ? row.stock_status === "outofstock"
        ? "text-pink-500 hover:text-pink-600"
        : row.stock_status === "instock"
          ? "text-green-500 hover:text-green-600"
          : "text-yellow-500 hover:text-yellow-600"
      : ""
  );

export const convertInventory = (status) => {
  return inventoryStatusConfig[status]?.label || status;
};