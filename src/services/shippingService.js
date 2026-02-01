// src/services/shippingService.js

import { getApi, postApi, putApi, deleteApi } from "./services";

const BASE_URL = `${window.siteUrl}/wp-json/whizmanage/v1/shipping`;

/**
 * Fetch all shipping zones with their methods
 * @returns {Promise<Array>} Array of zone objects
 */
export async function getShippingZones() {
  const response = await getApi(`${BASE_URL}/zones`);
  return typeof response.data === "string"
    ? JSON.parse(response.data)
    : response.data;
}

/**
 * Create a new shipping zone
 * @param {Object} data - Zone data { name, locations }
 * @returns {Promise<Object>} Response with created zone
 */
export async function createShippingZone(data) {
  const response = await postApi(`${BASE_URL}/zones`, data);
  return typeof response.data === "string"
    ? JSON.parse(response.data)
    : response.data;
}

/**
 * Update a shipping zone
 * @param {number} zoneId - Zone ID
 * @param {Object} data - Zone data to update
 * @returns {Promise<Object>} Response with updated zone
 */
export async function updateShippingZone(zoneId, data) {
  const response = await putApi(`${BASE_URL}/zones/${zoneId}`, data);
  return typeof response.data === "string"
    ? JSON.parse(response.data)
    : response.data;
}

/**
 * Delete a shipping zone
 * @param {number} zoneId - Zone ID
 * @returns {Promise<Object>} Response
 */
export async function deleteShippingZone(zoneId) {
  const response = await deleteApi(`${BASE_URL}/zones/${zoneId}`);
  return typeof response.data === "string"
    ? JSON.parse(response.data)
    : response.data;
}

/**
 * Add a shipping method to a zone
 * @param {number} zoneId - Zone ID
 * @param {string} methodId - Method ID (flat_rate, free_shipping, local_pickup)
 * @returns {Promise<Object>} Response with added method
 */
export async function addShippingMethod(zoneId, methodId) {
  const response = await postApi(`${BASE_URL}/zones/${zoneId}/methods`, {
    method_id: methodId,
  });
  return typeof response.data === "string"
    ? JSON.parse(response.data)
    : response.data;
}

/**
 * Update a shipping method settings
 * @param {number} zoneId - Zone ID
 * @param {number} instanceId - Method instance ID
 * @param {Object} data - Method data to update
 * @returns {Promise<Object>} Response with updated method
 */
export async function updateShippingMethod(zoneId, instanceId, data) {
  const response = await putApi(
    `${BASE_URL}/zones/${zoneId}/methods/${instanceId}`,
    data
  );
  return typeof response.data === "string"
    ? JSON.parse(response.data)
    : response.data;
}

/**
 * Delete a shipping method from a zone
 * @param {number} zoneId - Zone ID
 * @param {number} instanceId - Method instance ID
 * @returns {Promise<Object>} Response
 */
export async function deleteShippingMethod(zoneId, instanceId) {
  const response = await deleteApi(
    `${BASE_URL}/zones/${zoneId}/methods/${instanceId}`
  );
  return typeof response.data === "string"
    ? JSON.parse(response.data)
    : response.data;
}

/**
 * Reorder shipping methods in a zone
 * @param {number} zoneId - Zone ID
 * @param {Array<number>} methodOrder - Array of instance IDs in new order
 * @returns {Promise<Object>} Response
 */
export async function reorderShippingMethods(zoneId, methodOrder) {
  const response = await putApi(`${BASE_URL}/zones/${zoneId}/methods/reorder`, {
    method_order: methodOrder,
  });
  return typeof response.data === "string"
    ? JSON.parse(response.data)
    : response.data;
}

/**
 * Get available locations (countries and states)
 * @returns {Promise<Object>} Object with continents and countries
 */
export async function getAvailableLocations() {
  const response = await getApi(`${BASE_URL}/locations`);
  return typeof response.data === "string"
    ? JSON.parse(response.data)
    : response.data;
}

/**
 * Get available shipping methods
 * @returns {Promise<Array>} Array of available method types
 */
export async function getAvailableMethods() {
  const response = await getApi(`${BASE_URL}/methods`);
  return typeof response.data === "string"
    ? JSON.parse(response.data)
    : response.data;
}

