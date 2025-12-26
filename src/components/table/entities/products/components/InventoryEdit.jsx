// src/components/table/products/components/InventoryEdit.jsx
import {
  getInventoryBadgeClasses,
  getInventoryConfig,
} from "@/data/inventoryStyles";
import { cn } from "@/lib/utils";
import { Button } from "@components/ui/button";
import { IconBadge } from "@components/ui/custom/IconBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import { CustomRadio } from "@components/ui/nextUI/Radio";
import { Switch } from "@components/ui/switch";
import { RadioGroup } from "@heroui/react";
import { AlertCircle, Loader2, Package } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { __ } from "@wordpress/i18n";

const InventoryEdit = ({
  onChange,
  onFinish,
  onDirectUpdate,
  inputRef,
  row,
}) => {
  const t = (text) => __(String(text), "whizmanage");

  const isRTL = window?.document?.documentElement?.dir === "rtl";

  const productType = row?.original?.type;

  // מוצר חיצוני - לא מציג כלום
  if (productType === "external") {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  // שמירת ערכים מקוריים לצורך ביטול
  const originalValues = useRef({
    manage_stock: row?.original?.manage_stock || false,
    stock_quantity: row?.original?.stock_quantity || row?.original?.stock || 0,
    low_stock_amount: row?.original?.low_stock_amount || 0,
    stock_status: row?.original?.stock_status || "instock",
    backorders: row?.original?.backorders || "no",
  });

  // אתחול מבוסס על הנתונים הקיימים
  const [manage, setManage] = useState(originalValues.current.manage_stock);
  const [quantity, setQuantity] = useState(originalValues.current.stock_quantity);
  const [lowQuantity, setLowQuantity] = useState(originalValues.current.low_stock_amount);
  const [status, setStatus] = useState(originalValues.current.stock_status);
  const [backorders, setBackorders] = useState(originalValues.current.backorders);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const mountedRef = useRef(true);

  // בניית אובייקט inventory
  const buildInventoryData = () => ({
    manage_stock: manage,
    stock_quantity: manage ? parseInt(quantity) : null,
    low_stock_amount: manage ? parseInt(lowQuantity) : null,
    stock_status: !manage ? status : quantity > 0 ? "instock" : "outofstock",
    backorders: manage ? backorders : "no",
  });

  // שמירה - שולח בקשה אחת לשרת
  const handleSave = async () => {
    setIsSaving(true);

    const inventoryData = buildInventoryData();

    // productsMasterUpdateCell מטפל בעדכון ה-store וההיסטוריה
    onChange(inventoryData);

    try {
      if (onDirectUpdate) {
        await onDirectUpdate(inventoryData);
      }
    } catch (error) {
      console.error("Failed to update inventory:", error);
    } finally {
      if (mountedRef.current) {
        setIsSaving(false);
        setIsOpen(false);
        onFinish();
      }
    }
  };

  // ביטול - חזרה לערכים המקוריים
  const handleCancel = () => {
    setManage(originalValues.current.manage_stock);
    setQuantity(originalValues.current.stock_quantity);
    setLowQuantity(originalValues.current.low_stock_amount);
    setStatus(originalValues.current.stock_status);
    setBackorders(originalValues.current.backorders);
    setIsOpen(false);
    onFinish();
  };

  // פתיחה אוטומטית
  useEffect(() => {
    mountedRef.current = true;

    const openTimeout = setTimeout(() => {
      if (mountedRef.current) {
        setIsOpen(true);
      }
    }, 50);

    return () => {
      mountedRef.current = false;
      clearTimeout(openTimeout);
    };
  }, []);

  return (
    <DropdownMenu
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSaving) {
          // אם סוגרים בלי לשמור - פשוט מבטלים
          handleCancel();
        } else {
          setIsOpen(true);
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          ref={inputRef}
          variant="ghost"
          className="h-auto p-0 hover:bg-transparent"
          disabled={false}
        >
          {(() => {
            const data = {
              manage_stock: productType === "grouped" ? false : manage,
              stock_quantity: quantity,
              stock_status: status,
              low_stock_amount: lowQuantity,
            };
            const classes = getInventoryBadgeClasses(data);
            const config = getInventoryConfig(data);
            return (
              <div className={classes.container}>
                <div className={classes.dot} />
                <span className={classes.text}>
                  {productType === "grouped"
                    ? t(config.label)
                    : manage
                      ? quantity
                      : t(config.label)}
                </span>
              </div>
            );
          })()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent
          className="w-[580px] p-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg"
          dir={isRTL ? "rtl" : "ltr"}
          style={{ zIndex: 10000 }}
          sideOffset={5}
          align="start"
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            if (!isSaving) handleCancel();
          }}
          onPointerDownOutside={(e) => {
            e.preventDefault();
            // לא סוגרים אוטומטית - המשתמש צריך ללחוץ על שמור או ביטול
          }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <IconBadge icon={Package} variant="default" size="default" />
              <div>
                <h4 className="font-semibold text-sm">{t("Inventory")}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {productType === "grouped"
                    ? t("Set stock status")
                    : t("Manage product stock")}
                </p>
              </div>
            </div>
          </div>

          {/* Content - גובה קבוע כדי למנוע קפיצות בין מצבים */}
          <div className="p-4 space-y-4 dark:bg-slate-900/50 h-[200px] overflow-y-auto scrollbar-whiz">
            {/* מוצר מקושר - רק סטטוס */}
            {productType === "grouped" ? (
              <div className="space-y-1">
                <Label className="text-sm font-medium mb-2 block">
                  {t("Stock status")}
                </Label>
                <DropdownMenuGroup className="flex flex-wrap gap-1.5">
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    onClick={() => setStatus("instock")}
                    className={cn(
                      "cursor-pointer rounded-md flex-1 min-w-fit",
                      status === "instock" && "bg-green-50 dark:bg-green-900/20"
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-green-700 dark:text-green-400 font-medium text-xs">
                        {t("In stock")}
                      </span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    onClick={() => setStatus("outofstock")}
                    className={cn(
                      "cursor-pointer rounded-md flex-1 min-w-fit",
                      status === "outofstock" && "bg-red-50 dark:bg-red-900/20"
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="text-red-600 dark:text-red-400 font-medium text-xs">
                        {t("Out of stock")}
                      </span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    onClick={() => setStatus("onbackorder")}
                    className={cn(
                      "cursor-pointer rounded-md flex-1 min-w-fit",
                      status === "onbackorder" &&
                        "bg-yellow-50 dark:bg-yellow-900/20"
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      <span className="text-yellow-600 dark:text-yellow-400 font-medium text-xs">
                        {t("On backorder")}
                      </span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </div>
            ) : (
              <>
                {/* Manage Stock Toggle - רק למוצרים רגילים */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/50">
                  <Label
                    htmlFor="manage-stock"
                    className="font-medium text-sm cursor-pointer"
                  >
                    {t("Manage stock")}
                  </Label>

                  <Switch
                    id="manage-stock"
                    checked={manage}
                    onCheckedChange={setManage}
                  />
                </div>

                {manage ? (
                  <div className="flex gap-4">
                    {/* צד שמאל - שדות כמות */}
                    <div className="w-[200px] space-y-3">
                      {/* Stock Quantity */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          {t("Stock quantity")}
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          placeholder={t("Enter quantity")}
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value || "0")}
                          className="h-9"
                          onFocus={(event) => event.target.select()}
                          autoFocus
                        />
                      </div>

                      {/* Low Stock Threshold */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />
                          {t("Low stock threshold")}
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          placeholder={t("Enter low stock amount")}
                          value={lowQuantity}
                          onChange={(e) => setLowQuantity(e.target.value || "0")}
                          className="h-9"
                          onFocus={(event) => event.target.select()}
                        />
                      </div>
                    </div>

                    {/* צד ימין - Backorders */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <Label className="text-sm font-medium">
                        {t("Allow backorders?")}
                      </Label>
                      <RadioGroup
                        value={backorders}
                        onValueChange={setBackorders}
                        className="flex flex-col gap-2 mt-0 text-xs"
                      >
                        <CustomRadio value="no" className="text-xs">
                          {t("Do not allow")}
                        </CustomRadio>
                        <CustomRadio value="notify" className="text-xs">
                          {t("Allow, but notify customer")}
                        </CustomRadio>
                        <CustomRadio value="yes" className="text-xs">
                          {t("Allow")}
                        </CustomRadio>
                      </RadioGroup>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Label className="text-sm font-medium mb-2 block">
                      {t("Stock status")}
                    </Label>
                    <DropdownMenuGroup className="flex flex-wrap gap-1.5">
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        onClick={() => setStatus("instock")}
                        className={cn(
                          "cursor-pointer rounded-md flex-1 min-w-fit",
                          status === "instock" &&
                            "bg-green-50 dark:bg-green-900/20"
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="text-green-700 dark:text-green-400 font-medium text-xs">
                            {t("In stock")}
                          </span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        onClick={() => setStatus("outofstock")}
                        className={cn(
                          "cursor-pointer rounded-md flex-1 min-w-fit",
                          status === "outofstock" &&
                            "bg-red-50 dark:bg-red-900/20"
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          <span className="text-red-600 dark:text-red-400 font-medium text-xs">
                            {t("Out of stock")}
                          </span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        onClick={() => setStatus("onbackorder")}
                        className={cn(
                          "cursor-pointer rounded-md flex-1 min-w-fit",
                          status === "onbackorder" &&
                            "bg-yellow-50 dark:bg-yellow-900/20"
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-yellow-500" />
                          <span className="text-yellow-600 dark:text-yellow-400 font-medium text-xs">
                            {t("On backorder")}
                          </span>
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer - Save/Cancel buttons */}
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
            >
              {t("Cancel")}
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin me-1" />
                  {t("Saving...")}
                </>
              ) : (
                t("Save")
              )}
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
};

export default InventoryEdit;
