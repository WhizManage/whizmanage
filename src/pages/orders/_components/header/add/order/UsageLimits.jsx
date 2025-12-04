import { IconBadge } from "@components/IconBadge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@components/ui/hover-card";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import { Infinity, Info } from "lucide-react";
import { __ } from '@wordpress/i18n';

const UsageLimits = ({ register }) => {
   

  const normalizeValue = (value) => (value === "" ? 0 : value);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-x-2">
        <IconBadge icon={Infinity} />
        <h2 className="text-xl dark:text-gray-400">{__("Usage Limits", "whizmanage")}</h2>
      </div>
      <div className="flex flex-col w-full gap-1.5">
        <div className="w-full flex items-center justify-start gap-1.5">
          <HoverCard openDelay={300}>
            <HoverCardTrigger asChild>
              <Info className="h-3 w-3 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer" />
            </HoverCardTrigger>
            <HoverCardContent className="w-80" side="top" align="start">
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
          <Label htmlFor="usage_limit_per_user">{__("Usage limit per coupon", "whizmanage")}</Label>
        </div>
        <div className="relative h-10 border rounded-lg flex gap-1 items-center px-1 dark:bg-slate-700">
          <Input
            type="number"
            min={0}
            id="usage_limit"
            placeholder={__("Unlimited usage", "whizmanage")}
            className="!border-none !ring-0 dark:!text-slate-300 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0"
            {...register("usage_limit", {
              setValueAs: normalizeValue,
            })}
          />
        </div>
      </div>
      <div className="flex flex-col w-full gap-1.5">
        <div className="w-full flex items-center justify-start gap-1.5">
          <HoverCard openDelay={300}>
            <HoverCardTrigger asChild>
              <Info className="h-3 w-3 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer" />
            </HoverCardTrigger>
            <HoverCardContent className="w-80 z-50" side="top" align="start">
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
          <Label htmlFor="limit_usage_per_user">
          {__("Usage limit per user", "whizmanage")}
            </Label>
        </div>
        <div className="relative h-10 border rounded-lg flex gap-1 items-center px-1 dark:bg-slate-700">
          <Input
            type="number"
            min={0}
            id="usage_limit_per_user"
            placeholder={__("Unlimited usage", "whizmanage")}
            className="!border-none !ring-0 dark:!text-slate-300 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0"
            {...register("usage_limit_per_user", {
              setValueAs: normalizeValue,
            })}
          />
        </div>
      </div>
      <div className="flex flex-col w-full gap-1.5">
        <div className="w-full flex items-center justify-start gap-1.5">
          <HoverCard openDelay={300}>
            <HoverCardTrigger asChild>
              <Info className="h-3 w-3 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer" />
            </HoverCardTrigger>
            <HoverCardContent className="w-80 z-50" side="top" align="start">
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
          <Label htmlFor="limit_usage_to_x_items">
            {__("Limit usage to X items", "whizmanage")}
          </Label>
        </div>
        <div className="relative h-10 border rounded-lg flex gap-1 items-center px-1 dark:bg-slate-700">
          <Input
            type="number"
            min={0}
            id="limit_usage_to_x_items"
            placeholder={__("Unlimited usage", "whizmanage")}
            className="!border-none !ring-0 dark:!text-slate-300 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0"
            {...register("limit_usage_to_x_items", {
              setValueAs: normalizeValue,
            })}
          />
        </div>
      </div>
    </div>
  );
};

export default UsageLimits;
