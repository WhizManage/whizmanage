// src/components/table/entities/coupons/coupons.toolbar.js
import { useState } from "react";
import { postApi } from "@/services/services";
import { confirm } from "@components/ui/custom/CustomConfirm";
import Button from "@components/ui/button";
import { RefreshCcw, RefreshCwOff } from "lucide-react";

export const couponsTransform = (coupon) => {
  const { id, date_created, date_modified, usage_count, ...rest } = coupon;
  return {
    ...rest,
    code: `${rest.code}-copy`,
    usage_count: 0,
    status: "draft",
  };
};

// קומפוננטה לכפתור השבתת קופונים
function DisableCouponsButton({ __ }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDisableCoupons = async () => {
    const isConfirmed = await confirm({
      title: __("Disable Coupons", "whizmanage"),
      message: __(
        "Are you sure you want to disable coupons? This will prevent users from applying any coupons during checkout.",
        "whizmanage"
      ),
      confirmText: __("Disable", "whizmanage"),
      cancelText: __("Cancel", "whizmanage"),
    });

    if (!isConfirmed) return;

    setIsLoading(true);
    try {
      const response = await postApi(
        `${window.siteUrl}/wp-json/whizmanage/v1/toggle-coupons`,
        { enable: "no" }
      );
      if (response.data.status === "success") {
        window.statusCoupons = "no";
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to disable coupons:", error);
    }
    setIsLoading(false);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDisableCoupons}
      disabled={isLoading}
      className="h-8 px-2 sm:px-3 flex items-center gap-2 font-normal text-muted-foreground"
    >
      {isLoading ? (
        <RefreshCcw className="h-4 w-4 animate-spin" />
      ) : (
        <RefreshCwOff className="h-4 w-4" strokeWidth={1.5} />
      )}
      <span className="hidden sm:inline">{__("Disable Coupons", "whizmanage")}</span>
    </Button>
  );
}

export const couponsCustomActions = (__) => [
  <DisableCouponsButton key="disable-coupons" __={__} />,
];

export const couponsToolbarConfig = (__) => ({
  entityName: "coupons",
  endpoint: `${window.siteUrl}/wp-json/wc/v3/coupons`,
  duplicateTransform: couponsTransform,
  customActions: couponsCustomActions(__),
});

// --- Generic alias ---
export { couponsToolbarConfig as entityToolbarConfig };