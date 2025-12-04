import { IconBadge } from "@components/IconBadge";
import { Label } from "@components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select";
import { Textarea } from "@components/ui/textarea";
import { Checkbox, DatePicker } from "@heroui/react";
import { getLocalTimeZone, now } from "@internationalized/date";
import { ShoppingBag } from "lucide-react";
import { useState } from "react";
import { __ } from '@wordpress/i18n';
import { OrderStatusKeys } from "../../../../../../data/statusKeys";

const OrderDetails = ({updateValue }) => {
   
  const [status, setStatus] = useState("pending");
  const [paymentMethod, setPaymentMethod] = useState("manual");
  const [isPaid, setIsPaid] = useState(false);

  const paymentMethods = {
    credit_card: "Credit Card",
    paypal: "PayPal",
    bank_transfer: "Bank Transfer",
    cod: "Cash on Delivery (COD)",
    bit: "Bit (Israeli Payment App)",
    apple_pay: "Apple Pay",
    google_pay: "Google Pay",
    manual: "Manual Payment",
    cheque: "Check",
    direct_debit: "Standing Order / Direct Debit",
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-x-2">
        <IconBadge icon={ShoppingBag} />
        <h2 className="text-xl dark:text-gray-400">{__("Order Details", "whizmanage")}</h2>
      </div>
      {/* Order Status */}
      <div className="flex flex-col w-full gap-1.5 px-1">
        <Label htmlFor="status">{__("Order Status", "whizmanage")}</Label>
        <Select
          value={status}
          onValueChange={(selectedValue) => {
            setStatus(selectedValue);
            updateValue("status", selectedValue);
          }}
        >
          <SelectTrigger className="capitalize font-semibold px-3 !text-slate-300 border rounded-lg text-sm rtl:mr-2 py-0 h-10 focus-visible:ring-0 focus:ring-offset-0">
            <SelectValue>{__(status, "whizmanage")}</SelectValue>
          </SelectTrigger>
          <SelectContent className="dark:border-slate-600">
            {Object.keys(OrderStatusKeys).map((statusKey) => (
              <SelectItem
                key={statusKey}
                value={statusKey}
                className="capitalize cursor-pointer font-semibold text-sm"
              >
                <span>{__(statusKey, "whizmanage").toUpperCase()}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {/* Payment Method */}
      <div className="flex flex-col w-full gap-1.5 px-1">
        <Label htmlFor="payment_method">{__("Payment Method", "whizmanage")}</Label>
        <Select
          value={paymentMethod}
          onValueChange={(selectedValue) => {
            setPaymentMethod(selectedValue);
            updateValue("payment_method", selectedValue);
            updateValue("payment_method_title", paymentMethods[selectedValue]);
          }}
        >
          <SelectTrigger className="px-3 !text-slate-300 border rounded-lg text-sm rtl:mr-2 py-0 h-10 focus-visible:ring-0 focus:ring-offset-0">
            <SelectValue>{paymentMethods[paymentMethod]}</SelectValue>
          </SelectTrigger>
          <SelectContent className="dark:border-slate-600">
            {Object.entries(paymentMethods).map(([key, label]) => (
              <SelectItem
                key={key}
                value={key}
                className="cursor-pointer font-medium text-sm"
              >
                <span>{label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {/* Order Date */}
      <div className="flex flex-col w-full gap-1.5 px-1">
        <Label htmlFor="date_created">{__("Order Date", "whizmanage")}</Label>
        <div className="relative border rounded-lg flex gap-1 items-center px-1 dark:bg-slate-700">
          <DatePicker
            className="[&>div]:border-0 [&>div]:flex [&>div]:items-center [&>div]:!bg-transparent [&>div]:hover:!bg-transparent !text-slate-300"
            showMonthAndYearPickers
            defaultValue={now(getLocalTimeZone())}
            hideTimeZone
            classNames={{
              base: "rounded-md dark:!bg-slate-800 dark:!text-slate-300",
              inputWrapper:
                "rounded-md !h-8 !max-h-8 !py-1 !m-0 border dark:!border-slate-800 bg-white dark:!bg-slate-700 dark:!text-slate-300",
              timeInput: "rounded-md dark:!bg-slate-800 dark:!text-slate-300",
              selectorButton:
                "rounded-md dark:!bg-slate-700 dark:!text-slate-400",
            }}
            aria-label="choose date"
            onChange={(newDate) => {
              if (newDate) {
                const jsDate = newDate.toDate(getLocalTimeZone());
                const localDate = new Date(
                  jsDate.getTime() - jsDate.getTimezoneOffset() * 60000
                );
                const isoString = localDate.toISOString().slice(0, 19);
                updateValue("date_created_gmt", isoString);
              }
            }}
          />
        </div>
      </div>
      {/* Payment Status */}
      <div className="flex flex-col w-full gap-4 px-1">
        <Label>{__("Payment Status", "whizmanage")}</Label>
        <Checkbox
          color="primary"
          checked={isPaid}
          onValueChange={(isSelected) => {
            setIsPaid(isSelected);
            updateValue("set_paid", isSelected);
          }}
          classNames={{
            label: "flex gap-2 font-extralight text-base text-muted-foreground",
            base: "w-full rtl:!ml-2",
          }}
        >
          {__("Mark as paid", "whizmanage")}
        </Checkbox>
      </div>
      {/* Customer Note */}
      <div className="flex flex-col w-full gap-1.5 px-1">
        <Label htmlFor="customer_note">{__("Customer Note", "whizmanage")}</Label>
        <div className="relative border rounded-lg flex gap-1 items-center px-3 py-1 dark:bg-slate-700">
          <Textarea
            id="customer_note"
            rows="3"
            placeholder={__("Add a note for the customer (optional)", "whizmanage")}
            className="!border-none dark:!text-slate-300 !ring-0 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
            onChange={(e) => updateValue("customer_note", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
