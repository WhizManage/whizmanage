// src/lib/utils.js

import { addToast } from "@heroui/react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Toast helper functions using HeroUI's addToast
 * Colors: "default" | "primary" | "secondary" | "success" | "warning" | "danger"
 */
export const toast = {
  success: (message, options = {}) => {
    addToast({
      title: message,
      color: "success",
      ...options,
    });
  },
  error: (message, options = {}) => {
    addToast({
      title: message,
      color: "danger",
      ...options,
    });
  },
  warning: (message, options = {}) => {
    addToast({
      title: message,
      color: "warning",
      ...options,
    });
  },
  info: (message, options = {}) => {
    addToast({
      title: message,
      color: "primary",
      ...options,
    });
  },
  default: (message, options = {}) => {
    addToast({
      title: message,
      color: "default",
      ...options,
    });
  },
};
