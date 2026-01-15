// src/components/settings/tabs/CustomFieldsVisibilitySettings.jsx

import { useState, useMemo, useEffect, useCallback } from "react";
import { __ } from "@wordpress/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  RotateCcw,
  Puzzle,
  Type,
  AlignLeft,
  Hash,
  Calendar,
  ListFilter,
  CheckSquare,
  ToggleLeft,
  FileText,
  Image,
  Images,
  CircleHelp,
  Sparkles,
  Search,
  Layers,
  Zap,
} from "lucide-react";
import SettingsCardHeader from "../SettingsCardHeader";
import { cn } from "@/lib/utils";

// Source configurations - all using brand colors (fuchsia)
const SOURCE_CONFIG = {
  ACF: {
    label: "Advanced Custom Fields",
    shortLabel: "ACF",
    icon: Layers,
  },
  JetEngine: {
    label: "JetEngine",
    shortLabel: "JetEngine",
    icon: Zap,
  },
  "Yoast SEO": {
    label: "Yoast SEO",
    shortLabel: "Yoast",
    icon: Search,
  },
};

// Field type icons mapping
const FIELD_TYPE_ICONS = {
  text: Type,
  textarea: AlignLeft,
  number: Hash,
  date: Calendar,
  select: ListFilter,
  checkbox: CheckSquare,
  switcher: ToggleLeft,
  wysiwyg: FileText,
  image: Image,
  media: Image,
  gallery: Images,
};

// Get icon for field type
const getFieldTypeIcon = (type) => {
  return FIELD_TYPE_ICONS[type] || CircleHelp;
};

// Get readable field type name
const getFieldTypeName = (type) => {
  const names = {
    text: "Text",
    textarea: "Text Area",
    number: "Number",
    date: "Date",
    select: "Select",
    checkbox: "Checkbox",
    switcher: "Toggle",
    wysiwyg: "Rich Text",
    image: "Image",
    media: "Media",
    gallery: "Gallery",
  };
  return names[type] || type;
};

// Single field item component
function FieldItem({ field, isHidden, onToggle }) {
  const TypeIcon = getFieldTypeIcon(field.type);

  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 p-3 rounded-xl transition-all duration-300",
        "border border-transparent",
        "hover:border-slate-200 dark:hover:border-slate-600",
        "hover:bg-white dark:hover:bg-slate-800/50",
        "hover:shadow-sm",
        isHidden && "opacity-60"
      )}
    >
      {/* Field type icon */}
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300",
                "bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-600 dark:text-fuchsia-400",
                isHidden && "grayscale opacity-50"
              )}
            >
              <TypeIcon className="w-4 h-4" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {getFieldTypeName(field.type)}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Field info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-sm font-medium truncate transition-colors",
              isHidden
                ? "text-slate-400 dark:text-slate-500"
                : "text-slate-700 dark:text-slate-200"
            )}
          >
            {field.label}
          </span>
        </div>
        {field.help && (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-xs text-slate-400 dark:text-slate-500 truncate cursor-help">
                  {field.help}
                </p>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs">
                {field.help}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <code
          className={cn(
            "text-[10px] font-mono px-1.5 py-0.5 rounded mt-1 inline-block transition-colors",
            isHidden
              ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600"
              : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
          )}
        >
          {field.key}
        </code>
      </div>

      {/* Visibility toggle */}
      <div className="flex items-center gap-2 shrink-0">
        {isHidden && (
          <Badge
            variant="secondary"
            className="hidden sm:flex bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px] px-1.5 py-0.5"
          >
            <EyeOff className="w-3 h-3 me-1" />
            {__("Hidden", "whizmanage")}
          </Badge>
        )}
        <Switch
          checked={!isHidden}
          onCheckedChange={onToggle}
          className="data-[state=checked]:bg-fuchsia-600"
        />
      </div>
    </div>
  );
}

