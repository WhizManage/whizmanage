// src/components/settings/tabs/shipping/ShippingMethodRow.jsx

import { forwardRef } from "react";
import { __ } from "@wordpress/i18n";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Truck, Gift, Store, Pencil, Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

const METHOD_ICONS = {
  flat_rate: Truck,
  free_shipping: Gift,
  local_pickup: Store,
};

const METHOD_COLORS = {
  flat_rate: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
  free_shipping: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
  local_pickup: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
};

function ShippingMethodRow({
  method,
  onEdit,
  onDelete,
  onToggle,
  isSaving,
  isDraggable = true,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: method.instance_id });
  const Icon = METHOD_ICONS[method.method_id] || Truck;
  const colorClass = METHOD_COLORS[method.method_id] || "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400";

  // Format settings preview
  const getSettingsPreview = () => {
    const { settings, method_id } = method;

    switch (method_id) {
      case "flat_rate":
        if (settings.cost) {
          return `${__("Cost", "whizmanage")}: ${settings.cost}`;
        }
        return null;

      case "free_shipping":
        if (settings.min_amount) {
          return `${__("Min. order", "whizmanage")}: ${settings.min_amount}`;
        }
        if (settings.requires === "coupon") {
          return __("Requires coupon", "whizmanage");
        }
        return null;

      case "local_pickup":
        if (settings.cost) {
          return `${__("Cost", "whizmanage")}: ${settings.cost}`;
        }
        return __("Free", "whizmanage");

      default:
        return null;
    }
  };

  const settingsPreview = getSettingsPreview();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-600",
        isDragging && "opacity-50 shadow-lg z-50"
      )}
    >
      {/* Drag Handle */}
      {isDraggable && (
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-5 h-5" />
        </button>
      )}

      {/* Method Icon */}
      <div className={`p-2 rounded-lg ${colorClass}`}>
        <Icon className="w-4 h-4" />
      </div>

      {/* Method Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
            {method.title}
          </span>
          {!method.enabled && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
              {__("Disabled", "whizmanage")}
            </span>
          )}
        </div>
        {settingsPreview && (
          <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
            {settingsPreview}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Enable/Disable Toggle */}
        <Switch
          checked={method.enabled}
          onCheckedChange={onToggle}
          disabled={isSaving}
        />

        {/* Edit Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          disabled={isSaving}
          className="h-8 w-8"
        >
          <Pencil className="w-4 h-4" />
        </Button>

        {/* Delete Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          disabled={isSaving}
          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default ShippingMethodRow;