// ==================== Shipping Settings ====================

/**
 * Get shipping settings
 * @returns {Promise<Object>} Shipping settings object
 */
export async function getShippingSettings() {
  const response = await getApi(`${BASE_URL}/settings`);
  return typeof response.data === "string"
    ? JSON.parse(response.data)
    : response.data;
}

/**
 * Update shipping settings
 * @param {Object} settings - Settings to update
 * @returns {Promise<Object>} Response with updated settings
 */
export async function updateShippingSettings(settings) {
  const response = await putApi(`${BASE_URL}/settings`, settings);
  return typeof response.data === "string"
    ? JSON.parse(response.data)
    : response.data;
}

// ==================== Shipping Classes ====================

/**
 * Get all shipping classes
 * @returns {Promise<Array>} Array of shipping class objects
 */
export async function getShippingClasses() {
  const response = await getApi(`${BASE_URL}/classes`);
  return typeof response.data === "string"
    ? JSON.parse(response.data)
    : response.data;
}

/**
 * Create a new shipping class
 * @param {Object} data - Class data { name, slug, description }
 * @returns {Promise<Object>} Response with created class
 */
export async function createShippingClass(data) {
  const response = await postApi(`${BASE_URL}/classes`, data);
  return typeof response.data === "string"
    ? JSON.parse(response.data)
    : response.data;
}

/**
 * Update a shipping class
 * @param {number} classId - Class ID (term_id)
 * @param {Object} data - Class data to update
 * @returns {Promise<Object>} Response with updated class
 */
export async function updateShippingClass(classId, data) {
  const response = await putApi(`${BASE_URL}/classes/${classId}`, data);
  return typeof response.data === "string"
    ? JSON.parse(response.data)
    : response.data;
}

/**
 * Delete a shipping class
 * @param {number} classId - Class ID (term_id)
 * @returns {Promise<Object>} Response
 */
export async function deleteShippingClass(classId) {
  const response = await deleteApi(`${BASE_URL}/classes/${classId}`);
  return typeof response.data === "string"
    ? JSON.parse(response.data)
    : response.data;
}

// ==================== Local Pickup ====================

/**
 * Get local pickup settings
 * @returns {Promise<Object>} Local pickup settings object
 */
export async function getLocalPickupSettings() {
  const response = await getApi(`${BASE_URL}/local-pickup/settings`);
  return typeof response.data === "string"
    ? JSON.parse(response.data)
    : response.data;
}

/**
 * Update local pickup settings
 * @param {Object} settings - Settings to update
 * @returns {Promise<Object>} Response with updated settings
 */
export async function updateLocalPickupSettings(settings) {
  const response = await putApi(`${BASE_URL}/local-pickup/settings`, settings);
  return typeof response.data === "string"
    ? JSON.parse(response.data)
    : response.data;
}

/**
 * Get all pickup locations
 * @returns {Promise<Array>} Array of pickup location objects
 */
export async function getPickupLocations() {
  const response = await getApi(`${BASE_URL}/local-pickup/locations`);
  return typeof response.data === "string"
    ? JSON.parse(response.data)
    : response.data;
}

/**
 * Create a new pickup location
 * @param {Object} data - Location data { name, address, city, state, postcode, country, phone, hours, details }
 * @returns {Promise<Object>} Response with created location
 */
export async function createPickupLocation(data) {
  const response = await postApi(`${BASE_URL}/local-pickup/locations`, data);
  return typeof response.data === "string"
    ? JSON.parse(response.data)
    : response.data;
}

/**
 * Update a pickup location
 * @param {number} locationId - Location ID
 * @param {Object} data - Location data to update
 * @returns {Promise<Object>} Response with updated location
 */
export async function updatePickupLocation(locationId, data) {
  const response = await putApi(`${BASE_URL}/local-pickup/locations/${locationId}`, data);
  return typeof response.data === "string"
    ? JSON.parse(response.data)
    : response.data;
}

/**
 * Delete a pickup location
 * @param {number} locationId - Location ID
 * @returns {Promise<Object>} Response
 */
export async function deletePickupLocation(locationId) {
  const response = await deleteApi(`${BASE_URL}/local-pickup/locations/${locationId}`);
  return typeof response.data === "string"
    ? JSON.parse(response.data)
    : response.data;
}
