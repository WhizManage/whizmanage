// src/components/settings/SettingsPage.jsx

import { useState } from "react";
import { __ } from "@wordpress/i18n";
import {
  AnimateTabs,
  AnimateTabsList,
  AnimateTabsTriggerSimple,
  AnimateTabsContent,
  LayoutGroup,
} from "@/components/ui/animate-tabs";
import { Button } from "@/components/ui/button";
import {
  Save,
  Loader2,
  Store,
  Coins,
  Ruler,
  Receipt,
  Settings2,
  UserCircle,
  Package,
  Settings,
} from "lucide-react";
import { addToast } from "@heroui/react";
import { useSettings } from "@/hooks/useSettings";
import { IconBadge } from "@/components/ui/custom/IconBadge";
import { motion, AnimatePresence } from "framer-motion";

// Tabs
import GeneralTab from "./tabs/GeneralTab";
import CurrencyTab from "./tabs/CurrencyTab";
import UnitsTab from "./tabs/UnitsTab";
import TaxTab from "./tabs/TaxTab";
import InventoryTab from "./tabs/InventoryTab";
import WhizManageTab from "./tabs/WhizManageTab";
import AccountTab from "./tabs/AccountTab";

const TABS = [
  { id: "general", label: "General", icon: Store },
  { id: "currency", label: "Currency", icon: Coins },
  { id: "units", label: "Units", icon: Ruler },
  { id: "tax", label: "Tax", icon: Receipt },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "whizmanage", label: "WhizManage", icon: Settings2 },
  { id: "account", label: "Account", icon: UserCircle },
];

