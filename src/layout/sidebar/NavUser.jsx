// src/layout/sidebar/NavUser.jsx

import {
  ChevronsUpDown,
  Crown,
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

import { getApi } from "@/services/services";
import { Avatar, AvatarFallback, AvatarImage } from "@components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@components/ui/sidebar";
import { ModeToggle } from "../ModeToggle";
import { History } from "../menu/History";
import { WhatsNewTour, resetTour } from "@/components/tour/WhatsNewTour";

export function NavUser() {
  const { isMobile } = useSidebar();
  const [isLicenseSheetOpen, setIsLicenseSheetOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
   
  const isRTL = window?.document?.documentElement?.dir === "rtl";

  // 🔒 חסימה עבור Free users
  const noLicence = typeof window !== "undefined" && window.hasLicence === false;

  const handleStartTour = () => {
    resetTour();
    setIsTourOpen(true);
  };

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
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu dir={isRtl ? "rtl" : "ltr"}>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent hover:bg-slate-100 dark:hover:bg-slate-700 data-[state=open]:text-sidebar-accent-foreground"
              >
                <div className="relative rounded-full p-0.5 bg-gradient-to-r from-fuchsia-600 to-pink-500">
                  <Avatar className="h-7 w-7 rounded-full">
                    <AvatarImage
                      src={window.profileImg}
                      alt={window.profileName}
                    />
                    <AvatarFallback className="rounded-full bg-fuchsia-100 dark:bg-slate-700 text-fuchsia-600 dark:text-fuchsia-400 text-xs">
                      {getInitials(window.profileName)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="grid flex-1 text-start text-sm leading-tight">
                  <span className="truncate font-semibold text-slate-700 dark:text-slate-200">
                    {window.profileName}
                  </span>
                  <span className="truncate text-xs text-slate-500 dark:text-slate-300">
                    {window.store_name}
                  </span>
                </div>
                <ChevronsUpDown className="ms-auto size-4 text-slate-400" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuPortal>
              <DropdownMenuContent
                className="z-[10000] w-[--radix-dropdown-menu-trigger-width] min-w-64 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
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
                    onClick={() => window.open(window.shopUrl)}
                    className="flex items-center gap-3"
                  >
                    <Store className="size-4" />
                    <span>{__("Store display", "whizmanage")}</span>
                    <ExternalLink className="size-3 text-muted-foreground ms-auto" />
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setIsHistoryOpen(true)}
                    className="flex items-center gap-3"
                    data-tour="history-menu"
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
            </DropdownMenuPortal>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    
      <History isOpen={isHistoryOpen} setIsOpen={setIsHistoryOpen} />
      <WhatsNewTour isOpen={isTourOpen} onClose={() => setIsTourOpen(false)} />
    </>
  );
}
