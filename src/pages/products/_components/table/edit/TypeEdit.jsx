import Button from "@components/ui/button";
import { ExternalLink, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { postApi } from "/src/services/services";
import { __ } from '@wordpress/i18n';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectLabel,
  SelectGroup,
} from "@/components/ui/select";
import EditGrouped from "./EditGrouped";
import ExternalProductEdit from "./ExternalProductEdit";
import { useProductsContext } from "@/context/ProductsContext";
import { confirm } from "@components/CustomConfirm";
import ProBadge from "../../../../../components/nextUI/ProBadge";

const TypeEdit = ({ row }) => {
  const [value, setValue] = useState(row.original.type);
  const { isTableImport } = useProductsContext();
   
  const originalValue = row.original.type;

  const handleChange = async (newType) => {
    if (
      newType === "simple" &&
      value === "variable" &&
      row.original.has_options === true
    ) {
      const isConfirmed = await confirm({
        title: __("Delete Product Variations", "whizmanage"),
        message: __(
          "Please confirm that you understand deleting the product variations is irreversible and cannot be undone. This action will permanently remove all variations associated with this product from the system.",
          "whizmanage"
        ),
        confirmText: __("Delete Variations", "whizmanage"),
        cancelText: __("Cancel", "whizmanage"),
      });

      if (!isConfirmed) {
        setValue(originalValue); // Revert back if not confirmed
        return;
      }
    }

    setValue(newType);
    row.original.type = newType;

    const data = {
      type: newType,
    };

    if (newType != "variable") {
      return;
    }

    if (isTableImport) {
      return;
    }

    try {
      await postApi(
        `${window.siteUrl}/wp-json/wc/v3/products/${row.original.id}`,
        data
      );
    } catch (error) {
      setValue(originalValue);
      toast(
        <div className="p-4 dark:bg-slate-800 w-full h-full dark:text-slate-300 !border-l-4 !border-l-red-500 rounded-md flex gap-4 items-center justify-start">
          <XCircle className="w-5 h-5 text-red-500" />
          {error?.response?.data?.message || error || "Unknown error occurred"}
        </div>,
        { duration: 5000 }
      );
    }
  };

  return (
    <>
      {row.original.type ? (
        <div className="flex gap-2">
          <Select
            value={value}
            onValueChange={(newValue) => handleChange(newValue)}
          >
            <SelectTrigger className="h-8 w-fit">
              <SelectValue placeholder={__(value, "whizmanage")} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>{__("Product Type", "whizmanage")}</SelectLabel>
                <SelectItem value="simple">{__("Simple product", "whizmanage")}</SelectItem>
                <SelectItem value="grouped">{__("Grouped product", "whizmanage")}</SelectItem>
                <SelectItem value="external">
                  {__("External/Affiliate product", "whizmanage")}
                </SelectItem>
                <SelectItem value="variable">
                  {__("Variable product", "whizmanage")}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          {(() => {
            switch (value) {
              case "variable":
                if (isTableImport) {
                  return <div></div>;
                }
                return <ProBadge/>;
              case "grouped":
                if (isTableImport) {
                  return <div></div>;
                }
                return <EditGrouped row={row} />;
              case "external":
                return <ExternalProductEdit row={row} />;
              default:
                return null;
            }
          })()}
        </div>
      ) : (
        <>{__("Variant", "whizmanage")}</>
      )}
    </>
  );
};

export default TypeEdit;
