// src/layout/ModeToggle.jsx
import { Computer, Moon, Sun } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@components/ui/dropdown-menu";
import { __ } from "@wordpress/i18n";
import { useTheme } from "./ThemeProvider";
import { ThemeToggler } from "@/components/ui/theme-toggler";
import { cn } from "@/lib/utils";

export function ModeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <ThemeToggler
      theme={theme}
      resolvedTheme={resolvedTheme}
      setTheme={setTheme}
      direction="ltr"
    >
      {({ effective, toggleTheme }) => (
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="flex items-center gap-4">
            <Sun className="size-4 hidden dark:block" />
            <Moon className="size-4 dark:hidden" />
            <span>{__("Theme", "whizmanage")}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={() => toggleTheme("light")}
                className={cn(
                  "flex items-center gap-4",
                  effective === "light" && "bg-fuchsia-50 dark:bg-fuchsia-900/20"
                )}
              >
                <Sun className="size-4" />
                <span>{__("Light", "whizmanage")}</span>
                {effective === "light" && (
                  <span className="ms-auto text-fuchsia-600 dark:text-fuchsia-400">✓</span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => toggleTheme("dark")}
                className={cn(
                  "flex items-center gap-4",
                  effective === "dark" && "bg-fuchsia-50 dark:bg-fuchsia-900/20"
                )}
              >
                <Moon className="size-4" />
                <span>{__("Dark", "whizmanage")}</span>
                {effective === "dark" && (
                  <span className="ms-auto text-fuchsia-600 dark:text-fuchsia-400">✓</span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => toggleTheme("system")}
                className={cn(
                  "flex items-center gap-4",
                  effective === "system" && "bg-fuchsia-50 dark:bg-fuchsia-900/20"
                )}
              >
                <Computer className="size-4" />
                <span>{__("System", "whizmanage")}</span>
                {effective === "system" && (
                  <span className="ms-auto text-fuchsia-600 dark:text-fuchsia-400">✓</span>
                )}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
      )}
    </ThemeToggler>
  );
}
