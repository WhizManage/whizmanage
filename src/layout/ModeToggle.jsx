import { Computer, Moon, Sun, SunMoon } from "lucide-react";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@components/ui/dropdown-menu";
import { useTheme } from "./ThemeProvider";
import { __ } from '@wordpress/i18n';

export function ModeToggle() {
  const { setTheme } = useTheme();
   
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="flex items-center gap-4">
        <Sun className="size-4 hidden dark:block" />
        <Moon className="size-4 dark:hidden" />
        <span>{__("Theme", "whizmanage")}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent>
          <DropdownMenuItem
            onClick={() => setTheme("light")}
            className="flex items-center gap-4"
          >
            <Sun className="size-4" />
            <span>{__("Light", "whizmanage")}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setTheme("dark")}
            className="flex items-center gap-4"
          >
            <Moon className="size-4" />
            <span>{__("Dark", "whizmanage")}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setTheme("system")}
            className="flex items-center gap-4"
          >
            <Computer className="size-4" />
            <span>{__("System", "whizmanage")}</span>
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
}
