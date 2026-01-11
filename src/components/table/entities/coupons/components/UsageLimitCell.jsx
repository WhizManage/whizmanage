// src/components/table/entities/coupons/components/UsageLimitCell.jsx
import Button from "@components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@components/ui/hover-card";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import CustomTooltip from "@components/ui/nextUI/Tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@heroui/react";
import { Info, Loader2, Settings2 } from "lucide-react";
import { useState } from "react";
 import { __ } from "@wordpress/i18n";
import { putApi } from "@/services/services";

const UsageLimitCell = ({ getValue, row, column, table, onUpdate }) => {
   
  const [isOpen, setIsOpen] = useState(false);
  const [isEditingInline, setIsEditingInline] = useState(false);
  const [inlineValue, setInlineValue] = useState(
    row.original.usage_limit || ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const store = table?.options?.meta?.store;

  // שמירת ערכים זמניים לפופאובר
  const [tempValues, setTempValues] = useState({
    usage_limit: row.original.usage_limit ?? "",
    usage_limit_per_user: row.original.usage_limit_per_user ?? "",
    limit_usage_to_x_items: row.original.limit_usage_to_x_items ?? "",
  });

  const rowId =
    row.original.id ?? row.original._id ?? row.original.key ?? row.id;

  // פונקציות לעריכה inline
  const handleTextClick = (e) => {
    e.stopPropagation();
    setIsEditingInline(true);
    setInlineValue(row.original.usage_limit || "");
  };

  const handleInlineSave = async () => {
    const originalValue = row.original.usage_limit;
    const numericValue = inlineValue === "" ? null : Number(inlineValue);
    const originalNumeric = originalValue === "" ? null : Number(originalValue);

    if (numericValue !== originalNumeric) {
      try {
        await onUpdate(rowId, "usage_limit", numericValue, row.original);
      } catch (error) {
        console.error("Failed to update usage_limit:", error);
        setInlineValue(originalValue);
      }
    }
    setIsEditingInline(false);
  };

  const handleInlineBlur = () => {
    handleInlineSave();
  };

  const handleInlineKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleInlineSave();
    } else if (e.key === "Escape") {
      setInlineValue(row.original.usage_limit || "");
      setIsEditingInline(false);
    }
  };

  const handleOpenAdvanced = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditingInline(false);
    setIsOpen(true);
  };

  // פונקציות לפופאובר
  const handleFieldChange = (field, value) => {
    setTempValues((prev) => ({ ...prev, [field]: value }));
  };

  // איפוס הערכים הזמניים כשהפופאובר נפתח
  const handlePopoverOpenChange = (open) => {
    if (open) {
      // כשנפתח - טען ערכים מה-row
      setTempValues({
        usage_limit: row.original.usage_limit ?? "",
        usage_limit_per_user: row.original.usage_limit_per_user ?? "",
        limit_usage_to_x_items: row.original.limit_usage_to_x_items ?? "",
      });
    }
    setIsOpen(open);
  };

  // שמירת כל השדות בבקשה אחת
  const handleSaveAll = async () => {
    setIsSaving(true);

    try {
      const payload = {
        usage_limit: tempValues.usage_limit === "" ? null : Number(tempValues.usage_limit),
        usage_limit_per_user: tempValues.usage_limit_per_user === "" ? null : Number(tempValues.usage_limit_per_user),
        limit_usage_to_x_items: tempValues.limit_usage_to_x_items === "" ? null : Number(tempValues.limit_usage_to_x_items),
      };

      // עדכון אופטימי ב-store
      store?.updateItem?.(rowId, payload);

      // שליחת בקשה אחת לשרת
      await putApi(`${window.siteUrl}/wp-json/wc/v3/coupons/${rowId}`, payload);

      setIsOpen(false);
    } catch (error) {
      console.error("Failed to update usage limits:", error);
      // rollback
      store?.updateItem?.(rowId, {
        usage_limit: row.original.usage_limit,
        usage_limit_per_user: row.original.usage_limit_per_user,
        limit_usage_to_x_items: row.original.limit_usage_to_x_items,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const usageCount = row.original.usage_count ?? 0;
  const usageLimit = row.original.usage_limit || 0;

  // מצב עריכה inline
  if (isEditingInline) {
    return (
      <div className="flex items-center gap-2 w-full min-w-0">
        <span className="text-sm tabular-nums text-slate-600 dark:text-slate-300">
          {usageCount} /
        </span>
        <Input
          type="number"
          min="0"
          value={inlineValue}
          onChange={(e) => setInlineValue(e.target.value)}
          onBlur={handleInlineBlur}
          onKeyDown={handleInlineKeyDown}
          className="h-8 flex-1 min-w-0 dark:text-slate-300 border-slate-200 dark:border-slate-800 rounded-md"
          onFocus={(e) => e.target.select()}
          autoFocus
          placeholder="∞"
        />
        <div className="w-px h-5 bg-border flex-shrink-0 dark:bg-slate-700" />
        <CustomTooltip title={__("Manage all limits", "whizmanage")}>
          <Button
            onMouseDown={handleOpenAdvanced}
            variant="outline"
            type="button"
            className="flex px-2 !size-8"
            size="icon"
          >
            <Settings2 className="!size-5" />
          </Button>
        </CustomTooltip>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 w-full min-w-0">
      {/* הטקסט - לחיצה פותחת עריכה */}
      <div className="flex-1 min-w-0">
        <CustomTooltip title={__("Click to edit limit", "whizmanage")} instantClose>
          <span
            className="text-sm tabular-nums cursor-text hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors rounded px-1 py-0.5"
            onClick={handleTextClick}
          >
            {usageCount} / {usageLimit || "∞"}
          </span>
        </CustomTooltip>
      </div>
      {/* מפריד + כפתור */}
      <div className="w-px h-5 bg-border flex-shrink-0 dark:bg-slate-700" />
      <Popover
        placement="bottom"
        showArrow
        backdrop="transparent"
        isOpen={isOpen}
        onOpenChange={handlePopoverOpenChange}
      >
        <PopoverTrigger>
          <div>
            <CustomTooltip title={__("Manage all limits", "whizmanage")}>
              <Button
                variant="outline"
                size="icon"
                className="flex px-2 !size-8"
              >
                <Settings2 className="!size-5" />
              </Button>
            </CustomTooltip>
          </div>
        </PopoverTrigger>

        <PopoverContent
          className="w-96 p-4 dark:bg-slate-800 bg-white border-slate-200 dark:border-slate-700"
        >
          <form
            className="w-full dark:bg-slate-800"
            onSubmit={(e) => e.preventDefault()}
          >
            {/* כותרת */}
            <div className="flex flex-col gap-1 text-center justify-center pb-4 border-b dark:border-slate-700">
              <div className="flex items-center justify-center space-x-2">
                <h2 className="text-lg font-semibold dark:text-slate-300">
                  {__("Usage & Limits", "whizmanage")}
                </h2>
                <HoverCard openDelay={300}>
                  <HoverCardTrigger asChild>
                    <Info className="size-5 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer" />
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80">
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold">
                        {__("Usage & Limits", "whizmanage")}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {__(
                          "Control and monitor the application of this coupon with respect to overall usage, specific user limitations, and the number of items it can be applied to. Proper management ensures optimal benefit from promotional strategies.",
                          "whizmanage"
                        )}
                      </p>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </div>
            </div>

            {/* שדות */}
            <div className="py-4 flex flex-col gap-4">
              {/* Usage Count - לקריאה בלבד */}
              <div className="space-y-2">
                <div className="w-full flex items-center justify-start gap-1.5 px-1">
                  <HoverCard openDelay={300}>
                    <HoverCardTrigger asChild>
                      <Info className="size-3 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer" />
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold">{__("Usage", "whizmanage")}</h4>
                        <p className="text-sm text-muted-foreground">
                          {__("The number of times this coupon has already been used.", "whizmanage")}
                        </p>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                  <Label className="text-sm text-muted-foreground">
                    {__("Usage", "whizmanage")}
                  </Label>
                </div>
                <Input
                  disabled
                  className="w-full cursor-not-allowed dark:!border-0"
                  value={usageCount}
                  readOnly
                  tabIndex={-1}
                />
              </div>

              {/* Usage Limit */}
              <div className="space-y-2">
                <div className="w-full flex items-center justify-start gap-1.5 px-1">
                  <HoverCard openDelay={300}>
                    <HoverCardTrigger asChild>
                      <Info className="size-3 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer" />
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold">
                          {__("Usage limit per coupon", "whizmanage")}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {__("How many times this coupon can be used before it is void.", "whizmanage")}
                        </p>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                  <Label className="text-sm text-muted-foreground">
                    {__("Usage limit per coupon", "whizmanage")}
                  </Label>
                </div>
                <Input
                  type="number"
                  min="0"
                  className="w-full"
                  value={tempValues.usage_limit}
                  onChange={(e) =>
                    handleFieldChange("usage_limit", e.target.value)
                  }
                  onKeyDown={handleKeyDown}
                  onFocus={(e) => e.target.select()}
                  placeholder={__("Unlimited", "whizmanage")}
                  disabled={isSaving}
                />
              </div>

              {/* Usage Limit Per User */}
              <div className="space-y-2">
                <div className="w-full flex items-center justify-start gap-1.5 px-1">
                  <HoverCard openDelay={300}>
                    <HoverCardTrigger asChild>
                      <Info className="size-3 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer" />
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold">
                          {__("Usage limit per user", "whizmanage")}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {__(
                            "How many times this coupon can be used by an individual user. Uses billing email for guests, and user ID for logged in users.",
                            "whizmanage"
                          )}
                        </p>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                  <Label className="text-sm text-muted-foreground">
                    {__("Usage limit per user", "whizmanage")}
                  </Label>
                </div>
                <Input
                  type="number"
                  min="0"
                  className="w-full"
                  value={tempValues.usage_limit_per_user}
                  onChange={(e) =>
                    handleFieldChange("usage_limit_per_user", e.target.value)
                  }
                  onKeyDown={handleKeyDown}
                  onFocus={(e) => e.target.select()}
                  placeholder={__("Unlimited", "whizmanage")}
                  disabled={isSaving}
                />
              </div>

              {/* Limit Usage to X Items */}
              <div className="space-y-2">
                <div className="w-full flex items-center justify-start gap-1.5 px-1">
                  <HoverCard openDelay={300}>
                    <HoverCardTrigger asChild>
                      <Info className="size-3 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer" />
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold">
                          {__("Limit usage to X items", "whizmanage")}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {__(
                            "The maximum number of individual items this coupon can apply to.",
                            "whizmanage"
                          )}
                        </p>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                  <Label className="text-sm text-muted-foreground">
                    {__("Limit usage to X items", "whizmanage")}
                  </Label>
                </div>
                <Input
                  type="number"
                  min="0"
                  className="w-full"
                  value={tempValues.limit_usage_to_x_items}
                  onChange={(e) =>
                    handleFieldChange("limit_usage_to_x_items", e.target.value)
                  }
                  onKeyDown={handleKeyDown}
                  onFocus={(e) => e.target.select()}
                  placeholder={__("Unlimited", "whizmanage")}
                  disabled={isSaving}
                />
              </div>
            </div>

            {/* כפתור שמירה */}
            <div className="pt-4 border-t dark:border-slate-700">
              <Button
                type="button"
                className="w-full"
                onClick={handleSaveAll}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    {__("Saving...", "whizmanage")}
                  </>
                ) : (
                  __("Save", "whizmanage")
                )}
              </Button>
            </div>
          </form>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default UsageLimitCell;