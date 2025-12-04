import { inventoryStyles } from "@/data/inventoryStyles";
import { ProductStatusKeys } from "@/data/statusKeys";
import { cn } from "@/lib/utils";
import CustomTooltip from "@components/nextUI/Tooltip";
import { Badge } from "@components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@components/ui/carousel";
import { Checkbox } from "@components/ui/checkbox";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@components/ui/hover-card";
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
import { Avatar, DatePicker, Image, Tooltip } from "@heroui/react";
import { parseDateTime } from "@internationalized/date";
import { formatDistanceToNow } from "date-fns";
import { enUS, he } from "date-fns/locale";
import { __ } from '@wordpress/i18n';
import { AlertTriangle, ChevronsRight } from "lucide-react";
import { useState } from "react";
import RichEditorModal from "../../../../layout/editor/RichEditorModal";
import { columnFilterFn } from "../header/ColumnFilter";
import VariationNameEdit from "../header/add/variation/VariationNameEdit";
import { DataTableColumnHeader } from "./DataTableColumnHeader";
import DimensionsEdit from "./edit/DimensionsEdit";
import DownloadableEdit from "./edit/DownloadableEdit";
import ImageEdit from "./edit/Image/ImageEdit";
import InventoryEdit from "./edit/InventoryEdit";
import LinkedProducts from "./edit/LinkedProducts";
import MultiSelectEdit from "./edit/MultiSelectEdit";
import PriceEdit from "./edit/PriceEdit";
import SaleDurationEditor from "./edit/SaleDurationEditor";
import TypeEdit from "./edit/TypeEdit";
import AttributesEdit from "./edit/attributes/AttributesEdit";
import GalleryEdit from "./edit/gallery/GalleryEdit";
import CustomEditor from "./edit/meta_data/CustomEditor";
import MetaData from "./edit/meta_data/MetaData";
import { useProductsContext } from "/src/context/ProductsContext";
import { putApi } from "../../../../services/services";
import { AiFillStar, AiOutlineStar } from 'react-icons/ai';
import YoastSEOModal from "./YoastSEOModal";



const acfMeta = window?.WhizManageCustomFields;
const allMetaData = window?.metaKey;

const acfMetaKeysSet = acfMeta ? new Set(acfMeta.map(({ key }) => key)) : null;

const filteredAllMetaData = acfMetaKeysSet
  ? allMetaData?.filter(({ key }) => !acfMetaKeysSet.has(key))
  : allMetaData;


const mapToMetaData = ({ key = "" }) => ({
  label: typeof key === "string" ? key.replace(/_/g, " ") : "",
  key,
  value: "",
  type: "text",
  choices: [],
});


const mergedMetaData = [
  ...(acfMeta || []),
  ...(filteredAllMetaData?.map(mapToMetaData) || []),
];

const columnSizes =
  window.getWhizmanage.find(
    (column) => column.name === "products_columns_width"
  )?.reservedData || null;

export const metaDataColumns = mergedMetaData.map((item) => item.key);
const createCustomField = (custom, index) => ({
  accessorKey: custom.key,
  header: ({ column }) => (
    <DataTableColumnHeader
      column={column}
      title={HTMLToText(custom.label)}
      className="mr-1"
    />
  ),
  cell: ({ row }) => {
    const match = row.original.meta_data.find(
      (metaProduct) => metaProduct.key === custom.key
    );
    if (match && typeof match.value === "object") {
      // console.log(match);
    }

    return <CustomEditor row={row} custom={custom} edit={false} />;
  },

  edit: ({ row }) => {
    return <CustomEditor row={row} custom={custom} edit={true} />;
  },
  size: columnSizes?.[custom.key] || 150,
});

const customFields = mergedMetaData?.map(createCustomField);

const taxonomyField = (taxonomy, index) => ({
  accessorKey: taxonomy.name,
  header: ({ column }) => (
    <DataTableColumnHeader
      column={column}
      title={taxonomy.label}
      className="mr-1"
    />
  ),
  cell: ({ row }) => {
    return (
      <div
        className="flex flex-wrap !line-clamp-2 max-sm:!hidden"
        title={
          row.original[taxonomy.name]
            ? row.original[taxonomy.name]
              .map((taxonomy) => taxonomy.name)
              .join(", ")
            : "Not taxonomy"
        }
      >
        {row.original[taxonomy.name] &&
          row.original[taxonomy.name].map((tax, index) => (
            <Badge
              key={index}
              variant="outline"
              className="lowercase cursor-pointer whitespace-nowrap"
            >
              {tax.name}
            </Badge>
          ))}
      </div>
    );
  },
  edit: ({ row }) =>
    row.original[taxonomy.name] ? (
      <MultiSelectEdit
        row={row}
        columnName={taxonomy.name}
        label={taxonomy.label}
      />
    ) : (
      <></>
    ),
  size: columnSizes?.[taxonomy.name] || 150,
  filterFn: columnFilterFn,
});

