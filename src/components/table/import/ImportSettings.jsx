// src/components/table/import/ImportSettings.jsx

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { toast } from "@/lib/utils";
import Button from "@components/ui/button";
import { IconBadge } from "@components/ui/custom/IconBadge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@components/ui/hover-card";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import {
  ExternalLink,
  FileSpreadsheet,
  Info,
  Save,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
 import { __ } from "@wordpress/i18n";
import CustomFieldsSelector from "./CustomFieldsSelector";
import ExportProductsIds from "./ExportProductsIds";

const NO_LINK_PLACEHOLDER = "none";

export default function ImportSettings({
  isOpen,
  onClose,
  config,
  data = null,
}) {
   

  const [currentLink, setCurrentLink] = useState(window.sheetsUrl || null);
  const [sheetUrl, setSheetUrl] = useState("");
  const [selectedProducts, setSelectedProducts] = useState(
    typeof window !== "undefined" && window.listExport ? window.listExport : []
  );
  const [customFields, setCustomFields] = useState(
    typeof window !== "undefined" && window.exportMeta ? window.exportMeta : []
  );
  const [isSaving, setIsSaving] = useState(false);

  const local = typeof window !== "undefined" ? window.user_local : "en_US";

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;

    if (window.sheetsUrl === NO_LINK_PLACEHOLDER) {
      setCurrentLink(null);
      setSheetUrl("");
    } else if (window.sheetsUrl) {
      setCurrentLink(window.sheetsUrl);
      setSheetUrl(window.sheetsUrl);
    } else {
      setCurrentLink(null);
      setSheetUrl("");
    }

    setSelectedProducts(window.listExport ? window.listExport : []);
    setCustomFields(window.exportMeta ? window.exportMeta : []);
  }, [isOpen]);

  const saveSettings = async () => {
    if (!sheetUrl.trim()) {
      toast.warning(__("Please enter a Google Sheets URL", "whizmanage"));
      return;
    }

    setIsSaving(true);

    try {
      const linkResponse = await fetch(
        `${window.siteUrl}/wp-json/wm/v1/sheet-link`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-WP-Nonce": window.rest,
          },
          body: JSON.stringify({
            sheet_url: sheetUrl || NO_LINK_PLACEHOLDER,
          }),
        }
      );

      if (!linkResponse.ok) {
        throw new Error(__("Error saving sheet URL", "whizmanage"));
      }

      const productsResponse = await fetch(
        `${window.siteUrl}/wp-json/wm/v1/export-ids`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-WP-Nonce": window.rest,
          },
          body: JSON.stringify({
            ids: selectedProducts,
          }),
        }
      );

      if (!productsResponse.ok) {
        throw new Error(__("Error saving product list", "whizmanage"));
      }

      const fieldsResponse = await fetch(
        `${window.siteUrl}/wp-json/wm/v1/export-custum-fields`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-WP-Nonce": window.rest,
          },
          body: JSON.stringify({
            fields: customFields,
          }),
        }
      );

      if (!fieldsResponse.ok) {
        throw new Error(__("Error saving product list", "whizmanage"));
      }

      window.sheetsUrl = sheetUrl || NO_LINK_PLACEHOLDER;
      window.listExport = selectedProducts;
      window.exportMeta = customFields;

      setCurrentLink(sheetUrl || null);

      toast.success(__("All settings saved successfully", "whizmanage"));

      onClose();
    } catch (error) {
      console.error("Error saving import settings:", error);
      toast.error(error.message || __("Error saving settings", "whizmanage"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setSheetUrl("");
    setSelectedProducts([]);
    setCustomFields([]);
    onClose();
  };

  const removeSheetLink = () => {
    setCurrentLink(null);
    setSheetUrl("");
  };

  const getDocsHelp = () => {
    return (
      <div className="w-full flex flex-col gap-2 items-center justify-center p-4">
        <p>
          {__(
            "This feature allows you to integrate your website with a Google Sheets file.",
            "whizmanage"
          )}
        </p>
        <p className="font-bold text-lg">{__("Instructions", "whizmanage")}:</p>
        <ol className="list-decimal">
          <li>
            {__(
              "Open the attached sample file and click 'Make a copy' to save it in your Google account. You must also transfer the attached script.",
              "whizmanage"
            )}
          </li>
          <li>
            {__("Name the file using the same name as your website's URL.", "whizmanage")}
          </li>
          <li>
            {__(
              "Set the file's sharing permissions to 'View only' for everyone, then copy the link and paste it here in the provided box.",
              "whizmanage"
            )}
          </li>
          <li>
            {__(
              "In the top menu, a new tab named 'WhizManage' will appear. Click 'Update File'.",
              "whizmanage"
            )}
            <br />
            {__(
              "The first time you do this, you will be prompted to authorize your account for the attached script.",
              "whizmanage"
            )}
          </li>
          <li>
            {__(
              "After updating the file, you can edit or add products to your site via the file by clicking the 'Update Site' button.",
              "whizmanage"
            )}
          </li>
        </ol>
      </div>
    );
  };

  const getExampleFileLink = () => {
    return local == "he_IL"
      ? "https://docs.google.com/spreadsheets/d/1xu9IgKypnNli_Aqtgaqldqo8xfhaX8eipZRNCbAN9hY/edit?usp=sharing"
      : "https://docs.google.com/spreadsheets/d/1zCSh2QOZbmfanyfIvEk0cJVFZG5f8tamGENpS7WRkt4/edit?usp=sharing";
  };

  return (
    <Modal
      size="2xl"
      scrollBehavior="inside"
      backdrop="opaque"
      className="!overflow-hidden"
      classNames={{
        backdrop:
          "bg-gradient-to-t from-zinc-800 to-zinc-800/30 backdrop-opacity-20 !overflow-hidden",
        closeButton:
          "hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 rounded-lg",
      }}
      isOpen={isOpen}
      onOpenChange={handleClose}
      motionProps={{
        variants: {
          enter: {
            y: 0,
            opacity: 1,
            transition: {
              duration: 0.3,
              ease: "easeOut",
            },
          },
          exit: {
            y: -20,
            opacity: 0,
            transition: {
              duration: 0.2,
              ease: "easeIn",
            },
          },
        },
      }}
    >
      <ModalContent className="dark:bg-slate-900">
        {(onModalClose) => (
          <>
            <ModalHeader className="flex gap-3 text-center justify-center items-center">
              <IconBadge icon={Upload} variant="default" size="default" />
              <h2 className="text-2xl font-semibold dark:text-slate-300">
                {__("Import Products", "whizmanage")}
              
              </h2>
              <HoverCard openDelay={300}>
                <HoverCardTrigger asChild>
                  <Info className="h-5 w-5 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer mt-2" />
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold">
                      {__("Import Products", "whizmanage")}
                    </h4>
                    <p className="text-sm font-normal text-muted-foreground">
                      {getDocsHelp()}
                    </p>
                  </div>
                </HoverCardContent>
              </HoverCard>
            </ModalHeader>

            <ModalBody>
              <Card className="w-full max-w-2xl mx-auto mb-3 bg-transparent dark:bg-transparent border-0 shadow-none">
                <CardHeader className="flex flex-col gap-2">
                  {/* <CardTitle className="w-full flex justify-center items-center gap-2 dark:text-slate-300 text-2xl font-semibold">
                    <img
                      src={`${window.siteUrl}/wp-content/plugins/whizmanage-pro/assets/images/icons/google-sheets.png`}
                      alt="Google Sheets"
                      className="size-12"
                    />
                    {__("Import from Google Sheets")}
                  </CardTitle> */}
                  <CardDescription className="text-center text-lg">
                    {__("Connect and import products from Google Sheets", "whizmanage")}
                  </CardDescription>
                  <div className="flex justify-center mt-2">
                    <a
                      href={getExampleFileLink()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-fuchsia-600 hover:text-fuchsia-600/80 flex items-center gap-2 text-sm"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {__("View example spreadsheet", "whizmanage")}
                    </a>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="flex flex-col gap-6">
                    <div className="space-y-2">
                      <Label
                        htmlFor="sheet-url"
                        className="text-sm font-medium text-slate-700 dark:text-slate-300"
                      >
                        {__("Google Sheets URL", "whizmanage")} *
                      </Label>
                      {currentLink ? (
                        <div className="flex items-center gap-2 p-3 rounded-md border bg-muted/50 w-full max-w-full overflow-hidden hover:bg-slate-100 dark:hover:bg-slate-800 duration-300">
                          <FileSpreadsheet className="w-5 h-5 text-fuchsia-600 flex-shrink-0" />
                          <a
                            href={currentLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-fuchsia-600 hover:text-fuchsia-600 hover:underline truncate"
                          >
                            {currentLink}
                            <ExternalLink className="w-3 h-3 inline ml-1 flex-shrink-0" />
                          </a>
                          <Button
                            onClick={removeSheetLink}
                            className="ml-auto rtl:ml-0 rtl:mr-auto"
                            variant="ghost"
                            size="icon"
                            disabled={isSaving}
                            aria-label={__("Remove Link", "whizmanage")}
                          >
                            <X className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex gap-2">
                            <Input
                              id="sheet-url"
                              type="url"
                              placeholder="https://docs.google.com/spreadsheets/d/..."
                              value={sheetUrl}
                              onChange={(e) => setSheetUrl(e.target.value)}
                              className="flex-1 dark:bg-slate-700 dark:border-slate-600"
                              onFocus={(e) => e.target.select()}
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() =>
                                window.open(
                                  "https://docs.google.com/spreadsheets",
                                  "_blank"
                                )
                              }
                              className="dark:bg-slate-700 dark:border-slate-600 dark:hover:bg-slate-600"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-300">
                            {__(
                              "Make sure the sheet is set to 'Anyone with the link can view'",
                              "whizmanage"
                            )}
                          </p>
                        </>
                      )}
                    </div>

                    {config?.enableProductSelection && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {__("Select Products to Export", "whizmanage")}
                        </Label>
                        <p className="text-xs text-slate-500 dark:text-slate-300 mb-2">
                          {__("Choose which products should be exported to Google Sheets", "whizmanage")}
                        </p>
                        <ExportProductsIds
                          selectedProducts={selectedProducts}
                          onChange={setSelectedProducts}
                        />
                      </div>
                    )}

                    {config?.enableCustomFields && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {__("Custom Fields", "whizmanage")}
                        </Label>
                        <p className="text-xs text-slate-500 dark:text-slate-300 mb-2">
                          {__("Select which custom fields to include in the export", "whizmanage")}
                        </p>
                        <CustomFieldsSelector
                          selectedFields={customFields}
                          onChange={setCustomFields}
                          config={config}
                        />
                      </div>
                    )}

                    <div className="flex justify-center mt-4">
                      <Button
                        onClick={saveSettings}
                        disabled={isSaving}
                        className="flex gap-2 bg-fuchsia-600 hover:bg-fuchsia-700"
                      >
                        <Save className="w-4 h-4" />
                        {isSaving ? __("Saving...", "whizmanage") : __("Save Settings", "whizmanage")}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </ModalBody>

            <ModalFooter className="hidden"></ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
