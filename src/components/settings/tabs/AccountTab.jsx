// src/components/settings/tabs/AccountTab.jsx

import { useMemo, useState } from "react";
import { __ } from "@wordpress/i18n";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Store,
  Mail,
  Phone,
  Calendar,
  ExternalLink,
  Copy,
  CreditCard,
  Truck,
  Globe,
  FileText,
} from "lucide-react";
import { addToast } from "@heroui/react";
import SettingsCardHeader from "../SettingsCardHeader";

export default function AccountTab({ userInfo, countries = [], onUpdateUserInfo }) {
  const [copyingShipping, setCopyingShipping] = useState(false);

  if (!userInfo) {
    return null;
  }

  const { current_user, store_owner, store_info, billing, shipping } = userInfo;

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Get initials for avatar fallback
  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Get states for a country
  const getStatesForCountry = (countryCode) => {
    const country = countries.find((c) => c.code === countryCode);
    return country?.states || [];
  };

  // Copy billing to shipping
  const handleCopyBillingToShipping = () => {
    if (!billing) return;
    setCopyingShipping(true);

    const fieldsToCopy = [
      'first_name', 'last_name', 'company', 'address_1', 'address_2',
      'city', 'postcode', 'state', 'country', 'phone'
    ];

    fieldsToCopy.forEach(field => {
      if (billing[field]) {
        onUpdateUserInfo("shipping", field, billing[field]);
      }
    });

    addToast({
      title: __("Copied", "whizmanage"),
      description: __("Billing address copied to shipping address", "whizmanage"),
      color: "success",
    });

    setTimeout(() => setCopyingShipping(false), 500);
  };

  // Open Gravatar in new tab
  const openGravatar = () => {
    window.open(current_user?.gravatar_edit_url || 'https://gravatar.com/profile', '_blank');
  };

  const billingStates = useMemo(() => getStatesForCountry(billing?.country), [billing?.country, countries]);
  const shippingStates = useMemo(() => getStatesForCountry(shipping?.country), [shipping?.country, countries]);

  return (
    <div className="space-y-6 text-start">
      {/* Current User Card */}
      <Card className="bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600">
        <SettingsCardHeader
          icon={User}
          title={__("Your Profile", "whizmanage")}
          description={__("Your account information and settings", "whizmanage")}
        />
        <CardContent className="space-y-6">
          {/* Avatar and basic info */}
          <div className="flex items-start gap-6">
            <div className="flex flex-col items-center gap-2">
              <Avatar className="w-24 h-24">
                <AvatarImage src={current_user?.avatar_url} alt={current_user?.display_name} />
                <AvatarFallback className="text-xl bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-900/50 dark:text-fuchsia-300">
                  {getInitials(current_user?.display_name)}
                </AvatarFallback>
              </Avatar>
              <Button
                variant="outline"
                size="sm"
                onClick={openGravatar}
                className="text-xs dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                <ExternalLink className="w-3 h-3 me-1" />
                {__("Change on Gravatar", "whizmanage")}
              </Button>
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {current_user?.display_name}
              </h3>
              <p className="text-sm text-muted-foreground">@{current_user?.username}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {current_user?.roles?.map((role) => (
                  <Badge key={role} variant="secondary" className="capitalize bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300">
                    {role.replace("_", " ")}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                <Calendar className="w-4 h-4" />
                {__("Member since", "whizmanage")}: {formatDate(current_user?.registered)}
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
            {__("Your profile image is managed through Gravatar and is linked to your email address.", "whizmanage")}
          </p>

          <hr className="border-slate-200 dark:border-slate-600" />

          {/* Name fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">{__("First Name", "whizmanage")}</Label>
              <Input
                id="first_name"
                value={current_user?.first_name || ""}
                onChange={(e) =>
                  onUpdateUserInfo("current_user", "first_name", e.target.value)
                }
                placeholder={__("First name", "whizmanage")}
                className="dark:bg-slate-700 text-start placeholder:text-start"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">{__("Last Name", "whizmanage")}</Label>
              <Input
                id="last_name"
                value={current_user?.last_name || ""}
                onChange={(e) =>
                  onUpdateUserInfo("current_user", "last_name", e.target.value)
                }
                placeholder={__("Last name", "whizmanage")}
                className="dark:bg-slate-700 text-start placeholder:text-start"
              />
            </div>
          </div>

          {/* Nickname & Display Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nickname">{__("Nickname", "whizmanage")}</Label>
              <Input
                id="nickname"
                value={current_user?.nickname || ""}
                onChange={(e) =>
                  onUpdateUserInfo("current_user", "nickname", e.target.value)
                }
                placeholder={__("Nickname", "whizmanage")}
                className="dark:bg-slate-700 text-start placeholder:text-start"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="display_name">{__("Display Name", "whizmanage")}</Label>
              <Input
                id="display_name"
                value={current_user?.display_name || ""}
                onChange={(e) =>
                  onUpdateUserInfo("current_user", "display_name", e.target.value)
                }
                placeholder={__("Display name", "whizmanage")}
                className="dark:bg-slate-700 text-start placeholder:text-start"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">{__("Email", "whizmanage")}</Label>
            <Input
              id="email"
              type="email"
              value={current_user?.email || ""}
              onChange={(e) =>
                onUpdateUserInfo("current_user", "email", e.target.value)
              }
              placeholder={__("Email address", "whizmanage")}
              className="dark:bg-slate-700 text-start placeholder:text-start"
              dir="ltr"
            />
          </div>

          {/* Website */}
          <div className="space-y-2">
            <Label htmlFor="user_url" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              {__("Website", "whizmanage")}
            </Label>
            <Input
              id="user_url"
              type="url"
              value={current_user?.user_url || ""}
              onChange={(e) =>
                onUpdateUserInfo("current_user", "user_url", e.target.value)
              }
              placeholder="https://example.com"
              className="dark:bg-slate-700 text-start placeholder:text-start"
              dir="ltr"
            />
          </div>
        </CardContent>
      </Card>

      {/* Biographical Info Card */}
      <Card className="bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600">
        <SettingsCardHeader
          icon={FileText}
          title={__("About You", "whizmanage")}
          description={__("Biographical information that may be displayed publicly", "whizmanage")}
        />
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="description">{__("Biographical Info", "whizmanage")}</Label>
            <Textarea
              id="description"
              value={current_user?.description || ""}
              onChange={(e) =>
                onUpdateUserInfo("current_user", "description", e.target.value)
              }
              placeholder={__("Share a little biographical information to fill out your profile. This may be shown publicly.", "whizmanage")}
              className="dark:bg-slate-700 text-start placeholder:text-start min-h-[100px]"
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Billing Address Card */}
      {billing && (
        <Card className="bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600">
          <SettingsCardHeader
            icon={CreditCard}
            title={__("Billing Address", "whizmanage")}
            description={__("Your billing address for orders", "whizmanage")}
          />
          <CardContent className="space-y-4">
            {/* Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{__("First Name", "whizmanage")}</Label>
                <Input
                  value={billing?.first_name || ""}
                  onChange={(e) => onUpdateUserInfo("billing", "first_name", e.target.value)}
                  className="dark:bg-slate-700 text-start"
                />
              </div>
              <div className="space-y-2">
                <Label>{__("Last Name", "whizmanage")}</Label>
                <Input
                  value={billing?.last_name || ""}
                  onChange={(e) => onUpdateUserInfo("billing", "last_name", e.target.value)}
                  className="dark:bg-slate-700 text-start"
                />
              </div>
            </div>

            {/* Company */}
            <div className="space-y-2">
              <Label>{__("Company", "whizmanage")}</Label>
              <Input
                value={billing?.company || ""}
                onChange={(e) => onUpdateUserInfo("billing", "company", e.target.value)}
                className="dark:bg-slate-700 text-start"
              />
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label>{__("Address Line 1", "whizmanage")}</Label>
              <Input
                value={billing?.address_1 || ""}
                onChange={(e) => onUpdateUserInfo("billing", "address_1", e.target.value)}
                placeholder={__("Street address", "whizmanage")}
                className="dark:bg-slate-700 text-start placeholder:text-start"
              />
            </div>
            <div className="space-y-2">
              <Label>{__("Address Line 2", "whizmanage")}</Label>
              <Input
                value={billing?.address_2 || ""}
                onChange={(e) => onUpdateUserInfo("billing", "address_2", e.target.value)}
                placeholder={__("Apartment, suite, etc.", "whizmanage")}
                className="dark:bg-slate-700 text-start placeholder:text-start"
              />
            </div>

            {/* City & Postcode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{__("City", "whizmanage")}</Label>
                <Input
                  value={billing?.city || ""}
                  onChange={(e) => onUpdateUserInfo("billing", "city", e.target.value)}
                  className="dark:bg-slate-700 text-start"
                />
              </div>
              <div className="space-y-2">
                <Label>{__("Postcode / ZIP", "whizmanage")}</Label>
                <Input
                  value={billing?.postcode || ""}
                  onChange={(e) => onUpdateUserInfo("billing", "postcode", e.target.value)}
                  className="dark:bg-slate-700 text-start"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Country & State */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{__("Country / Region", "whizmanage")}</Label>
                <Select
                  value={billing?.country || ""}
                  onValueChange={(value) => onUpdateUserInfo("billing", "country", value)}
                >
                  <SelectTrigger className="dark:bg-slate-700 text-start">
                    <SelectValue placeholder={__("Select country", "whizmanage")} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {countries.map((country) => (
                      <SelectItem key={country.code} value={country.code} className="text-start">
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {billingStates.length > 0 && (
                <div className="space-y-2">
                  <Label>{__("State / Province", "whizmanage")}</Label>
                  <Select
                    value={billing?.state || ""}
                    onValueChange={(value) => onUpdateUserInfo("billing", "state", value)}
                  >
                    <SelectTrigger className="dark:bg-slate-700 text-start">
                      <SelectValue placeholder={__("Select state", "whizmanage")} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {billingStates.map((state) => (
                        <SelectItem key={state.code} value={state.code} className="text-start">
                          {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Phone & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {__("Phone", "whizmanage")}
                </Label>
                <Input
                  type="tel"
                  value={billing?.phone || ""}
                  onChange={(e) => onUpdateUserInfo("billing", "phone", e.target.value)}
                  className="dark:bg-slate-700 text-start"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {__("Email", "whizmanage")}
                </Label>
                <Input
                  type="email"
                  value={billing?.email || ""}
                  onChange={(e) => onUpdateUserInfo("billing", "email", e.target.value)}
                  className="dark:bg-slate-700 text-start"
                  dir="ltr"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shipping Address Card */}
      {shipping && (
        <Card className="bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600">
          <SettingsCardHeader
            icon={Truck}
            title={__("Shipping Address", "whizmanage")}
            description={__("Your shipping address for deliveries", "whizmanage")}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyBillingToShipping}
              disabled={copyingShipping}
              className="dark:bg-slate-700 dark:hover:bg-slate-600 shrink-0"
            >
              <Copy className="w-4 h-4 sm:me-2" />
              <span className="hidden sm:inline">{__("Copy from billing", "whizmanage")}</span>
            </Button>
          </SettingsCardHeader>
          <CardContent className="space-y-4">
            {/* Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{__("First Name", "whizmanage")}</Label>
                <Input
                  value={shipping?.first_name || ""}
                  onChange={(e) => onUpdateUserInfo("shipping", "first_name", e.target.value)}
                  className="dark:bg-slate-700 text-start"
                />
              </div>
              <div className="space-y-2">
                <Label>{__("Last Name", "whizmanage")}</Label>
                <Input
                  value={shipping?.last_name || ""}
                  onChange={(e) => onUpdateUserInfo("shipping", "last_name", e.target.value)}
                  className="dark:bg-slate-700 text-start"
                />
              </div>
            </div>

            {/* Company */}
            <div className="space-y-2">
              <Label>{__("Company", "whizmanage")}</Label>
              <Input
                value={shipping?.company || ""}
                onChange={(e) => onUpdateUserInfo("shipping", "company", e.target.value)}
                className="dark:bg-slate-700 text-start"
              />
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label>{__("Address Line 1", "whizmanage")}</Label>
              <Input
                value={shipping?.address_1 || ""}
                onChange={(e) => onUpdateUserInfo("shipping", "address_1", e.target.value)}
                placeholder={__("Street address", "whizmanage")}
                className="dark:bg-slate-700 text-start placeholder:text-start"
              />
            </div>
            <div className="space-y-2">
              <Label>{__("Address Line 2", "whizmanage")}</Label>
              <Input
                value={shipping?.address_2 || ""}
                onChange={(e) => onUpdateUserInfo("shipping", "address_2", e.target.value)}
                placeholder={__("Apartment, suite, etc.", "whizmanage")}
                className="dark:bg-slate-700 text-start placeholder:text-start"
              />
            </div>

            {/* City & Postcode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{__("City", "whizmanage")}</Label>
                <Input
                  value={shipping?.city || ""}
                  onChange={(e) => onUpdateUserInfo("shipping", "city", e.target.value)}
                  className="dark:bg-slate-700 text-start"
                />
              </div>
              <div className="space-y-2">
                <Label>{__("Postcode / ZIP", "whizmanage")}</Label>
                <Input
                  value={shipping?.postcode || ""}
                  onChange={(e) => onUpdateUserInfo("shipping", "postcode", e.target.value)}
                  className="dark:bg-slate-700 text-start"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Country & State */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{__("Country / Region", "whizmanage")}</Label>
                <Select
                  value={shipping?.country || ""}
                  onValueChange={(value) => onUpdateUserInfo("shipping", "country", value)}
                >
                  <SelectTrigger className="dark:bg-slate-700 text-start">
                    <SelectValue placeholder={__("Select country", "whizmanage")} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {countries.map((country) => (
                      <SelectItem key={country.code} value={country.code} className="text-start">
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {shippingStates.length > 0 && (
                <div className="space-y-2">
                  <Label>{__("State / Province", "whizmanage")}</Label>
                  <Select
                    value={shipping?.state || ""}
                    onValueChange={(value) => onUpdateUserInfo("shipping", "state", value)}
                  >
                    <SelectTrigger className="dark:bg-slate-700 text-start">
                      <SelectValue placeholder={__("Select state", "whizmanage")} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {shippingStates.map((state) => (
                        <SelectItem key={state.code} value={state.code} className="text-start">
                          {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2 sm:max-w-[calc(50%-0.5rem)]">
              <Label className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                {__("Phone", "whizmanage")}
              </Label>
              <Input
                type="tel"
                value={shipping?.phone || ""}
                onChange={(e) => onUpdateUserInfo("shipping", "phone", e.target.value)}
                className="dark:bg-slate-700 text-start"
                dir="ltr"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Store Info Card */}
      {store_info && (
        <Card className="bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600">
          <SettingsCardHeader
            icon={Store}
            title={__("Store Information", "whizmanage")}
            description={__("Your store's contact information", "whizmanage")}
          />
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="store_name">{__("Store Name", "whizmanage")}</Label>
              <Input
                id="store_name"
                value={store_info?.store_name || ""}
                onChange={(e) =>
                  onUpdateUserInfo("store_info", "store_name", e.target.value)
                }
                placeholder={__("Your store name", "whizmanage")}
                className="dark:bg-slate-700 text-start placeholder:text-start"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="store_email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {__("Store Email", "whizmanage")}
                </Label>
                <Input
                  id="store_email"
                  type="email"
                  value={store_info?.store_email || ""}
                  onChange={(e) =>
                    onUpdateUserInfo("store_info", "store_email", e.target.value)
                  }
                  placeholder={__("store@example.com", "whizmanage")}
                  className="dark:bg-slate-700 text-start placeholder:text-start"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="store_phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {__("Store Phone", "whizmanage")}
                </Label>
                <Input
                  id="store_phone"
                  type="tel"
                  value={store_info?.store_phone || ""}
                  onChange={(e) =>
                    onUpdateUserInfo("store_info", "store_phone", e.target.value)
                  }
                  placeholder={__("Phone number", "whizmanage")}
                  className="dark:bg-slate-700 text-start placeholder:text-start"
                  dir="ltr"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Store Owner Card (if different from current user) */}
      {store_owner && store_owner.id !== current_user?.id && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
          <CardHeader>
            <CardTitle className="text-slate-800 dark:text-slate-100 text-base">
              {__("Store Owner", "whizmanage")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={store_owner?.avatar_url} alt={store_owner?.display_name} />
                <AvatarFallback className="bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300">
                  {getInitials(store_owner?.display_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-100">
                  {store_owner?.display_name}
                </p>
                <p className="text-sm text-muted-foreground">{store_owner?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
