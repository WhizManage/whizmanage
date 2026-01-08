// src/components/settings/tabs/GeneralTab.jsx

import { useMemo, useState } from "react";
import { __ } from "@wordpress/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Globe, MapPin, Clock, Calendar, ShoppingCart, Users, Languages, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import SettingsCardHeader from "../SettingsCardHeader";

// Common date formats
const DATE_FORMATS = [
  { value: "F j, Y", label: "January 1, 2025" },
  { value: "Y-m-d", label: "2025-01-01" },
  { value: "m/d/Y", label: "01/01/2025" },
  { value: "d/m/Y", label: "01/01/2025" },
  { value: "d.m.Y", label: "01.01.2025" },
  { value: "j F Y", label: "1 January 2025" },
];

// Common time formats
const TIME_FORMATS = [
  { value: "g:i a", label: "1:30 pm" },
  { value: "g:i A", label: "1:30 PM" },
  { value: "H:i", label: "13:30" },
  { value: "H:i:s", label: "13:30:00" },
];

// Days of week
const DAYS_OF_WEEK = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

// Recently used languages storage key
const RECENT_LANGUAGES_KEY = "whizmanage_recent_languages";
const MAX_RECENT_LANGUAGES = 5;

// Get recently used languages from localStorage
const getRecentLanguages = () => {
  try {
    const stored = localStorage.getItem(RECENT_LANGUAGES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Save language to recently used
const saveRecentLanguage = (locale) => {
  try {
    const recent = getRecentLanguages();
    const filtered = recent.filter((l) => l !== locale);
    const updated = [locale, ...filtered].slice(0, MAX_RECENT_LANGUAGES);
    localStorage.setItem(RECENT_LANGUAGES_KEY, JSON.stringify(updated));
  } catch {
    // Ignore localStorage errors
  }
};

export default function GeneralTab({ settings, countries = [], languages = [], timezones = [], roles = [], onUpdate }) {
  const [languageOpen, setLanguageOpen] = useState(false);
  const [timezoneOpen, setTimezoneOpen] = useState(false);
  const [recentLocales, setRecentLocales] = useState(() => getRecentLanguages());

  // Get current language info
  const currentLanguage = useMemo(() => {
    const locale = settings.WPLANG || "en_US";
    return languages.find((l) => l.locale === locale) || { locale: "en_US", name: "English (United States)", native_name: "English (United States)" };
  }, [languages, settings.WPLANG]);

  // Get recently used languages objects
  const recentLanguages = useMemo(() => {
    return recentLocales
      .map((locale) => languages.find((l) => l.locale === locale))
      .filter(Boolean);
  }, [recentLocales, languages]);

  // Get other languages (not in recent)
  const otherLanguages = useMemo(() => {
    return languages.filter((l) => !recentLocales.includes(l.locale));
  }, [languages, recentLocales]);

  // Handle language selection
  const handleLanguageSelect = (lang) => {
    const newLocale = lang.locale === "en_US" ? "" : lang.locale;
    onUpdate("WPLANG", newLocale);
    saveRecentLanguage(lang.locale);
    setRecentLocales(getRecentLanguages());
    setLanguageOpen(false);
  };

  // Get current timezone display
  const currentTimezone = useMemo(() => {
    const tzString = settings.timezone_string;
    const gmtOffset = settings.gmt_offset;

    if (tzString) {
      const tz = timezones.find((t) => t.value === tzString);
      return tz?.label || tzString;
    }

    if (gmtOffset !== undefined && gmtOffset !== "") {
      const offset = parseFloat(gmtOffset);
      if (offset === 0) return "UTC";
      const sign = offset >= 0 ? "+" : "";
      const hours = Math.floor(Math.abs(offset));
      const mins = (Math.abs(offset) - hours) * 60;
      const minsStr = mins > 0 ? ":" + String(mins).padStart(2, "0") : "";
      return `UTC${sign}${offset >= 0 ? hours : -hours}${minsStr}`;
    }

    return "UTC";
  }, [settings.timezone_string, settings.gmt_offset, timezones]);

  // Parse country:state format
  const countryValue = useMemo(() => {
    const val = settings.woocommerce_default_country || "";
    return val.split(":")[0];
  }, [settings.woocommerce_default_country]);

  const stateValue = useMemo(() => {
    const val = settings.woocommerce_default_country || "";
    const parts = val.split(":");
    return parts.length > 1 ? parts[1] : "";
  }, [settings.woocommerce_default_country]);

  // Get states for selected country
  const selectedCountryStates = useMemo(() => {
    const country = countries.find((c) => c.code === countryValue);
    return country?.states || [];
  }, [countries, countryValue]);

  // Group timezones
  const groupedTimezones = useMemo(() => {
    const utcOffsets = timezones.filter((tz) => tz.type === "offset");
    const tzStrings = timezones.filter((tz) => tz.type === "timezone");
    return { utcOffsets, tzStrings };
  }, [timezones]);

  const handleCountryChange = (newCountry) => {
    onUpdate("woocommerce_default_country", newCountry);
  };

  const handleStateChange = (newState) => {
    if (newState) {
      onUpdate("woocommerce_default_country", `${countryValue}:${newState}`);
    } else {
      onUpdate("woocommerce_default_country", countryValue);
    }
  };

  const handleTimezoneSelect = (tz) => {
    if (tz.type === "offset") {
      onUpdate("timezone_string", "");
      onUpdate("gmt_offset", tz.value === "UTC" ? "0" : tz.value);
    } else {
      onUpdate("timezone_string", tz.value);
      onUpdate("gmt_offset", "");
    }
    setTimezoneOpen(false);
  };

  return (
    <div className="space-y-6 text-start">
      {/* Site Identity Card */}
      <Card className="bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600">
        <SettingsCardHeader
          icon={Globe}
          title={__("Site Identity", "whizmanage")}
          description={__("Basic information about your WordPress site", "whizmanage")}
        />
        <CardContent className="space-y-4">
          {/* Site Title */}
          <div className="space-y-2">
            <Label htmlFor="blogname">{__("Site Title", "whizmanage")}</Label>
            <Input
              id="blogname"
              value={settings.blogname || ""}
              onChange={(e) => onUpdate("blogname", e.target.value)}
              placeholder={__("My WordPress Site", "whizmanage")}
              className="dark:bg-slate-700 text-start placeholder:text-start"
            />
          </div>

          {/* Tagline */}
          <div className="space-y-2">
            <Label htmlFor="blogdescription">{__("Tagline", "whizmanage")}</Label>
            <Input
              id="blogdescription"
              value={settings.blogdescription || ""}
              onChange={(e) => onUpdate("blogdescription", e.target.value)}
              placeholder={__("Just another WordPress site", "whizmanage")}
              className="dark:bg-slate-700 text-start placeholder:text-start"
            />
            <p className="text-sm text-muted-foreground">
              {__("In a few words, explain what this site is about.", "whizmanage")}
            </p>
          </div>

          {/* WordPress URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="siteurl">{__("WordPress Address (URL)", "whizmanage")}</Label>
              <Input
                id="siteurl"
                type="url"
                value={settings.siteurl || ""}
                onChange={(e) => onUpdate("siteurl", e.target.value)}
                placeholder="https://example.com"
                className="dark:bg-slate-700 text-start placeholder:text-start"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="home">{__("Site Address (URL)", "whizmanage")}</Label>
              <Input
                id="home"
                type="url"
                value={settings.home || ""}
                onChange={(e) => onUpdate("home", e.target.value)}
                placeholder="https://example.com"
                className="dark:bg-slate-700 text-start placeholder:text-start"
                dir="ltr"
              />
            </div>
          </div>

          {/* Admin Email */}
          <div className="space-y-2">
            <Label htmlFor="admin_email">{__("Administration Email Address", "whizmanage")}</Label>
            <Input
              id="admin_email"
              type="email"
              value={settings.admin_email || ""}
              onChange={(e) => onUpdate("admin_email", e.target.value)}
              placeholder="admin@example.com"
              className="dark:bg-slate-700 text-start placeholder:text-start"
              dir="ltr"
            />
            <p className="text-sm text-muted-foreground">
              {__("This address is used for admin purposes.", "whizmanage")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Membership Card */}
      <Card className="bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600">
        <SettingsCardHeader
          icon={Users}
          title={__("Membership", "whizmanage")}
          description={__("User registration and role settings", "whizmanage")}
        />
        <CardContent className="space-y-4">
          {/* Anyone can register */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5 flex-1">
              <Label>{__("Anyone can register", "whizmanage")}</Label>
              <p className="text-sm text-muted-foreground">
                {__("Allow new users to register on your site", "whizmanage")}
              </p>
            </div>
            <Switch
              checked={settings.users_can_register === "1"}
              onCheckedChange={(checked) =>
                onUpdate("users_can_register", checked ? "1" : "0")
              }
            />
          </div>

          {/* Default Role */}
          <div className="space-y-2">
            <Label>{__("New User Default Role", "whizmanage")}</Label>
            <Select
              value={settings.default_role || "subscriber"}
              onValueChange={(value) => onUpdate("default_role", value)}
            >
              <SelectTrigger className="dark:bg-slate-700 text-start max-w-[300px]">
                <SelectValue placeholder={__("Select role", "whizmanage")} />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id} className="text-start">
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Site Language Card */}
      <Card className="bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600">
        <SettingsCardHeader
          icon={Languages}
          title={__("Site Language", "whizmanage")}
          description={__("Choose the language for your WordPress admin and store", "whizmanage")}
        />
        <CardContent>
          <div className="space-y-3">
            <Label className="mb-2 block">{__("Language", "whizmanage")}</Label>
            <Popover open={languageOpen} onOpenChange={setLanguageOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={languageOpen}
                  className="w-full max-w-[400px] justify-between dark:bg-slate-700 dark:hover:bg-slate-600 text-start"
                >
                  {currentLanguage.native_name || currentLanguage.name}
                  <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command className="dark:bg-slate-800">
                  <CommandInput
                    placeholder={__("Search language...", "whizmanage")}
                    className="text-start"
                  />
                  <CommandList className="max-h-[300px]">
                    <CommandEmpty>
                      {__("No language found.", "whizmanage")}
                    </CommandEmpty>
                    {recentLanguages.length > 0 && (
                      <CommandGroup heading={__("Recently Used", "whizmanage")}>
                        {recentLanguages.map((lang) => (
                          <CommandItem
                            key={`recent-${lang.locale}`}
                            value={`${lang.name} ${lang.native_name} ${lang.locale}`}
                            onSelect={() => handleLanguageSelect(lang)}
                            className="text-start"
                          >
                            <Check
                              className={cn(
                                "me-2 h-4 w-4",
                                (settings.WPLANG || "en_US") === lang.locale ||
                                (settings.WPLANG === "" && lang.locale === "en_US")
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <span className="flex-1">{lang.native_name}</span>
                            <span className="text-muted-foreground ms-2 text-xs">
                              ({lang.locale})
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                    <CommandGroup heading={recentLanguages.length > 0 ? __("All Languages", "whizmanage") : undefined}>
                      {otherLanguages.map((lang) => (
                        <CommandItem
                          key={lang.locale}
                          value={`${lang.name} ${lang.native_name} ${lang.locale}`}
                          onSelect={() => handleLanguageSelect(lang)}
                          className="text-start"
                        >
                          <Check
                            className={cn(
                              "me-2 h-4 w-4",
                              (settings.WPLANG || "en_US") === lang.locale ||
                              (settings.WPLANG === "" && lang.locale === "en_US")
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <span className="flex-1">{lang.native_name}</span>
                          <span className="text-muted-foreground ms-2 text-xs">
                            ({lang.locale})
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-sm text-muted-foreground">
              {__("Changing the language requires a page refresh to take effect.", "whizmanage")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Timezone Card */}
      <Card className="bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600">
        <SettingsCardHeader
          icon={Clock}
          title={__("Timezone", "whizmanage")}
          description={__("Choose either a city in the same timezone as you or a UTC timezone offset.", "whizmanage")}
        />
        <CardContent>
          <div className="space-y-3">
            <Label className="mb-2 block">{__("Timezone", "whizmanage")}</Label>
            <Popover open={timezoneOpen} onOpenChange={setTimezoneOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={timezoneOpen}
                  className="w-full max-w-[400px] justify-between dark:bg-slate-700 dark:hover:bg-slate-600 text-start"
                >
                  {currentTimezone}
                  <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command className="dark:bg-slate-800">
                  <CommandInput
                    placeholder={__("Search timezone...", "whizmanage")}
                    className="text-start"
                  />
                  <CommandList className="max-h-[300px]">
                    <CommandEmpty>
                      {__("No timezone found.", "whizmanage")}
                    </CommandEmpty>
                    <CommandGroup heading={__("UTC Offsets", "whizmanage")}>
                      {groupedTimezones.utcOffsets.map((tz) => (
                        <CommandItem
                          key={tz.value}
                          value={tz.label}
                          onSelect={() => handleTimezoneSelect(tz)}
                          className="text-start"
                        >
                          <Check
                            className={cn(
                              "me-2 h-4 w-4",
                              currentTimezone === tz.label ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {tz.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <CommandGroup heading={__("Timezones", "whizmanage")}>
                      {groupedTimezones.tzStrings.map((tz) => (
                        <CommandItem
                          key={tz.value}
                          value={tz.label}
                          onSelect={() => handleTimezoneSelect(tz)}
                          className="text-start"
                        >
                          <Check
                            className={cn(
                              "me-2 h-4 w-4",
                              settings.timezone_string === tz.value ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {tz.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Date and Time Format Card */}
      <Card className="bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600">
        <SettingsCardHeader
          icon={Calendar}
          title={__("Date and Time Format", "whizmanage")}
          description={__("Set the format for displaying dates and times", "whizmanage")}
        />
        <CardContent className="space-y-4">
          {/* Date Format */}
          <div className="space-y-2">
            <Label>{__("Date Format", "whizmanage")}</Label>
            <Select
              value={settings.date_format || "F j, Y"}
              onValueChange={(value) => onUpdate("date_format", value)}
            >
              <SelectTrigger className="dark:bg-slate-700 text-start max-w-[300px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_FORMATS.map((format) => (
                  <SelectItem key={format.value} value={format.value} className="text-start">
                    {format.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Label htmlFor="custom_date" className="text-sm text-muted-foreground">
                {__("Custom:", "whizmanage")}
              </Label>
              <Input
                id="custom_date"
                value={settings.date_format || ""}
                onChange={(e) => onUpdate("date_format", e.target.value)}
                placeholder="F j, Y"
                className="dark:bg-slate-700 text-start placeholder:text-start max-w-[150px]"
                dir="ltr"
              />
            </div>
          </div>

          {/* Time Format */}
          <div className="space-y-2">
            <Label>{__("Time Format", "whizmanage")}</Label>
            <Select
              value={settings.time_format || "g:i a"}
              onValueChange={(value) => onUpdate("time_format", value)}
            >
              <SelectTrigger className="dark:bg-slate-700 text-start max-w-[300px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_FORMATS.map((format) => (
                  <SelectItem key={format.value} value={format.value} className="text-start">
                    {format.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Label htmlFor="custom_time" className="text-sm text-muted-foreground">
                {__("Custom:", "whizmanage")}
              </Label>
              <Input
                id="custom_time"
                value={settings.time_format || ""}
                onChange={(e) => onUpdate("time_format", e.target.value)}
                placeholder="g:i a"
                className="dark:bg-slate-700 text-start placeholder:text-start max-w-[150px]"
                dir="ltr"
              />
            </div>
          </div>

          {/* Week Starts On */}
          <div className="space-y-2">
            <Label>{__("Week Starts On", "whizmanage")}</Label>
            <Select
              value={String(settings.start_of_week ?? "0")}
              onValueChange={(value) => onUpdate("start_of_week", value)}
            >
              <SelectTrigger className="dark:bg-slate-700 text-start max-w-[300px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS_OF_WEEK.map((day) => (
                  <SelectItem key={day.value} value={day.value} className="text-start">
                    {__(day.label, "whizmanage")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Store Address Card */}
      <Card className="bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600">
        <SettingsCardHeader
          icon={MapPin}
          title={__("Store Address", "whizmanage")}
          description={__("This is where your business is located. Tax rates and shipping costs will use this address.", "whizmanage")}
        />
        <CardContent className="space-y-4">
          {/* Address Line 1 */}
          <div className="space-y-2">
            <Label htmlFor="store_address">
              {__("Address line 1", "whizmanage")}
            </Label>
            <Input
              id="store_address"
              value={settings.woocommerce_store_address || ""}
              onChange={(e) =>
                onUpdate("woocommerce_store_address", e.target.value)
              }
              placeholder={__("Street address", "whizmanage")}
              className="dark:bg-slate-700 text-start placeholder:text-start"
            />
          </div>

          {/* Address Line 2 */}
          <div className="space-y-2">
            <Label htmlFor="store_address_2">
              {__("Address line 2", "whizmanage")}
            </Label>
            <Input
              id="store_address_2"
              value={settings.woocommerce_store_address_2 || ""}
              onChange={(e) =>
                onUpdate("woocommerce_store_address_2", e.target.value)
              }
              placeholder={__("Apartment, suite, etc.", "whizmanage")}
              className="dark:bg-slate-700 text-start placeholder:text-start"
            />
          </div>

          {/* City & Postcode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="store_city">{__("City", "whizmanage")}</Label>
              <Input
                id="store_city"
                value={settings.woocommerce_store_city || ""}
                onChange={(e) =>
                  onUpdate("woocommerce_store_city", e.target.value)
                }
                placeholder={__("City", "whizmanage")}
                className="dark:bg-slate-700 text-start placeholder:text-start"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store_postcode">
                {__("Postcode / ZIP", "whizmanage")}
              </Label>
              <Input
                id="store_postcode"
                value={settings.woocommerce_store_postcode || ""}
                onChange={(e) =>
                  onUpdate("woocommerce_store_postcode", e.target.value)
                }
                placeholder={__("Postcode", "whizmanage")}
                className="dark:bg-slate-700 text-start placeholder:text-start"
                dir="ltr"
              />
            </div>
          </div>

          {/* Country & State */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{__("Country / Region", "whizmanage")}</Label>
              <Select value={countryValue} onValueChange={handleCountryChange}>
                <SelectTrigger className="dark:bg-slate-700 text-start">
                  <SelectValue
                    placeholder={__("Select country", "whizmanage")}
                  />
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

            {selectedCountryStates.length > 0 && (
              <div className="space-y-2">
                <Label>{__("State / Province", "whizmanage")}</Label>
                <Select value={stateValue} onValueChange={handleStateChange}>
                  <SelectTrigger className="dark:bg-slate-700 text-start">
                    <SelectValue
                      placeholder={__("Select state", "whizmanage")}
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {selectedCountryStates.map((state) => (
                      <SelectItem key={state.code} value={state.code} className="text-start">
                        {state.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Features Card */}
      <Card className="bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600">
        <SettingsCardHeader
          icon={Sparkles}
          title={__("Features", "whizmanage")}
          description={__("Enable or disable store features", "whizmanage")}
        />
        <CardContent className="space-y-4">
          {/* Enable Coupons */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5 flex-1">
              <Label>{__("Enable coupons", "whizmanage")}</Label>
              <p className="text-sm text-muted-foreground">
                {__("Enable the use of coupon codes", "whizmanage")}
              </p>
            </div>
            <Switch
              checked={settings.woocommerce_enable_coupons === "yes"}
              onCheckedChange={(checked) =>
                onUpdate("woocommerce_enable_coupons", checked ? "yes" : "no")
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Checkout Card */}
      <Card className="bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600">
        <SettingsCardHeader
          icon={ShoppingCart}
          title={__("Checkout", "whizmanage")}
          description={__("Configure checkout options for your store", "whizmanage")}
        />
        <CardContent className="space-y-4">
          {/* Guest Checkout */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5 flex-1">
              <Label>{__("Guest checkout", "whizmanage")}</Label>
              <p className="text-sm text-muted-foreground">
                {__("Allow customers to place orders without an account", "whizmanage")}
              </p>
            </div>
            <Switch
              checked={settings.woocommerce_enable_guest_checkout === "yes"}
              onCheckedChange={(checked) =>
                onUpdate("woocommerce_enable_guest_checkout", checked ? "yes" : "no")
              }
            />
          </div>

          {/* Login Reminder */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5 flex-1">
              <Label>{__("Login reminder", "whizmanage")}</Label>
              <p className="text-sm text-muted-foreground">
                {__("Show a login form at checkout for returning customers", "whizmanage")}
              </p>
            </div>
            <Switch
              checked={settings.woocommerce_enable_checkout_login_reminder === "yes"}
              onCheckedChange={(checked) =>
                onUpdate("woocommerce_enable_checkout_login_reminder", checked ? "yes" : "no")
              }
            />
          </div>

          {/* Signup from Checkout */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5 flex-1">
              <Label>{__("Account creation during checkout", "whizmanage")}</Label>
              <p className="text-sm text-muted-foreground">
                {__("Allow customers to create an account during checkout", "whizmanage")}
              </p>
            </div>
            <Switch
              checked={settings.woocommerce_enable_signup_and_login_from_checkout === "yes"}
              onCheckedChange={(checked) =>
                onUpdate("woocommerce_enable_signup_and_login_from_checkout", checked ? "yes" : "no")
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
