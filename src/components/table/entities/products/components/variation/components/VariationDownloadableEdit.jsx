// src/components/table/products/components/variation/components/VariationDownloadableEdit.jsx

import i18n from "@/i18n";
import CustomTooltip from "@components/ui/nextUI/Tooltip";
import Button from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import {
  Switch,
  cn,
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@heroui/react";
import { Link, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
 import { __ } from "@wordpress/i18n";
import { useVariationsStore } from "../store/variationsStore";
import MediaPicker from "@components/media/MediaPicker";

/**
 * 🎯 VariationDownloadableEdit - עריכת קבצים להורדה לווריאציה
 *
 * קומפוננטה פשוטה שמשתמשת ב-Store לעדכון downloadable
 *
 * תכונות:
 * ✅ Toggle downloadable/virtual
 * ✅ ניהול קבצים להורדה
 * ✅ Download expiry & limit
 * ✅ עדכון אוטומטי ב-Store
 * 🆕 שימוש ב-HeroUI Popover במקום shadcn (פותר בעיות z-index!)
 * 🆕 שימוש ב-MediaPicker החדש לכל סוגי הקבצים
 */
const VariationDownloadableEdit = ({ row }) => {
   
 const isRTL = window?.document?.documentElement?.dir === "rtl";


  // Store
  const { updateVariation, toggleUpdatedTable } = useVariationsStore();

  // ✅ אתחול State מהנתונים הקיימים
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

  // 🆕 State לניהול MediaPicker + Popover
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [currentEditIndex, setCurrentEditIndex] = useState(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // ✅ סנכרון עם row.original אם משתנה מבחוץ
  useEffect(() => {
    setIsDownloadable(row.original.downloadable === true);
  }, [row.original.downloadable]);

  /**
   * ✅ Toggle Downloadable - עדכון מקומי בלבד
   */
  const handleToggleDownloadable = (newValue) => {
    setIsDownloadable(newValue);

    // עדכון ב-Store
    updateVariation(row.id, {
      downloadable: newValue,
      virtual: newValue, // כשזה downloadable, זה גם virtual
    });
    toggleUpdatedTable();
  };

  /**
   * ✅ עדכון שדה בקובץ
   */
  const handleInputChange = (index, field, value) => {
    const newDownloads = [...downloads];
    newDownloads[index][field] = value;
    setDownloads(newDownloads);

    // עדכון ב-Store
    updateVariation(row.id, { downloads: newDownloads });
    toggleUpdatedTable();
  };

  /**
   * ✅ הוספת קובץ חדש
   */
  const handleAddFile = () => {
    const newDownloads = [...downloads, { name: "", file: "" }];
    setDownloads(newDownloads);

    // עדכון ב-Store
    updateVariation(row.id, { downloads: newDownloads });
    toggleUpdatedTable();
  };

  /**
   * ✅ מחיקת קובץ
   */
  const handleDeleteFile = (index) => {
    let newDownloads = downloads.filter((_, i) => i !== index);
    if (newDownloads.length === 0) {
      newDownloads = [{ name: "", file: "" }];
    }
    setDownloads(newDownloads);

    // עדכון ב-Store
    updateVariation(row.id, { downloads: newDownloads });
    toggleUpdatedTable();
  };

  /**
   * ✅ עדכון Download Expiry
   */
  const handleExpiryChange = (value) => {
    const numValue = value === "" ? -1 : parseInt(value, 10);
    setDownloadExpiry(numValue);

    // עדכון ב-Store
    updateVariation(row.id, { download_expiry: numValue });
    toggleUpdatedTable();
  };

  /**
   * ✅ עדכון Download Limit
   */
  const handleLimitChange = (value) => {
    const numValue = value === "" ? -1 : parseInt(value, 10);
    setDownloadLimit(numValue);

    // עדכון ב-Store
    updateVariation(row.id, { download_limit: numValue });
    toggleUpdatedTable();
  };

  /**
   * 🆕 פתיחת MediaPicker לבחירת קובץ
   */
  const handleOpenMediaPicker = (index) => {
    setCurrentEditIndex(index);
    setIsMediaPickerOpen(true);
  };

  /**
   * 🆕 טיפול בבחירת קובץ מ-MediaPicker
   */
  const handleFileSelected = (selectedFile) => {
    if (selectedFile && currentEditIndex !== null) {
      handleInputChange(currentEditIndex, "file", selectedFile.src);
      handleInputChange(currentEditIndex, "name", selectedFile.name);
    }
    setIsMediaPickerOpen(false);
    setCurrentEditIndex(null);
  };

  const switchLabel = isDownloadable ? __("Downloadable", "whizmanage") : __("Undownloadable", "whizmanage");

  return (
    <div className="flex gap-2">
      {/* ✅ Switch עם wrapper קליק */}
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-1 rounded-md border h-8 cursor-pointer select-none",
          isDownloadable
            ? "border-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-950/20"
            : "border-input bg-background dark:bg-slate-800"
        )}
        onClick={() => handleToggleDownloadable(!isDownloadable)}
      >
        <Switch
          size="sm"
          isSelected={isDownloadable}
          onValueChange={handleToggleDownloadable}
          aria-label={switchLabel}
          color="primary"
          className="pointer-events-none"
          classNames={{
            base: "inline-flex",
            wrapper: "p-0 h-5 overflow-visible dark:bg-slate-500",
            thumb: cn(
              "w-5 h-5 shadow-lg",
              isRTL
                ? "group-data-[selected=true]:mr-5"
                : "group-data-[selected=true]:ml-5"
            ),
          }}
        />
      </div>
      {isDownloadable && (
        <Popover 
          placement="bottom" 
          showArrow 
          backdrop="transparent"
          isOpen={isPopoverOpen}
          onOpenChange={setIsPopoverOpen}
          shouldCloseOnInteractOutside={(element) => {
            // 🔥 לא לסגור אם לוחצים על:
            // 1. Modal עצמו
            // 2. Backdrop של Modal
            // 3. כל אלמנט שהוא צאצא של Modal
            
            // בדיקה אם זה Modal או חלק ממנו
            const isModalElement = element.closest('[role="dialog"]');
            
            // בדיקה אם זה backdrop
            const isBackdrop = element.hasAttribute('data-slot') && 
                               element.getAttribute('data-slot') === 'backdrop';
            
            // בדיקה אם זה בתוך body ישירות (Portal של Modal)
            const isInModalPortal = element.closest('[data-slot="wrapper"]');
            
            // אם זה אחד מאלה - אל תסגור את הפופאובר
            if (isModalElement || isBackdrop || isInModalPortal) {
              return false;
            }
            
            // בכל מקרה אחר - סגור את הפופאובר
            return true;
          }}
        >
          <CustomTooltip title={__("Downloadable files", "whizmanage")}>
            <PopoverTrigger>
              <Button
                className="flex gap-2 capitalize h-8"
                variant="outline"
                size="icon"
              >
                <Link className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
          </CustomTooltip>
          
          <PopoverContent className="w-auto max-w-4xl p-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <h4 className="font-medium leading-none text-center">
                  {__("Downloadable files", "whizmanage")}
                </h4>
              </div>

                {/* Download Expiry and Limit settings */}
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
                        value={downloadExpiry === -1 ? "" : downloadExpiry}
                        onChange={(e) => handleExpiryChange(e.target.value)}
                        placeholder={__("Unlimited", "whizmanage")}
                        className="h-8"
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
                        onChange={(e) => handleLimitChange(e.target.value)}
                        placeholder={__("Unlimited", "whizmanage")}
                        className="h-8"
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
                      <div className="flex col-span-2 items-center gap-2">
                        <Label htmlFor={`name-${index}`}>{__("Name", "whizmanage")}:</Label>
                        <Input
                          id={`name-${index}`}
                          value={item.name}
                          onChange={(e) =>
                            handleInputChange(index, "name", e.target.value)
                          }
                          className="flex-1 h-8"
                        />
                      </div>
                      <div className="flex col-span-2 items-center gap-2">
                        <Label htmlFor={`file-url-${index}`}>
                          {__("File URL:", "whizmanage")}
                        </Label>
                        <Input
                          id={`file-url-${index}`}
                          value={item.file}
                          onChange={(e) =>
                            handleInputChange(index, "file", e.target.value)
                          }
                          className="flex-1 h-8"
                        />
                      </div>
                      <div className="flex gap-2 items-center">
                        <Button
                          variant="outline"
                          className="h-8"
                          onClick={() => handleOpenMediaPicker(index)}
                        >
                          {__("Choose file", "whizmanage")}
                        </Button>
                        <CustomTooltip title={__("Delete file", "whizmanage")}>
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-8"
                            onClick={() => handleDeleteFile(index)}
                          >
                            <X />
                          </Button>
                        </CustomTooltip>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="w-full flex justify-between px-4 pb-2">
                  <Button className="gap-2" onClick={handleAddFile}>
                    <Plus />
                    {__("Add file", "whizmanage")}
                  </Button>
                  <Button 
                    className="gap-2"
                    onClick={() => setIsPopoverOpen(false)}
                  >
                    {__("Save", "whizmanage")}
                  </Button>
                </div>
              </div>
            </PopoverContent>
        </Popover>
      )}
      {/* 🆕 MediaPicker Modal - מחוץ ל-HeroUI Popover */}
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
};

export default VariationDownloadableEdit;