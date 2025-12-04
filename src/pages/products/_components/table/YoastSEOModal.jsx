import CustomTooltip from "@components/nextUI/Tooltip";
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
import {
  AlertCircle,
  BarChart3,
  Check,
  CheckCircle,
  Eye,
  Info,
  Minus,
  Search,
  Share2,
  X,
} from "lucide-react";
import { useState } from "react";
import Button from "../../../../components/ui/button";
import ImageMetaEdit from "./edit/meta_data/ImageMetaEdit";
import { __ } from "@wordpress/i18n";
import ProBadge from "../../../../components/nextUI/ProBadge";

const YoastSEOModal = ({ row, edit }) => {

  const generateInitialSeoData = () => {
    const metaMap = new Map(
      row?.original.meta_data?.map((m) => [m.key, m.value])
    );
    const initial = {};
   
    
    window.WhizManageCustomFields?.forEach(({ key, type }) => {
      let value = metaMap.get(key);
      if (type === "switcher") {
        initial[key] = value === "1" ? "1" : "0";
      } else if (type === "image" && value?.id !== undefined) {
        initial[key] = { id: value?.id, src: value?.url };
      } else {
        initial[key] = value ?? "";
      }
    });
    initial.slug = row?.original.slug || "";
    return initial;
  };

  const [seoData, setSeoData] = useState(generateInitialSeoData());

 

  const calculateSEOScore = () => {
    let score = 0;
    const checks = [];

    // 🔑 Focus keyword
    const keyword = (
      typeof seoData["_yoast_wpseo_focuskw"] === "string"
        ? seoData["_yoast_wpseo_focuskw"]
        : ""
    )
      .toLowerCase()
      .trim();

    // 🔑 Title - raw (מהמשתמש) + final (כולל ברירת מחדל)
    const rawTitle = seoData["_yoast_wpseo_title"]?.trim() || "";
    const finalTitle = (
      rawTitle.length > 0
        ? rawTitle
        : `${window.store_name} - ${row.original.name}`
    ).toLowerCase();

    // 🔑 Description
    const description = (
      typeof seoData["_yoast_wpseo_metadesc"] === "string"
        ? seoData["_yoast_wpseo_metadesc"]
        : ""
    ).toLowerCase();

    // 🔑 Slug
    const slug = (
      typeof seoData.slug === "string" ? seoData.slug : ""
    ).toLowerCase();

    // 1. Focus Keyphrase Set
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

    // 2. Keyphrase Length
    if (keyword.length > 0) {
      const keywordWords = keyword.split(" ").length;
      if (keywordWords >= 1 && keywordWords <= 4) {
        score += 10;
        checks.push({
          condition: true,
          weight: 10,
          label: __("Keyphrase length is optimal", "whizmanage"),
          help: __("Your keyphrase has 1-4 words - perfect length!", "whizmanage"),
          id: "keyword-length",
        });
      } else {
        checks.push({
          condition: false,
          weight: 10,
          label: __("Keyphrase is too long", "whizmanage"),
          help:
            keywordWords > 4
              ? __(
              "Try to shorten your keyphrase to 1-4 words for better focus",
              "whizmanage"
            )
              : __("Add a focus keyphrase of 1-4 words", "whizmanage"),
          id: "keyword-length",
        });
      }
    }

    // 3. Keyphrase in SEO Title
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
        label:
          keyword.length > 0
            ? __("Add keyphrase to SEO title", "whizmanage")
            : __("Keyphrase in title", "whizmanage"),
        help:
          keyword.length > 0
            ? __(
            "Include your focus keyphrase in the SEO title for better rankings",
            "whizmanage"
          )
            : __("Set a focus keyphrase first, then include it in the title", "whizmanage"),
        id: "keyword-title",
      });
    }

    // 4. Keyphrase in URL Slug
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
        label:
          keyword.length > 0
            ? __("Add keyphrase to URL", "whizmanage")
            : __("Keyphrase in URL", "whizmanage"),
        help:
          keyword.length > 0
            ? __("Include your keyphrase in the URL slug for better SEO", "whizmanage")
            : __("Set a focus keyphrase first, then include it in the URL", "whizmanage"),
        id: "keyword-url",
      });
    }

    // 5. Keyphrase in Meta Description
    if (keyword.length > 0 && description.includes(keyword)) {
      score += 10;
      checks.push({
        condition: true,
        weight: 10,
        label: __("Keyphrase in meta description", "whizmanage"),
        help: __("Perfect! Your description contains the keyphrase", "whizmanage"),
        id: "keyword-desc",
      });
    } else {
      checks.push({
        condition: false,
        weight: 10,
        label:
          keyword.length > 0
            ? __("Add keyphrase to description", "whizmanage")
            : __("Keyphrase in description", "whizmanage"),
        help:
          keyword.length > 0
            ? __("Include your keyphrase in the meta description", "whizmanage")
            : __(
            "Set a focus keyphrase first, then include it in the description",
            "whizmanage"
          ),
        id: "keyword-desc",
      });
    }

    // 6. SEO Title Length – נמדד לפי finalTitle
    const titleLength = finalTitle.length;
    if (titleLength >= 50 && titleLength <= 60) {
      score += 15;
      checks.push({
        condition: true,
        weight: 15,
        label: __("SEO title length is perfect", "whizmanage"),
        help: __("title_length_ok_help", { count: titleLength }),
        id: "title-length",
      });
    } else if (titleLength > 0 && titleLength < 50) {
      score += 7;
      checks.push({
        condition: false,
        weight: 15,
        label: __("SEO title is too short", "whizmanage"),
        help: __("title_length_short_help", { count: titleLength }),
        id: "title-length",
      });
    } else if (titleLength > 60) {
      score += 5;
      checks.push({
        condition: false,
        weight: 15,
        label: __("SEO title is too long", "whizmanage"),
        help: __("title_length_long_help", { count: titleLength }),
        id: "title-length",
      });
    } else {
      checks.push({
        condition: false,
        weight: 15,
        label: __("No SEO title set", "whizmanage"),
        help: __("Add an SEO title between 50-60 characters", "whizmanage"),
        id: "title-length",
      });
    }

    // 7. Meta Description Length
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
        help: __("Add a meta description between 120-160 characters", "whizmanage"),
        id: "desc-length",
      });
    }

    // 8. URL Slug Exists
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

    // 9. Social Media Optimization
    const socialTitle = seoData["_yoast_wpseo_opengraph-title"]?.length > 0;
    const socialDesc =
      seoData["_yoast_wpseo_opengraph-description"]?.length > 0;

    if (socialTitle && socialDesc) {
      score += 10;
      checks.push({
        condition: true,
        weight: 10,
        label: __("Social media optimized", "whizmanage"),
        help: __("Great! Your content is ready for social sharing", "whizmanage"),
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
        help: __("Add social title and description for better sharing", "whizmanage"),
        id: "social-complete",
      });
    }

    const passedChecks = checks.filter((check) => check.condition);

    return { score, passedChecks, totalChecks: checks };
  };

  const { score: seoScore, passedChecks, totalChecks } = calculateSEOScore();

  const getScoreColor = (score) =>
    score >= 80
      ? "text-green-500"
      : score >= 60
        ? "text-yellow-500"
        : "text-red-500";

  const getScoreIcon = (score) =>
    score >= 80 ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : score >= 60 ? (
      <Minus className="w-5 h-5 text-yellow-500" />
    ) : (
      <AlertCircle className="w-5 h-5 text-red-500" />
    );

  const tabs = [
    { id: "general", name: "General", icon: Search },
    { id: "preview", name: "Preview", icon: Eye },
    { id: "advanced", name: "Advanced", icon: BarChart3 },
    { id: "social", name: "Social", icon: Share2 },
  ];

 


  window.hasYoastPlugin = true;
  return (
    <>
      {window.hasYoastPlugin !== false ? (
        <CustomTooltip title={<ProBadge/>}>
          <div
            className="group flex flex-col w-full items-center justify-center gap-2 p-4 border-r border-slate-200 dark:border-slate-700 hover:bg-gradient-to-br hover:from-fuchsia-50 hover:to-slate-50 dark:hover:from-fuchsia-950/20 dark:hover:to-slate-800/50 cursor-pointer transition-all duration-300 relative"
          >
            <div className="relative transform group-hover:scale-110 transition-transform duration-200">
              {/* Circular Progress */}
              <svg className="w-12 h-12 transform -rotate-90">
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
                  strokeDasharray={`${seoScore * 1.26} 126`}
                  className={`${
                    seoScore >= 80
                      ? "text-green-500"
                      : seoScore >= 60
                        ? "text-yellow-500"
                        : "text-red-500"
                  } transition-all duration-500`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className={`text-xs font-bold ${getScoreColor(seoScore)}`}
                >
                  {seoScore}
                </span>
              </div>
            </div>
          </div>
        </CustomTooltip>
      ) : (
        <CustomTooltip title="Please enable the yoast plugin in the admin panel">
          <div className="flex flex-col w-full items-center justify-center gap-1 p-5 border-r border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
            <div className="flex items-center space-x-1 mt-1">
              {getScoreIcon(seoScore)}
              <span
                className={`text-xs font-semibold ${getScoreColor(seoScore)}`}
              >
                {seoScore}
              </span>
            </div>
          </div>
        </CustomTooltip>
      )}
   
    </>
  );
};

export default YoastSEOModal;