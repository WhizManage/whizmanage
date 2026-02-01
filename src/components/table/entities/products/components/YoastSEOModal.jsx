// src/components/pages/table/products/components/YoastSEOModal.jsx
import CustomTooltip from "@components/ui/nextUI/Tooltip";
import ProBadge from "@components/ui/nextUI/ProBadge";
import { __, sprintf } from "@wordpress/i18n";
import { useMemo, useState } from "react";

const YoastSEOModal = ({ row }) => {
  // קריאת מטא ראשוני
  const generateInitialSeoData = () => {
    const metaMap = new Map(
      (row?.original?.meta_data || []).map((m) => [m.key, m.value])
    );
    const initial = {};
    (window.WhizManageCustomFields || []).forEach(({ key, type }) => {
      const raw = metaMap.get(key);
      if (type === "switcher") {
        initial[key] = raw === "1" ? "1" : "0";
      } else if (type === "image") {
        if (raw && typeof raw === "object") {
          initial[key] = { id: raw.id ?? "", src: raw.url ?? raw.src ?? "" };
        } else {
          initial[key] = raw ?? "";
        }
      } else {
        initial[key] = raw ?? "";
      }
    });
    initial.slug = row?.original?.slug || "";
    return initial;
  };

  const [seoData] = useState(generateInitialSeoData());

  // חישוב ציון בסיסי
  const calculateSEOScore = () => {
    let score = 0;

    const keyword = (
      typeof seoData["_yoast_wpseo_focuskw"] === "string"
        ? seoData["_yoast_wpseo_focuskw"]
        : ""
    )
      .toLowerCase()
      .trim();

    const rawTitle = seoData["_yoast_wpseo_title"]?.trim() || "";
    const finalTitle = (
      rawTitle.length > 0
        ? rawTitle
        : `${window.store_name} - ${row?.original?.name || ""}`
    ).toLowerCase();

    const description = (
      typeof seoData["_yoast_wpseo_metadesc"] === "string"
        ? seoData["_yoast_wpseo_metadesc"]
        : ""
    ).toLowerCase();

    const slug = (
      typeof seoData.slug === "string" ? seoData.slug : ""
    ).toLowerCase();

    // Focus keyphrase
    if (keyword.length > 0) {
      score += 10;
      const keywordWords = keyword.split(" ").length;
      if (keywordWords >= 1 && keywordWords <= 4) {
        score += 10;
      }
    }

    // In title
    if (keyword.length > 0 && finalTitle.includes(keyword)) {
      score += 15;
    }

    // In URL
    if (keyword.length > 0 && slug.includes(keyword.replace(/\s+/g, "-"))) {
      score += 10;
    }

    // In description
    if (keyword.length > 0 && description.includes(keyword)) {
      score += 10;
    }

    // Title length
    const titleLength = finalTitle.length;
    if (titleLength >= 50 && titleLength <= 60) {
      score += 15;
    } else if (titleLength > 0 && titleLength < 50) {
      score += 7;
    } else if (titleLength > 60) {
      score += 5;
    }

    // Description length
    const descLength = seoData["_yoast_wpseo_metadesc"]?.length || 0;
    if (descLength >= 120 && descLength <= 160) {
      score += 15;
    } else if (descLength > 0 && descLength < 120) {
      score += 7;
    } else if (descLength > 160) {
      score += 5;
    }

    // Slug exists
    if (slug.length > 0) {
      score += 5;
    }

    // Social
    const socialTitle = seoData["_yoast_wpseo_opengraph-title"]?.length > 0;
    const socialDesc = seoData["_yoast_wpseo_opengraph-description"]?.length > 0;
    if (socialTitle && socialDesc) {
      score += 10;
    } else if (socialTitle || socialDesc) {
      score += 5;
    }

    return score;
  };

  const seoScore = calculateSEOScore();

  const getScoreColor = (score) =>
    score >= 80
      ? "text-green-500"
      : score >= 60
        ? "text-yellow-500"
        : "text-red-500";

  // Display only - with tooltip showing feature not available and Pro badge
  return (
    <CustomTooltip
      title={__("Yoast SEO - Pro feature", "whizmanage")}
      description={__("SEO editing requires Pro license", "whizmanage")}
    >
      <div
        className="relative flex w-full items-center justify-center p-1 cursor-not-allowed"
        role="img"
        aria-label={__("SEO Score", "whizmanage")}
        aria-disabled="true"
        tabIndex={-1}
      >
        {/* Pro Badge */}
        <span className="pointer-events-none absolute -top-1 -right-1 z-[50]">
          <ProBadge />
        </span>

        <div className="relative opacity-60">
          <svg className="w-7 h-7 -rotate-90">
            <circle
              cx="14"
              cy="14"
              r="11"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              className="text-slate-300 dark:text-slate-700"
            />
            <circle
              cx="14"
              cy="14"
              r="11"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeDasharray={`${Math.max(0, Math.min(100, seoScore)) * 0.69} 69`}
              className={`${seoScore >= 80 ? "text-green-500" : seoScore >= 60 ? "text-yellow-500" : "text-red-500"}`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-[10px] font-bold ${getScoreColor(seoScore)}`}>
              {Math.round(seoScore)}
            </span>
          </div>
        </div>
      </div>
    </CustomTooltip>
  );
};

export default YoastSEOModal;
