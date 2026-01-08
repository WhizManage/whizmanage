// src/layout/sidebar/AppSidebar.jsx

import { Chip } from "@heroui/react";
import {
  Percent,
  Settings,
  ShoppingBasket,
  ShoppingCart,
  Ticket,
  Users,
} from "lucide-react";
 import { __ } from "@wordpress/i18n";
import { NavUser } from "./NavUser";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenuBadge,
  SidebarRail,
} from "@components/ui/sidebar";

// Menu items configuration
const menuItems = [
  {
    name: "Products",
    page: "whizmanage",
    icon: ShoppingBasket,
    tourId: "products-menu",
  },
  {
    name: "Coupons",
    page: "whizmanage-coupons",
    icon: Ticket,
    tourId: "coupons-menu",
  },
  {
    name: "Discount Rules",
    page: "whizmanage-discount-rules",
    icon: Percent,
    badge: "BETA",
    tourId: "discount-rules-menu",
  },
  {
    name: "Orders",
    page: "whizmanage-orders",
    icon: ShoppingCart,
    tourId: "orders-menu",
  },
  {
    name: "Customers",
    page: "whizmanage-customers",
    icon: Users,
    tourId: "customers-menu",
  },
  // {
  //   name: "Settings",
  //   page: "whizmanage-settings",
  //   icon: Settings,
  //   tourId: "settings-menu",
  // },
];

// Get current active page from URL
const getCurrentPage = () => {
  const url = new URL(window.location.href);
  return url.searchParams.get("page") || "";
};

export function AppSidebar({ ...props }) {
   
  const currentPage = getCurrentPage();

  return (
    <Sidebar variant="floating" collapsible="icon" className="border-0 bg-fuchsia-100/40 rtl:!bg-pink-200/50 dark:!bg-slate-900" {...props}>
      {/* Header with Logo */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="hover:bg-sidebar-accent"
            >
              <a
                href={`${window.siteUrl}/wp-admin/admin.php?page=whizmanage`}
              >
                <div className="flex aspect-square size-10 group-data-[collapsible=icon]:size-8 items-center justify-center rounded-lg bg-transparent transition-all">
                  <img
                    src={`${window.siteUrl}/wp-content/plugins/whizmanage-pro/assets/images/logo/symbol.svg`}
                    alt="WhizManage"
                    className="size-10 group-data-[collapsible=icon]:size-8 transition-all"
                  />
                </div>
                <div className="grid flex-1 text-start text-sm leading-tight">
                  <span className="truncate font-semibold text-slate-800 dark:text-slate-100">
                    WhizManage
                  </span>
                  <span className="truncate text-xs text-slate-500 dark:text-slate-300">
                    {window.store_name}
                  </span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      {/* Navigation Content */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = currentPage === item.page;
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.name} data-tour={item.tourId}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={__(item.name, "whizmanage")}
                      className={
                        isActive
                          ? "bg-gradient-to-r rtl:bg-gradient-to-l from-fuchsia-600/15 to-pink-500/10 text-fuchsia-600 dark:from-fuchsia-600/20 dark:to-pink-500/15 dark:text-fuchsia-400 hover:from-fuchsia-600/20 hover:to-pink-500/15 hover:text-fuchsia-600 dark:hover:text-fuchsia-400 active:text-fuchsia-600 dark:active:text-fuchsia-400"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 active:text-fuchsia-600 dark:active:text-fuchsia-400"
                      }
                    >
                      <a
                        href={`${window.siteUrl}/wp-admin/admin.php?page=${item.page}`}
                      >
                        <Icon
                          className={
                            isActive
                              ? "text-fuchsia-600 dark:text-fuchsia-400"
                              : "text-slate-500 dark:text-slate-300"
                          }
                        />
                        <span className="font-medium">{__(item.name, "whizmanage")}</span>
                      </a>
                    </SidebarMenuButton>
                    {item.badge && (
                      <SidebarMenuBadge>
                        <Chip
                          variant="shadow"
                          classNames={{
                            base: "bg-gradient-to-br from-indigo-500 to-pink-500 border-0 shadow-pink-500/30 h-4 min-w-0 px-1.5",
                            content:
                              "drop-shadow shadow-black text-white text-[10px] font-semibold p-0",
                          }}
                        >
                          {__(item.badge, "whizmanage")}
                        </Chip>
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {/* Footer with User and Version */}
      <SidebarFooter>
        <NavUser />
        <div className="px-2 py-0 border-t dark:border-slate-700/70 text-center group-data-[collapsible=icon]:hidden">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {__("Version", "whizmanage")} {window.version}
          </span>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
