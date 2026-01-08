// src/hooks/useSettings.js

import { useState, useEffect, useCallback } from "react";
import {
  getSettings,
  updateSettings,
  getCurrencies,
  getCountries,
  getLanguages,
  getUserInfo,
  updateUserInfo,
  getTimezones,
  getRoles,
} from "@/services/settingsService";
import { invalidateFieldVisibilityCache } from "@/hooks/useFieldVisibility";

/**
 * Custom hook for managing WhizManage settings
 * Handles loading, updating, and saving settings with change tracking
 */
export function useSettings() {
  const [settings, setSettings] = useState({});
  const [originalSettings, setOriginalSettings] = useState({});
  const [currencies, setCurrencies] = useState([]);
  const [countries, setCountries] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [timezones, setTimezones] = useState([]);
  const [roles, setRoles] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [originalUserInfo, setOriginalUserInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // Load settings on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load all data in parallel
        const [settingsData, currenciesData, countriesData, languagesData, timezonesData, rolesData, userInfoData] = await Promise.all(
          [getSettings(), getCurrencies(), getCountries(), getLanguages(), getTimezones(), getRoles(), getUserInfo()]
        );

        setSettings(settingsData);
        setOriginalSettings(settingsData);
        setCurrencies(currenciesData);
        setCountries(countriesData);
        setLanguages(languagesData);
        setTimezones(timezonesData);
        setRoles(rolesData);
        setUserInfo(userInfoData);
        setOriginalUserInfo(userInfoData);
      } catch (err) {
        setError(err);
        console.error("Failed to load settings:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Update a single setting (local state only)
  const updateSetting = useCallback((key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  // Update multiple settings at once
  const updateMultipleSettings = useCallback((updates) => {
    setSettings((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  // Check if there are unsaved changes
  const hasChanges = useCallback(() => {
    // Ignore _meta field when comparing
    const currentWithoutMeta = { ...settings };
    const originalWithoutMeta = { ...originalSettings };
    delete currentWithoutMeta._meta;
    delete originalWithoutMeta._meta;

    return JSON.stringify(currentWithoutMeta) !== JSON.stringify(originalWithoutMeta);
  }, [settings, originalSettings]);

  // Get only the changed settings
  const getChangedSettings = useCallback(() => {
    const changes = {};

    Object.keys(settings).forEach((key) => {
      // Skip metadata
      if (key.startsWith("_")) return;

      // Check if value changed
      if (settings[key] !== originalSettings[key]) {
        changes[key] = settings[key];
      }
    });

    return changes;
  }, [settings, originalSettings]);

  // Save settings to server
  const saveSettings = useCallback(async () => {
    try {
      setIsSaving(true);
      setError(null);

      const changes = getChangedSettings();

      if (Object.keys(changes).length === 0) {
        return { success: true, message: "No changes to save" };
      }

      const result = await updateSettings(changes);

      if (result.success) {
        // Update original settings to reflect saved state
        setOriginalSettings({ ...settings });

        // Invalidate field visibility cache if hidden fields were changed
        if (changes.whizmanage_hidden_fields !== undefined) {
          invalidateFieldVisibilityCache();
        }
      }

      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [settings, getChangedSettings]);

  // Reset to original values
  const resetSettings = useCallback(() => {
    setSettings({ ...originalSettings });
  }, [originalSettings]);

  // Reload settings from server
  const reloadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getSettings();
      setSettings(data);
      setOriginalSettings(data);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update user info (local state only)
  const updateUserInfoField = useCallback((section, field, value) => {
    setUserInfo((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  }, []);

  // Check if user info has changes
  const hasUserInfoChanges = useCallback(() => {
    if (!userInfo || !originalUserInfo) return false;
    return JSON.stringify(userInfo) !== JSON.stringify(originalUserInfo);
  }, [userInfo, originalUserInfo]);

  // Save user info to server
  const saveUserInfo = useCallback(async () => {
    try {
      setIsSaving(true);
      const result = await updateUserInfo(userInfo);
      if (result.success) {
        setOriginalUserInfo({ ...userInfo });
      }
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [userInfo]);

  return {
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
    error,
    updateSetting,
    updateMultipleSettings,
    updateUserInfoField,
    saveSettings,
    saveUserInfo,
    resetSettings,
    reloadSettings,
    hasChanges: hasChanges(),
    hasUserInfoChanges: hasUserInfoChanges(),
    getChangedSettings,
  };
}
