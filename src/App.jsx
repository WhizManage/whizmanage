import { ConfirmationDialog } from "@components/CustomConfirm.jsx";
import { HeroUIProvider } from "@heroui/system";
import { ConfigProvider } from "antd";

import { Toaster } from "sonner";
import ErrorBoundary from "./ErrorBoundary.jsx";
import Layout from "./layout/Layout.jsx";


const App = () => {
   

  return (
    <ErrorBoundary >
      <ConfigProvider theme={{ token: { colorPrimary: "#9c27b0" } }}>
        <HeroUIProvider>
          <ConfirmationDialog />
          <Toaster
            visibleToasts={3}
            expand
            toastOptions={{
              classNames: {
                toast:
                  "bg-white min-w-fit !p-0 !m-0 dark:bg-slate-800      dark:text-slate-400 dark:!border-slate-700",
              },
            }}
          />
          <Layout />
        </HeroUIProvider>
      </ConfigProvider>
    </ErrorBoundary>
  );
};
export default App;
