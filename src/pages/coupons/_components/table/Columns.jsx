import { CouponStatusKeys } from "@/data/statusKeys";
import CustomTooltip from "@components/nextUI/Tooltip";
import { Badge } from "@components/ui/badge";
import Button from "@components/ui/button";
import { Checkbox } from "@components/ui/checkbox";
import { Input } from "@components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select";
import { Switch } from "@components/ui/switch";
import { Textarea } from "@components/ui/textarea";
import { cn, DatePicker } from "@heroui/react";
import {
  getLocalTimeZone,
  parseAbsolute,
  parseDate,
} from "@internationalized/date";
import { formatDistanceToNow } from "date-fns";

import { Wand2 } from "lucide-react";
import { useState } from "react";
import { __ } from '@wordpress/i18n';
import MultiSelectInput from "../header/add/coupon/MultiSelectInput";
import { columnFilterFn } from "../header/ColumnFilter";
import { DataTableColumnHeader } from "./DataTableColumnHeader";
import AllowedEmailsEdit from "./edit/AllowedEmailsEdit";
import ProductIds from "./edit/ProductIds";
import UsageLimit from "./edit/UsageLimit";
import CopyableText from "@components/CopyableText";

const sanitizeISO = (iso) => (iso.endsWith("Z") ? iso : `${iso}Z`);

export const HTMLToText = (textHtml) => {
  const parser = new DOMParser();
  const htmlString = textHtml?.toString();
  const doc = parser.parseFromString(htmlString, "text/html");
  return doc.body.textContent;
};

const columnSizes =
  window.getWhizmanage.find((column) => column.name === "coupons_columns_width")
    ?.reservedData || null;

