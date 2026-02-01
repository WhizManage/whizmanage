# שינויים שבוצעו - תיקון תרגום "No items found"

## קובץ 1: `src/components/table/core/DataTable.jsx`

### לפני:
```jsx
<h3 className="text-lg font-semibold text-slate-800 dark:text-white">
  {isTrash
    ? __("No items in trash", "whizmanage")
    : __("No items found", "whizmanage")}
</h3>
```

### אחרי:
```jsx
<h3 className="text-lg font-semibold text-slate-800 dark:text-white">
  {(() => {
    const messages = {
      products: {
        found: __("No products found", "whizmanage"),
        trash: __("No products in trash", "whizmanage"),
      },
      orders: {
        found: __("No orders found", "whizmanage"),
        trash: __("No orders in trash", "whizmanage"),
      },
      coupons: {
        found: __("No coupons found", "whizmanage"),
        trash: __("No coupons in trash", "whizmanage"),
      },
      customers: {
        found: __("No customers found", "whizmanage"),
        trash: __("No customers in trash", "whizmanage"),
      },
      "discount-rules": {
        found: __("No discount rules found", "whizmanage"),
        trash: __("No discount rules in trash", "whizmanage"),
      },
    };
    const entityMessages = messages[entityName] || {
      found: __("No items found", "whizmanage"),
      trash: __("No items in trash", "whizmanage"),
    };
    return isTrash ? entityMessages.trash : entityMessages.found;
  })()}
</h3>
```

---

## קובץ 2: `languages/whizmanage-he_IL-manual.json`

### תרגומים שנוספו:
```json
"No coupons found": ["לא נמצאו קופונים"],
"No discount rules found": ["לא נמצאו חוקי הנחות"],
"No items in trash": ["אין פריטים באשפה"],
"No products in trash": ["אין מוצרים באשפה"],
"No orders in trash": ["אין הזמנות באשפה"],
"No coupons in trash": ["אין קופונים באשפה"],
"No customers in trash": ["אין לקוחות באשפה"],
"No discount rules in trash": ["אין חוקי הנחות באשפה"],
```

---

## סיכום
- **בעיה**: ההודעה "No entities found" לא תורגמה נכון והציגה ערבוב של אנגלית ועברית
- **פתרון**: יצירת מחרוזות תרגום נפרדות לכל סוג ישות (products, orders, coupons, customers, discount-rules)
- **תוצאה**: עכשיו כל ישות מציגה הודעה מתורגמת מלאה בעברית
