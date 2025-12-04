import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

let showConfirmation = null;

export const ConfirmationDialog = () => {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState({
    title: "",
    message: "",
    confirmText: "",
    cancelText: "",
    type: "warning",
    inputPlaceholder: null,
    inputDefault: "",
  });
  const [inputValue, setInputValue] = useState("");

  const isRTL = document.documentElement.dir === 'rtl';

  useEffect(() => {
    showConfirmation = (config) => {
      return new Promise((resolve) => {
        setConfig(config);
        setInputValue(config.inputDefault || "");
        setOpen(true);

        const cleanup = () => {
          setOpen(false);
          setConfig({
            title: "",
            message: "",
            confirmText: "",
            cancelText: "",
            type: "warning",
            inputPlaceholder: null,
            inputDefault: "",
          });
          setInputValue("");
        };

        window._confirmResolve = (value) => {
          cleanup();
          resolve(value);
        };
      });
    };

    return () => {
      showConfirmation = null;
      window._confirmResolve = null;
    };
  }, []);

  if (!open) return null;

  const getIcon = () => {
    switch (config.type) {
      case "warning":
      default:
        return <AlertTriangle className="h-6 w-6 text-fuchsia-600" />;
    }
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="rtl:text-right">
        <AlertDialogHeader>
          <div className="flex-grow">
            <AlertDialogTitle className="dark:text-slate-500 flex gap-2 items-center">
              {getIcon()}
              {config.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="rtl:text-right">
              {config.message}
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>

        {/* 👇 אינפוט יופיע אם יש inputPlaceholder */}
        {config.inputPlaceholder && (
          <input
            type="text"
            placeholder={config.inputPlaceholder}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="mt-4 w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
          />
        )}

        <AlertDialogFooter
          className={cn(
            "flex mt-4",
            isRTL ? "flex-row-reverse justify-start" : "justify-end"
          )}
        >
          <AlertDialogCancel
            onClick={() => window._confirmResolve(null)}
            className={isRTL ? "ml-2" : "mr-2"}
          >
            {config.cancelText || __("Cancel", "whizmanage")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              window._confirmResolve(
                config.inputPlaceholder ? inputValue : true
              )
            }
          >
            {config.confirmText || __("Confirm", "whizmanage")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export const confirm = async (config = {}) => {
  if (!showConfirmation) {
    console.error("ConfirmationDialog component must be mounted first");
    return false;
  }

  return showConfirmation({
    title: config.title || "Confirm Action",
    message: config.message || "Are you sure you want to perform this action?",
    confirmText: config.confirmText,
    cancelText: config.cancelText,
    type: config.type || "warning",
    inputPlaceholder: config.inputPlaceholder || null,
    inputDefault: config.inputDefault || "",
  });
};