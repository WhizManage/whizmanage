// src/components/forms/core/fields/OrderLineItemsInput.jsx

import { useEffect, useState } from "react";
 import { __ } from "@wordpress/i18n";
import { useGenericForm } from "../FormProvider";
import { getApi } from "/src/services/services";
import OrderLineItems from "@/components/table/entities/orders/components/OrderLineItems";
import Loader from "@/components/ui/custom/Loader";

export default function OrderLineItemsInput({
  name = "line_items",
  label,
  helperText,
}) {
   
  const { setValue, watch } = useGenericForm();

  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const billingEmail = watch("billing.email");
  const lineItems = watch(name) || [];

  // טעינת מוצרים
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);

      try {
        let data = Array.isArray(window?.listProduct) ? window.listProduct : null;

        // 💡 אם כבר טעון ב-window – לא עושים קריאה נוספת
        if (!data || data.length === 0) {
          // אופציונלי: fallback אם מגיעים למסך הזה בלי OrdersPage
          const url = `${window.siteUrl}/wp-json/whizmanage/v1/get_product_for_coupons/`;
          const perPage = 1000;
          let allProducts = [];
          let currentPage = 1;

          while (true) {
            const res = await getApi(`${url}?page=${currentPage}&perPage=${perPage}`);
            const parsed = typeof res.data === "string" ? JSON.parse(res.data) : res.data;

            allProducts = [...allProducts, ...parsed];

            if (parsed.length < perPage) break;
            currentPage++;
          }

          data = allProducts;
          window.listProduct = allProducts; // נשמור גם ל־קומפוננטות אחרות
        }

        // 🎯 מיפוי לפורמט שה-OrderLineItems צריך
        const formattedProducts = (data || []).map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price ?? p.regular_price ?? "0",
          regular_price: p.regular_price ?? p.price ?? "0",
          image: p.image || p.images?.[0]?.src || null,
          sku: p.sku || "",
          stock_status: p.stock_status,
          // אם כדאי – אפשר להעביר גם וריאציות:
          variations: p.subRows || [],
        }));

        setProducts(formattedProducts);
      } catch (err) {
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // פונקציה שמעדכנת את הערכים בטופס
  const handleUpdateValue = (key, value) => {
    setValue(key, value, { shouldValidate: true, shouldDirty: true });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <p>{__("No products found. Please add products first.", "whizmanage")}</p>
      </div>
    );
  }

  return (
    <div className="w-full -mt-6">
      {/* ✅ הסרת padding/margin כדי שזה ייראה טוב בטופס */}
      <OrderLineItems
        updateValue={handleUpdateValue}
        products={products}
        line_items={lineItems}
        email={billingEmail}
        row={null}
        coupon_lines={[]}
      />
    </div>
  );
}