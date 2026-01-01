// src/components/table/entities/customers/components/CustomerOrdersPopover.jsx
import React, { useState } from "react";
import { __ } from "@wordpress/i18n";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@components/ui/popover";
import { cn } from "@/lib/utils";
import { ShoppingBag, Calendar, ChevronRight, Package } from "lucide-react";
import OrderSummaryModal from "@components/table/entities/orders/components/OrderSummaryModal";
import CustomTooltip from "@components/ui/nextUI/Tooltip";
import ProBadge from "@components/ui/nextUI/ProBadge";

// Status color mapping
const STATUS_COLORS = {
    completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    processing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    "on-hold": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    pending: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    refunded: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    failed: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

const CustomerOrdersPopover = ({ ordersCount = 0, orders = [], customerId }) => {

    const [isOpen, setIsOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const triggerClickedRef = React.useRef(false);

    // 🔒 חסימה עבור Free users
    const noLicence = typeof window !== "undefined" && window.hasLicence === false;

    // אם אין הזמנות, הצג רק את המספר
    if (ordersCount === 0 || !Array.isArray(orders) || orders.length === 0) {
        return (
            <span className="text-slate-400 dark:text-slate-500 select-none">
                {ordersCount}
            </span>
        );
    }

    // 🔒 אם אין רישיון - הצג תצוגה נעולה
    if (noLicence) {
        return (
            <CustomTooltip
                title={__("Pro feature", "whizmanage")}
                description={__("Upgrade to Pro to view customer orders", "whizmanage")}
            >
                <div className="relative inline-flex">
                    <span
                        className={cn(
                            "inline-flex items-center gap-1.5 px-2 py-1 rounded-md",
                            "text-sm font-semibold",
                            "bg-slate-100 text-slate-400",
                            "dark:bg-slate-800 dark:text-slate-500",
                            "cursor-not-allowed border border-slate-200 dark:border-slate-700"
                        )}
                    >
                        <ShoppingBag className="size-3.5" />
                        {ordersCount}
                    </span>
                    <div className="absolute -top-1 -right-1 scale-75">
                        <ProBadge />
                    </div>
                </div>
            </CustomTooltip>
        );
    }

    const handleOrderClick = (order) => {
        triggerClickedRef.current = false; // Reset for new order
        setSelectedOrder(order);
        setIsOpen(false);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "—";
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString("he-IL", {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
        });
    };

    return (
        <>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <button
                        className={cn(
                            "inline-flex items-center gap-1.5 px-2 py-1 rounded-md",
                            "text-sm font-semibold",
                            "bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-100",
                            "dark:bg-fuchsia-900/30 dark:text-fuchsia-400 dark:hover:bg-fuchsia-900/50",
                            "transition-colors cursor-pointer border border-fuchsia-200 dark:border-fuchsia-800"
                        )}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <ShoppingBag className="size-3.5" />
                        {ordersCount}
                    </button>
                </PopoverTrigger>

                <PopoverPrimitive.Portal>
                    <PopoverContent
                        className="w-80 p-0 overflow-hidden z-[9999]"
                        align="start"
                        sideOffset={8}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-fuchsia-500 to-purple-600 px-4 py-3">
                            <div className="flex items-center gap-2">
                                <Package className="size-5 text-white" />
                                <h3 className="text-sm font-semibold text-white">
                                    {__("Customer Orders", "whizmanage")}
                                </h3>
                                <span className="ms-auto text-xs text-white/80 bg-white/20 px-2 py-0.5 rounded-full">
                                    {ordersCount} {__("orders", "whizmanage")}
                                </span>
                            </div>
                        </div>

                        {/* Orders List */}
                        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                            {orders.map((order) => (
                                <button
                                    key={order.id}
                                    className={cn(
                                        "w-full flex items-center gap-3 p-3",
                                        "hover:bg-slate-50 dark:hover:bg-slate-800",
                                        "transition-colors text-start group"
                                    )}
                                    onClick={() => handleOrderClick(order)}
                                >
                                    {/* Order ID */}
                                    <div className="flex-shrink-0">
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                                            #{order.id}
                                        </span>
                                    </div>

                                    {/* Order Details */}
                                    <div className="flex-1 min-w-0">
                                        {/* Date & Status Row */}
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                                <Calendar className="size-3" />
                                                {formatDate(order.date)}
                                            </span>
                                            <span
                                                className={cn(
                                                    "px-1.5 py-0.5 rounded text-[10px] font-medium uppercase",
                                                    STATUS_COLORS[order.status] || STATUS_COLORS.pending
                                                )}
                                            >
                                                {__(order.status, "whizmanage")}
                                            </span>
                                        </div>

                                        {/* Items Preview */}
                                        {order.line_items?.length > 0 && (
                                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                {order.line_items.slice(0, 2).map((item) => item.name).join(", ")}
                                                {order.line_items.length > 2 && ` +${order.line_items.length - 2}`}
                                            </p>
                                        )}
                                    </div>

                                    {/* Total & Arrow */}
                                    <div className="flex-shrink-0 flex items-center gap-2">
                                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                                            {parseFloat(order.total || 0).toFixed(2)}
                                            <span
                                                className="text-xs ms-0.5"
                                                dangerouslySetInnerHTML={{
                                                    __html: order.currency_symbol || window?.currency_symbol || "₪",
                                                }}
                                            />
                                        </span>
                                        <ChevronRight className="size-4 text-slate-400 group-hover:text-fuchsia-500 transition-colors" />
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Footer */}
                        {orders.length < ordersCount && (
                            <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-2 bg-slate-50 dark:bg-slate-800">
                                <p className="text-xs text-slate-500 text-center">
                                    {`${__("Showing", "whizmanage")} ${orders.length} ${__("of", "whizmanage")} ${ordersCount} ${__("orders", "whizmanage")}`}
                                </p>
                            </div>
                        )}
                    </PopoverContent>
                </PopoverPrimitive.Portal>
            </Popover>
            {/* Order Summary Modal */}
            {selectedOrder && (
                <OrderSummaryModal
                    row={selectedOrder}
                    asChild
                    triggerClassName="hidden"
                >
                    <span
                        ref={(el) => {
                            if (el && selectedOrder && !triggerClickedRef.current) {
                                triggerClickedRef.current = true;
                                // Trigger the modal by programmatically clicking
                                setTimeout(() => el.click(), 0);
                            }
                        }}
                    />
                </OrderSummaryModal>
            )}
        </>
    );
};

export default CustomerOrdersPopover;
