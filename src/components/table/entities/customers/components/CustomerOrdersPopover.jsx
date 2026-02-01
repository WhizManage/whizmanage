// src/components/table/entities/customers/components/CustomerOrdersPopover.jsx
import { __ } from "@wordpress/i18n";
import { cn } from "@/lib/utils";
import { ShoppingBag } from "lucide-react";
import CustomTooltip from "@components/ui/nextUI/Tooltip";
import ProBadge from "@components/ui/nextUI/ProBadge";

const CustomerOrdersPopover = ({ ordersCount = 0 }) => {
    // אם אין הזמנות, הצג רק את המספר
    if (ordersCount === 0) {
        return (
            <span className="text-slate-400 dark:text-slate-500 select-none">
                {ordersCount}
            </span>
        );
    }

    // Pro feature - display only with Pro badge
    return (
        <CustomTooltip
            title={__("Pro feature", "whizmanage")}
            description={__("Upgrade to Pro to view customer orders", "whizmanage")}
        >
            <div
                className={cn(
                    "relative inline-flex items-center gap-1.5 px-2 py-1 rounded-md",
                    "text-sm font-semibold",
                    "bg-fuchsia-50 text-fuchsia-700",
                    "dark:bg-fuchsia-900/30 dark:text-fuchsia-400",
                    "border border-fuchsia-200 dark:border-fuchsia-800",
                    "opacity-60 cursor-not-allowed"
                )}
            >
                <ShoppingBag className="size-3.5" />
                {ordersCount}
                <div className="absolute -top-2 -right-2 scale-75">
                    <ProBadge />
                </div>
            </div>
        </CustomTooltip>
    );
};

export default CustomerOrdersPopover;
