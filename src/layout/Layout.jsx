import { useEffect, Suspense } from "react";
import Navbar from "./Navbar";
import { ThemeProvider } from "./ThemeProvider";
import DesktopSidebar from "./_components/DesktopSidebar";
import { RefreshCcw } from "lucide-react";
import axios from "axios";
import ProductsPage from "@/pages/products/page";
import CouponsPage from "@/pages/coupons/page";
// import OrdersPage from "@/pages/orders/page";
// import TestsPage from "@/pages/Tests/page";
// import OpenAIAp from "./OpenAIApi";

// פתרון בעיית ריקורסיה בצד העיצוב במיוחד בטבלה של הווריאציות
export function useSafeFocusPatch() {
  useEffect(() => {
    const originalFocus = HTMLElement.prototype.focus;

    HTMLElement.prototype.focus = function (...args) {
      if (this.__isFocusing) return;
      this.__isFocusing = true;

      try {
        return originalFocus.apply(this, args);
      } finally {
        this.__isFocusing = false;
      }
    };

    return () => {
      HTMLElement.prototype.focus = originalFocus;
    };
  }, []);
}

export default function Layout() {
  useSafeFocusPatch();
  useEffect(() => {
  }, []);


  return (
    <ThemeProvider defaultTheme="system" storageKey="whizmanage-ui-theme">
      {window.location.href ===
      window.siteUrl + "/wp-admin/admin.php?page=whizmanage-tests" ? (
        <OpenAIAp />
      ) : (
        <div className="flex max-h-screen overflow-hidden">
          <DesktopSidebar />
          <div
            className="
            bg-gradient-to-r from-fuchsia-600/15 via-pink-500/10 to-pink-500/20
             dark:from-slate-900 dark:via-pink-500/20 dark:to-slate-900
			h-screen w-full flex-1 overflow-hidden
			"
          >
            <Navbar />
            <div
              className="
			sm:mt-0 mt-14 m-2 
			h-[calc(100vh-64px)] overflow-y-hidden
			shadow-sm dark:shadow-xl bg-white rounded-md dark:bg-secondary/80 dark:text-neutral-200
			scrollbar-none
			"
            >
              {/* {content} */}
              <Suspense
                fallback={
                  <RefreshCcw className="text-white w-5 h-5 animate-spin" />
                }
              >
                {window.location.href ===
                  window.siteUrl + "/wp-admin/admin.php?page=whizmanage" ||
                window.location.href ===
                  window.siteUrl +
                    "/wp-admin/admin.php?page=whizmanage-products" ? (
                  <ProductsPage />
                ) : window.location.href ===
                  window.siteUrl +
                    "/wp-admin/admin.php?page=whizmanage-coupons" ? (
                  <CouponsPage />
                ) : window.location.href ===
                  window.siteUrl +
                    "/wp-admin/admin.php?page=whizmanage-orders" ? (
                  <OrdersPage />
                ) : null}
              </Suspense>
              {console.log("free")}
              {/* {console.log(window.listExport)} */}
              {console.log(window.listProduct)}
              {console.log(window.newVersion)}
              {console.log(window.listOrders)}
              {/* { console.log( window.sheetsUrl)} */}
              {/* {console.log(window.listTaxonomies)} */}
            </div>
          </div>
        </div>
      )}
    </ThemeProvider>
  );
}
