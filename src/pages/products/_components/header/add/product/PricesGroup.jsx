import { IconBadge } from "@components/IconBadge";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import { CircleDollarSign } from "lucide-react";
import SaleDurationEditor from "../../../table/edit/SaleDurationEditor";
import { __ } from '@wordpress/i18n';

const PricesGroup = ({ register, errors, updateValue }) => {
   
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-x-2">
        <IconBadge icon={CircleDollarSign} />
        <h2 className="text-xl dark:text-gray-400">{__("Product prices", "whizmanage")}</h2>
      </div>
      <div className="grid w-full gap-1.5">
        <Label htmlFor="price">{__("Regular price", "whizmanage")}</Label>
        <div className="relative h-10 border rounded-lg flex rtl:flex-row-reverse items-center px-1 dark:bg-slate-700">
          <span
            className="text-gray-400 text-base pl-2 rtl:!px-2 rtl:!pt-2.5"
            dangerouslySetInnerHTML={{ __html: window.currency }}
          />
          <Input
            type="number"
            id="price"
            placeholder="0.00"
            min={0}
            className="!border-none !ring-0 dark:!text-slate-300 invalid:border-red-500 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0"
            {...register("regular_price", {
              min: {
                value: 0,
                message: __("Regular price cannot be less than 0", "whizmanage"),
              },
            })}
          />
        </div>
        {errors.regular_price && (
          <p className="text-red-500 dark:text-pink-500 text-sm px-2">
            {errors.regular_price.message}
          </p>
        )}
      </div>
      <div className="grid w-full gap-1.5">
        <Label htmlFor="sale_price">{__("Sale price (optional)", "whizmanage")}</Label>
        <div className="relative h-10 border rounded-lg flex rtl:flex-row-reverse items-center px-1 dark:bg-slate-700">
          <span
            className="text-gray-400 text-base pl-2 rtl:!px-2 rtl:!pt-2.5"
            dangerouslySetInnerHTML={{ __html: window.currency }}
          />
          <Input
            type="number"
            id="sale_price"
            placeholder="0.00"
            min={0}
            className="!border-none !ring-0 dark:!text-slate-300 invalid:border-red-500 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0"
            {...register("sale_price", {
              min: {
                value: 0,
                message: __("Sale price cannot be less than 0", "whizmanage"),
              },
            })}
          />
        </div>
        {errors.sale_price && (
          <p className="text-red-500 dark:text-pink-500 text-sm px-2">
            {errors.sale_price.message}
          </p>
        )}
      </div>
      <SaleDurationEditor updateValue={updateValue} />
    </div>
  );
};

export default PricesGroup;
