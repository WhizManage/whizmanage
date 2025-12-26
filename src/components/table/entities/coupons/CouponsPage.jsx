// src/components/pages/table/coupons/CouponsPage.jsx
import { useCoreTaxonomiesStore } from "@/components/table/store/useCoreTaxonomiesStore";
import EntityDataTableContainer from "@components/table/containers/EntityDataTableContainer";
import { couponsConfig } from "@components/table/entities/coupons/coupons.config.js";
import { useEffect, useState } from "react";
import { getApi, postApi } from "@/services/services";
 import { __ } from "@wordpress/i18n";
import { RefreshCcw, TicketPercent } from "lucide-react";

export default function CouponsPage() {
   
  const { loadTaxonomiesOnce } = useCoreTaxonomiesStore();
  const [isEnabling, setIsEnabling] = useState(false);

  useEffect(() => {
    loadTaxonomiesOnce();
  }, []);

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
          const parsed = JSON.parse(res.data);
          const flattened = parsed.flatMap((p) => [p, ...(p.subRows || [])]);
          allProducts = [...allProducts, ...flattened];
          window.listProduct = allProducts;
          // שלח אירוע כדי שהתאים ידעו שהמוצרים עודכנו
          window.dispatchEvent(new CustomEvent("listProductUpdated", { detail: { count: allProducts.length } }));

          if (flattened.length < perPage) break;
          currentPage++;
        }
      } catch (e) {
        console.error("Failed to fetch products:", e);
      }
    };

    fetchDataProducts();
  }, []);

  // פונקציה להפעלת הקופונים
  const handleEnableCoupons = async () => {
    setIsEnabling(true);
    try {
      const response = await postApi(
        `${window.siteUrl}/wp-json/whizmanage/v1/toggle-coupons`,
        { enable: "yes" }
      );
      if (response.data.status === "success") {
        window.statusCoupons = "yes";
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to enable coupons:", error);
    }
    setIsEnabling(false);
  };

  // אם הקופונים מושבתים - הצג מסך הפעלה
  if (window.statusCoupons !== "yes") {
    return (
      <div className="max-w-full overflow-x-auto scrollbar-whiz overflow-hidden min-h-full">
        <div className="text-center w-full h-[calc(100vh-64px)] flex flex-col items-center justify-center gap-6 p-4">
          {/* אייקון */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-fuchsia-100 to-pink-100 dark:from-fuchsia-900/30 dark:to-pink-900/30 flex items-center justify-center">
            <TicketPercent className="w-10 h-10 text-fuchsia-600 dark:text-fuchsia-400" />
          </div>

          {/* טקסט */}
          <div className="flex flex-col items-center justify-center gap-2">
            <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
              {__("Coupons are currently disabled", "whizmanage")}
            </h2>
            <p className="text-base text-muted-foreground max-w-md">
              {__(
                "Enable them to allow customers to apply coupon codes from the cart and checkout pages.",
                "whizmanage"
              )}
            </p>
          </div>

          {/* כפתור הפעלה */}
          <button
            onClick={handleEnableCoupons}
            disabled={isEnabling}
            className="bg-gradient-to-r from-fuchsia-600 to-pink-500 hover:from-fuchsia-700 hover:to-pink-600 disabled:opacity-70 disabled:cursor-not-allowed text-white font-semibold text-base py-2.5 px-6 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2"
          >
            {isEnabling && (
              <RefreshCcw className="w-5 h-5 animate-spin" />
            )}
            <span>{__("Enable Coupons", "whizmanage")}</span>
          </button>
        </div>
      </div>
    );
  }

  // אם הקופונים מופעלים - הצג את הטבלה
  return <EntityDataTableContainer entityConfig={couponsConfig} />;
}