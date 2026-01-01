// src/components/pages/table/products/products.columns.js
import { __ } from "@wordpress/i18n";
import StatusDisplay from "@/components/table/components/StatusDisplay";
import StatusEdit from "@/components/table/components/StatusEdit";
import MediaDisplay from "@components/media/MediaDisplay.jsx";
import MediaEdit from "@components/media/MediaEdit.jsx";
import { EditableCell } from "@components/table/core/EditableCell.jsx";
import RangeInlineCell from "@components/table/core/RangeInlineCell.jsx";
import { columnFilterFn } from "@components/table/filters/ColumnFilter.jsx";
import {
  ensureMedia,
  ensureMediaArray,
  serializeMetaValue,
} from "@components/table/utils/mediaUtils";
import { createColumnHelper } from "@tanstack/react-table";
import { Link2, Package } from "lucide-react";
import { formatCurrency, formatValue } from "../../../../utils/formatValue.js"; // 👈 תיקון סיומת
import CategoryTagsDisplay from "../../components/CategoryTagsDisplay.jsx";
import CategoryTagsEdit from "../../components/CategoryTagsEdit";
import AttributesDisplay from "./components/AttributesDisplay.jsx";
import DateRangeDisplay from "./components/DateRangeDisplay";
import DateRangeEdit from "./components/DateRangeEdit";
import DimensionsDisplay from "./components/DimensionsDisplay.jsx";
import DimensionsEdit from "./components/DimensionsEdit.jsx";
import DownloadableCell from "./components/DownloadableCell.jsx";
import FeaturedCell from "./components/FeaturedCell.jsx";
import InventoryDisplay from "./components/InventoryDisplay";
import InventoryEdit from "./components/InventoryEdit";
import RichTextDisplay from "./components/RichTextDisplay";
import RichTextEdit from "./components/RichTextEdit";
import SoldIndividuallyCell from "./components/SoldIndividuallyCell.jsx";
import TypeWithSettingsCell from "./components/TypeWithSettingsCell";
import VariationNameDisplay from "./components/VariationNameDisplay.jsx";
import VariationNameEdit from "./components/VariationNameEdit.jsx";
import YoastSEOModal from "./components/YoastSEOModal.jsx";
import LinkedProductsCell from "./components/LinkedProductsCell.jsx";
import {
  handleCategoriesUpdate,
  mediaApi,
  productsApi,
} from "./products.api.js";
import { PRODUCT_STATUS_KEYS } from "./products.constants.js";

// ---------------- META: helpers & sources ----------------


const acfMetaRaw =
  typeof window !== "undefined" && Array.isArray(window?.WhizManageCustomFields)
    ? window.WhizManageCustomFields
    : [];

const allMetaDataRaw =
  typeof window !== "undefined" ? window?.metaKey || [] : [];

// סינון מקדים לכל מקור: הוצא איברים בלי key / עם key ריק
const sanitizeMetaList = (list) =>
  (Array.isArray(list) ? list : [])
    .filter(
      (item) => item && typeof item.key === "string" && item.key.trim() !== "" // <-- מסנן key ריק
    )
    .map((item) => ({
      ...item,
      key: item.key.trim(),
    }));

const acfMeta = sanitizeMetaList(acfMetaRaw);
const allMetaData = sanitizeMetaList(allMetaDataRaw);

// הוצאת כפילויות בין allMetaData ל-ACF (לפי key)
const acfMetaKeysSet =
  acfMeta.length > 0 ? new Set(acfMeta.map(({ key }) => key)) : null;

const filteredAllMetaData = acfMetaKeysSet
  ? allMetaData.filter(({ key }) => !acfMetaKeysSet.has(key))
  : allMetaData;

const normalizeChoices = (raw) => {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    const obj =
      raw.choices && typeof raw.choices === "object" ? raw.choices : raw;
    return Object.entries(obj).map(([value, label]) => ({ value, label }));
  }
  return [];
};

const mapToMetaData = ({ key = "", label, type, choices, ...rest }) => {
  let finalType = type || "text";

  return {
    key,
    label: label || (typeof key === "string" ? key.replace(/_/g, " ") : ""),
    type: finalType,
    choices: normalizeChoices(choices),
    ...rest,
  };
};

const mergedMetaData = [
  ...acfMeta.map(mapToMetaData),
  ...filteredAllMetaData.map(mapToMetaData),
].filter((f) => typeof f.key === "string" && f.key.trim() !== "");

// אחרי — קודם שטוח ואז meta_data
const getMetaValue = (row, key) => {
  if (
    row &&
    Object.prototype.hasOwnProperty.call(row, key) &&
    row[key] !== undefined
  ) {
    return row[key];
  }

  const md = Array.isArray(row?.meta_data) ? row.meta_data : [];
  const entry = md.find((m) => m?.key === key);
  if (entry) return entry.value;

  return "";
};

const setMetaValue = (row, key, value) => {
  const md = Array.isArray(row?.meta_data) ? [...row.meta_data] : [];
  const i = md.findIndex((m) => m?.key === key);
  if (i >= 0) {
    md[i] = { ...md[i], value };
  } else {
    md.push({ key, value });
  }
  return md;
};

const isImageKey = (key = "") =>
  /(^|_)(image|thumbnail|featured_image|thumb|_thumbnail_id)($|_)/i.test(key);

const isGalleryKey = (key = "") =>
  /(^|_)(gallery|images|pics|photos)($|_)/i.test(key);

const PriceHtml = ({ html }) => {
  if (!html) return <span>—</span>;
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
};

// ---------------------------------------------------------

const columnHelper = createColumnHelper();