// Source group component
function SourceGroup({
  source,
  fields,
  hiddenFields,
  onToggleField,
  onShowAll,
  onHideAll,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const config = SOURCE_CONFIG[source] || SOURCE_CONFIG.ACF;
  const Icon = config.icon;

  const visibleCount = useMemo(() => {
    return fields.filter((f) => !hiddenFields.includes(f.key)).length;
  }, [fields, hiddenFields]);

  const hiddenCount = fields.length - visibleCount;
  const allHidden = hiddenCount === fields.length;
  const allVisible = visibleCount === fields.length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="group/source">
      <div
        className={cn(
          "rounded-2xl border transition-all duration-300 overflow-hidden",
          "border-slate-200 dark:border-slate-700",
          isOpen ? "shadow-md" : "shadow-sm hover:shadow-md"
        )}
      >
        {/* Source header */}
        <CollapsibleTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-3 p-4 cursor-pointer transition-all duration-300",
              "bg-slate-50 dark:bg-slate-800/50",
              "hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            {/* Source icon with brand gradient background */}
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-fuchsia-500 to-purple-600 shadow-lg">
              <Icon className="w-5 h-5 text-white" />
            </div>

            {/* Source info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm sm:text-base text-slate-800 dark:text-slate-200">
                {config.label}
              </h4>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {fields.length} {__("fields", "whizmanage")}
                </span>
                {hiddenCount > 0 && (
                  <>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <EyeOff className="w-3 h-3" />
                      {hiddenCount} {__("hidden", "whizmanage")}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Stats badge */}
            <div className="hidden sm:flex items-center gap-2">
              <Badge
                variant="secondary"
                className="text-xs px-2 py-1 bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-700 dark:text-fuchsia-300"
              >
                <Eye className="w-3 h-3 me-1" />
                {visibleCount}/{fields.length}
              </Badge>
            </div>

            {/* Chevron */}
            <div
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300",
                "bg-white/50 dark:bg-slate-700/50",
                isOpen && "rotate-90"
              )}
            >
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        </CollapsibleTrigger>

        {/* Fields list */}
        <CollapsibleContent>
          <div className="bg-slate-50/50 dark:bg-slate-900/30">
            {/* Bulk actions */}
            <div className="flex items-center justify-end gap-2 px-4 py-2 border-b border-slate-200/50 dark:border-slate-700/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={onShowAll}
                disabled={allVisible}
                className={cn(
                  "text-xs h-7 px-2",
                  "text-slate-500 hover:text-fuchsia-600 dark:text-slate-400 dark:hover:text-fuchsia-400",
                  "disabled:opacity-40"
                )}
              >
                <Eye className="w-3 h-3 me-1" />
                {__("Show All", "whizmanage")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onHideAll}
                disabled={allHidden}
                className={cn(
                  "text-xs h-7 px-2",
                  "text-slate-500 hover:text-fuchsia-600 dark:text-slate-400 dark:hover:text-fuchsia-400",
                  "disabled:opacity-40"
                )}
              >
                <EyeOff className="w-3 h-3 me-1" />
                {__("Hide All", "whizmanage")}
              </Button>
            </div>

            {/* Fields grid */}
            <div className="p-3 grid grid-cols-1 lg:grid-cols-2 gap-1">
              {fields.map((field) => (
                <FieldItem
                  key={field.key}
                  field={field}
                  isHidden={hiddenFields.includes(field.key)}
                  onToggle={() => onToggleField(field.key)}
                />
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// Empty state component
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center mb-4 shadow-lg">
        <Puzzle className="w-8 h-8 text-slate-400 dark:text-slate-500" />
      </div>
      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">
        {__("No Custom Fields Found", "whizmanage")}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
        {__(
          "Custom fields can be added using plugins like Advanced Custom Fields (ACF), JetEngine, or Yoast SEO. Once configured, they will appear here for visibility management.",
          "whizmanage"
        )}
      </p>
    </div>
  );
}

// Main component
export default function CustomFieldsVisibilitySettings({ settings, onUpdate }) {
  const [customFields, setCustomFields] = useState([]);

  // Load custom fields from window object
  useEffect(() => {
    const loadFields = () => {
      if (window?.WhizManageCustomFields) {
        const fields = Array.isArray(window.WhizManageCustomFields)
          ? window.WhizManageCustomFields
          : [];
        // Filter out unsupported types
        const filtered = fields.filter(
          (field) =>
            field && typeof field === "object" && field.type !== "multi-select"
        );
        setCustomFields(filtered);
      }
    };

    loadFields();
    // Re-check after a short delay in case of late loading
    const timer = setTimeout(loadFields, 500);
    return () => clearTimeout(timer);
  }, []);

  // Parse hidden custom fields from settings
  const hiddenFields = useMemo(() => {
    const stored = settings?.whizmanage_hidden_custom_fields;
    if (!stored) return [];
    if (typeof stored === "string") {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
    return Array.isArray(stored) ? stored : [];
  }, [settings?.whizmanage_hidden_custom_fields]);

  // Group fields by source
  const groupedFields = useMemo(() => {
    const groups = {};
    customFields.forEach((field) => {
      const source = field.source || "Other";
      if (!groups[source]) {
        groups[source] = [];
      }
      groups[source].push(field);
    });
    return groups;
  }, [customFields]);

  // Calculate totals
  const stats = useMemo(() => {
    const total = customFields.length;
    const hidden = hiddenFields.length;
    const visible = total - hidden;
    return { total, hidden, visible };
  }, [customFields, hiddenFields]);

  // Toggle single field
  const handleToggleField = useCallback(
    (fieldKey) => {
      const current = [...hiddenFields];
      const idx = current.indexOf(fieldKey);

      if (idx === -1) {
        current.push(fieldKey);
      } else {
        current.splice(idx, 1);
      }

      onUpdate("whizmanage_hidden_custom_fields", JSON.stringify(current));
    },
    [hiddenFields, onUpdate]
  );

  // Show all fields in a source
  const handleShowAllInSource = useCallback(
    (source) => {
      const sourceFields = groupedFields[source] || [];
      const sourceKeys = sourceFields.map((f) => f.key);
      const current = hiddenFields.filter((key) => !sourceKeys.includes(key));
      onUpdate("whizmanage_hidden_custom_fields", JSON.stringify(current));
    },
    [groupedFields, hiddenFields, onUpdate]
  );

  // Hide all fields in a source
  const handleHideAllInSource = useCallback(
    (source) => {
      const sourceFields = groupedFields[source] || [];
      const sourceKeys = sourceFields.map((f) => f.key);
      const current = [...new Set([...hiddenFields, ...sourceKeys])];
      onUpdate("whizmanage_hidden_custom_fields", JSON.stringify(current));
    },
    [groupedFields, hiddenFields, onUpdate]
  );

  // Reset all to visible
  const handleResetAll = useCallback(() => {
    onUpdate("whizmanage_hidden_custom_fields", JSON.stringify([]));
  }, [onUpdate]);

  // Check if we have any fields
  const hasFields = customFields.length > 0;
  const sourceOrder = ["ACF", "JetEngine", "Yoast SEO"];

  return (
    <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 overflow-hidden">
      <SettingsCardHeader
        icon={Sparkles}
        title={__("Custom Fields Visibility", "whizmanage")}
        description={__(
          "Control which custom fields appear in the product form. Fields from ACF, JetEngine, and Yoast SEO are automatically detected.",
          "whizmanage"
        )}
      >
        {stats.hidden > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetAll}
            className="dark:bg-slate-700 dark:hover:bg-slate-600 shrink-0"
          >
            <RotateCcw className="w-4 h-4 sm:me-2" />
            <span className="hidden sm:inline">{__("Show All", "whizmanage")}</span>
          </Button>
        )}
      </SettingsCardHeader>

      <CardContent className="pt-0">
        {/* Source groups */}
        {hasFields ? (
          <div className="space-y-4">
            {sourceOrder.map(
              (source) =>
                groupedFields[source] && (
                  <SourceGroup
                    key={source}
                    source={source}
                    fields={groupedFields[source]}
                    hiddenFields={hiddenFields}
                    onToggleField={handleToggleField}
                    onShowAll={() => handleShowAllInSource(source)}
                    onHideAll={() => handleHideAllInSource(source)}
                  />
                )
            )}
            {/* Handle any other sources not in the predefined order */}
            {Object.keys(groupedFields)
              .filter((source) => !sourceOrder.includes(source))
              .map((source) => (
                <SourceGroup
                  key={source}
                  source={source}
                  fields={groupedFields[source]}
                  hiddenFields={hiddenFields}
                  onToggleField={handleToggleField}
                  onShowAll={() => handleShowAllInSource(source)}
                  onHideAll={() => handleHideAllInSource(source)}
                />
              ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </CardContent>
    </Card>
  );
}
