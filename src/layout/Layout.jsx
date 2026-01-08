import { useEffect, Suspense, useState } from "react";
import Navbar from "./Navbar";
import { ThemeProvider } from "./ThemeProvider";
import { RefreshCcw } from "lucide-react";
import axios from "axios";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// New Sidebar
import { AppSidebar } from "./sidebar/AppSidebar";
import { SidebarProvider, SidebarInset } from "@components/ui/sidebar";
import { AutoStartTour } from "@/components/tour/WhatsNewTour";

// --- טבלאות ---
import ProductsTablePage from "@/components/table/entities/products/ProductsPage";
import CouponsTablePage from "@/components/table/entities/coupons/CouponsPage";
import OrdersTablePage from "@/components/table/entities/orders/OrdersPage";
import DiscountRulesPage from "@/components/table/entities/discount-rules/DiscountRulesPage";
import CustomersTablePage from "@/components/table/entities/customers/CustomersPage";
import SettingsPage from "@/components/settings/SettingsPage";

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

  window.hasLicence = false;
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
      },
    },
  }));


  return (
    <ThemeProvider defaultTheme="system" storageKey="whizmanage-ui-theme">
      <QueryClientProvider client={queryClient}>
       
        <AutoStartTour />
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <div className="flex flex-col h-screen w-full overflow-hidden bg-gradient-to-r from-fuchsia-600/15 via-pink-500/10 to-pink-500/20 dark:from-slate-900 dark:via-pink-500/20 dark:to-slate-900">
              <Navbar />
              <div className="flex-1 m-2 mt-0 ml-0 rtl:ml-2 rtl:mr-0 overflow-hidden rounded-lg bg-white dark:bg-slate-800 dark:text-neutral-200 shadow-sm dark:shadow-xl">
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center h-full">
                      <RefreshCcw className="text-fuchsia-600 w-6 h-6 animate-spin" />
                    </div>
                  }
                >
                  {(() => {
                    const currentUrl = window.location.href;
                    const baseUrl = window.siteUrl + "/wp-admin/admin.php?page=";

                    if (currentUrl === baseUrl + "whizmanage") {
                      return <ProductsTablePage />;
                    }
                    if (currentUrl === baseUrl + "whizmanage-coupons") {
                      return <CouponsTablePage />;
                    }
                    if (currentUrl === baseUrl + "whizmanage-orders") {
                      return <OrdersTablePage />;
                    }
                    if (currentUrl === baseUrl + "whizmanage-customers") {
                      return <CustomersTablePage />;
                    }
                    if (currentUrl === baseUrl + "whizmanage-discount-rules") {
                      return <DiscountRulesPage />;
                    }
                    if (currentUrl === baseUrl + "whizmanage-settings") {
                      return <SettingsPage />;
                    }

                    return null;
                  })()}
                </Suspense>
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
