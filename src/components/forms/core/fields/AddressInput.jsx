// src/components/forms/core/fields/AddressInput.jsx

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Checkbox } from "@heroui/react";
import { Info } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller } from "react-hook-form";
 import { __ } from "@wordpress/i18n";
import { useGenericForm } from "../FormProvider";

const COUNTRIES = [
  { code: "IL", name: "Israel" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "RU", name: "Russia" },
];

export default function AddressInput({
  name, // "billing" or "shipping"
  label,
  helperText,
  showEmail = false, // רק ל-billing
  showPhone = false, // רק ל-billing
  showCopyCheckbox = false, // "Same as billing" ל-shipping
  copyFromName = null, // "billing" אם זה shipping
}) {
   
  const { control, watch, setValue } = useGenericForm();

  const [sameAsBilling, setSameAsBilling] = useState(false);

  const currentAddress = watch(name) || {};
  const billingAddress = copyFromName ? watch(copyFromName) : null;

  const handleFieldChange = (field, value) => {
    setValue(`${name}.${field}`, value, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const handleCopyFromBilling = (isChecked) => {
    setSameAsBilling(isChecked);

    if (isChecked && billingAddress) {
      const fields = [
        "first_name",
        "last_name",
        "company",
        "address_1",
        "address_2",
        "city",
        "state",
        "postcode",
        "country",
      ];

      fields.forEach((field) => {
        setValue(`${name}.${field}`, billingAddress[field] || "", {
          shouldValidate: false,
          shouldDirty: true,
        });
      });
    }
  };

  return (
    <div className="flex flex-col w-full gap-4 px-2">
      <div className="flex items-center gap-1.5">
        {helperText && (
          <HoverCard openDelay={300}>
            <HoverCardTrigger asChild>
              <Info className="h-3 w-3 text-fuchsia-600 opacity-60 hover:opacity-100 cursor-pointer" />
            </HoverCardTrigger>
            <HoverCardContent
              className="max-w-xs text-sm break-words z-[9999] shadow-md p-3"
              align="start"
              avoidCollisions
              collisionPadding={10}
              sideOffset={5}
            >
              <p className="whitespace-pre-wrap break-words">{__(helperText, "whizmanage")}</p>
            </HoverCardContent>
          </HoverCard>
        )}
        <Label className="text-lg font-semibold">{__(label, "whizmanage")}</Label>
      </div>
      {/* Same as billing checkbox */}
      {showCopyCheckbox && (
        <Checkbox
          isSelected={sameAsBilling}
          onValueChange={handleCopyFromBilling}
          color="primary"
          classNames={{
            label: "font-medium text-base text-muted-foreground",
            wrapper:
              "!ring-fuchsia-600 [&:focus-visible]:!ring-fuchsia-600 [&:focus]:!ring-fuchsia-600",
          }}
        >
          {__("Same as billing address", "whizmanage")}
        </Checkbox>
      )}
      {(!showCopyCheckbox || !sameAsBilling) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* First Name */}
          <Controller
            name={`${name}.first_name`}
            control={control}
            defaultValue=""
            render={({ field }) => (
              <div className="flex flex-col gap-1.5">
                <Label>{__("First Name", "whizmanage")}</Label>
                <Input
                  {...field}
                  className="h-10 dark:bg-slate-700"
                  placeholder={__("First Name", "whizmanage")}
                />
              </div>
            )}
          />

          {/* Last Name */}
          <Controller
            name={`${name}.last_name`}
            control={control}
            defaultValue=""
            render={({ field }) => (
              <div className="flex flex-col gap-1.5">
                <Label>{__("Last Name", "whizmanage")}</Label>
                <Input
                  {...field}
                  className="h-10 dark:bg-slate-700"
                  placeholder={__("Last Name", "whizmanage")}
                />
              </div>
            )}
          />

          {/* Email (billing only) */}
          {showEmail && (
            <Controller
              name={`${name}.email`}
              control={control}
              defaultValue=""
              render={({ field }) => (
                <div className="flex flex-col gap-1.5">
                  <Label>{__("Email", "whizmanage")}</Label>
                  <Input
                    {...field}
                    type="email"
                    className="h-10 dark:bg-slate-700"
                    placeholder={__("Email", "whizmanage")}
                  />
                </div>
              )}
            />
          )}

          {/* Phone (billing only) */}
          {showPhone && (
            <Controller
              name={`${name}.phone`}
              control={control}
              defaultValue=""
              render={({ field }) => (
                <div className="flex flex-col gap-1.5">
                  <Label>{__("Phone", "whizmanage")}</Label>
                  <Input
                    {...field}
                    className="h-10 dark:bg-slate-700"
                    placeholder={__("Phone", "whizmanage")}
                  />
                </div>
              )}
            />
          )}

          {/* Company */}
          <Controller
            name={`${name}.company`}
            control={control}
            defaultValue=""
            render={({ field }) => (
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <Label>{__("Company (optional)", "whizmanage")}</Label>
                <Input
                  {...field}
                  className="h-10 dark:bg-slate-700"
                  placeholder={__("Company", "whizmanage")}
                />
              </div>
            )}
          />

          {/* Address Line 1 */}
          <Controller
            name={`${name}.address_1`}
            control={control}
            defaultValue=""
            render={({ field }) => (
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <Label>{__("Address Line 1", "whizmanage")}</Label>
                <Input
                  {...field}
                  className="h-10 dark:bg-slate-700"
                  placeholder={__("Street address", "whizmanage")}
                />
              </div>
            )}
          />

          {/* Address Line 2 */}
          <Controller
            name={`${name}.address_2`}
            control={control}
            defaultValue=""
            render={({ field }) => (
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <Label>{__("Address Line 2 (optional)", "whizmanage")}</Label>
                <Input
                  {...field}
                  className="h-10 dark:bg-slate-700"
                  placeholder={__("Apartment, suite, etc.", "whizmanage")}
                />
              </div>
            )}
          />

          {/* City */}
          <Controller
            name={`${name}.city`}
            control={control}
            defaultValue=""
            render={({ field }) => (
              <div className="flex flex-col gap-1.5">
                <Label>{__("City", "whizmanage")}</Label>
                <Input
                  {...field}
                  className="h-10 dark:bg-slate-700"
                  placeholder={__("City", "whizmanage")}
                />
              </div>
            )}
          />

          {/* State */}
          <Controller
            name={`${name}.state`}
            control={control}
            defaultValue=""
            render={({ field }) => (
              <div className="flex flex-col gap-1.5">
                <Label>{__("State/Province", "whizmanage")}</Label>
                <Input
                  {...field}
                  className="h-10 dark:bg-slate-700"
                  placeholder={__("State", "whizmanage")}
                />
              </div>
            )}
          />

          {/* Postcode */}
          <Controller
            name={`${name}.postcode`}
            control={control}
            defaultValue=""
            render={({ field }) => (
              <div className="flex flex-col gap-1.5">
                <Label>{__("Postal Code", "whizmanage")}</Label>
                <Input
                  {...field}
                  className="h-10 dark:bg-slate-700"
                  placeholder={__("ZIP/Postal code", "whizmanage")}
                />
              </div>
            )}
          />

          {/* Country */}
          <Controller
            name={`${name}.country`}
            control={control}
            defaultValue="IL"
            render={({ field }) => (
              <div className="flex flex-col gap-1.5">
                <Label>{__("Country", "whizmanage")}</Label>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-10 dark:bg-slate-700">
                    <SelectValue>
                      {COUNTRIES.find((c) => c.code === field.value)?.name ||
                        field.value}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          />
        </div>
      )}
    </div>
  );
}