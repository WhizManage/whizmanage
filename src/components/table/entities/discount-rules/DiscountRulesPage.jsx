// src/components/table/entities/discount-rules/DiscountRulesPage.jsx

import EntityDataTableContainer from "@/components/table/containers/EntityDataTableContainer.jsx";
import { getApi } from "@/services/services";
import { useEffect } from "react";
import { discountRulesConfig } from "./discount-rules.config.js";

export default function DiscountRulesPage() {
  useEffect(() => {
    window.listProduct = [];
    const fetchDataProducts = async () => {
      const url = `${window.siteUrl}/wp-json/whizmanage/v1/get_product_for_coupons/`;
      const perPage = 1000;
      let allProducts = [];
      let currentPage = 1;

      try {
        while (true) {
          const res = await getApi(
            `${url}?page=${currentPage}&perPage=${perPage}`
          );
          const parsed = JSON.parse(res.data);
          const flattened = parsed.flatMap((p) => [p, ...(p.subRows || [])]);
          allProducts = [...allProducts, ...flattened];
          window.listProduct = allProducts;

          if (flattened.length < perPage) break;
          currentPage++;
        }
      } catch (e) {
        console.error("Failed to fetch products:", e);
      }
    };

    fetchDataProducts();
  }, []);

  return <EntityDataTableContainer entityConfig={discountRulesConfig} />;
}
