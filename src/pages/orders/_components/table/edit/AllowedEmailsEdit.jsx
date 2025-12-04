import Button from "@components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@components/ui/hover-card";
import { Input } from "@components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/ui/popover";
import { Chip, cn } from "@heroui/react";
import { Edit, Info, RefreshCcw } from "lucide-react";
import { useState } from "react";
import { __ } from '@wordpress/i18n';

const AllowedEmailsEdit = ({ row }) => {
   
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [allowedEmails, setAllowedEmails] = useState(
    row.original.email_restrictions
  );
  const [emailInput, setEmailInput] = useState("");

  const handleAddEmails = () => {
    const newEmails = emailInput
      .split(",")
      .map((email) => email.trim())
      .filter((email) => email);

    const uniqueEmails = [...new Set([...allowedEmails, ...newEmails])]; // איחוד של מערך הישן עם החדש
    setAllowedEmails(uniqueEmails);
    // updateValue("email_restrictions", uniqueEmails);
    // row.original.email_restrictions=uniqueEmails
    setEmailInput("");
  };

  const productHandleClose = (itemToRemove) => {
    const newProducts = allowedEmails.filter((item) => item !== itemToRemove);
    setAllowedEmails(newProducts);
  };

  const handleSave = async () => {
    row.original.email_restrictions = allowedEmails;
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsLoading(false);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("px-4 h-8 flex gap-2")}>
          <Edit className="size-4" />
          {__("Edit", "whizmanage")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="!w-[500px] mx-4">
        <div className="dark:bg-slate-800">
          <div className="flex flex-col gap-1 text-center text-3xl justify-center border-b pb-4 dark:border-slate-700">
            <div className="flex items-center justify-center space-x-2">
              <h2 className="text-center dark:text-gray-400">
                {__("Allowed emails", "whizmanage")}
              </h2>
              <HoverCard openDelay={300}>
                <HoverCardTrigger asChild>
                  <Info className="h-5 w-5 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer mt-2" />
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold">
                      {__("Allowed emails", "whizmanage")}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {__(
                        "List of allowed billing emails to check against when an order is placed. Separate email addresses with commas. You can also use an asterisk (*) to match parts of an email. For example \"*@gmail.com\" would match all gmail addresses.",
                        "whizmanage"
                      )}

                    </p>
                  </div>
                </HoverCardContent>
              </HoverCard>
            </div>
          </div>
          <div className="p-4 flex flex-col gap-4">
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
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
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
          <div className="px-4 pb-4 flex justify-center gap-2">
            <Button
              onClick={handleSave}
              className="flex gap-2 items-center justify-center min-w-20"
            >
              {isLoading ? __("Saving...", "whizmanage") : __("Save", "whizmanage")}
              {isLoading && (
                <RefreshCcw className="text-white w-5 h-5 animate-spin" />
              )}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AllowedEmailsEdit;
