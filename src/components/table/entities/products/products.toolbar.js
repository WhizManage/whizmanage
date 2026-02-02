// src/components/pages/table/products/productsToolbarConfig.js

// Duplicate removed - Pro feature only

export const productsCustomActions = (t) => [
];

export const productsToolbarConfig = (t /*, setData */) => ({
  entityName: "products",
  endpoint: `${window.siteUrl}/wp-json/wc/v3/products`,
  customActions: productsCustomActions(t),
});

// --- Generic alias ---
//
// Export a generic toolbar configuration so that the generic table
// container can import `entityToolbarConfig` consistently for any
// entity.  Additional entity toolbar files should export the same
// alias.
export { productsToolbarConfig as entityToolbarConfig };
