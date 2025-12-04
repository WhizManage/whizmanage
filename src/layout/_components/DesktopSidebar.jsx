import { dataMenuTop } from "@/data/dataMenu";
import { cn } from "@/lib/utils";
import { Button } from "@components/ui/button";
import { Link } from "@heroui/react";
import { Undo2 } from "lucide-react";
import { useEffect, useState } from "react";
import { MdMenuOpen } from "react-icons/md";
import SidebarItem from "./SidebarItem";
import { __ } from '@wordpress/i18n';
import { Logo } from "./logo";
function DesktopSidebar() {
  const [openSidebar, setOpenSidebar] = useState(true);
  const [screenSize, setScreenSize] = useState(undefined);
  const [active, setActive] = useState(() => {
    const url = new URL(window.location.href);
    const page = url.searchParams.get("page");

    if (page && page.startsWith("whizmanage-")) {
      // return page.replace("whizmanage-", "");
      if (page === "whizmanage-coupons") {
        return "coupons";
      } else return "orders";
    } else if (page === "whizmanage") {
      return "products"; // לשנות
      // return "";
    }
    return page || "";
  });

  //   useEffect(() => {
  //  console.log(active);

  //   }, [active])

  const updateSize = () => setScreenSize(window.innerWidth);
   

  useEffect(() => {
    window.addEventListener("resize", updateSize);
    updateSize();
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    if (screenSize <= 1080) {
      setOpenSidebar(false);
    } else {
      setOpenSidebar(true);
    }
  }, [screenSize]);
  return (
    <div
      className={cn(
        openSidebar ? "w-64" : "w-16",
        "hidden sm:block z-50 duration-500 select-none scrollbar-none shadow-sm dark:shadow-xl"
      )}
    >
      <div className="bg-white dark:bg-secondary/80 w-full h-full">
        <div className=" h-screen flex flex-col dark:divide-y dark:divide-slate-700/70">
          <div className="sm:flex items-center justify-between min-h-30 hidden shadow-sm md:sticky md:top-0 bg-transparent">
            <div></div>
            {openSidebar ? (
              <div>
                <div className="p-4 pb-0">
                  <Logo />
                </div>
                <div className="flex justify-between p-4 items-center w-full h-full">
                  <h2 className="text-2xl font-semibold truncate text-center text-slate-600 flex-1 dark:text-slate-400 max-w-[200px]">
                    {window.store_name}
                  </h2>
                  <span
                    className={cn(
                      "text-slate-400 cursor-pointer rtl:rotate-180 pt-2"
                    )}
                    onClick={() => setOpenSidebar(!openSidebar)}
                  >
                    <MdMenuOpen className="w-6 h-6 text-fuchsia-300 dark:text-slate-400 hover:text-fuchsia-600 transition-all" />
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col justify-between h-full">
                <div className="p-3 pt-4">
              <img
        src={
          window.siteUrl +
          "/wp-content/plugins/whizmanage/assets/images/logo/symbol.svg"
        }
        alt=""
        className="size-10"
      />
                </div>
                <div className="w-full h-full flex items-center justify-center">
                  <span
                    className="text-slate-400 rotate-180 cursor-pointer rtl:rotate-180 my-4"
                    onClick={() => setOpenSidebar(!openSidebar)}
                  >
                    <MdMenuOpen className="w-6 h-6 text-fuchsia-300 dark:text-slate-400 hover:text-fuchsia-600 transition-all" />
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-auto md:hover:overflow-auto scrollbar-none flex flex-col gap-2 py-2 pr-2 rtl:pr-0 rtl:pl-2">
            {dataMenuTop.map((item, i) => {
              return (
                <div key={i} className="pt-0.5">
                  <SidebarItem
                    openSidebar={openSidebar}
                    label={item.name}
                    icon={item.svgOut}
                    disabled={!item.visible}
                    link={item.link}
                    isActive={item.name.toLowerCase() == active}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex flex-col w-full items-center justify-center scrollbar-none p-2">
            <Link href={window.siteUrl + "/wp-admin"} className="w-full">
              <Button
                variant="ghost"
                className="gap-4 w-full text-gray-600 dark:text-slate-300 bg-gradient-to-l rtl:bg-gradient-to-r from-white to-white border dark:from-slate-900/80 dark:via-pink-500/20 dark:to-slate-900/80 dark:!border dark:!border-slate-700/50 shadow-sm hover:shadow-md"
              >
                <Undo2 className="text-fuchsia-600 w-4 h-4" />
                {openSidebar && <span>{__("Back to wordpress", "whizmanage")}</span>}
              </Button>
            </Link>
            <p
              className={cn(
                "text-gray-600 dark:text-slate-400 m-1 text-center flex gap-1 items-center justify-center",
                openSidebar ? "flex-row" : "flex-col"
              )}
            >
              <span>{__("Version", "whizmanage")}</span>
              <span
                className={cn(
                  "!truncate text-nowrap",
                  openSidebar ? "!max-w-full" : "pl-2 !max-w-16"
                )}
              >
                {window.version}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DesktopSidebar;
