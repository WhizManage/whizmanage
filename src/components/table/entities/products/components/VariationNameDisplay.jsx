// src/components/table/products/components/variation/components/VariationNameDisplay.jsx

/**
 * Helper: Decode URL-encoded strings (for Hebrew/Unicode characters from WooCommerce API)
 */
const decodeUrlString = (encodedString) => {
  try {
    return decodeURIComponent(encodedString);
  } catch {
    return encodedString;
  }
};

/**
 * Helper: ממיר slug של option ל-name באמצעות terms מהמוצר האב
 * @param {string} optionValue - הערך של ה-option (יכול להיות slug או name)
 * @param {Object} attr - ה-attribute עם name/slug
 * @param {Object} parentProduct - המוצר האב שמכיל את ה-terms
 * @returns {string} ה-name של ה-option
 */
const convertOptionSlugToName = (optionValue, attr, parentProduct) => {
  if (!optionValue || !parentProduct) return optionValue;

  // מצא את שם ה-taxonomy key (למשל pa_צבע -> _pa_צבע)
  const attrName = attr.name || attr.slug || "";
  const taxonomyKey = attrName.startsWith("pa_") ? `_${attrName}` : `_pa_${attrName}`;

  // קבל את ה-terms מהמוצר האב
  const terms = parentProduct[taxonomyKey] || [];

  if (terms.length === 0) return optionValue;

  // בדוק אם זה כבר name
  const termByName = terms.find((t) => t.name === optionValue);
  if (termByName) return optionValue;

  // חפש לפי slug והחזר את ה-name
  const termBySlug = terms.find((t) => t.slug === optionValue);
  if (termBySlug?.name) return termBySlug.name;

  return optionValue;
};

/**
 * VariationNameDisplay - תצוגת שם מוצר/ווריאציה
 */
const VariationNameDisplay = ({ value, __, row }) => {
  // זיהוי ווריאציה - גם לפי row.depth וגם לפי parent_id
  const isVariation = row?.depth > 0 || (row?.original?.parent_id && row.original.parent_id > 0);

  // אם זו ווריאציה, נבנה את השם מה-attributes
  if (isVariation) {
    // ✅ קבל את המוצר האב דרך getParentRow()
    const parentRow = row?.getParentRow?.();
    const parentProduct = parentRow?.original || null;

    // ✅ נעדיף לקחת attributes מ-value (שמגיע מה-accessorFn) כי הוא מעודכן
    // fallback ל-row.original.attributes אם value לא מכיל attributes
    const attributes = (value && typeof value === 'object' && value.attributes)
      ? value.attributes
      : (row?.original?.attributes || []);

    if (attributes.length === 0) {
      const displayName = (value && typeof value === 'object') ? value.name : value;
      return (
        <div className="text-sm text-slate-600 dark:text-slate-300 italic">
          {displayName || __("Unnamed variation", "whizmanage")}
        </div>
      );
    }

    // בנה את שם הווריאציה מהאופציות
    const variationName = attributes
      .map(attr => {
        const option = attr.option || "";
        if (!option) {
          // אם אין אופציה - הצג "Any"
          const attrName = decodeUrlString((attr.name || attr.slug || "").replace(/^pa_/, ""));
          return `${__("Any", "whizmanage")} ${attrName}`;
        }
        // ✅ המרת slug ל-name עבור תכונות גלובליות באמצעות terms מהמוצר האב
        const optionName = convertOptionSlugToName(option, attr, parentProduct);
        return decodeUrlString(optionName);
      })
      .filter(Boolean)
      .join(" - ");

    const displayName = (value && typeof value === 'object') ? value.name : value;
    return (
      <div className="text-sm text-slate-700 dark:text-slate-300 font-normal">
        {variationName || displayName || __("Unnamed variation", "whizmanage")}
      </div>
    );
  }

  // מוצר רגיל - פשוט הצג את השם
  // value יכול להיות string (עבור מוצר רגיל) או object (אם משהו השתבש)
  const displayValue = (value && typeof value === 'object') ? value.name : value;
  return (
    <div className="text-sm font-normal text-slate-900 dark:text-slate-100">
      {displayValue || __("Unnamed product", "whizmanage")}
    </div>
  );
};

export default VariationNameDisplay;