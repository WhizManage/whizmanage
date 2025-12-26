import { Input } from "@components/ui/input";
import { cn } from "@/lib/utils";
 import { __ } from "@wordpress/i18n";

const BulkEditRow = ({ row, handleRowChange, index }) => {
  if (row.labels) {
    return;
  }

   

  // השתמש בלייבל קיים (editOptions.label) או name; אם אין – המרה אוטומטית מה-id
    const formatId = (row) => {
    const key = row?.name || row?.editOptions?.label;
    if (key) return __(key, "whizmanage");
    const fallback = (row?.id || "")
      .replace(/_/g, " ")
      .replace(/^\w/, (c) => c.toUpperCase());
    return __(fallback, "whizmanage");
  };

  const type = row.type || "input";
  const options = Array.isArray(row.options) ? row.options : [];

  return (
    <tr
      className="hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 hover:text-slate-600 dark:hover:text-slate-300 transition-all"
      key={index}
    >
      {/* Field to Edit */}
      <td className="px-2 h-12 text-base capitalize-first">{formatId(row)}</td>
      {/* Change Amount (input/select/date) */}
      <td className="px-2 h-12">
        {type === "input" ? (
          <div className="relative mx-auto h-8 w-44 rounded-md border border-input bg-background dark:bg-slate-600 py-1 text-sm overflow-hidden">
            <Input
              value={row.value ?? ""}
              onChange={(e) => handleRowChange(index, "value", e.target.value)}
              className="h-full w-full !border-none dark:!bg-slate-600 dark:!text-slate-300 !rounded-none !border-0 !ring-0 !outline-none px-2 focus-visible:dark:!ring-offset-0 placeholder:text-slate-600 dark:placeholder:text-slate-300"
              placeholder={__("No Change", "whizmanage")}
            />
          </div>
        ) : type === "select" ? (
          <div className="flex justify-center items-center !rounded-md overflow-hidden !border-0 p-0 !border-slate-50">
            <select
              value={row.value ?? ""}
              className={cn(
                "custom-select focus:!outline-none focus-visible:!outline-none capitalize dark:!bg-slate-600 dark:!text-slate-300 !border-input px-2 m-0 text-sm w-fit rtl:mr-2 py-0 focus-visible:ring-0 focus:ring-offset-0 !rounded-md",
                "h-6 min-w-44"
              )}
              onChange={(e) => handleRowChange(index, "value", e.target.value)}
            >
              {options.map((option) => (
                <option
                  key={String(option)}
                  value={option}
                  className={cn(
                    "capitalize !border-input cursor-pointer font-semibold text-sm w-full !py-1 hover:border-slate-500"
                  )}
                >
                  {__(String(option), "whizmanage")}
                </option>
              ))}
            </select>
          </div>
        ) : type === "date" ? (
          <div className="relative mx-auto h-8 w-44 rounded-md border border-input bg-background dark:bg-slate-600 py-1 text-sm overflow-hidden">
            <Input
              type="date"
              value={row.value || ""}
              onChange={(e) => handleRowChange(index, "value", e.target.value)}
              className="h-full w-full !border-none dark:!bg-slate-600 dark:!text-slate-300 !rounded-none !ring-0 !outline-none px-2"
            />
          </div>
        ) : (
          <span className="block text-center text-sm text-slate-400">—</span>
        )}
      </td>
      {/* Change Type */}
      <td className="px-2 h-12 flex justify-center items-center">
        {row.isChangeTypeEditable ? (
          <div className=" !rounded-md overflow-hidden !border-0 p-0 !border-slate-50">
            <select
              className={cn(
                "custom-select focus:!outline-none focus-visible:!outline-none capitalize dark:!bg-slate-600 dark:!text-slate-300 !border-input px-2 m-0 text-sm w-fit rtl:mr-2 py-0 focus-visible:ring-0 focus:ring-offset-0 !rounded-md",
                "h-6"
              )}
              value={row.changeType ?? "Increase"}
              onChange={(e) => handleRowChange(index, "changeType", e.target.value)}
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
      {/* Value Type */}
      <td className="px-2 h-12">
        {row.changeType !== "New Value" &&
        (row.valueType === "%" || row.valueType === "currency") ? (
          <div className="flex justify-center items-center !rounded-md overflow-hidden !border-0 p-0 !border-slate-50">
            <select
              className={cn(
                "custom-select focus:!outline-none focus-visible:!outline-none capitalize dark:!bg-slate-600 dark:!text-slate-300 !border-input px-2 m-0 text-sm w-fit rtl:mr-2 py-0 focus-visible:ring-0 focus:ring-offset-0 !rounded-md",
                "h-6"
              )}
              value={row.valueType ?? "%"}
              onChange={(e) => handleRowChange(index, "valueType", e.target.value)}
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
                {typeof window !== "undefined" && window?.currency ? (
                  <span dangerouslySetInnerHTML={{ __html: window.currency }} />
                ) : (
                  __("Currency", "whizmanage")
                )}
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
      {/* Reference Base */}
      <td className="px-2 h-12 flex justify-center items-center">
        {row.referenceBase && row.changeType !== "New Value" ? (
          <div className=" !rounded-md overflow-hidden !border-0 p-0 !border-slate-50">
            <select
              className={cn(
                "custom-select focus:!outline-none focus-visible:!outline-none capitalize dark:!bg-slate-600 dark:!text-slate-300 !border-input px-2 m-0 text-sm w-fit rtl:mr-2 py-0 focus-visible:ring-0 focus:ring-offset-0 !rounded-md",
                "h-6"
              )}
              value={row.referenceBase ?? "price"}
              onChange={(e) => handleRowChange(index, "referenceBase", e.target.value)}
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
