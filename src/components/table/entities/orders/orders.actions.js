// src/components/table/entities/orders/orders.actions.js

import { toast } from "@/lib/utils";
import { getApi, postApi } from "@/services/services";
import { Mail, Download, Send } from "lucide-react";

/**
 * פעולות ספציפיות להזמנות
 */
export const createOrderActions = (__) => {
  const sendOrderDetails = async (rows, overrideEmail = null) => {
    if (!rows?.length) return;
    
    const results = { success: 0, failed: 0 };
    
    for (const row of rows) {
      const orderId = row?.original?.id ?? row?.id;
      if (!orderId) continue;
      
      try {
        const payload = overrideEmail 
          ? { email: overrideEmail, force_email_update: true } 
          : {};
          
        await postApi(
          `${window.siteUrl}/wp-json/wm/v1/orders/${orderId}/send-order-details`,
          payload
        );
        results.success++;
      } catch (e) {
        console.error(`Failed to send order details for ${orderId}:`, e);
        results.failed++;
      }
    }
    
    if (results.success > 0) {
      toast.success(__("Order details sent", "whizmanage"), {
        description: __("{{count}} orders processed", { count: results.success }),
      });
    }
    if (results.failed > 0) {
      toast.error(__("Some orders failed", "whizmanage"), {
        description: __("{{count}} orders failed", { count: results.failed }),
      });
    }
  };

  const sendEmailWithTemplate = async (rows, templateId, overrideEmail = null) => {
    if (!rows?.length || !templateId) return;
    
    const results = { success: 0, failed: 0 };
    
    for (const row of rows) {
      const orderId = row?.original?.id ?? row?.id;
      if (!orderId) continue;
      
      try {
        const payload = { email_id: templateId };
        if (overrideEmail) payload.override_email = overrideEmail;
        
        await postApi(
          `${window.siteUrl}/wp-json/wm/v1/orders/${orderId}/send-email`,
          payload
        );
        results.success++;
      } catch (e) {
        console.error(`Failed to send email for ${orderId}:`, e);
        results.failed++;
      }
    }
    
    if (results.success > 0) {
      toast.success(__("Email sent successfully", "whizmanage"), {
        description: __("{{count}} orders processed", { count: results.success }),
      });
    }
    if (results.failed > 0) {
      toast.error(__("Some emails failed", "whizmanage"), {
        description: __("{{count}} orders failed", { count: results.failed }),
      });
    }
  };

  const regenerateDownloads = async (rows) => {
    if (!rows?.length) return;
    
    const results = { success: 0, failed: 0 };
    
    for (const row of rows) {
      const orderId = row?.original?.id ?? row?.id;
      if (!orderId) continue;
      
      try {
        await postApi(
          `${window.siteUrl}/wp-json/wm/v1/orders/${orderId}/regenerate-downloads`,
          {}
        );
        results.success++;
      } catch (e) {
        console.error(`Failed to regenerate downloads for ${orderId}:`, e);
        results.failed++;
      }
    }
    
    if (results.success > 0) {
      toast.success(__("Downloads regenerated", "whizmanage"), {
        description: __("{{count}} orders processed", { count: results.success }),
      });
    }
    if (results.failed > 0) {
      toast.error(__("Some orders failed", "whizmanage"), {
        description: __("{{count}} orders failed", { count: results.failed }),
      });
    }
  };

  const fetchAvailableTemplates = async (orderId) => {
    try {
      const res = await getApi(
        `${window.siteUrl}/wp-json/wm/v1/orders/${orderId}/available-emails`
      );
      return res?.data?.templates ?? [];
    } catch (e) {
      console.error("Failed to fetch templates:", e);
      return [];
    }
  };

  return {
    sendOrderDetails,
    sendEmailWithTemplate,
    regenerateDownloads,
    fetchAvailableTemplates,
  };
};

/**
 * הגדרות הפעולות לשימוש ב-toolbar וב-row actions
 */
export const getOrderCustomActions = (__) => [
  {
    key: "send-order-details",
    label: __("Send order details", "whizmanage"),
    icon: <Send className="h-full w-full text-blue-500 dark:text-blue-400" />,
    showWhen: "any",
    onClick: async (rows) => {
      const actions = createOrderActions(__);
      await actions.sendOrderDetails(rows);
    },
  },
  {
    key: "resend-email",
    label: __("Resend email / choose template", "whizmanage"),
    icon: <Mail className="h-full w-full text-purple-500 dark:text-purple-400" />,
    showWhen: "single",
    onClick: (rows) => {
      // ✅ משתמש בפונקציה הגלובלית
      const orderId = rows[0]?.original?.id ?? rows[0]?.id;
      if (orderId && typeof window.__wmOpenEmailModal === "function") {
        window.__wmOpenEmailModal(orderId);
      }
    },
  },
  {
    key: "regenerate-downloads",
    label: __("Regenerate download permissions", "whizmanage"),
    icon: <Download className="h-full w-full text-green-500 dark:text-green-400" />,
    showWhen: "any",
    onClick: async (rows) => {
      const actions = createOrderActions(__);
      await actions.regenerateDownloads(rows);
    },
  },
];