import Button from "@components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu";
import { cn } from "@heroui/react";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { __ } from '@wordpress/i18n';
import GenerateRowItem from "./GenerateRowItem";
import SelectGlobalAttribute from "./SelectGlobalAttribute";
import SelectProductAttribute from "./SelectProductAttribute";

const GenerateVariations = ({
  ref1,
  ref2,
  ref3,
  product,
  setNewVariations,
  isSimple,
  selectedAttributes,
  setSelectedAttributes,
  setAllAttributes,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
   

  useEffect(() => {
    const newSelectedAttributes = selectedAttributes?.map((attr) => ({
      ...attr,
      options: [],
    }));
    setSelectedAttributes(newSelectedAttributes);
  }, []);

  const generateVariations = () => {
    const attributes = selectedAttributes || [];
    const variations = [];

    const generateCombinations = (currentIndex, combination) => {
      if (currentIndex === attributes.length) {
        variations.push({ attributes: combination });
        return;
      }

      const attribute = attributes[currentIndex];
      const options = attribute.options;

      // אם אין אופציות, שלח את התכונה עם רשימה ריקה
      if (options.length === 0) {
        const optionDetail = {
          name: attribute.id === 0 ? attribute.name : `pa_${attribute.name}`,
        };
        generateCombinations(currentIndex + 1, [...combination, optionDetail]);
        return;
      }

      // אם יש אופציות, טפל בכל אחת מהן
      for (const option of options) {
        const optionDetail = {
          name: attribute.id === 0 ? attribute.name : `${attribute.slug}`,
          option: option,
        };
        generateCombinations(currentIndex + 1, [...combination, optionDetail]);
      }
    };

    generateCombinations(0, []);
    setNewVariations(variations);
  };

  return (
    <div className="w-full flex flex-col gap-4 items-center justify-center">
      <div className="w-full" ref={ref1}>
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
              <th className=" p-2 text-start font-extralight" ref={ref2}>
                {__("Options", "whizmanage")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y-1 dark:divide-slate-700">
            {selectedAttributes?.map((attribute, i) => (
              <GenerateRowItem
                index={i}
                attribute={attribute}
                product={product}
                selectedAttributes={selectedAttributes}
                setSelectedAttributes={setSelectedAttributes}
                setAllAttributes={setAllAttributes}
                ref2={ref2}
              />
            ))}
          </tbody>
        </table>
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen} dir={window.user_local === "he_IL" ? "rtl" : "ltr"}>
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
            align="start"
          >
            <DropdownMenuLabel className="rtl:text-right">
              {__("Attribute Type", "whizmanage")}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <SelectGlobalAttribute
              variationMood={true}
              selectedAttributes={selectedAttributes}
              setSelectedAttributes={setSelectedAttributes}
              setDropdownOpen={setDropdownOpen}
            />
            <SelectProductAttribute
              variationMood={true}
              product={product}
              selectedAttributes={selectedAttributes}
              setSelectedAttributes={setSelectedAttributes}
              setDropdownOpen={setDropdownOpen}
              isSimple={false}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {!isSimple && (
        <Button
          ref={ref3}
          variant="outline"
          onClick={generateVariations}
          disabled={selectedAttributes?.length < 1}
        >
          {__("Combine & Generate", "whizmanage")}
        </Button>
      )}
    </div>
  );
};

export default GenerateVariations;
