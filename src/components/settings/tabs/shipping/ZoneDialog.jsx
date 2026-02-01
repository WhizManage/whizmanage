// src/components/settings/tabs/shipping/ZoneDialog.jsx

import { useState, useEffect } from "react";
import { __ } from "@wordpress/i18n";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { MapPin, X, ChevronDown, Loader2, Check, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ZoneDialog({
  open,
  onOpenChange,
  zone,
  availableLocations,
  onSave,
  isSaving,
}) {
  const [name, setName] = useState("");
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [locationPopoverOpen, setLocationPopoverOpen] = useState(false);
  const [enablePostcodes, setEnablePostcodes] = useState(false);
  const [postcodes, setPostcodes] = useState("");

  const isEditing = !!zone;

  // Initialize form when dialog opens
  useEffect(() => {
    if (open) {
      if (zone) {
        setName(zone.name);
        // Separate postcodes from other locations
        const postcodeLocations = zone.locations?.filter(
          (loc) => loc.type === "postcode"
        ) || [];
        const otherLocations = zone.locations?.filter(
          (loc) => loc.type !== "postcode"
        ) || [];

        setSelectedLocations(otherLocations);

        if (postcodeLocations.length > 0) {
          setEnablePostcodes(true);
          setPostcodes(postcodeLocations.map((loc) => loc.code).join("\n"));
        } else {
          setEnablePostcodes(false);
          setPostcodes("");
        }
      } else {
        setName("");
        setSelectedLocations([]);
        setEnablePostcodes(false);
        setPostcodes("");
      }
    }
  }, [open, zone]);

  const handleSave = async () => {
    if (!name.trim()) return;

    // Combine locations with postcodes
    let allLocations = [...selectedLocations];

    if (enablePostcodes && postcodes.trim()) {
      const postcodeList = postcodes
        .split(/[\n,;]+/)
        .map((p) => p.trim())
        .filter((p) => p);

      postcodeList.forEach((code) => {
        allLocations.push({ code, type: "postcode" });
      });
    }

    await onSave({
      name: name.trim(),
      locations: allLocations,
    });
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const toggleLocation = (code, type) => {
    const exists = selectedLocations.some(
      (loc) => loc.code === code && loc.type === type
    );

    if (exists) {
      setSelectedLocations((prev) =>
        prev.filter((loc) => !(loc.code === code && loc.type === type))
      );
    } else {
      setSelectedLocations((prev) => [...prev, { code, type }]);
    }
  };

  const removeLocation = (code, type) => {
    setSelectedLocations((prev) =>
      prev.filter((loc) => !(loc.code === code && loc.type === type))
    );
  };

  const getLocationLabel = (code, type) => {
    if (type === "continent") {
      const continent = availableLocations.continents?.find(
        (c) => c.code === code
      );
      return continent?.name || code;
    }

    if (type === "country") {
      const country = availableLocations.countries?.find((c) => c.code === code);
      return country?.name || code;
    }

    if (type === "state") {
      const [countryCode, stateCode] = code.split(":");
      const country = availableLocations.countries?.find(
        (c) => c.code === countryCode
      );
      const state = country?.states?.find((s) => s.code === code);
      return state ? `${state.name}, ${country?.name}` : code;
    }

    return code;
  };

  const isLocationSelected = (code, type) => {
    return selectedLocations.some(
      (loc) => loc.code === code && loc.type === type
    );
  };

  // Check if any country or state is selected (needed for postcodes)
  const hasCountryOrState = selectedLocations.some(
    (loc) => loc.type === "country" || loc.type === "state"
  );

  const isRtl = window?.document?.documentElement?.dir === "rtl";

  return (
    <Dialog open={open} onOpenChange={onOpenChange} dir={isRtl ? "rtl" : "ltr"}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-fuchsia-600" />
            {isEditing
              ? __("Edit Shipping Zone", "whizmanage")
              : __("Add Shipping Zone", "whizmanage")}
          </DialogTitle>
          <DialogDescription>
            {__(
              "Set the zone name and select the regions it covers.",
              "whizmanage"
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Zone Name */}
          <div className="space-y-2">
            <Label htmlFor="zone-name">{__("Zone Name", "whizmanage")}</Label>
            <Input
              id="zone-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={__("e.g., United States, Europe", "whizmanage")}
              className="dark:bg-slate-700"
            />
          </div>

          {/* Zone Locations */}
          <div className="space-y-2">
            <Label>{__("Zone Regions", "whizmanage")}</Label>

            {/* Location Selector */}
            <Popover
              open={locationPopoverOpen}
              onOpenChange={setLocationPopoverOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between dark:bg-slate-700 dark:border-slate-600"
                >
                  {__("Select regions...", "whizmanage")}
                  <ChevronDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder={__("Search countries...", "whizmanage")}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {__("No location found.", "whizmanage")}
                    </CommandEmpty>

                    {/* Continents */}
                    {availableLocations.continents?.length > 0 && (
                      <CommandGroup heading={__("Continents", "whizmanage")}>
                        {availableLocations.continents.map((continent) => (
                          <CommandItem
                            key={continent.code}
                            value={continent.name}
                            onSelect={() =>
                              toggleLocation(continent.code, "continent")
                            }
                          >
                            <Check
                              className={cn(
                                "me-2 h-4 w-4",
                                isLocationSelected(continent.code, "continent")
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {continent.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}

                    {/* Countries */}
                    <CommandGroup heading={__("Countries", "whizmanage")}>
                      <div className="max-h-[200px] overflow-y-auto scrollbar-whiz">
                        {availableLocations.countries?.map((country) => (
                          <div key={country.code}>
                            <CommandItem
                              value={country.name}
                              onSelect={() =>
                                toggleLocation(country.code, "country")
                              }
                            >
                              <Check
                                className={cn(
                                  "me-2 h-4 w-4",
                                  isLocationSelected(country.code, "country")
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {country.name}
                            </CommandItem>

                            {/* States (if country has them and is selected) */}
                            {country.states &&
                              isLocationSelected(country.code, "country") && (
                                <div className="ps-6">
                                  {country.states.map((state) => (
                                    <CommandItem
                                      key={state.code}
                                      value={`${country.name} ${state.name}`}
                                      onSelect={() =>
                                        toggleLocation(state.code, "state")
                                      }
                                      className="text-sm"
                                    >
                                      <Check
                                        className={cn(
                                          "me-2 h-3 w-3",
                                          isLocationSelected(
                                            state.code,
                                            "state"
                                          )
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                      />
                                      {state.name}
                                    </CommandItem>
                                  ))}
                                </div>
                              )}
                          </div>
                        ))}
                      </div>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Selected Locations */}
            {selectedLocations.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedLocations.map((loc) => (
                  <Badge
                    key={`${loc.type}-${loc.code}`}
                    variant="secondary"
                    className="gap-1 ps-2"
                  >
                    {getLocationLabel(loc.code, loc.type)}
                    <button
                      type="button"
                      onClick={() => removeLocation(loc.code, loc.type)}
                      className="ms-1 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              {__(
                "Select countries, states, or continents that this zone will cover.",
                "whizmanage"
              )}
            </p>
          </div>

          {/* ZIP/Postcodes Section */}
          {hasCountryOrState && (
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-600">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    {__("Limit to specific ZIP/postcodes", "whizmanage")}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {__(
                      "Optionally limit this zone to specific postal codes",
                      "whizmanage"
                    )}
                  </p>
                </div>
                <Switch
                  checked={enablePostcodes}
                  onCheckedChange={setEnablePostcodes}
                />
              </div>

              {enablePostcodes && (
                <div className="space-y-2">
                  <Textarea
                    value={postcodes}
                    onChange={(e) => setPostcodes(e.target.value)}
                    placeholder={__(
                      "Enter postcodes, one per line or separated by commas...\n\nExamples:\n12345\n12345...12350 (range)\n123* (wildcard)",
                      "whizmanage"
                    )}
                    className="dark:bg-slate-700 min-h-[100px] font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    {__(
                      "Use ranges (12345...12350) or wildcards (123*) for multiple postcodes.",
                      "whizmanage"
                    )}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            {__("Cancel", "whizmanage")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || isSaving}
            className="bg-fuchsia-600 hover:bg-fuchsia-700"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 me-2 animate-spin" />
                {__("Saving...", "whizmanage")}
              </>
            ) : isEditing ? (
              __("Update Zone", "whizmanage")
            ) : (
              __("Create Zone", "whizmanage")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
