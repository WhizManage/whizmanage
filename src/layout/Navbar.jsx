// src/layout/Navbar.jsx

import Button from "@components/ui/button";
import { Separator } from "@components/ui/separator";
import { SidebarTrigger } from "@components/ui/sidebar";
import { Crown, TrendingUp, X } from "lucide-react";
import { useEffect, useState } from "react";
 import { __ } from "@wordpress/i18n";
import { MenuOrder } from "./menu/MenuOrder";

const Navbar = () => {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(false);
   

  useEffect(() => {
    if (window.newVersion && window.newVersion !== window.version) {
      setIsUpdateAvailable(true);
    }
    // Show upgrade banner for free users
    if (window.hasLicence === false) {
      setShowUpgradeBanner(true);
    }
  }, []);

  return (
    <div className="sm:static dark:bg-dark z-50 h-14 w-full p-0">
      <div className="h-full w-full flex items-center gap-2 justify-between px-4 relative">
        <div className="flex h-full gap-2 items-center justify-center">
          <SidebarTrigger className="-ms-1 text-slate-600 dark:text-slate-300 hover:text-fuchsia-600 dark:hover:text-fuchsia-400" />
          <Separator orientation="vertical" className="me-2 h-4" />
        </div>
        {/* Update Available Banner */}
        {isUpdateAvailable && (
          <div className="flex shadow-sm dark:shadow-xl max-sm:border max-sm:shadow max-sm:pt-4 sm:items-center max-w-fit h-fit sm:h-10 max-sm:absolute top-2 max-sm:mr-2 bg-white dark:bg-slate-800 px-4 rounded-lg gap-4 dark:text-slate-300">
            <TrendingUp className="text-fuchsia-600 w-5 h-5 max-sm:w-7 max-sm:h-7" />
            <div className="sm:flex gap-4 justify-center items-center sm:h-6">
              <p className="sm:h-6 text-base text-slate-500 dark:text-slate-300">
                {__("There is a new version available (version number ", "whizmanage")}
                {window.newVersion}
              </p>
              <a href={window.siteUrl + "/wp-admin/plugins.php/"}>
                <Button className="h-6 !px-2" variant="gradient">
                  {__("Update now", "whizmanage")}
                </Button>
              </a>
              <div
                className="sm:w-6 sm:h-6 max-sm:pb-2 flex items-center justify-center rounded-full hover:bg-fuchsia-100 dark:hover:bg-slate-700 cursor-pointer text-fuchsia-600 hover:text-fuchsia-600 dark:text-slate-300 dark:hover:text-slate-300"
                onClick={() => setIsUpdateAvailable(false)}
              >
                <X className="w-4 h-4 dark:text-slate-300 text-slate-500 hover:text-slate-400" />
              </div>
            </div>
          </div>
        )}

        {/* Upgrade to Pro Banner */}
        {showUpgradeBanner && !isUpdateAvailable && (
          <div className="flex shadow-sm dark:shadow-xl max-sm:border max-sm:shadow max-sm:pt-4 sm:items-center max-w-fit h-fit sm:h-10 max-sm:absolute top-2 max-sm:mr-2 bg-gradient-to-r from-fuchsia-50 to-pink-50 dark:from-slate-800 dark:to-slate-800 border border-fuchsia-200 dark:border-fuchsia-900/50 px-4 rounded-lg gap-4 dark:text-slate-300">
            <Crown className="text-fuchsia-600 w-5 h-5 max-sm:w-7 max-sm:h-7" />
            <div className="sm:flex gap-4 justify-center items-center sm:h-6">
              <p className="sm:h-6 text-base text-slate-500 dark:text-slate-300">
                {__("Unlock all features with Pro", "whizmanage")}
              </p>
              <a href="https://whizmanage.com/pricing" target="_blank" rel="noopener noreferrer">
                <Button className="h-6 !px-2" variant="gradient">
                  {__("Upgrade now", "whizmanage")}
                </Button>
              </a>
              <div
                className="sm:w-6 sm:h-6 max-sm:pb-2 flex items-center justify-center rounded-full hover:bg-fuchsia-100 dark:hover:bg-slate-700 cursor-pointer text-fuchsia-600 hover:text-fuchsia-600 dark:text-slate-300 dark:hover:text-slate-300"
                onClick={() => setShowUpgradeBanner(false)}
              >
                <X className="w-4 h-4 dark:text-slate-300 text-slate-500 hover:text-slate-400" />
              </div>
            </div>
          </div>
        )}
        <MenuOrder />
      </div>
    </div>
  );
};

export default Navbar;
