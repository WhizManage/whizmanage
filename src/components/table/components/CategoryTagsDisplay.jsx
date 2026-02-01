// src/components/table/components/CategoryTagsDisplay.jsx
import { useCoreTaxonomiesStore } from "@/components/table/store/useCoreTaxonomiesStore";
import { useCustomTaxonomiesStore } from "@/components/table/store/useCustomTaxonomiesStore";
import { Chip } from "@heroui/chip";
import ProBadge from "@components/ui/nextUI/ProBadge";

// טקסונומיות core
const CORE_TAXONOMIES = new Set([
  "product_cat",
  "_product_cat",
  "categories",
  "product_tag",
  "tags",
]);

const isCoreTaxonomy = (name) => CORE_TAXONOMIES.has(String(name || ""));

const CategoryTagsDisplay = ({ value, __, editOptions, column }) => {
  const { categories, tags, taxonomies } = useCoreTaxonomiesStore();
  const customStore = useCustomTaxonomiesStore();

  if (!value || (Array.isArray(value) && value.length === 0)) {
    return <span className="text-muted-foreground">—</span>;
  }

  const items = Array.isArray(value) ? value : [value];

  // מאיפה להביא את הרשימה המלאה כדי לתרגם id -> name
  const taxonomyType =
    editOptions?.taxonomyType ||
    column?.id ||
    null;

  let sourceList = [];
  if (taxonomyType === "product_cat" || taxonomyType === "_product_cat" || taxonomyType === "categories") {
    sourceList = categories || [];
  } else if (taxonomyType === "tags" || taxonomyType === "product_tag") {
    sourceList = tags || [];
  } else if (taxonomyType && taxonomies?.[taxonomyType]) {
    sourceList = taxonomies[taxonomyType] || [];
  } else if (taxonomyType && !isCoreTaxonomy(taxonomyType)) {
    // ✅ Custom taxonomy - נסה להביא מה-custom store
    sourceList = customStore.select(taxonomyType) || [];
  } else {
    // fallback – ננסה גם לפי שם העמודה
    if (
      column?.id === "product_categories" ||
      column?.id === "excluded_product_categories"
    ) {
      sourceList = categories || [];
    }
  }

  // id/obj -> name
  const resolveName = (item, idx) => {
    if (item && typeof item === "object" && item.name) return item.name;
    const id = typeof item === "object" ? item.id : item;
    if (sourceList && sourceList.length > 0) {
      const found = sourceList.find((x) => String(x.id) === String(id));
      if (found) return found.name;
    }
    return typeof item === "string" || typeof item === "number"
      ? String(item)
      : `#${idx + 1}`;
  };

  const displayItems = items.slice(0, 2);
  const remainingCount = items.length - 2;

  // Pro feature - always locked for categories column
  const isProFeature = column?.id === "categories";

  return (
    <div
      className="flex items-center whitespace-nowrap !flex-nowrap gap-1 max-w-full py-0.5 overflow-hidden"
      title={items.map((item, idx) => resolveName(item, idx)).join(", ")}
      onMouseDown={isProFeature ? (e) => { e.stopPropagation(); e.preventDefault(); } : undefined}
      onClick={isProFeature ? (e) => { e.stopPropagation(); e.preventDefault(); } : undefined}
      aria-disabled={isProFeature ? true : undefined}
      data-locked={isProFeature ? "true" : "false"}
    >
      {displayItems.map((item, index) => {
        const displayName = resolveName(item, index);
        return (
          <Chip
            key={index}
            size="sm"
            variant="solid"
            className="!text-xs shadow-sm flex-shrink-0"
            classNames={{
              base: "bg-slate-100 dark:bg-slate-600 opacity-100 !text-xs shadow-sm dark:shadow-xl h-5 !rounded-sm",
              content: "dark:text-slate-300 !text-xs",
            }}
          >
            {displayName}
          </Chip>
        );
      })}

      {remainingCount > 0 && (
        <span className="text-xs text-muted-foreground">+{remainingCount}</span>
      )}

      {/* ProBadge for categories - always shown */}
      {isProFeature && (
        <span className="ml-1 inline-flex items-center shrink-0 align-middle leading-none drop-shadow-sm [transform:translateY(-1px)]">
          <ProBadge />
        </span>
      )}
    </div>
  );
};

export default CategoryTagsDisplay;
