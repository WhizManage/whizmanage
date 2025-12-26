// src/components/pages/table/products/components/YoastSEOModal.jsx
import CustomTooltip from "@components/ui/nextUI/Tooltip";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@components/ui/hover-card";
import { Input } from "@components/ui/input";
import { Switch } from "@components/ui/switch";
import { Textarea } from "@components/ui/textarea";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";
import { __, sprintf } from "@wordpress/i18n";
import {
  BarChart3,
  Check,
  ImageIcon,
  Eye,
  Info,
  Search,
  Share2,
  X,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import Button from "@/components/ui/button";
import { IconBadge } from "@components/ui/custom/IconBadge";
// Import the products API from the entity folder.  The original code
// referenced `../api`, but after the refactor the file is named
// `products.api.js` in the parent directory.
import { productsApi } from "../products.api.js";
import { serializeMetaValue } from "@components/table/utils/mediaUtils"; // קיים אצלך
import MediaPicker from "@components/media/MediaPicker";
import ProBadge from "@components/ui/nextUI/ProBadge";

const YoastSEOModal = ({ row, store }) => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [activeTab, setActiveTab] = useState("general");

  // אילו שדות בכל טאב
  const tabsFields = useMemo(
    () => ({
      general: [
        "_yoast_wpseo_title",
        "_yoast_wpseo_metadesc",
        "_yoast_wpseo_focuskw",
        "slug",
      ],
      preview: ["_yoast_wpseo_title", "slug", "_yoast_wpseo_metadesc"],
      advanced: [
        "_yoast_wpseo_canonical",
        "_yoast_wpseo_meta-robots-noindex",
        "_yoast_wpseo_meta-robots-nofollow",
      ],
      social: [
        "_yoast_wpseo_opengraph-title",
        "_yoast_wpseo_opengraph-description",
        "_yoast_wpseo_opengraph-image",
      ],
    }),
    []
  );

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
        // תומך או במספר מזהה, או ב-URL, או באובייקט קודם
        if (raw && typeof raw === "object") {
          initial[key] = { id: raw.id ?? "", src: raw.url ?? raw.src ?? "" };
        } else {
          // אם זה ID כמחרוזת/מספר או URL כתוב – נשמור כמחרוזת להמשך
          initial[key] = raw ?? "";
        }
      } else {
        initial[key] = raw ?? "";
      }
    });
    initial.slug = row?.original?.slug || "";
    return initial;
  };

  const [seoData, setSeoData] = useState(generateInitialSeoData());

  const updateSeoData = (key, value) => {
    setSeoData((prev) => ({ ...prev, [key]: value }));
  };

  // חישוב ציון בסיסי (כמו אצלך)
  const calculateSEOScore = () => {
    let score = 0;
    const checks = [];

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
      checks.push({
        condition: true,
        weight: 10,
        label: __("Focus keyphrase is set", "whizmanage"),
        help: __("You've set a focus keyphrase - great start!", "whizmanage"),
        id: "keyword-set",
      });
    } else {
      checks.push({
        condition: false,
        weight: 10,
        label: __("No focus keyphrase set", "whizmanage"),
        help: __(
          "Set a focus keyphrase to optimize your content for search engines",
          "whizmanage"
        ),
        id: "keyword-set",
      });
    }

    // Keyphrase length
    if (keyword.length > 0) {
      const keywordWords = keyword.split(" ").length;
      if (keywordWords >= 1 && keywordWords <= 4) {
        score += 10;
        checks.push({
          condition: true,
          weight: 10,
          label: __("Keyphrase length is optimal", "whizmanage"),
          help: __(
            "Your keyphrase has 1-4 words - perfect length!",
            "whizmanage"
          ),
          id: "keyword-length",
        });
      } else {
        checks.push({
          condition: false,
          weight: 10,
          label: __("Keyphrase is too long", "whizmanage"),
          help: __(
            "Try to shorten your keyphrase to 1-4 words for better focus",
            "whizmanage"
          ),
          id: "keyword-length",
        });
      }
    }

    // In title
    if (keyword.length > 0 && finalTitle.includes(keyword)) {
      score += 15;
      checks.push({
        condition: true,
        weight: 15,
        label: __("Keyphrase appears in SEO title", "whizmanage"),
        help: __("Great! Your keyphrase is in the title", "whizmanage"),
        id: "keyword-title",
      });
    } else {
      checks.push({
        condition: false,
        weight: 15,
        label: __("Add keyphrase to SEO title", "whizmanage"),
        help: __(
          "Include your focus keyphrase in the SEO title for better rankings",
          "whizmanage"
        ),
        id: "keyword-title",
      });
    }

    // In URL
    if (keyword.length > 0 && slug.includes(keyword.replace(/\s+/g, "-"))) {
      score += 10;
      checks.push({
        condition: true,
        weight: 10,
        label: __("Keyphrase appears in URL", "whizmanage"),
        help: __("Good! Your URL contains the keyphrase", "whizmanage"),
        id: "keyword-url",
      });
    } else {
      checks.push({
        condition: false,
        weight: 10,
        label: __("Add keyphrase to URL", "whizmanage"),
        help: __(
          "Include your keyphrase in the URL slug for better SEO",
          "whizmanage"
        ),
        id: "keyword-url",
      });
    }

    // In description
    if (keyword.length > 0 && description.includes(keyword)) {
      score += 10;
      checks.push({
        condition: true,
        weight: 10,
        label: __("Keyphrase in meta description", "whizmanage"),
        help: __(
          "Perfect! Your description contains the keyphrase",
          "whizmanage"
        ),
        id: "keyword-desc",
      });
    } else {
      checks.push({
        condition: false,
        weight: 10,
        label: __("Add keyphrase to description", "whizmanage"),
        help: __(
          "Include your keyphrase in the meta description",
          "whizmanage"
        ),
        id: "keyword-desc",
      });
    }

    // Title length (final)
    const titleLength = finalTitle.length;

    if (titleLength >= 50 && titleLength <= 60) {
      score += 15;
      checks.push({
        condition: true,
        weight: 15,
        label: __("SEO title length is perfect", "whizmanage"),
        help: sprintf(
          __(
            "Your SEO title is %d characters long, which is ideal.",
            "whizmanage"
          ),
          titleLength
        ),
        id: "title-length",
      });
    } else if (titleLength > 0 && titleLength < 50) {
      score += 7;
      checks.push({
        condition: false,
        weight: 15,
        label: __("SEO title is too short", "whizmanage"),
        help: sprintf(
          __(
            "Your SEO title is %d characters long. Aim for 50–60 characters.",
            "whizmanage"
          ),
          titleLength
        ),
        id: "title-length",
      });
    } else if (titleLength > 60) {
      score += 5;
      checks.push({
        condition: false,
        weight: 15,
        label: __("SEO title is too long", "whizmanage"),
        help: sprintf(
          __(
            "Your SEO title is %d characters long. Try to keep it under 60 characters.",
            "whizmanage"
          ),
          titleLength
        ),
        id: "title-length",
      });
    } else {
      checks.push({
        condition: false,
        weight: 15,
        label: __("No SEO title set", "whizmanage"),
        help: __("Add an SEO title between 50–60 characters.", "whizmanage"),
        id: "title-length",
      });
    }

    // Description length
    const descLength = seoData["_yoast_wpseo_metadesc"]?.length || 0;
    if (descLength >= 120 && descLength <= 160) {
      score += 15;
      checks.push({
        condition: true,
        weight: 15,
        label: __("Meta description length is ideal", "whizmanage"),
        help: __("desc_length_ok_help", { count: descLength }),
        id: "desc-length",
      });
    } else if (descLength > 0 && descLength < 120) {
      score += 7;
      checks.push({
        condition: false,
        weight: 15,
        label: __("Meta description is too short", "whizmanage"),
        help: __("desc_length_short_help", { count: descLength }),
        id: "desc-length",
      });
    } else if (descLength > 160) {
      score += 5;
      checks.push({
        condition: false,
        weight: 15,
        label: __("Meta description is too long", "whizmanage"),
        help: __("desc_length_long_help", { count: descLength }),
        id: "desc-length",
      });
    } else {
      checks.push({
        condition: false,
        weight: 15,
        label: __("No meta description", "whizmanage"),
        help: __(
          "Add a meta description between 120-160 characters",
          "whizmanage"
        ),
        id: "desc-length",
      });
    }

    // Slug exists
    if (slug.length > 0) {
      score += 5;
      checks.push({
        condition: true,
        weight: 5,
        label: __("URL slug is set", "whizmanage"),
        help: __("Good! You have a custom URL", "whizmanage"),
        id: "slug-exists",
      });
    } else {
      checks.push({
        condition: false,
        weight: 5,
        label: __("No URL slug", "whizmanage"),
        help: __("Set a URL slug for better SEO", "whizmanage"),
        id: "slug-exists",
      });
    }

    // Social
    const socialTitle = seoData["_yoast_wpseo_opengraph-title"]?.length > 0;
    const socialDesc =
      seoData["_yoast_wpseo_opengraph-description"]?.length > 0;
    if (socialTitle && socialDesc) {
      score += 10;
      checks.push({
        condition: true,
        weight: 10,
        label: __("Social media optimized", "whizmanage"),
        help: __(
          "Great! Your content is ready for social sharing",
          "whizmanage"
        ),
        id: "social-complete",
      });
    } else if (socialTitle || socialDesc) {
      score += 5;
      checks.push({
        condition: false,
        weight: 10,
        label: __("Incomplete social settings", "whizmanage"),
        help: __("Complete both social title and description", "whizmanage"),
        id: "social-complete",
      });
    } else {
      checks.push({
        condition: false,
        weight: 10,
        label: __("No social media settings", "whizmanage"),
        help: __(
          "Add social title and description for better sharing",
          "whizmanage"
        ),
        id: "social-complete",
      });
    }

    return { score, totalChecks: checks };
  };

  const { score: seoScore, totalChecks } = calculateSEOScore();

  const getScoreColor = (score) =>
    score >= 80
      ? "text-green-500"
      : score >= 60
        ? "text-yellow-500"
        : "text-red-500";

  // UI — טאב/שדות
  const tabs = useMemo(
    () => [
      { id: "general", name: "General", icon: Search },
      { id: "preview", name: "Preview", icon: Eye },
      { id: "advanced", name: "Advanced", icon: BarChart3 },
      { id: "social", name: "Social", icon: Share2 },
    ],
    []
  );

  const renderField = (field) => (
    <div key={field.key} className="mb-6">
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
        {__(field.label, "whizmanage")}
        {field.help && (
          <HoverCard openDelay={300}>
            <HoverCardTrigger asChild>
              <Info className="size-4 text-fuchsia-600/70 cursor-pointer" />
            </HoverCardTrigger>
            <HoverCardContent className="w-80 z-50" side="top" align="start">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">
                  {__(field.label, "whizmanage")}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {__(field.help, "whizmanage")}
                </p>
              </div>
            </HoverCardContent>
          </HoverCard>
        )}
      </label>

      {field.type === "text" && (
        <Input
          type="text"
          value={seoData[field.key] || ""}
          placeholder={
            field.key === "_yoast_wpseo_title"
              ? `${window.store_name} - ${row?.original?.name || ""}`
              : ""
          }
          onChange={(e) => updateSeoData(field.key, e.target.value)}
          className="w-full h-10"
          onFocus={(e) => e.target.select()}
        />
      )}

      {field.type === "textarea" && (
        <Textarea
          value={seoData[field.key] || ""}
          onChange={(e) => updateSeoData(field.key, e.target.value)}
          rows={3}
          className="w-full"
          placeholder={__("Enter your description here", "whizmanage")}
          onFocus={(e) => e.target.select()}
        />
      )}

      {field.type === "switcher" && (
        <div className="flex items-center gap-3">
          <Switch
            id={field.key}
            checked={seoData[field.key] === "1"}
            onCheckedChange={(checked) =>
              updateSeoData(field.key, checked ? "1" : "0")
            }
          />
          <label
            htmlFor={field.key}
            className="text-sm text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            {seoData[field.key] === "1"
              ? __("Enabled", "whizmanage")
              : __("Disabled", "whizmanage")}
          </label>
        </div>
      )}

      {field.type === "image" && (
        <MediaPicker
          value={
            typeof seoData[field.key] === "object"
              ? seoData[field.key]
              : seoData[field.key]
                ? {
                    id: isFinite(+seoData[field.key])
                      ? +seoData[field.key]
                      : null,
                    src: String(seoData[field.key]),
                  }
                : null
          }
          onChange={(val) => {
            // single select => או null או {id, src}
            updateSeoData(
              field.key,
              val ? { id: val.id ?? null, src: val.src ?? "" } : ""
            );
          }}
          onClose={() => {}}
          multiple={false}
          autoOpen={false}
          // 👇 הטריגר הוא התמונה/פלייסהולדר (בלי כפתורים מסביב)
          trigger={(() => {
            const val = seoData[field.key];
            const imgSrc =
              typeof val === "object"
                ? val?.src
                : typeof val === "string"
                  ? val
                  : "";

            return (
              <div
                className="inline-flex items-center justify-center border border-slate-200 dark:border-slate-700 rounded-md overflow-hidden cursor-pointer"
                style={{ width: 40, height: 40 }} // קטן כדי לא להגדיל את גובה השורה
                title={
                  imgSrc
                    ? __("Click to change image", "whizmanage")
                    : __("Click to choose image", "whizmanage")
                }
              >
                {imgSrc ? (
                  <img
                    src={imgSrc}
                    alt="og-image"
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-slate-400">
                    <path
                      fill="currentColor"
                      d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2m0 16H5V5h14zM8.5 13.5l2 2.5l3-3.5l4 5H6zM8 8a2 2 0 1 0 4.001.001A2 2 0 0 0 8 8z"
                    />
                  </svg>
                )}
              </div>
            );
          })()}
        />
      )}
    </div>
  );

  // שמירה: עדכון store + שמירה לשרת + רולבק במקרה כשל
  const handleSave = async () => {
    const rowId = row?.original?.id;
    if (!rowId) return;

    // בונים meta חדש ממופה מה־seoData
    const prevMeta = Array.isArray(row?.original?.meta_data)
      ? row.original.meta_data
      : [];
    const metaMap = new Map(prevMeta.map((m) => [m.key, m.value]));

    (window.WhizManageCustomFields || []).forEach(({ key, type }) => {
      let value = seoData[key];
      if (type === "switcher") value = value === "1" ? "1" : "0";
      if (type === "image") {
        // שמירה כ-ID אם אפשר, אחרת כ-URL/מחרוזת
        if (value && typeof value === "object") {
          value = value.id != null ? String(value.id) : value.src || "";
        }
      }
      metaMap.set(key, value ?? "");
    });

    const newMeta = Array.from(metaMap.entries()).map(([key, value]) => ({
      key,
      value,
    }));
    const serverMeta = newMeta.map((m) => ({
      ...(m.id != null ? { id: m.id } : {}),
      key: m.key,
      value: serializeMetaValue(m.value), // שמירה בטוחה
    }));

    // האם ה-slug השתנה?
    const prevSlug = row?.original?.slug || "";
    const nextSlug = typeof seoData.slug === "string" ? seoData.slug : prevSlug;
    const slugChanged = nextSlug !== prevSlug;

    const optimisticPatch = {
      meta_data: newMeta,
      ...(slugChanged ? { slug: nextSlug } : {}),
    };

    // עדכון אופטימי ל-store (עם היסטוריה)
    try {
      store.updateItemWithHistory(rowId, optimisticPatch, true);
    } catch {
      store.updateItem(rowId, optimisticPatch);
    }

    // שמירה לשרת
    try {
      await productsApi.updateMeta(rowId, serverMeta, row.original);
      if (slugChanged && productsApi.updateField) {
        await productsApi.updateField(rowId, "slug", nextSlug, row.original);
      }
      onOpenChange(); // סגור מודל
    } catch (e) {
      // רולבק מקומי במקרה כשל
      const rollbackPatch = { meta_data: prevMeta, slug: prevSlug };
      try {
        store.updateItemWithHistory(rowId, rollbackPatch, false);
      } catch {
        store.updateItem(rowId, rollbackPatch);
      }
      throw e;
    }
  };

  // הטריגר בתא הטבלה — קטן ולא מגדיל את גובה השורה
  const Trigger = (
    <div
      className={`flex w-full items-center justify-center p-1 ${
        typeof window !== "undefined" && window.hasLicence === false
          ? "opacity-70 cursor-not-allowed"
          : "cursor-pointer"
      }`}
      onClick={() => {
        if (typeof window !== "undefined" && window.hasLicence === false)
          return;
        onOpen();
      }}
      onKeyDown={(e) => {
        if (typeof window !== "undefined" && window.hasLicence === false)
          return;
        if (e.key === "Enter" || e.key === " ") onOpen();
      }}
      role={
        typeof window !== "undefined" && window.hasLicence === false
          ? "img"
          : "button"
      }
      aria-disabled={
        (typeof window !== "undefined" && window.hasLicence === false) ||
        undefined
      }
      tabIndex={
        typeof window !== "undefined" && window.hasLicence === false ? -1 : 0
      }
    >
      <div className="relative">
        {/* המדד הקטן – משאיר כמו שהיה אצלך */}
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

        {/* תג PRO + מנעול כשאין רישיון */}
        {typeof window !== "undefined" && window.hasLicence === false && (
          <span className="absolute -top-1 -right-1 inline-flex items-center gap-0.5 select-none">
            <ProBadge />
          </span>
        )}
      </div>
    </div>
  );

  // תוכן המודל
  return (
    <>
      {Trigger}
      {!(typeof window !== "undefined" && window.hasLicence === false) && (
        <Modal
          size="2xl"
          scrollBehavior="inside"
          backdrop="opaque"
          className="!overflow-hidden"
          classNames={{
            backdrop:
              "bg-gradient-to-t from-zinc-800 to-zinc-800/30 backdrop-opacity-20 !overflow-hidden",
            wrapper: "overflow-hidden",
            base: "max-h-[85vh] flex flex-col",
            body: "p-0 flex-1 overflow-hidden",
            closeButton:
              "hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 rounded-lg",
          }}
          isDismissable={false}
          isOpen={isOpen}
          onOpenChange={onOpenChange}
        >
          <ModalContent className="bg-white dark:bg-slate-900 shadow-xl rounded-lg">
            {() => (
              <>
                <ModalBody className="p-0 flex flex-col h-full overflow-hidden">
                  {/* Header */}
                  <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                    <div className="p-5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <IconBadge
                          icon={Search}
                          variant="default"
                          size="default"
                        />
                        <div>
                          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                            {__("Yoast SEO", "whizmanage")}
                          </h2>
                          <p className="text-slate-600 dark:text-slate-300 mt-1">
                            {__(
                              "Optimize your content for search engines",
                              "whizmanage"
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="relative">
                        <svg className="w-12 h-12 -rotate-90">
                          <circle
                            cx="24"
                            cy="24"
                            r="20"
                            stroke="currentColor"
                            strokeWidth="3"
                            fill="none"
                            className="text-slate-200 dark:text-slate-700"
                          />
                          <circle
                            cx="24"
                            cy="24"
                            r="20"
                            stroke="currentColor"
                            strokeWidth="3"
                            fill="none"
                            strokeDasharray={`${Math.max(0, Math.min(100, seoScore)) * 1.26} 126`}
                            className={`${seoScore >= 80 ? "text-green-500" : seoScore >= 60 ? "text-yellow-500" : "text-red-500"}`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span
                            className={`text-sm font-bold ${getScoreColor(seoScore)}`}
                          >
                            {Math.round(seoScore)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Tabs */}
                    <div className="px-5 pb-3">
                      <div className="relative bg-white dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="relative flex">
                          {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                              <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                                  isActive
                                    ? "text-fuchsia-600 dark:text-fuchsia-400"
                                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-200"
                                }`}
                              >
                                <Icon
                                  className={`w-4 h-4 ${isActive ? "scale-110" : ""}`}
                                />
                                <span className="hidden sm:inline">
                                  {__(tab.name, "whizmanage")}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto scrollbar-whiz bg-white dark:bg-slate-900 p-5">
                    {activeTab === "general" && (
                      <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                          {__("Basic SEO Settings", "whizmanage")}
                        </h3>
                        {(window.WhizManageCustomFields || [])
                          .filter((f) => tabsFields.general.includes(f.key))
                          .map(renderField)}

                        {/* Checks */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-100 dark:border-slate-800">
                          <h4 className="font-semibold text-slate-900 dark:text-white mb-3">
                            {__("SEO Analysis", "whizmanage")}
                          </h4>
                          <div className="mb-5">
                            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${seoScore >= 80 ? "bg-green-500" : seoScore >= 60 ? "bg-yellow-500" : "bg-red-500"}`}
                                style={{
                                  width: `${Math.max(0, Math.min(100, seoScore))}%`,
                                }}
                              />
                            </div>
                          </div>

                          <div className="grid gap-2">
                            {totalChecks.map((check) => {
                              const isPassed = check.condition;
                              const getBg = () =>
                                isPassed
                                  ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                                  : "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700";
                              return (
                                <div
                                  key={check.id}
                                  className={`flex items-start gap-3 p-3 rounded-lg border ${getBg()}`}
                                >
                                  {isPassed ? (
                                    <Check className="w-5 h-5 text-green-500 mt-0.5" />
                                  ) : (
                                    <X className="w-5 h-5 text-slate-400 mt-0.5" />
                                  )}
                                  <div className="flex-1">
                                    <div
                                      className={`text-sm font-medium ${isPassed ? "text-green-700 dark:text-green-300" : "text-slate-700 dark:text-slate-300"}`}
                                    >
                                      {check.label}
                                    </div>
                                    <div
                                      className={`text-xs mt-1 ${isPassed ? "text-green-600 dark:text-green-400" : "text-slate-500 dark:text-slate-300"}`}
                                    >
                                      {check.help}
                                    </div>
                                  </div>
                                  <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                                    {isPassed
                                      ? `${check.weight}/${check.weight}%`
                                      : `0/${check.weight}%`}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "preview" && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                          {__("Search Result Preview", "whizmanage")}
                        </h3>
                        <div className="bg-white dark:bg-slate-950 rounded-lg p-5 shadow border border-slate-100 dark:border-slate-800">
                          <div className="space-y-3">
                            <div className="text-xs text-slate-600 dark:text-slate-300">
                              {__("https://mysite.com", "whizmanage")} ›{" "}
                              {seoData.slug || __("product-slug", "whizmanage")}
                            </div>
                            <h3 className="text-xl text-fuchsia-600 dark:text-fuchsia-400 leading-tight">
                              {seoData["_yoast_wpseo_title"] ||
                                `${window.store_name} - ${row?.original?.name || ""}`}
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                              {seoData["_yoast_wpseo_metadesc"] ||
                                __(
                                  "Please provide a meta description by editing the snippet below. If you don't, Google will try to find a relevant part of your post to show in the search results.",
                                  "whizmanage"
                                )}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "advanced" && (
                      <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                          {__("Advanced Settings", "whizmanage")}
                        </h3>
                        {(window.WhizManageCustomFields || [])
                          .filter((f) => tabsFields.advanced.includes(f.key))
                          .map(renderField)}
                      </div>
                    )}

                    {activeTab === "social" && (
                      <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                          {__("Social Media Settings", "whizmanage")}
                        </h3>
                        {(window.WhizManageCustomFields || [])
                          .filter((f) => tabsFields.social.includes(f.key))
                          .map(renderField)}
                      </div>
                    )}
                  </div>
                </ModalBody>

                {/* Footer */}
                <ModalFooter className="flex-shrink-0 flex justify-end gap-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 px-6 py-4">
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange()}
                    className="px-6 py-2"
                  >
                    {__("Cancel", "whizmanage")}
                  </Button>
                  <Button
                    onClick={handleSave}
                    className="px-6 py-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white"
                  >
                    {__("Save Changes", "whizmanage")}
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      )}
    </>
  );
};

export default YoastSEOModal;
