// src/components/settings/tabs/ShippingTab.jsx

import { useState } from "react";
import { __ } from "@wordpress/i18n";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Settings, Tags, Store } from "lucide-react";
import { cn } from "@/lib/utils";

// Sub-tabs
import ShippingZonesTab from "./shipping/ShippingZonesTab";
import ShippingSettingsTab from "./shipping/ShippingSettingsTab";
import ShippingClassesTab from "./shipping/ShippingClassesTab";
import LocalPickupTab from "./shipping/LocalPickupTab";

const getSubTabs = () => [
  { id: "zones", label: __("Shipping Zones", "whizmanage"), shortLabel: __("Zones", "whizmanage"), icon: MapPin },
  { id: "settings", label: __("Settings", "whizmanage"), icon: Settings },
  { id: "classes", label: __("Classes", "whizmanage"), icon: Tags },
  { id: "local_pickup", label: __("Local Pickup", "whizmanage"), shortLabel: __("Pickup", "whizmanage"), icon: Store },
];

export default function ShippingTab({ onMethodOrderChange, saveMethodOrderRef }) {
  const [activeSubTab, setActiveSubTab] = useState("zones");
  const subTabs = getSubTabs();
  const isRtl = window?.document?.documentElement?.dir === "rtl";

  return (
    <div className="space-y-6 text-start" dir={isRtl ? "rtl" : "ltr"}>
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} dir={isRtl ? "rtl" : "ltr"}>
        <TabsList className="inline-flex h-auto p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6 gap-1">
          {subTabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200",
                "data-[state=inactive]:text-slate-500 data-[state=inactive]:hover:text-slate-700 data-[state=inactive]:hover:bg-slate-200/50",
                "dark:data-[state=inactive]:text-slate-400 dark:data-[state=inactive]:hover:text-slate-200 dark:data-[state=inactive]:hover:bg-slate-700/50",
                "data-[state=active]:bg-white data-[state=active]:text-fuchsia-600 data-[state=active]:shadow-sm",
                "dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-fuchsia-400"
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.shortLabel && (
                <span className="sm:hidden">{tab.shortLabel}</span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="zones">
          <ShippingZonesTab
            onMethodOrderChange={onMethodOrderChange}
            saveMethodOrderRef={saveMethodOrderRef}
          />
        </TabsContent>

        <TabsContent value="settings">
          <ShippingSettingsTab />
        </TabsContent>

        <TabsContent value="classes">
          <ShippingClassesTab />
        </TabsContent>

        <TabsContent value="local_pickup">
          <LocalPickupTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
