// src/components/table/entities/orders/components/OrderLineItems.jsx

import { getApi, postApi } from "@/services/services";
import { useDebounceFn } from "@/components/table/hooks/useDebounce";
import { formatValue } from "../../../../../utils/formatValue.js";
import { Button } from "@components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@components/ui/command";
import { IconBadge } from "@components/ui/custom/IconBadge";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import CustomTooltip from "@components/ui/nextUI/Tooltip.jsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/ui/popover";
import {
  AlertCircle,
  Minus,
  Package,
  Plus,
  RotateCcw,
  Search,
  ShoppingCart,
  Tag,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { __ } from "@wordpress/i18n";
import RefundModal from "./RefundModal";

const OrderLineItems = ({
  updateValue,
  products = [],
  coupon_lines,
  line_items,
  email = null,
  row = null,
}) => {
  const [lineItems, setLineItems] = useState(line_items || []);
  const [subtotal, setSubtotal] = useState(0);
  const [total, setTotal] = useState(0);
  const [discountTotal, setDiscountTotal] = useState(0);
  const renderCountRef = useRef(0);

  const [failedImages, setFailedImages] = useState({});

  // ✅ אם אין row, זו הזמנה חדשה - אפשר לערוך
  const canEdit = useMemo(() => {
    if (!row || !row.original) return true;
    const status = String(row.original.status || "").toLowerCase();
    return ["pending", "on-hold", "auto-draft"].includes(status);
  }, [row?.original?.status]);

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredProducts, setFilteredProducts] = useState([]);

  const [appliedCoupons, setAppliedCoupons] = useState([]);
  const [loadingCoupon, setLoadingCoupon] = useState(false);
  const [couponError, setCouponError] = useState("");

  const [couponCode, setCouponCode] = useState("");
  const [suggestedCoupons, setSuggestedCoupons] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);

  const orderId = row?.original?.id;

  useEffect(() => {
    if (Array.isArray(line_items)) {
      setLineItems(line_items.filter((i) => parseInt(i.quantity) > 0));
    }
    if (Array.isArray(coupon_lines) && coupon_lines.length > 0) {
      setAppliedCoupons(coupon_lines);
      const sum = coupon_lines.reduce(
        (acc, c) => acc + (parseFloat(c.discount) || 0),
        0
      );
      setDiscountTotal(sum);
    }
  }, []);

  useEffect(() => {
    if (searchTerm && products.length) {
      setFilteredProducts(
        products.filter(
          (p) =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.id.toString().includes(searchTerm)
        )
      );
    } else {
      setFilteredProducts(products);
    }
  }, [searchTerm, products]);

  useEffect(() => {
    let sum = lineItems.reduce((acc, item) => {
      // Use item.total if available (from existing order), otherwise calculate from price*quantity
      const itemTotal =
        item.total !== undefined && item.total !== null
          ? parseFloat(item.total)
          : parseFloat(item.price) * parseInt(item.quantity);
      return acc + (isNaN(itemTotal) ? 0 : itemTotal);
    }, 0);
    const totalAfterDiscount = Math.max(0, sum - discountTotal);
    setSubtotal(sum);
    setTotal(totalAfterDiscount);

    updateValue("line_items", lineItems);
    updateValue("subtotal", sum.toFixed(2));
    updateValue("total", totalAfterDiscount.toFixed(2));
    updateValue("discount_total", discountTotal.toFixed(2));
    updateValue("coupon_lines", appliedCoupons);
  }, [lineItems, discountTotal, appliedCoupons]);

  useEffect(() => {
    renderCountRef.current += 1;
    if (renderCountRef.current < 3) return;
    if (appliedCoupons.length > 0) {
      simulateWithCoupons(appliedCoupons);
    } else {
      setDiscountTotal(0);
    }
  }, [lineItems]);

  const debouncedFetchCoupons = useDebounceFn(
    (query) => fetchSuggestedCoupons(query),
    { wait: 300 }
  );

  const fetchSuggestedCoupons = async (query) => {
    if (!query || query.length < 2) {
      setSuggestedCoupons([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const response = await getApi(
        `${window.siteUrl}/wp-json/wc/v3/coupons?search=${query}`
      );

      if (Array.isArray(response?.data)) {
        const filtered = response.data.map((c) => ({
          code: c.code,
          discount: c.amount,
          discount_type: c.discount_type, // percent, fixed_cart, fixed_product
        }));
        setSuggestedCoupons(filtered);
        setShowSuggestions(true);
      } else {
        setSuggestedCoupons([]);
        setShowSuggestions(false);
      }
    } catch (err) {
      console.error("Failed to fetch coupons", err);
      setSuggestedCoupons([]);
      setShowSuggestions(false);
    }
  };

  const simulateWithCoupons = async (coupons) => {
    if (coupons.length === 0) {
      setAppliedCoupons([]);
      setDiscountTotal(0);
      return;
    }

    setLoadingCoupon(true);
    setCouponError("");

    const body = {
      coupons: coupons.map((c) => c.code),
      ...(email && { customer_email: email }),
      line_items: lineItems
        .map((i) => ({
          product_id: parseInt(i.product_id, 10),
          variation_id: parseInt(i.variation_id, 10) || 0,
          quantity: i.quantity,
          price: i.price,
        }))
        .filter((i) => i.product_id > 0),
    };

    try {
      const res = await postApi(
        `${window.siteUrl}/wp-json/whizmanage/v1/check_coupons/`,
        body
      );

      const result = res.data || {};
      const serverCoupons = Array.isArray(result.coupons)
        ? result.coupons
        : null;
      const normalizedCodes = (coupons || []).map((c) =>
        typeof c === "string" ? { code: c } : { code: c.code }
      );

      if (result.success) {
        // ✅ בדיקה: אם הקופון לא הוחל בהצלחה על ידי השרת
        if (!serverCoupons || serverCoupons.length === 0) {
          // אם אין קופונים שהוחלו בהצלחה, לא להוסיף את הקופון
          setAppliedCoupons([]);
          setDiscountTotal(0);
          setCouponError(__("Coupon not found or invalid", "whizmanage"));
        } else {
          // הקופון הוחל בהצלחה
          setAppliedCoupons(serverCoupons);
          const serverDiscount = parseFloat(result.discount_total);
          if (!Number.isNaN(serverDiscount)) {
            setDiscountTotal(serverDiscount);
          } else {
            const sum = serverCoupons.reduce(
              (acc, c) => acc + (parseFloat(c.discount) || 0),
              0
            );
            setDiscountTotal(sum);
          }
        }
      } else {
        setAppliedCoupons([]);
        setDiscountTotal(0);
        // ✅ שימוש בהודעה מתורגמת במקום הודעת השרת (שהיא באנגלית)
        setCouponError(__("Coupon not found or invalid", "whizmanage"));
      }
    } catch (error) {
      setAppliedCoupons([]);
      setDiscountTotal(0);
      setCouponError(__("Error applying coupon", "whizmanage"));
    } finally {
      setLoadingCoupon(false);
    }
  };

  const removeCoupon = async (couponCode) => {
    const newCoupons = appliedCoupons.filter((c) => c.code !== couponCode);
    setCouponError("");

    if (newCoupons.length === 0) {
      setAppliedCoupons([]);
      setDiscountTotal(0);
      return;
    }

    await simulateWithCoupons(newCoupons);
  };

  const simulate = async (newCode) => {
    const coupons = newCode?.trim()
      ? [...appliedCoupons.map((c) => ({ code: c.code })), { code: newCode }]
      : appliedCoupons;
    await simulateWithCoupons(coupons);
  };

  const addLineItem = (product) => {
    const exists = lineItems.find((i) => i.product_id === product.id);
    if (exists) {
      updateLineItem(exists.id, "quantity", exists.quantity + 1);
    } else {
      const price = parseFloat(product.price || product.regular_price || 0);
      const newItem = {
        id: Date.now(),
        product_id: product.id,
        name: product.name,
        price: price,
        quantity: 1,
        total: price, // quantity=1, so total = price
        image: product.image || null,
        stock_status: product.stock_status || null,
      };
      setLineItems((prev) => [...prev, newItem]);
    }
    setIsOpen(false);
  };

  const removeLineItem = (id) =>
    setLineItems((prev) => prev.filter((i) => i.id !== id));

  const updateLineItem = (id, field, value) => {
    setLineItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const updated = { ...i, [field]: value };
        if (field === "quantity") {
          updated.quantity = parseInt(value) || 1;
          // Recalculate total when quantity changes
          updated.total = parseFloat(updated.price || 0) * updated.quantity;
        }
        return updated;
      })
    );
  };

  const getProductImage = (item) => {
    let imageUrl = item.image;

    if (typeof imageUrl === "object" && imageUrl !== null) {
      imageUrl = imageUrl.src || imageUrl.url || null;
    }

    const isValidUrl = typeof imageUrl === "string" && imageUrl.trim() !== "";

    if (isValidUrl && !failedImages[item.id]) {
      return (
        <img
          src={imageUrl}
          alt={item.name}
          className="w-12 h-12 object-cover rounded-md border border-slate-200 dark:border-slate-600"
          onError={() => {
            setFailedImages((prev) => ({ ...prev, [item.id]: true }));
          }}
        />
      );
    }

    return (
      <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-600">
        <Package className="w-6 h-6 text-slate-400" />
      </div>
    );
  };

  return (
    <div
      className="flex flex-col gap-6"
      dir={document.documentElement.dir || "ltr"}
    >
      <div className="flex items-center gap-x-2">
        <IconBadge icon={ShoppingCart} />
        <h2 className="text-xl dark:text-slate-300">{__("Order Items", "whizmanage")}</h2>
      </div>
      {/* Product Selection */}
      {canEdit && (
        <div className="flex flex-col w-full gap-1.5 px-1">
          <Label>{__("Add Products", "whizmanage")}</Label>

          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="flex justify-between text-left h-10 w-full"
              >
                <span>{__("Search for products", "whizmanage")}</span>
                <Search className="h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-full min-w-[300px]" align="start">
              <Command>
                <CommandInput
                  placeholder={`${__("Search products", "whizmanage")}...`}
                  value={searchTerm}
                  onValueChange={setSearchTerm}
                  className="!border-none !ring-0 !bg-transparent"
                />
                <CommandList>
                  <CommandEmpty>
                    {products.length === 0
                      ? __("Loading products...", "whizmanage")
                      : searchTerm.length === 0
                        ? __("Type to search products", "whizmanage")
                        : __("No products found", "whizmanage")}
                  </CommandEmpty>
                  <CommandGroup heading={__("Products", "whizmanage")}>
                    {filteredProducts.map((product) => {
                      let searchImgUrl = product.image;
                      if (
                        typeof searchImgUrl === "object" &&
                        searchImgUrl !== null
                      ) {
                        searchImgUrl =
                          searchImgUrl.src || searchImgUrl.url || null;
                      }
                      const isValidSearchUrl =
                        typeof searchImgUrl === "string" &&
                        searchImgUrl.trim() !== "";
                      const searchImgKey = `search-${product.id}`;

                      return (
                        // ⭐ בתוך CommandItem — הצגת סטטוס מלאי בחיפוש
                        <CommandItem
                          key={product.id}
                          value={`${product.name || ""} ${product.id || ""}`}
                          onSelect={() => addLineItem(product)}
                          className="flex items-center gap-3 cursor-pointer py-2"
                        >
                          {isValidSearchUrl && !failedImages[searchImgKey] ? (
                            <img
                              src={searchImgUrl}
                              alt={product.name}
                              className="w-8 h-8 object-cover rounded-sm"
                              onError={() =>
                                setFailedImages((prev) => ({
                                  ...prev,
                                  [searchImgKey]: true,
                                }))
                              }
                            />
                          ) : (
                            <div className="w-8 h-8 bg-slate-100 dark:bg-slate-600 rounded-sm flex items-center justify-center">
                              <Package className="w-4 h-4 opacity-50" />
                            </div>
                          )}
                          <div className="flex flex-col flex-1 min-w-0">
                            <CustomTooltip title={product.name}>
                              <span className="font-medium truncate">
                                {product.name}
                              </span>
                            </CustomTooltip>
                            <span className="text-xs text-muted-foreground truncate">
                              ID: {product.id}
                            </span>
                            {/* ⭐ STOCK STATUS ADDED */}
                            <span className="text-xs mt-0.5">
                              {product.stock_status === "instock" ? (
                                <span className="text-green-600 py-0.5 rounded">
                                  {__("In Stock", "whizmanage")}
                                </span>
                              ) : (
                                <span className="text-red-600 py-0.5 rounded">
                                  {__("Out of Stock", "whizmanage")}
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="font-semibold">
                            {formatValue(
                              product.price || product.regular_price || "0",
                              "currency"
                            )}
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      )}
      {/* Line Items Table */}
      <div className="flex flex-col gap-4 px-1">
        {lineItems.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl bg-slate-50/50 dark:bg-slate-800/50">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 mb-4">
              <Package className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-lg font-medium mb-2">
              {__("No items in this order", "whizmanage")}
            </p>
            {canEdit && (
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {__(
                  "Click the search button above to add products to this order",
                  "whizmanage"
                )}
              </p>
            )}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <div className="hidden md:grid grid-cols-12 bg-slate-50 dark:bg-slate-800 px-4 py-2 text-sm font-medium">
              <div className="col-span-4">{__("Product", "whizmanage")}</div>
              <div className="col-span-2">{__("Price", "whizmanage")}</div>
              <div className="col-span-4">{__("Quantity", "whizmanage")}</div>
              <div className="col-span-2">{__("Total", "whizmanage")}</div>
            </div>

            <div className="divide-y">
              {lineItems.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-0 p-4 md:p-2 items-center"
                >
                  <div className="col-span-1 md:col-span-4 flex items-center gap-3">
                    {getProductImage(item)}
                    <div className="flex-1 min-w-0">
                      <CustomTooltip
                        title={item.name}
                        description={`ID: ${item.product_id}${item.variation_id ? ` • Variation: ${item.variation_id}` : ""}`}
                        placement={
                          (document.documentElement.dir || "ltr") === "rtl"
                            ? "right-start"
                            : "left-start"
                        }
                      >
                        <p className="font-medium truncate">{item.name}</p>
                      </CustomTooltip>
                      <p className="text-xs text-muted-foreground">
                        ID: {item.product_id}
                      </p>

                      {/* ⭐ STOCK STATUS INSIDE ORDER TABLE */}
                      {(() => {
                        // ✅ חיפוש סטטוס מלאי - המוצרים משוטחים (flattened)
                        // עבור ווריאציות - חפש לפי variation_id
                        // עבור מוצרים פשוטים - חפש לפי product_id
                        let stockStatus = item.stock_status;

                        if (!stockStatus) {
                          // ✅ חפש קודם לפי variation_id (אם קיים)
                          if (item.variation_id) {
                            const variation = products.find(
                              (p) => p.id === item.variation_id
                            );
                            stockStatus = variation?.stock_status;
                          }

                          // ✅ אם לא נמצא, חפש לפי product_id
                          if (!stockStatus) {
                            const product = products.find(
                              (p) => p.id === item.product_id
                            );
                            stockStatus = product?.stock_status;
                          }
                        }

                        return (
                          <p className="text-xs mt-1">
                            {stockStatus === "instock" ? (
                              <span className="text-green-600 py-0.5 rounded">
                                {__("In Stock", "whizmanage")}
                              </span>
                            ) : (
                              <span className="text-red-600 py-0.5 rounded">
                                {__("Out of Stock", "whizmanage")}
                              </span>
                            )}
                          </p>
                        );
                      })()}
                      <p className="md:hidden text-sm mt-1">
                        {formatValue(item.price, "currency")}
                      </p>
                    </div>
                  </div>

                  <div className="hidden md:block md:col-span-2">
                    {formatValue(item.price, "currency")}
                  </div>

                  <div className="col-span-1 md:col-span-4 flex gap-1 justify-start items-center">
                    <span className="md:hidden text-sm mr-2">
                      {__("Quantity", "whizmanage")}:
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const newQuantity = Math.max(
                          1,
                          parseInt(item.quantity) - 1
                        );
                        updateLineItem(item.id, "quantity", newQuantity);
                      }}
                      className="size-6"
                      disabled={!canEdit || parseInt(item.quantity) <= 1}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>

                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={item.quantity}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (/^\d*$/.test(value)) {
                          const numValue = parseInt(value) || 1;
                          if (numValue >= 1) {
                            updateLineItem(item.id, "quantity", numValue);
                          }
                        }
                      }}
                      onBlur={(e) => {
                        const value = parseInt(e.target.value) || 1;
                        updateLineItem(item.id, "quantity", Math.max(1, value));
                      }}
                      className="w-12 !h-6 !max-h-6 !p-0 text-center !border-none !outline-none dark:!text-white focus:!ring-0 focus:!outline-0 !bg-transparent dark:!bg-slate-900 text-sm"
                      disabled={!canEdit}
                    />

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const newQuantity = parseInt(item.quantity) + 1;
                        updateLineItem(item.id, "quantity", newQuantity);
                      }}
                      className="size-6"
                      disabled={!canEdit}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="col-span-1 md:col-span-2 flex justify-between md:justify-start items-center">
                    <span className="md:hidden text-sm font-medium">
                      {__("Total", "whizmanage")}:
                    </span>
                    <span className="font-medium">
                      {formatValue(parseFloat(item.total), "currency")}
                    </span>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLineItem(item.id)}
                        className="md:ml-auto h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {/* Coupon Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-x-2">
            <IconBadge icon={Tag} />
            <h3 className="text-lg dark:text-slate-300">{__("Coupons", "whizmanage")}</h3>
          </div>
          {appliedCoupons.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {appliedCoupons.length} {__("coupons applied", "whizmanage")}
            </span>
          )}
        </div>

        {/* Applied Coupons Grid */}
        {appliedCoupons.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 px-1">
            {appliedCoupons.map((coupon, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 transition-opacity ${loadingCoupon ? "opacity-50" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{coupon.code}</span>
                    <span className="text-xs text-green-700 dark:text-green-300">
                      -{formatValue(coupon.discount || 0, "currency")}
                    </span>
                  </div>
                </div>
                {canEdit && (
                  <CustomTooltip title={__("Remove coupon", "whizmanage")} instantClose>
                    <button
                      onClick={() => removeCoupon(coupon.code)}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                      disabled={loadingCoupon}
                    >
                      <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                    </button>
                  </CustomTooltip>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add Coupon Input */}
        <div className="flex flex-col gap-3 px-1">
          {canEdit && (
            <div className="flex flex-col gap-1 relative w-full">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder={__("Enter coupon code", "whizmanage")}
                  value={couponCode}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCouponCode(value);
                    debouncedFetchCoupons(value);
                  }}
                  className="flex-1 dark:!text-slate-300"
                  disabled={loadingCoupon}
                  onKeyDown={async (e) => {
                    if (
                      e.key === "Enter" &&
                      !loadingCoupon &&
                      couponCode.trim()
                    ) {
                      await simulate(couponCode);
                      setCouponCode("");
                      setShowSuggestions(false);
                    }
                  }}
                />
                <Button
                  onClick={() => {
                    simulate(couponCode);
                    setCouponCode("");
                    setShowSuggestions(false);
                    setSuggestedCoupons([]);
                  }}
                  disabled={loadingCoupon || !couponCode.trim()}
                >
                  {loadingCoupon ? __("Applying...", "whizmanage") : __("Apply", "whizmanage")}
                </Button>
              </div>

              {showSuggestions && suggestedCoupons.length > 0 && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-slate-800 border rounded shadow z-20 max-h-60 overflow-y-auto scrollbar-whiz">
                  {suggestedCoupons.map((coupon, i) => (
                    <div
                      key={i}
                      className="px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer text-sm"
                      onClick={() => {
                        setCouponCode(coupon.code);
                        setShowSuggestions(false);
                        simulate(coupon.code);
                        setCouponCode("");
                      }}
                    >
                      {coupon.code} –{" "}
                      {coupon.discount_type === "percent"
                        ? `${coupon.discount}%`
                        : formatValue(coupon.discount, "currency").replace(
                            /\s/g,
                            ""
                          )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {loadingCoupon && (
            <div className="flex items-center gap-2 text-sm text-fuchsia-600 dark:text-fuchsia-400">
              <div className="w-4 h-4 border-2 border-fuchsia-600 border-t-transparent rounded-full animate-spin" />
              <span>{__("Recalculating discount...", "whizmanage")}</span>
            </div>
          )}

          {couponError && canEdit && (
            <div className="flex items-center justify-between gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{couponError}</span>
              </div>
              <button
                type="button"
                onClick={() => setCouponError("")}
                className="p-1.5 hover:bg-red-200 dark:hover:bg-red-800/50 rounded-full transition-colors cursor-pointer flex-shrink-0"
                aria-label={__("Dismiss", "whizmanage")}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {appliedCoupons.length === 0 && !canEdit && (
            <p className="text-sm text-muted-foreground opacity-60">
              {__("No coupons applied to this order", "whizmanage")}
            </p>
          )}
        </div>
      </div>
      {/* Refund Section */}
      {orderId &&
        lineItems.length > 0 &&
        row?.original?.status !== "refunded" && (
          <div className="flex flex-col gap-4 px-1">
            <div className="flex items-center justify-between p-4 bg-pink-50 dark:bg-pink-900/10 rounded-lg border border-pink-200 dark:border-pink-800 overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                  <RotateCcw className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                </div>
                <div>
                  <h3 className="font-medium text-slate-900 dark:text-white">
                    {__("Refunds", "whizmanage")}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {__("Process full or partial refund", "whizmanage")}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="flex items-center gap-2 border-pink-300 hover:bg-pink-100 dark:border-pink-700 dark:hover:bg-pink-900/20"
                onClick={() => setIsRefundModalOpen(true)}
              >
                <RotateCcw className="w-4 h-4" />
                {__("Process Refund", "whizmanage")}
              </Button>
            </div>
          </div>
        )}
      {/* Order Totals */}
      {lineItems.length > 0 && (
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-700 w-full col-span-full overflow-hidden">
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 text-sm border-b border-slate-200 dark:border-slate-700">
              <span className="text-muted-foreground">{__("Subtotal", "whizmanage")}</span>
              <span className="font-medium">
                {formatValue(subtotal, "currency")}
              </span>
            </div>

            {/* Shipping */}
            {(() => {
              const shippingTotal =
                parseFloat(row?.original?.shipping_total) || 0;
              return shippingTotal > 0 ? (
                <div className="flex justify-between items-center py-2 text-sm border-b border-slate-200 dark:border-slate-700">
                  <span className="text-muted-foreground">
                    {__("Shipping", "whizmanage")}
                  </span>
                  <span className="font-medium">
                    {formatValue(shippingTotal, "currency")}
                  </span>
                </div>
              ) : null;
            })()}

            {discountTotal > 0 && (
              <div className="flex justify-between items-center py-2 text-sm border-b border-slate-200 dark:border-slate-700">
                <span className="text-green-600 dark:text-green-400 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  {__("Discount", "whizmanage")}
                </span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  -{formatValue(discountTotal, "currency")}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 text-lg font-bold">
              <span>{__("Order Total", "whizmanage")}</span>
              <span className="text-fuchsia-600 dark:text-fuchsia-400">
                {formatValue(
                  total + (parseFloat(row?.original?.shipping_total) || 0),
                  "currency"
                )}
              </span>
            </div>
          </div>
        </div>
      )}
      {/* Refund Modal */}
      <RefundModal
        isOpen={isRefundModalOpen}
        onClose={() => setIsRefundModalOpen(false)}
        orderId={orderId}
        lineItems={lineItems}
        total={total}
        formatCurrency={(value) => formatValue(value, "currency")}
        getProductImage={getProductImage}
        orderData={row?.original}
      />
    </div>
  );
};

export default OrderLineItems;
