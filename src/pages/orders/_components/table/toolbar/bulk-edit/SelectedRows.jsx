import CustomTooltip from "@components/nextUI/Tooltip";
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
import { Check, Info, Pencil, Undo2 } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { __ } from '@wordpress/i18n';

const SelectedRows = ({ selectedRows, setSelectedRows, table }) => {
  const [open, setOpen] = useState(false);
  const popupRef = useRef(null);
   
  // console.log(selectedRows);

  const handleSelectRow = (row) => {
    setSelectedRows((currentRows) => {
      const rowExists = currentRows.find(
        (selectedRow) => selectedRow.id === row.id
      );
      if (rowExists) {
        // השורה כבר נבחרה, מסירים אותה מהמערך
        return currentRows.filter((selectedRow) => selectedRow.id !== row.id);
      } else {
        // השורה לא נבחרה, מוסיפים אותה למערך
        return [...currentRows, row];
      }
    });
  };

  const handleClickOutside = (event) => {
    if (popupRef.current && !popupRef.current.contains(event.target)) {
      setOpen(false);
    }
  };

  useEffect(() => {
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);
  return (
    <div className="w-full">
      <div ref={popupRef} className="flex gap-2 items-center">
        <Popover open={open}>
          <CustomTooltip title={__("Change rows", "whizmanage")}>
            <PopoverTrigger asChild>
              <button
                onClick={() => setOpen(!open)}
                className="h-6 w-6 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-400 text-slate-400 dark:hover:text-slate-200 flex justify-center items-center cursor-pointer"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </PopoverTrigger>
          </CustomTooltip>
          <PopoverContent className="p-0 dark:bg-slate-800" align="start">
            <Command className="dark:bg-slate-800">
              <CommandInput
                placeholder={__(`Find product`, "whizmanage")}
                className="!border-none !ring-0"
              />
              <CommandList>
                <CommandEmpty>{__("No results found.", "whizmanage")}</CommandEmpty>
                <CommandGroup heading={__(`Orders exist`, "whizmanage")}>
                  {table.getRowModel().rows.map((row, i) => {
                    return (
                      <CommandItem
                        className="cursor-pointer dark:hover:bg-slate-700 group/item flex gap-2 justify-between min-h-9"
                        key={row.id}
                        onSelect={() => {
                          // setOpen(true);
                          handleSelectRow(row);
                        }}
                      >
                        <>
                          <Check
                            className={cn(
                              "mr-2 size-4",
                              selectedRows.find(
                                (selectedRow) => selectedRow.id === row.id
                              )
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <span className="sr-only">{row.original.id}</span>
                          {row.original.description !== "" && (
                            <HoverCard openDelay={300}>
                              <HoverCardTrigger asChild>
                                <Info className="size-4 cursor-pointer text-muted-foreground" />
                              </HoverCardTrigger>
                              <HoverCardContent className="w-80">
                                <p>{row.original.description}</p>
                              </HoverCardContent>
                            </HoverCard>
                          )}
                        </>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <h2 className="text-start text-xl dark:text-gray-300 p-2 font-semibold">
          {__("Selected rows", "whizmanage")}:
        </h2>
      </div>
      <div className="flex w-full flex-wrap gap-2 p-2 relative !min-h-10 border rounded-lg dark:shadow-xl border-neutral-200 dark:border-slate-700">
        {selectedRows.map((item, index) => (
          <Chip
            key={item.id}
            onClose={() => handleSelectRow(item)}
            variant="flat"
            classNames={{
              base: "bg-gradient-to-br from-fuchsia-50 dark:from-slate-700 to-fuchsia-200 dark:to-slate-600 opacity-100",
              content: "text-fuchsia-600 dark:text-slate-300",
              closeButton: "text-fuchsia-600 dark:text-slate-300",
            }}
          >
            {item.original.id}
          </Chip>
        ))}
      </div>
    </div>
  );
};

export default SelectedRows;
