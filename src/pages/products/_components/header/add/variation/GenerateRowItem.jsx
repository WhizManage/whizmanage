import CustomTooltip from "@components/nextUI/Tooltip";
import { Switch } from "@components/ui/switch";
import { Chip } from "@heroui/react";
import { Minus } from "lucide-react";
import { forwardRef } from "react";
import { __ } from '@wordpress/i18n';
import SelectGlobalOptions from "./SelectGlobalOptions";
import SelectProductOptions from "./SelectProductOptions";
import { putApi } from "/src/services/services";

const GenerateRowItem = forwardRef(
  (
    {
      index,
      attribute,
      product,
      selectedAttributes,
      setSelectedAttributes,
      ref2,
      isSimple,
      setAllAttributes,
    },
    ref
  ) => {
    
    const isRTL = document.documentElement.dir === 'rtl';
    const handleClose = (itemToRemove) => {
      const newSelectedAttributes = [...selectedAttributes];
      if (newSelectedAttributes[index]) {
        newSelectedAttributes[index] = {
          ...newSelectedAttributes[index],
          options: newSelectedAttributes[index].options.filter((option) =>
            option.name ? option.name !== itemToRemove : option !== itemToRemove
          ),
        };
      }
      setSelectedAttributes(newSelectedAttributes);
    };

    const handleRemoveAttribute = async () => {
      const filteredAttributes = selectedAttributes.filter(
        (_, attrIndex) => attrIndex !== index
      );

      setAllAttributes((prev) =>
        prev.filter((_, attrIndex) => attrIndex !== index)
      );
      setSelectedAttributes(filteredAttributes);

      const url = `${window.siteUrl}/wp-json/wc/v3/products/${product.id}`;
      const itemData = {
        attributes: product.attributes.filter(
          (_, attrIndex) => attrIndex !== index
        ),
      };

      try {
        const response = await putApi(url, itemData);
        product.attributes = response.data.attributes;
      } catch (error) {
        console.error(
          "Error editing options",
          error?.response?.data?.message || error || "Unknown error occurred"
        );
      }
    };

    return (
      <tr className="hover:bg-gray-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all">
        <td className=" px-2">
          <CustomTooltip title={__("Delete attribute", "whizmanage")}>
            <div
              className="h-6 w-6 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-400 text-slate-400 dar:hover:text-slate-200 flex justify-center items-center cursor-pointer"
              onClick={handleRemoveAttribute}
            >
              <Minus className="w-4 h-4 text-fuchsia-600" />
            </div>
          </CustomTooltip>
        </td>
        <td className=" px-2">{attribute.name}</td>
        <td className=" px-2">
          {attribute.id == 0 ? __("Product", "whizmanage") : __("Global", "whizmanage")}
        </td>
        <td className="px-2">
          <Switch
            dir={isRTL ? "rtl" : "ltr"}
            checked={attribute.variation === true}
            onCheckedChange={(isSelected) => {
              const newSelectedAttributes = [...selectedAttributes];
              newSelectedAttributes[index] = {
                ...newSelectedAttributes[index],
                variation: isSelected,
              };
              setSelectedAttributes(newSelectedAttributes);
            }}
          />
        </td>
        <td className="flex gap-4 items-center px-2" ref={ref2}>
          {attribute.id == 0 ? (
            <SelectProductOptions
              product={product}
              attribute={attribute}
              index={index}
              selectedAttributes={selectedAttributes}
              setSelectedAttributes={setSelectedAttributes}
              setAllAttributes={setAllAttributes}
              generate
            />
          ) : (
            <SelectGlobalOptions
              product={product}
              attribute={attribute}
              index={index}
              selectedAttributes={selectedAttributes}
              setSelectedAttributes={setSelectedAttributes}
              setAllAttributes={setAllAttributes}
              generate
            />
          )}
          <div className="flex flex-wrap gap-2 relative min-h-10 items-center">
            {selectedAttributes[index].options.length < 1 ? (
              <span className="flex gap-1 items-center">
                <span>{__("Any", "whizmanage")}</span>
                <span>{attribute.name}</span>
              </span>
            ) : (
              selectedAttributes[index].options.map((option, index) => (
                <Chip
                  key={index}
                  onClose={() =>
                    handleClose(option.name ? option.name : option)
                  }
                  variant="flat"
                  classNames={{
                    base: "bg-gradient-to-br from-fuchsia-50 dark:from-slate-700 to-fuchsia-200 dark:to-slate-600 opacity-100",
                    content: "text-fuchsia-600 dark:text-slate-300",
                    closeButton: "text-fuchsia-600 dark:text-slate-300",
                  }}
                >
                  {option.name ? option.name : option}
                </Chip>
              ))
            )}
          </div>
        </td>
      </tr>
    );
  }
);

export default GenerateRowItem;