// -------- META columns factory --------
const createMetaColumns = (store, __ ,handleCellUpdate) =>
  mergedMetaData.map((field) => {
    const { key, label, type, choices } = field;
    const isImg = type === "image" || isImageKey(key);
    const isGal = type === "gallery" || isGalleryKey(key);
    let editType = "text";
    let editOptions = {};
    let customDisplayComponent;
    let customEditComponent;
    let autoFinishOnChange = false;

    let displayFormat =
      isImg || isGal
        ? undefined
        : {
          formatValue: (v) =>
            v == null || v === "" ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              String(v)
            ),
        };

    if (isImg || isGal) {
      editType = "custom";
      customDisplayComponent = MediaDisplay;
      customEditComponent = MediaEdit;
      editOptions = {
        multiple: isGal,
        maxSelection: isGal ? 100 : undefined,
        title: isGal ? __("Select Gallery Images", "whizmanage") : __("Select Product Image", "whizmanage"),
      };
    } else if (type === "select" && Array.isArray(choices) && choices.length) {
      editType = "select";
      editOptions.options = choices.map((c) =>
        typeof c === "string"
          ? { value: c, label: __(c, "whizmanage") }
          : { value: c.value, label: __(c.label ?? c.value, "whizmanage") }
      );
    } else if (type === "boolean" || type === "switcher") {
      editType = "switch";
    } else if (type === "number") {
      editType = "number";
      editOptions = { min: 0, step: 1 };
    } else if (type === "date") {
      editType = "date";
    } else if (type === "range") {
      editType = "custom";
      editOptions = {
        min: field.min ?? 0,
        max: field.max ?? 100,
        step: field.step ?? 1,
        prefix: field.prefix ?? "",
        suffix: field.suffix ?? "",
        showNumber: field.showNumber ?? true,
        wait: field.wait ?? 250,
        maxWait: field.maxWait,
        inputWidth: field.inputWidth ?? 56,
      };
      displayFormat = {
        formatValue: (val) => {
          if (val == null || val === "") return "—";
          const n = Number(val);
          const txt = Number.isFinite(n) ? String(n) : String(val);
          return `${editOptions.prefix || ""}${txt}${editOptions.suffix || ""}`;
        },
      };
    } else if (type === "wysiwyg") {
      editType = "custom";
      customDisplayComponent = RichTextDisplay;
      customEditComponent = RichTextEdit;
      displayFormat = undefined;
      editOptions = {
        placeholder: field.placeholder || __("Enter content", "whizmanage"),
        format: field.format || "html",
        help: field.help || "",
      };
    }

    return columnHelper.accessor(
      (row) => {
        const raw = getMetaValue(row, key);
        if (isImg) return ensureMedia(raw);
        if (isGal) return ensureMediaArray(raw);
        return raw;
      },
      {
        id: key,
        header: __(label, "whizmanage"),
        size: type === "range" ? 220 : 160,
        minSize: type === "range" ? 100 : 120,
        maxSize: type === "range" ? 360 : 300,
        enableResizing: true,
        meta: {
          editable: true,
          editType,
          editOptions,
          ...(customDisplayComponent || customEditComponent
            ? {
              customDisplayComponent,
              customEditComponent,
              autoFinishOnChange,
            }
            : { displayFormat }),
        },
        filterFn: columnFilterFn,
        cell: (props) => {
          if (type === "range") {
            return <RangeInlineCell {...props} />;
          }
          return (
            <EditableCell
              {...props}
              onUpdate={async (_id, _colId, value, rowData, isFromHistory) => {
                const rowId = rowData.id;
                if (!isImg && !isGal) {
                  const sendVal =
                    typeof value === "boolean" ? (value ? "1" : "0") : value;
                  return await handleCellUpdate(
                    rowId,
                    key,
                    sendVal,
                    rowData,
                    isFromHistory
                  );
                }
                const prevRaw = getMetaValue(rowData, key);
                const prevDisplayVal = isImg
                  ? ensureMedia(prevRaw || null)
                  : ensureMediaArray(prevRaw || []);
                const displayVal = isImg
                  ? ensureMedia(value || null)
                  : ensureMediaArray(value || []);
                const newMeta = setMetaValue(rowData, key, value);
                if (typeof store.updateItemWithHistory === "function") {
                  try {
                    store.updateItemWithHistory(
                      rowId,
                      { [key]: displayVal, meta_data: newMeta },
                      true,
                      key
                    );
                  } catch {
                    store.updateItemWithHistory(rowId, {
                      [key]: displayVal,
                      meta_data: newMeta,
                    });
                    store.undoRedoHistory?.addToHistory?.({
                      type: "update",
                      id: rowId,
                      field: key,
                      previousValues: {
                        [key]: prevDisplayVal,
                        meta_data: rowData.meta_data,
                      },
                      newValues: { [key]: displayVal, meta_data: newMeta },
                      rowData: { ...rowData },
                      timestamp: Date.now(),
                    });
                  }
                } else {
                  store.updateItem(rowId, {
                    [key]: displayVal,
                    meta_data: newMeta,
                  });
                }
                try {
                  const serverMeta = newMeta.map((m) => ({
                    ...(m.id != null ? { id: m.id } : {}),
                    key: m.key,
                    value: serializeMetaValue(m.value),
                  }));
                  await productsApi.updateMeta(rowId, serverMeta, rowData);
                  return true;
                } catch (e) {
                  const rollbackMeta = setMetaValue(rowData, key, prevRaw);
                  const rollbackPatch = {
                    [key]: prevDisplayVal,
                    meta_data: rollbackMeta,
                  };
                  if (typeof store.updateItemWithHistory === "function") {
                    store.updateItemWithHistory(rowId, rollbackPatch, false);
                  } else {
                    store.updateItem(rowId, rollbackPatch);
                  }
                  throw e;
                }
              }}
            />
          );
        },
      }
    );
  });

