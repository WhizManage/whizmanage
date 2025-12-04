import CustomTooltip from "@components/nextUI/Tooltip";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/ui/popover";
import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { putApi } from "/src/services/services";
import { __ } from '@wordpress/i18n';

const SelectProductOptions = ({
  product,
  attribute,
  index,
  selectedAttributes,
  setSelectedAttributes,
}) => {
  const [open, setOpen] = useState(false);
  const [newOption, setNewOption] = useState("");
   

  const addNewOption = async () => {
    if (!newOption.trim()) return;

    const newAttributes = [...selectedAttributes];
    newAttributes[index] = {
      ...newAttributes[index],
      options: [...newAttributes[index].options, newOption.trim()]
    };

    try {
      const response = await putApi(
        `${window.siteUrl}/wp-json/wc/v3/products/${product.id}`,
        {
          attributes: newAttributes
        }
      );

      setSelectedAttributes(newAttributes);
      product.attributes = response.data.attributes;
      setNewOption("");
      setOpen(false);
      
      toast.success(t("Option added successfully"));
    } catch (error) {
      toast.error(error?.response?.data?.message || __("Failed to add option", "whizmanage"));
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <CustomTooltip title={__("Add option", "whizmanage")}>
        <PopoverTrigger asChild>
          <div className="h-6 w-6 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-400 text-slate-400 dar:hover:text-slate-200 flex justify-center items-center cursor-pointer">
            <Plus className="w-3 h-3" />
          </div>
        </PopoverTrigger>
      </CustomTooltip>
      <PopoverContent className="w-auto p-0 dark:bg-slate-800">
        <div className="flex p-2 gap-2">
          <Input
            value={newOption}
            onChange={(e) => setNewOption(e.target.value)}
            placeholder={__("New option", "whizmanage")}
            className="!border-none dark:!text-slate-300 !ring-0 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0 px-4"
          />
          <Button
            variant="outline"
            className="h-8"
            onClick={addNewOption}
            disabled={!newOption.trim()}
          >
            {__("Add", "whizmanage")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default SelectProductOptions;