// src/layout/menu/MenuOrder.jsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@components/ui/avatar";
import {
  ExternalLink,
  HistoryIcon,
  LifeBuoy,
  LogOut,
  MessageCircleQuestion,
  Sparkles,
  Store,
  Undo2,
} from "lucide-react";
import { useState } from "react";
 import { __ } from "@wordpress/i18n";
import { ModeToggle } from "../ModeToggle";
import { getApi } from "/src/services/services";
import { History } from "./History";
import { WhatsNewTour, resetTour } from "@/components/tour/WhatsNewTour";

export function MenuOrder() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLicenseSheetOpen, setIsLicenseSheetOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
   

  // 🔒 חסימה עבור Free users
  const noLicence = typeof window !== "undefined" && window.hasLicence === false;

  const handleStartTour = () => {
    resetTour();
    setIsTourOpen(true);
    setIsOpen(false);
  };

const isRTL = window?.document?.documentElement?.dir === "rtl";

  const logOut = async () => {
    await getApi(window.siteUrl + "/wp-json/whizmanage/v1/log_out");
    window.location.reload();
  };

  // Get user initials for fallback
  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu
        open={isOpen}
        onOpenChange={setIsOpen}
        dir={isRtl ? "rtl" : "ltr"}
      >
        <DropdownMenuTrigger asChild>
          <div className="relative rounded-full p-0.5 bg-gradient-to-r from-fuchsia-600 to-pink-500 cursor-pointer">
            <Avatar className="h-8 w-8 rounded-full">
              <AvatarImage src={window.profileImg} alt={window.profileName} />
              <AvatarFallback className="rounded-full bg-fuchsia-100 dark:bg-slate-700 text-fuchsia-600 dark:text-fuchsia-400">
                {getInitials(window.profileName)}
              </AvatarFallback>
            </Avatar>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-64 rounded-lg me-2">
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
              <div className="relative rounded-full p-0.5 bg-gradient-to-r from-fuchsia-600 to-pink-500">
                <Avatar className="h-8 w-8 rounded-full">
                  <AvatarImage
                    src={window.profileImg}
                    alt={window.profileName}
                  />
                  <AvatarFallback className="rounded-full bg-fuchsia-100 dark:bg-slate-700 text-fuchsia-600 dark:text-fuchsia-400">
                    {getInitials(window.profileName)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="grid flex-1 text-start text-sm leading-tight">
                <span className="truncate font-semibold">
                  {window.profileName}
                </span>
                <span className="truncate text-xs text-slate-500">
                  {window.store_name}
                </span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Help & Theme */}
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => {
                window.open(
                  window.user_local === "he_IL"
                    ? "https://docs.whizmanage.com/he"
                    : "https://docs.whizmanage.com/en",
                  "_blank"
                );
              }}
              className="flex items-center gap-3"
            >
              <MessageCircleQuestion className="size-4" />
              <span>{__("Help", "whizmanage")}</span>
              <ExternalLink className="size-3 text-muted-foreground ms-auto" />
            </DropdownMenuItem>
            <ModeToggle />
          </DropdownMenuGroup>
          <DropdownMenuSeparator />

          {/* Store & History */}
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => {
                setIsOpen(false);
                window.open(window.shopUrl);
              }}
              className="flex items-center gap-3"
            >
              <Store className="size-4" />
              <span>{__("Store display", "whizmanage")}</span>
              <ExternalLink className="size-3 text-muted-foreground ms-auto" />
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setIsHistoryOpen(true);
                setIsOpen(false);
              }}
              className="flex items-center gap-3"
            >
              <HistoryIcon className="size-4" />
              <span>{__("History", "whizmanage")}</span>
            </DropdownMenuItem>
   
            <DropdownMenuItem
              onClick={handleStartTour}
              className="flex items-center gap-3"
            >
              <Sparkles className="size-4 text-fuchsia-500" />
              <span className="bg-gradient-to-r from-fuchsia-600 to-pink-500 bg-clip-text text-transparent font-medium">
                {__("What's New", "whizmanage")}
              </span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />

          {/* Back to WordPress */}
          <DropdownMenuItem
            onClick={() => {
              window.location.href = window.siteUrl + "/wp-admin";
            }}
            className="flex items-center gap-3"
          >
            <Undo2 className="size-4" />
            <span>{__("Back to wordpress", "whizmanage")}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />

          {/* Logout */}
          <DropdownMenuItem
            onClick={logOut}
            className="flex items-center gap-3"
          >
            <LogOut className="size-4" />
            <span>{__("Log out", "whizmanage")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <History
        isOpen={isHistoryOpen}
        setIsOpen={setIsHistoryOpen}
      />
      <WhatsNewTour isOpen={isTourOpen} onClose={() => setIsTourOpen(false)} />
    </div>
  );
}
