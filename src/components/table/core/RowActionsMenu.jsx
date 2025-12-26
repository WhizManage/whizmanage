// src/components/table/RowActionsMenu.jsx

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu";
import CustomTooltip from "@components/ui/nextUI/Tooltip";
import {
  Archive,
  Copy,
  Download,
  Edit,
  ExternalLink,
  Eye,
  MoreVertical,
  Pencil,
  RotateCcw,
  Skull,
  Trash2,
} from "lucide-react";
 import { __ } from "@wordpress/i18n";

const ICONS = {
  Copy,
  Download,
  Edit,
  Eye,
  Trash2,
  RotateCcw,
  DeleteForever: Skull,
  Pencil,
  Archive,
  ExternalLink,
};

export function RowActionsMenu({ row, actions = [], withSeparator = false }) {
   

  // מציגים רק אקשנים שאינם "multiple" (כלומר single/any/undefined)
  const items = (actions || []).filter((a) => a?.showWhen !== "multiple");

  if (!items.length) return null;

  const renderIcon = (icon) => {
    if (!icon) return null;
    if (typeof icon === "string") {
      const IconCmp = ICONS[icon] || null;
      return IconCmp ? <IconCmp className="mr-2 h-4 w-4" /> : null;
    }
    // ReactNode מותאם-אישית
    return (
      <span className="mr-2 h-4 w-4 inline-flex items-center justify-center">
        {icon}
      </span>
    );
  };

  const handleClick = async (action) => {
    try {
      // האקשנים שלנו מצפים בד"כ למערך של שורות; נעביר את השורה הבודדת באריזה
      const maybePromise = action.onClick?.([row]);
      if (maybePromise?.then) await maybePromise;
    } catch (e) {
      // לא זורקים — שומרים UI שקט
      console.error(e);
    }
  };

  return (
    <DropdownMenu>
      <CustomTooltip title={__("Row actions", "whizmanage")} instantClose>
        <DropdownMenuTrigger asChild>
          <button
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
            aria-label={__("Row actions menu", "whizmanage")}
          >
            <MoreVertical className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </DropdownMenuTrigger>
      </CustomTooltip>
      <DropdownMenuPortal>
        <DropdownMenuContent align="end" className="z-[100]" sideOffset={16}>
          {items.map((action, idx) => (
            <DropdownMenuItem
              key={`${action.label}-${idx}`}
              onClick={() => handleClick(action)}
              className="cursor-pointer text-nowrap flex-nowrap"
            >
              {renderIcon(action.icon)}
              {action.label}
            </DropdownMenuItem>
          ))}

          {withSeparator && <DropdownMenuSeparator />}
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
}
