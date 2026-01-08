// src/hooks/useFieldVisibility.js

import { useState, useEffect, useCallback } from "react";
import { getSettings } from "@/services/settingsService";

// Module-level cache to avoid refetching on every hook mount
let cachedHiddenFields = null;
let cachePromise = null;

/**
 * Load and cache hidden fields settings
 * Returns cached data if available, otherwise fetches from API
 */
async function loadAndCacheHiddenFields() {
  // Return cached data if available
  if (cachedHiddenFields !== null) {
    return cachedHiddenFields;
  }

  // If already loading, wait for the existing promise
  if (cachePromise) {
    return cachePromise;
  }

  // Start loading and cache the promise
  cachePromise = (async () => {
    try {
      const settings = await getSettings();
      const stored = settings.whizmanage_hidden_fields;

      if (stored) {
        if (typeof stored === "string") {
          try {
            cachedHiddenFields = JSON.parse(stored);
          } catch {
            cachedHiddenFields = {};
          }
        } else {
          cachedHiddenFields = stored;
        }
      } else {
        cachedHiddenFields = {};
      }
    } catch (err) {
      console.error("Failed to load field visibility settings:", err);
      cachedHiddenFields = {};
    }
    return cachedHiddenFields;
  })();

  return cachePromise;
}

/**
 * Invalidate the cache when settings are updated
 * Call this after saving field visibility settings
 */
export function invalidateFieldVisibilityCache() {
  cachedHiddenFields = null;
  cachePromise = null;
}

/**
 * Custom hook for managing field visibility in forms
 * Reads hidden fields from settings and provides filtering utilities
 */
export function useFieldVisibility() {
  const [hiddenFields, setHiddenFields] = useState(cachedHiddenFields || {});
  const [isLoaded, setIsLoaded] = useState(cachedHiddenFields !== null);

  // Load hidden fields from cache or API
  useEffect(() => {
    // If already cached, use cached data immediately
    if (cachedHiddenFields !== null) {
      setHiddenFields(cachedHiddenFields);
      setIsLoaded(true);
      return;
    }

    // Otherwise, load from API
    loadAndCacheHiddenFields().then((data) => {
      setHiddenFields(data);
      setIsLoaded(true);
    });
  }, []);

  /**
   * Check if a specific field is hidden for an entity
   * @param {string} entityKey - Entity key (products, coupons, orders, customers, discount_rules)
   * @param {string} fieldName - Field name to check
   * @returns {boolean} - True if field is hidden
   */
  const isFieldHidden = useCallback(
    (entityKey, fieldName) => {
      const entityHidden = hiddenFields[entityKey] || [];
      return entityHidden.includes(fieldName);
    },
    [hiddenFields]
  );

  /**
   * Filter form config groups to exclude hidden fields
   * @param {string} entityKey - Entity key
   * @param {Array} groups - Form config groups array
   * @returns {Array} - Filtered groups with hidden fields removed
   */
  const filterFormConfig = useCallback(
    (entityKey, groups) => {
      if (!groups || !Array.isArray(groups)) return groups;

      const entityHidden = hiddenFields[entityKey] || [];
      if (entityHidden.length === 0) return groups;

      return groups
        .map((group) => ({
          ...group,
          fields: group.fields?.filter(
            (field) => !entityHidden.includes(field.name)
          ),
        }))
        .filter((group) => group.fields && group.fields.length > 0);
    },
    [hiddenFields]
  );

  /**
   * Get list of hidden field names for an entity
   * @param {string} entityKey - Entity key
   * @returns {Array} - Array of hidden field names
   */
  const getHiddenFieldsForEntity = useCallback(
    (entityKey) => {
      return hiddenFields[entityKey] || [];
    },
    [hiddenFields]
  );

  return {
    hiddenFields,
    isLoaded,
    isFieldHidden,
    filterFormConfig,
    getHiddenFieldsForEntity,
  };
}

/**
 * Map entity names to their config keys
 * Used to translate between API entity names and config keys
 */
export const ENTITY_KEY_MAP = {
  products: "products",
  coupons: "coupons",
  orders: "orders",
  customers: "customers",
  discount_rules: "discount_rules",
  "discount-rules": "discount_rules",
};

/**
 * Get the entity key for field visibility from the entity name
 * @param {string} entityName - Entity name from the form (e.g., "products", "coupons")
 * @returns {string} - Entity key for field visibility
 */
export function getEntityKeyFromName(entityName) {
  return ENTITY_KEY_MAP[entityName] || entityName;
}
