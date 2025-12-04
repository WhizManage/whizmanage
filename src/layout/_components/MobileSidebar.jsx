import { SheetClose } from "@/components/ui/sheet";
import { Undo2, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@components/ui/sheet";
import { dataMenuTop } from "@/data/dataMenu";
import { Button } from "@components/ui/button";
import { AiOutlineMenu } from "react-icons/ai";
import SidebarItem from "./SidebarItem";
import { Link } from "@heroui/react";

const MobileSidebar = () => {
  return (
    <div className="sm:hidden">
      <Sheet>
        <SheetTrigger>
          <Button variant="outline" size="icon" asChild className="p-1 border-0">
            <AiOutlineMenu size={24} className="text-fuchsia-600" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-2 w-fit dark:!bg-slate-900">
          <div className="h-screen overflow-auto flex flex-col dark:divide-y dark:divide-slate-700/70">
            <div className="flex items-center justify-between h-30 shadow-sm md:sticky md:top-0 bg-white dark:!bg-slate-900">
              <div></div>
              <div>
                <div className="p-4 pb-2 w-64 mt-4 dark:hidden">
                  <img
                    src={
                      window.siteUrl +
                      "/wp-content/plugins/whizmanage/assets/images/logo/WHISEMANAGE.png"
                    }
                    alt="logo"
                  />
                </div>
                <div className="p-4 pb-2 w-64 mt-4 hidden dark:block">
                  <img
                    src={
                      window.siteUrl +
                      "/wp-content/plugins/whizmanage/assets/images/logo/WHISEMANAGE-dark.png"
                    }
                    alt="logo"
                  />
                </div>
                <div className="flex items-end justify-center p-4 pt-2 w-full h-full">
                  <h2 className="text-2xl font-semibold delay-500 truncate text-center flex-1 dark:text-slate-400">
                {window.store_name}
                  </h2>
                </div>
              </div>
            </div>
            <div className="md:mt-0 w-64 flex-1">
              {dataMenuTop.map((item, i) => {
                return (
                  <div key={i} className="pt-0.5">
                    <SidebarItem
                      label={item.name}
                      icon={item.svgOut}
                      disabled={!item.visible}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex flex-col w-full items-center justify-center scrollbar-none py-2">
              <Link href={window.siteUrl + "/wp-admin"}>
                <Button
                  variant="outline"
                  className="gap-4 text-gray-600 dark:text-slate-300 dark:!bg-slate-800"
                >
                  <Undo2 className="text-fuchsia-600 w-4 h-4" />
                  Back to wordpress
                </Button>
              </Link>
              <p className="text-gray-600 dark:text-slate-400 m-1 text-center">
                {"Version " + window.version}
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MobileSidebar;
