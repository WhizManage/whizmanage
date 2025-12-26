// src/layout/menu/History.jsx

import { useEffect, useState } from "react";
import {
  ArrowRightLeft,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Eye,
  EyeOff,
  Filter,
  History as HistoryIcon,
  LayoutGrid,
  Lock,
  Package,
  Pencil,
  Percent,
  Pin,
  PinOff,
  Plus,
  RotateCcw,
  ShoppingBasket,
  ShoppingCart,
  Ticket,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
 import { __ } from "@wordpress/i18n";
import ProBadge from "@components/ui/nextUI/ProBadge";
import { getApi, postApi, putApi } from "../../services/services";
import {
  Avatar,
  AvatarGroup,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ScrollShadow,
} from "@heroui/react";
import { Button } from "../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  preprocessHistoryItems,
  formatScalar,
  extractTermNames,
} from "../../utils/historyUtils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useCoreTaxonomiesStore } from "@/components/table/store/useCoreTaxonomiesStore";

// 🔒 מספר הפעולות המותרות עבור Free users
const FREE_HISTORY_LIMIT = 5;

export function History({ isOpen, setIsOpen }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});
  const [locationFilter, setLocationFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");

  const isRtl = window?.document?.documentElement?.dir === "rtl";

  // 🔒 חסימה עבור Free users
  const noLicence = typeof window !== "undefined" && window.hasLicence === false;

  // גישה ל-store של קטגוריות ותגיות לצורך תרגום IDs לשמות
  const { categories, tags, loadTaxonomiesOnce } = useCoreTaxonomiesStore();

  // טעינת קטגוריות ותגיות כשפותחים את ההיסטוריה
  useEffect(() => {
    if (isOpen) {
      loadTaxonomiesOnce();
    }
  }, [isOpen, loadTaxonomiesOnce]);

  // פונקציה לתרגום ID לשם (קטגוריה/תגית)
  const resolveTermName = (id, fieldKey = "") => {
    const key = String(fieldKey || "").toLowerCase();
    // בדיקה אם זה קטגוריות
    if (key.includes("categor") || key.includes("product_cat")) {
      const found = categories?.find((c) => String(c.id) === String(id));
      if (found) return found.name;
    }
    // בדיקה אם זה תגיות
    if (key.includes("tag")) {
      const found = tags?.find((t) => String(t.id) === String(id));
      if (found) return found.name;
    }
    // fallback - נסה בשניהם
    const catMatch = categories?.find((c) => String(c.id) === String(id));
    if (catMatch) return catMatch.name;
    const tagMatch = tags?.find((t) => String(t.id) === String(id));
    if (tagMatch) return tagMatch.name;
    // אם לא נמצא - החזר את ה-ID כמחרוזת
    return String(id);
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await getApi(
        `${window.siteUrl}/wp-json/whizmanage/v1/history`
      );
      setHistory(response.data || []);
    } catch (err) {
      console.error("Error fetching history", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
      setExpandedItems({});
    }
  }, [isOpen]);

  const toRestoredPayload = (h) => {
    if (h.action === "put") {
      return {
        location: h.location,
        action: "put",
        items: (h.items || []).map((it) => ({
          id: it.id,
          new: it.old,
          old: it.new,
          __meta: it.__meta,
        })),
      };
    }
    if (h.action === "add" || h.action === "duplicate") {
      return {
        location: h.location,
        action: "delete",
        items: (h.items || []).map((it) => ({ id: it.id })),
      };
    }
    if (h.action === "delete") {
      return {
        location: h.location,
        action: "add",
        items: (h.items || []).map((it) => ({
          id: it.id,
          new: it.old || {},
        })),
      };
    }
    return h;
  };

  const restoreItem = async (obj) => {
    const localRestore = toRestoredPayload(obj);
    window.dispatchEvent(
      new CustomEvent("wm:history-restore", { detail: localRestore })
    );

    try {
      const url = `${window.siteUrl}/wp-json/wc/v3/${obj.location}/batch`;
      setHistory((prev) => prev.filter((h) => h.id !== obj.id));

      if (obj.action === "add" || obj.action === "duplicate") {
        await postApi(url, { delete: obj.items.map((i) => i.id) });
      } else if (obj.action === "put") {
        await putApi(url, {
          update: obj.items.map((item) => ({ id: item.id, ...item.old })),
        });
      }
      await postApi(
        `${window.siteUrl}/wp-json/whizmanage/v1/history/delete`,
        { ids: [obj.id] }
      );
    } catch (err) {
      console.error("Error restoring obj", err);
      const rollback = {
        ...localRestore,
        items: localRestore.items.map((it) => ({
          ...it,
          old: it.new,
          new: it.old,
        })),
      };
      window.dispatchEvent(
        new CustomEvent("wm:history-restore", { detail: rollback })
      );
    }
  };

  const deleteItem = async (id) => {
    try {
      setHistory((prev) => prev.filter((h) => h.id !== id));
      await postApi(
        `${window.siteUrl}/wp-json/whizmanage/v1/history/delete`,
        { ids: [id] }
      );
    } catch (err) {
      console.error("Error deleting item", err);
    }
  };

  const getActionConfig = (action) => {
    switch (action) {
      case "add":
        return {
          verb: __("Added", "whizmanage"),
          color: "text-slate-700 dark:text-slate-200",
          bgColor: "bg-fuchsia-100 dark:bg-fuchsia-900/30",
          iconColor: "text-fuchsia-600 dark:text-fuchsia-400",
          Icon: Plus,
        };
      case "put":
        return {
          verb: __("Updated", "whizmanage"),
          color: "text-slate-700 dark:text-slate-200",
          bgColor: "bg-fuchsia-100 dark:bg-fuchsia-900/30",
          iconColor: "text-fuchsia-600 dark:text-fuchsia-400",
          Icon: Pencil,
        };
      case "delete":
        return {
          verb: __("Deleted", "whizmanage"),
          color: "text-slate-700 dark:text-slate-200",
          bgColor: "bg-fuchsia-100 dark:bg-fuchsia-900/30",
          iconColor: "text-fuchsia-600 dark:text-fuchsia-400",
          Icon: Trash2,
        };
      case "duplicate":
        return {
          verb: __("Duplicated", "whizmanage"),
          color: "text-slate-700 dark:text-slate-200",
          bgColor: "bg-fuchsia-100 dark:bg-fuchsia-900/30",
          iconColor: "text-fuchsia-600 dark:text-fuchsia-400",
          Icon: Copy,
        };
      default:
        return {
          verb: __("Performed", "whizmanage"),
          color: "text-slate-700 dark:text-slate-200",
          bgColor: "bg-fuchsia-100 dark:bg-fuchsia-900/30",
          iconColor: "text-fuchsia-600 dark:text-fuchsia-400",
          Icon: HistoryIcon,
        };
    }
  };

  const getLocationLabel = (location) => {
    const labels = {
      products: __("products", "whizmanage"),
      orders: __("orders", "whizmanage"),
      coupons: __("coupons", "whizmanage"),
      customers: __("customers", "whizmanage"),
      "discount-rules": __("discount rules", "whizmanage"),
    };
    return labels[location] || location;
  };

  // קונפיג לבאדג' של כל טבלה
  const getLocationBadgeConfig = (location) => {
    const configs = {
      products: {
        label: __("Products", "whizmanage"),
        Icon: ShoppingBasket,
        bgColor: "bg-blue-100 dark:bg-blue-900/30",
        textColor: "text-blue-700 dark:text-blue-300",
        iconColor: "text-blue-600 dark:text-blue-400",
      },
      orders: {
        label: __("Orders", "whizmanage"),
        Icon: ShoppingCart,
        bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
        textColor: "text-emerald-700 dark:text-emerald-300",
        iconColor: "text-emerald-600 dark:text-emerald-400",
      },
      coupons: {
        label: __("Coupons", "whizmanage"),
        Icon: Ticket,
        bgColor: "bg-orange-100 dark:bg-orange-900/30",
        textColor: "text-orange-700 dark:text-orange-300",
        iconColor: "text-orange-600 dark:text-orange-400",
      },
      customers: {
        label: __("Customers", "whizmanage"),
        Icon: Users,
        bgColor: "bg-purple-100 dark:bg-purple-900/30",
        textColor: "text-purple-700 dark:text-purple-300",
        iconColor: "text-purple-600 dark:text-purple-400",
      },
      "discount-rules": {
        label: __("Discount Rules", "whizmanage"),
        Icon: Percent,
        bgColor: "bg-amber-100 dark:bg-amber-900/30",
        textColor: "text-amber-700 dark:text-amber-300",
        iconColor: "text-amber-600 dark:text-amber-400",
      },
    };
    return configs[location] || {
      label: location,
      Icon: ShoppingBasket,
      bgColor: "bg-slate-100 dark:bg-slate-700",
      textColor: "text-slate-700 dark:text-slate-300",
      iconColor: "text-slate-600 dark:text-slate-400",
    };
  };

  // קומפוננטה לבאדג' של הטבלה
  const LocationBadge = ({ location }) => {
    const config = getLocationBadgeConfig(location);
    const IconComponent = config.Icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}>
        <IconComponent className={`size-3 ${config.iconColor}`} />
        {config.label}
      </span>
    );
  };

  // אפשרויות סינון לפי טבלה
  const locationOptions = [
    { value: "all", label: __("All", "whizmanage"), Icon: LayoutGrid },
    { value: "products", label: __("Products", "whizmanage"), Icon: ShoppingBasket },
    { value: "orders", label: __("Orders", "whizmanage"), Icon: ShoppingCart },
    { value: "coupons", label: __("Coupons", "whizmanage"), Icon: Ticket },
    { value: "customers", label: __("Customers", "whizmanage"), Icon: Users },
    { value: "discount-rules", label: __("Discount Rules", "whizmanage"), Icon: Percent },
  ];

  // אפשרויות סינון לפי סוג פעולה
  const actionOptions = [
    { value: "all", label: __("All Actions", "whizmanage"), Icon: HistoryIcon },
    { value: "add", label: __("Added", "whizmanage"), Icon: Plus },
    { value: "put", label: __("Updated", "whizmanage"), Icon: Pencil },
    { value: "delete", label: __("Deleted", "whizmanage"), Icon: Trash2 },
    { value: "duplicate", label: __("Duplicated", "whizmanage"), Icon: Copy },
    { value: "config", label: __("Config Changes", "whizmanage"), Icon: ArrowRightLeft },
  ];

  // בדיקה אם זה שינוי config (כמו columnOrder)
  const isConfigChange = (item) => {
    const firstItem = item?.items?.[0];
    return firstItem?.__meta?.kind === "config" || firstItem?.id?.startsWith?.("config:");
  };

  // סינון ההיסטוריה לפי הפילטרים
  const filteredHistory = history.filter((item) => {
    // סינון לפי טבלה
    if (locationFilter !== "all" && item.location !== locationFilter) {
      return false;
    }
    // סינון לפי סוג פעולה
    if (actionFilter !== "all") {
      if (actionFilter === "config") {
        // בדיקה אם זה שינוי config
        if (!isConfigChange(item)) return false;
      } else {
        // בדיקה שהפעולה תואמת ושזה לא config change
        if (item.action !== actionFilter || isConfigChange(item)) return false;
      }
    }
    return true;
  });

  // יצירת הודעה פשוטה לשינוי סדר עמודות
  const getColumnOrderMessage = (item) => {
    const firstItem = item?.items?.[0];
    if (!firstItem || firstItem?.__meta?.field !== "columnOrder") return null;

    const oldOrder = firstItem.old;
    const newOrder = firstItem.new;

    if (!Array.isArray(oldOrder) || !Array.isArray(newOrder)) return null;

    // מציאת העמודה שזזה
    for (let i = 0; i < newOrder.length; i++) {
      const col = newOrder[i];
      const oldIndex = oldOrder.indexOf(col);
      const newIndex = i;

      if (oldIndex !== -1 && oldIndex !== newIndex) {
        // נמצאה עמודה שזזה
        const locationLabel = getLocationLabel(item.location);
        return {
          column: col,
          from: oldIndex + 1,
          to: newIndex + 1,
          location: locationLabel,
        };
      }
    }

    return null;
  };

  // יצירת הודעה פשוטה לשינוי נראות עמודות
  const getColumnVisibilityMessage = (item) => {
    const firstItem = item?.items?.[0];
    if (!firstItem || firstItem?.__meta?.field !== "columnVisibility") return null;

    const oldVisibility = firstItem.old;
    const newVisibility = firstItem.new;

    if (typeof oldVisibility !== "object" || typeof newVisibility !== "object") return null;

    const locationLabel = getLocationLabel(item.location);
    const changes = [];

    // מציאת עמודות שהשתנו
    const allKeys = new Set([...Object.keys(oldVisibility || {}), ...Object.keys(newVisibility || {})]);

    for (const col of allKeys) {
      const wasVisible = oldVisibility?.[col] !== false; // ברירת מחדל: visible
      const isVisible = newVisibility?.[col] !== false;

      if (wasVisible && !isVisible) {
        changes.push({ column: col, action: "hidden" });
      } else if (!wasVisible && isVisible) {
        changes.push({ column: col, action: "shown" });
      }
    }

    if (changes.length === 0) return null;

    return {
      changes,
      location: locationLabel,
    };
  };

  // יצירת הודעה פשוטה לשינוי נעיצת עמודות
  const getColumnPinningMessage = (item) => {
    const firstItem = item?.items?.[0];
    if (!firstItem || firstItem?.__meta?.field !== "columnPinning") return null;

    const oldPinning = firstItem.old;
    const newPinning = firstItem.new;

    if (typeof oldPinning !== "object" || typeof newPinning !== "object") return null;

    const locationLabel = getLocationLabel(item.location);
    const changes = [];

    // מציאת עמודות שהשתנו
    const oldLeft = new Set(oldPinning?.left || []);
    const oldRight = new Set(oldPinning?.right || []);
    const newLeft = new Set(newPinning?.left || []);
    const newRight = new Set(newPinning?.right || []);

    // עמודות שנוספו לנעיצה שמאלית
    for (const col of newLeft) {
      if (!oldLeft.has(col)) {
        changes.push({ column: col, action: "pinned", side: "left" });
      }
    }

    // עמודות שנוספו לנעיצה ימנית
    for (const col of newRight) {
      if (!oldRight.has(col)) {
        changes.push({ column: col, action: "pinned", side: "right" });
      }
    }

    // עמודות שהוסרו מנעיצה שמאלית
    for (const col of oldLeft) {
      if (!newLeft.has(col) && !newRight.has(col)) {
        changes.push({ column: col, action: "unpinned" });
      }
    }

    // עמודות שהוסרו מנעיצה ימנית
    for (const col of oldRight) {
      if (!newRight.has(col) && !newLeft.has(col)) {
        changes.push({ column: col, action: "unpinned" });
      }
    }

    if (changes.length === 0) return null;

    return {
      changes,
      location: locationLabel,
    };
  };

  // Image components
  const ImageCell = ({ url, alt }) => {
    if (!url) return null;
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        <img
          src={url}
          alt={alt || "image"}
          className="max-w-[100px] max-h-[100px] object-cover rounded-lg border border-slate-200 dark:border-slate-600 hover:opacity-80 transition-opacity"
        />
      </a>
    );
  };

  const ImageGrid = ({ urls = [], highlight = {}, rawData = [] }) => {
    const added = new Set(highlight.added || []);
    const removed = new Set(highlight.removed || []);

    // Helper to render avatars in a grid (5 per row)
    const renderAvatars = (urlList, useHighlight = true) => (
      <div className="grid grid-cols-5 gap-1.5 max-w-[280px]">
        {urlList.map((u, idx) => {
          const isAdded = useHighlight && added.has(u);
          const isRemoved = useHighlight && removed.has(u);
          const ringClass = isAdded
            ? "ring-2 ring-emerald-500"
            : isRemoved
              ? "ring-2 ring-red-500 opacity-60"
              : "ring-1 ring-slate-200 dark:ring-slate-600";
          return (
            <img
              key={`${u}-${idx}`}
              src={u}
              alt=""
              className={`w-12 h-12 object-cover rounded-md ${ringClass}`}
            />
          );
        })}
      </div>
    );

    // Helper to render image names as chips (fallback when no URLs)
    const renderImageChips = (items, highlightSet = new Set(), isRemoved = false) => (
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, idx) => {
          const name = typeof item === "string" ? item : (item?.name || item?.alt || `Image ${idx + 1}`);
          const isHighlighted = highlightSet.has(name);
          let chipClass = "bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200";
          if (isHighlighted && !isRemoved) {
            chipClass = "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30";
          } else if (isHighlighted && isRemoved) {
            chipClass = "bg-slate-200 dark:bg-slate-600 text-slate-400 dark:text-slate-400 opacity-60";
          }
          return (
            <span
              key={`${name}-${idx}`}
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${chipClass}`}
            >
              {name}
            </span>
          );
        })}
      </div>
    );

    // If we have URLs, show them as avatars
    if (urls.length > 0) {
      return renderAvatars(urls);
    }

    // Fallback: if we have raw data with src, try to render from there
    const rawArr = Array.isArray(rawData) ? rawData : [];
    const extractedUrls = rawArr
      .map(item => {
        if (!item) return null;
        if (typeof item === "string") return item;
        if (typeof item === "object") {
          return item.src || item.url || item.source_url || item.guid || item.source || null;
        }
        return null;
      })
      .filter(Boolean);

    if (extractedUrls.length > 0) {
      return renderAvatars(extractedUrls, false);
    }

    // Fallback: show image names as chips if we have raw data with names
    if (rawArr.length > 0) {
      const names = rawArr.map(item => item?.name || item?.alt).filter(Boolean);
      if (names.length > 0) {
        return renderImageChips(rawArr, new Set(highlight.added || highlight.removed || []));
      }
    }

    // If still nothing, show placeholder
    return <span className="text-muted-foreground text-sm">—</span>;
  };

  const diffLists = (oldList = [], newList = []) => {
    const oldSet = new Set(oldList);
    const newSet = new Set(newList);
    const added = newList.filter((u) => !oldSet.has(u));
    const removed = oldList.filter((u) => !newSet.has(u));
    return { added, removed };
  };

  // קומפוננטה להצגת צ'יפים של terms (קטגוריות, תגיות, וכו')
  const TermChips = ({ terms = [], highlight = {}, fieldKey = "" }) => {
    const added = new Set(highlight.added || []);
    const removed = new Set(highlight.removed || []);

    if (terms.length === 0) {
      return <span className="text-muted-foreground text-sm">—</span>;
    }

    return (
      <div className="flex flex-wrap gap-1.5">
        {terms.map((term, idx) => {
          const isAdded = added.has(term);
          const isRemoved = removed.has(term);
          // תרגום ID לשם אם אפשר
          const displayName = resolveTermName(term, fieldKey);

          let chipClass = "bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200";
          if (isAdded) {
            chipClass = "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30";
          } else if (isRemoved) {
            chipClass = "bg-slate-200 dark:bg-slate-600 text-slate-400 dark:text-slate-400 opacity-60";
          }

          return (
            <span
              key={`${term}-${idx}`}
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${chipClass}`}
            >
              {displayName}
            </span>
          );
        })}
      </div>
    );
  };

  const makeCell = (val, type, extra = {}) => {
    if (type === "image") {
      return <ImageCell url={extra?.url} alt="preview" />;
    }
    if (type === "image-list") {
      const { list = [], highlight, rawData = [] } = extra;
      return <ImageGrid urls={list} highlight={highlight} rawData={rawData} />;
    }
    if (type === "term-list") {
      const { terms = [], highlight, fieldKey = "" } = extra;
      return <TermChips terms={terms} highlight={highlight} fieldKey={fieldKey} />;
    }
    if (type === "html") {
      return (
        <div
          className="text-sm text-slate-600 dark:text-slate-300 prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: String(val || "") }}
        />
      );
    }
    return (
      <span className="text-sm text-slate-700 dark:text-slate-300 font-mono">
        {formatScalar(val, __)}
      </span>
    );
  };

  const renderChangesTable = (item) => {
    if (item.action !== "put" || !Array.isArray(item.items)) return null;

    return (
      <div className="mt-3 space-y-3">
        {preprocessHistoryItems(item.items).map((processed, idx) => {
          const findDisplayName = () => {
            if (processed?.name) return processed.name;
            const raw =
              Array.isArray(item?.items) &&
              item.items.find((ch) => ch?.id === processed.id);
            if (raw?.name) return raw.name;
            const firstRow = processed?.rows && processed.rows[0];
            return firstRow?.new?.name || firstRow?.old?.name || null;
          };

          const displayName = findDisplayName();

          return (
            <div
              key={`processed-${idx}`}
              className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              {/* Item Header */}
              <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Package className="size-4 text-fuchsia-600 dark:text-fuchsia-400" />
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    #{processed.id}
                  </span>
                  {displayName && (
                    <span className="text-sm text-slate-500 dark:text-slate-300 truncate max-w-[200px]">
                      {displayName}
                    </span>
                  )}
                </div>
              </div>
              {/* Changes */}
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {processed.rows.map((row, i) => {
                  if (row.type === "meta") {
                    return (
                      <div key={`meta-${idx}-${i}`} className="p-3">
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wide mb-2">
                          {__(row.label, "whizmanage")}
                        </div>
                        <div className="space-y-2">
                          {row.new.map((m, j) => {
                            if (m.renderType === "image-list") {
                              const hl = diffLists(m.oldList, m.newList);
                              return (
                                <div
                                  key={`meta-row-${idx}-${i}-${j}`}
                                  className="grid grid-cols-3 gap-3"
                                >
                                  <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                    {__(m.label, "whizmanage")}
                                  </div>
                                  <div className="bg-slate-100 dark:bg-slate-700/50 rounded-md p-2">
                                    {makeCell(null, "image-list", {
                                      list: m.oldList,
                                      highlight: { removed: hl.removed },
                                      rawData: m.old,
                                    })}
                                  </div>
                                  <div className="bg-slate-100 dark:bg-slate-700/50 rounded-md p-2">
                                    {makeCell(null, "image-list", {
                                      list: m.newList,
                                      highlight: { added: hl.added },
                                      rawData: m.new,
                                    })}
                                  </div>
                                </div>
                              );
                            }
                            return (
                              <div
                                key={`meta-row-${idx}-${i}-${j}`}
                                className="grid grid-cols-3 gap-3 items-start"
                              >
                                <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                  {__(m.label, "whizmanage")}
                                </div>
                                <div className="bg-slate-100 dark:bg-slate-700/50 rounded-md p-2 min-h-[32px] flex items-center">
                                  {m.renderType === "image" ? (
                                    <ImageCell url={m.oldUrl} alt="old" />
                                  ) : (
                                    <span className="text-sm text-slate-600 dark:text-slate-300">
                                      {formatScalar(m.old, __)}
                                    </span>
                                  )}
                                </div>
                                <div className="bg-slate-100 dark:bg-slate-700/50 rounded-md p-2 min-h-[32px] flex items-center">
                                  {m.renderType === "image" ? (
                                    <ImageCell url={m.newUrl} alt="new" />
                                  ) : (
                                    <span className="text-sm text-slate-600 dark:text-slate-300">
                                      {formatScalar(m.new, __)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  if (row.type === "image-list") {
                    const hl = diffLists(row.oldList, row.newList);
                    return (
                      <div
                        key={`row-${idx}-${i}`}
                        className="grid grid-cols-3 gap-3 p-3 items-start"
                      >
                        <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
                          {__(row.label, "whizmanage")}
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-700/50 rounded-md p-2">
                          {makeCell(null, "image-list", {
                            list: row.oldList,
                            highlight: { removed: hl.removed },
                            rawData: row.rawOld || row.old,
                          })}
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-700/50 rounded-md p-2">
                          {makeCell(null, "image-list", {
                            list: row.newList,
                            highlight: { added: hl.added },
                            rawData: row.rawNew || row.new,
                          })}
                        </div>
                      </div>
                    );
                  }

                  if (row.type === "term-list") {
                    const hl = diffLists(row.oldTerms, row.newTerms);
                    return (
                      <div
                        key={`row-${idx}-${i}`}
                        className="grid grid-cols-3 gap-3 p-3 items-start"
                      >
                        <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
                          {__(row.label, "whizmanage")}
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-700/50 rounded-md p-2 min-h-[32px] flex items-center">
                          {makeCell(null, "term-list", {
                            terms: row.oldTerms,
                            highlight: { removed: hl.removed },
                            fieldKey: row.key,
                          })}
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-700/50 rounded-md p-2 min-h-[32px] flex items-center">
                          {makeCell(null, "term-list", {
                            terms: row.newTerms,
                            highlight: { added: hl.added },
                            fieldKey: row.key,
                          })}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={`row-${idx}-${i}`}
                      className="grid grid-cols-3 gap-3 p-3 items-start"
                    >
                      <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
                        {__(row.label, "whizmanage")}
                      </div>
                      <div className="bg-slate-100 dark:bg-slate-700/50 rounded-md p-2 min-h-[32px] flex items-center">
                        {makeCell(row.old, row.type, { url: row.oldUrl })}
                      </div>
                      <div className="bg-slate-100 dark:bg-slate-700/50 rounded-md p-2 min-h-[32px] flex items-center">
                        {makeCell(row.new, row.type, { url: row.newUrl })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Modal
      size="3xl"
      scrollBehavior="inside"
      backdrop="opaque"
      className="overflow-hidden"
      classNames={{
        backdrop:
          "bg-gradient-to-t from-zinc-800 to-zinc-800/30 backdrop-opacity-20 !overflow-hidden",
        closeButton: "hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 rounded-lg",
      }}
      isOpen={isOpen}
      isDismissable={false}
      onOpenChange={(open) => setIsOpen(Boolean(open))}
      motionProps={{
        variants: {
          enter: {
            y: 0,
            opacity: 1,
            transition: { duration: 0.3, ease: "easeOut" },
          },
          exit: {
            y: -20,
            opacity: 0,
            transition: { duration: 0.2, ease: "easeIn" },
          },
        },
      }}
    >
      <ModalContent className="dark:bg-slate-900 bg-white">
        {() => (
          <>
            {/* Header */}
            <ModalHeader className="flex flex-col items-center gap-3 pt-6 pb-4 border-b border-slate-200/60 dark:border-slate-700/60">
              <div className="rounded-lg bg-fuchsia-100 dark:bg-fuchsia-900/30 p-3">
                <HistoryIcon className="size-8 text-fuchsia-600 dark:text-fuchsia-400" />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                  {__("Activity History", "whizmanage")}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-300 mt-1">
                  {__("View and restore your recent changes", "whizmanage")}
                </p>
              </div>
              {/* Filter Dropdowns */}
              <div className="flex items-center gap-3 mt-2 w-full max-w-md">
                {/* Location Filter */}
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="flex-1 h-9 text-muted-foreground">
                    <SelectValue>
                      <span className="flex items-center gap-2">
                        {(() => {
                          const opt = locationOptions.find(o => o.value === locationFilter);
                          const Icon = opt?.Icon;
                          return Icon ? <Icon className="size-4" /> : null;
                        })()}
                        {locationOptions.find(o => o.value === locationFilter)?.label}
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {locationOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="text-muted-foreground">
                        <span className="flex items-center gap-2">
                          <option.Icon className="size-4" />
                          {option.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Action Filter */}
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="flex-1 h-9 text-muted-foreground">
                    <SelectValue>
                      <span className="flex items-center gap-2">
                        {(() => {
                          const opt = actionOptions.find(o => o.value === actionFilter);
                          const Icon = opt?.Icon;
                          return Icon ? <Icon className="size-4" /> : null;
                        })()}
                        {actionOptions.find(o => o.value === actionFilter)?.label}
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {actionOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="text-muted-foreground">
                        <span className="flex items-center gap-2">
                          <option.Icon className="size-4" />
                          {option.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </ModalHeader>

            {/* Body */}
            <ModalBody className="p-0">
              <ScrollShadow
                size={20}
                className="w-full h-[60vh] scrollbar-whiz"
              >
                <div className="p-4 space-y-3">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-fuchsia-600 mb-4"></div>
                      <p className="text-slate-500 dark:text-slate-300">
                        {__("Loading history...", "whizmanage")}
                      </p>
                    </div>
                  ) : filteredHistory.length > 0 ? (
                    filteredHistory.map((item, index) => {
                      const actionConfig = getActionConfig(item.action);
                      const isExpanded = expandedItems[item.id] === true;
                      const count = Array.isArray(item.items)
                        ? item.items.length
                        : 0;

                      // 🔒 בדיקה אם הפריט חסום (מעבר ל-5 הראשונים עבור Free users)
                      const isLocked = noLicence && index >= FREE_HISTORY_LIMIT;

                      // בדיקה אם זה שינוי config (כמו columnOrder, columnVisibility או columnPinning)
                      const configChange = isConfigChange(item);
                      const columnOrderMsg = configChange ? getColumnOrderMessage(item) : null;
                      const columnVisibilityMsg = configChange ? getColumnVisibilityMessage(item) : null;
                      const columnPinningMsg = configChange ? getColumnPinningMessage(item) : null;

                      // אם זה שינוי נעיצת עמודות - הצג הודעה פשוטה בלי אקורדיון
                      if (configChange && columnPinningMsg) {
                        return (
                          <div
                            key={item.id}
                            className={`rounded-xl border ${isLocked ? "border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"} overflow-hidden transition-all ${!isLocked ? "hover:border-fuchsia-300 dark:hover:border-fuchsia-700" : ""}`}
                          >
                            <div className={`flex items-center justify-between p-4 ${isLocked ? "opacity-60" : ""}`}>
                              <div className="flex items-center gap-3">
                                {/* Icon */}
                                <div className={`rounded-lg p-2 ${isLocked ? "bg-slate-100 dark:bg-slate-700" : "bg-fuchsia-100 dark:bg-fuchsia-900/30"}`}>
                                  {isLocked ? (
                                    <Lock className="size-4 text-slate-400 dark:text-slate-500" />
                                  ) : (
                                    columnPinningMsg.changes[0]?.action === "pinned"
                                      ? <Pin className="size-4 text-fuchsia-600 dark:text-fuchsia-400" />
                                      : <PinOff className="size-4 text-fuchsia-600 dark:text-fuchsia-400" />
                                  )}
                                </div>

                                {/* Content */}
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {columnPinningMsg.changes.map((change, idx) => (
                                      <span key={idx} className={`font-medium ${isLocked ? "text-slate-400 dark:text-slate-500" : "text-slate-700 dark:text-slate-200"}`}>
                                        {__("Column", "whizmanage")} <span className="font-semibold">{change.column}</span> {change.action === "pinned" ? __("was pinned", "whizmanage") : __("was unpinned", "whizmanage")}
                                        {idx < columnPinningMsg.changes.length - 1 && ", "}
                                      </span>
                                    ))}
                                    {!isLocked && <LocationBadge location={item.location} />}
                                    {isLocked && (
                                      <span className="scale-75">
                                        <ProBadge />
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-300">
                                    <span className="flex items-center gap-1">
                                      <User className="size-3" />
                                      {item.user}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <CalendarDays className="size-3" />
                                      {item.date}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-2">
                                {isLocked ? (
                                  <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                                    {__("Pro only", "whizmanage")}
                                  </span>
                                ) : (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 px-3 text-fuchsia-600 border-fuchsia-200 hover:bg-fuchsia-50 hover:border-fuchsia-300 dark:text-fuchsia-400 dark:border-fuchsia-800 dark:hover:bg-fuchsia-900/20"
                                      onClick={() => restoreItem(item)}
                                    >
                                      <RotateCcw className="size-3.5 me-1.5" />
                                      {__("Restore", "whizmanage")}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                      onClick={() => deleteItem(item.id)}
                                    >
                                      <Trash2 className="size-4" />
                                    </Button>
                                  </>
                                )}
                                {/* Spacer to align with accordion chevron */}
                                <div className="ps-2 border-s border-slate-200 dark:border-slate-600 w-7 flex justify-center">
                                  <span className="size-5" />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // אם זה שינוי נראות עמודות - הצג הודעה פשוטה בלי אקורדיון
                      if (configChange && columnVisibilityMsg) {
                        return (
                          <div
                            key={item.id}
                            className={`rounded-xl border ${isLocked ? "border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"} overflow-hidden transition-all ${!isLocked ? "hover:border-fuchsia-300 dark:hover:border-fuchsia-700" : ""}`}
                          >
                            <div className={`flex items-center justify-between p-4 ${isLocked ? "opacity-60" : ""}`}>
                              <div className="flex items-center gap-3">
                                {/* Icon */}
                                <div className={`rounded-lg p-2 ${isLocked ? "bg-slate-100 dark:bg-slate-700" : "bg-fuchsia-100 dark:bg-fuchsia-900/30"}`}>
                                  {isLocked ? (
                                    <Lock className="size-4 text-slate-400 dark:text-slate-500" />
                                  ) : (
                                    columnVisibilityMsg.changes[0]?.action === "hidden"
                                      ? <EyeOff className="size-4 text-fuchsia-600 dark:text-fuchsia-400" />
                                      : <Eye className="size-4 text-fuchsia-600 dark:text-fuchsia-400" />
                                  )}
                                </div>

                                {/* Content */}
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {columnVisibilityMsg.changes.map((change, idx) => (
                                      <span key={idx} className={`font-medium ${isLocked ? "text-slate-400 dark:text-slate-500" : "text-slate-700 dark:text-slate-200"}`}>
                                        {__("Column", "whizmanage")} <span className="font-semibold">{change.column}</span> {change.action === "hidden" ? __("was hidden", "whizmanage") : __("was shown", "whizmanage")}
                                        {idx < columnVisibilityMsg.changes.length - 1 && ", "}
                                      </span>
                                    ))}
                                    {!isLocked && <LocationBadge location={item.location} />}
                                    {isLocked && (
                                      <span className="scale-75">
                                        <ProBadge />
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-300">
                                    <span className="flex items-center gap-1">
                                      <User className="size-3" />
                                      {item.user}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <CalendarDays className="size-3" />
                                      {item.date}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-2">
                                {isLocked ? (
                                  <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                                    {__("Pro only", "whizmanage")}
                                  </span>
                                ) : (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 px-3 text-fuchsia-600 border-fuchsia-200 hover:bg-fuchsia-50 hover:border-fuchsia-300 dark:text-fuchsia-400 dark:border-fuchsia-800 dark:hover:bg-fuchsia-900/20"
                                      onClick={() => restoreItem(item)}
                                    >
                                      <RotateCcw className="size-3.5 me-1.5" />
                                      {__("Restore", "whizmanage")}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                      onClick={() => deleteItem(item.id)}
                                    >
                                      <Trash2 className="size-4" />
                                    </Button>
                                  </>
                                )}
                                {/* Spacer to align with accordion chevron */}
                                <div className="ps-2 border-s border-slate-200 dark:border-slate-600 w-7 flex justify-center">
                                  <span className="size-5" />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // אם זה שינוי סדר עמודות - הצג הודעה פשוטה בלי אקורדיון
                      if (configChange && columnOrderMsg) {
                        return (
                          <div
                            key={item.id}
                            className={`rounded-xl border ${isLocked ? "border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"} overflow-hidden transition-all ${!isLocked ? "hover:border-fuchsia-300 dark:hover:border-fuchsia-700" : ""}`}
                          >
                            <div className={`flex items-center justify-between p-4 ${isLocked ? "opacity-60" : ""}`}>
                              <div className="flex items-center gap-3">
                                {/* Icon */}
                                <div className={`rounded-lg p-2 ${isLocked ? "bg-slate-100 dark:bg-slate-700" : "bg-fuchsia-100 dark:bg-fuchsia-900/30"}`}>
                                  {isLocked ? (
                                    <Lock className="size-4 text-slate-400 dark:text-slate-500" />
                                  ) : (
                                    <ArrowRightLeft className="size-4 text-fuchsia-600 dark:text-fuchsia-400" />
                                  )}
                                </div>

                                {/* Content */}
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`font-medium ${isLocked ? "text-slate-400 dark:text-slate-500" : "text-slate-700 dark:text-slate-200"}`}>
                                      {__("Column", "whizmanage")} <span className="font-semibold">{columnOrderMsg.column}</span> {__("moved from position", "whizmanage")} {columnOrderMsg.from} {__("to", "whizmanage")} {columnOrderMsg.to}
                                    </span>
                                    {!isLocked && <LocationBadge location={item.location} />}
                                    {isLocked && (
                                      <span className="scale-75">
                                        <ProBadge />
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-300">
                                    <span className="flex items-center gap-1">
                                      <User className="size-3" />
                                      {item.user}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <CalendarDays className="size-3" />
                                      {item.date}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-2">
                                {isLocked ? (
                                  <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                                    {__("Pro only", "whizmanage")}
                                  </span>
                                ) : (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 px-3 text-fuchsia-600 border-fuchsia-200 hover:bg-fuchsia-50 hover:border-fuchsia-300 dark:text-fuchsia-400 dark:border-fuchsia-800 dark:hover:bg-fuchsia-900/20"
                                      onClick={() => restoreItem(item)}
                                    >
                                      <RotateCcw className="size-3.5 me-1.5" />
                                      {__("Restore", "whizmanage")}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                      onClick={() => deleteItem(item.id)}
                                    >
                                      <Trash2 className="size-4" />
                                    </Button>
                                  </>
                                )}
                                {/* Spacer to align with accordion chevron */}
                                <div className="ps-2 border-s border-slate-200 dark:border-slate-600 w-7 flex justify-center">
                                  <span className="size-5" />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <Collapsible
                          key={item.id}
                          open={isExpanded && !isLocked}
                          onOpenChange={(open) => {
                            if (isLocked) return;
                            setExpandedItems((prev) => ({
                              ...prev,
                              [item.id]: open,
                            }));
                          }}
                        >
                          <div className={`rounded-xl border ${isLocked ? "border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"} overflow-hidden transition-all ${!isLocked ? "hover:border-fuchsia-300 dark:hover:border-fuchsia-700" : ""}`}>
                            {/* Item Header */}
                            <CollapsibleTrigger asChild disabled={item.action !== "put" || isLocked}>
                              <div className={`flex items-center justify-between p-4 transition-colors ${item.action === "put" && !isLocked ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50" : ""} ${isLocked ? "opacity-60" : ""}`}>
                                <div className="flex items-center gap-3">
                                  {/* Action Badge */}
                                  <div
                                    className={`rounded-lg p-2 ${isLocked ? "bg-slate-100 dark:bg-slate-700" : actionConfig.bgColor}`}
                                  >
                                    {isLocked ? (
                                      <Lock className="size-4 text-slate-400 dark:text-slate-500" />
                                    ) : (
                                      <actionConfig.Icon
                                        className={`size-4 ${actionConfig.iconColor}`}
                                      />
                                    )}
                                  </div>

                                  {/* Content */}
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`font-medium ${isLocked ? "text-slate-400 dark:text-slate-500" : "text-slate-700 dark:text-slate-200"}`}
                                      >
                                        {actionConfig.verb}
                                      </span>
                                      <span className={isLocked ? "text-slate-400 dark:text-slate-500" : "text-slate-700 dark:text-slate-200"}>
                                        {count}
                                      </span>
                                      {!isLocked && <LocationBadge location={item.location} />}
                                      {isLocked && (
                                        <>
                                          <span className="text-slate-400 dark:text-slate-500">
                                            {getLocationLabel(item.location)}
                                          </span>
                                          <span className="scale-75">
                                            <ProBadge />
                                          </span>
                                        </>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-300">
                                      <span className="flex items-center gap-1">
                                        <User className="size-3" />
                                        {item.user}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <CalendarDays className="size-3" />
                                        {item.date}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                  {isLocked ? (
                                    <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                                      {__("Pro only", "whizmanage")}
                                    </span>
                                  ) : (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 px-3 text-fuchsia-600 border-fuchsia-200 hover:bg-fuchsia-50 hover:border-fuchsia-300 dark:text-fuchsia-400 dark:border-fuchsia-800 dark:hover:bg-fuchsia-900/20"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          restoreItem(item);
                                        }}
                                      >
                                        <RotateCcw className="size-3.5 me-1.5" />
                                        {__("Restore", "whizmanage")}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteItem(item.id);
                                        }}
                                      >
                                        <Trash2 className="size-4" />
                                      </Button>
                                    </>
                                  )}
                                  {!isLocked && (
                                    <div className="ps-2 border-s border-slate-200 dark:border-slate-600 w-7 flex justify-center">
                                      {item.action === "put" ? (
                                        isExpanded ? (
                                          <ChevronDown className="size-5 text-slate-400" />
                                        ) : (
                                          <ChevronRight
                                            className={`size-5 text-slate-400 ${isRtl ? "rotate-180" : ""}`}
                                          />
                                        )
                                      ) : (
                                        <span className="size-5" />
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CollapsibleTrigger>

                            {/* Expanded Content */}
                            {item.action === "put" && !isLocked && (
                              <CollapsibleContent>
                                <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 p-4">
                                  {/* Table Header */}
                                  <div className="grid grid-cols-3 gap-3 mb-3 px-3">
                                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wide">
                                      {__("Field", "whizmanage")}
                                    </div>
                                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wide">
                                      {__("Old Value", "whizmanage")}
                                    </div>
                                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wide">
                                      {__("New Value", "whizmanage")}
                                    </div>
                                  </div>
                                  {renderChangesTable(item)}
                                </div>
                              </CollapsibleContent>
                            )}
                          </div>
                        </Collapsible>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16">
                      <div className="rounded-full bg-slate-100 dark:bg-slate-800 p-4 mb-4">
                        {history.length > 0 && filteredHistory.length === 0 ? (
                          <Filter className="size-8 text-slate-400 dark:text-slate-500" />
                        ) : (
                          <Clock className="size-8 text-slate-400 dark:text-slate-500" />
                        )}
                      </div>
                      <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-1">
                        {history.length > 0 && filteredHistory.length === 0
                          ? __("No matching results", "whizmanage")
                          : __("No history yet", "whizmanage")}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-300 text-center max-w-xs">
                        {history.length > 0 && filteredHistory.length === 0
                          ? __("Try adjusting your filters to see more results", "whizmanage")
                          : __(
                              "Your recent changes will appear here so you can track and restore them",
                              "whizmanage"
                            )}
                      </p>
                      {history.length > 0 && filteredHistory.length === 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4"
                          onClick={() => {
                            setLocationFilter("all");
                            setActionFilter("all");
                          }}
                        >
                          {__("Clear filters", "whizmanage")}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </ScrollShadow>
            </ModalBody>

            {/* Footer */}
            <ModalFooter className="border-t border-slate-200/60 dark:border-slate-700/60 p-4">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                <X className="size-4 me-2" />
                {__("Close", "whizmanage")}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
