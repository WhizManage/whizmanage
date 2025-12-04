import { cn } from "@/lib/utils";
import { __ } from '@wordpress/i18n';

const SidebarItem = ({
  icon,
  label,
  openSidebar,
  disabled,
  isActive,
  link,
}) => {
  const active =
    "bg-gradient-to-l rtl:bg-gradient-to-r from-pink-500/20 to-fuchsia-600/15 dark:from-slate-950/80 dark:via-pink-500/10 dark:to-slate-950/80 border-0 shadow-sm dark:shadow-lg";
   

  return (
    <a
      href={link}
      className={cn(
        "flex items-center gap-4 text-md py-2",
        disabled && "cursor-default",
        !disabled &&
          "cursor-pointer hover:bg-gradient-to-l rtl:hover:bg-gradient-to-r hover:from-pink-500/20 hover:to-fuchsia-600/15 hover:dark:from-pink-500/15 dark:hover:to-slate-950 hover:shadow-sm hover:dark:shadow-lg",
        isActive && active,
        openSidebar
          ? "px-6 rounded-r-full rtl:rounded-r-none rtl:rounded-l-full"
          : "rounded-xl justify-center items-center py-2.5 px-1.5 ml-2 rtl:ml-0 rtl:mr-2"
      )}
    >
      <span
        className={cn(
          isActive &&
            "text-fuchsia-600",
          disabled && "text-slate-300 dark:text-slate-700",
          !disabled && !isActive && "text-slate-600 dark:text-slate-400"
        )}
      >
        {icon}
      </span>
      <p
        className={cn(
          "text-lg font-[500]",
          openSidebar ? "" : "sm:hidden",
          disabled && "text-slate-300 dark:text-slate-700",
          !disabled && !isActive && "text-slate-700/90 dark:text-slate-300/90",
          !disabled &&
            isActive &&
            "bg-gradient-to-r from-fuchsia-600 from-0% via-fuchsia-600 via-35% to-pink-500 to-100% bg-clip-text text-transparent hover:bg-gradient-to-r hover:from-pink-500 hover:to-fuchsia-600 hover:bg-clip-text hover:text-transparent"
        )}
      >
        <span>{__(label, "whizmanage")}</span>
      </p>
    </a>
  );
};

export default SidebarItem;