// -------- Taxonomies --------
export const createTaxonomyColumns = (store, __) => {
  const taxonomies =
    typeof window !== "undefined"
      ? // מסננים החוצה טקסונומיות ליבה כדי לא ליצור כפילויות לעמודות Categories/Tags
      window.listTaxonomies?.filter(
        (i) =>
          ![
            "product_cat",
            "_product_cat",
            "categories",
            "product_tag",
            "tags",
          ].includes(i.name)
      ) || []
      : [];

  return taxonomies.map((taxonomy) => ({
    accessorKey: taxonomy.name,
    id: taxonomy.name,
    header: __(taxonomy.label, "whizmanage"),
    size: 180,
    minSize: 150,
    maxSize: 300,
    enableResizing: true,
    meta: {
      editable: true,
      editType: "custom",
      customDisplayComponent: CategoryTagsDisplay,
      customEditComponent: CategoryTagsEdit,
      autoFinishOnChange: false,
      editOptions: {
        label: taxonomy.label,
        hierarchical: taxonomy.hierarchical || false,
        taxonomyType: taxonomy.name, // ← השם מה-window.listTaxonomies
        allowCreate: true,
        allowEdit: true,
        allowDelete: true,
      },
    },
    filterFn: columnFilterFn,
    cell: (props) => (
      <EditableCell
        {...props}
        onUpdate={(id, _colId, value, rowData, isFromHistory) => {
          return handleCategoriesUpdate(
            id,
            taxonomy.name,
            value,
            rowData,
            store,
            isFromHistory
          );
        }}
      />
    ),
  }));
};

// פונקציה עוזרת לזיהוי אם השורה היא וריאציה
const isVariation = (row) => {
  const data = row?.original || row;
  if (data?.parent_id && data.parent_id > 0) return true;
  if (row?.depth > 0) return true;
  return false;
};

// HOC לעטיפת קומפוננטת Cell עם התנהגות מיוחדת לווריאציות
const withVariationBehavior = (
  CellComponent,
  behavior = "editable",
  fallbackText = null
) => {
  return (props) => {
    const { row, column } = props;
    const isVar = isVariation(row);
    const t = props.table?.options?.meta?.t || ((x) => x);

    if (!isVar) {
      return <CellComponent {...props} />;
    }

    switch (behavior) {
      case "hidden":
        return null;

      case "readonly":
        const value = props.getValue
          ? props.getValue()
          : props.row.original[props.column.id];
        return (
          <div className="px-3 py-2 text-slate-500 dark:text-slate-300">
            {value || fallbackText || "—"}
          </div>
        );

      case "readonlyWithComponent":
        const CustomDisplay = column.columnDef.meta?.customDisplayComponent;
        if (CustomDisplay) {
          const currentValue = props.getValue
            ? props.getValue()
            : props.row.original[props.column.id];
          return (
            <div className="px-3 py-2 pointer-events-none">
              <CustomDisplay
                value={currentValue}
                row={row}
                column={column}
                __={__}
                editOptions={column.columnDef.meta?.editOptions}
              />
            </div>
          );
        }
        const val = props.getValue
          ? props.getValue()
          : props.row.original[props.column.id];
        return (
          <div className="px-3 py-2 text-slate-500 dark:text-slate-300">
            {val || fallbackText || "—"}
          </div>
        );

      case "showVariationType":
        return (
          <div className="px-3 py-2 flex items-center gap-2 text-slate-400 text-sm italic">
            <Package className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-xs font-medium">
              {typeof fallbackText === 'function' ? fallbackText() : __(fallbackText || "Product Variation", "whizmanage")}
            </span>
          </div>
        );

      case "inheritFromParent":
        return (
          <div className="px-3 py-2 flex items-center gap-2 text-slate-400 dark:text-slate-500">
            <Link2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-xs italic">
              {typeof fallbackText === 'function' ? fallbackText() : __(fallbackText || "Inherited from parent", "whizmanage")}
            </span>
          </div>
        );

      case "inheritDisplay":
        return (
          <div className="px-3 py-2">
            <span className="text-slate-400 text-sm italic">
              {typeof fallbackText === 'function' ? fallbackText() : __(fallbackText || "Same as parent", "whizmanage")}
            </span>
          </div>
        );

      case "editable":
      default:
        return <CellComponent {...props} />;
    }
  };
};

