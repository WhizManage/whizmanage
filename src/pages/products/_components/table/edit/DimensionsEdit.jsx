import { Input } from "@components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select";
import { useEffect, useState } from "react";
import { __ } from '@wordpress/i18n';

const DimensionsEdit = ({ row }) => {
  const [currentDimension, setCurrentDimension] = useState("width");
  const [inputValue, setInputValue] = useState("");
   
  useEffect(() => {
    setInputValue(row.original.dimensions[currentDimension] || "");
  }, [currentDimension, row.original.dimensions]);

  const handleInputChange = (value) => {
    setInputValue(value);
    row.original.dimensions[currentDimension] = value;
  };

  return (
    <div className="relative h-8 min-w-48 rounded-md border border-input bg-background dark:bg-slate-700 py-1 text-sm ring-offset-background overflow-hidden">
      <Input
        type="text"
        onChange={(e) => handleInputChange(e.target.value)}
        value={inputValue}
        placeholder={__("Not defined", "whizmanage")}
        onFocus={(event) => event.target.select()}
        className="block border-0 flex-1 invalid:border-red-500 dark:!text-slate-300 rtl:mr-auto pr-20 rtl:pr-24 !border-none !ring-0 !ring-offset-0 w-24 rtl:w-16 -mt-1 h-fit !py-0 placeholder:text-slate-300 dark:placeholder:text-slate-500"
      />
      <div className="absolute inset-y-0 right-0 flex items-center">
        <Select
          value={currentDimension}
          onValueChange={(value) => {
            setCurrentDimension(value);
          }}
        >
          <SelectTrigger className="h-full rounded-md border-0 bg-transparent py-0 pl-2 !text-inherit hover:!text-inherit !border-none !ring-0 !ring-offset-0 sm:text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="width">{__("Width", "whizmanage")}</SelectItem>
            <SelectItem value="height">{__("Height", "whizmanage")}</SelectItem>
            <SelectItem value="length">{__("Length", "whizmanage")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default DimensionsEdit;
