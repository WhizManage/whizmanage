import { Input } from "@components/ui/input";
import { __ } from '@wordpress/i18n';

const PriceEdit = ({ row }) => {
   
  
  return (
    <div className="relative flex h-8 min-w-48 rtl:min-w-60 rounded-md border border-input bg-background dark:bg-slate-700 pl-4 rtl:pl-0 rtl:pr-4 py-1 text-sm ring-offset-background overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 left-0 rtl:right-0 flex items-center pl-3 rtl:pl-0 rtl:pr-3">
        <span
          className="text-gray-400 sm:text-sm"
          dangerouslySetInnerHTML={{ __html: window.currency }}
        />
      </div>
      <Input
        type={window.user_local == "he_IL" ? "text" : "number"}
        min={0}
        onChange={(e) => (row.original.regular_price = e.target.value)}
        defaultValue={row.original.regular_price}
        className="block border-0 pl-2 rtl:pl-0 dir flex-1 invalid:border-red-500 dark:!text-slate-300 !border-none !ring-0 !ring-offset-0 w-24 max-w-24 rtl:w-20 -mt-1 h-fit !py-0 placeholder:text-slate-300 dark:placeholder:text-slate-500"
        placeholder={__("No price", "whizmanage")}
        onFocus={(event) => event.target.select()}
      />
      <div className="relative rtl:mr-auto">
        <div className="pointer-events-none absolute inset-y-0 left-0 rtl:left-20 flex items-center gap-2">
          <span className="">{__("Sale", "whizmanage")}:</span>
          <span
            className="text-gray-400 sm:text-sm"
            dangerouslySetInnerHTML={{ __html: window.currency }}
          />
        </div>
        <Input
          type={window.user_local == "he_IL" ? "text" : "number"}
          min={0}
          onChange={(e) => (row.original.sale_price = e.target.value)}
          defaultValue={row.original.sale_price}
          className="block border-0 !ml-10 rtl:!ml-0 invalid:border-red-500 dark:!text-slate-300 !border-none !ring-0 rtl:!left-0 !ring-offset-0 w-24 rtl:w-20 -mt-1 h-fit !py-0 placeholder:text-slate-300 dark:placeholder:text-slate-500"
          placeholder={__("No price", "whizmanage")}
          onFocus={(event) => event.target.select()}
        />
      </div>
      {/* <div className="absolute inset-y-0 right-0 flex items-center">
        <Select
          defaultValue="price"
          onValueChange={() => {
            setIsSalePrice((isSalePrice) => !isSalePrice);
          }}
        >
          <SelectTrigger className="h-full rounded-md border-0 bg-transparent py-0 pl-2 !text-inherit hover:!text-inherit !border-none !ring-0 !ring-offset-0 sm:text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="price">Price</SelectItem>
            <SelectItem value="sale_price">Sale price</SelectItem>
          </SelectContent>
        </Select>
      </div> */}
    </div>
  );
};

export default PriceEdit;
