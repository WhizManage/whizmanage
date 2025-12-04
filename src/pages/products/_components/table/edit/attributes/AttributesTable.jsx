import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu";
import { cn } from "@heroui/react";
import { Plus } from "lucide-react";
import { useState } from "react";
import { __ } from '@wordpress/i18n';

import AttributeRowItem from "./AttributeRowItem";

const AttributesTable = ({
  product,
  selectedAttributes,
  setSelectedAttributes,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
   
  
  return (
    <div className="w-full flex flex-col gap-4 items-center justify-center">
      <div className="w-full">
        <table className="table-fixed w-full">
          <thead className="border-b dark:border-b-slate-700">
            <tr className="font-semibold">
              <th className="w-10 p-2 text-start font-extralight"></th>
              <th className="w-32 p-2 text-start font-extralight">
                {__("Attribute", "whizmanage")}
              </th>
              <th className="w-32 p-2 text-start font-extralight">
                {__("Type", "whizmanage")}
              </th>
              <th className="w-32 p-2 text-start font-extralight">
                {__("For variations", "whizmanage")}
              </th>
              <th className=" p-2 text-start font-extralight">
                {__("Options", "whizmanage")}
              </th>
            </tr>
          </thead>

          <tbody className="divide-y-1 dark:divide-slate-700">
            {selectedAttributes?.map((attribute, i) => (
              <AttributeRowItem
                index={i}
                attribute={attribute}
                product={product}
                selectedAttributes={selectedAttributes}
                setSelectedAttributes={setSelectedAttributes}
                isSimple={true}
              />
            ))}
          </tbody>
        </table>
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger className="w-full">
            <div
              className={cn(
                "hover:bg-gray-100 dark:hover:bg-gray-800 w-full px-3 py-3 text-slate-300 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 dark:border-t-slate-700 flex gap-4 transition-all cursor-pointer",
                selectedAttributes?.length > 0 ? "border-t-1" : "border-t-0"
              )}
            >
              <Plus className="w-4 h-4" /> {__("Add attribute", "whizmanage")}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align={window.user_local == "he_IL" ? "end" : "start"}
          >
            <DropdownMenuLabel>{__("Attribute Type", "whizmanage")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <SelectGlobalAttribute
              variationMood={false}
              selectedAttributes={selectedAttributes}
              setSelectedAttributes={setSelectedAttributes}
              setDropdownOpen={setDropdownOpen}
            />
            <SelectProductAttribute
              variationMood={false}
              product={product}
              selectedAttributes={selectedAttributes}
              setSelectedAttributes={setSelectedAttributes}
              setDropdownOpen={setDropdownOpen}
              isSimple={true}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default AttributesTable;
