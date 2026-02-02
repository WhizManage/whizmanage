// src/components/table/entities/discount-rules/discount-rules.toolbar.js

// Duplicate is disabled for free version (Pro feature)

export const discountRulesCustomActions = (__) => [
  // פעולות ייעודיות אם תרצה בהמשך
];

export const discountRulesToolbarConfig = (__) => ({
  entityName: "discount-rules",
  endpoint: `${window.siteUrl}/wp-json/whizmanage/v1/discount-rules`,
  customActions: discountRulesCustomActions(__),
});

// ה־EntityDataTableContainer יחפש בשם הזה:
export { discountRulesToolbarConfig as entityToolbarConfig };
