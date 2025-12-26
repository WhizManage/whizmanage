// src/components/pages/table/products/components/SoldIndividuallyCell.jsx
import i18n from "@/i18n";
import { Switch, cn } from "@heroui/react";
import { useState, useEffect } from "react";

const SoldIndividuallyCell = ({ row, table, onUpdate, __ }) => {
  const isRTL = window?.document?.documentElement?.dir === "rtl";
  const store = table?.options?.meta?.store;
  const [isSoldIndividually, setIsSoldIndividually] = useState(
    row.original.sold_individually === true
  );

  useEffect(() => {
    setIsSoldIndividually(row.original.sold_individually === true);
  }, [row.original.sold_individually]);

  const handleToggle = async (newValue) => {
    const prevValue = isSoldIndividually;
    setIsSoldIndividually(newValue);
    try {
      await onUpdate(
        row.original.id,
        "sold_individually",
        newValue,
        row.original
      );
    } catch (error) {
      console.error("Failed to update sold_individually:", error);

      setIsSoldIndividually(prevValue);

      // // אפשר להשאיר rollback ל-store בלי היסטוריה אם אתה רוצה
      // if (store?.updateItemWithHistory) {
      //   store.updateItemWithHistory(
      //     row.original.id,
      //     { sold_individually: prevValue },
      //     false // ⚠️ בלי היסטוריה
      //   );
      // }
    }
  };

  return (
    <div className="flex items-center justify-center h-full w-full px-2">
      <Switch
        size="sm"
        isSelected={isSoldIndividually}
        onValueChange={handleToggle}
        aria-label={
          isSoldIndividually
            ? __("Sold Individually", "whizmanage")
            : __("Multiple Purchases Allowed", "whizmanage")
        }
        color="primary"
        classNames={{
          base: "inline-flex [&_input]:hidden [&_input[type=checkbox]]:hidden",
          wrapper: "p-0 h-5 overflow-visible dark:bg-slate-500",
          thumb: cn(
            "w-5 h-5 shadow-lg",
            isRTL
              ? "group-data-[selected=true]:mr-5"
              : "group-data-[selected=true]:ml-5"
          ),
        }}
      />
    </div>
  );
};

export default SoldIndividuallyCell;