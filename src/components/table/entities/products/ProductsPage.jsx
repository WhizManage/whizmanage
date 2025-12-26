// src/components/pages/table/products/ProductsPage.jsx

// ✅ ייבוא הקונטיינר הגנרי
import EntityDataTableContainer from "@components/table/containers/EntityDataTableContainer"; 
// ✅ ייבוא חבילת הקונפיגורציה של מוצרים (סטטי)
import { productsConfig } from "@components/table/entities/products/products.config.js";

// ⬅️ הסרנו את useEffect והטעינה המוקדמת!

export default function ProductsPage() {
  // ✅ רנדר ישיר - הטעינה תקרה רק כשפילטר נפתח
  return <EntityDataTableContainer entityConfig={productsConfig} />;
}