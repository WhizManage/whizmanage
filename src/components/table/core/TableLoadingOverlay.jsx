// src/components/table/core/TableLoadingOverlay.jsx
import { memo } from "react";
 import { __ } from "@wordpress/i18n";

/**
 * Loading overlay component for the table.
 * Shows a semi-transparent overlay with spinner.
 */
const TableLoadingOverlay = memo(() => {
     

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 dark:bg-slate-900/60 backdrop-blur-[1px] rounded-lg">
            <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-fuchsia-600"></div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                    {__("Loading data...", "whizmanage")}
                </p>
            </div>
        </div>
    );
});

TableLoadingOverlay.displayName = "TableLoadingOverlay";

export default TableLoadingOverlay;
