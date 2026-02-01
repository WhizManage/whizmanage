// src/hooks/useShipping.js

import { useState, useEffect, useCallback } from "react";
import { addToast } from "@heroui/react";
import { __ } from "@wordpress/i18n";
import {
  getShippingZones,
  createShippingZone,
  updateShippingZone,
  deleteShippingZone,
  addShippingMethod,
  updateShippingMethod,
  deleteShippingMethod,
  reorderShippingMethods,
  getAvailableLocations,
  getAvailableMethods,
} from "@/services/shippingService";

export function useShipping() {
  const [zones, setZones] = useState([]);
  const [originalMethodOrders, setOriginalMethodOrders] = useState({}); // Track original order per zone
  const [availableLocations, setAvailableLocations] = useState({
    continents: [],
    countries: [],
  });
  const [availableMethods, setAvailableMethods] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [zonesData, locationsData, methodsData] = await Promise.all([
        getShippingZones(),
        getAvailableLocations(),
        getAvailableMethods(),
      ]);

      setZones(zonesData);
      // Store original method orders for each zone
      const orders = {};
      zonesData.forEach((zone) => {
        orders[zone.id] = zone.methods.map((m) => m.instance_id);
      });
      setOriginalMethodOrders(orders);
      setAvailableLocations(locationsData);
      setAvailableMethods(methodsData);
    } catch (err) {
      setError(err.message || "Failed to load shipping data");
      addToast({
        title: __("Error", "whizmanage"),
        description: __("Failed to load shipping zones", "whizmanage"),
        color: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Create zone
  const createZone = useCallback(async (data) => {
    setIsSaving(true);

    try {
      const response = await createShippingZone(data);

      if (response.success) {
        setZones((prev) => {
          // Insert before the default zone (zone 0)
          const defaultZone = prev.find((z) => z.is_default);
          const otherZones = prev.filter((z) => !z.is_default);
          return [...otherZones, response.zone, ...(defaultZone ? [defaultZone] : [])];
        });

        addToast({
          title: __("Success", "whizmanage"),
          description: __("Shipping zone created", "whizmanage"),
          color: "success",
        });

        return response.zone;
      } else {
        throw new Error(response.error || "Failed to create zone");
      }
    } catch (err) {
      addToast({
        title: __("Error", "whizmanage"),
        description: err.message || __("Failed to create zone", "whizmanage"),
        color: "danger",
      });
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Update zone
  const updateZone = useCallback(async (zoneId, data) => {
    setIsSaving(true);

    try {
      const response = await updateShippingZone(zoneId, data);

      if (response.success) {
        setZones((prev) =>
          prev.map((zone) => (zone.id === zoneId ? response.zone : zone))
        );

        addToast({
          title: __("Success", "whizmanage"),
          description: __("Shipping zone updated", "whizmanage"),
          color: "success",
        });

        return response.zone;
      } else {
        throw new Error(response.error || "Failed to update zone");
      }
    } catch (err) {
      addToast({
        title: __("Error", "whizmanage"),
        description: err.message || __("Failed to update zone", "whizmanage"),
        color: "danger",
      });
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Delete zone
  const deleteZone = useCallback(async (zoneId) => {
    setIsSaving(true);

    try {
      const response = await deleteShippingZone(zoneId);

      if (response.success) {
        setZones((prev) => prev.filter((zone) => zone.id !== zoneId));

        addToast({
          title: __("Success", "whizmanage"),
          description: __("Shipping zone deleted", "whizmanage"),
          color: "success",
        });

        return true;
      } else {
        throw new Error(response.error || "Failed to delete zone");
      }
    } catch (err) {
      addToast({
        title: __("Error", "whizmanage"),
        description: err.message || __("Failed to delete zone", "whizmanage"),
        color: "danger",
      });
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Add method to zone
  const addMethod = useCallback(async (zoneId, methodId) => {
    setIsSaving(true);

    try {
      const response = await addShippingMethod(zoneId, methodId);

      if (response.success) {
        setZones((prev) =>
          prev.map((zone) => {
            if (zone.id === zoneId) {
              return {
                ...zone,
                methods: [...zone.methods, response.method],
              };
            }
            return zone;
          })
        );

        addToast({
          title: __("Success", "whizmanage"),
          description: __("Shipping method added", "whizmanage"),
          color: "success",
        });

        return response.method;
      } else {
        throw new Error(response.error || "Failed to add method");
      }
    } catch (err) {
      addToast({
        title: __("Error", "whizmanage"),
        description: err.message || __("Failed to add method", "whizmanage"),
        color: "danger",
      });
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Update method
  const updateMethod = useCallback(async (zoneId, instanceId, data) => {
    setIsSaving(true);

    try {
      const response = await updateShippingMethod(zoneId, instanceId, data);

      if (response.success) {
        setZones((prev) =>
          prev.map((zone) => {
            if (zone.id === zoneId) {
              return {
                ...zone,
                methods: zone.methods.map((method) =>
                  method.instance_id === instanceId ? response.method : method
                ),
              };
            }
            return zone;
          })
        );

        addToast({
          title: __("Success", "whizmanage"),
          description: __("Shipping method updated", "whizmanage"),
          color: "success",
        });

        return response.method;
      } else {
        throw new Error(response.error || "Failed to update method");
      }
    } catch (err) {
      addToast({
        title: __("Error", "whizmanage"),
        description: err.message || __("Failed to update method", "whizmanage"),
        color: "danger",
      });
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Delete method
  const deleteMethod = useCallback(async (zoneId, instanceId) => {
    setIsSaving(true);

    try {
      const response = await deleteShippingMethod(zoneId, instanceId);

      if (response.success) {
        setZones((prev) =>
          prev.map((zone) => {
            if (zone.id === zoneId) {
              return {
                ...zone,
                methods: zone.methods.filter(
                  (method) => method.instance_id !== instanceId
                ),
              };
            }
            return zone;
          })
        );

        addToast({
          title: __("Success", "whizmanage"),
          description: __("Shipping method removed", "whizmanage"),
          color: "success",
        });

        return true;
      } else {
        throw new Error(response.error || "Failed to remove method");
      }
    } catch (err) {
      addToast({
        title: __("Error", "whizmanage"),
        description: err.message || __("Failed to remove method", "whizmanage"),
        color: "danger",
      });
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Toggle method enabled status
  const toggleMethod = useCallback(
    async (zoneId, instanceId, enabled) => {
      return updateMethod(zoneId, instanceId, { enabled });
    },
    [updateMethod]
  );

  // Reorder methods in a zone (local only - requires saveMethodOrder to persist)
  const reorderMethods = useCallback((zoneId, oldIndex, newIndex) => {
    setZones((prev) =>
      prev.map((zone) => {
        if (zone.id === zoneId) {
          const newMethods = [...zone.methods];
          const [movedMethod] = newMethods.splice(oldIndex, 1);
          newMethods.splice(newIndex, 0, movedMethod);
          return { ...zone, methods: newMethods };
        }
        return zone;
      })
    );
  }, []);

  // Check if zone has pending method order changes
  const hasMethodOrderChanges = useCallback(
    (zoneId) => {
      const zone = zones.find((z) => z.id === zoneId);
      const original = originalMethodOrders[zoneId];
      if (!zone || !original) return false;

      const current = zone.methods.map((m) => m.instance_id);
      return JSON.stringify(current) !== JSON.stringify(original);
    },
    [zones, originalMethodOrders]
  );

  // Save method order to server
  const saveMethodOrder = useCallback(
    async (zoneId) => {
      const zone = zones.find((z) => z.id === zoneId);
      if (!zone) return;

      setIsSaving(true);
      try {
        const methodOrder = zone.methods.map((m) => m.instance_id);
        const response = await reorderShippingMethods(zoneId, methodOrder);

        if (!response.success) {
          throw new Error(response.error || "Failed to save method order");
        }

        // Update original order to match current
        setOriginalMethodOrders((prev) => ({
          ...prev,
          [zoneId]: methodOrder,
        }));

        addToast({
          title: __("Success", "whizmanage"),
          description: __("Method order saved", "whizmanage"),
          color: "success",
        });
      } catch (err) {
        addToast({
          title: __("Error", "whizmanage"),
          description: err.message || __("Failed to save method order", "whizmanage"),
          color: "danger",
        });
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [zones]
  );

  // Reset method order to original
  const resetMethodOrder = useCallback(
    (zoneId) => {
      const original = originalMethodOrders[zoneId];
      if (!original) return;

      setZones((prev) =>
        prev.map((zone) => {
          if (zone.id === zoneId) {
            // Reorder methods to match original order
            const methodsMap = new Map(
              zone.methods.map((m) => [m.instance_id, m])
            );
            const reorderedMethods = original
              .map((id) => methodsMap.get(id))
              .filter(Boolean);
            return { ...zone, methods: reorderedMethods };
          }
          return zone;
        })
      );
    },
    [originalMethodOrders]
  );

  // Save all zones that have method order changes
  const saveAllMethodOrders = useCallback(async () => {
    const zonesWithChanges = zones.filter((zone) => {
      const original = originalMethodOrders[zone.id];
      if (!original) return false;
      const current = zone.methods.map((m) => m.instance_id);
      return JSON.stringify(current) !== JSON.stringify(original);
    });

    if (zonesWithChanges.length === 0) return;

    setIsSaving(true);
    try {
      for (const zone of zonesWithChanges) {
        const methodOrder = zone.methods.map((m) => m.instance_id);
        const response = await reorderShippingMethods(zone.id, methodOrder);

        if (!response.success) {
          throw new Error(response.error || "Failed to save method order");
        }

        // Update original order to match current
        setOriginalMethodOrders((prev) => ({
          ...prev,
          [zone.id]: methodOrder,
        }));
      }

      addToast({
        title: __("Success", "whizmanage"),
        description: __("Method order saved", "whizmanage"),
        color: "success",
      });
    } catch (err) {
      addToast({
        title: __("Error", "whizmanage"),
        description: err.message || __("Failed to save method order", "whizmanage"),
        color: "danger",
      });
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [zones, originalMethodOrders]);

  // Reset all method orders to original
  const resetAllMethodOrders = useCallback(() => {
    setZones((prev) =>
      prev.map((zone) => {
        const original = originalMethodOrders[zone.id];
        if (!original) return zone;

        const current = zone.methods.map((m) => m.instance_id);
        if (JSON.stringify(current) === JSON.stringify(original)) return zone;

        // Reorder methods to match original order
        const methodsMap = new Map(
          zone.methods.map((m) => [m.instance_id, m])
        );
        const reorderedMethods = original
          .map((id) => methodsMap.get(id))
          .filter(Boolean);
        return { ...zone, methods: reorderedMethods };
      })
    );
  }, [originalMethodOrders]);

  return {
    zones,
    availableLocations,
    availableMethods,
    isLoading,
    isSaving,
    error,
    createZone,
    updateZone,
    deleteZone,
    addMethod,
    updateMethod,
    deleteMethod,
    toggleMethod,
    reorderMethods,
    hasMethodOrderChanges,
    saveMethodOrder,
    resetMethodOrder,
    saveAllMethodOrders,
    resetAllMethodOrders,
    reload: loadData,
  };
}
