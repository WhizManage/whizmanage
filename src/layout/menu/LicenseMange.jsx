// src/layout/menu/LicenseMange.jsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { confirm } from "@components/ui/custom/CustomConfirm";
import { useState } from "react";
 import { __ } from "@wordpress/i18n";
import { toast } from "@/lib/utils";
import { getApiLice, postApi, putApi } from "/src/services/services";
import {
  CalendarDays,
  Key,
  KeyRound,
  Pencil,
  Shield,
  ShieldCheck,
  ShieldX,
  X,
} from "lucide-react";

export function LicenseMange({ isOpen, setIsOpen }) {
 const proLicense = window.licenseToken.key

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(proLicense);
  const [licenseKey, setLicenseKey] = useState(proLicense);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
   
  // if (isSheetOpen) setIsDropdownOpen(false);
  const saveLicenseInDb = async (license, token) => {
    const newPro = { name: "pro", reservedData: license };
    const urlWhiz = window.siteUrl + "/wp-json/whizmanage/v1/columns/pro";
    await putApi(urlWhiz, newPro);
    const urlOpt = window.siteUrl + "/wp-json/whizmanage/v1/wlic";
    await postApi(urlOpt, { key: license, token: token });
  };

  const activateLicense = async () => {
    setLoading(true);
    if (name == licenseKey) {
      setErrorMsg(
        __(
          "This license is identical to the current license. Please change the license number.",
          "whizmanage"
        )
      );
      setLoading(false);
      return;
    }
    // const url = `https://whizmanage.com/wp-json/lmfwc/v2/licenses/activate/${licenseKey}`;
     const url = `https://whizmanage.com/wp-json/whizmanage/v1/license/activate/${licenseKey}`;
    try {
      const data = await getApiLice(url);
      if (data.data.data.activationData) {
        window.whizmanagePro = false;
        await saveLicenseInDb(licenseKey, data.data.data.activationData.token);
        window.licenseToken.token = data.data.data.activationData.token;
        toast.success(__("License activated successfully.", "whizmanage"));
        setIsOpen(false);
      } else {
        setErrorMsg(data.data.data.errors.lmfwc_rest_data_error[0]);
      }
    } catch (error) {
      console.error(error);
      setErrorMsg(__("Failed to activate the license. Please try again.", "whizmanage"));
    }
    setLoading(false);
  };

  const deactivateLicense = async () => {
    const isConfirmed = await confirm({
      title: __("Deactivate License", "whizmanage"),
      message: __("Are you sure you want to deactivate the license?", "whizmanage"),
      confirmText: __("Deactivate", "whizmanage"),
      cancelText: __("Cancel", "whizmanage"),
    });

    if (!isConfirmed) {
      return;
    }

    setLoading(true);

    // const url = `https://whizmanage.com/wp-json/lmfwc/v2/licenses/deactivate/FIRST?token=${window.licenseToken.token}`;
    const url = `https://whizmanage.com/wp-json/whizmanage/v1/license/deactivate?token=${window.licenseToken.token}`;
    try {
      const data = await getApiLice(url);
      if (data.data.success) {
        window.whizmanagePro = true;
        window.location.reload();
        toast.success(__("License deactivate successfully.", "whizmanage"));
      }
    } catch (error) {
      console.error(error);
      setErrorMsg(__("Failed to activate the license. Please try again.", "whizmanage"));
    }
    setLoading(false);
  };

  const resetLicenseForm = () => {
    setIsEditing(false);
    setErrorMsg("");
    setLicenseKey(window.getWhizmanage[9].reservedData);
  };

  const handleSheetOpenChange = (open) => {
    setIsOpen(open);
    if (!open) {
      resetLicenseForm();
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleSheetOpenChange}>
      <SheetContent className="!min-w-[450px] p-0 flex flex-col bg-slate-50 dark:bg-slate-800">
        {/* Header */}
        <div className="p-6 border-b border-slate-200/60 dark:border-slate-700/60">
          <SheetHeader className="space-y-3">
            <div className="flex items-center justify-center">
              <div className="rounded-lg bg-fuchsia-100 dark:bg-fuchsia-900/30 p-3">
                <Shield className="size-8 text-fuchsia-600 dark:text-fuchsia-400" />
              </div>
            </div>
            <SheetTitle className="text-center text-xl text-slate-800 dark:text-slate-100">
              {__("Manage License", "whizmanage")}
            </SheetTitle>
            <SheetDescription className="text-center text-slate-500 dark:text-slate-300">
              {__(
                "View and manage your license details. Click edit to make changes.",
                "whizmanage"
              )}
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 space-y-4">
          {/* License Status Card */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-fuchsia-100 dark:bg-fuchsia-900/30 p-2">
                <ShieldCheck className="size-5 text-fuchsia-600 dark:text-fuchsia-400" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {__("License Active", "whizmanage")}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-300">
                  {__("Your license is valid and active", "whizmanage")}
                </p>
              </div>
            </div>
          </div>

          {/* License Details */}
          <div className="space-y-3">
            {/* License Key */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-fuchsia-100 dark:bg-fuchsia-900/30 p-2">
                  <Key className="size-4 text-fuchsia-600 dark:text-fuchsia-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-300 mb-1">
                    {__("License Key", "whizmanage")}
                  </p>
                  {isEditing ? (
                    <Input
                      id="name"
                      onFocus={(event) => event.target.select()}
                      value={licenseKey}
                      onChange={(e) => setLicenseKey(e.target.value)}
                      className="h-9"
                    />
                  ) : (
                    <p className="font-mono text-sm text-slate-800 dark:text-slate-200 truncate">
                      {name}
                    </p>
                  )}
                </div>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="rounded-md p-1.5 text-slate-400 hover:text-fuchsia-600 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-900/20 transition-colors"
                  >
                    <Pencil className="size-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Expiry Date */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-fuchsia-100 dark:bg-fuchsia-900/30 p-2">
                  <CalendarDays className="size-4 text-fuchsia-600 dark:text-fuchsia-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-300 mb-1">
                    {__("Expiry Date", "whizmanage")}
                  </p>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {window.licenseWhizmanage}
                  </p>
                </div>
              </div>
            </div>

            {/* Token */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-fuchsia-100 dark:bg-fuchsia-900/30 p-2">
                  <KeyRound className="size-4 text-fuchsia-600 dark:text-fuchsia-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-300 mb-1">
                    {__("Token", "whizmanage")}
                  </p>
                  <p className="font-mono text-sm text-slate-800 dark:text-slate-200 truncate">
                    {window.licenseToken.token &&
                      window.licenseToken.token.substring(0, 16) + "..."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 flex items-center gap-2">
              <ShieldX className="size-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{errorMsg}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-200/60 dark:border-slate-700/60 p-4">
          {isEditing ? (
            <div className="flex gap-3">
              <Button
                onClick={resetLicenseForm}
                variant="outline"
                className="flex-1"
              >
                <X className="size-4 me-2" />
                {__("Cancel", "whizmanage")}
              </Button>
              <Button
                onClick={activateLicense}
                disabled={loading}
                variant="gradient"
                className="flex-1"
              >
                <ShieldCheck className="size-4 me-2" />
                {loading ? __("Saving...", "whizmanage") : __("Save changes", "whizmanage")}
              </Button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={deactivateLicense}
                disabled={loading}
                className="flex-1 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800"
              >
                <ShieldX className="size-4 me-2" />
                {loading ? __("Processing...", "whizmanage") : __("Deactivate", "whizmanage")}
              </Button>
              <Button
                onClick={() => setIsEditing(true)}
                variant="gradient"
                className="flex-1"
              >
                <Pencil className="size-4 me-2" />
                {__("Change license", "whizmanage")}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
