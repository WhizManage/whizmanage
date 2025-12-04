import { IconBadge } from "@components/IconBadge";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import { Checkbox } from "@heroui/react";
import { User, MapPin } from "lucide-react";
import { useState } from "react";
import { __ } from '@wordpress/i18n';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select";

const CustomerDetails = ({ updateValue, customers }) => {
   
  const [sameAsShipping, setSameAsShipping] = useState(false);
  const [billingDetails, setBillingDetails] = useState({
    first_name: "",
    last_name: "",
    company: "",
    address_1: "",
    address_2: "",
    city: "",
    state: "",
    postcode: "",
    country: "IL",
    email: "",
    phone: "",
  });

  const [shippingDetails, setShippingDetails] = useState({
    first_name: "",
    last_name: "",
    company: "",
    address_1: "",
    address_2: "",
    city: "",
    state: "",
    postcode: "",
    country: "IL",
  });

  // Список стран - можно расширить
  const countries = [
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

  const handleBillingChange = (field, value) => {
    const updatedBilling = { ...billingDetails, [field]: value };
    setBillingDetails(updatedBilling);
    updateValue("billing", updatedBilling);

    if (sameAsShipping) {
      // If shipping address is same as billing, update shipping too
      const shippingFields = [
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

      if (shippingFields.includes(field)) {
        const updatedShipping = { ...shippingDetails, [field]: value };
        setShippingDetails(updatedShipping);
        updateValue("shipping", updatedShipping);
      }
    }
  };

  const handleShippingChange = (field, value) => {
    const updatedShipping = { ...shippingDetails, [field]: value };
    setShippingDetails(updatedShipping);
    updateValue("shipping", updatedShipping);
  };

  const handleSameAsShipping = (isChecked) => {
    setSameAsShipping(isChecked);

    if (isChecked) {
      // Copy billing info to shipping
      const newShipping = {
        first_name: billingDetails.first_name,
        last_name: billingDetails.last_name,
        company: billingDetails.company,
        address_1: billingDetails.address_1,
        address_2: billingDetails.address_2,
        city: billingDetails.city,
        state: billingDetails.state,
        postcode: billingDetails.postcode,
        country: billingDetails.country,
      };

      setShippingDetails(newShipping);
      updateValue("shipping", newShipping);
    }
  };
  const handleCustomerSelect = (customerId) => {
    const selected = customers.find((c) => c.id === +customerId);
    if (!selected) return;

    const billing = selected.billing || {};
    const shipping = selected.shipping || {};

    setBillingDetails(billing);
    setShippingDetails(shipping);
    updateValue("billing", billing);
    updateValue("shipping", shipping);
    updateValue("customer_id", selected.id);
    setSameAsShipping(false);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* CUSTOMERS */}
      {customers?.length > 0 && (
        <div className="px-1">
          <Label className="mb-1 block">{__("Select existing customer", "whizmanage")}</Label>
          <Select onValueChange={handleCustomerSelect}>
            <SelectTrigger className="h-10 dark:bg-slate-700">
              <SelectValue placeholder={__("Choose customer", "whizmanage")} />
            </SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.first_name} {c.last_name} ({c.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {/* Billing Information */}
      <div>
        <div className="flex items-center gap-x-2 mb-4">
          <IconBadge icon={User} />
          <h2 className="text-xl dark:text-gray-400">
            {__("Billing Information", "whizmanage")}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-1">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="billing_first_name">{__("First Name", "whizmanage")}</Label>
            <Input
              id="billing_first_name"
              value={billingDetails.first_name}
              onChange={(e) =>
                handleBillingChange("first_name", e.target.value)
              }
              className="h-10 dark:bg-slate-700"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="billing_last_name">{__("Last Name", "whizmanage")}</Label>
            <Input
              id="billing_last_name"
              value={billingDetails.last_name}
              onChange={(e) => handleBillingChange("last_name", e.target.value)}
              className="h-10 dark:bg-slate-700"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="billing_email">{__("Email", "whizmanage")}</Label>
            <Input
              id="billing_email"
              type="email"
              value={billingDetails.email}
              onChange={(e) => handleBillingChange("email", e.target.value)}
              className="h-10 dark:bg-slate-700 !border-input  !ring-0"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="billing_phone">{__("Phone", "whizmanage")}</Label>
            <Input
              id="billing_phone"
              value={billingDetails.phone}
              onChange={(e) => handleBillingChange("phone", e.target.value)}
              className="h-10 dark:bg-slate-700"
            />
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <Label htmlFor="billing_company">{__("Company (optional)", "whizmanage")}</Label>
            <Input
              id="billing_company"
              value={billingDetails.company}
              onChange={(e) => handleBillingChange("company", e.target.value)}
              className="h-10 dark:bg-slate-700"
            />
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <Label htmlFor="billing_address_1">{__("Address Line 1", "whizmanage")}</Label>
            <Input
              id="billing_address_1"
              value={billingDetails.address_1}
              onChange={(e) => handleBillingChange("address_1", e.target.value)}
              className="h-10 dark:bg-slate-700"
            />
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <Label htmlFor="billing_address_2">
              {__("Address Line 2 (optional)", "whizmanage")}
            </Label>
            <Input
              id="billing_address_2"
              value={billingDetails.address_2}
              onChange={(e) => handleBillingChange("address_2", e.target.value)}
              className="h-10 dark:bg-slate-700"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="billing_city">{__("City", "whizmanage")}</Label>
            <Input
              id="billing_city"
              value={billingDetails.city}
              onChange={(e) => handleBillingChange("city", e.target.value)}
              className="h-10 dark:bg-slate-700"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="billing_state">{__("State/Province", "whizmanage")}</Label>
            <Input
              id="billing_state"
              value={billingDetails.state}
              onChange={(e) => handleBillingChange("state", e.target.value)}
              className="h-10 dark:bg-slate-700"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="billing_postcode">{__("Postal Code", "whizmanage")}</Label>
            <Input
              id="billing_postcode"
              value={billingDetails.postcode}
              onChange={(e) => handleBillingChange("postcode", e.target.value)}
              className="h-10 dark:bg-slate-700"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="billing_country">{__("Country", "whizmanage")}</Label>
            <Select
              value={billingDetails.country}
              onValueChange={(value) => handleBillingChange("country", value)}
            >
              <SelectTrigger className="h-10 dark:bg-slate-700">
                <SelectValue>
                  {countries.find((c) => c.code === billingDetails.country)
                    ?.name || billingDetails.country}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      {/* Shipping Information */}
      <div className="pt-4 border-t px-1">
        <div className="flex items-center gap-x-2 mb-4">
          <IconBadge icon={MapPin} />
          <h2 className="text-xl dark:text-gray-400">
            {__("Shipping Information", "whizmanage")}
          </h2>
        </div>

        <div className="mb-4">
          <Checkbox
            checked={sameAsShipping}
            defaultValue={true}
            onValueChange={handleSameAsShipping}
            color="primary"
            classNames={{
              label: "font-medium text-base text-muted-foreground",
            }}
          >
            {__("Shipping address same as billing", "whizmanage")}
          </Checkbox>
        </div>

        {!sameAsShipping && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="shipping_first_name">{__("First Name", "whizmanage")}</Label>
              <Input
                id="shipping_first_name"
                value={shippingDetails.first_name}
                onChange={(e) =>
                  handleShippingChange("first_name", e.target.value)
                }
                className="h-10 dark:bg-slate-700"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="shipping_last_name">{__("Last Name", "whizmanage")}</Label>
              <Input
                id="shipping_last_name"
                value={shippingDetails.last_name}
                onChange={(e) =>
                  handleShippingChange("last_name", e.target.value)
                }
                className="h-10 dark:bg-slate-700"
              />
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <Label htmlFor="shipping_company">
                {__("Company (optional)", "whizmanage")}
              </Label>
              <Input
                id="shipping_company"
                value={shippingDetails.company}
                onChange={(e) =>
                  handleShippingChange("company", e.target.value)
                }
                className="h-10 dark:bg-slate-700"
              />
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <Label htmlFor="shipping_address_1">{__("Address Line 1", "whizmanage")}</Label>
              <Input
                id="shipping_address_1"
                value={shippingDetails.address_1}
                onChange={(e) =>
                  handleShippingChange("address_1", e.target.value)
                }
                className="h-10 dark:bg-slate-700"
              />
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <Label htmlFor="shipping_address_2">
                {__("Address Line 2 (optional)", "whizmanage")}
              </Label>
              <Input
                id="shipping_address_2"
                value={shippingDetails.address_2}
                onChange={(e) =>
                  handleShippingChange("address_2", e.target.value)
                }
                className="h-10 dark:bg-slate-700"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="shipping_city">{__("City", "whizmanage")}</Label>
              <Input
                id="shipping_city"
                value={shippingDetails.city}
                onChange={(e) => handleShippingChange("city", e.target.value)}
                className="h-10 dark:bg-slate-700"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="shipping_state">{__("State/Province", "whizmanage")}</Label>
              <Input
                id="shipping_state"
                value={shippingDetails.state}
                onChange={(e) => handleShippingChange("state", e.target.value)}
                className="h-10 dark:bg-slate-700"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="shipping_postcode">{__("Postal Code", "whizmanage")}</Label>
              <Input
                id="shipping_postcode"
                value={shippingDetails.postcode}
                onChange={(e) =>
                  handleShippingChange("postcode", e.target.value)
                }
                className="h-10 dark:bg-slate-700"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="shipping_country">{__("Country", "whizmanage")}</Label>
              <Select
                value={shippingDetails.country}
                onValueChange={(value) =>
                  handleShippingChange("country", value)
                }
              >
                <SelectTrigger className="h-10 dark:bg-slate-700">
                  <SelectValue>
                    {countries.find((c) => c.code === shippingDetails.country)
                      ?.name || shippingDetails.country}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDetails;
