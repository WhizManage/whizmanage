// src/components/table/entities/orders/components/OrderSourceBadge.jsx

import CustomTooltip from "@components/ui/nextUI/Tooltip";
import {
  Copy,
  ExternalLink,
  HelpCircle,
  Link2,
  Target,
  User,
  Wrench,
} from "lucide-react";
 import { __ } from "@wordpress/i18n";

export default function OrderSourceBadge({ row }) {

  const isRTL = (document.documentElement.dir || "ltr") === "rtl";
  const metaObj = Array.isArray(row?.meta_data)
    ? row.meta_data.reduce(
        (a, m) => (m?.key ? ((a[m.key] = m.value), a) : a),
        {}
      )
    : {};

  const pick = (k) => row?.source?.[k] ?? metaObj[k] ?? row?.[k] ?? "";

  // מקור יצירה (WP/Woo)
  const createdVia = String(pick("created_via") || "").toLowerCase();

  // בסיס נתונים שמעניין אותנו להצגה/הסקה
  const base = {
    utm_source: pick("utm_source"),
    utm_medium: pick("utm_medium"),
    utm_campaign: pick("utm_campaign"),
    utm_content: pick("utm_content"),
    utm_term: pick("utm_term"),
    referrer: pick("referrer"),
    referring_domain: pick("referring_domain"),
    device_type: pick("device_type"),
    session_page_views: Number.isFinite(Number(pick("session_page_views")))
      ? Number(pick("session_page_views"))
      : undefined,
    label: pick("label") || pick("source_label"),
  };

  // היררכיה כמו "אז": UTM > Referral > Admin > Direct > Unknown
  let sourceType =
    row?.source?.source_type ||
    (base.utm_source || base.utm_medium || base.utm_campaign
      ? "utm"
      : base.referrer || base.referring_domain
        ? "referral"
        : "");

  if (!sourceType && createdVia === "admin") sourceType = "admin";
  if (
    !sourceType &&
    !base.utm_source &&
    !base.utm_medium &&
    !base.utm_campaign &&
    !base.referrer &&
    !base.referring_domain &&
    ["checkout", "rest-api", "mobile", "app"].includes(createdVia)
  ) {
    sourceType = "direct";
  }

  const s = { ...base, source_type: sourceType, created_via: createdVia };

  const hasAny = !!(
    s.source_type ||
    s.utm_source ||
    s.utm_medium ||
    s.utm_campaign ||
    s.referring_domain ||
    s.referrer ||
    s.label
  );

  if (!hasAny) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-fit">
        <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
          {__("Unknown", "whizmanage")}
        </span>
      </div>
    );
  }

  const badgeType =
    s.source_type === "utm" && (s.utm_source || s.utm_medium || s.utm_campaign)
      ? "UTM"
      : s.source_type === "referral"
        ? "Referral"
        : s.source_type === "admin"
          ? "Admin"
          : s.source_type === "typein" || s.source_type === "direct"
            ? "Direct"
            : "Unknown";

  const styles = {
    UTM: {
      color:
        "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
      hoverColor: "hover:bg-blue-100 dark:hover:bg-blue-900",
      icon: Target,
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    Referral: {
      color:
        "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800",
      hoverColor: "hover:bg-purple-100 dark:hover:bg-purple-900",
      icon: Link2,
      iconColor: "text-purple-600 dark:text-purple-400",
    },
    Direct: {
      color:
        "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700",
      hoverColor: "hover:bg-slate-100 dark:hover:bg-slate-800",
      icon: User,
      iconColor: "text-slate-600 dark:text-slate-300",
    },
    Admin: {
      color:
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
      hoverColor: "hover:bg-amber-100 dark:hover:bg-amber-900",
      icon: Wrench,
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    Unknown: {
      color:
        "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800",
      hoverColor: "hover:bg-orange-100 dark:hover:bg-orange-900",
      icon: HelpCircle,
      iconColor: "text-orange-600 dark:text-orange-400",
    },
  }[badgeType] || {
    color: "bg-slate-50 text-slate-700 border-slate-200",
    hoverColor: "hover:bg-slate-100",
    icon: HelpCircle,
    iconColor: "text-slate-600",
  };

  const IconComponent = styles.icon;

  const utmQuery = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
  ]
    .map((k) => (s[k] ? `${k}=${encodeURIComponent(s[k])}` : ""))
    .filter(Boolean)
    .join("&");

  const refHost =
    s.referring_domain ||
    (() => {
      try {
        return s.referrer ? new URL(s.referrer).host : "";
      } catch {
        return "";
      }
    })();

  const handleCopyUTM = (e) => {
    e.stopPropagation();
    navigator?.clipboard?.writeText(`?${utmQuery}`).catch(() => {});
  };

  const body = (
    <div
      className="space-y-4 min-w-[350px]"
      dir={isRTL ? "rtl" : "ltr"}
      style={{ textAlign: isRTL ? "right" : "left" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${styles.color}`}>
            <IconComponent className={`w-4 h-4 ${styles.iconColor}`} />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              {__(badgeType, "whizmanage")}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-300">
              {s.label || __("Traffic Source", "whizmanage")}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Info Tags */}
      {(s.device_type ||
        Number.isFinite(s.session_page_views) ||
        refHost ||
        s.created_via) && (
        <div
          className={`flex flex-wrap gap-2 ${isRTL ? "justify-end" : "justify-start"}`}
        >
          {s.device_type && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-600 dark:text-slate-300">
                {__("Device", "whizmanage")}:
              </span>
              <span className="text-xs font-medium text-slate-900 dark:text-white">
                {s.device_type}
              </span>
            </div>
          )}
          {Number.isFinite(s.session_page_views) && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-600 dark:text-slate-300">
                {__("Views", "whizmanage")}:
              </span>
              <span className="text-xs font-medium text-slate-900 dark:text-white">
                {s.session_page_views}
              </span>
            </div>
          )}
          {refHost && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-600 dark:text-slate-300">
                {__("From", "whizmanage")}:
              </span>
              <span className="text-xs font-medium text-slate-900 dark:text-white truncate max-w-[150px]">
                {refHost}
              </span>
            </div>
          )}
          {s.created_via && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-600 dark:text-slate-300">
                {__("Via", "whizmanage")}:
              </span>
              <span className="text-xs font-medium text-slate-900 dark:text-white">
                {s.created_via}
              </span>
            </div>
          )}
        </div>
      )}

      {/* UTM Parameters */}
      {(s.utm_source ||
        s.utm_medium ||
        s.utm_campaign ||
        s.utm_content ||
        s.utm_term) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              {__("UTM Parameters", "whizmanage")}
            </div>
            <div className="flex items-center gap-2">
              {utmQuery && (
                <button
                  type="button"
                  onClick={handleCopyUTM}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  {__("Copy", "whizmanage")}
                </button>
              )}
              {s.referrer && (
                <a
                  href={s.referrer}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  {__("Open", "whizmanage")}
                </a>
              )}
            </div>
          </div>

          <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
            {s.utm_source && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 dark:text-slate-300">
                  {__("Source", "whizmanage")}:
                </span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {s.utm_source}
                </span>
              </div>
            )}
            {s.utm_medium && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 dark:text-slate-300">
                  {__("Medium", "whizmanage")}:
                </span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {s.utm_medium}
                </span>
              </div>
            )}
            {s.utm_campaign && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 dark:text-slate-300">
                  {__("Campaign", "whizmanage")}:
                </span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {s.utm_campaign}
                </span>
              </div>
            )}
            {s.utm_content && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 dark:text-slate-300">
                  {__("Content", "whizmanage")}:
                </span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {s.utm_content}
                </span>
              </div>
            )}
            {s.utm_term && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 dark:text-slate-300">
                  {__("Term", "whizmanage")}:
                </span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {s.utm_term}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <CustomTooltip
      title={__("Source Details", "whizmanage")}
      description={body}
      contentClassName="p-0"
    >
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg text-xs w-fit cursor-pointer transition-all ${styles.color} ${styles.hoverColor}`}
      >
        <IconComponent className={`w-3.5 h-3.5 ${styles.iconColor}`} />
        <span className="font-medium">
          {badgeType === "UTM"
            ? __(s.utm_campaign, "whizmanage") || __(s.utm_medium, "whizmanage") || __(s.utm_source, "whizmanage") || __("Campaign", "whizmanage")
            : __(badgeType, "whizmanage")}
        </span>
      </div>
    </CustomTooltip>
  );
}