export const columns = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => {
          table.toggleAllPageRowsSelected(!!value);
        }}
        aria-label="Select all"
        className="m-auto"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="m-auto"
      />
    ),
    edit: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="m-auto"
      />
    ),
    enablePinning: true,
    size: 50,
  },
  {
    accessorKey: "code",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title={"Code"}
          className="mr-1"
        />
      );
    },
    cell: ({ row }) => (
      <div
        title={row.original.code}
        className="!line-clamp-2 truncate text-wrap"
      >
        <CopyableText
          text={row.original.code}
          variant="inline"
          showIcon={true}
          showTooltip={true}
          timeout={10000}
        />
      </div>
    ),
    edit: ({ row }) => {
       
      const [value, setValue] = useState(row.original.code);
      const handleGenerateClick = () => {
        const newCode = Math.random().toString(36).substr(2, 8).toUpperCase(); // יצירת קוד רנדומלי
        setValue(newCode);
        row.original.code = newCode;
      };
      return (
        <div className="flex gap-1">
          <Input
            onChange={(e) => {
              setValue(e.target.value);
              row.original.code = e.target.value;
            }}
            aria-label="Enter code"
            value={value}
            className="h-8 !w-24 invalid:!border-red-500 dark:!text-slate-300 !border-slate-200 dark:!border-slate-800 !rounded-md"
            onFocus={(event) => event.target.select()}
            required
          />
          <CustomTooltip title={__("Generate", "whizmanage")}>
            <Button
              onClick={handleGenerateClick}
              variant="outline"
              type="button"
              className="!size-8 px-1.5 rounded-lg dark:!bg-slate-700 !text-slate-300"
              size="icon"
            >
              <Wand2 className="size-4" />
            </Button>
          </CustomTooltip>
        </div>
      );
    },
    size: columnSizes?.code || 150,
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={"Status"}
        className="mr-1"
      />
    ),
    cell: ({ row }) => {
       
      return (
        <div
          className={cn(
            "capitalize font-semibold px-1 border rounded-md text-sm w-fit rtl:mr-2",
            CouponStatusKeys[row.original.status]
          )}
        >
          {__(row.original.status, "whizmanage")}
        </div>
      );
    },
    edit: ({ row }) => {
       
      const [value, setValue] = useState(row.original.status);
      return (
        <Select
          onValueChange={(selectedValue) => {
            setValue(selectedValue);
            row.original.status = selectedValue;
          }}
          aria-label="Choose status"
        >
          <SelectTrigger
            className={cn(
              "capitalize font-semibold px-4 border rounded-md text-sm w-fit rtl:mr-2 py-0 h-8 focus-visible:ring-0 focus:ring-offset-0",
              CouponStatusKeys[value]
            )}
          >
            <SelectValue placeholder={<span>{__(value, "whizmanage")}</span>} />
          </SelectTrigger>
          <SelectContent className="!p-0 min-w-fit max-w-fit dark:border-slate-600">
            {Object.keys(CouponStatusKeys)
              .slice(0, -1)
              .map((status) => (
                <SelectItem
                  value={status}
                  className={cn(
                    "capitalize cursor-pointer font-semibold text-sm w-full rtl:mr-2 py-2 pr-0.5 hover:border-slate-500 !rounded-none",
                    CouponStatusKeys[status]
                  )}
                >
                  <span> {__(status, "whizmanage")}</span>
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      );
    },
    filterFn: columnFilterFn,
    size: columnSizes?.status || 150,
  },
  {
    accessorKey: "date",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title={"Date"}
          className="mr-1"
        />
      );
    },
    cell: ({ row }) => {
      const raw = sanitizeISO(row.original.date);
      const zoned = parseAbsolute(raw, getLocalTimeZone());

      return (
        <div className="flex flex-col">
          <div className="!line-clamp-1 truncate text-nowrap">
            {zoned.toDate().toLocaleString(undefined, { hour12: false })}
          </div>
          <div className="!line-clamp-1 truncate text-nowrap text-sm text-gray-500 text-center">
            {formatDistanceToNow(zoned.toDate(), { addSuffix: true })}
          </div>
        </div>
      );
    },
    edit: ({ row }) => {
      const raw = sanitizeISO(row.original.date);
      const initial = parseAbsolute(raw, getLocalTimeZone());
      const [value, setValue] = React.useState(initial);

      const handleChange = (newVal) => {
        if (!newVal) return;
        setValue(newVal);
        row.original.date = newVal.toAbsoluteString();
      };

      return (
        <DatePicker
          value={value}
          onChange={handleChange}
          hideTimeZone
          hourCycle={24}
          showMonthAndYearPickers
          aria-label="date picker"
        />
      );
    },
    size: columnSizes?.date || 150, // Adjust default size
  },
  {
    accessorKey: "discount_type",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={"Discount Type"}
        className="mr-1"
      />
    ),
    cell: ({ row }) => {
       
      const discountTypeLabels = {
        fixed_product: "Fixed product",
        fixed_cart: "Fixed cart",
        percent: "Percentage",
      };
      return (
        <div
          className={cn(
            "capitalize font-semibold px-1 border rounded-md text-sm w-fit rtl:mr-2"
          )}
        >
          {__(discountTypeLabels[row.original.discount_type], "whizmanage")}
        </div>
      );
    },
    edit: ({ row }) => {
       
      const [value, setValue] = useState(row.original.discount_type);

      // מיפוי של סוגי ההנחה לשמות התצוגה שלהם
      const discountTypeLabels = {
        fixed_product: "Fixed product",
        fixed_cart: "Fixed cart",
        percent: "Percentage",
      };

      return (
        <Select
          value={value}
          onValueChange={(selectedValue) => {
            setValue(selectedValue);
            row.original.discount_type = selectedValue;
          }}
          aria-label="Choose type"
        >
          <SelectTrigger
            className={cn(
              "capitalize min-w-40 font-semibold px-4 border rounded-md text-sm rtl:mr-2 py-0 h-8 focus-visible:ring-0 focus:ring-offset-0"
            )}
          >
            <SelectValue className="!min-w-40 p-0">
              {__(discountTypeLabels[value], "whizmanage") || __("Select discount type", "whizmanage")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="dark:border-slate-600">
            {Object.entries(discountTypeLabels).map(([key, label]) => (
              <SelectItem
                key={key}
                value={key}
                className={cn(
                  "capitalize cursor-pointer font-semibold text-sm w-full rtl:mr-2 py-2 pr-4 hover:border-slate-500 !rounded-none"
                )}
              >
                <span>{__(label, "whizmanage")}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    },
    filterFn: columnFilterFn,
    size: columnSizes?.discount_type || 150,
  },
  {
    accessorKey: "amount",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title={"Amount"}
          className="mr-1"
        />
      );
    },
    cell: ({ row }) => (
      <div title={row.original.amount} className="flex items-center gap-1">
        {row.original.discount_type != "percent" ? (
          <span
            className="text-gray-400 text-base pl-2 rtl:!px-2 rtl:!pt-2.5"
            dangerouslySetInnerHTML={{ __html: window.currency }}
          />
        ) : (
          <span className="text-gray-400 text-base pl-2 rtl:!px-2 rtl:!pt-2.5">
            %
          </span>
        )}
        {row.original.amount}
      </div>
    ),
    edit: ({ row }) => (
      <div className="capitalize !line-clamp-2 truncate text-wrap">
        {row.depth == 0 ? (
          <Input
            type="number"
            min={0}
            onChange={(e) => {
              row.original.amount = e.target.value;
            }}
            aria-label="Enter amount"
            defaultValue={row.original.amount}
            className="h-8 invalid:!border-red-500 dark:!text-slate-300 !border-slate-200 dark:!border-slate-800 !rounded-md"
            onFocus={(event) => event.target.select()}
            required
          />
        ) : (
          <div
            title={row.original.amount}
            className="capitalize !line-clamp-2 truncate text-wrap"
          >
            {row.original.amount}
          </div>
        )}
      </div>
    ),
    size: columnSizes?.amount || 150,
  },
  {
    accessorKey: "minimum_spend",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title={"Minimum Spend"}
          className="mr-1"
        />
      );
    },
    cell: ({ row }) => (
      <div title={row.original.amount} className="flex items-center gap-1">
        <span
          className="text-gray-400 text-base pl-2 rtl:!px-2 rtl:!pt-2.5"
          dangerouslySetInnerHTML={{ __html: window.currency }}
        />
        {row.original.minimum_amount}
      </div>
    ),
    edit: ({ row }) => (
      <div className="capitalize !line-clamp-2 truncate text-wrap">
        {row.depth == 0 ? (
          <Input
            type="number"
            min={0}
            onChange={(e) => {
              row.original.minimum_amount = e.target.value;
            }}
            aria-label="Enter amount"
            defaultValue={row.original.minimum_amount}
            className="h-8 invalid:!border-red-500 dark:!text-slate-300 !border-slate-200 dark:!border-slate-800 !rounded-md"
            onFocus={(event) => event.target.select()}
          />
        ) : (
          <div
            title={row.original.minimum_amount}
            className="capitalize !line-clamp-2 truncate text-wrap"
          >
            {row.original.minimum_amount}
          </div>
        )}
      </div>
    ),
    size: columnSizes?.minimum_spend || 150,
  },
  {
    accessorKey: "maximum_spend",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title={"Maximum Spend"}
          className="mr-1"
        />
      );
    },
    cell: ({ row }) => (
      <div
        title={row.original.maximum_amount}
        className="flex items-center gap-1"
      >
        <span
          className="text-gray-400 text-base pl-2 rtl:!px-2 rtl:!pt-2.5"
          dangerouslySetInnerHTML={{ __html: window.currency }}
        />
        {row.original.maximum_amount}
      </div>
    ),
    edit: ({ row }) => (
      <div className="capitalize !line-clamp-2 truncate text-wrap">
        {row.depth == 0 ? (
          <Input
            type="number"
            min={0}
            onChange={(e) => {
              row.original.maximum_amount = e.target.value;
            }}
            aria-label="Enter amount"
            defaultValue={row.original.maximum_amount}
            className="h-8 invalid:!border-red-500 dark:!text-slate-300 !border-slate-200 dark:!border-slate-800 !rounded-md"
            onFocus={(event) => event.target.select()}
          />
        ) : (
          <div
            title={row.original.maximum_amount}
            className="capitalize !line-clamp-2 truncate text-wrap"
          >
            {row.original.maximum_amount}
          </div>
        )}
      </div>
    ),
    size: columnSizes?.maximum_spend || 150,
  },
  {
    accessorKey: "description",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title={"Description"}
          className="mr-1"
        />
      );
    },
    cell: ({ row }) => (
      <div
        className="capitalize truncate description-img !line-clamp-2 text-wrap max-sm:!hidden"
        title={HTMLToText(row.original.description)}
      >
        {HTMLToText(row.original.description)}
      </div>
    ),
    edit: ({ row }) => (
      <Textarea
        onChange={(e) => {
          row.original.description = e.target.value;
        }}
        defaultValue={row.original.description}
        className="h-8 min-w-40 invalid:border-red-500 rounded-sm"
        onFocus={(event) => event.target.select()}
        rows="2"
        aria-label="Enter description"
      />
    ),
    size: columnSizes?.description || 150,
  },
  {
    accessorKey: "product_ids",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title={"Products"}
          className="mr-1"
        />
      );
    },
    cell: ({ row }) => {
       
      const productsIds = row.original.product_names;
      if (!productsIds) {
        return;
      }
      return (
        <div className="capitalize pl-2 rtl:pr-4">
          <div
            className="capitalize flex flex-nowrap gap-2 !line-clamp-2 max-sm:!hidden"
            title={
              productsIds.length > 0
                ? productsIds.map((item) => item).join(", ")
                : __("No products", "whizmanage")
            }
          >
            {productsIds.map((item, index) => (
              <Badge
                key={index}
                variant="outline"
                className="whitespace-nowrap"
              >
                <span className="max-w-[120px] truncate inline-block">
                  {item}
                </span>
              </Badge>
            ))}
          </div>
        </div>
      );
    },
    edit: ({ row }) => (
      <ProductIds
        row={row}
        existingIds={row?.original?.product_ids}
        disabledIds={row?.original?.excluded_product_ids}
      />
    ),
    size: columnSizes?.product_ids || 150,
  },
  {
    accessorKey: "excluded_product_ids",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title={"Exclude products"}
          className="mr-1"
        />
      );
    },
    cell: ({ row }) => {
       
      const productsIds = row.original.excluded_product_names;
      if (!productsIds) {
        return;
      }
      return (
        <div className="capitalize pl-2 rtl:pr-4">
          <div
            className="capitalize flex flex-nowrap gap-2 !line-clamp-2 max-sm:!hidden"
            title={
              productsIds.length > 0
                ? productsIds.map((item) => item).join(", ")
                :__("No products", "whizmanage")
            }
          >
            {productsIds.map((item, index) => (
              <Badge
                key={index}
                variant="outline"
                className="whitespace-nowrap"
              >
                <span className="max-w-[120px] truncate inline-block">
                  {item}
                </span>
              </Badge>
            ))}
          </div>
        </div>
      );
    },
    edit: ({ row }) => (
      <ProductIds
        excluded={true}
        row={row}
        existingIds={row?.original?.excluded_product_ids}
        disabledIds={row?.original?.product_ids}
      />
    ),
    size: columnSizes?.excluded_product_ids || 150,
  },
  {
    accessorKey: "product_categories",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title={"Product categories"}
          className="mr-1"
        />
      );
    },
    cell: ({ row }) => {
       
      const categoryIds = row.original.product_categories;

      if (!categoryIds || !Array.isArray(categoryIds)) {
        return __("No category", "whizmanage");
      }

      const foundCategories = window.listTaxonomies.find(
        (taxonomy) => taxonomy.name === "_product_cat"
      );

      const categoryNames = categoryIds
        .map((id) => {
          const category = foundCategories.terms?.find(
            (item) => item.id === id
          );
          return category ? category.name : null;
        })
        .filter((name) => name !== null);

      return (
        <div className="capitalize pl-2 rtl:pr-4">
          <div
            className="capitalize flex flex-nowrap gap-2 !line-clamp-1 max-sm:!hidden"
            title={
              categoryNames.length > 0
                ? categoryNames.join(", ")
                : __("No category", "whizmanage")
            }
          >
            {categoryNames.map((item, index) => (
              <Badge
                key={index}
                variant="outline"
                className="whitespace-nowrap"
              >
                <span className="max-w-[120px] truncate inline-block">
                  {item}
                </span>
              </Badge>
            ))}
          </div>
        </div>
      );
    },
    edit: ({ row }) => (
      <MultiSelectInput
        excluded={false}
        row={row}
        updateValue={(i) => {
          console.log();
        }}
        disabledIds={row?.original?.excluded_product_categories}
        columnName="product_categories"
      />
    ),
    size: columnSizes?.product_categories || 150,
  },
  {
    accessorKey: "excluded_product_categories",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title={"Exclude categories"}
          className="mr-1"
        />
      );
    },
    cell: ({ row }) => {
       
      const categoryIds = row.original.excluded_product_categories;

      if (!categoryIds || !Array.isArray(categoryIds)) {
        return __("No category", "whizmanage");
      }
      const foundCategories = window.listTaxonomies.find(
        (taxonomy) => taxonomy.name === "_product_cat"
      );
      const categoryNames = categoryIds
        .map((id) => {
          const category = foundCategories.terms?.find(
            (item) => item.id === id
          );
          return category ? category.name : null;
        })
        .filter((name) => name !== null);

      return (
        <div className="capitalize pl-2 rtl:pr-4">
          <div
            className="capitalize flex flex-nowrap gap-2 !line-clamp-2 max-sm:!hidden"
            title={
              categoryNames.length > 0
                ? categoryNames.join(", ")
                : __("No category", "whizmanage")
            }
          >
            {categoryNames.map((item, index) => (
              <Badge
                key={index}
                variant="outline"
                className="whitespace-nowrap"
              >
                <span className="max-w-[120px] truncate inline-block">
                  {item}
                </span>
              </Badge>
            ))}
          </div>
        </div>
      );
    },

    edit: ({ row }) => (
      <MultiSelectInput
        excluded={true}
        row={row}
        updateValue={(i) => {
          console.log();
        }}
        disabledIds={row?.original?.product_categories}
        columnName="excluded_product_categories"
      />
    ),
    size: columnSizes?.excluded_product_categories || 150,
  },
  {
    accessorKey: "email_restrictions",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title={"Allowed emails"}
          className="mr-1"
        />
      );
    },
    cell: ({ row }) => {
       
      const emails = row.original.email_restrictions;

      if (!emails || !Array.isArray(emails)) {
        return __("No email", "whizmanage");
      }

      return (
        <div className="pl-2 rtl:pr-4">
          <div
            className="flex flex-nowrap gap-2 !line-clamp-2 max-sm:!hidden"
            title={emails.length > 0 ? emails.join(", ") : __("No email", "whizmanage")}
          >
            {emails.map((item, index) => (
              <Badge
                key={index}
                variant="outline"
                className="whitespace-nowrap"
              >
                <span>{item}</span>
              </Badge>
            ))}
          </div>
        </div>
      );
    },

    edit: ({ row }) => <AllowedEmailsEdit row={row} />,
    size: columnSizes?.email_restrictions || 150,
  },
  {
    accessorKey: "usage_limit",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title={"Usage / Limit"}
          className="mr-1"
        />
      );
    },
    cell: ({ row }) => (
      <div className="capitalize !line-clamp-2 truncate text-wrap">
        {row.original.usage_count} /{" "}
        {row.original.usage_limit < 1 ? "∞" : row.original.usage_limit}
      </div>
    ),
    edit: ({ row }) => (
      <div className="flex gap-1 justify-center items-center">
        <span className="text-muted-foreground">
          {row.original.usage_count}
        </span>
        <span className="text-muted-foreground">/</span>
        <Input
          type="number"
          onChange={(e) => {
            row.original.usage_limit = e.target.value;
          }}
          aria-label="Enter limit"
          placeholder={__("Unlimited", "whizmanage")}
          defaultValue={row.original.usage_limit}
          className="h-8 !min-w-[82px] dark:!text-slate-300 !border-slate-200 dark:!border-slate-800 !rounded-md"
          onFocus={(event) => event.target.select()}
          required
        />
        <UsageLimit row={row} />
      </div>
    ),
    size: columnSizes?.usage_limit || 150,
  },
  {
    accessorKey: "date_expires",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title={"Expiry date"}
          className="mr-1"
        />
      );
    },
    cell: ({ row }) => {
       
      const formatDateTime = (dateString) => {
        const optionsDate = {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        };
        const date = new Date(dateString); // Convert to JavaScript Date object directly
        return date.toLocaleDateString("en-GB", optionsDate);
      };
      return (
        <div className="capitalize !line-clamp-2 truncate text-wrap">
          {row.original.date_expires !== null ? (
            <div className="text-nowrap flex flex-nowrap gap-2">
              <span>{formatDateTime(row.original.date_expires)}</span>
            </div>
          ) : (
            <div className="text-slate-400 flex flex-nowrap gap-2 text-nowrap">
              <span className="text-slate-300/80 dark:text-slate-500/80">
                {__("Not defined", "whizmanage")}
              </span>
            </div>
          )}
        </div>
      );
    },
    edit: ({ row }) => {
      const [value, setValue] = useState(
        () =>
          row?.original?.date_expires != null &&
          parseDate(row?.original?.date_expires?.split("T")[0])
      );
      return (
        <DatePicker
          className="[&>div]:!max-h-8 [&>div]:!min-h-8 [&>div]:!h-8 [&>div]:border [&>div]:rounded-md [&>div]:flex [&>div]:gap-0 [&>div]:items-center [&>div]:bg-white [&>div]:hover:!bg-white [&>div]:dark:hover:!bg-slate-600 [&>div]:dark:!bg-slate-700 [&>div]:!font-extralight [&>div]:!text-slate-300 [&>div]:dark:!text-slate-300 !text-slate-300"
          defaultValue={value}
          aria-label="Choose date"
          onChange={(newDate) => {
            if (newDate) {
              const newIsoString =
                new Date(newDate.year, newDate.month - 1, newDate.day + 1)
                  .toISOString()
                  .split("T")[0] + "T00:00:00";

              setValue(newIsoString);
              row.original.date_expires = newIsoString;
            } else {
              row.original.date_expires_gmt = null;
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
        />
      );
    },
    size: columnSizes?.date_expires || 150,
  },
  {
    accessorKey: "free_shipping",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title={"Free shipping"}
          className="mr-1"
        />
      );
    },
    cell: ({ row }) => (
      <div className="!line-clamp-2 truncate text-wrap">
        {row.original.free_shipping === true ? __("yes", "whizmanage") : __("no", "whizmanage")}
      </div>
    ),
    edit: ({ row }) => {
      const [isChecked, setIsChecked] = useState(row.original.free_shipping);
      const handleChange = () => {
        const newValue = !isChecked;
        setIsChecked(newValue);
        row.original.free_shipping = newValue;
      };
      return (
        <Switch
          className=""
          id="airplane-mode"
          checked={isChecked}
          onCheckedChange={handleChange}
        />
      );
    },
    size: columnSizes?.free_shipping || 150,
  },
  {
    accessorKey: "individual_use",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title={"Individual use"}
          className="mr-1"
        />
      );
    },
    cell: ({ row }) => (
      <div className="!line-clamp-2 truncate text-wrap">
        {row.original.individual_use === true ? __("yes", "whizmanage") : __("no", "whizmanage")}
      </div>
    ),
    edit: ({ row }) => {
      const [isChecked, setIsChecked] = useState(row.original.individual_use);
      const handleChange = () => {
        const newValue = !isChecked;
        setIsChecked(newValue);
        row.original.individual_use = newValue;
      };
      return (
        <Switch
          className=""
          id="airplane-mode"
          checked={isChecked}
          onCheckedChange={handleChange}
        />
      );
    },
    size: columnSizes?.individual_use || 150,
  },
  {
    accessorKey: "exclude_sale_items",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title={"Exclude sale items"}
          className="mr-1"
        />
      );
    },
    cell: ({ row }) => (
      <div className="!line-clamp-2 truncate text-wrap">
        {row.original.exclude_sale_items === true ? __("yes", "whizmanage") : __("no", "whizmanage")}
      </div>
    ),
    edit: ({ row }) => {
      const [isChecked, setIsChecked] = useState(
        row.original.exclude_sale_items
      );
      const handleChange = () => {
        const newValue = !isChecked;
        setIsChecked(newValue);
        row.original.exclude_sale_items = newValue;
      };
      return (
        <Switch
          className=""
          id="airplane-mode"
          checked={isChecked}
          onCheckedChange={handleChange}
        />
      );
    },
    size: columnSizes?.exclude_sale_items || 150,
  },
];
