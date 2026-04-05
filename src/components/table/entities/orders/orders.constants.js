// Known built-in status color palette
const KNOWN_STATUS_COLORS = {
  pending: `!border-yellow-500 !text-yellow-900 dark:!text-yellow-900 dark:hover:!text-yellow-900 !bg-yellow-100 dark:!bg-yellow-300 hover:!bg-yellow-200 !shadow-md`,
  processing: `!border-blue-300 !text-blue-700/70 dark:!text-blue-800 dark:hover:!text-blue-800 !bg-blue-50 dark:!bg-blue-200 hover:!bg-blue-100 !shadow-sm`,
  "on-hold": `!border-pink-300 !text-pink-700/70 dark:!text-pink-800 dark:hover:!text-pink-800 !bg-pink-50 dark:!bg-pink-200 hover:!bg-pink-100 !shadow-sm`,
  completed: `!border-green-300 !text-green-700/70 dark:!text-green-800 dark:hover:!text-green-800 !bg-green-50 dark:!bg-green-200 hover:!bg-green-100 !shadow-sm`,
  cancelled: `!border-slate-300 !text-slate-700/70 dark:!text-slate-800 dark:hover:!text-slate-800 !bg-slate-50 dark:!bg-slate-200 hover:!bg-slate-100 !shadow-sm`,
  refunded: `!border-purple-300 !text-purple-700/70 dark:!text-purple-800 dark:hover:!text-purple-800 !bg-purple-50 dark:!bg-purple-200 hover:!bg-purple-100 !shadow-sm`,
  failed: `!border-red-300 !text-red-700/70 dark:!text-red-800 dark:hover:!text-red-800 !bg-red-50 dark:!bg-red-200 hover:!bg-red-100 !shadow-sm`,
};

// Default color for custom statuses without a known palette entry
const DEFAULT_STATUS_COLOR = `!border-indigo-300 !text-indigo-700/70 dark:!text-indigo-800 dark:hover:!text-indigo-800 !bg-indigo-50 dark:!bg-indigo-200 hover:!bg-indigo-100 !shadow-sm`;

// Labels from WooCommerce (built-in + custom), injected via window.wmOrderStatuses
export const ORDER_STATUS_LABELS =
  (typeof window !== "undefined" &&
    window.wmOrderStatuses &&
    typeof window.wmOrderStatuses === "object")
    ? window.wmOrderStatuses
    : Object.keys(KNOWN_STATUS_COLORS).reduce((acc, k) => {
        acc[k] = k;
        return acc;
      }, {});

// Map of status key -> tailwind classes. Includes custom statuses from window.wmOrderStatuses.
export const ORDER_STATUS_KEYS = Object.keys(ORDER_STATUS_LABELS).reduce(
  (acc, key) => {
    acc[key] = KNOWN_STATUS_COLORS[key] || DEFAULT_STATUS_COLOR;
    return acc;
  },
  {}
);
