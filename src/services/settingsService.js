// src/services/settingsService.js

import { getApi, putApi } from "./services";

const BASE_URL = `${window.siteUrl}/wp-json/whizmanage/v1/settings`;

/**
 * Fetch all settings (WooCommerce + WhizManage)
 * @returns {Promise<Object>} Settings object
 */
export async function getSettings() {
  const response = await getApi(BASE_URL);
  return typeof response.data === "string"
    ? JSON.parse(response.data)
    : response.data;
}

/**
 * Update settings
 * @param {Object} settings - Object with settings to update
 * @returns {Promise<Object>} Response with updated settings
 */
export async function updateSettings(settings) {
  const response = await putApi(BASE_URL, settings);
  return typeof response.data === "string"
    ? JSON.parse(response.data)
    : response.data;
}

/**
 * Fetch available currencies list
 * @returns {Promise<Array>} Array of currency objects {code, name, symbol}
 */
export async function getCurrencies() {
  const response = await getApi(`${BASE_URL}/currencies`);
  return typeof response.data === "string"
    ? JSON.parse(response.data)
    : response.data;
}

/**
 * Fetch countries list with states
 * @returns {Promise<Array>} Array of country objects {code, name, states?}
 */
export async function getCountries() {
  const response = await getApi(`${BASE_URL}/countries`);
  return typeof response.data === "string"
    ? JSON.parse(response.data)
    : response.data;
}

/**
 * Fetch available languages
 * @returns {Promise<Array>} Array of language objects {locale, name, native_name}
 */
export async function getLanguages() {
  const response = await getApi(`${BASE_URL}/languages`);
  return typeof response.data === "string"
    ? JSON.parse(response.data)
    : response.data;
}

/**
 * Fetch user info (current user and store owner)
 * @returns {Promise<Object>} User info object
 */
export async function getUserInfo() {
  const response = await getApi(`${BASE_URL}/user`);
  return typeof response.data === "string"
    ? JSON.parse(response.data)
    : response.data;
}

/**
 * Update user info
 * @param {Object} userInfo - Object with user info to update
 * @returns {Promise<Object>} Response with updated info
 */
export async function updateUserInfo(userInfo) {
  const response = await putApi(`${BASE_URL}/user`, userInfo);
  return typeof response.data === "string"
    ? JSON.parse(response.data)
    : response.data;
}

/**
 * Fetch available timezones
 * @returns {Promise<Array>} Array of timezone objects {value, label, type}
 */
export async function getTimezones() {
  const response = await getApi(`${BASE_URL}/timezones`);
  return typeof response.data === "string"
    ? JSON.parse(response.data)
    : response.data;
}

/**
 * Fetch user roles
 * @returns {Promise<Array>} Array of role objects {id, name}
 */
export async function getRoles() {
  const response = await getApi(`${BASE_URL}/roles`);
  return typeof response.data === "string"
    ? JSON.parse(response.data)
    : response.data;
}
