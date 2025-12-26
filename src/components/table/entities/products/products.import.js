// src/components/table/entities/products/products.import.js

/**
 * ✅ קונפיגורציה ליבוא מוצרים מ-Google Sheets
 * 
 * זה הקובץ שמגדיר איך היבוא עובד עבור מוצרים.
 * אנטיטי אחרים (coupons, customers, orders) לא יכללו את זה.
 */

export const productsImportConfig = {
  // האם ליבוא מופעל עבור אנטיטי זה
  enabled: true,
  
  // כותרת הכפתור
  buttonLabel: "Import",
  
  // האם להציג את הכפתור ב-TopPanel
  showInTopPanel: true,
  
  // endpoint לשמירת הגדרות
  settingsEndpoint: `${window.siteUrl}/wp-json/whizmanage/v1/import-settings`,
  
  // endpoint לקריאת הגדרות קיימות
  loadSettingsEndpoint: `${window.siteUrl}/wp-json/whizmanage/v1/import-settings`,
  
  // endpoint לקבלת custom fields זמינים
  customFieldsEndpoint: `${window.siteUrl}/wp-json/whizmanage/v1/custom-fields`,
  
  // האם לאפשר בחירת מוצרים
  enableProductSelection: true,
  
  // האם לאפשר בחירת שדות מותאמים אישית
  enableCustomFields: true,
  
  // הודעות
  messages: {
    saveSuccess: "Import settings saved successfully",
    saveError: "Failed to save import settings",
    loadError: "Failed to load import settings",
    missingUrl: "Please enter a Google Sheets URL",
  }
};

// Export generic alias
export { productsImportConfig as entityImportConfig };