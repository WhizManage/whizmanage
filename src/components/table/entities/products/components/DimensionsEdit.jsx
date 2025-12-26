// src/components/pages/table/products/components/DimensionsEdit.jsx
import Button from "@components/ui/button";
import { IconBadge } from "@components/ui/custom/IconBadge";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/ui/popover-portal";
import { Loader2, Ruler } from "lucide-react";
import { useState } from "react";

const DimensionsEdit = ({
  row,
  onDirectUpdate,
  onFinish,
  onCancel,
  table,
  __
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const dimensionUnit =
    typeof window !== "undefined" && window.dimensionUnit
      ? window.dimensionUnit
      : "cm";

  const [length, setLength] = useState(row.original.dimensions?.length || "");
  const [width, setWidth] = useState(row.original.dimensions?.width || "");
  const [height, setHeight] = useState(row.original.dimensions?.height || "");

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const dimensions = {
        length: length.trim(),
        width: width.trim(),
        height: height.trim(),
      };

      await onDirectUpdate(dimensions, "dimensions");
      onFinish();
    } catch (error) {
      console.error("Failed to save dimensions:", error);

      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        __("Failed to save dimensions", "whizmanage");

      setSaveError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const cleanValue = (v) => {
    const num = parseFloat(v);
    if (Number.isNaN(num)) return v;
    return Math.round(num);
  };

  const dimensionParts = [];
  if (length) dimensionParts.push(`L:${cleanValue(length)}`);
  if (width) dimensionParts.push(`W:${cleanValue(width)}`);
  if (height) dimensionParts.push(`H:${cleanValue(height)}`);

  const displayText =
    dimensionParts.length > 0 ? dimensionParts.join(" × ") : "-";

  return (
    <div className="flex items-center h-full w-full px-2">
      <Popover
        placement="bottom"
        showArrow
        backdrop="transparent"
        defaultOpen={true}
        onOpenChange={(open) => {
          if (!open) {
            onCancel();
          }
        }}
      >
        <PopoverTrigger>
          <button className="flex items-center gap-2 h-8 text-muted-foreground hover:text-foreground transition-colors outline-none">
            <Ruler className="w-4 h-4" />
            <span className="font-medium">
              {displayText}
              {dimensionParts.length > 0 && (
                <span className="text-xs ms-1 opacity-70">{dimensionUnit}</span>
              )}
            </span>
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-96 p-0 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 shadow-lg">
          <div className="grid gap-0">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <IconBadge icon={Ruler} variant="default" size="default" />
                <div>
                  <h4 className="font-semibold text-sm">{__("Dimensions", "whizmanage")}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {__("Set the product dimensions", "whizmanage")} ({dimensionUnit})
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="px-5 py-4 space-y-4">
              <div className="flex items-center gap-3">
                <Label htmlFor="length" className="w-16 text-sm font-medium">
                  {__("Length", "whizmanage")}
                </Label>
                <Input
                  id="length"
                  type="number"
                  min="0"
                  step="0.01"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  placeholder="0"
                  className="flex-1 h-9"
                  disabled={isSaving}
                  autoFocus
                />
              </div>

              <div className="flex items-center gap-3">
                <Label htmlFor="width" className="w-16 text-sm font-medium">
                  {__("Width", "whizmanage")}
                </Label>
                <Input
                  id="width"
                  type="number"
                  min="0"
                  step="0.01"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  placeholder="0"
                  className="flex-1 h-9"
                  disabled={isSaving}
                />
              </div>

              <div className="flex items-center gap-3">
                <Label htmlFor="height" className="w-16 text-sm font-medium">
                  {__("Height", "whizmanage")}
                </Label>
                <Input
                  id="height"
                  type="number"
                  min="0"
                  step="0.01"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="0"
                  className="flex-1 h-9"
                  disabled={isSaving}
                />
              </div>
            </div>

            {/* Error Message */}
            {saveError && (
              <div className="px-5 pb-4">
                <div className="px-3 py-2.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {saveError}
                  </p>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={isSaving}
                className="h-9"
              >
                {__("Cancel", "whizmanage")}
              </Button>

              <Button onClick={handleSave} disabled={isSaving} className="h-9">
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin me-2" />
                    {__("Saving...", "whizmanage")}
                  </>
                ) : (
                  __("Save", "whizmanage")
                )}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DimensionsEdit;
