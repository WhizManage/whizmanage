// src/components/forms/core/fields/DownloadableInput.jsx

import MediaPicker from "@components/media/MediaPicker";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import CustomTooltip from "@components/ui/nextUI/Tooltip";
import {
  cn,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Switch,
} from "@heroui/react";
import { Link, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller } from "react-hook-form";
 import { __ } from "@wordpress/i18n";
import { useGenericForm } from "../FormProvider";

export default function DownloadableInput({
  name = "downloadable",
  label = "Downloadable product",
  downloadsField = "downloads",
  expiryField = "download_expiry",
  limitField = "download_limit",
  virtualField = "virtual", // שדה נוסף שמסונכרן עם downloadable
  rules,
}) {
   
  const { control, watch, setValue } = useGenericForm();
  const isRTL = window?.document?.documentElement?.dir === "rtl";


  const isDownloadable = watch(name) === true;
  const currentDownloads = watch(downloadsField) || [{ name: "", file: "" }];
  const currentExpiry = watch(expiryField) ?? -1;
  const currentLimit = watch(limitField) ?? -1;

  const [downloads, setDownloads] = useState(currentDownloads);
  const [downloadExpiry, setDownloadExpiry] = useState(currentExpiry);
  const [downloadLimit, setDownloadLimit] = useState(currentLimit);

  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [currentEditIndex, setCurrentEditIndex] = useState(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // סנכרון כשפותחים את הפופאפ
  useEffect(() => {
    if (isPopoverOpen) {
      setDownloads(
        currentDownloads.length > 0
          ? currentDownloads
          : [{ name: "", file: "" }]
      );
      setDownloadExpiry(currentExpiry);
      setDownloadLimit(currentLimit);
      setValidationErrors({});
    }
  }, [isPopoverOpen, currentDownloads, currentExpiry, currentLimit]);

  const handleToggleDownloadable = (newValue) => {
    setValue(name, newValue, { shouldValidate: true, shouldDirty: true });

    // סנכרון virtual field
    if (virtualField) {
      setValue(virtualField, newValue, {
        shouldValidate: true,
        shouldDirty: true,
      });
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

  const handleSaveAllFields = () => {
    if (!validateDownloads()) {
      return;
    }

    const cleanDownloads = downloads.filter((item) => item.name && item.file);

    const formattedDownloads = cleanDownloads.map((item, index) => ({
      id: item.id || `download_${Date.now()}_${index}`,
      name: item.name.trim(),
      file: item.file.trim(),
    }));

    // שמירה לטופס
    setValue(downloadsField, formattedDownloads, {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue(expiryField, downloadExpiry, {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue(limitField, downloadLimit, {
      shouldValidate: true,
      shouldDirty: true,
    });

    setIsPopoverOpen(false);
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
    setIsMediaPickerOpen(true);
  };

  const handleFileSelected = (selectedFile) => {
    if (selectedFile && currentEditIndex !== null) {
      handleInputChange(currentEditIndex, "file", selectedFile.src);
      handleInputChange(currentEditIndex, "name", selectedFile.name);
    }
    setIsMediaPickerOpen(false);
    setCurrentEditIndex(null);
  };

  const handleCancelPopover = () => {
    setDownloads(
      currentDownloads.length > 0 ? currentDownloads : [{ name: "", file: "" }]
    );
    setDownloadExpiry(currentExpiry);
    setDownloadLimit(currentLimit);
    setValidationErrors({});
    setIsPopoverOpen(false);
  };

  return (
    <div className="flex flex-col w-full gap-3 px-2">
      {label && (
        <Label className="flex items-center gap-2">
          <Link className="h-4 w-4 text-muted-foreground" />
          {__(label, "whizmanage")}
        </Label>
      )}
      <Controller
        name={name}
        control={control}
        rules={rules}
        render={({ field, fieldState: { error } }) => (
          <>
            <div className="flex gap-2 items-center">
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-1 rounded-lg border h-10 cursor-pointer select-none transition-all",
                  field.value
                    ? "border-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-950/20"
                    : "border-input bg-background dark:bg-slate-700"
                )}
                onClick={() => handleToggleDownloadable(!field.value)}
              >
                <Switch
                  size="sm"
                  isSelected={field.value}
                  onValueChange={handleToggleDownloadable}
                  aria-label={
                    field.value ? __("Downloadable", "whizmanage") : __("Not downloadable", "whizmanage")
                  }
                  color="primary"
                  className="pointer-events-none"
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
                <span className="text-sm">
                  {field.value ? __("Downloadable", "whizmanage") : __("Not downloadable", "whizmanage")}
                </span>
              </div>

              {field.value && (
                <Popover
                  placement="bottom"
                  showArrow
                  backdrop="transparent"
                  isOpen={isPopoverOpen}
                  onOpenChange={setIsPopoverOpen}
                >
                  <CustomTooltip title={__("Downloadable files", "whizmanage")}>
                    <PopoverTrigger>
                      <Button
                        className="flex gap-2 capitalize h-10"
                        variant="outline"
                        size="icon"
                        type="button"
                      >
                        <Link className="w-5 h-5" />
                      </Button>
                    </PopoverTrigger>
                  </CustomTooltip>

                  <PopoverContent className="w-auto max-w-4xl p-4 dark:bg-slate-800 bg-white border-slate-200 dark:border-slate-700">
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <h4 className="font-medium leading-none text-center dark:text-slate-200">
                          {__("Downloadable files", "whizmanage")}
                        </h4>
                      </div>

                      <div className="flex flex-col gap-4 px-4 text-muted-foreground">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="download-expiry">
                              {__("Download Expiry (days)", "whizmanage")}
                            </Label>
                            <Input
                              id="download-expiry"
                              type="number"
                              min="-1"
                              value={
                                downloadExpiry === -1 ? "" : downloadExpiry
                              }
                              onChange={(e) =>
                                handleExpiryChange(e.target.value)
                              }
                              placeholder={__("Unlimited", "whizmanage")}
                              className="flex-1 h-10 !rounded-lg"
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="download-limit">
                              {__("Download Limit", "whizmanage")}
                            </Label>
                            <Input
                              id="download-limit"
                              type="number"
                              min="-1"
                              value={downloadLimit === -1 ? "" : downloadLimit}
                              onChange={(e) =>
                                handleLimitChange(e.target.value)
                              }
                              placeholder={__("Unlimited", "whizmanage")}
                              className="flex-1 h-10 !rounded-lg"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col divide-y-1 border border-slate-200 dark:border-slate-600 divide-slate-200 dark:divide-slate-600 rounded-md gap-4 p-4 pt-0 text-muted-foreground">
                        {downloads.map((item, index) => (
                          <div
                            className="grid grid-cols-5 gap-4 w-[800px] pt-4"
                            key={index}
                          >
                            <div className="flex col-span-2 flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <Label htmlFor={`name-${index}`}>
                                  {__("Name", "whizmanage")}:
                                </Label>
                                <Input
                                  id={`name-${index}`}
                                  value={item.name}
                                  onChange={(e) =>
                                    handleInputChange(
                                      index,
                                      "name",
                                      e.target.value
                                    )
                                  }
                                  className={cn(
                                    "flex-1 h-10 !rounded-lg",
                                    validationErrors[index]?.name &&
                                      "border-red-500"
                                  )}
                                />
                              </div>
                              {validationErrors[index]?.name && (
                                <span className="text-xs text-red-500 px-2">
                                  {validationErrors[index].name}
                                </span>
                              )}
                            </div>

                            <div className="flex col-span-2 flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <Label htmlFor={`file-url-${index}`}>
                                  {__("File URL:", "whizmanage")}
                                </Label>
                                <Input
                                  id={`file-url-${index}`}
                                  value={item.file}
                                  onChange={(e) =>
                                    handleInputChange(
                                      index,
                                      "file",
                                      e.target.value
                                    )
                                  }
                                  placeholder="https://example.com/file.pdf"
                                  className={cn(
                                    "flex-1 h-10 !rounded-lg",
                                    validationErrors[index]?.file &&
                                      "border-red-500"
                                  )}
                                />
                              </div>
                              {validationErrors[index]?.file && (
                                <span className="text-xs text-red-500 px-2">
                                  {validationErrors[index].file}
                                </span>
                              )}
                            </div>

                            <div className="flex gap-2 items-center">
                              <Button
                                variant="outline"
                                className="h-10"
                                onClick={() => handleOpenMediaPicker(index)}
                                type="button"
                              >
                                {__("Choose file", "whizmanage")}
                              </Button>
                              <CustomTooltip title={__("Delete file", "whizmanage")}>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="size-10"
                                  onClick={() => handleDeleteFile(index)}
                                  type="button"
                                >
                                  <X />
                                </Button>
                              </CustomTooltip>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="w-full flex justify-between px-4 pb-2">
                        <Button
                          className="gap-2"
                          onClick={handleAddFile}
                          type="button"
                        >
                          <Plus />
                          {__("Add file", "whizmanage")}
                        </Button>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={handleCancelPopover}
                            type="button"
                          >
                            {__("Cancel", "whizmanage")}
                          </Button>

                          <Button
                            className="gap-2"
                            onClick={handleSaveAllFields}
                            type="button"
                          >
                            {__("Save", "whizmanage")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {error && (
              <p className="text-red-500 dark:text-pink-500 text-sm px-2">
                {__(error.message, "whizmanage")}
              </p>
            )}
          </>
        )}
      />
      {isMediaPickerOpen && (
        <MediaPicker
          value={null}
          onChange={handleFileSelected}
          onClose={() => {
            setIsMediaPickerOpen(false);
            setCurrentEditIndex(null);
          }}
          multiple={false}
          title={__("Select File", "whizmanage")}
          mediaType="all"
          autoOpen={true}
        />
      )}
    </div>
  );
}