const showTaxonomies = window.listTaxonomies?.map(taxonomyField);

export const HTMLToText = (textHtml) => {
  const parser = new DOMParser();
  const htmlString = textHtml?.toString();
  const doc = parser.parseFromString(htmlString, "text/html");
  return doc.body.textContent;
};
const StarIconFilled = props => <AiFillStar {...props} />;
const StarIconOutline = props => <AiOutlineStar {...props} />;

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
    id: "expand",
    header: ({ table }) => (
      <button onClick={table.getToggleAllRowsExpandedHandler()}>
        {table.getIsAllRowsExpanded() ? (
          <ChevronsRight className="rotate-90 w-5 h-5 text-fuchsia-600" />
        ) : (
          <ChevronsRight className="w-5 h-5 text-fuchsia-600 rtl:rotate-180" />
        )}
      </button>
    ),
    cell: ({ row }) =>
      row.getCanExpand() ? (
        <button onClick={row.getToggleExpandedHandler()} className="m-auto">
          {row.getIsExpanded() ? (
            <ChevronsRight className="rotate-90 w-5 h-5 text-fuchsia-600" />
          ) : (
            <ChevronsRight className="w-5 h-5 text-fuchsia-600 rtl:rotate-180" />
          )}
        </button>
      ) : null,
    edit: ({ row }) =>
      row.getCanExpand() ? (
        <button onClick={row.getToggleExpandedHandler()} className="m-auto">
          {row.getIsExpanded() ? (
            <ChevronsRight className="rotate-90 w-5 h-5 text-fuchsia-600" />
          ) : (
            <ChevronsRight className="w-5 h-5 text-fuchsia-600 rtl:rotate-180" />
          )}
        </button>
      ) : null,
    enablePinning: true,
    size: 50,
  },
  {
    accessorKey: "image",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title={"Image"}
          className="mr-1"
        />
      );
    },
    cell: ({ row }) => {
      // Determine if there's an image based on row depth
      const hasImage =
        row.depth == 0
          ? row?.original?.images?.[0]?.src
          : row?.original?.image?.src;

      const placeholderSrc =
        window.placeholderImg;

      // If there's an image, show with tooltip
      if (hasImage) {
        return (
          <Tooltip
            className="p-0 m-0"
            placement={window.user_local == "he_IL" ? "left" : "right"}
            content={
              <Image
                width={200}
                height={200}
                alt="NextUI hero Image"
                src={hasImage}
              />
            }
          >
            <Avatar src={hasImage} radius="sm" />
          </Tooltip>
        );
      }

      // If no image, show placeholder without tooltip
      return (
        <Avatar
          radius="sm"
          fallback={
            <img className="w-full h-full object-fill" src={placeholderSrc} />
          }
        />
      );
    },
    edit: ({ row }) => <ImageEdit row={row} />,
    size: columnSizes?.image || 150,
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title={"Name"}
          className="mr-1"
        />
      );
    },
    cell: ({ row }) => (
      <div
        title={row.original.name}
        className="capitalize !line-clamp-2 truncate text-wrap"
      >
        {row.original.name}
      </div>
    ),
    edit: ({ row }) => {
      const { data } = useProductsContext();
      const parentRow = React.useMemo(() => {
        return data.find((item) => item.id === row.original.parent_id);
      }, [data, row.original.parent_id]);

      return (
        <div
          className="w-full"
          style={{
            maxWidth: `${columnSizes?.name || 150}px`,
            overflow: "hidden",
          }}
        >
          {row.depth == 0 ? (
            <Textarea
              onChange={(e) => {
                row.original.name = e.target.value;
              }}
              defaultValue={row.original.name}
              className="h-8 w-full invalid:border-red-500 rounded-sm resize-none"
              onFocus={(event) => event.target.select()}
              rows="2"
              required
            />
          ) : (
            <div className="flex w-full items-center gap-2 overflow-x-auto">
              {parentRow?.attributes?.map((attribute, i) => (
                <VariationNameEdit
                  key={i}
                  i={i}
                  row={row}
                  attribute={attribute}
                />
              ))}
            </div>
          )}
        </div>
      );
    },
    size: columnSizes?.name || 150,
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
            ProductStatusKeys[row.original.status]
          )}
        >
          {__(row.original.status, "whizmanage")}
        </div>
      );
    },
    edit: ({ row }) => {
      const [value, setValue] = useState(row.original.status);
      if (row?.original?.short_description?.length >= 0) {
        return (
          <Select
            onValueChange={(selectedValue) => {
              setValue(selectedValue);
              row.original.status = selectedValue;
            }}
          >
            <SelectTrigger
              className={cn(
                "capitalize font-semibold px-4 border rounded-md text-sm w-fit rtl:mr-2 py-0 h-8 focus-visible:ring-0 focus:ring-offset-0",
                ProductStatusKeys[value]
              )}
            >
              <SelectValue placeholder={<span>{__(value, "whizmanage")}</span>} />
            </SelectTrigger>
            <SelectContent className="!p-0 min-w-fit max-w-fit dark:border-slate-600">
              {Object.keys(ProductStatusKeys)
                .slice(0, -1)
                .map((status) => (
                  <SelectItem
                    value={status}
                    className={cn(
                      "capitalize cursor-pointer font-semibold text-sm w-full rtl:mr-2 py-2 pr-0.5 hover:border-slate-500 !rounded-none",
                      ProductStatusKeys[status]
                    )}
                  >
                    <span> {__(status, "whizmanage")}</span>
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        );
      } else {
        return (
          <div
            className={cn(
              "capitalize font-semibold px-1 border rounded-md text-sm w-fit rtl:mr-2",
              ProductStatusKeys[row.original.status]
            )}
          >
            {__(row.original.status, "whizmanage")}
          </div>
        );
      }
    },
    filterFn: columnFilterFn,
    size: columnSizes?.status || 150,
  },
{
  accessorKey: "date_created",
  header: ({ column }) => {
    return (
      <DataTableColumnHeader
        column={column}
        title={"Date Created"}
        className="mr-1"
      />
    );
  },
  cell: ({ row }) => {
    const formatDateTime = (dateString) => {
      if (!dateString) return __("Not defined", "whizmanage");
      try {
        // המרה ל-Date object (זה אוטומטית מזהה UTC ומציג בזמן מקומי)
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        
        // פורמט בזמן מקומי של המשתמש
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      } catch (e) {
        return dateString;
      }
    };

    const getRelativeTime = (dateString) => {
      if (typeof dateString !== "string" || !dateString)
        return __("Not defined", "whizmanage");

      const date = new Date(dateString);
      if (isNaN(date.getTime())) return __("Invalid date", "whizmanage");

      return formatDistanceToNow(date, {
        addSuffix: true,
        locale: window.user_local === "he_IL" ? he : enUS,
      });
    };

    return (
      <div className="flex flex-col">
        <div className="!line-clamp-1 truncate text-nowrap">
          {formatDateTime(row.original.date_created_gmt)}
        </div>
        <div className="text-xs text-center text-gray-500 dark:text-gray-400">
          {getRelativeTime(row.original.date_created_gmt)}
        </div>
      </div>
    );
  },
  edit: ({ row }) => {
    // המרה מ-UTC לזמן מקומי עבור העריכה
    const [value, setValue] = useState(() => {
      try {
        const utcDate = row.original.date_created_gmt;
        if (!utcDate) return null;
        
        // המרה ל-Date (אוטומטית בזמן מקומי)
        const date = new Date(utcDate);
        
        // המרה ל-string בפורמט ISO מקומי (ללא timezone)
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        const localISOString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
        
        return parseDateTime(localISOString);
      } catch (e) {
        console.error('Error parsing date:', e);
        return parseDateTime(row.original.date_created_gmt.substring(0, 19));
      }
    });
    
    const handleDateChange = (newDate) => {
      setValue(newDate);
      
      // Convert to ISO 8601 UTC format with Z suffix
      // The parseDateTime creates a ZonedDateTime in the user's timezone
      // We need to convert it to UTC and format as ISO string
      const jsDate = newDate.toDate(); // Convert to native JS Date
      const utcString = jsDate.toISOString(); // This gives us UTC with Z suffix
      
      // Store BOTH fields to ensure WooCommerce API accepts it
      row.original.date_created_gmt = utcString;
      row.original.date_created = utcString; // This is what WooCommerce expects
      
      console.log('Date selected (local):', newDate.toString());
      console.log('Date sent to API (UTC):', utcString);
    };

    return (
      <div className="w-full max-w-xl flex flex-row gap-4">
        <DatePicker
          hideTimeZone
          showMonthAndYearPickers
          value={value}
          onChange={handleDateChange}
          aria-label="Event Date"
          hourCycle={24}
          classNames={{
            base: "rounded-md dark:!bg-slate-800 dark:!text-slate-300",
            inputWrapper:
              "rounded-md !h-8 !max-h-8 !py-1 !m-0 border dark:!border-slate-800 bg-white dark:!bg-slate-700 dark:!text-slate-300",
            timeInput: "rounded-md dark:!bg-slate-800 dark:!text-slate-300",
            selectorButton:
              "rounded-md dark:!bg-slate-700 dark:!text-slate-400",
          }}
        />
      </div>
    );
  },
  size: columnSizes?.date_created_gmt || 150,
},
  {
    accessorKey: "attributes",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={"Attributes"}
        className="mr-1"
      />
    ),
    cell: ({ row }) => {
      return (
        <div
          className={cn(
            "capitalize flex flex-wrap gap-2 !line-clamp-2 max-sm:!hidden"
          )}
        >
          {row.original.attributes &&
            row.original.attributes.map((item, index) => (
              <Badge
                key={index}
                variant="outline"
                className="whitespace-nowrap"
              >
                {item.name}
              </Badge>
            ))}
        </div>
      );
    },
    edit: ({ row }) => <AttributesEdit row={row} />,
    filterFn: columnFilterFn,
    size: columnSizes?.attributes || 150,
  },
  {
    accessorKey: "type",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Type"} className="mr-1" />
    ),
    cell: ({ row }) => {
      return (
        <div
          className={cn(
            "capitalize font-semibold px-1 border rounded-md text-sm w-fit rtl:mr-2"
          )}
        >
          {__(row.original.type, "whizmanage")}
        </div>
      );
    },
    edit: ({ row }) => <TypeEdit row={row} />,
    filterFn: columnFilterFn,
    size: columnSizes?.type || 150,
  },
  {
    accessorKey: "post_password",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={"Password"}
        className="mr-1"
      />
    ),
    cell: ({ row }) => {
      return (
        <div className="capitalize font-semibold px-1 border rounded-md text-sm w-fit rtl:mr-2">
          {row.original.post_password
            ? row.original.post_password
            : __("No password", "whizmanage")}
        </div>
      );
    },
    edit: ({ row }) => {
      return (
        <div className="capitalize !line-clamp-1">
          <Input
            onChange={(e) => {
              row.original.post_password = e.target.value;
            }}
            defaultValue={row.original.post_password}
            className="h-8 min-w-40"
            onFocus={(event) => event.target.select()}
          />
        </div>
      );
    },
    size: columnSizes?.post_password || 150,
  },
  {
    accessorKey: "tags",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title={"Tags"}
          className="mr-1"
        />
      );
    },
    cell: ({ row }) => (
      <div
        className="flex flex-wrap !line-clamp-2 max-sm:!hidden"
        title={
          row.original.tags
            ? row.original.tags.map((tag) => tag.name).join(", ")
            : "Not tagged"
        }
      >
        {row.original.tags &&
          row.original.tags.map((tag, index) => (
            <Badge
              key={index}
              variant="outline"
              className="lowercase cursor-pointer whitespace-nowrap"
            >
              #{tag.name}
            </Badge>
          ))}
      </div>
    ),
    edit: ({ row }) =>
      row.original.tags ? (
        <MultiSelectEdit row={row} columnName="tags" />
      ) : (
        <></>
      ),
    filterFn: columnFilterFn,
    size: columnSizes?.tags || 150,
  },
  {
    accessorKey: "categories",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title={"Categories"}
          className="mr-1"
        />
      );
    },
    cell: ({ row }) => (
      <div
        className="capitalize flex flex-wrap gap-2 !line-clamp-2 max-sm:!hidden"
        title={
          row.original.categories
            ? row.original.categories.map((item) => item.name).join(", ")
            : "No categories"
        }
      >
        {row.original.categories &&
          row.original.categories.map((item, index) => (
            <Badge key={index} variant="outline" className="whitespace-nowrap">
              {item.name}
            </Badge>
          ))}
      </div>
    ),
    edit: ({ row }) =>
      row.original.categories ? (
        <MultiSelectEdit row={row} columnName="categories" />
      ) : (
        <></>
      ),
    filterFn: columnFilterFn,
    size: columnSizes?.categories || 150,
  },
  {
    accessorKey: "price",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title={"Price"}
          className="mr-1"
        />
      );
    },
    cell: ({ row }) => {
      const formatPrice = (price) => {
        return `${Number(price).toLocaleString("en-US")}`;
      };
      if (!row.original.has_options) {
        const salePrice = row.original.sale_price;
        const regularPrice = row.original.regular_price;
        return (
          <div className="capitalize pl-2 rtl:pr-4 !line-clamp-2 truncate text-wrap">
            <div>
              {salePrice && (
                <span
                  dangerouslySetInnerHTML={{ __html: window.currency }}
                  className="text-nowrap"
                />
              )}
              {salePrice && formatPrice(salePrice)}
            </div>
            <div
              title={formatPrice(regularPrice)}
              className={cn(
                salePrice &&
                "line-through text-slate-300 !line-clamp-2 truncate text-wrap"
              )}
            >
              <span
                dangerouslySetInnerHTML={{ __html: window.currency }}
                className="text-nowrap"
              />
              {formatPrice(regularPrice)}
            </div>
          </div>
        );
      } else {
        return (
          <div
            title={HTMLToText(row.original.price_html)}
            className="capitalize pl-2 rtl:pr-4 !line-clamp-2 truncate text-wrap"
          >
            {HTMLToText(row.original.price_html)}
          </div>
        );
      }
    },
    edit: ({ row }) => {
      if (row.original.has_options) {
        return (
          <div className="capitalize pl-2 rtl:pr-4">
            {HTMLToText(row.original.price_html)}
          </div>
        );
      } else {
        return <PriceEdit row={row} />;
      }
    },
    size: columnSizes?.price || 150,
  },
  {
    accessorKey: "date_on_sale_from",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title={"Sale Duration"}
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
        const optionsTime = { hour: "2-digit", minute: "2-digit" };
        const date = new Date(dateString); // Convert to JavaScript Date object directly
        return `${date.toLocaleDateString(
          "en-GB",
          optionsDate
        )} ${date.toLocaleTimeString("en-GB", optionsTime)}`;
      };

      if (!row.original.type || row.original.type === "simple") {
        return (
          <div className="capitalize !line-clamp-2 truncate text-wrap">
            {row.original.date_on_sale_from_gmt !== null ? (
              <div className="text-nowrap flex flex-nowrap gap-2">
                <span>{__("From", "whizmanage")}:</span>
                <span>
                  {formatDateTime(row.original.date_on_sale_from_gmt)}
                </span>
              </div>
            ) : (
              <div className="text-slate-400 flex flex-nowrap gap-2 text-nowrap">
                <span>{__("From", "whizmanage")}:</span>
                <span className="text-slate-300/80 dark:text-slate-500/80">
                  {__("Not scheduled", "whizmanage")}
                </span>
              </div>
            )}
            {row.original.date_on_sale_to_gmt !== null ? (
              <div className="text-nowrap flex flex-nowrap !gap-[29px]">
                <span>{__("To", "whizmanage")}:</span>
                <span>{formatDateTime(row.original.date_on_sale_to_gmt)}</span>
              </div>
            ) : (
              <div className="text-slate-400 flex flex-nowrap !gap-[29px] text-nowrap">
                <span>{__("To", "whizmanage")}: </span>
                <span className="text-slate-300/80 dark:text-slate-500/80">
                  {__("Not scheduled", "whizmanage")}
                </span>
              </div>
            )}
          </div>
        );
      } else {
        return null;
      }
    },
    edit: ({ row }) => <SaleDurationEditor row={row} />,
    size: columnSizes?.date_on_sale_from || 150,
  },
  {
    accessorKey: "yoast",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title={"Yoast"}
          className="mr-1"
        />
      );
    },
   cell: ({ row }) => <YoastSEOModal row={row} edit={false}/>,
    edit: ({ row }) => <YoastSEOModal row={row} edit={true}/>,
    size: columnSizes?.yoast || 150,
  },
  {
    accessorKey: "downloadable",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={"Downloadable"}
        className="mr-1"
      />
    ),
    cell: ({ row }) => {
      return (
        <div
          className={cn("capitalize font-semibold px-1 text-sm w-fit rtl:mr-2")}
        >
          {(!row.original.type || row.original.type === "simple") &&
            (row.original.downloadable ? __("Yes", "whizmanage") : __("No", "whizmanage"))}
        </div>
      );
    },
    edit: ({ row }) => {
      return !row.original.type || row.original.type === "simple" ? (
        <DownloadableEdit row={row} />
      ) : (
        <></>
      );
    },
    filterFn: columnFilterFn,
    size: columnSizes?.downloadable || 150,
  },
  {
    accessorKey: "shipping_class",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={"Shipping Class"}
        className="mr-1"
      />
    ),
    cell: ({ row }) => {
      const shippingSlug = row.original.shipping_class;

      const shippingClass =
        typeof window !== "undefined" && Array.isArray(window.shipping)
          ? window.shipping.find((c) => c.slug === shippingSlug)
          : null;

      return (
        <div className="capitalize font-medium text-sm rtl:mr-2">
          {shippingClass ? shippingClass.name : "—"}
        </div>
      );
    },
    edit: ({ row }) => {
      const [value, setValue] = useState(row.original.shipping_class || "");
      const shippingOptions =
        typeof window !== "undefined" && Array.isArray(window.shipping)
          ? window.shipping
          : [];

      return (
        <Select
          value={value}
          onValueChange={(selectedSlug) => {
            setValue(selectedSlug);
            row.original.shipping_class = selectedSlug;
          }}
        >
          <SelectTrigger className="capitalize font-medium px-4 border rounded-md text-sm w-fit rtl:mr-2 py-0 h-8">
            <SelectValue placeholder={__("Select delivery type", "whizmanage")} />
          </SelectTrigger>
          <SelectContent className="!p-0 min-w-fit max-w-fit dark:border-slate-600">
            {shippingOptions.map((shipping) => (
              <SelectItem
                key={shipping.slug}
                value={shipping.slug}
                className="capitalize cursor-pointer font-medium text-sm w-full rtl:mr-2 py-2 !rounded-none"
              >
                {shipping.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    },
    size: columnSizes?.shipping_class || 160,
  },
  {
    accessorKey: "sold_individually",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={"Sold individually"}
        className="mr-1"
      />
    ),
    cell: ({ row }) => {
      return (
        <div
          className={cn("capitalize font-semibold px-1 text-sm w-fit rtl:mr-2")}
        >
          {(!row.original.type || row.original.type === "simple") &&
            (row.original.sold_individually ? __("Yes", "whizmanage") : __("No", "whizmanage"))}
        </div>
      );
    },
    edit: ({ row }) => {
      const [isSoldIndividually, setIsSoldIndividually] = useState(
        row.original.sold_individually
      );
      const handleChange = () => {
        const newValue = !isSoldIndividually;
        setIsSoldIndividually(newValue);
        row.original.sold_individually = newValue;
      };
      return !row.original.type || row.original.type === "simple" ? (
        <CustomTooltip
          title={
            isSoldIndividually
              ? __("Switch to multiple quantity sales", "whizmanage")
              : __("Switch to single item sales", "whizmanage")
          }
          description={
            isSoldIndividually
              ? __(
              "Allow the product to be purchased in multiple quantities per order.",
              "whizmanage"
            )
              : __("Allow only one item to be purchased per order.", "whizmanage")
          }
        >
          <Switch
            className=""
            id="airplane-mode"
            checked={isSoldIndividually}
            onCheckedChange={handleChange}
          />
        </CustomTooltip>
      ) : (
        <></>
      );
    },
    size: columnSizes?.sold_individually || 150,
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
      <RichEditorModal row={row.original} title={"description"} />
    ),
    // <EditorEdit row={row.original} title={"description"} />,
    size: columnSizes?.description || 150,
  },
  {
    accessorKey: "slug",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Slug"
        className="mr-1"
      />
    ),
    cell: ({ row }) => (
      <div>{row.original.slug}</div>
    ),
    edit: ({ row }) => (
      <input
        defaultValue={row.original.slug}
        className="border px-2 py-1 rounded w-full"
        onChange={(e) => row.original.slug = e.target.value}
      />
    ),
    size: columnSizes?.slug || 150,
  },
  {
    accessorKey: "short_description",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title={"Short Description"}
          className="mr-1"
        />
      );
    },
    cell: ({ row }) =>
      row.depth == 0 ? (
        <div
          className="capitalize !line-clamp-2 truncate description-img text-wrap max-sm:hidden"
          title={HTMLToText(row.original.short_description)}
        >
          {HTMLToText(row.original.short_description)}
        </div>
      ) : (
        <></>
      ),
    edit: ({ row }) =>
      row.depth == 0 ? (
        <RichEditorModal row={row.original} title={"short_description"} />
      ) : (
        // <EditorEdit row={row.original} title={"short_description"} />
        (<></>)
      ),
    size: columnSizes?.short_description || 150,
  },
  {
    accessorKey: "stock_quantity",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title={"Inventory"}
          className="mr-1"
        />
      );
    },
    cell: ({ row }) => {
      return (
        <div
          className={cn(
            inventoryStyles(row.original),
            "uppercase !text-sm font-semibold"
          )}
        >
          {row.original.manage_stock
            ? row.original.stock_quantity
            : __(row.original.stock_status, "whizmanage")}
        </div>
      );
    },
    edit: ({ row }) => <InventoryEdit row={row} />,
    size: columnSizes?.stock_quantity || 150,
  },
  {
    accessorKey: "weight",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title={"Weight"}
          className="mr-1"
        />
      );
    },
    cell: ({ row }) => <div className="capitalize">{row.original.weight}</div>,
    edit: ({ row }) => (
      <div className="capitalize !line-clamp-1">
        <Input
          onChange={(e) => {
            row.original.weight = e.target.value;
          }}
          defaultValue={row.original.weight}
          className="h-8 min-w-40"
          onFocus={(event) => event.target.select()}
        />
      </div>
    ),
    size: columnSizes?.weight || 150,
  },
  {
    accessorKey: "sku",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader column={column} title={"SKU"} className="mr-1" />
      );
    },
    cell: ({ row }) => <div className="capitalize">{row.original.sku}</div>,
    edit: ({ row }) => (
      <div className="capitalize !line-clamp-1">
        <Input
          onChange={(e) => {
            row.original.sku = e.target.value;
          }}
          defaultValue={row.original.sku}
          className="h-8 min-w-40"
          onFocus={(event) => event.target.select()}
        />
      </div>
    ),
    size: columnSizes?.SKU || 150,
  },
  {
    accessorKey: "global_unique_id",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={__("Barcode", "whizmanage")}
        className="mr-1"
      />
    ),
    cell: ({ row }) => (
      <div className="capitalize !line-clamp-1 text-sm rtl:text-right ltr:text-left">
        {row.original.global_unique_id || "—"}
      </div>
    ),
    edit: ({ row }) => {
      const [value, setValue] = useState(row.original.global_unique_id || "");
      const [error, setError] = useState("");

      const handleChange = (e) => {
        const raw = e.target.value;

        // סינון בפועל — נשאיר רק מספרים ומקפים
        const cleaned = raw.replace(/[^0-9\-]/g, "");

        if (raw !== cleaned) {
          setError(t("Only numbers and dashes (-) are allowed"));
        } else {
          setError("");
        }

        setValue(cleaned);
        row.original.global_unique_id = cleaned;
      };

      return (
        <div className="flex flex-col items-start gap-1">
          <Input
            value={value}
            onChange={handleChange}
            placeholder={__("Enter barcode", "whizmanage")}
            className="h-8 min-w-40"
            onFocus={(event) => event.target.select()}
          />
          {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
      );
    },
    size: columnSizes?.global_unique_id || 160,
  },
  {
    accessorKey: "dimensions",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title={"Dimensions"}
          className="mr-1"
        />
      );
    },
    cell: ({ row }) => {
      return (
        <div className="text-xs text-slate-400/80">
          <div className="capitalize flex gap-1">
            <span className="font-bold">{__("Width", "whizmanage")}:</span>
            <span>{row?.original?.dimensions?.width || ""}</span>
          </div>
          <div className="capitalize flex gap-1">
            <span className="font-bold">{__("Height", "whizmanage")}:</span>
            <span>{row?.original?.dimensions?.height || ""}</span>
          </div>
          <div className="capitalize flex gap-1">
            <span className="font-bold">{__("Length", "whizmanage")}:</span>
            <span>{row?.original?.dimensions?.length || ""}</span>
          </div>
        </div>
      );
    },
    edit: ({ row }) => <DimensionsEdit row={row} />,
    size: columnSizes?.dimensions || 150,
  },
  {
    accessorKey: "meta_data",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title={"Meta Data"}
          className="mr-1"
        />
      );
    },
    cell: ({ row }) => (
      <MetaData row={row.original} allMetaData={mergedMetaData} />
    ),
    edit: ({ row }) => (
      <MetaData row={row.original} edit={true} allMetaData={mergedMetaData} />
    ),
    size: columnSizes?.meta_data || 150,
  },
  {
    accessorKey: "upsell_ids",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title={"Linked Products"}
          className="mr-1"
        />
      );
    },
    cell: ({ row }) => {
      const { data } = useProductsContext();
      const upSells = row.original.upsell_ids;
      if (!upSells) {
        return;
      }
      const upSellNames = upSells
        ?.map((id) => {
          const product = data.find((item) => item.id === id);
          return product ? product.name : null;
        })
        .filter((name) => name !== null);
      const crossSells = row.original.cross_sell_ids;
      const crossSellNames = crossSells
        .map((id) => {
          const product = data.find((item) => item.id === id);
          return product ? product.name : null;
        })
        .filter((name) => name !== null);
      return (
        <div className="capitalize pl-2 rtl:pr-4">
          <div
            className="capitalize flex flex-nowrap gap-2 !line-clamp-1 max-sm:!hidden"
            title={
              upSellNames.length > 0
                ? upSellNames.map((item) => item).join(", ")
                : __("No products", "whizmanage")
            }
          >
            <span
              className={cn(upSellNames.length < 1 && "text-muted-foreground")}
            >
              {__("Up", "whizmanage")}:{" "}
            </span>
            {upSellNames.map((item, index) => (
              <Badge
                key={index}
                variant="outline"
                className="whitespace-nowrap"
              >
                <span>{item}</span>
              </Badge>
            ))}
          </div>
          <div
            className="capitalize flex flex-nowrap gap-2 !line-clamp-1 max-sm:!hidden"
            title={
              crossSellNames.length > 0
                ? crossSellNames.map((item) => item).join(", ")
                : __("No products", "whizmanage")
            }
          >
            <span
              className={cn(
                crossSellNames.length < 1 && "text-muted-foreground"
              )}
            >
              {__("Cross", "whizmanage")}:{" "}
            </span>
            {crossSellNames.map((item, index) => (
              <Badge
                key={index}
                variant="outline"
                className="whitespace-nowrap"
              >
                <span> {item}</span>
              </Badge>
            ))}
          </div>
        </div>
      );
    },
    edit: ({ row }) => <LinkedProducts row={row} edit={true} />,
    size: columnSizes?.upsell_ids || 150,
  },
   {
    accessorKey: "purchase_note",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title={"Purchase Note"}
          className="mr-1"
        />
      );
    },
    cell: ({ row }) => {
      return (
        <div className="capitalize pl-2 rtl:pr-4">
          {row.original.purchase_note ? row.original.purchase_note : "—"}
        </div>
      );
    },
    edit: ({ row }) => {
      return (
        <div className="capitalize !line-clamp-1">
          <Input
            onChange={(e) => {
              row.original.purchase_note = e.target.value;
            }}
            defaultValue={row.original.purchase_note}
          />
        </div>
      )
    },
    size: columnSizes?.purchase_note || 150,
  },
  {
    accessorKey: "images",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title={"Product gallery"}
          className="mr-1"
        />
      );
    },
    cell: ({ row }) => {
      return row.original.images && row.original.images.length > 1 ? (
        <Carousel className="w-full max-h-14">
          <CarouselContent>
            {row.original.images.slice(1).map((image, index) => (
              <CarouselItem key={index}>
                <div className="flex items-center w-full justify-center p-1 h-14 bg-transparent">
                  <img
                    src={image.src}
                    className="max-h-full object-contain !mix-blend-hard-light rounded"
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      ) : (
        <div className="flex items-center w-full justify-center p-0 h-14 bg-transparent text-slate-300">
          {__("No images", "whizmanage")}
        </div>
      );
    },

    edit: ({ row }) =>
      row.original.images ? <GalleryEdit row={row} /> : <></>,
    size: columnSizes?.images || 150,
  },
  {
    accessorKey: "menu_order",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title={"Menu Order"}
          className="mr-1"
        />
      );
    },
    cell: ({ row }) => {
      return (
        <div className="pl-2 rtl:pr-4">{row.original.menu_order ?? 0}</div>
      );
    },
    edit: ({ row }) => {
      // const {data,setData} = useProductsContext();
      return (
        <div className="relative flex h-8 min-w-32 rtl:min-w-40 rounded-md border border-input bg-background dark:bg-slate-700 pl-4 rtl:pl-0 rtl:pr-4 py-1 text-sm ring-offset-background overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 rtl:right-0 flex items-center pl-3 rtl:pl-0 rtl:pr-3"></div>
          <Input
            type="number"
            min={0}
            defaultValue={row.original.menu_order ?? 0}
            onChange={(e) => {
              const newValue = parseInt(e.target.value, 10) || 0;
              row.original.menu_order = newValue;
            }}
            className="block border-0 pl-2 rtl:pl-0 dir flex-1 invalid:border-red-500 dark:!text-slate-300 !border-none !ring-0 !ring-offset-0 w-24 max-w-24 rtl:w-20 -mt-1 h-fit !py-0 placeholder:text-slate-300 dark:placeholder:text-slate-500"
            placeholder="0"
            onFocus={(event) => event.target.select()}
          />
          <HoverCard openDelay={300}>
            <HoverCardTrigger asChild>
              <AlertTriangle className="size-3.5 text-fuchsia-600 text-opacity-60 hover:text-opacity-100 cursor-pointer my-1 mx-2 flex-shrink-0" />
            </HoverCardTrigger>
            <HoverCardContent className="w-64 z-50" side="top" align="end">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">Order Change Notice</h4>
                <p className="text-sm text-muted-foreground">
                  After saving menu order changes, refresh the page to see the
                  updated row order. For easier reordering, drag and drop rows
                  instead.
                </p>
              </div>
            </HoverCardContent>
          </HoverCard>
        </div>
      );
    },
    size: columnSizes?.menu_order || 100,
  },
  {
    accessorKey: "featured",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Featured"
        className="mr-1"
      />
    ),
    cell: ({ row }) => {
      if (row.original.parent_id !== 0) return null;

      const featured = row.original.featured;
      const [loading, setLoading] = useState(false);

      const toggleFeatured = async () => {
        try {
          setLoading(true);
          row.original.featured = !featured;
          await putApi(`${window.siteUrl}/wp-json/wc/v3/products/${row.original.id}`, { featured: !featured });
        } catch (err) {
          console.error("Error toggling featured", err);
        } finally {
          setLoading(false);
        }
      };

      return (
        <button
          onClick={toggleFeatured}
          disabled={loading}
          className="flex items-center justify-center w-10 h-10 p-0 bg-transparent border-none"
        >
          {featured ? (<StarIconFilled color="#FFD700" size={20} />) : (<StarIconOutline color="#ccc" size={20} />)}
        </button>
      );
    },
    edit: ({ row }) => {
      if (row.original.parent_id !== 0) return null;

      const featured = row.original.featured;

      return (
        <button
          onClick={() => row.original.featured = !featured}
          className="flex items-center justify-center w-10 h-10 p-0 bg-transparent border-none"
        >
          {featured ? (<StarIconFilled color="#FFD700" size={20} />) : (<StarIconOutline color="#ccc" size={20} />)}
        </button>
      );
    },
    size: columnSizes?.featured || 150,
  },

  ...customFields,
  ...showTaxonomies,
];
