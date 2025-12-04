import CustomTooltip from "@components/nextUI/Tooltip";
import Button from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@components/ui/popover";
import { Switch, cn } from "@heroui/react";
import { PopoverClose } from "@radix-ui/react-popover";
import { Edit } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { __ } from '@wordpress/i18n';

const ShippingEdit = ({ row }) => {
     

    // Use a ref to track if we've manually updated the value
    const hasManuallyToggled = useRef(false);

    // Only initialize from row.original if we haven't manually toggled
    const [hasShipping, setHasShipping] = useState(() => {
        const shipping = row?.original?.shipping;
        if (!shipping || Object.keys(shipping).length === 0) return false;

        // Check if any of the shipping values are non-empty strings
        return Object.values(shipping).some(value => value && value.toString().trim() !== "");
    });

    const [shippingData, setShippingData] = useState(() => {
        return row?.original?.shipping || {
            first_name: "",
            last_name: "",
            company: "",
            address_1: "",
            address_2: "",
            city: "",
            postcode: "",
            country: "",
            email: "",
            phone: ""
        };
    });

    const handleToggleShipping = () => {
        // Mark that we've manually toggled
        hasManuallyToggled.current = true;

        // Update the local state
        setHasShipping(prev => !prev);

        // If turning off shipping, clear the data
        if (hasShipping) {
            const emptyShipping = {
                first_name: "",
                last_name: "",
                company: "",
                address_1: "",
                address_2: "",
                city: "",
                postcode: "",
                country: "",
                email: "",
                phone: ""
            };
            setShippingData(emptyShipping);
            if (row) {
                row.original.shipping = emptyShipping;
            } else if (updateValue) {
                updateValue("shipping", emptyShipping);
            }
        }
    };

    const handleInputChange = (field, value) => {
        const newShippingData = { ...shippingData, [field]: value };
        setShippingData(newShippingData);
        if (row) {
            row.original.shipping = newShippingData;
        };
    };

        // Directly check hasShipping state
        const switchLabel = hasShipping
            ? __(Has Shipping")
            : __(No Shipping");

        return (
            <>
                <div className="flex gap-2">
                    <CustomTooltip
                        title={
                            hasShipping === false
                                ? __(Add Shipping Information")
                                : __(Remove Shipping Information")
                        }
                    >
                        {/* Render only the Switch with its own click handler */}
                        <div
                            className={cn(
                                "flex items-center gap-2 capitalize relative z-10 px-3 py-1 rounded-md border border-input bg-background dark:bg-slate-800",
                                "h-8"
                            )}
                        >
                            <span className={cn(
                                "text-sm",
                                hasShipping ? "text-primary" : "text-slate-500 dark:text-slate-400"
                            )}>
                                {switchLabel}
                            </span>

                            {/* Use defaultSelected instead of isSelected to force UI update */}
                            <Switch
                                key={`switch-${hasShipping}`}
                                size="sm"
                                defaultSelected={hasShipping}
                                onValueChange={handleToggleShipping}
                                aria-label={switchLabel}
                                color="primary"
                                classNames={{
                                    base: "inline-flex flex-row-reverse",
                                    label: "flex justify-center",
                                    wrapper: "p-0 h-5 overflow-visible dark:bg-slate-500",
                                    thumb: cn(
                                        "w-5 h-5 shadow-lg",
                                        "group-data-[hover=true]:border-primary",
                                        "group-data-[selected=true]:ml-5",
                                        "group-data-[pressed=true]:w-6",
                                        "group-data-[selected]:group-data-[pressed]:ml-4"
                                    ),
                                }}
                            />
                        </div>
                    </CustomTooltip>
                    {hasShipping && (
                        <Popover>
                            <CustomTooltip title={__("Edit Shipping Information")}>
                                <PopoverTrigger asChild>
                                    <Button
                                        className={cn(
                                            "flex gap-2 capitalize",
                                            "h-8"
                                        )}
                                        variant="outline"
                                        size="icon"
                                    >
                                        <Edit className="w-5 h-5" />
                                    </Button>
                                </PopoverTrigger>
                            </CustomTooltip>
                            <PopoverContent className="">
                                <div className="grid gap-4">
                                    <div className="space-y-2 mb-2">
                                        <h4 className="font-medium leading-none text-center">
                                            {__("Shipping Information")}
                                        </h4>
                                    </div>

                                    <div className="flex flex-col gap-4 p-4 text-muted-foreground">
                                        {/* Name Fields */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-2">
                                                <Label htmlFor="shipping-first-name">{__("First Name")}</Label>
                                                <Input
                                                    id="shipping-first-name"
                                                    type="text"
                                                    value={shippingData.first_name}
                                                    onChange={(e) => handleInputChange("first_name", e.target.value)}
                                                    className="h-8"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <Label htmlFor="shipping-last-name">{__("Last Name")}</Label>
                                                <Input
                                                    id="shipping-last-name"
                                                    type="text"
                                                    value={shippingData.last_name}
                                                    onChange={(e) => handleInputChange("last_name", e.target.value)}
                                                    className="h-8"
                                                />
                                            </div>
                                        </div>

                                        {/* Company */}
                                        <div className="flex flex-col gap-2">
                                            <Label htmlFor="shipping-company">{__("Company")}</Label>
                                            <Input
                                                id="shipping-company"
                                                type="text"
                                                value={shippingData.company}
                                                onChange={(e) => handleInputChange("company", e.target.value)}
                                                className="h-8"
                                            />
                                        </div>

                                        {/* Address Fields */}
                                        <div className="flex flex-col gap-2">
                                            <Label htmlFor="shipping-address-1">{__("Address Line 1")}</Label>
                                            <Input
                                                id="shipping-address-1"
                                                type="text"
                                                value={shippingData.address_1}
                                                onChange={(e) => handleInputChange("address_1", e.target.value)}
                                                className="h-8"
                                            />
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <Label htmlFor="shipping-address-2">{__("Address Line 2")}</Label>
                                            <Input
                                                id="shipping-address-2"
                                                type="text"
                                                value={shippingData.address_2}
                                                onChange={(e) => handleInputChange("address_2", e.target.value)}
                                                className="h-8"
                                            />
                                        </div>

                                        {/* City and Postcode */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-2">
                                                <Label htmlFor="shipping-city">{__("City")}</Label>
                                                <Input
                                                    id="shipping-city"
                                                    type="text"
                                                    value={shippingData.city}
                                                    onChange={(e) => handleInputChange("city", e.target.value)}
                                                    className="h-8"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <Label htmlFor="shipping-postcode">{__("Postcode")}</Label>
                                                <Input
                                                    id="shipping-postcode"
                                                    type="text"
                                                    value={shippingData.postcode}
                                                    onChange={(e) => handleInputChange("postcode", e.target.value)}
                                                    className="h-8"
                                                />
                                            </div>
                                        </div>

                                        {/* Country */}
                                        <div className="flex flex-col gap-2">
                                            <Label htmlFor="shipping-country">{__("Country")}</Label>
                                            <Input
                                                id="shipping-country"
                                                type="text"
                                                value={shippingData.country}
                                                onChange={(e) => handleInputChange("country", e.target.value)}
                                                className="h-8"
                                            />
                                        </div>

                                        {/* Contact Information */}
                                        <div className="flex flex-col gap-2">
                                            <Label htmlFor="shipping-email">{__("Email")}</Label>
                                            <Input
                                                id="shipping-email"
                                                type="email"
                                                value={shippingData.email}
                                                onChange={(e) => handleInputChange("email", e.target.value)}
                                                className="h-8"
                                            />
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <Label htmlFor="shipping-phone">{__("Phone")}</Label>
                                            <Input
                                                id="shipping-phone"
                                                type="tel"
                                                value={shippingData.phone}
                                                onChange={(e) => handleInputChange("phone", e.target.value)}
                                                className="h-8"
                                            />
                                        </div>
                                    </div>

                                    <div className="w-full flex justify-end">
                                        <PopoverClose asChild>
                                            <Button className="gap-2">{__("Save")}</Button>
                                        </PopoverClose>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}
                </div>
            </>
        );
    };

    export default ShippingEdit;