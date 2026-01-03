// src/App.jsx

import { ConfirmationDialog } from "@components/ui/custom/CustomConfirm.jsx";
import { HeroUIProvider } from "@heroui/system";
import { ToastProvider } from "@heroui/toast";
import { I18nProvider } from "@react-aria/i18n";
import { ConfigProvider } from "antd";
 import { __ } from "@wordpress/i18n";
import { Toaster } from "sonner";
import ErrorBoundary from "./ErrorBoundary.jsx";
import Layout from "./layout/Layout.jsx";

const App = () => {
   

  return (
    <ErrorBoundary __={__}>
      <ConfigProvider theme={{ token: { colorPrimary: "#9c27b0" } }}>
        <I18nProvider locale="en-GB">
        <HeroUIProvider>
          <ToastProvider
            toastProps={{
              radius: "lg",
              color: "success",
              variant: "flat",
              timeout: 3000,
              classNames: {
                closeButton: "",
              },
              shouldShowTimeoutProgress: true,
            }}
          />
          <ConfirmationDialog />
          <Toaster
            visibleToasts={3}
            expand
            toastOptions={{
              classNames: {
                toast:
                  "bg-white min-w-fit !p-0 !m-0 dark:bg-slate-800      dark:text-slate-300 dark:!border-slate-700",
              },
            }}
          />
          <Layout />
        </HeroUIProvider>
        </I18nProvider>
      </ConfigProvider>
    </ErrorBoundary>
  );
};
export default App;
