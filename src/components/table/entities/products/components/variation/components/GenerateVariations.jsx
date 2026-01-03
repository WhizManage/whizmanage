// src/components/table/entities/products/components/variation/components/GenerateVariations.jsx

import Button from "@components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
 import { __ } from "@wordpress/i18n";
import GenerateRowItem from "./GenerateRowItem";
import SelectGlobalAttribute from "./SelectGlobalAttribute";
import SelectProductAttribute from "./SelectProductAttribute";
import { useVariationsStore } from "../store/variationsStore";
import { putApi } from "/src/services/services";

// dnd-kit
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

/** מפתח יציב לשורה (id > slug > name > index) */
const getAttrKey = (attr, fallbackIndex) => {
  const base =
    (typeof attr?.id !== "undefined" ? `id:${attr.id}` : null) ??
    (attr?.slug ? `slug:${attr.slug}` : null) ??
    (attr?.name ? `name:${attr.name}` : null) ??
    `idx:${fallbackIndex}`;
  return `attr-${base}`;
};

const GenerateVariations = ({
  ref1,
  ref2,
  ref3,
  product,
  isSimple,
  mode = "full",
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
   

  // ✅ קבלת state מה-store במקום מ-props
  const {
    selectedAttributes,
    setSelectedAttributes,
    allAttributes,
    setAllAttributes,
    variations,
    generateVariations: storeGenerateVariations,
  } = useVariationsStore();

  // אתחול options לכל Attribute
  useEffect(() => {
    if (selectedAttributes && selectedAttributes.length > 0) {
      const needsInit = selectedAttributes.some(attr => !Array.isArray(attr.options));
      if (needsInit) {
        const newSelectedAttributes = selectedAttributes.map((attr) => ({
          ...attr,
          options: Array.isArray(attr?.options) ? attr.options : [],
        }));
        setSelectedAttributes(newSelectedAttributes);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** sensors לגרירה */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  /** מזהים יציבים לכל שורה */
  const itemsIds = useMemo(
    () => (selectedAttributes ?? []).map((a, i) => getAttrKey(a, i)),
    [selectedAttributes]
  );

  /** חישוב כמה ווריאציות חדשות ייווצרו (לא כולל קיימות) */
  const potentialVariationsCount = useMemo(() => {
    if (!selectedAttributes || selectedAttributes.length === 0) return 0;

    const attrsWithOptions = selectedAttributes.filter(
      (attr) => Array.isArray(attr.options) && attr.options.length > 0
    );

    if (attrsWithOptions.length === 0) return 0;

    // חישוב כל הקומבינציות האפשריות
    const generateAllCombinations = (attrs) => {
      const combinations = [];
      const generate = (currentIndex, combination) => {
        if (currentIndex === attrs.length) {
          combinations.push([...combination]);
          return;
        }
        const attr = attrs[currentIndex];
        for (const option of attr.options) {
          const optionName = typeof option === "string" ? option : option.name;
          combination.push({
            name: attr.id === 0 ? attr.name : attr.slug,
            option: optionName,
          });
          generate(currentIndex + 1, combination);
          combination.pop();
        }
      };
      generate(0, []);
      return combinations;
    };

    const allCombinations = generateAllCombinations(attrsWithOptions);

    // בדיקה אילו קומבינציות כבר קיימות
    const existingCombinations = new Set(
      (variations || []).map((v) => {
        const attrs = v.original?.attributes || [];
        return attrs
          .map((a) => `${a.name}:${a.option}`)
          .sort()
          .join("|");
      })
    );

    // סינון רק קומבינציות חדשות
    const newCombinations = allCombinations.filter((combo) => {
      const key = combo
        .map((a) => `${a.name}:${a.option}`)
        .sort()
        .join("|");
      return !existingCombinations.has(key);
    });

    return newCombinations.length;
  }, [selectedAttributes, variations]);

  /** שמירת הסדר החדש ל-WooCommerce (position לפי אינדקס) */
  async function persistAttributesOrder(reorderedAttrs) {
    // ✅ קודם לוקחים את כל ה-attributes מהמוצר
    const existingProductAttrs = product.attributes || [];
    
    // ✅ יוצרים מפה של attributes לפי מזהה ייחודי
    const reorderedMap = new Map();
    (reorderedAttrs ?? []).forEach((a, idx) => {
      const key = a.id !== 0 ? `global_${a.id}` : `product_${a.name}`;
      reorderedMap.set(key, { ...a, position: idx });
    });
    
    // ✅ עוברים על כל ה-attributes הקיימים ומעדכנים את הסדר
    const payloadAttributes = existingProductAttrs.map((a, idx) => {
      const key = a.id !== 0 ? `global_${a.id}` : `product_${a.name}`;
      const reordered = reorderedMap.get(key);
      
      const base = {
        position: reordered?.position ?? idx,
        visible: a.visible ?? true,
        variation: a.variation ?? false,
      };

      if (a.id && a.id !== 0) {
        // Global attribute (taxonomy)
        return {
          ...base,
          id: a.id,
          options: Array.isArray(a.options)
            ? a.options.map((o) => (o?.name ? o.name : o))
            : [],
        };
      }

      // Product-only (custom) attribute
      return {
        ...base,
        id: 0,
        name: a.name,
        options: Array.isArray(a.options)
          ? a.options.map((o) => (o?.name ? o.name : o))
          : [],
      };
    });

    // ✅ מיון לפי position
    payloadAttributes.sort((a, b) => a.position - b.position);


    try {
      const url = `${window.siteUrl}/wp-json/wc/v3/products/${product.id}`;
      const res = await putApi(url, { attributes: payloadAttributes });
      // מסנכרנים אובייקט מוצר מקומי
      product.attributes = res.data.attributes;
    } catch (e) {
      console.error("Error saving attribute order", e?.response?.data || e);
    }
  }

  /** גרירה: שינוי סדר ב-selectedAttributes ושמירה ל-API */
  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;

    const ids = (selectedAttributes ?? []).map((a, i) => getAttrKey(a, i));
    const oldIndex = ids.indexOf(active.id);
    const newIndex = ids.indexOf(over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const next = arrayMove(selectedAttributes, oldIndex, newIndex);

    // עדכון selectedAttributes
    setSelectedAttributes(next);

    // עדכון allAttributes
    if (allAttributes && allAttributes.length > 0) {
      setAllAttributes(arrayMove(allAttributes, oldIndex, newIndex));
    }

    // שומרים סדר חדש ל-WooCommerce
    persistAttributesOrder(next);
  };

  const handleGenerateClick = () => {
    storeGenerateVariations(product.id, product);
  };

  return (
    <div className="w-full flex flex-col gap-4 items-center justify-center">
      <div className="w-full" ref={ref1}>
        <table className="w-full">
          <thead className="border-b dark:border-b-slate-700">
            <tr className="font-semibold">
              <th className="w-10 p-2 text-start font-extralight"></th>
              <th className="w-32 p-2 text-start font-extralight">{__("Attribute", "whizmanage")}</th>
              <th className="w-24 p-2 text-start font-extralight">{__("Type", "whizmanage")}</th>
              <th className="w-28 p-2 text-start font-extralight">{__("For variations", "whizmanage")}</th>
              <th className="p-2 text-start font-extralight" ref={ref2}>{__("Options", "whizmanage")}</th>
              <th className="w-10 p-2"></th>
            </tr>
          </thead>

          {/* הקשר DnD מסביב ל-tbody */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={itemsIds} strategy={verticalListSortingStrategy}>
              <tbody className="divide-y-1 dark:divide-slate-700">
                {selectedAttributes?.map((attribute, i) => (
                  <GenerateRowItem
                    key={getAttrKey(attribute, i)}
                    id={getAttrKey(attribute, i)} // חשוב ל-dnd-kit
                    index={i}
                    attribute={attribute}
                    product={product}
                    selectedAttributes={selectedAttributes}
                    setSelectedAttributes={setSelectedAttributes}
                    setAllAttributes={setAllAttributes}
                    ref2={ref2}
                  />
                ))}
              </tbody>
            </SortableContext>
          </DndContext>
        </table>

        <DropdownMenu
          open={dropdownOpen}
          onOpenChange={setDropdownOpen}
          dir={window.user_local === "he_IL" ? "rtl" : "ltr"}
        >
          <DropdownMenuTrigger className="w-full">
            <div
              className={cn(
                "hover:bg-slate-100 dark:hover:bg-slate-800 w-full px-3 py-3 text-slate-300 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 dark:border-t-slate-700 flex gap-4 transition-all cursor-pointer",
                selectedAttributes?.length > 0 ? "border-t-1" : "border-t-0"
              )}
            >
              <Plus className="w-4 h-4" /> {__("Add attribute", "whizmanage")}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel className="rtl:text-right">
              {__("Attribute Type", "whizmanage")}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <SelectGlobalAttribute
              variationMood={true}
              product={product}
              selectedAttributes={selectedAttributes}
              setSelectedAttributes={setSelectedAttributes}
              setDropdownOpen={setDropdownOpen}
            />
            <SelectProductAttribute
              variationMood={true}
              product={product}
              selectedAttributes={selectedAttributes}
              setSelectedAttributes={setSelectedAttributes}
              setDropdownOpen={setDropdownOpen}
              isSimple={false}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {!isSimple && mode === "full" && (
        <Button
          ref={ref3}
          variant="outline"
          onClick={handleGenerateClick}
          disabled={selectedAttributes?.length < 1 || potentialVariationsCount === 0}
          size="sm"
          className="relative"
        >
          {__("Combine & Generate", "whizmanage")}
          {potentialVariationsCount > 0 && (
            <span className="absolute -top-2 -end-2 bg-fuchsia-600 text-white text-xs font-bold rounded-full min-w-5 h-5 flex items-center justify-center px-1">
              {potentialVariationsCount}
            </span>
          )}
        </Button>
      )}
    </div>
  );
};

export default GenerateVariations;
export { getAttrKey }; // נוח לשימוש חוזר