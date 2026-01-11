// src/components/pages/table/products/components/DownloadableCell.jsx
import { cn } from "@/lib/utils";
import MediaPicker from "@components/media/MediaPicker";
import Button from "@components/ui/button";
import { IconBadge } from "@components/ui/custom/IconBadge";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import CustomTooltip from "@components/ui/nextUI/Tooltip";
import { Popover, PopoverContent, PopoverTrigger, Switch } from "@heroui/react";
import { Download, FileDown, Link, Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const DownloadableCell = ({
  value,
  onChange,
  onFinish,
  onCancel,
  onUpdate,
  isLoading,
  error,
  inputRef,
  cellRef,
  editOptions,
  row,
  column,
  table,
  __
}) => {
  const isRTL = window?.document?.documentElement?.dir === "rtl";

  const store = table?.options?.meta?.store;
  const containerRef = useRef(null);

  const [isDownloadable, setIsDownloadable] = useState(
    row.original.downloadable === true
  );
  const [downloads, setDownloads] = useState(
    row.original.downloads?.length
      ? row.original.downloads
      : [{ name: "", file: "" }]
  );
  const [downloadExpiry, setDownloadExpiry] = useState(
    row.original.download_expiry ?? -1
  );
  const [downloadLimit, setDownloadLimit] = useState(
    row.original.download_limit ?? -1
  );

  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [currentEditIndex, setCurrentEditIndex] = useState(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const isReturningFromMediaPicker = useRef(false);

  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    setIsDownloadable(row.original.downloadable === true);
  }, [row.original.downloadable]);

  useEffect(() => {
    if (isPopoverOpen) {
      // אם חוזרים מה-MediaPicker, לא לאפס את ה-downloads
      if (isReturningFromMediaPicker.current) {
        isReturningFromMediaPicker.current = false;
        return;
      }
      setDownloads(
        row.original.downloads?.length
          ? row.original.downloads
          : [{ name: "", file: "" }]
      );
      setDownloadExpiry(row.original.download_expiry ?? -1);
      setDownloadLimit(row.original.download_limit ?? -1);
      setValidationErrors({});
      setSaveError(null);
    }
  }, [
    isPopoverOpen,
    row.original.downloads,
    row.original.download_expiry,
    row.original.download_limit,
  ]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isPopoverOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onCancel?.();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isPopoverOpen, onCancel]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isPopoverOpen) return;
      if (isMediaPickerOpen) return;
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onFinish?.();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isPopoverOpen, isMediaPickerOpen, onFinish]);

  const handleToggleDownloadable = async (newValue) => {
    const prevValue = isDownloadable;
    setIsDownloadable(newValue);
    try {
      if (onUpdate) {
        await onUpdate(row.original.id, "downloadable", newValue, row.original);
      }
    } catch (error) {
      console.error("Failed to update downloadable:", error);
      setIsDownloadable(prevValue);
    }
  };

  const handleInputChange = (index, field, value) => {
    const newDownloads = [...downloads];
    newDownloads[index][field] = value;
    setDownloads(newDownloads);
    if (validationErrors[index]) {
      const newErrors = { ...validationErrors };
      delete newErrors[index];
      setValidationErrors(newErrors);
    }
    setSaveError(null);
  };

  const validateDownloads = () => {
    const errors = {};
    let isValid = true;
    downloads.forEach((item, index) => {
      if (!item.name && !item.file) return;
      const itemErrors = {};
      if (!item.name || !item.name.trim()) {
        itemErrors.name = __("Name is required", "whizmanage");
        isValid = false;
      }
      if (!item.file || !item.file.trim()) {
        itemErrors.file = __("File URL is required", "whizmanage");
        isValid = false;
      } else if (
        !item.file.startsWith("http://") &&
        !item.file.startsWith("https://")
      ) {
        itemErrors.file = __("URL must start with http:// or https://", "whizmanage");
        isValid = false;
      }
      if (Object.keys(itemErrors).length > 0) {
        errors[index] = itemErrors;
      }
    });
    setValidationErrors(errors);
    return isValid;
  };

  const handleSaveAllFields = async () => {
    if (!validateDownloads()) return;

    setIsSaving(true);
    setSaveError(null);
    setIsPopoverOpen(false);
    onFinish?.();

    try {
      if (!onUpdate) return;

      const cleanDownloads = downloads.filter((item) => item.name && item.file);
      const formattedDownloads = cleanDownloads.map((item, index) => ({
        id: item.id || `download_${Date.now()}_${index}`,
        name: item.name.trim(),
        file: item.file.trim(),
      }));

      // שליחת כל השדות בבקשה אחת
      const batchPayload = {
        downloads: formattedDownloads,
        download_expiry: downloadExpiry,
        download_limit: downloadLimit,
      };

      await onUpdate(
        row.original.id,
        "downloadable_settings",
        batchPayload,
        row.original
      );
    } catch (error) {
      console.error("❌ Unexpected error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddFile = () => {
    setDownloads([...downloads, { name: "", file: "" }]);
  };

  const handleDeleteFile = (index) => {
    let newDownloads = downloads.filter((_, i) => i !== index);
    if (newDownloads.length === 0) {
      newDownloads = [{ name: "", file: "" }];
    }
    setDownloads(newDownloads);
    if (validationErrors[index]) {
      const newErrors = { ...validationErrors };
      delete newErrors[index];
      setValidationErrors(newErrors);
    }
  };

  const handleExpiryChange = (value) => {
    const numValue = value === "" ? -1 : parseInt(value, 10);
    setDownloadExpiry(numValue);
  };

  const handleLimitChange = (value) => {
    const numValue = value === "" ? -1 : parseInt(value, 10);
    setDownloadLimit(numValue);
  };

  const handleOpenMediaPicker = (index) => {
    setCurrentEditIndex(index);
    setIsPopoverOpen(false); // סוגר את הפופאובר כדי שהמדיה פיקר יוצג מעליו
    setIsMediaPickerOpen(true);
  };

  const handleFileSelected = (selectedFile) => {
    if (selectedFile && currentEditIndex !== null) {
      handleInputChange(currentEditIndex, "file", selectedFile.src);
      handleInputChange(currentEditIndex, "name", selectedFile.name);
    }
    setIsMediaPickerOpen(false);
    setCurrentEditIndex(null);
    isReturningFromMediaPicker.current = true; // מסמן שחוזרים מ-MediaPicker
    setIsPopoverOpen(true); // פותח מחדש את הפופאובר אחרי בחירת קובץ
  };

  const handleCancelPopover = () => {
    setDownloads(row.original.downloads || [{ name: "", file: "" }]);
    setDownloadExpiry(row.original.download_expiry ?? -1);
    setDownloadLimit(row.original.download_limit ?? -1);
    setValidationErrors({});
    setSaveError(null);
    setIsPopoverOpen(false);
  };

  const filesCount = row.original.downloads?.filter((d) => d.file)?.length || 0;

  return (
    <div
      ref={containerRef}
      className="flex gap-2 items-center h-full w-full px-2"
    >
      {/* Toggle */}
      <Switch
        size="sm"
        isSelected={isDownloadable}
        onValueChange={handleToggleDownloadable}
        aria-label={
          isDownloadable
            ? __("Downloadable", "whizmanage")
            : __("Not downloadable", "whizmanage")
        }
        color="primary"
        classNames={{
          base: "inline-flex [&_input]:hidden [&_input[type=checkbox]]:hidden",
          wrapper: "p-0 h-5 overflow-visible dark:bg-slate-500",
          thumb: cn(
            "w-5 h-5 shadow-lg",
            isRTL
              ? "group-data-[selected=true]:mr-5"
              : "group-data-[selected=true]:ml-5"
          ),
        }}
      />
      {/* Files Button */}
      {isDownloadable && (
        <Popover
          placement="bottom"
          showArrow
          backdrop="transparent"
          isOpen={isPopoverOpen}
          size="lg"
          onOpenChange={setIsPopoverOpen}
          shouldCloseOnInteractOutside={(element) => {
            const isModalElement = element.closest('[role="dialog"]');
            const isBackdrop =
              element.hasAttribute("data-slot") &&
              element.getAttribute("data-slot") === "backdrop";
            const isInModalPortal = element.closest('[data-slot="wrapper"]');
            if (isModalElement || isBackdrop || isInModalPortal) {
              return false;
            }
            return true;
          }}
        >
          <PopoverTrigger>
            <div>
              <CustomTooltip title={__("Downloadable files", "whizmanage")}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1 h-7 px-2"
                >
                  <FileDown className="!size-4" />
                  {filesCount > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {filesCount}
                    </span>
                  )}
                </Button>
              </CustomTooltip>
            </div>
          </PopoverTrigger>

          <PopoverContent className="w-full max-w-5xl p-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg z-[9000]">
            {/* Header */}
            <div className="px-2 py-4 border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <IconBadge icon={Download} variant="default" size="default" />
                <div>
                  <h4 className="font-semibold text-sm">
                    {__("Downloadable files", "whizmanage")}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {__("Manage download files and settings", "whizmanage")}
                  </p>
                </div>
              </div>
            </div>

            {/* Settings */}
            <div className="w-full px-2 py-4">
              <div className="!w-full grid grid-cols-2 gap-4 p-4 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="space-y-2">
                  <Label
                    htmlFor="download-expiry"
                    className="text-sm font-medium"
                  >
                    {__("Download Expiry (days)", "whizmanage")}
                  </Label>
                  <Input
                    id="download-expiry"
                    type="number"
                    min="-1"
                    value={downloadExpiry === -1 ? "" : downloadExpiry}
                    onChange={(e) => handleExpiryChange(e.target.value)}
                    placeholder={__("Unlimited", "whizmanage")}
                    className="h-9"
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="download-limit"
                    className="text-sm font-medium"
                  >
                    {__("Download Limit", "whizmanage")}
                  </Label>
                  <Input
                    id="download-limit"
                    type="number"
                    min="-1"
                    value={downloadLimit === -1 ? "" : downloadLimit}
                    onChange={(e) => handleLimitChange(e.target.value)}
                    placeholder={__("Unlimited", "whizmanage")}
                    className="h-9"
                    disabled={isSaving}
                  />
                </div>
              </div>
            </div>

            {/* Files List */}
            <div className="px-2 pb-4 space-y-3 max-h-80 overflow-y-auto scrollbar-whiz">
              {downloads.map((item, index) => (
                <div
                  key={index}
                  className={cn(
                    "p-4 w-full rounded-lg border transition-all",
                    validationErrors[index]
                      ? "border-red-300 dark:border-red-700"
                      : "border-slate-200 dark:border-slate-700"
                  )}
                >
                  {/* Header - Icon + File Number */}
                  <div className="flex items-center gap-2 mb-3">
                    <IconBadge icon={FileDown} variant="default" size="sm" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {__("File", "whizmanage")} {index + 1}
                    </span>
                  </div>

                  {/* Inputs Row */}
                  <div className="flex items-center gap-3">
                    {/* Name Input */}
                    <div className="flex items-center gap-2 flex-1">
                      <Label className="text-sm text-muted-foreground whitespace-nowrap">
                        {__("Name", "whizmanage")}:
                      </Label>
                      <Input
                        value={item.name}
                        onChange={(e) =>
                          handleInputChange(index, "name", e.target.value)
                        }
                        placeholder={__("File name", "whizmanage")}
                        className={cn(
                          "h-9 flex-1",
                          validationErrors[index]?.name && "border-red-500"
                        )}
                        disabled={isSaving}
                      />
                    </div>

                    {/* URL Input */}
                    <div className="flex items-center gap-2 flex-1">
                      <Label className="text-sm text-muted-foreground whitespace-nowrap">
                        {__("URL", "whizmanage")}:
                      </Label>
                      <Input
                        value={item.file}
                        onChange={(e) =>
                          handleInputChange(index, "file", e.target.value)
                        }
                        placeholder="https://..."
                        className={cn(
                          "h-9 flex-1",
                          validationErrors[index]?.file && "border-red-500"
                        )}
                        disabled={isSaving}
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <CustomTooltip title={__("Choose from media", "whizmanage")}>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="!size-9 shrink-0"
                          onClick={() => handleOpenMediaPicker(index)}
                          disabled={isSaving}
                        >
                          <Link className="!size-4" />
                        </Button>
                      </CustomTooltip>

                      <CustomTooltip title={__("Delete file", "whizmanage")}>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="!size-9 shrink-0"
                          onClick={() => handleDeleteFile(index)}
                          disabled={isSaving}
                        >
                          <Trash2 className="!size-4" />
                        </Button>
                      </CustomTooltip>
                    </div>
                  </div>

                  {/* Validation Errors */}
                  {(validationErrors[index]?.name ||
                    validationErrors[index]?.file) && (
                      <div className="flex gap-4 mt-2 ps-16">
                        {validationErrors[index]?.name && (
                          <span className="text-xs text-red-500 flex-1">
                            {validationErrors[index].name}
                          </span>
                        )}
                        {validationErrors[index]?.file && (
                          <span className="text-xs text-red-500 flex-1">
                            {validationErrors[index].file}
                          </span>
                        )}
                      </div>
                    )}
                </div>
              ))}
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
            <div className="w-full px-5 py-4 border-slate-200 dark:border-slate-700 flex justify-between">
              <Button
                variant="gradient"
                className="gap-2 h-9"
                onClick={handleAddFile}
                disabled={isSaving}
              >
                <Plus className="w-4 h-4" />
                {__("Add file", "whizmanage")}
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="h-9"
                  onClick={handleCancelPopover}
                  disabled={isSaving}
                >
                  {__("Cancel", "whizmanage")}
                </Button>

                <Button
                  className="h-9 gap-2"
                  onClick={handleSaveAllFields}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
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
      )}
      {isMediaPickerOpen && (
        <MediaPicker
          value={null}
          onChange={handleFileSelected}
          onClose={() => {
            setIsMediaPickerOpen(false);
            setCurrentEditIndex(null);
            isReturningFromMediaPicker.current = true; // מסמן שחוזרים מ-MediaPicker
            setIsPopoverOpen(true); // פותח מחדש את הפופאובר אחרי סגירת המדיה פיקר
          }}
          multiple={false}
          title={__("Select File", "whizmanage")}
          mediaType="all"
          autoOpen={true}
        />
      )}
    </div>
  );
};

export default DownloadableCell;
