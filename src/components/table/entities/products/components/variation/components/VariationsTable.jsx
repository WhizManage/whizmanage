// src/components/table/products/components/variation/components/VariationsTable.jsx

import RichEditorModal from "@components/editor/RichEditorModal";
import { Input } from "@components/ui/input";
import CustomTooltip from "@components/ui/nextUI/Tooltip";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu";
import { ChevronDown, ChevronUp, GripVertical, Trash2Icon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
 import { __ } from "@wordpress/i18n";
import { IoIosSearch } from "react-icons/io";
import { useVariationsStore } from "../store/variationsStore";
import VariationDownloadableEdit from "./VariationDownloadableEdit";
import VariationImageEdit from "./VariationImageEdit";
import VariationInventoryEdit from "./VariationInventoryEdit";
import VariationNameEdit from "./VariationNameEdit";

const columns = [
  { name: "Sort", uid: "sort", sortable: false },
  { name: "Image", uid: "image", sortable: false },
  { name: "Name", uid: "name", sortable: true },
  { name: "Price", uid: "price", sortable: true },
  { name: "Sale", uid: "sale", sortable: true },
  { name: "SKU", uid: "sku", sortable: true },
  { name: "Description", uid: "description", sortable: false },
  { name: "Inventory", uid: "inventory", sortable: true },
  { name: "Downloadable", uid: "downloadable", sortable: false },
  { name: "Actions", uid: "actions", sortable: false },
];

/**
 * ✅ SortableRow - שורה שניתנת לגרירה
 */
function SortableRow({ item, renderCell }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.9 : 1,
    zIndex: isDragging ? 100 : "auto",
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`
        group
        ${
          isDragging
            ? "bg-fuchsia-600/10 shadow-lg ring-2 ring-fuchsia-500/30 rounded-lg"
            : "hover:bg-slate-50 dark:hover:bg-slate-700/50"
        }
      `}
      {...attributes}
    >
      {/* Sort Column - Drag Handle */}
      <td className="py-2 px-3 text-center">
        <div
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 inline-flex justify-center hover:bg-fuchsia-600/10 rounded touch-none"
        >
          <GripVertical className="w-5 h-5 text-slate-400" />
        </div>
      </td>

      {/* Other Columns */}
      <td className="py-2 px-3">{renderCell(item, "image")}</td>
      <td className="py-2 px-3">{renderCell(item, "name")}</td>
      <td className="py-2 px-3">{renderCell(item, "price")}</td>
      <td className="py-2 px-3">{renderCell(item, "sale")}</td>
      <td className="py-2 px-3">{renderCell(item, "sku")}</td>
      <td className="py-2 px-3">{renderCell(item, "description")}</td>
      <td className="py-2 px-3">{renderCell(item, "inventory")}</td>
      <td className="py-2 px-3">{renderCell(item, "downloadable")}</td>
      <td className="py-2 px-3 text-center">{renderCell(item, "actions")}</td>
    </tr>
  );
}

