// src/components/table/entities/orders/OrdersPage.jsx

import EntityDataTableContainer from "@components/table/containers/EntityDataTableContainer";
import { ordersConfig } from "@components/table/entities/orders/orders.config.js";
import { EmailTemplateModal } from "./EmailTemplateModal.jsx";
import { useEffect, useState, useCallback } from "react";
import { getApi } from "@/services/services";

export default function OrdersPage() {
  const [emailModalOrderId, setEmailModalOrderId] = useState(null);

  useEffect(() => {
    window.listProduct = [];

    const fetchDataProducts = async () => {
      const url = `${window.siteUrl}/wp-json/whizmanage/v1/get_product_for_coupons/`;
      const perPage = 1000;
      let allProducts = [];
      let currentPage = 1;

      try {
        while (true) {
          const res = await getApi(`${url}?page=${currentPage}&perPage=${perPage}`);
          const parsed = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
          const flattened = parsed.flatMap((p) =>
            Array.isArray(p.subRows) && p.subRows.length > 0 ? p.subRows : [p]
          );
          allProducts = [...allProducts, ...flattened];
          window.listProduct = allProducts;
          if (parsed.length < perPage) break;
          currentPage++;
        }
      } catch (e) {
        console.error("Failed to fetch products:", e);
      }
    };

    fetchDataProducts();
  }, []);

  // ✅ פונקציה יציבה לפתיחת המודל
  const openEmailModal = useCallback((orderId) => {
    setEmailModalOrderId(orderId);
  }, []);

  // ✅ הגדר את הפונקציה על window כדי שהפעולות יוכלו לגשת אליה
  useEffect(() => {
    window.__wmOpenEmailModal = openEmailModal;
    return () => {
      delete window.__wmOpenEmailModal;
    };
  }, [openEmailModal]);

  return (
    <>
      <EntityDataTableContainer
        entityConfig={ordersConfig}
      />
      
      <EmailTemplateModal
        isOpen={!!emailModalOrderId}
        onClose={() => setEmailModalOrderId(null)}
        orderId={emailModalOrderId}
      />
    </>
  );
}