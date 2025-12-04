import { ArrowUpRightFromSquare, Sparkles } from "lucide-react";
import { MenuOrder } from "./menu/MenuOrder";
import ProBadge from "../components/nextUI/ProBadge";
import { __ } from '@wordpress/i18n';
import MobileSidebar from "./_components/MobileSidebar";

const Navbar = () => {
   

  return (
    <div className="fixed top-0 sm:static dark:bg-dark z-50 h-14 w-full p-0">
      <div className="h-full w-full flex items-center gap-2 justify-between px-4 relative">
        <div className="flex h-full gap-2 items-center justify-center">
          <MobileSidebar />
        </div>
        <a
        target="_blank"
          href="https://whizmanage.com/"
          className="relative h-10 border border-fuchsia-500 shadow-md rounded-lg flex gap-4 items-center px-4 bg-white dark:bg-slate-700"
        >
          <Sparkles className="w-5 h-5 !text-fuchsia-400" />
          <ProBadge />
          <span className="text-lg !text-fuchsia-400 font-semibold flex items-center gap-2">
            {__("Upgrade to pro for advanced features now!", "whizmanage")}
          </span>
          <ArrowUpRightFromSquare className="w-5 h-5 !text-fuchsia-400 hover:!text-fuchsia-400/50 cursor-pointer" />
        </a>
        <MenuOrder />
      </div>
    </div>
  );
};

export default Navbar;
