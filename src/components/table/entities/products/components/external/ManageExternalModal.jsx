// src/components/table/entities/products/components/external/ManageExternalModal.jsx

import { postApi } from "@/services/services";
import Button from "@components/ui/button.jsx";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@heroui/react";
import { toast } from "@/lib/utils";
import { RefreshCcw, ExternalLink } from "lucide-react";
import { IconBadge } from "@components/ui/custom/IconBadge";
import { useEffect, useState } from "react";
 import { __ } from "@wordpress/i18n";

const ManageExternalModal = ({ row, isNew, updateValue, trigger }) => {
   

  const [url, setUrl] = useState(
    row?.original?.product_url || row?.original?.external_url || ""
  );
  const [buttonText, setButtonText] = useState(
    row?.original?.button_text || ""
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isNew && updateValue) {
      updateValue("external_url", url);
      updateValue("button_text", buttonText);
    }
  }, [isNew, url, buttonText]);

  const handleSave = async () => {
    setIsLoading(true);

    if (isNew) {
      // מוצר חדש - רק עדכון מקומי
      updateValue("external_url", url);
      updateValue("button_text", buttonText);

      toast.success(__(
        "Changes saved! You can now close the window and continue editing.",
        "whizmanage"
      ));
    } else {
      // מוצר קיים - שליחה לשרת
      const dataToSend = {
        external_url: url,
        button_text: buttonText,
      };

      await postApi(
        `${window.siteUrl}/wp-json/wc/v3/products/${row.original.id}`,
        dataToSend
      )
        .then((res) => {
          // עדכון מקומי אחרי הצלחה
          if (row && row.original) {
            row.original.external_url = url;
            row.original.button_text = buttonText;
          }

          toast.success(__("External product settings saved", "whizmanage"));
        })
        .catch((error) => {
          toast.error(error?.response?.data?.message || error?.message || __("Unknown error occurred", "whizmanage"));
        });
    }

    setIsLoading(false);
    setIsOpen(false);
  };

  return (
    <Popover
      placement="bottom"
      showArrow
      backdrop="transparent"
      isOpen={isOpen}
      onOpenChange={setIsOpen}
    >
      <PopoverTrigger>
        <div className="cursor-pointer">{trigger}</div>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-0 dark:bg-slate-800 bg-white border-slate-200 dark:border-slate-600">
        <div className="dark:bg-slate-800">
          {/* Header */}
          <div className="flex flex-col gap-2 text-center justify-center items-center border-b pt-4 pb-3 dark:border-slate-700">
            <IconBadge icon={ExternalLink} variant="default" size="default" />
            <h2 className="text-lg font-semibold dark:text-slate-200">
              {__("External/Affiliate product", "whizmanage")}
            </h2>
            <p className="text-xs text-muted-foreground px-4">
              {__(
                "An external or affiliate product links to a product on another website. Customers are redirected to the external site to complete their purchase.",
                "whizmanage"
              )}
            </p>
          </div>

          {/* Content */}
          <div className="p-4 flex flex-col gap-4">
            {/* Product URL */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-bold">{__("Product URL", "whizmanage")}</Label>
              <Input
                value={url}
                placeholder="https://"
                onFocus={(e) => e.target.select()}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                {__("Enter the external URL to the product.", "whizmanage")}
              </p>
            </div>

            {/* Button Text */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-bold">{__("Button text", "whizmanage")}</Label>
              <Input
                value={buttonText}
                placeholder={__("Buy product", "whizmanage")}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setButtonText(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                {__(
                  "This text will be shown on the button linking to the external product.",
                  "whizmanage"
                )}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 pb-4 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              {__("Cancel", "whizmanage")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="flex gap-2 items-center justify-center min-w-20"
            >
              {isLoading ? __("Saving...", "whizmanage") : __("Save", "whizmanage")}
              {isLoading && (
                <RefreshCcw className="text-white w-4 h-4 animate-spin" />
              )}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ManageExternalModal;