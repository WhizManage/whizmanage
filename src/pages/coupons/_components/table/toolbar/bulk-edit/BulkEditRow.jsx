import { Input } from "@components/ui/input";
import { cn, DatePicker } from "@heroui/react";
import { __ } from '@wordpress/i18n';

const BulkEditRow = ({ row, handleRowChange, index }) => {
  const formatId = (id) => {
    return __(
      id.replace(/_/g, " ").replace(/\b\w/, (char) => char.toUpperCase()),
      "whizmanage"
    );
  };
   
  return (
    <tr
      className="hover:bg-gray-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all"
      key={index}
    >
      <td className="px-2 h-12 text-base capitalize-first">
        {formatId(row.id)}
      </td>
      <td className="px-2 h-12">
        {row.type === "date" ? (
          <div className="relative mx-auto h-8 w-44">
            <DatePicker
              className="[&>div]:!max-h-8 [&>div]:!min-h-8 [&>div]:!h-8 [&>div]:border [&>div]:rounded-md [&>div]:flex [&>div]:gap-0 [&>div]:items-center [&>div]:bg-white [&>div]:hover:!bg-white [&>div]:dark:!bg-slate-600 [&>div]:!font-extralight [&>div]:!text-slate-300 [&>div]:dark:!text-slate-300 !text-slate-300"
              value={row.value || undefined}
              onChange={(newDate) => {
                if (newDate) {
                  const newIsoString =
                    new Date(newDate.year, newDate.month - 1, newDate.day + 1)
                      .toISOString()
                      .split("T")[0] + "T00:00:00";
                  handleRowChange(index, "value", newIsoString);
                } else {
                  handleRowChange(index, "value", null);
                }
              }}
              classNames={{
                base: "rounded-md dark:!bg-slate-800 dark:!text-slate-300",
                inputWrapper:
                  "rounded-md !h-8 !max-h-8 !py-1 !m-0 border dark:!border-slate-800 bg-white dark:!bg-slate-700 dark:!text-slate-300",
                timeInput: "rounded-md dark:!bg-slate-800 dark:!text-slate-300",
                selectorButton:
                  "rounded-md dark:!bg-slate-700 dark:!text-slate-400",
              }}
              aria-label={formatId(row.id)}
            />
          </div>
        ) : row.type === "input" ? (
          <div className="relative mx-auto h-8 w-44 rounded-md border border-input bg-background dark:bg-slate-600 py-1 text-sm overflow-hidden">
            <Input
              value={row.value}
              onChange={(e) => handleRowChange(index, "value", e.target.value)}
              className="h-full w-full !border-none dark:!bg-slate-600 dark:!text-slate-300 !rounded-none !border-0 !ring-0 !outline-none px-2 focus-visible:dark:!ring-offset-0 placeholder:text-slate-600 dark:placeholder:text-slate-300"
              // onFocus={(event) => event.target.select()}
              placeholder={__("No Change", "whizmanage")}
            />
          </div>
        ) : (
          <div className="flex justify-center items-center !rounded-md overflow-hidden !border-0 p-0 !border-slate-50">
            <select
              value={row.value}
              className={cn(
                "custom-select focus:!outline-none focus-visible:!outline-none capitalize dark:!bg-slate-600 dark:!text-slate-300 !border-input px-2 m-0 text-sm w-fit rtl:mr-2 py-0 focus-visible:ring-0 focus:ring-offset-0 !rounded-md",
                "h-6 min-w-44"
              )}
              onChange={(e) => handleRowChange(index, "value", e.target.value)}
            >
              {row.options.map((option) => (
                <option
                  key={option}
                  value={option}
                  className={cn(
                    "capitalize !border-input cursor-pointer font-semibold text-sm w-full !py-1 hover:border-slate-500"
                  )}
                >
                  {__(option, "whizmanage")}
                </option>
              ))}
            </select>
          </div>
        )}
      </td>
      <td className="px-2 h-12 flex justify-center items-center">
        {row.isChangeTypeEditable ? (
          <div className=" !rounded-md overflow-hidden !border-0 p-0 !border-slate-50">
            <select
              className={cn(
                "custom-select focus:!outline-none focus-visible:!outline-none capitalize dark:!bg-slate-600 dark:!text-slate-300 !border-input px-2 m-0 text-sm w-fit rtl:mr-2 py-0 focus-visible:ring-0 focus:ring-offset-0 !rounded-md",
                "h-6"
              )}
              value={row.changeType}
              onChange={(e) =>
                handleRowChange(index, "changeType", e.target.value)
              }
            >
              <option
                value="Increase"
                className={cn(
                  "capitalize !border-input cursor-pointer font-semibold text-sm w-full !py-1 hover:border-slate-500"
                )}
              >
                {__("Increase", "whizmanage")}
              </option>
              <option
                value="Decrease"
                className={cn(
                  "capitalize !border-input cursor-pointer font-semibold text-sm w-full !py-1 hover:border-slate-500"
                )}
              >
                {__("Decrease", "whizmanage")}
              </option>
              {row.isNewValueOption && (
                <option
                  value="New Value"
                  className={cn(
                    "capitalize !border-input cursor-pointer font-semibold text-sm w-full !py-1 hover:border-slate-500"
                  )}
                >
                  {__("New Value", "whizmanage")}
                </option>
              )}
            </select>
          </div>
        ) : (
          <span className="mx-auto">{"-"}</span>
        )}
      </td>
      <td className="px-2 h-12">
        {row.changeType !== "New Value" &&
        (row.valueType === "%" || row.valueType === "currency") ? (
          <div className="flex justify-center items-center !rounded-md overflow-hidden !border-0 p-0 !border-slate-50">
            <select
              className={cn(
                "custom-select focus:!outline-none focus-visible:!outline-none capitalize dark:!bg-slate-600 dark:!text-slate-300 !border-input px-2 m-0 text-sm w-fit rtl:mr-2 py-0 focus-visible:ring-0 focus:ring-offset-0 !rounded-md",
                "h-6"
              )}
              value={row.valueType}
              onChange={(e) =>
                handleRowChange(index, "valueType", e.target.value)
              }
            >
              <option
                value="%"
                className={cn(
                  "capitalize !border-input cursor-pointer font-semibold text-sm w-full !py-1 hover:border-slate-500"
                )}
              >
                %
              </option>
              <option
                value="currency"
                className={cn(
                  "capitalize !border-input cursor-pointer font-semibold text-sm w-full !py-1 hover:border-slate-500"
                )}
              >
                <span
                  className=""
                  dangerouslySetInnerHTML={{
                    __html: window.currency,
                  }}
                />
              </option>
            </select>
          </div>
        ) : (
          <div className="flex justify-center items-center">
            <span className="">
              {row.changeType === "New Value" ? "-" : row.valueType}
            </span>
          </div>
        )}
      </td>
      <td className="px-2 h-12 flex justify-center items-center">
        {row.referenceBase && row.changeType !== "New Value" ? (
          <div className=" !rounded-md overflow-hidden !border-0 p-0 !border-slate-50">
            <select
              className={cn(
                "custom-select focus:!outline-none focus-visible:!outline-none capitalize dark:!bg-slate-600 dark:!text-slate-300 !border-input px-2 m-0 text-sm w-fit rtl:mr-2 py-0 focus-visible:ring-0 focus:ring-offset-0 !rounded-md",
                "h-6"
              )}
              value={row.referenceBase}
              onChange={(e) =>
                handleRowChange(index, "referenceBase", e.target.value)
              }
            >
              <option
                value="price"
                className={cn(
                  "capitalize !border-input cursor-pointer font-semibold text-sm w-full !py-1 hover:border-slate-500"
                )}
              >
                {__("Sale price", "whizmanage")}
              </option>
              <option
                value="regular_price"
                className={cn(
                  "capitalize !border-input cursor-pointer font-semibold text-sm w-full !py-1 hover:border-slate-500"
                )}
              >
                {__("Regular price", "whizmanage")}
              </option>
            </select>
          </div>
        ) : (
          <span className="">-</span>
        )}
      </td>
    </tr>
  );
};

export default BulkEditRow;
