import CustomTooltip from "@components/nextUI/Tooltip";
import Button from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/ui/popover";
import { Switch, cn } from "@heroui/react";
import { PopoverClose } from "@radix-ui/react-popover";
import { Link, Plus, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import ChooseFile from "./ChooseFile";
import { __ } from '@wordpress/i18n';


const DownloadableEdit = ({ row, updateValue }) => {
   
  const [selectedFile, setSelectedFile] = useState(null);
const isRTL = document.documentElement.dir === 'rtl';

  // Use a ref to track if we've manually updated the value
  const hasManuallyToggled = useRef(false);

  // Only initialize from row.original if we haven't manually toggled
  const [isDownloadable, setIsDownloadable] = useState(() => {
    // console.log("Initializing isDownloadable");
    return row?.original?.downloadable === true;
  });

  // console.log("Component rendered. State:", isDownloadable, "Manual toggle:", hasManuallyToggled.current);

  const [downloads, setDownloads] = useState(
    row?.original?.downloads?.length
      ? row.original.downloads
      : [{ name: "", file: "" }]
  );
  const [downloadExpiry, setDownloadExpiry] = useState(
    row ? (row.original?.download_expiry ?? -1) : -1
  );
  const [downloadLimit, setDownloadLimit] = useState(
    row ? (row.original?.download_limit ?? -1) : -1
  );

  // Make sure row.original is always in sync with our state
  useEffect(() => {
    if (row && row.original) {
      row.original.downloadable = isDownloadable;
      row.original.virtual = isDownloadable;
    }
  }, [isDownloadable, row]);

  const handleToggleDownloadable = () => {
    // console.log("Toggle clicked, current state:", isDownloadable);

    // Mark that we've manually toggled
    hasManuallyToggled.current = true;

    // Update the local state
    setIsDownloadable((prev) => !prev);
  };

  const handleInputChange = (index, field, value) => {
    const newDownloads = [...downloads];
    newDownloads[index][field] = value;
    setDownloads(newDownloads);
    if (row) {
      row.original.downloads = newDownloads;
    } else {
      updateValue("downloads", newDownloads);
    }
  };

  const handleAddFile = () => {
    const newDownloads = [...downloads, { name: "", file: "" }];
    setDownloads(newDownloads);
    if (row) {
      row.original.downloads = newDownloads;
    } else {
      updateValue("downloads", newDownloads);
    }
  };

  const handleDeleteFile = (index) => {
    const newDownloads = downloads.filter((_, i) => i !== index);
    if (newDownloads.length === 0) {
      newDownloads.push({ name: "", file: "" });
    }
    setDownloads(newDownloads);
    if (row) {
      row.original.downloads = newDownloads;
    } else {
      updateValue("downloads", newDownloads);
    }
  };

  const handleExpiryChange = (value) => {
    const numValue = value === "" ? -1 : parseInt(value, 10);
    setDownloadExpiry(numValue);
    if (row) {
      row.original.download_expiry = numValue;
    } else {
      updateValue("download_expiry", numValue);
    }
  };

  const handleLimitChange = (value) => {
    const numValue = value === "" ? -1 : parseInt(value, 10);
    setDownloadLimit(numValue);
    if (row) {
      row.original.download_limit = numValue;
    } else {
      updateValue("download_limit", numValue);
    }
  };

  // Directly check isDownloadable state
  const switchLabel = isDownloadable ? __("Downloadable", "whizmanage") : __("Undownloadable", "whizmanage");

  return (
    <>
      <div className="flex gap-2">
        <CustomTooltip
          title={
            isDownloadable === false
              ? __("Switch to Downloadable Product", "whizmanage")
              : __("Switch to Undownloadable Product", "whizmanage")
          }
        >
          {/* Render only the Switch with its own click handler */}
          <div
            className={cn(
              "flex items-center gap-2 capitalize relative z-10 px-3 py-1 rounded-md border border-input bg-background dark:bg-slate-800",
              updateValue ? "h-10" : "h-8"
            )}
          >
            {updateValue ? (
              <span
                className={cn(
                  "text-sm",
                  isDownloadable
                    ? "text-fuchsia-600"
                    : "text-slate-500 dark:text-slate-400"
                )}
              >
                {switchLabel}
              </span>
            ) : null}

            {/* Use defaultSelected instead of isSelected to force UI update */}
            <Switch
              key={`switch-${isDownloadable}`}
              size="sm"
              defaultSelected={isDownloadable}
              onValueChange={handleToggleDownloadable}
              aria-label={switchLabel}
              color="primary"
              classNames={{
                base: "inline-flex flex-row-reverse",
                label: "flex justify-center",
                wrapper: "p-0 h-5 overflow-visible dark:bg-slate-500",
                thumb: cn(
                  "w-5 h-5 shadow-lg transition-all duration-200",
                  "group-data-[hover=true]:border-fuchsia-600",
                  isRTL
                    ? [
                        "group-data-[selected=true]:mr-5",
                        "group-data-[selected]:group-data-[pressed]:mr-4",
                      ]
                    : [
                        "group-data-[selected=true]:ml-5",
                        "group-data-[selected]:group-data-[pressed]:ml-4",
                      ]
                ),
              }}
            />
          </div>
        </CustomTooltip>
        {isDownloadable && (
          <Popover>
            <CustomTooltip title={__("Downloadable files", "whizmanage")}>
              <PopoverTrigger asChild>
                <Button
                  className={cn(
                    "flex gap-2 capitalize",
                    updateValue ? "h-10" : "h-8"
                  )}
                  variant="outline"
                  size="icon"
                >
                  <Link className="w-5 h-5" />
                </Button>
              </PopoverTrigger>
            </CustomTooltip>
            <PopoverContent className="">
              <div className="grid gap-4">
                <div className="space-y-2 mb-2">
                  <h4 className="font-medium leading-none text-center">
                    {__("Downloadable files", "whizmanage")}
                  </h4>
                </div>

                {/* Download Expiry and Limit settings */}
                <div className="flex flex-col gap-4 p-4 text-muted-foreground">
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
                        <ChooseFile
                          selectedFile={selectedFile}
                          setSelectedFile={setSelectedFile}
                          index={index}
                          handleInputChange={handleInputChange}
                        />
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
                <div className="w-full flex justify-between">
                  <Button className="gap-2" onClick={handleAddFile}>
                    <Plus />
                    {__("Add file", "whizmanage")}
                  </Button>
                  <PopoverClose asChild>
                    <Button className="gap-2">{__("Save", "whizmanage")}</Button>
                  </PopoverClose>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </>
  );
};

export default DownloadableEdit;
