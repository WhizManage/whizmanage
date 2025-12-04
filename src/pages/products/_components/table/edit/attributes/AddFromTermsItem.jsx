import { CommandItem } from "@components/ui/command";
import { Check } from "lucide-react";
import { cn } from "@heroui/react";

const AddFromTermsItem = ({ term, onSelect, isSelected }) => {
  return (
    <CommandItem
      onSelect={onSelect}
      className="cursor-pointer dark:hover:bg-slate-700 flex items-center"
    >
      <Check
        className={cn(
          "mr-2 h-4 w-4",
          isSelected ? "opacity-100" : "opacity-0"
        )}
      />
      <span>{term.name}</span>
    </CommandItem>
  );
};

export default AddFromTermsItem;