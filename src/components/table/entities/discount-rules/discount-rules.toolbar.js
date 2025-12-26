// src/components/table/entities/discount-rules/discount-rules.toolbar.js

export const discountRulesTransform = (rule) => {
  const { id, date_created, date_modified, usage_count, ...rest } = rule || {};
  return {
    ...rest,
    name: rest?.name ? `${rest.name} (copy)` : "Discount rule (copy)",
    status: 0,
    usage_count: 0,
  };
};

export const discountRulesCustomActions = (__) => [
  // פעולות ייעודיות אם תרצה בהמשך
];

export const discountRulesToolbarConfig = (__) => ({
  entityName: "discount-rules",
  endpoint: `${window.siteUrl}/wp-json/whizmanage/v1/discount-rules`,
  duplicateTransform: discountRulesTransform,
  customActions: discountRulesCustomActions(__),
});

// ה־EntityDataTableContainer יחפש בשם הזה:
export { discountRulesToolbarConfig as entityToolbarConfig };
