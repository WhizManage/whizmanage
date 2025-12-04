import { IconBadge } from "@components/IconBadge";
import Button from "@components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@components/ui/hover-card";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import { Checkbox, Chip } from "@heroui/react";
import { CopyMinus, Info } from "lucide-react";
import { useState } from "react";
import { __ } from '@wordpress/i18n';

const GeneralRestrictions = ({ register, errors, updateValue }) => {
   
  const [allowedEmails, setAllowedEmails] = useState([]);
  const [emailInput, setEmailInput] = useState("");

  const handleAddEmails = () => {
    const newEmails = emailInput
      .split(",")
      .map((email) => email.trim())
      .filter((email) => email);
    const uniqueEmails = [...new Set([...allowedEmails, ...newEmails])];
    setAllowedEmails(uniqueEmails);
    updateValue("email_restrictions", uniqueEmails);
    setEmailInput("");
    t;
  };

  const productHandleClose = (itemToRemove) => {
    const newProducts = allowedEmails.filter((item) => item !== itemToRemove);
    setAllowedEmails(newProducts);
    updateValue("email_restrictions", newProducts);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-x-2">
        <IconBadge icon={CopyMinus} />
        <h2 className="text-xl dark:text-gray-400">
          {__("General Restrictions", "whizmanage")}
        </h2>
      </div>
      <div className="grid w-full gap-1.5">
        <div className="w-full flex items-center justify-start gap-1.5">
          <HoverCard openDelay={300}>
            <HoverCardTrigger asChild>
              <Info className="h-3 w-3 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer" />
            </HoverCardTrigger>
            <HoverCardContent className="w-80 z-50" side="top" align="start">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">{__("Minimum spend", "whizmanage")}</h4>
                <p className="text-sm text-muted-foreground">
                  {__(
                    `This field allows you to set the minimum spend (subtotal) allowed to use the coupon.`,
                    "whizmanage"
                  )}
                </p>
              </div>
            </HoverCardContent>
          </HoverCard>
          <Label htmlFor="minimum_amount">{__("Minimum spend", "whizmanage")}</Label>
        </div>
        <div className="relative h-10 border rounded-lg flex rtl:flex-row-reverse items-center px-1 dark:bg-slate-700">
          <span
            className="text-gray-400 text-base pl-2 rtl:!px-2 rtl:!pt-2.5"
            dangerouslySetInnerHTML={{ __html: window.currency }}
          />
          <Input
            type="number"
            min={0}
            id="price"
            placeholder="0.00"
            className="!border-none !ring-0 dark:!text-slate-300 invalid:border-red-500 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0"
            {...register("minimum_amount", {
              min: {
                value: 0,
                message: __("Minimum spend cannot be less than 0", "whizmanage"),
              },
            })}
          />
        </div>
        {errors.minimum_amount && (
          <p className="text-red-500 dark:text-pink-500 text-sm px-2">
            {errors.minimum_amount.message}
          </p>
        )}
      </div>
      <div className="grid w-full gap-1.5">
        <div className="w-full flex items-center justify-start gap-1.5">
          <HoverCard openDelay={300}>
            <HoverCardTrigger asChild>
              <Info className="h-3 w-3 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer" />
            </HoverCardTrigger>
            <HoverCardContent className="w-80 z-50" side="top" align="start">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">{__("Maximum spend", "whizmanage")}</h4>
                <p className="text-sm text-muted-foreground">
                  {__(
                    `This field allows you to set the maximum spend (subtotal) allowed when using the coupon.`,
                    "whizmanage"
                  )}
                </p>
              </div>
            </HoverCardContent>
          </HoverCard>
          <Label htmlFor="maximum_amount">{__("Maximum spend", "whizmanage")}</Label>
        </div>
        <div className="relative h-10 border rounded-lg flex rtl:flex-row-reverse items-center px-1 dark:bg-slate-700">
          <span
            className="text-gray-400 text-base pl-2 rtl:!px-2 rtl:!pt-2.5"
            dangerouslySetInnerHTML={{ __html: window.currency }}
          />
          <Input
            type="number"
            id="maximum_amount"
            placeholder="0.00"
            min={0}
            className="!border-none !ring-0 dark:!text-slate-300 invalid:border-red-500 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0"
            {...register("maximum_amount", {
              min: {
                value: 0,
                message: __("Sale price cannot be less than 0", "whizmanage"),
              },
            })}
          />
        </div>
        {errors.maximum_amount && (
          <p className="text-red-500 dark:text-pink-500 text-sm px-2">
            {errors.maximum_amount.message}
          </p>
        )}
      </div>
      <div className="flex flex-col w-full gap-1.5">
        <div className="w-full flex gap-1.5 items-center">
          <HoverCard openDelay={300}>
            <HoverCardTrigger asChild>
              <Info className="size-3 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer" />
            </HoverCardTrigger>
            <HoverCardContent className="w-80" side="top" align="start">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">{__("Allowed emails", "whizmanage")}</h4>
                <p className="text-sm text-muted-foreground">
                  {__(
                    "List of allowed billing emails to check against when an order is placed. Separate email addresses with commas. You can also use an asterisk (*) to match parts of an email. For example \"*@gmail.com\" would match all gmail addresses.",
                    "whizmanage"
                  )}

                </p>
              </div>
            </HoverCardContent>
          </HoverCard>
          <Label htmlFor="allowed_emails">{__("Allowed emails", "whizmanage")}</Label>
        </div>
        <div className="flex flex-wrap gap-2 relative min-h-10 items-center dark:bg-slate-700 rounded-lg">
          {allowedEmails.length > 0 ? (
            allowedEmails.map((item, index) => (
              <Chip
                key={index}
                onClose={() => productHandleClose(item)}
                variant="flat"
                classNames={{
                  base: "bg-gradient-to-br from-fuchsia-50 dark:from-slate-700 to-fuchsia-200 dark:to-slate-600 opacity-100",
                  content: "text-fuchsia-600 dark:text-slate-300",
                  closeButton: "text-fuchsia-600 dark:text-slate-300",
                }}
              >
                {item}
              </Chip>
            ))
          ) : (
            <div className="font-extralight text-base text-muted-foreground px-4">
              {__("No email restrictions", "whizmanage")}
            </div>
          )}
        </div>
        <div className="w-full flex gap-1.5">
          <div className="relative h-10 border rounded-lg flex rtl:flex-row-reverse items-center px-1 dark:bg-slate-700 flex-1">
            <Input
              type="email"
              id="email_restrictions"
              placeholder="e.g. example@gmail.com or *@gmail.com"
              value={emailInput} // קשירה ל-state
              onChange={(e) => setEmailInput(e.target.value)} // עדכון ה-state
              className="!border-none !ring-0 dark:!text-slate-300 invalid:border-red-500 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0"
            />
          </div>
          <Button
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              handleAddEmails();
            }}
          >
            {__("Add", "whizmanage")}
          </Button>
        </div>
      </div>
      <div className="flex flex-col w-full gap-4">
        <div className="w-full flex items-center justify-start gap-1.5">
          <HoverCard openDelay={300}>
            <HoverCardTrigger asChild>
              <Info className="h-3 w-3 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer" />
            </HoverCardTrigger>
            <HoverCardContent className="w-80 z-50" side="top" align="start">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">{__("Individual use", "whizmanage")}</h4>
                <p className="text-sm text-muted-foreground">
                  {__(
                    `Check this box if the coupon cannot be used in conjunction with other coupons.`,
                    "whizmanage"
                  )}
                </p>
              </div>
            </HoverCardContent>
          </HoverCard>
          <Label htmlFor="individual_use">{__("Individual use", "whizmanage")}</Label>
        </div>
        <Checkbox
          color="primary"
          onValueChange={(isSelected) => {
            // setMenageStock(isSelected);
            updateValue("individual_use", isSelected);
          }}
          classNames={{
            label: "flex gap-2 font-extralight text-base text-muted-foreground",
            base: "w-full rtl:!ml-2",
          }}
        >
          {__("Individual use only", "whizmanage")}
        </Checkbox>
      </div>
      <div className="flex flex-col w-full gap-4">
        <div className="w-full flex items-center justify-start gap-1.5">
          <HoverCard openDelay={300}>
            <HoverCardTrigger asChild>
              <Info className="h-3 w-3 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer" />
            </HoverCardTrigger>
            <HoverCardContent className="w-80 z-50" side="top" align="start">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">{__("Exclude sale items", "whizmanage")}</h4>
                <p className="text-sm text-muted-foreground">
                  {__(
                    `Check this box if the coupon should not apply to items on sale. Per-item coupons will only work if the item is not on sale. Per-cart coupons will only work if there are items in the cart that are not on sale.`,
                    "whizmanage"
                  )}
                </p>
              </div>
            </HoverCardContent>
          </HoverCard>
          <Label htmlFor="exclude_sale_items">{__("Exclude sale items", "whizmanage")}</Label>
        </div>
        <Checkbox
          color="primary"
          onValueChange={(isSelected) => {
            // setMenageStock(isSelected);
            updateValue("exclude_sale_items", isSelected);
          }}
          classNames={{
            label: "flex gap-2 font-extralight text-base text-muted-foreground",
            base: "w-full rtl:!ml-2",
          }}
        >
          {__("Exclude sale items", "whizmanage")}
        </Checkbox>
      </div>
    </div>
  );
};

export default GeneralRestrictions;
