// src/components/settings/tabs/shipping/ShippingZonesTab.jsx

import { useState, useEffect } from "react";
import { __ } from "@wordpress/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Truck, Plus, Loader2, Globe, AlertCircle } from "lucide-react";
import SettingsCardHeader from "../../SettingsCardHeader";
import { useShipping } from "@/hooks/useShipping";
import ShippingZoneCard from "./ShippingZoneCard";
import ZoneDialog from "./ZoneDialog";

export default function ShippingZonesTab({ onMethodOrderChange, saveMethodOrderRef }) {
  const {
    zones,
    availableLocations,
    availableMethods,
    isLoading,
    isSaving,
    createZone,
    updateZone,
    deleteZone,
    addMethod,
    updateMethod,
    deleteMethod,
    toggleMethod,
    reorderMethods,
    hasMethodOrderChanges,
    saveAllMethodOrders,
    resetAllMethodOrders,
  } = useShipping();

  // Check if any zone has method order changes
  const hasAnyMethodOrderChanges = zones.some((zone) => hasMethodOrderChanges(zone.id));

  // Notify parent when method order changes
  useEffect(() => {
    if (onMethodOrderChange) {
      onMethodOrderChange(hasAnyMethodOrderChanges);
    }
  }, [hasAnyMethodOrderChanges, onMethodOrderChange]);

  // Expose save function to parent via ref
  useEffect(() => {
    if (saveMethodOrderRef) {
      saveMethodOrderRef.current = {
        save: saveAllMethodOrders,
        reset: resetAllMethodOrders,
      };
    }
  }, [saveMethodOrderRef, saveAllMethodOrders, resetAllMethodOrders]);

  const [zoneDialogOpen, setZoneDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState(null);

  // Separate rest of world zone from custom zones
  const restOfWorldZone = zones.find((z) => z.is_default);
  const customZones = zones.filter((z) => !z.is_default);

  const handleCreateZone = async (data) => {
    await createZone(data);
    setZoneDialogOpen(false);
  };

  const handleUpdateZone = async (data) => {
    await updateZone(editingZone.id, data);
    setZoneDialogOpen(false);
    setEditingZone(null);
  };

  const handleEditZone = (zone) => {
    setEditingZone(zone);
    setZoneDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setZoneDialogOpen(false);
    setEditingZone(null);
  };

  const isRtl = window?.document?.documentElement?.dir === "rtl";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-fuchsia-600" />
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {__("Loading shipping zones...", "whizmanage")}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header Card with Add Zone button */}
      <Card className="bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600">
        <SettingsCardHeader
          icon={Truck}
          title={__("Shipping Zones", "whizmanage")}
          description={__(
            "Configure where you ship and how much you charge",
            "whizmanage"
          )}
        />
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {__(
              "A shipping zone is a geographic region where a certain set of shipping methods are offered. Customers will see shipping options based on the zone they match.",
              "whizmanage"
            )}
          </p>

          <Button
            onClick={() => setZoneDialogOpen(true)}
            size="sm"
            className="bg-fuchsia-600 hover:bg-fuchsia-700"
            disabled={isSaving}
          >
            <Plus className="w-4 h-4 me-2" />
            {__("Add Shipping Zone", "whizmanage")}
          </Button>
        </CardContent>
      </Card>

      {/* Custom Zones List */}
      {customZones.length === 0 && !restOfWorldZone && (
        <Card className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-600">
          <CardContent className="py-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-slate-400 mb-3" />
            <p className="text-slate-600 dark:text-slate-400">
              {__("No shipping zones configured yet.", "whizmanage")}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
              {__(
                'Click "Add Shipping Zone" to create your first zone.',
                "whizmanage"
              )}
            </p>
          </CardContent>
        </Card>
      )}

      {customZones.map((zone) => (
        <ShippingZoneCard
          key={zone.id}
          zone={zone}
          availableLocations={availableLocations}
          availableMethods={availableMethods}
          onEdit={() => handleEditZone(zone)}
          onDelete={() => deleteZone(zone.id)}
          onAddMethod={(methodId) => addMethod(zone.id, methodId)}
          onUpdateMethod={(instanceId, data) =>
            updateMethod(zone.id, instanceId, data)
          }
          onDeleteMethod={(instanceId) => deleteMethod(zone.id, instanceId)}
          onToggleMethod={(instanceId, enabled) =>
            toggleMethod(zone.id, instanceId, enabled)
          }
          onReorderMethods={(oldIndex, newIndex) =>
            reorderMethods(zone.id, oldIndex, newIndex)
          }
          isSaving={isSaving}
        />
      ))}

      {/* Rest of World Zone (always last, cannot be deleted) */}
      {restOfWorldZone && (
        <Card className="bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-600">
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-600">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700">
                <Globe className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-700 dark:text-slate-300">
                  {__("Locations not covered by your other zones", "whizmanage")}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {__(
                    "This zone is used as a fallback for customers outside other zones",
                    "whizmanage"
                  )}
                </p>
              </div>
            </div>
          </div>

          <ShippingZoneCard
            zone={restOfWorldZone}
            isDefault
            availableMethods={availableMethods}
            onAddMethod={(methodId) => addMethod(0, methodId)}
            onUpdateMethod={(instanceId, data) =>
              updateMethod(0, instanceId, data)
            }
            onDeleteMethod={(instanceId) => deleteMethod(0, instanceId)}
            onToggleMethod={(instanceId, enabled) =>
              toggleMethod(0, instanceId, enabled)
            }
            onReorderMethods={(oldIndex, newIndex) =>
              reorderMethods(0, oldIndex, newIndex)
            }
            isSaving={isSaving}
          />
        </Card>
      )}

      {/* Zone Create/Edit Dialog */}
      <ZoneDialog
        open={zoneDialogOpen}
        onOpenChange={handleCloseDialog}
        zone={editingZone}
        availableLocations={availableLocations}
        onSave={editingZone ? handleUpdateZone : handleCreateZone}
        isSaving={isSaving}
      />
    </div>
  );
}
