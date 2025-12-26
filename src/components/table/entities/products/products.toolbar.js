// src/components/pages/table/products/productsToolbarConfig.js

/** התאמה מיוחדת לשכפול מוצרים (כולל וריאציות) */
export const productsTransform = (product) => {
  const { id, number, date_created, date_modified, subRows = [], ...rest } = product;

  const base = {
    ...rest,
    name: `${rest.name} (copy)`,
    status: "draft",
    sku: null,
    global_unique_id: null, // ברקוד הוא גם ערך ייחודי
  };

  const variations =
    subRows?.map((v) => {
      const { id: _vid, parent_id, date_created, date_modified, ...vrest } = v;
      return {
        regular_price: vrest.regular_price ?? "",
        sku: null,
        attributes: (vrest.attributes || []).map((a) => ({
          name: a.slug || a.name || `pa_${String(a.name || "").toLowerCase()}`,
          option: a.option,
        })),
      };
    }) || [];

  if (!variations.length) return base;

  return {
    __withVariations: true,
    base,
    variations,
  };
};

export const productsCustomActions = (t) => [
];

export const productsToolbarConfig = (t /*, setData */) => ({
  entityName: "products",
  endpoint: `${window.siteUrl}/wp-json/wc/v3/products`,
  duplicateTransform: productsTransform,
  customActions: productsCustomActions(t),
});

// --- Generic alias ---
//
// Export a generic toolbar configuration so that the generic table
// container can import `entityToolbarConfig` consistently for any
// entity.  Additional entity toolbar files should export the same
// alias.
export { productsToolbarConfig as entityToolbarConfig };
