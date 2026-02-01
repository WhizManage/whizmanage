// src/components/settings/tabs/shipping/LocalPickupTab.jsx

import { useState, useEffect } from "react";
import { __ } from "@wordpress/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Store,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Save,
  MapPin,
  Clock,
  Phone,
} from "lucide-react";
import { addToast } from "@heroui/react";
import SettingsCardHeader from "../../SettingsCardHeader";
import {
  getLocalPickupSettings,
  updateLocalPickupSettings,
  getPickupLocations,
  createPickupLocation,
  updatePickupLocation,
  deletePickupLocation,
} from "@/services/shippingService";

export default function LocalPickupTab() {
  // Settings state
  const [settings, setSettings] = useState({
    enabled: "no",
    title: "",
    cost: "",
  });
  const [originalSettings, setOriginalSettings] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  // Locations state
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    postcode: "",
    country: "",
    phone: "",
    hours: "",
    details: "",
  });

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [settingsData, locationsData] = await Promise.all([
        getLocalPickupSettings(),
        getPickupLocations(),
      ]);
      setSettings(settingsData);
      setOriginalSettings(settingsData);
      setLocations(locationsData || []);
    } catch (error) {
      addToast({
        title: __("Error", "whizmanage"),
        description: __("Failed to load local pickup settings", "whizmanage"),
        color: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings((prev) => {
      const updated = { ...prev, [key]: value };
      setHasChanges(JSON.stringify(updated) !== JSON.stringify(originalSettings));
      return updated;
    });
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await updateLocalPickupSettings(settings);
      setOriginalSettings(settings);
      setHasChanges(false);
      addToast({
        title: __("Success", "whizmanage"),
        description: __("Local pickup settings saved", "whizmanage"),
        color: "success",
      });
    } catch (error) {
      addToast({
        title: __("Error", "whizmanage"),
        description: __("Failed to save settings", "whizmanage"),
        color: "danger",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetSettings = () => {
    setSettings(originalSettings);
    setHasChanges(false);
  };

  // Location dialog handlers
  const handleOpenDialog = (location = null) => {
    if (location) {
      setEditingLocation(location);
      setFormData({
        name: location.name || "",
        address: location.address || "",
        city: location.city || "",
        state: location.state || "",
        postcode: location.postcode || "",
        country: location.country || "",
        phone: location.phone || "",
        hours: location.hours || "",
        details: location.details || "",
      });
    } else {
      setEditingLocation(null);
      setFormData({
        name: "",
        address: "",
        city: "",
        state: "",
        postcode: "",
        country: "",
        phone: "",
        hours: "",
        details: "",
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingLocation(null);
    setFormData({
      name: "",
      address: "",
      city: "",
      state: "",
      postcode: "",
      country: "",
      phone: "",
      hours: "",
      details: "",
    });
  };

  const handleSaveLocation = async () => {
    if (!formData.name.trim()) {
      addToast({
        title: __("Error", "whizmanage"),
        description: __("Location name is required", "whizmanage"),
        color: "danger",
      });
      return;
    }

    setIsSaving(true);
    try {
      if (editingLocation) {
        const response = await updatePickupLocation(editingLocation.id, formData);
        if (response.success) {
          setLocations((prev) =>
            prev.map((loc) =>
              loc.id === editingLocation.id ? response.location : loc
            )
          );
          addToast({
            title: __("Success", "whizmanage"),
            description: __("Pickup location updated", "whizmanage"),
            color: "success",
          });
        } else {
          throw new Error(response.error || "Failed to update");
        }
      } else {
        const response = await createPickupLocation(formData);
        if (response.success) {
          setLocations((prev) => [...prev, response.location]);
          addToast({
            title: __("Success", "whizmanage"),
            description: __("Pickup location created", "whizmanage"),
            color: "success",
          });
        } else {
          throw new Error(response.error || "Failed to create");
        }
      }
      handleCloseDialog();
    } catch (error) {
      addToast({
        title: __("Error", "whizmanage"),
        description: error.message || __("Failed to save pickup location", "whizmanage"),
        color: "danger",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (location) => {
    setLocationToDelete(location);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!locationToDelete) return;

    setIsSaving(true);
    try {
      const response = await deletePickupLocation(locationToDelete.id);
      if (response.success) {
        setLocations((prev) => prev.filter((loc) => loc.id !== locationToDelete.id));
        addToast({
          title: __("Success", "whizmanage"),
          description: __("Pickup location deleted", "whizmanage"),
          color: "success",
        });
      } else {
        throw new Error(response.error || "Failed to delete");
      }
    } catch (error) {
      addToast({
        title: __("Error", "whizmanage"),
        description: error.message || __("Failed to delete pickup location", "whizmanage"),
        color: "danger",
      });
    } finally {
      setIsSaving(false);
      setDeleteDialogOpen(false);
      setLocationToDelete(null);
    }
  };

  const formatAddress = (location) => {
    const parts = [
      location.address,
      location.city,
      location.state,
      location.postcode,
      location.country,
    ].filter(Boolean);
    return parts.join(", ");
  };

  const isRtl = window?.document?.documentElement?.dir === "rtl";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-fuchsia-600" />
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {__("Loading local pickup settings...", "whizmanage")}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      {/* General Settings Card */}
      <Card className="bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600">
        <SettingsCardHeader
          icon={Store}
          title={__("Local Pickup", "whizmanage")}
          description={__(
            "Allow customers to pick up orders from your physical locations.",
            "whizmanage"
          )}
        />
        <CardContent className="space-y-6">
          {/* Enable Local Pickup */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{__("Enable Local Pickup", "whizmanage")}</Label>
              <p className="text-sm text-muted-foreground">
                {__("Allow customers to choose local pickup at checkout", "whizmanage")}
              </p>
            </div>
            <Switch
              checked={settings.enabled === "yes"}
              onCheckedChange={(checked) =>
                updateSetting("enabled", checked ? "yes" : "no")
              }
            />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="pickup-title">{__("Title", "whizmanage")}</Label>
            <Input
              id="pickup-title"
              value={settings.title}
              onChange={(e) => updateSetting("title", e.target.value)}
              placeholder={__("Local Pickup", "whizmanage")}
              className="dark:bg-slate-700 max-w-md"
            />
            <p className="text-sm text-muted-foreground">
              {__("This is shown to customers during checkout.", "whizmanage")}
            </p>
          </div>

          {/* Cost */}
          <div className="space-y-2">
            <Label htmlFor="pickup-cost">{__("Cost", "whizmanage")}</Label>
            <Input
              id="pickup-cost"
              type="text"
              value={settings.cost}
              onChange={(e) => updateSetting("cost", e.target.value)}
              placeholder={__("Free", "whizmanage")}
              className="dark:bg-slate-700 max-w-md"
            />
            <p className="text-sm text-muted-foreground">
              {__("Enter a cost or leave blank for free pickup.", "whizmanage")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Settings Button */}
      {hasChanges && (
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={handleResetSettings} disabled={isSaving}>
            {__("Reset", "whizmanage")}
          </Button>
          <Button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="bg-fuchsia-600 hover:bg-fuchsia-700"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 me-2 animate-spin" />
                {__("Saving...", "whizmanage")}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 me-2" />
                {__("Save Changes", "whizmanage")}
              </>
            )}
          </Button>
        </div>
      )}

      {/* Pickup Locations Card */}
      <Card className="bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600">
        <SettingsCardHeader
          icon={MapPin}
          title={__("Pickup Locations", "whizmanage")}
          description={__(
            "Add physical locations where customers can pick up their orders.",
            "whizmanage"
          )}
        />
        <CardContent>
          <Button
            onClick={() => handleOpenDialog()}
            className="bg-fuchsia-600 hover:bg-fuchsia-700"
          >
            <Plus className="w-4 h-4 me-2" />
            {__("Add Pickup Location", "whizmanage")}
          </Button>
        </CardContent>
      </Card>

      {/* Locations List */}
      {locations.length > 0 ? (
        <div className="space-y-3">
          {locations.map((location) => (
            <Card
              key={location.id}
              className="bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 hover:border-fuchsia-300 dark:hover:border-fuchsia-700 transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-fuchsia-100 to-purple-100 dark:from-fuchsia-900/30 dark:to-purple-900/30 shrink-0">
                    <Store className="w-5 h-5 text-fuchsia-600 dark:text-fuchsia-400" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                          {location.name}
                        </h3>
                        {formatAddress(location) && (
                          <div className="flex items-center gap-1 mt-1 text-sm text-slate-500 dark:text-slate-400">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{formatAddress(location)}</span>
                          </div>
                        )}
                        {location.phone && (
                          <div className="flex items-center gap-1 mt-1 text-sm text-slate-500 dark:text-slate-400">
                            <Phone className="w-3.5 h-3.5 shrink-0" />
                            <span>{location.phone}</span>
                          </div>
                        )}
                        {location.hours && (
                          <div className="flex items-center gap-1 mt-1 text-sm text-slate-500 dark:text-slate-400">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>{location.hours}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(location)}
                          className="h-9 w-9 text-slate-500 hover:text-fuchsia-600 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-900/30"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(location)}
                          className="h-9 w-9 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600">
          <CardContent className="py-12">
            <div className="text-center">
              <Store className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                {__("No pickup locations yet", "whizmanage")}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                {__(
                  "Add physical locations where customers can pick up their orders.",
                  "whizmanage"
                )}
              </p>
              <Button
                onClick={() => handleOpenDialog()}
                className="bg-fuchsia-600 hover:bg-fuchsia-700"
              >
                <Plus className="w-4 h-4 me-2" />
                {__("Add Your First Location", "whizmanage")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Location Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen} dir={isRtl ? "rtl" : "ltr"}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="w-5 h-5 text-fuchsia-600" />
              {editingLocation
                ? __("Edit Pickup Location", "whizmanage")
                : __("Add Pickup Location", "whizmanage")}
            </DialogTitle>
            <DialogDescription>
              {__(
                "Enter the details for this pickup location.",
                "whizmanage"
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Location Name */}
            <div className="space-y-2">
              <Label htmlFor="location-name">
                {__("Location Name", "whizmanage")} *
              </Label>
              <Input
                id="location-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder={__("e.g., Main Store", "whizmanage")}
                className="dark:bg-slate-700"
              />
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="location-address">{__("Address", "whizmanage")}</Label>
              <Input
                id="location-address"
                value={formData.address}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, address: e.target.value }))
                }
                placeholder={__("Street address", "whizmanage")}
                className="dark:bg-slate-700"
              />
            </div>

            {/* City & State */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location-city">{__("City", "whizmanage")}</Label>
                <Input
                  id="location-city"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, city: e.target.value }))
                  }
                  className="dark:bg-slate-700"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location-state">{__("State/Province", "whizmanage")}</Label>
                <Input
                  id="location-state"
                  value={formData.state}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, state: e.target.value }))
                  }
                  className="dark:bg-slate-700"
                />
              </div>
            </div>

            {/* Postcode & Country */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location-postcode">{__("Postcode/ZIP", "whizmanage")}</Label>
                <Input
                  id="location-postcode"
                  value={formData.postcode}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, postcode: e.target.value }))
                  }
                  className="dark:bg-slate-700"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location-country">{__("Country", "whizmanage")}</Label>
                <Input
                  id="location-country"
                  value={formData.country}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, country: e.target.value }))
                  }
                  className="dark:bg-slate-700"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="location-phone">{__("Phone", "whizmanage")}</Label>
              <Input
                id="location-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder={__("Contact phone number", "whizmanage")}
                className="dark:bg-slate-700"
              />
            </div>

            {/* Hours */}
            <div className="space-y-2">
              <Label htmlFor="location-hours">{__("Business Hours", "whizmanage")}</Label>
              <Input
                id="location-hours"
                value={formData.hours}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, hours: e.target.value }))
                }
                placeholder={__("e.g., Mon-Fri 9:00-18:00", "whizmanage")}
                className="dark:bg-slate-700"
              />
            </div>

            {/* Additional Details */}
            <div className="space-y-2">
              <Label htmlFor="location-details">
                {__("Additional Details", "whizmanage")}
              </Label>
              <Textarea
                id="location-details"
                value={formData.details}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, details: e.target.value }))
                }
                placeholder={__(
                  "Parking information, access instructions, etc.",
                  "whizmanage"
                )}
                className="dark:bg-slate-700 min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseDialog}
              disabled={isSaving}
            >
              {__("Cancel", "whizmanage")}
            </Button>
            <Button
              onClick={handleSaveLocation}
              disabled={!formData.name.trim() || isSaving}
              className="bg-fuchsia-600 hover:bg-fuchsia-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  {__("Saving...", "whizmanage")}
                </>
              ) : editingLocation ? (
                __("Update Location", "whizmanage")
              ) : (
                __("Create Location", "whizmanage")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} dir={isRtl ? "rtl" : "ltr"}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {__("Delete Pickup Location", "whizmanage")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {__(
                "Are you sure you want to delete this pickup location? This action cannot be undone.",
                "whizmanage"
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>
              {__("Cancel", "whizmanage")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isSaving}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  {__("Deleting...", "whizmanage")}
                </>
              ) : (
                __("Delete", "whizmanage")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
