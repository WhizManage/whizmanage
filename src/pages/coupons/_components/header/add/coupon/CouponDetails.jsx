import { IconBadge } from "@components/IconBadge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select";
import { Textarea } from "@components/ui/textarea";
import { Checkbox, cn, DatePicker } from "@heroui/react";
import { getLocalTimeZone, now } from "@internationalized/date";
import { Info, ListCollapse, Wand2 } from "lucide-react";
import { useState } from "react";
import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";
import { __ } from '@wordpress/i18n';

const CouponDetails = ({ register, errors, setValue, watch, updateValue }) => {
   
  const [discount, setDiscount] = useState("fixed_cart");
  const [dateExpiry, setDateExpiry] = useState(null);
  const [dateStart, setDateStart] = useState(null);
  const discountTypeLabels = {
    fixed_product: "Fixed product",
    fixed_cart: "Fixed cart",
    percent: "Percentage",
  };

  const couponCode = watch("code", "");

  const handleGenerateClick = () => {
    const newCode = Math.random().toString(36).substr(2, 8).toUpperCase(); // יצירת קוד רנדומלי
    setValue("code", newCode); // עדכון הערך בתבנית
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-x-2">
        <IconBadge icon={ListCollapse} />
        <h2 className="text-xl dark:text-gray-400">{__("Coupon Details", "whizmanage")}</h2>
      </div>
      <div className="flex flex-col w-full gap-1.5">
        <div className="w-full flex items-center justify-start gap-1.5">
          <HoverCard openDelay={300}>
            <HoverCardTrigger asChild>
              <Info className="h-3 w-3 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer" />
            </HoverCardTrigger>
            <HoverCardContent className="w-80 z-50" side="top" align="start">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">{__("Coupon Coder", "whizmanage")}</h4>
                <p className="text-sm text-muted-foreground">
                  {__(
                    "The unique identifier for the coupon, used by customers to apply the discount at checkout.",
                    "whizmanage"
                  )}
                </p>
              </div>
            </HoverCardContent>
          </HoverCard>
          <Label htmlFor="code">{__("Coupon Code", "whizmanage")} *</Label>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1 h-10 border rounded-lg flex gap-1 items-center dark:bg-slate-700">
            <Input
              type="text"
              id="code"
              placeholder={__("Code", "whizmanage")}
              value={couponCode}
              onChange={(e) => setValue("code", e.target.value)}
              className="!border-none dark:!text-slate-300 !ring-0 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0 !px-3"
              {...register("code", { required: __("Coupon code is required", "whizmanage") })}
            />
          </div>
          <CustomTooltip title={__("Generate", "whizmanage")}>
            <Button
              onClick={handleGenerateClick}
              variant="outline"
              type="button"
              className="size-10 rounded-lg dark:!bg-slate-700 !text-slate-300"
              size="icon"
            >
              <Wand2 />
            </Button>
          </CustomTooltip>
        </div>
        {errors.code && (
          <p className="text-red-500 dark:text-pink-500 text-sm px-2">
            {errors.code.message}
          </p>
        )}
      </div>
      <div className="flex flex-col w-full gap-1.5">
        <div className="w-full flex items-center justify-start gap-1.5">
          <HoverCard openDelay={300}>
            <HoverCardTrigger asChild>
              <Info className="h-3 w-3 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer" />
            </HoverCardTrigger>
            <HoverCardContent className="w-80 z-50" side="top" align="start">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">{__("Amount", "whizmanage")}</h4>
                <p className="text-sm text-muted-foreground">
                  {__(
                    "The value of the discount the coupon provides, either as a fixed amount or a percentage.",
                    "whizmanage"
                  )}
                </p>
              </div>
            </HoverCardContent>
          </HoverCard>
          <Label htmlFor="amount">{__("Amount", "whizmanage")}</Label>
        </div>
        <div className="relative h-10 border rounded-lg flex rtl:flex-row-reverse items-center px-1 dark:bg-slate-700">
          {discount != "percent" ? (
            <span
              className="text-gray-400 text-base pl-2 rtl:!px-2 rtl:!pt-2.5"
              dangerouslySetInnerHTML={{ __html: window.currency }}
            />
          ) : (
            <span className="text-gray-400 text-base pl-2 rtl:!px-2 rtl:!pt-2.5">
              %
            </span>
          )}
          <Input
            type="number"
            id="amount"
            placeholder="0.00"
            min={0}
            className="!border-none !ring-0 dark:!text-slate-300 invalid:border-red-500 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0"
            {...register("amount", {
              min: {
                value: 0,
                message: __("Price cannot be less than 0", "whizmanage"),
              },
            })}
          />
        </div>
        {errors.amount && (
          <p className="text-red-500 dark:text-pink-500 text-sm px-2">
            {errors.amount.message}
          </p>
        )}
      </div>
      <div className="flex flex-col w-full gap-1.5">
        <div className="w-full flex items-center justify-start gap-1.5">
          <HoverCard openDelay={300}>
            <HoverCardTrigger asChild>
              <Info className="h-3 w-3 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer" />
            </HoverCardTrigger>
            <HoverCardContent className="w-80 z-50" side="top" align="start">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">{__("Discount type", "whizmanage")}</h4>
                <p className="text-sm text-muted-foreground">
                  {__("Fixed Product - Discount per product.", "whizmanage")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {__("Fixed Cart - Discount on total cart.", "whizmanage")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {__("Percentage - % off products or cart.", "whizmanage")}
                </p>
              </div>
            </HoverCardContent>
          </HoverCard>
          <Label htmlFor="amount">{__("Discount type", "whizmanage")}</Label>
        </div>
        <div className="relative h-10 border rounded-lg flex px-0.5 rtl:flex-row-reverse items-center dark:bg-slate-700">
          <Select
            value={discount}
            onValueChange={(selectedValue) => {
              setDiscount(selectedValue);
              updateValue("discount_type", selectedValue);
            }}
          // onOpenChange={onOpen}
          >
            <SelectTrigger
              className={cn(
                "capitalize min-w-40 font-semibold px-3 !text-slate-300 border-0 rounded-lg text-sm rtl:mr-2 py-0 h-9 focus-visible:ring-0 focus:ring-offset-0"
              )}
            >
              <SelectValue className="!min-w-40 p-0 !text-slate-300">
                {__(discountTypeLabels[discount], "whizmanage") || __("Select discount type", "whizmanage")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="dark:border-slate-600">
              {Object.entries(discountTypeLabels).map(([key, label]) => (
                <SelectItem
                  key={key}
                  value={key}
                  className={cn(
                    "capitalize cursor-pointer font-semibold text-sm w-full rtl:mr-2 py-2 pr-4 hover:border-slate-500 !rounded-none"
                  )}
                >
                  <span>{__(label, "whizmanage")}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                  {__("Coupon start date and time", "whizmanage")}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {__(
                    "The date and time when the coupon becomes active and can be used.",
                    "whizmanage"
                  )}
                </p>
              </div>
            </HoverCardContent>
          </HoverCard>
          <Label htmlFor="start_date">{__("Coupon start date and time", "whizmanage")}</Label>
        </div>

        <div className="relative border rounded-lg flex gap-1 items-center px-1 dark:bg-slate-700">
          <DatePicker
            className="[&>div]:border-0 [&>div]:flex [&>div]:items-center [&>div]:!bg-transparent [&>div]:hover:!bg-transparent !text-slate-300"
            showMonthAndYearPickers
            defaultValue={now(getLocalTimeZone())}
            hideTimeZone
            aria-label="choose date"
            hourCycle={24}
            classNames={{
              base: "rounded-md dark:!bg-slate-800 dark:!text-slate-300",
              inputWrapper:
                "rounded-md !h-8 !max-h-8 !py-1 !m-0 border dark:!border-slate-800 bg-white dark:!bg-slate-700 dark:!text-slate-300",
              timeInput: "rounded-md dark:!bg-slate-800 dark:!text-slate-300",
              selectorButton: "rounded-md dark:!bg-slate-700 dark:!text-slate-400",
            }}
            onChange={(newDate) => {
              if (newDate) {
                // ✅ מוודאים שהאובייקט מגיע בפורמט נכון ומומר ל־UTC
                const utcString = newDate.toAbsoluteString(); // נותן "2025-06-18T12:00:00Z"
                
                setDateStart(utcString);
                updateValue("date", utcString);
              } else {
                setDateStart(null);
                updateValue("date", null);
              }
            }}
          />
        </div>
        {errors.start_date && (
          <p className="text-red-500 dark:text-pink-500 text-sm px-2">
            {errors.start_date.message}
          </p>
        )}
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
                  {__("Coupon expiry date", "whizmanage")}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {__(
                    "The last date the coupon can be used. The coupon will expire at 00:00:00 (midnight) on this date.",
                    "whizmanage"
                  )}
                </p>
              </div>
            </HoverCardContent>
          </HoverCard>
          <Label htmlFor="code">{__("Coupon expiry date", "whizmanage")}</Label>
        </div>
        <div className="relative border rounded-lg flex gap-1 items-center px-1 dark:bg-slate-700">
          <DatePicker
            className="[&>div]:border-0 [&>div]:flex [&>div]:items-center [&>div]:!bg-transparent [&>div]:hover:!bg-transparent !text-slate-300"
            defaultValue={dateExpiry}
            aria-label="choose date"
            hourCycle={24}
            onChange={(newDate) => {
              if (newDate) {
                const newIsoString =
                  new Date(newDate.year, newDate.month - 1, newDate.day + 1)
                    .toISOString()
                    .split("T")[0] + "T00:00:00";

                setDateExpiry(newIsoString);
                updateValue("date_expires", newIsoString);
              } else {
                updateValue("date_expires", null);
              }
            }}
            classNames={{
              base: "rounded-md dark:!bg-slate-800 dark:!text-slate-300",
              inputWrapper:
                "rounded-md !h-8 !max-h-8 !py-1 !m-0 border dark:!border-slate-800 bg-white dark:!bg-slate-700 dark:!text-slate-300",
              timeInput: "rounded-md dark:!bg-slate-800 dark:!text-slate-300",
              selectorButton:
                "rounded-md dark:!bg-slate-700 dark:!text-slate-400",
            }}
          />
        </div>
        {errors.description && (
          <p className="text-red-500 dark:text-pink-500 text-sm px-2">
            {errors.description.message}
          </p>
        )}
      </div>
      <div className="flex flex-col w-full gap-1.5">
        <div className="w-full flex items-center justify-start gap-1.5">
          <HoverCard openDelay={300}>
            <HoverCardTrigger asChild>
              <Info className="h-3 w-3 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer" />
            </HoverCardTrigger>
            <HoverCardContent className="w-80 z-50" side="top" align="start">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">{__("Description", "whizmanage")}</h4>
                <p className="text-sm text-muted-foreground">
                  {__(
                    "Optional field to provide details or notes about the coupon for internal use or customer reference.",
                    "whizmanage"
                  )}
                </p>
              </div>
            </HoverCardContent>
          </HoverCard>
          <Label htmlFor="code">{__("Description", "whizmanage")}</Label>
        </div>
        <div className="relative border rounded-lg flex gap-1 items-center px-3 py-1 dark:bg-slate-700">
          <Textarea
            type="text"
            id="description"
            rows="5"
            placeholder={__("Description (optional)", "whizmanage")}
            className="!border-none dark:!text-slate-300 !ring-0 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
          />
        </div>
        {errors.description && (
          <p className="text-red-500 dark:text-pink-500 text-sm px-2">
            {errors.description.message}
          </p>
        )}
      </div>
      <div className="flex flex-col w-full gap-4">
        <div className="w-full flex items-center justify-start gap-1.5">
          <HoverCard openDelay={300}>
            <HoverCardTrigger asChild>
              <Info className="h-3 w-3 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer" />
            </HoverCardTrigger>
            <HoverCardContent className="w-80 z-50" side="top" align="start">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">{__("Free shipping", "whizmanage")}</h4>
                <p className="text-sm text-muted-foreground">
                  {__(`Check this box if the coupon grants free shipping.`, "whizmanage")}
                </p>
              </div>
            </HoverCardContent>
          </HoverCard>
          <Label>{__("Free shipping", "whizmanage")}</Label>
        </div>
        <Checkbox
          color="primary"
          onValueChange={(isSelected) => {
            updateValue("free_shipping", isSelected);
          }}
          classNames={{
            label: "flex gap-2 font-extralight text-base text-muted-foreground",
            base: "w-full rtl:!ml-2",
          }}
        >
          {__(`Allow free shipping`, "whizmanage")}
        </Checkbox>
      </div>
    </div>
  );
};

export default CouponDetails;
