// src/components/table/import/CustomFieldsSelector.jsx

import { useState, useMemo, useEffect } from "react";
 import { __ } from "@wordpress/i18n";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, X, CheckSquare } from "lucide-react";
import { Chip } from "@heroui/react";

const CustomFieldsSelector = ({ selectedFields = [], onChange, config }) => {
   
  const [isOpen, setIsOpen] = useState(false);
  const [availableFields, setAvailableFields] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // ⭐ טעינת השדות המותאמים – קודם מ-config אם יש, אחרת מ-window.WhizManageCustomFields (כמו בקוד הישן)
  useEffect(() => {
    setIsLoading(true);

    try {
      let fields = [];

      // אם הועבר משהו מקונפיגורציה – תעדיף אותו
      if (config?.availableFields && Array.isArray(config.availableFields)) {
        fields = config.availableFields;
      } else if (config?.customFields && Array.isArray(config.customFields)) {
        fields = config.customFields;
      } else if (typeof window !== "undefined" && Array.isArray(window?.WhizManageCustomFields)) {
        // כמו בקוד הישן:
        // window.WhizManageCustomFields = [{ key, label, source }, ...]
        fields = window.WhizManageCustomFields;
      }

      // נוודא פורמט אחיד
      const normalized = fields.map((f) => ({
        key: f.key,
        label: f.label || f.key,
        source: f.source || "",
      }));

      setAvailableFields(normalized);
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  // ⭐ בחירה / ביטול בחירה של שדה
  const handleSelect = (fieldKey) => {
    const newSelection = selectedFields.includes(fieldKey)
      ? selectedFields.filter((key) => key !== fieldKey)
      : [...selectedFields, fieldKey];

    onChange(newSelection);
  };

  const clearSelection = () => {
    onChange([]);
  };

  const handleSelectAll = () => {
    const allKeys = availableFields.map((f) => f.key);
    onChange(allKeys);
  };

  const isAllSelected =
    availableFields.length > 0 &&
    selectedFields.length === availableFields.length;

  // ⭐ סינון לפי חיפוש – כמו בקוד הישן
  const filteredFields = useMemo(() => {
    if (!searchValue.trim()) return availableFields;

    const s = searchValue.toLowerCase();
    return availableFields.filter(
      (f) =>
        f.label?.toLowerCase().includes(s) ||
        f.key?.toLowerCase().includes(s) ||
        f.source?.toLowerCase().includes(s)
    );
  }, [availableFields, searchValue]);

  // הסרת שדה מהרשימה
  const handleRemoveField = (fieldKey) => {
    onChange(selectedFields.filter((key) => key !== fieldKey));
  };

  // קבלת נתוני שדות נבחרים
  const selectedFieldsData = useMemo(() => {
    return selectedFields.map((fieldKey) => {
      const field = availableFields.find((f) => f.key === fieldKey);
      return {
        key: fieldKey,
        label: field?.label || fieldKey,
      };
    });
  }, [selectedFields, availableFields]);

  return (
    <div className="w-full flex flex-col gap-2">
      {/* תצוגת השדות הנבחרים עם Chips */}
      {selectedFieldsData.length > 0 && (
        <div className="flex flex-wrap gap-2 min-h-10 items-center dark:bg-slate-700 rounded-lg px-2 py-2 border dark:border-slate-600">
          {selectedFieldsData.map((field) => (
            <Chip
              key={field.key}
              onClose={() => handleRemoveField(field.key)}
              variant="flat"
              classNames={{
                base: "bg-gradient-to-br from-fuchsia-50 dark:from-slate-800 to-fuchsia-200 dark:to-slate-700",
                content: "text-fuchsia-600 dark:text-slate-300",
                closeButton: "text-fuchsia-600 dark:text-slate-300",
              }}
            >
              {field.label?.replace(/\\/g, "").replace(/"/g, "''")}
            </Chip>
          ))}
        </div>
      )}
      {/* כפתור לפתיחת הבחירה */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "h-10 w-full justify-between",
              "dark:bg-slate-700 dark:border-slate-600 dark:hover:!bg-slate-600"
            )}
          >
            <div className="flex-grow text-start overflow-hidden flex items-center">
              {selectedFields.length === 0
                ? __("Select custom fields", "whizmanage")
                : `${selectedFields.length} ${__("Custom fields selected", "whizmanage")}`}
            </div>
            <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

      <PopoverContent
        className="p-0 dark:bg-slate-800 w-[350px]"
        align="start"
      >
        <Command className="dark:bg-slate-800">
          <div className="!border-b dark:!border-slate-700 p-1">
          <CommandInput
            placeholder={__("Find custom fields", "whizmanage")}
            className="!border-none !ring-0 h-8 w-full"
            value={searchValue}
            onValueChange={setSearchValue}
          />
          </div>

          <CommandList>
            {/* 🔼 בר עליון – Select all + Clear selection + Counter */}
            <div className="px-2 py-1 flex justify-between items-center border-b dark:border-slate-700">
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`text-xs gap-2 h-4 ${isAllSelected || availableFields.length === 0 ? "invisible" : ""}`}
                  onClick={handleSelectAll}
                >
                  <CheckSquare className="h-3 w-3" />
                  {__("Select all", "whizmanage")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`text-xs text-red-500 h-4 ${selectedFields.length === 0 ? "invisible" : ""}`}
                  onClick={clearSelection}
                >
                  <X className="h-3 w-3 mr-1" />
                  {__("Clear selection", "whizmanage")}
                </Button>
              </div>
              <span className="text-xs text-slate-500 h-4">
                {selectedFields.length} {__("Selected", "whizmanage")}
              </span>
            </div>

            <CommandEmpty>
              {isLoading ? __("Loading...", "whizmanage") : __("No custom fields found.", "whizmanage")}
            </CommandEmpty>

            <CommandGroup heading={__("Custom Fields", "whizmanage")}>
              {filteredFields.map((field) => (
                <CommandItem
                  key={field.key}
                  onSelect={() => handleSelect(field.key)}
                  className="cursor-pointer dark:hover:bg-slate-700"
                >
                  <div className="flex items-center w-full gap-2">
                    <div
                      className={cn(
                        "mr-2 h-4 w-4 rounded border flex items-center justify-center",
                        selectedFields.includes(field.key)
                          ? "bg-fuchsia-600 border-fuchsia-600 text-white"
                          : "opacity-50 border-slate-500 dark:bg-slate-800"
                      )}
                    >
                      {selectedFields.includes(field.key) && (
                        <Check className="h-3 w-3" />
                      )}
                    </div>
                    <span className="truncate flex-grow">
                      {field.label
                        ?.replace(/\\/g, "")
                        .replace(/"/g, "''")}
                    </span>
                    {field.source && (
                      <span className="text-xs text-slate-500 shrink-0">
                        ({field.source})
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
      </Popover>
    </div>
  );
};

export default CustomFieldsSelector;
