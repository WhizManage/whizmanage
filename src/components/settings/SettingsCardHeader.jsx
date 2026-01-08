// src/components/settings/SettingsCardHeader.jsx

import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { IconBadge } from "@/components/ui/custom/IconBadge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Info } from "lucide-react";

export default function SettingsCardHeader({ icon, title, description, children }) {
  return (
    <CardHeader className="pb-4 sm:pb-6">
      <div className="flex items-center justify-between gap-2">
        <CardTitle className="text-slate-800 dark:text-slate-100 flex items-center gap-2 sm:gap-3 text-base sm:text-lg">
          <IconBadge
            icon={icon}
            className="p-1.5 sm:p-2 shrink-0"
            iconClassName="w-4 h-4 sm:w-5 sm:h-5"
          />
          <span className="leading-tight">{title}</span>
          {/* Info icon visible on mobile only */}
          {description && (
            <HoverCard openDelay={0} closeDelay={100}>
              <HoverCardTrigger asChild>
                <button
                  type="button"
                  className="sm:hidden text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors p-1 -me-1"
                >
                  <Info className="w-4 h-4" />
                </button>
              </HoverCardTrigger>
              <HoverCardContent
                side="bottom"
                align="start"
                className="w-72 text-sm"
              >
                {description}
              </HoverCardContent>
            </HoverCard>
          )}
        </CardTitle>
        {children}
      </div>
      {/* Description visible on desktop only */}
      {description && (
        <CardDescription className="hidden sm:block mt-1.5">
          {description}
        </CardDescription>
      )}
    </CardHeader>
  );
}