export const createProductsColumns = (store, __ ,handleCellUpdate) => {
  // יצירת העמודות
  const baseColumns = [
    columnHelper.accessor("name", {
      header: __("Name", "whizmanage"),
      size: 250,
      minSize: 150,
      meta: {
        editable: true,
        editType: "text",
        customDisplayComponent: VariationNameDisplay,
        customEditComponent: VariationNameEdit,
        autoFinishOnChange: false,
      },
      accessorFn: (row) => {
        // בdדיקה נכונה לזיהוי ווריאציה - בתוך accessorFn, row הוא האובייקט הגולמי
        // ולכן row.depth לא קיים. צריך לבדוק לפי parent_id
        const isVariationRow = row.parent_id && row.parent_id > 0;
        if (isVariationRow) {
          return {
            name: row.name,
            attributes: row.attributes || [],
            parent_id: row.parent_id,
          };
        }
        return row.name || "";
      },
      cell: (props) => (
        <EditableCell
          {...props}
          onUpdate={async (id, field, value, rowData, isFromHistory) => {
            const handleCellUpdate =
              props.table?.options?.meta?.handleCellUpdate;
            if (!handleCellUpdate) {
              console.error("handleCellUpdate not found in meta.");
              throw new Error("Missing required table handler.");
            }

            const isVariationUpdate = Array.isArray(value);

            if (isVariationUpdate) {
              // זו ווריאציה, עדכן 'attributes'
              await handleCellUpdate(
                id,
                "attributes", // 👈 שדה המקור
                value,
                rowData,
                isFromHistory
              );

              // עדכן לוקאלית את השם הנגזר (ללא היסטוריה)
              const store = props.table?.options?.meta?.store;
              const variationName = value
                .map((attr) => attr.option || "")
                .filter(Boolean)
                .join(" - ");
              store?.updateItem(id, { name: variationName || rowData.name });

              return true;
            } else {
              // זה מוצר רגיל, עדכן 'name'
              await handleCellUpdate(
                id,
                "name", // 👈 שדה "name"
                value,
                rowData,
                isFromHistory
              );
              return true;
            }
          }}
        />
      ),
    }),

    columnHelper.accessor("sku", {
      header: __("SKU", "whizmanage"),
      size: 130,
      minSize: 130,
      maxSize: 200,
      enableResizing: true,
      meta: {
        editable: true,
        editType: "text",
        editOptions: {
          placeholder: __("e.g. PROD-001", "whizmanage"),
        },
        validationRules: [
          { required: false },
          {
            custom: (value, row) => {
              if (!value) return true;
              const exists = store.data?.some(
                (item) => item.sku === value && item.id !== row?.id
              );
              return !exists;
            },
            message: __("This product code already exists", "whizmanage"),
          },
        ],
      },
      cell: (props) => <EditableCell {...props} onUpdate={handleCellUpdate} />,
    }),

    columnHelper.accessor("slug", {
      header: __("Slug", "whizmanage"),
      size: 220,
      minSize: 160,
      maxSize: 280,
      enableResizing: true,
      meta: {
        editable: true,
        editType: "text",
        editOptions: {
          placeholder: __("e.g. my-product", "whizmanage"),
          slugify: true,
        },
        onValidate: (rawVal, row) => {
          // ... (לוגיקת הולידציה שלך נשארת) ...
          const raw = String(rawVal ?? "").trim();
          const cleaned = raw
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-+|-+$/g, "");
          const uriBytes = encodeURIComponent(cleaned).length;
          if (uriBytes > 200) {
            return "Slug is too long";
          }
          const exists = Array.isArray(window?.listProduct)
            ? window.listProduct.some(
              (p) => p?.slug === cleaned && p?.id !== row?.id
            )
            : false;
          if (exists) {
            return "Slug already exists";
          }
          return null;
        },
      },
      accessorFn: (row) => row.slug || "",
      cell: (props) => (
        <EditableCell
          {...props}
          onUpdate={async (id, _field, value, rowData, isFromHistory) => {
            const handleCellUpdate =
              props.table?.options?.meta?.handleCellUpdate;
            if (!handleCellUpdate) {
              console.error("handleCellUpdate not found in meta.");
              throw new Error("Missing required table handler.");
            }

            // --- לוגיקת ניקוי ה-slug (נשארת) ---
            const raw = String(value ?? "").trim();
            let cleaned = raw
              .replace(/\s+/g, "-")
              .replace(/-+/g, "-")
              .replace(/^-+|-+$/g, "");

            const MAX_VISIBLE = 200;
            let finalSlug;
            if (typeof Intl !== "undefined" && Intl.Segmenter) {
              const segs = [
                ...new Intl.Segmenter(undefined, {
                  granularity: "grapheme",
                }).segment(cleaned),
              ];
              finalSlug =
                segs.length > MAX_VISIBLE
                  ? segs.slice(0, MAX_VISIBLE).join("")
                  : cleaned;
            } else {
              const arr = [...cleaned];
              finalSlug =
                arr.length > MAX_VISIBLE
                  ? arr.slice(0, MAX_VISIBLE).join("")
                  : cleaned;
            }
            // --- סוף לוגיקת ניקוי ---

            try {
              // קרא *רק* ל-handleCellUpdate.
              await handleCellUpdate(
                id,
                "slug",
                finalSlug,
                rowData,
                isFromHistory
              );
              return true;
            } catch (err) {
              throw err;
            }
          }}
        />
      ),
    }),

    columnHelper.accessor("regular_price", {
      header: __("Regular Price", "whizmanage"),
      size: 130,
      minSize: 130,
      maxSize: 200,
      enableResizing: true,
      meta: {
        editable: true,
        editType: "number",
        displayFormat: {
          formatValue: (value) =>
            value != null && value !== "" ? formatValue(value, "currency") : "",
        },
        editOptions: {
          format: "currency",
          min: 0,
          step: 0.01,
          placeholder: __("0.00", "whizmanage"),
        },
        validationRules: [
          { required: false },
          { min: 0, message: __("Price cannot be negative", "whizmanage") },
          {
            // ✅ רגיל לא יכול להיות נמוך ממבצע; אם יש מבצע—חייב להיות רגיל > 0
            custom: (value, row) => {
              const rp = parseFloat(value || 0);
              const sp = parseFloat(row.sale_price || 0);
              if (sp > 0) return rp > 0 && rp >= sp;
              return true;
            },
            message: __("Regular price cannot be lower than sale price", "whizmanage"),
          },
        ],
      },
      cell: (props) => {
        const rowData = props?.row?.original || {};
        const isVariableParent =
          rowData?.type === "variable" && !rowData?.parent_id;

        if (isVariableParent) {
          const hasChildren =
            Array.isArray(props.row.original.subRows) &&
            props.row.original.subRows.length > 0;

          if (!hasChildren) return <PriceHtml html="" />; // אין וריאציות ⇒ מציג "—"

          // יש וריאציות ⇒ חישוב טווח מה-subRows
          const html = (() => {
            const vs = props.row.original.subRows
              .map((v) => {
                const s = parseFloat(v.sale_price);
                const r = parseFloat(v.regular_price);
                return isFinite(s) && s > 0
                  ? s
                  : isFinite(r) && r > 0
                    ? r
                    : NaN;
              })
              .filter(Number.isFinite);

            if (!vs.length) return rowData.price_html;

            const min = Math.min(...vs);
            const max = Math.max(...vs);

            if (min === max) return formatCurrency(min);
            return `${formatCurrency(min)} – ${formatCurrency(max)}`;
          })();

          return <PriceHtml html={html} />;
        }

        // ילדים/מוצר פשוט: עריכה רגילה
        return <EditableCell {...props} onUpdate={handleCellUpdate} />;
      },
    }),

    columnHelper.accessor("sale_price", {
      header: __("Sale Price", "whizmanage"),
      size: 120,
      minSize: 100,
      maxSize: 200,
      enableResizing: true,
      meta: {
        editable: true,
        editType: "number",
        displayFormat: {
          formatValue: (value) =>
            value != null && value !== "" ? formatValue(value, "currency") : "",
        },
        editOptions: {
          format: "currency",
          min: 0,
          step: 0.01,
          placeholder: __("0.00", "whizmanage"),
        },
        validationRules: [
          { required: false },
          { min: 0, message: __("Price cannot be negative", "whizmanage") },
          {
            // ✅ אם יש מבצע—חייב להיות רגיל > 0, ומבצע ≤ רגיל
            custom: (value, row) => {
              const rp = parseFloat(row.regular_price || 0);
              const sp = parseFloat(value || 0);
              if (sp > 0) return rp > 0 && sp <= rp;
              return true;
            },
            message: __("Sale price must be > 0 and ≤ regular price", "whizmanage"),
          },
        ],
      },
      cell: (props) => {
        const rowData = props?.row?.original || {};
        const isVariableParent =
          rowData?.type === "variable" && !rowData?.parent_id;

        if (isVariableParent) return <span>—</span>;

        return <EditableCell {...props} onUpdate={handleCellUpdate} />;
      },
    }),

    columnHelper.accessor("inventory", {
      header: __("Inventory", "whizmanage"),
      size: 140,
      minSize: 120,
      maxSize: 180,
      enableResizing: true,
      meta: {
        editable: true,
        editType: "custom",
        customDisplayComponent: InventoryDisplay,
        customEditComponent: InventoryEdit,
        autoFinishOnChange: false,
      },
      accessorFn: (row) => ({
        manage_stock: row.manage_stock,
        stock_quantity: row.stock_quantity || row.stock,
        low_stock_amount: row.low_stock_amount,
        stock_status: row.stock_status,
        backorders: row.backorders,
      }),
      cell: (props) => (
        <EditableCell
          {...props}
          onUpdate={async (id, field, value, rowData, isFromHistory) => {
            // שלח לשרת כאובייקט אחד - productsMasterUpdateCell מטפל בעדכון ה-store
            await handleCellUpdate(
              id,
              "inventory",
              value,
              rowData,
              isFromHistory
            );
            return true;
          }}
        />
      ),
    }),

    columnHelper.display({
      id: "yoast",
      header: __("Yoast", "whizmanage"),
      size: 64,
      minSize: 56,
      maxSize: 80,
      enableResizing: true,
      cell: ({ row }) => <YoastSEOModal row={row} store={store} />,
    }),

    columnHelper.accessor("date_created_gmt", {
      header: __("Created Date", "whizmanage"),
      size: 200,
      minSize: 200,
      maxSize: 300,
      enableResizing: true,
      meta: {
        editable: true,
        editType: "date",
        displayFormat: {
          formatValue: (value) => {
            if (!value) return "-";
            try {
              // המרה מ-UTC לזמן מקומי
              const date = new Date(value);
              if (isNaN(date.getTime())) {
                return value; // מחזיר את הערך המקורי אם לא תקין
              }

              // פורמט עברית עם שעה
              return date.toLocaleString("he-IL", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });
            } catch (e) {
              console.error("Error formatting date:", e, value);
              return value; // מחזיר את הערך המקורי במקרה של שגיאה
            }
          },
        },
      },
      cell: (props) => <EditableCell {...props} onUpdate={handleCellUpdate} />,
    }),

    columnHelper.accessor("status", {
      header: __("Status", "whizmanage"),
      size: 134,
      minSize: 134,
      maxSize: 180,
      enableResizing: true,
      meta: {
        editable: true,
        editType: "select",
        customDisplayComponent: StatusDisplay,
        customEditComponent: StatusEdit,
        editOptions: {
          statusKeys: PRODUCT_STATUS_KEYS, // 👈 חדש
          options: [
            { value: "publish", label: __("Published", "whizmanage") },
            { value: "draft", label: __("Draft", "whizmanage") },
            { value: "pending", label: __("Pending", "whizmanage") },
            { value: "private", label: __("Private", "whizmanage") },
          ],
        },
      },
      filterFn: columnFilterFn,
      cell: withVariationBehavior(
        (props) => <EditableCell {...props} onUpdate={handleCellUpdate} />,
        "readonlyWithComponent",
        null
      ),
    }),

    columnHelper.accessor("type", {
      header: __("Type", "whizmanage"),
      size: 192,
      minSize: 192,
      maxSize: 240,
      enableResizing: true,
      meta: {
        editable: true,
        editType: "select",
        editOptions: {
          options: [
            { value: "simple", label: __("Simple product", "whizmanage") },
            { value: "variable", label: __("Variable product", "whizmanage") },
            { value: "grouped", label: __("Grouped product", "whizmanage") },
            { value: "external", label: __("External/Affiliate product", "whizmanage") },
          ],
        },
      },
      filterFn: columnFilterFn,
      cell: withVariationBehavior(
        (props) => <TypeWithSettingsCell {...props} />,
        "showVariationType",
        "Variation"
      ),
    }),
    columnHelper.accessor("post_password", {
      header: __("Password", "whizmanage"),
      size: 120,
      minSize: 100,
      maxSize: 180,
      enableResizing: true,
      meta: {
        editable: true,
        editType: "text",
        editOptions: {
          placeholder: __("Enter password", "whizmanage"),
        },
        displayFormat: {
          formatValue: (value) => value || __("No password", "whizmanage"),
        },
      },
      cell: withVariationBehavior(
        (props) => <EditableCell {...props} onUpdate={handleCellUpdate} />,
        "hidden"
      ),
    }),

    columnHelper.accessor("global_unique_id", {
      header: __("Barcode", "whizmanage"),
      size: 140,
      minSize: 120,
      maxSize: 200,
      enableResizing: true,
      meta: {
        editable: true,
        editType: "text",
        editOptions: {
          placeholder: __("Enter barcode", "whizmanage"),
        },
        validationRules: [
          { required: false },
          {
            pattern: "^[0-9\\-]*$",
            message: __("Only numbers and dashes (-) are allowed", "whizmanage"),
          },
        ],
      },
      cell: withVariationBehavior(
        (props) => <EditableCell {...props} onUpdate={handleCellUpdate} />,
        "hidden"
      ),
    }),

    columnHelper.accessor("weight", {
      header: __("Weight", "whizmanage"),
      size: 100,
      minSize: 80,
      maxSize: 150,
      enableResizing: true,
      meta: {
        editable: true,
        editType: "number",
        displayFormat: {
          suffix: " kg",
          formatValue: (value) =>
            value ? parseFloat(value).toLocaleString() : "",
        },
        editOptions: {
          min: 0,
          step: 0.01,
          placeholder: __("0.00", "whizmanage"),
        },
        validationRules: [
          { required: false },
          { min: 0, message: __("Weight cannot be negative", "whizmanage") },
        ],
      },
      cell: (props) => <EditableCell {...props} onUpdate={handleCellUpdate} />,
    }),

    columnHelper.accessor("categories", {
      header: __("Categories", "whizmanage"),
      size: 180,
      minSize: 150,
      maxSize: 300,
      enableResizing: true,
      meta: {
        editable: true,
        editType: "custom",
        customDisplayComponent: CategoryTagsDisplay,
        customEditComponent: CategoryTagsEdit,
        autoFinishOnChange: false,
        editOptions: {
          label: __("Categories", "whizmanage"),
          allowCreate: true,
          allowEdit: true,
          allowDelete: true,
          hierarchical: true,
        },
      },
      filterFn: columnFilterFn,
      cell: withVariationBehavior(
        (props) => (
          <EditableCell
            {...props}
            onUpdate={(id, _colId, value, rowData, isFromHistory) => {
              return handleCategoriesUpdate(
                id,
                "categories",
                value,
                rowData,
                store,
                isFromHistory
              );
            }}
          />
        ),
        "inheritFromParent", // 👈 שינוי מ-'hidden' ל-'inheritFromParent'
        __("Same as parent", "whizmanage") // 👈 טקסט קצר
      ),
    }),

    columnHelper.accessor("tags", {
      header: __("Tags", "whizmanage"),
      size: 180,
      minSize: 150,
      maxSize: 300,
      enableResizing: true,
      meta: {
        editable: true,
        editType: "custom",
        customDisplayComponent: CategoryTagsDisplay,
        customEditComponent: CategoryTagsEdit,
        autoFinishOnChange: false,
        editOptions: {
          label: __("Tags", "whizmanage"),
          allowCreate: true,
          allowEdit: false,
          allowDelete: true,
          hierarchical: false,
          taxonomyType: "product_tag", // 👈 הוספתי את זה
        },
      },
      filterFn: columnFilterFn,
      cell: withVariationBehavior(
        (props) => (
          <EditableCell
            {...props}
            onUpdate={(id, _colId, value, rowData, isFromHistory) => {
              return handleCategoriesUpdate(
                id,
                "tags",
                value,
                rowData,
                store,
                isFromHistory
              );
            }}
          />
        ),
        "inheritFromParent",
        __("Same as parent", "whizmanage")
      ),
    }),

    columnHelper.accessor("description", {
      header: __("Description", "whizmanage"),
      size: 200,
      minSize: 150,
      maxSize: 400,
      enableResizing: true,
      meta: {
        editable: true,
        editType: "custom",
        customDisplayComponent: RichTextDisplay,
        customEditComponent: RichTextEdit,
        autoFinishOnChange: false,
        editOptions: {
          placeholder: __("Enter product description", "whizmanage"),
        },
        validationRules: [
          { required: false },
          { max: 5000, message: __("Description is too long", "whizmanage") },
        ],
      },
      cell: (props) => <EditableCell {...props} onUpdate={handleCellUpdate} />,
    }),

    columnHelper.accessor("short_description", {
      header: __("Short Description", "whizmanage"),
      size: 180,
      minSize: 150,
      maxSize: 350,
      enableResizing: true,
      meta: {
        editable: true,
        editType: "custom",
        customDisplayComponent: RichTextDisplay,
        customEditComponent: RichTextEdit,
        autoFinishOnChange: false,
        editOptions: {
          placeholder: __("Enter short description", "whizmanage"),
        },
        validationRules: [
          { required: false },
          { max: 1000, message: __("Short description is too long", "whizmanage") },
        ],
      },
      cell: (props) => <EditableCell {...props} onUpdate={handleCellUpdate} />,
    }),
    // ── Sale Period (with variable-parent handling + sale_price guard) ──
    columnHelper.accessor("sale_date_range", {
      header: __("Sale Period", "whizmanage"),
      size: 370,
      minSize: 370,
      maxSize: 400,
      enableResizing: true,
      meta: {
        editable: true,
        editType: "custom",
        customDisplayComponent: DateRangeDisplay,
        customEditComponent: DateRangeEdit,
        autoFinishOnChange: false,
        editOptions: {
          startFieldName: "date_on_sale_from_gmt",
          endFieldName: "date_on_sale_to_gmt",
        },
      },
      accessorFn: (row) => ({
        start: row.date_on_sale_from_gmt,
        end: row.date_on_sale_to_gmt,
      }),
      cell: (props) => {
        const rowData = props?.row?.original || {};
        const isVariableParent =
          rowData?.type === "variable" && !rowData?.parent_id;

        // להורה משתנה – רק תצוגה ("נגזר מהווריאציות")
        if (isVariableParent) {
          return (
            <div className="px-3 py-2">
              <span className="text-slate-400 text-sm italic">
                {__("Duration derived from variations", "whizmanage")}
              </span>
            </div>
          );
        }

        // עוזר לניקוי פורמט ISO (מסיר מילישניות ו־Z)
        const stripIsoTail = (s) =>
          s ? s.replace(/\.\d{3}Z$/, "").replace(/Z$/, "") : null;

        // בווריאציות ובמוצר פשוט – עריכה רגילה, עם בדיקה שיש sale_price
        return (
          <EditableCell
            {...props}
            onUpdate={async (id, field, value, rowDataLocal, isFromHistory) => {
              const rd = rowDataLocal || rowData;

              // חייב להיות sale_price > 0 כדי שהשרת לא יאפס את התאריכים
              const salePriceNum = parseFloat(rd?.sale_price || 0);
              if ((value?.start || value?.end) && !(salePriceNum > 0)) {
                throw new Error(__("Set a sale price before scheduling a sale", "whizmanage"));
              }

              try {
                if (value.start !== undefined) {
                  await handleCellUpdate(
                    id,
                    "date_on_sale_from_gmt",
                    value.start ? stripIsoTail(value.start) : null,
                    rd,
                    isFromHistory
                  );
                }
                if (value.end !== undefined) {
                  await handleCellUpdate(
                    id,
                    "date_on_sale_to_gmt",
                    value.end ? stripIsoTail(value.end) : null,
                    rd,
                    isFromHistory
                  );
                }
              } catch (error) {
                console.error("Failed to update sale date range:", error);
                throw error;
              }
            }}
          />
        );
      },
    }),

    columnHelper.accessor("image", {
      header: __("Image", "whizmanage"),
      size: 80,
      minSize: 80,
      maxSize: 150,
      enableResizing: true,
      meta: {
        editable: true,
        editType: "custom",
        customDisplayComponent: MediaDisplay,
        customEditComponent: MediaEdit,
        autoFinishOnChange: false,
        editOptions: {
          multiple: false,
          title: __("Select Product Image", "whizmanage"),
        },
      },
      accessorFn: (row) => {
        // 🔥 תיקון: row הוא האובייקט המקורי, לא row.original
        const data = row?.original || row;

        // וריאציה (יש parent_id): מגיע מהשרת כשדה image יחיד
        if (data.parent_id && data.parent_id > 0) {
          return data.image ?? null;
        }

        // מוצר אב: התמונה הראשונה במערך images
        return data.images && data.images.length > 0 ? data.images[0] : null;
      },
      cell: (props) => (
        <EditableCell
          {...props}
          onUpdate={async (id, field, value, rowData, isFromHistory) => {
            const isVariation = rowData?.parent_id && rowData.parent_id > 0;
            if (isVariation) {
              // וריאציה: שמור בשדה image (יחיד)
              store.updateItemWithHistory(id, { image: value });
            } else {
              // מוצר אב: שמור במערך images (שם התצוגה משתמש ב־images[0])
              const images = value
                ? [value, ...(rowData.images?.slice(1) || [])]
                : [];
              store.updateItemWithHistory(id, { images });
            }

            try {
              // ה־API שלך כבר יודע לטפל במוצר/וריאציה לפי rowData
              await mediaApi.updateProductImage(id, value, rowData);
            } catch (error) {
              console.error("❌ Failed to update image:", error);

              // Rollback ערך מקומי במקרה כשל
              if (isVariation) {
                store.updateItemWithHistory(
                  id,
                  { image: rowData.image },
                  /*saveToHistory=*/ false
                );
              } else {
                store.updateItemWithHistory(
                  id,
                  { images: rowData.images },
                  /*saveToHistory=*/ false
                );
              }
              throw error;
            }
          }}
        />
      ),
    }),

    columnHelper.accessor("image_alt", {
      header: __("Image Alt", "whizmanage"),
      size: 150,
      minSize: 120,
      maxSize: 250,
      enableResizing: true,
      meta: {
        editable: true,
        editType: "text",
        editOptions: {
          placeholder: __("Enter image alt text", "whizmanage"),
        },
      },
      accessorFn: (row) => {
        const data = row?.original || row;
        // וריאציה: שדה image יחיד
        if (data.parent_id && data.parent_id > 0) {
          return data.image?.alt || "";
        }
        // מוצר אב: התמונה הראשונה במערך images
        return data.images?.[0]?.alt || "";
      },
      cell: (props) => (
        <EditableCell
          {...props}
          onUpdate={async (id, field, value, rowData, isFromHistory) => {
            const isVariation = rowData?.parent_id && rowData.parent_id > 0;
            const imageId = isVariation
              ? rowData.image?.id
              : rowData.images?.[0]?.id;

            if (!imageId) {
              throw new Error(__("No image to update alt text", "whizmanage"));
            }

            // Optimistic update
            if (isVariation) {
              const updatedImage = { ...rowData.image, alt: value };
              store.updateItemWithHistory(id, { image: updatedImage }, false);
            } else {
              const updatedImages = [...(rowData.images || [])];
              if (updatedImages[0]) {
                updatedImages[0] = { ...updatedImages[0], alt: value };
              }
              store.updateItemWithHistory(id, { images: updatedImages }, false);
            }

            try {
              // עדכון ה-alt text ישירות ב-WordPress media
              await import("@/services/services").then(({ putApi }) =>
                putApi(`${window.siteUrl}/wp-json/wp/v2/media/${imageId}/`, {
                  alt_text: value,
                })
              );
            } catch (error) {
              console.error("❌ Failed to update image alt:", error);
              // Rollback
              if (isVariation) {
                store.updateItemWithHistory(id, { image: rowData.image }, false);
              } else {
                store.updateItemWithHistory(id, { images: rowData.images }, false);
              }
              throw error;
            }
          }}
        />
      ),
    }),

    columnHelper.accessor("gallery", {
      header: __("Gallery", "whizmanage"),
      size: 110,
      minSize: 110,
      maxSize: 200,
      enableResizing: true,
      meta: {
        editable: true,
        editType: "custom",
        customDisplayComponent: MediaDisplay,
        customEditComponent: MediaEdit,
        autoFinishOnChange: false,
        editOptions: {
          multiple: true,
          maxSelection: 100,
          title: __("Select Gallery Images", "whizmanage"),
        },
      },
      accessorFn: (row) => {
        // וודא שמחזיר מערך נקי
        const images = row.images || [];
        return Array.isArray(images)
          ? images.filter((img) => img && img.id)
          : [];
      },
      cell: withVariationBehavior(
        (props) => (
          <EditableCell
            {...props}
            onUpdate={async (id, field, value, rowData, isFromHistory) => {
              // נקה את הערך
              const cleanedValue = Array.isArray(value)
                ? value.filter((img) => img && img.id && img.src)
                : [];

              // רשום ל־history על השדה "images"
              store.updateItemWithHistory(id, { images: cleanedValue });

              try {
                await mediaApi.updateProductGallery(id, cleanedValue, rowData);
              } catch (error) {
                console.error("Failed to update gallery:", error);
                store.updateItemWithHistory(
                  id,
                  { images: rowData.images },
                  false
                );
                throw error;
              }
            }}
          />
        ),
        "hidden"
      ),
    }),

    columnHelper.accessor("attributes", {
      header: __("Attributes", "whizmanage"),
      size: 200,
      minSize: 180,
      maxSize: 350,
      enableResizing: true,
      meta: {
        editable: true,
        editType: "custom",
        // מצב צפיה - ללא כפתור
        customDisplayComponent: ({ value, row }) => (
          <AttributesDisplay value={value} row={row} __={__} isEditing={false} />
        ),
        // מצב עריכה - עם כפתור, מקבל onFinish/onCancel מ-EditableCell
        customEditComponent: ({ value, row, onFinish, onCancel }) => (
          <AttributesDisplay value={value} row={row} __={__} isEditing={true} onFinish={onFinish} onCancel={onCancel} />
        ),
      },
      filterFn: columnFilterFn,
      cell: withVariationBehavior(
        (props) => <EditableCell {...props} onUpdate={handleCellUpdate} />,
        "inheritFromParent",
        __("Same as parent", "whizmanage") // 👈 טקסט מיוחד כי attributes נערכות דרך השם
      ),
    }),

    columnHelper.accessor("downloadable", {
      header: __("Downloadable", "whizmanage"),
      size: 130,
      minSize: 100,
      maxSize: 180,
      enableResizing: true,
      filterFn: columnFilterFn,
      cell: (props) => {
        const { row } = props;
        const isVariation = row.depth > 0;
        const productType = row.original.type;

        if (isVariation || !productType || productType === "simple") {
          return (
            <DownloadableCell
              row={props.row}
              table={props.table}
              onUpdate={handleCellUpdate}
              __={__}
            />
          );
        }
      },
    }),

    columnHelper.accessor("featured", {
      header: __("Featured", "whizmanage"),
      size: 100,
      minSize: 80,
      maxSize: 120,
      enableResizing: true,
      filterFn: columnFilterFn,
      cell: (props) => {
        return (
          <FeaturedCell
            row={props.row}
            table={props.table}
            onUpdate={handleCellUpdate}
          />
        );
      },
    }),

    columnHelper.accessor("sold_individually", {
      header: __("Sold Individually", "whizmanage"),
      size: 120,
      minSize: 100,
      maxSize: 150,
      enableResizing: true,
      filterFn: columnFilterFn,
      cell: (props) => {
        return (
          <SoldIndividuallyCell
            row={props.row}
            table={props.table}
            onUpdate={handleCellUpdate}
            __={__}
          />
        );
      },
    }),

    columnHelper.accessor("dimensions", {
      header: __("Dimensions", "whizmanage"),
      size: 150,
      minSize: 120,
      maxSize: 200,
      enableResizing: true,
      meta: {
        editable: true,
        editType: "custom",
        customDisplayComponent: DimensionsDisplay,
        customEditComponent: DimensionsEdit,
        autoFinishOnChange: false,
        preventAutoClose: true,
      },
      filterFn: columnFilterFn,
      cell: (props) => {
        return <EditableCell {...props} onUpdate={handleCellUpdate} />;
      },
    }),
    columnHelper.accessor("purchase_note", {
      header: __("Purchase Note", "whizmanage"),
      size: 200,
      minSize: 150,
      maxSize: 350,
      enableResizing: true,
      meta: {
        editable: true,
        editType: "textarea",
        editOptions: {
          rows: 1,
          placeholder: __("Note to customer after purchase", "whizmanage"),
        },
        validationRules: [
          { required: false },
          { max: 500, message: __("Purchase note is too long", "whizmanage") },
        ],
      },
      cell: withVariationBehavior(
        (props) => <EditableCell {...props} onUpdate={handleCellUpdate} />,
        "hidden" // 👈 וריאציות לא צריכות purchase note
      ),
    }),

    columnHelper.accessor("shipping_class", {
      header: __("Shipping Class", "whizmanage"),
      size: 160,
      minSize: 120,
      maxSize: 220,
      enableResizing: true,
      meta: {
        editable: true,
        editType: "select",
        editOptions: {
          options: (() => {
            const shippingOptions =
              typeof window !== "undefined" && Array.isArray(window.shipping)
                ? window.shipping
                : [];
            return shippingOptions.map((shipping) => ({
              value: shipping.slug,
              label: shipping.name,
            }));
          })(),
          placeholder: __("Select delivery type", "whizmanage"),
        },
        displayFormat: {
          formatValue: (value) => {
            if (!value) return "—";
            const shippingClass =
              typeof window !== "undefined" && Array.isArray(window.shipping)
                ? window.shipping.find((c) => c.slug === value)
                : null;
            return shippingClass ? shippingClass.name : "—";
          },
        },
      },
      filterFn: columnFilterFn,
      cell: (props) => <EditableCell {...props} onUpdate={handleCellUpdate} />,
    }),

    columnHelper.display({
      id: "linked_products",
      header: __("Linked Products", "whizmanage"),
      size: 180,
      minSize: 150,
      maxSize: 250,
      enableResizing: true,
      cell: withVariationBehavior(
        (props) => <LinkedProductsCell {...props} />,
        "hidden" // וריאציות לא צריכות linked products
      ),
    }),
  ];
  const taxonomyColumns = createTaxonomyColumns(store, __);
  const metaColumns = createMetaColumns(store, __, handleCellUpdate);

  // מיקום עמודות ה-Meta בסוף (אפשר לשנות סדר לפי הצורך)
  return [...baseColumns, ...taxonomyColumns, ...metaColumns];
};

// --- Generic alias ---
//
// Export a generic function name for creating columns.  Generic table
// components can import `createEntityColumns` regardless of which entity
// they are rendering.  This alias simply re-exports the product-specific
// implementation.  Future entities should define the same alias.
export { createProductsColumns as createEntityColumns };