// Check if RTL
const isRtl = document.documentElement.dir === "rtl" || document.body.dir === "rtl";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");

  const {
    settings,
    originalSettings,
    currencies,
    countries,
    languages,
    timezones,
    roles,
    userInfo,
    isLoading,
    isSaving,
    updateSetting,
    updateUserInfoField,
    saveSettings,
    saveUserInfo,
    resetSettings,
    hasChanges,
    hasUserInfoChanges,
  } = useSettings();

  // Combined hasChanges check
  const hasAnyChanges = hasChanges || hasUserInfoChanges;

  // Check if language was changed
  const languageChanged = settings.WPLANG !== originalSettings.WPLANG;

  const handleSave = async () => {
    try {
      // Save settings if changed
      if (hasChanges) {
        const result = await saveSettings();
        if (!result.success) {
          throw new Error(result.errors?.join(", ") || "Failed to save settings");
        }
      }

      // Save user info if changed
      if (hasUserInfoChanges) {
        const result = await saveUserInfo();
        if (!result.success) {
          throw new Error(result.errors?.join(", ") || "Failed to save user info");
        }
      }

      // If language was changed, show toast and reload after delay
      if (languageChanged) {
        addToast({
          title: __("Success", "whizmanage"),
          description: __("Settings saved. Reloading page to apply language change...", "whizmanage"),
          color: "success",
        });
        // Reload page after a short delay to show the toast
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        addToast({
          title: __("Success", "whizmanage"),
          description: __("Settings saved successfully", "whizmanage"),
          color: "success",
        });
      }
    } catch (error) {
      addToast({
        title: __("Error", "whizmanage"),
        description:
          error.message || __("Failed to save settings", "whizmanage"),
        color: "danger",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-fuchsia-600" />
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {__("Loading settings...", "whizmanage")}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-3 sm:p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 sm:gap-3 mb-4 sm:mb-6 shrink-0">
        <div className="flex items-center gap-2 sm:gap-4 text-start min-w-0">
          <IconBadge icon={Settings} className="p-1.5 sm:p-3 shrink-0" iconClassName="w-4 h-4 sm:w-6 sm:h-6" />
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-slate-800 dark:text-slate-100 truncate">
              {__("Settings", "whizmanage")}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 hidden sm:block">
              {__("Manage your WooCommerce and WhizManage settings", "whizmanage")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {hasAnyChanges && (
            <Button
              variant="outline"
              size="sm"
              onClick={resetSettings}
              className="dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 dark:border-slate-600 px-2 sm:px-3"
            >
              {__("Reset", "whizmanage")}
            </Button>
          )}
          <Button
            onClick={handleSave}
            size="sm"
            disabled={!hasAnyChanges || isSaving}
            className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white sm:min-w-[140px] px-2 sm:px-3"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 me-1 sm:me-2 animate-spin" />
                <span className="text-xs sm:text-sm">{__("Saving...", "whizmanage")}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 me-1 sm:me-2" />
                <span className="text-xs sm:text-sm">{__("Save Changes", "whizmanage")}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Animated Tabs */}
      <LayoutGroup>
        <AnimateTabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
          dir={isRtl ? "rtl" : "ltr"}
        >
          <AnimateTabsList className="flex sm:grid sm:grid-cols-7 w-full mb-4 sm:mb-6 shrink-0 h-12 sm:h-12 overflow-x-auto scrollbar-hide gap-1.5 sm:gap-0 px-1.5 sm:px-0">
            {TABS.map((tab) => (
              <AnimateTabsTriggerSimple
                key={tab.id}
                value={tab.id}
                activeTab={activeTab}
                className="flex items-center justify-center gap-1.5 sm:gap-2 w-9 h-9 sm:w-auto sm:h-auto sm:px-4 shrink-0"
                layoutId="settings-tabs-indicator"
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden md:inline text-xs sm:text-sm">
                  {__(tab.label, "whizmanage")}
                </span>
              </AnimateTabsTriggerSimple>
            ))}
          </AnimateTabsList>

          <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-whiz sm:scrollbar-whiz scrollbar-hide pb-4">
            <AnimatePresence mode="wait">
              {activeTab === "general" && (
                <motion.div
                  key="general"
                  initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isRtl ? 20 : -20 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                >
                  <GeneralTab
                    settings={settings}
                    countries={countries}
                    languages={languages}
                    timezones={timezones}
                    roles={roles}
                    onUpdate={updateSetting}
                  />
                </motion.div>
              )}

              {activeTab === "currency" && (
                <motion.div
                  key="currency"
                  initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isRtl ? 20 : -20 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                >
                  <CurrencyTab
                    settings={settings}
                    currencies={currencies}
                    onUpdate={updateSetting}
                  />
                </motion.div>
              )}

              {activeTab === "units" && (
                <motion.div
                  key="units"
                  initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isRtl ? 20 : -20 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                >
                  <UnitsTab settings={settings} onUpdate={updateSetting} />
                </motion.div>
              )}

              {activeTab === "tax" && (
                <motion.div
                  key="tax"
                  initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isRtl ? 20 : -20 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                >
                  <TaxTab settings={settings} onUpdate={updateSetting} />
                </motion.div>
              )}

              {activeTab === "inventory" && (
                <motion.div
                  key="inventory"
                  initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isRtl ? 20 : -20 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                >
                  <InventoryTab settings={settings} onUpdate={updateSetting} />
                </motion.div>
              )}

              {activeTab === "whizmanage" && (
                <motion.div
                  key="whizmanage"
                  initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isRtl ? 20 : -20 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                >
                  <WhizManageTab settings={settings} onUpdate={updateSetting} />
                </motion.div>
              )}

              {activeTab === "account" && (
                <motion.div
                  key="account"
                  initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isRtl ? 20 : -20 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                >
                  <AccountTab userInfo={userInfo} countries={countries} onUpdateUserInfo={updateUserInfoField} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </AnimateTabs>
      </LayoutGroup>

      {/* Unsaved changes indicator */}
      {hasAnyChanges && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 px-4 py-2 rounded-full shadow-lg text-sm flex items-center gap-2 z-50"
        >
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          {__("You have unsaved changes", "whizmanage")}
        </motion.div>
      )}
    </div>
  );
}
