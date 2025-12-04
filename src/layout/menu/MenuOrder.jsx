import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, User } from "@heroui/react";
import {
  ExternalLink,
  LifeBuoy,
  LogOut,
  MessageCircleQuestion,
  Store,
  UserIcon,
  HistoryIcon
} from "lucide-react";
import { useState } from "react";
import { __ } from '@wordpress/i18n';
import { ModeToggle } from "../ModeToggle";
import { getApi } from "/src/services/services";
import { History } from "./History";

export function MenuOrder() {
  const [isOpen, setIsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  

  const isRTL = document.documentElement.dir === 'rtl';

  const logOut = async () => {
    const logOutRes = await getApi(
      window.siteUrl + "/wp-json/whizmanage/v1/log_out"
    );
    window.location.reload();
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu
        open={isOpen}
        onOpenChange={setIsOpen}
        dir={isRTL ? "rtl" : "ltr"}
      >
        <DropdownMenuTrigger asChild>
          <div className="relative rounded-full p-0.5 bg-gradient-to-r from-fuchsia-600 to-pink-500">
            <div className="relative rounded-full p-0.5 bg-fuchsia-100 dark:bg-slate-800">
              <Avatar
                size="md"
                className="cursor-pointer"
                isPressable
                isFocusable
                showFallback
                name={window.profileName}
                fallback={
                  <UserIcon
                    className="w-6 h-6 text-white"
                    fill="currentColor"
                  />
                }
                src={window.profileImg}
              />
            </div>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="!w-72 mr-2 rtl:mr-0 rtl:ml-2">
          <DropdownMenuLabel>
            {" "}
            <User
              name={window.profileName}
              description={window.store_name}
              avatarProps={{
                name: window.profileName,
                showFallback: true,
                src: window.profileImg,
              }}
            />
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => {
                window.open(
                  window.user_local == "he_IL"
                    ? "https://docs.whizmanage.com/he"
                    : "https://docs.whizmanage.com/en",
                  "_blank"
                );
              }}
              className="flex items-center gap-4"
            >
              <MessageCircleQuestion className="size-4" />
              <span>{__("Help", "whizmanage")}</span>
              <ExternalLink className="size-4 text-muted-foreground ml-auto rtl:ml-0 rtl:mr-auto" />
            </DropdownMenuItem>
            <ModeToggle />
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setIsOpen(false);
              window.open(window.shopUrl);
            }}
            className="flex items-center gap-4"
          >
            <Store className="size-4" />
            <span>{__("Store display", "whizmanage")}</span>
            <ExternalLink className="size-4 text-muted-foreground ml-auto rtl:ml-0 rtl:mr-auto" />
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setIsHistoryOpen(true);
              setIsOpen(false);
            }}
            className="flex items-center gap-4"
          >
            <HistoryIcon className="size-4" />
            <span>{__("History", "whizmanage")}</span> <span>{__("(Beta)", "whizmanage")}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              logOut();
            }}
            className="flex items-center gap-4"
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
    </div>
  );
}
