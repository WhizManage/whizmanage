// src/components/table/toolbar/actions/bulk-edit/SelectedRows.jsx

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@components/ui/command";
import CustomTooltip from "@components/ui/nextUI/Tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/ui/popover";
import { Chip, cn } from "@heroui/react";
import { Check, Pencil } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
 import { __ } from "@wordpress/i18n";

const SelectedRows = ({ selectedRows = [], store, entityName = "items" }) => {
  const [open, setOpen] = useState(false);
  const popupRef = useRef(null);
   

  const getRowDisplayName = (row) => {
    const original = row?.original || row;
    return (
      original?.name ||
      original?.title ||
      original?.code ||
      original?.product_name ||
      original?.order_number ||
      original?.customer_name ||
      `${entityName} #${original?.id || "?"}`
    );
  };

  const handleSelectRow = (row) => {
    const id = String(row.id ?? row?.original?.id);
    if (!id) return;

    // טוגל בחירה ב־store
    store?.setRowSelection?.((prev = {}) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // סגירת פופאבר בלחיצה בחוץ
  const handleClickOutside = (e) => {
    if (popupRef.current && !popupRef.current.contains(e.target))
      setOpen(false);
  };
  useEffect(() => {
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // ✅ שיפור: useMemo רק לפי אורך המערך
  const allRows = useMemo(() => {
    const data = Array.isArray(store?.data) ? store.data : [];
    return data.map((it) => ({ id: String(it.id), original: it }));
  }, [store?.data?.length]);

  return (
    <div className="w-full">
      <div ref={popupRef} className="flex gap-2 items-center">
        <Popover open={open} onOpenChange={setOpen}>
          <CustomTooltip title={__("Change rows", "whizmanage")}>
            <PopoverTrigger asChild>
              <button
                onClick={() => setOpen((v) => !v)}
                className="size-7 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-400 text-slate-400 dark:hover:text-slate-200 flex justify-center items-center cursor-pointer"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </PopoverTrigger>
          </CustomTooltip>

          <PopoverContent className="p-0 dark:bg-slate-800" align="start">
            <Command className="dark:bg-slate-800">
              <CommandInput
                placeholder={__(`Find ${entityName}`, "whizmanage")}
                className="!border-none !ring-0"
              />
              <CommandList>
                <CommandEmpty>{__("No results found.", "whizmanage")}</CommandEmpty>
                <CommandGroup heading={__(`Available ${entityName}`, "whizmanage")}>
                  {allRows.length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-300">
                      {__(`No ${entityName} available`, "whizmanage")}
                    </div>
                  ) : (
                    allRows.map((row) => {
                      const isSelected = selectedRows.some(
                        (s) => String(s.id) === String(row.id)
                      );
                      return (
                        <CommandItem
                          key={row.id}
                          className="cursor-pointer dark:hover:bg-slate-700 group/item flex gap-2 justify-between min-h-9"
                          onSelect={() => handleSelectRow(row)}
                        >
                          <Check
                            className={cn(
                              "mr-2 size-4",
                              isSelected ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="flex-1">
                            {getRowDisplayName(row)}
                          </span>
                          <span className="sr-only">{row.original?.id}</span>
                        </CommandItem>
                      );
                    })
                  )}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <h2 className="text-start text-xl dark:text-slate-300 p-2 font-semibold">
          {__("Selected rows", "whizmanage")}:
        </h2>
      </div>
      <div className="flex w-full flex-wrap gap-2 p-2 relative !min-h-10 border rounded-lg dark:shadow-xl border-neutral-200 dark:border-slate-700">
        {selectedRows.length === 0 ? (
          <div className="w-full p-2 text-center text-sm text-slate-500 dark:text-slate-300">
            {__(`No ${entityName} selected`, "whizmanage")}
          </div>
        ) : (
          selectedRows.map((item) => (
            <Chip
              key={item.id}
              onClose={() => handleSelectRow(item)}
              variant="flat"
              classNames={{
                base: "bg-gradient-to-br from-fuchsia-50 dark:from-slate-800 to-fuchsia-200 dark:to-slate-700 opacity-100",
                content: "text-fuchsia-600 dark:text-slate-300",
                closeButton: "text-fuchsia-600 dark:text-slate-300",
              }}
            >
              {getRowDisplayName(item)}
            </Chip>
          ))
        )}
      </div>
    </div>
  );
};

export default SelectedRows;
