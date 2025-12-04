import Button from "@components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@components/ui/hover-card";
import { Input } from "@components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/ui/popover";
import { cn } from "@heroui/react";
import { Info, RefreshCcw, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { __ } from '@wordpress/i18n';

const ExternalProductEdit = ({ row, isNew, updateValue }) => {
   

  // בדיקת ערכים עבור מוצר חדש או קיים
  const [url, setUrl] = useState(row?.original?.product_url || "");
  const [buttonText, setButtonText] = useState(row?.original?.button_text || "");

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isNew) {
      updateValue("external_url", url);
      updateValue("button_text", buttonText);
    }
  }, [isNew, url, buttonText]); // מערך התלות

  const handleSave = async () => {
    if (row && row.original) {

      row.original.external_url = url;
      row.original.button_text = buttonText;
    }
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsLoading(false);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "flex px-2",
            isNew ? "!min-h-10 !min-w-10 !h-10 !w-10" : "!size-8"
          )}
        >
          <Settings2 className="!size-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="!w-[500px] mx-4">
        <div className="dark:bg-slate-800">
          <div className="flex flex-col gap-1 text-center text-3xl justify-center border-b pb-4 dark:border-slate-700">
            <div className="flex items-center justify-center space-x-2">
              <h2 className="text-center dark:text-gray-400">
                {__("External/Affiliate product", "whizmanage")}
              </h2>
              <HoverCard openDelay={300}>
                <HoverCardTrigger asChild>
                  <Info className="h-5 w-5 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer mt-2" />
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold">
                      {__("External/Affiliate product", "whizmanage")}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {__(
                        "An external or affiliate product links to a product on another website. Customers are redirected to the external site to complete their purchase.",
                        "whizmanage"
                      )}
                    </p>
                  </div>
                </HoverCardContent>
              </HoverCard>
            </div>
          </div>
          <div className="p-4 flex flex-col gap-4">
            <div className="w-full flex items-center justify-center text-center gap-2">
              <p className="text-xs font-bold text-slate-300">{__("Product URL", "whizmanage")}</p>
              <HoverCard openDelay={300}>
                <HoverCardTrigger asChild>
                  <Info className="h-3 w-3 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer" />
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      {__("Enter the external URL to the product.", "whizmanage")}
                    </p>
                  </div>
                </HoverCardContent>
              </HoverCard>
            </div>
            <Input
              value={url}
              placeholder="https://"
              onFocus={(e) => e.target.select()}
              onChange={(e) => setUrl(e.target.value)}
            />
            <div className="w-full flex items-center justify-center text-center gap-2">
              <p className="text-xs font-bold text-slate-300">{__("Button text", "whizmanage")}</p>
              <HoverCard openDelay={300}>
                <HoverCardTrigger asChild>
                  <Info className="h-3 w-3 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer" />
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      {__(
                        "This text will be shown on the button linking to the external product.",
                        "whizmanage"
                      )}
                    </p>
                  </div>
                </HoverCardContent>
              </HoverCard>
            </div>
            <Input
              value={buttonText}
              placeholder="Buy product"
              onFocus={(e) => e.target.select()}
              onChange={(e) => setButtonText(e.target.value)}
            />
          </div>
          <div className="px-4 pb-4 flex justify-center gap-2">
            <Button
              onClick={handleSave}
              className="flex gap-2 items-center justify-center min-w-20"
            >
              {isLoading ? __("Saving...", "whizmanage") : __("Save", "whizmanage")}
              {isLoading && (
                <RefreshCcw className="text-white w-5 h-5 animate-spin" />
              )}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ExternalProductEdit;
