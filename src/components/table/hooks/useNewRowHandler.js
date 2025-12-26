// src/components/table/hooks/useNewRowHandler.js

import { useCallback } from "react";
import { postApi } from "@/services/services";

/**
 * Hook לטיפול בשורות חדשות זמניות
 * כאשר משתמש עורך שורה חדשה, היא צריכה להישמר לראשונה ב-API
 * ואז להחליף את ה-ID הזמני ב-ID אמיתי
 */
export function useNewRowHandler({ store, entityName }) {
  /**
   * שומר שורה חדשה לראשונה ומחליף את ה-ID הזמני
   */
  const saveNewRow = useCallback(async (tempId, updatedData) => {
    try {
      // מציאת השורה עם ה-ID הזמני
      const tempRow = store.data.find(row => String(row.id) === String(tempId));
      if (!tempRow) {
        throw new Error(`Temporary row ${tempId} not found`);
      }

      // בניית payload למוצר חדש
      const payload = {
        ...updatedData,
        name: updatedData.name || tempRow.name || "",
      };

      // ניקוי שדות פנימיים
      delete payload._isNew;
      delete payload._needsSave;
      delete payload.id; // נסיר את ה-ID הזמני

      // קביעת endpoint לפי סוג ה-entity
      let endpoint;
      if (entityName === "products") {
        endpoint = `${window.siteUrl}/wp-json/wc/v3/products`;
      } else if (entityName === "coupons") {
        endpoint = `${window.siteUrl}/wp-json/wc/v3/coupons`;
      } else if (entityName === "orders") {
        endpoint = `${window.siteUrl}/wp-json/wc/v3/orders`;
      } else {
        throw new Error(`Unknown entity: ${entityName}`);
      }

      // יצירת המוצר החדש בשרת
      const response = await postApi(endpoint, payload);
      const newItem = response.data;

      // החלפת השורה הזמנית בשורה האמיתית
      store.setData((prev) => 
        prev.map(row => {
          if (String(row.id) === String(tempId)) {
            // מחליף את השורה הזמנית בשורה האמיתית
            return {
              ...newItem,
              _isNew: false, // מסיר את הסימון
              _needsSave: false,
            };
          }
          return row;
        })
      );

      return newItem;
    } catch (error) {
      console.error("[useNewRowHandler] Failed to save new row:", error);
      throw error;
    }
  }, [store, entityName]);

  /**
   * בודק אם ID הוא זמני
   */
  const isTempId = useCallback((id) => {
    return String(id).startsWith('temp_');
  }, []);

  /**
   * מטפל בעדכון של שורה - אם זו שורה חדשה, שומר אותה לראשונה
   */
  const handleRowUpdate = useCallback(async (rowId, field, value, fullRowData) => {
    const tempId = String(rowId);
    
    // אם זה ID זמני, זו שורה חדשה שצריך ליצור
    if (isTempId(tempId)) {
      const updatedData = {
        ...fullRowData,
        [field]: value,
      };
      
      // שמירה ראשונית
      const newItem = await saveNewRow(tempId, updatedData);
      return newItem;
    }
    
    // אחרת - עדכון רגיל
    return null; // מחזיר null כדי לאפשר לזרימה הרגילה להמשיך
  }, [isTempId, saveNewRow]);

  return {
    saveNewRow,
    isTempId,
    handleRowUpdate,
  };
}