export default function VariationsTable({ ProductRow }) {
  const [filterValue, setFilterValue] = useState("");
  const [sortDescriptor, setSortDescriptor] = useState({
    column: "menu_order",
    direction: "ascending",
  });
  const [refreshKey, setRefreshKey] = useState(0);
  // ✅ שמירת סדר הפריטים - מתעדכן רק בלחיצה על מיון או גרירה
  const [sortedIds, setSortedIds] = useState([]);
  // ✅ מיון לפי attribute - שומר את ה-attribute הראשי למיון
  const [nameSortAttribute, setNameSortAttribute] = useState(null);
  const [nameSortDropdownOpen, setNameSortDropdownOpen] = useState(false);
   

  // ✅ Store
  const {
    variations,
    setVariations,
    allAttributes,
    updateVariation,
    deleteVariation,
    reorderVariations,
    applySortOrder,
    toggleUpdatedTable,
  } = useVariationsStore();

  const refreshTable = () => setRefreshKey((prev) => prev + 1);

  useEffect(() => {

    refreshTable();
  }, [allAttributes]);

  // ✅ Sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ✅ Initialize menu_order and sortedIds
  const isInitialized = useRef(false);

  useEffect(() => {
    if (variations && variations.length > 0) {
      const needsMenuOrder = variations.some(
        (item) => !item.original.menu_order
      );

      if (needsMenuOrder) {
        const updatedVariations = variations.map((item, index) => ({
          ...item,
          original: {
            ...item.original,
            menu_order: index + 1,
          },
        }));
        setVariations(updatedVariations);
      }

      // ✅ אתחול סדר הפריטים רק פעם אחת
      if (!isInitialized.current) {
        const initialOrder = [...variations]
          .sort(
            (a, b) =>
              (a.original?.menu_order || 0) - (b.original?.menu_order || 0)
          )
          .map((item) => item.id);
        setSortedIds(initialOrder);
        isInitialized.current = true;
      } else {
        // ✅ הוספת פריטים חדשים לסוף הרשימה
        setSortedIds((prev) => {
          const existingIds = new Set(prev);
          const newIds = variations
            .filter((item) => !existingIds.has(item.id))
            .map((item) => item.id);

          if (newIds.length > 0) {
            return [...prev, ...newIds];
          }
          return prev;
        });
      }
    }
  }, [variations]);

  // ✅ Handle drag end
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over?.id && over) {
      const oldIndex = sortedIds.indexOf(active.id);
      const newIndex = sortedIds.indexOf(over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        // ✅ עדכון סדר המזהים
        const newSortedIds = [...sortedIds];
        const [removed] = newSortedIds.splice(oldIndex, 1);
        newSortedIds.splice(newIndex, 0, removed);
        setSortedIds(newSortedIds);

        // עדכון ה-store
        reorderVariations(
          variations.findIndex((item) => item.id === active.id),
          variations.findIndex((item) => item.id === over.id)
        );
        toggleUpdatedTable();
      }
    }
  };

  // ✅ פונקציית עזר: מקבלת את ערך ה-option של attribute מסוים בווריאציה
  const getAttributeOption = (variation, attrName) => {
    const attrs = variation.original?.attributes || [];
    const attr = attrs.find(
      (a) => a.name === attrName || a.slug === attrName || a.name === `pa_${attrName}`
    );
    return attr?.option || "";
  };

  // ✅ מיון מדורג לפי attributes - קודם לפי ה-attribute שנבחר, אח"כ לפי השאר
  const sortByAttributes = (variations, primaryAttr, direction) => {
    // בניית סדר ה-attributes למיון: ראשית הנבחר, אח"כ השאר לפי הסדר
    const attrOrder = [...allAttributes];
    if (primaryAttr) {
      const primaryIndex = attrOrder.findIndex(
        (a) => a.name === primaryAttr.name || a.slug === primaryAttr.slug
      );
      if (primaryIndex > 0) {
        const [primary] = attrOrder.splice(primaryIndex, 1);
        attrOrder.unshift(primary);
      }
    }

    return [...variations].sort((a, b) => {
      // מיון מדורג - עוברים על כל attribute לפי הסדר
      for (const attr of attrOrder) {
        const attrName = attr.id === 0 ? attr.name : attr.slug;
        const optionA = getAttributeOption(a, attrName);
        const optionB = getAttributeOption(b, attrName);

        if (optionA !== optionB) {
          const cmp = optionA.localeCompare(optionB);
          return direction === "descending" ? -cmp : cmp;
        }
      }
      return 0;
    });
  };

  // ✅ Handle sort by attribute - מיון לפי attribute ספציפי
  const handleSortByAttribute = (attribute) => {
    const newDirection =
      sortDescriptor.column === "name" &&
      nameSortAttribute?.name === attribute.name &&
      sortDescriptor.direction === "ascending"
        ? "descending"
        : "ascending";

    setNameSortAttribute(attribute);
    setSortDescriptor({ column: "name", direction: newDirection });
    setNameSortDropdownOpen(false);

    const sorted = sortByAttributes(variations, attribute, newDirection);

    const newSortedIds = sorted.map((item) => item.id);
    setSortedIds(newSortedIds);
    applySortOrder(newSortedIds);
    toggleUpdatedTable();
  };

  // ✅ Handle sort - ממיין ומעדכן את סדר המזהים וגם את ה-store
  const handleSort = (column) => {
    if (!columns.find((c) => c.uid === column)?.sortable) return;

    // אם לוחצים על Name - פותח dropdown לבחירת attribute
    if (column === "name") {
      setNameSortDropdownOpen(true);
      return;
    }

    const newDirection =
      sortDescriptor.column === column &&
      sortDescriptor.direction === "ascending"
        ? "descending"
        : "ascending";

    setSortDescriptor({ column, direction: newDirection });

    // ✅ מיון הפריטים ועדכון סדר המזהים
    const sorted = [...variations].sort((a, b) => {
      let first, second;

      if (column === "menu_order") {
        first = a.original?.menu_order || 0;
        second = b.original?.menu_order || 0;
      } else if (column === "price") {
        first = parseFloat(a.original?.regular_price) || 0;
        second = parseFloat(b.original?.regular_price) || 0;
      } else if (column === "sale") {
        first = parseFloat(a.original?.sale_price) || 0;
        second = parseFloat(b.original?.sale_price) || 0;
      } else if (column === "sku") {
        first = a.original?.sku || "";
        second = b.original?.sku || "";
      } else if (column === "inventory") {
        first = parseInt(a.original?.stock_quantity) || 0;
        second = parseInt(b.original?.stock_quantity) || 0;
      } else {
        first = a.original?.[column];
        second = b.original?.[column];
      }

      if (first == null && second == null) return 0;
      if (first == null) return newDirection === "descending" ? 1 : -1;
      if (second == null) return newDirection === "descending" ? -1 : 1;

      if (typeof first === "number" && typeof second === "number") {
        return newDirection === "descending" ? second - first : first - second;
      }

      if (typeof first === "string" && typeof second === "string") {
        const cmp = first.localeCompare(second);
        return newDirection === "descending" ? -cmp : cmp;
      }

      const cmp = first < second ? -1 : first > second ? 1 : 0;
      return newDirection === "descending" ? -cmp : cmp;
    });

    // ✅ שמירת סדר המזהים החדש
    const newSortedIds = sorted.map((item) => item.id);
    setSortedIds(newSortedIds);

    // ✅ עדכון ה-store עם הסדר החדש
    applySortOrder(newSortedIds);
    toggleUpdatedTable();
  };

  // ✅ Delete variation
  const handleDelete = (row) => {
    if (!row || !row.id) return;

    // ✅ הסרה מ-sortedIds
    setSortedIds((prev) => prev.filter((id) => id !== row.id));

    deleteVariation(row.id);
    toggleUpdatedTable();
  };

  const hasSearchFilter = Boolean(filterValue);

  // ✅ Filter items - חיפוש בכל העמודות
  const filteredItems = useMemo(() => {
    let filteredData = [...variations];
    if (hasSearchFilter && filterValue.trim()) {
      const searchTerm = filterValue.toLowerCase().trim();
      filteredData = filteredData.filter((item) => {
        const o = item.original || {};

        // חיפוש בשם
        if ((o.name || "").toLowerCase().includes(searchTerm)) return true;

        // חיפוש ב-SKU
        if ((o.sku || "").toLowerCase().includes(searchTerm)) return true;

        // חיפוש במחיר
        if (String(o.regular_price || "").includes(searchTerm)) return true;

        // חיפוש במחיר מבצע
        if (String(o.sale_price || "").includes(searchTerm)) return true;

        // חיפוש בתיאור
        if ((o.description || "").toLowerCase().includes(searchTerm))
          return true;

        // חיפוש במלאי
        if (String(o.stock_quantity || "").includes(searchTerm)) return true;
        if ((o.stock_status || "").toLowerCase().includes(searchTerm))
          return true;

        // חיפוש באטריביוטים (כמו "כחול", "XL")
        const attrs = o.attributes || [];
        for (const attr of attrs) {
          if ((attr.option || "").toLowerCase().includes(searchTerm))
            return true;
          if ((attr.name || "").toLowerCase().includes(searchTerm)) return true;
        }

        return false;
      });
    }
    return filteredData;
  }, [variations, filterValue, hasSearchFilter]);

  // ✅ Sort items - מסדר לפי sortedIds (לא ממיין מחדש בכל רנדור)
  const sortedItems = useMemo(() => {
    // יצירת מפה לגישה מהירה
    const itemsMap = new Map(filteredItems.map((item) => [item.id, item]));

    // אם יש חיפוש - מחזיר רק את הפריטים המסוננים בסדר של sortedIds
    if (hasSearchFilter) {
      const filteredIds = new Set(filteredItems.map((item) => item.id));
      return sortedIds
        .filter((id) => filteredIds.has(id))
        .map((id) => itemsMap.get(id))
        .filter(Boolean);
    }

    // אם אין sortedIds עדיין - מחזיר את הפריטים כמו שהם
    if (sortedIds.length === 0) {
      return filteredItems;
    }

    // מסדר לפי sortedIds
    const result = sortedIds.map((id) => itemsMap.get(id)).filter(Boolean);

    // הוסף פריטים חדשים שלא ב-sortedIds (למקרה של הוספת וריאציות)
    const sortedIdSet = new Set(sortedIds);
    filteredItems.forEach((item) => {
      if (!sortedIdSet.has(item.id)) {
        result.push(item);
      }
    });

    return result;
  }, [filteredItems, sortedIds, hasSearchFilter]);

  // ✅ Render cell
  const renderCell = useCallback(
    (row, columnKey) => {
      if (!row || !row.original) return null;

      switch (columnKey) {
        case "image":
          return <VariationImageEdit row={row} />;

        case "name":
          return (
            <div className="flex gap-2 items-center">
              {allAttributes.map((attribute, i) => (
                <VariationNameEdit
                  key={`${attribute.id || attribute.name}-${i}-${(attribute.options || []).length}-${(attribute.options || []).join(",")}`}
                  i={i}
                  row={row}
                  attribute={attribute}
                />
              ))}
            </div>
          );

        case "sku":
          return (
            <Input
              type="text"
              onChange={(e) => updateVariation(row.id, { sku: e.target.value })}
              defaultValue={row?.original?.sku}
              placeholder={__("No SKU", "whizmanage")}
              className="h-8 w-20"
              onFocus={(e) => e.target.select()}
            />
          );

        case "price":
          const showLeftPrice =
            window?.currencyPos === "left" ||
            window?.currencyPos === "left_space";
          const showRightPrice =
            window?.currencyPos === "right" ||
            window?.currencyPos === "right_space";

          return (
            <div className="relative h-8 w-20">
              {showLeftPrice && (
                <span
                  className="absolute start-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none z-10"
                  dangerouslySetInnerHTML={{
                    __html: window.currencySymbol || window.currency,
                  }}
                />
              )}
              <Input
                type="number"
                onChange={(e) =>
                  updateVariation(row.id, { regular_price: e.target.value })
                }
                defaultValue={row?.original?.regular_price}
                placeholder={__("No price", "whizmanage")}
                step="any"
                className={`h-8 w-full ${showLeftPrice ? "!ps-5" : ""} ${showRightPrice ? "!pe-5" : ""}`}
                onFocus={(e) => e.target.select()}
              />
              {showRightPrice && (
                <span
                  className="absolute end-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none z-10"
                  dangerouslySetInnerHTML={{
                    __html: window.currencySymbol || window.currency,
                  }}
                />
              )}
            </div>
          );

        case "sale":
          const showLeftSale =
            window?.currencyPos === "left" ||
            window?.currencyPos === "left_space";
          const showRightSale =
            window?.currencyPos === "right" ||
            window?.currencyPos === "right_space";

          return (
            <div className="relative h-8 w-20">
              {showLeftSale && (
                <span
                  className="absolute start-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none z-10"
                  dangerouslySetInnerHTML={{
                    __html: window.currencySymbol || window.currency,
                  }}
                />
              )}
              <Input
                type="number"
                onChange={(e) =>
                  updateVariation(row.id, { sale_price: e.target.value })
                }
                defaultValue={row?.original?.sale_price}
                placeholder={__("No price", "whizmanage")}
                step="any"
                className={`h-8 w-full ${showLeftSale ? "!ps-5" : ""} ${showRightSale ? "!pe-5" : ""}`}
                onFocus={(e) => e.target.select()}
              />
              {showRightSale && (
                <span
                  className="absolute end-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none z-10"
                  dangerouslySetInnerHTML={{
                    __html: window.currencySymbol || window.currency,
                  }}
                />
              )}
            </div>
          );

        case "description":
          return <RichEditorModal row={row.original} title={"description"} />;

        case "inventory":
          return <VariationInventoryEdit row={row} />;

        case "downloadable":
          return <VariationDownloadableEdit row={row} />;

        case "actions":
          return (
            <CustomTooltip title={__("Delete variation", "whizmanage")}>
              <span
                className="text-lg cursor-pointer active:opacity-50 text-fuchsia-600 hover:text-slate-500"
                onClick={() => handleDelete(row)}
              >
                <Trash2Icon className="w-4 h-4" />
              </span>
            </CustomTooltip>
          );

        default:
          return row.original[columnKey];
      }
    },
    [allAttributes, __ ,updateVariation]
  );

  const onSearchChange = useCallback((value) => {
    setFilterValue(value || "");
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="w-full flex items-end justify-between px-2">
        {/* Variations count */}
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {sortedItems.length} {__("variations", "whizmanage")}
        </div>

        <div className="relative">
          <IoIosSearch className="size-4 text-slate-500 absolute start-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            placeholder={__("Search variation...", "whizmanage")}
            type="search"
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-8 !px-0 !ps-8 !pe-3 !rounded-full w-96"
          />
        </div>

        {/* Empty div for balance */}
        <div className="w-24" />
      </div>

      {/* Table */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortedItems.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="max-h-[382px] overflow-auto rounded-lg border dark:border-slate-700 dark:bg-slate-800 scrollbar-whiz">
            <table className="w-full text-sm">
              {/* Header */}
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900 z-10">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.uid}
                      onClick={() => column.uid !== "name" && handleSort(column.uid)}
                      className={`
                        py-3 px-3 text-start text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider
                        ${column.sortable ? "cursor-pointer hover:text-slate-700 dark:hover:text-slate-200" : ""}
                        ${column.uid === "actions" ? "text-center" : ""}
                      `}
                    >
                      {column.uid === "name" ? (
                        <DropdownMenu
                          open={nameSortDropdownOpen}
                          onOpenChange={setNameSortDropdownOpen}
                          dir={window.user_local === "he_IL" ? "rtl" : "ltr"}
                        >
                          <DropdownMenuTrigger className="flex items-center gap-1 outline-none">
                            <span>{__(column.name, "whizmanage")}</span>
                            {sortDescriptor.column === "name" &&
                              (sortDescriptor.direction === "ascending" ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              ))}
                            {sortDescriptor.column !== "name" && (
                              <ChevronDown className="w-3 h-3 opacity-50" />
                            )}
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {allAttributes.map((attr, index) => (
                              <DropdownMenuItem
                                key={attr.id || attr.name || index}
                                onClick={() => handleSortByAttribute(attr)}
                                className={`cursor-pointer ${
                                  nameSortAttribute?.name === attr.name
                                    ? "bg-fuchsia-50 dark:bg-fuchsia-900/20"
                                    : ""
                                }`}
                              >
                                <span>{attr.name}</span>
                                {nameSortAttribute?.name === attr.name && (
                                  sortDescriptor.direction === "ascending" ? (
                                    <ChevronUp className="w-4 h-4 ms-2" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 ms-2" />
                                  )
                                )}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <div className="flex items-center gap-1">
                          {__(column.name, "whizmanage")}
                          {column.sortable &&
                            sortDescriptor.column === column.uid &&
                            (sortDescriptor.direction === "ascending" ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            ))}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Body */}
              <tbody
                key={refreshKey}
                className="divide-y divide-slate-200 dark:divide-slate-700"
              >
                {sortedItems.length > 0 ? (
                  sortedItems.map((item) => (
                    <SortableRow
                      key={item.id}
                      item={item}
                      renderCell={renderCell}
                    />
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={10}
                      className="py-8 text-center text-slate-500"
                    >
                      {__("No variations found", "whizmanage")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
