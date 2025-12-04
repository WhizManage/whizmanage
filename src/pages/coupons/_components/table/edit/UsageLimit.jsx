import CustomTooltip from "@components/nextUI/Tooltip";
import Button from "@components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@components/ui/hover-card";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/ui/popover";
import { Info, Settings2 } from "lucide-react";
import { useState } from "react";
import { __ } from '@wordpress/i18n';

const UsageLimit = ({ row }) => {
   
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <CustomTooltip title={__("Manage limits", "whizmanage")}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" className="h-8 px-1.5">
            <Settings2 className="!size-4" />
          </Button>
        </PopoverTrigger>
      </CustomTooltip>
      <PopoverContent className="!w-96 mx-4">
        <div className="dark:bg-slate-800">
          <div className="flex flex-col gap-1 text-center text-3xl justify-center pb-4 border-b dark:border-slate-700">
            <div className="flex items-center justify-center space-x-2">
              <h2 className="text-center dark:text-gray-400">
                {__("Usage & Limit", "whizmanage")}
              </h2>
              <HoverCard openDelay={300}>
                <HoverCardTrigger asChild>
                  <Info className="h-5 w-5 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer mt-2" />
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold">
                      {__("Usage & Limit", "whizmanage")}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {__(
                        "Control and monitor the application of this coupon with respect to overall usage, specific user limitations, and the number of items it can be applied to. Proper management ensures optimal benefit from promotional strategies.",
                        "whizmanage"
                      )}
                    </p>
                  </div>
                </HoverCardContent>
              </HoverCard>
            </div>
          </div>
          <div className="py-4 flex flex-col gap-4">
            <div className="w-full flex items-center justify-start gap-1.5 px-1">
              <HoverCard openDelay={300}>
                <HoverCardTrigger asChild>
                  <Info className="h-3 w-3 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer" />
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold">{__("Usage", "whizmanage")}</h4>
                    <p className="text-sm text-muted-foreground">
                      {__(
                        "The number of times this coupon has already been used. This allows you to track its usage and ensure the coupon is being utilized as intended.",
                        "whizmanage"
                      )}
                    </p>
                  </div>
                </HoverCardContent>
              </HoverCard>
              <Label className={`w-full text-muted-foreground`}>{__("Usage", "whizmanage")}</Label>
            </div>
            <Input
              disabled
              className="w-full border-0"
              onFocus={(event) => event.target.select()}
              onChange={(event) => row.original.usage_count = event.target.value}
              defaultValue={row.original.usage_count}
            />
            <div className="w-full flex items-center justify-start gap-1.5 px-1">
              <HoverCard openDelay={300}>
                <HoverCardTrigger asChild>
                  <Info className="h-3 w-3 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer" />
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold">
                      {__("Usage limit per coupon", "whizmanage")}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {__("How many times this coupon can be used before it is void.", "whizmanage")}
                    </p>
                  </div>
                </HoverCardContent>
              </HoverCard>
              <Label className={`w-full text-muted-foreground`}>
                {__("Usage limit per coupon", "whizmanage")}
              </Label>
            </div>
            <Input
              className="w-full"
              onFocus={(event) => event.target.select()}
              onChange={(event) =>
                (row.original.usage_limit = event.target.value)
              }
              defaultValue={row.original.usage_limit}
            />
            <div className="w-full flex items-center justify-start gap-1.5 px-1">
              <HoverCard openDelay={300}>
                <HoverCardTrigger asChild>
                  <Info className="h-3 w-3 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer" />
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold">
                      {__("Usage limit per user", "whizmanage")}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {__(
                        "How many times this coupon can be used by an individual user. Uses billing email for guests, and user ID for logged in users.",
                        "whizmanage"
                      )}
                    </p>
                  </div>
                </HoverCardContent>
              </HoverCard>
              <Label className={`w-full text-muted-foreground`}>
                {__("Usage limit per user", "whizmanage")}
              </Label>
            </div>
            <Input
              className="w-full"
              onFocus={(event) => event.target.select()}
              onChange={(event) =>
                (row.original.usage_limit_per_user = event.target.value)
              }
              defaultValue={row.original.usage_limit_per_user}
            />
            <div className="w-full flex items-center justify-start gap-2 px-1">
              <HoverCard openDelay={300}>
                <HoverCardTrigger asChild>
                  <Info className="h-3 w-3 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer" />
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold">
                      {__("Limit usage to X items", "whizmanage")}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {__(
                        "The maximum number of individual items this coupon can apply to when using product discounts. Leave blank to apply to all qualifying items in cart.",
                        "whizmanage"
                      )}
                    </p>
                  </div>
                </HoverCardContent>
              </HoverCard>
              <Label className={`w-full text-muted-foreground`}>
                {__("Limit usage to X items", "whizmanage")}
              </Label>
            </div>
            <Input
              className="w-full"
              onFocus={(event) => event.target.select()}
              onChange={(event) =>
                (row.original.limit_usage_to_x_items = event.target.value)
              }
              defaultValue={row.original.limit_usage_to_x_items}
            />
          </div>
          <div className="px-4 pb-4 flex justify-center gap-2">
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default UsageLimit;
