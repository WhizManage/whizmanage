import { IconBadge } from "@components/IconBadge";
import { Badge } from "@components/ui/badge";
import { Button } from "@components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@components/ui/command";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/ui/popover";
import {
  Minus,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Tag,
  X,
  RotateCcw,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { __ } from '@wordpress/i18n';
import { postApi } from "@/services/services";
import { getApi } from "../../../../../../services/services";
import RefundModal from "./RefundModal";

const OrderLineItems = ({
  updateValue,
  products = [],
  coupons_data,
  line_items,
  email = null,
  row = null
}) => {
  
  const [lineItems, setLineItems] = useState(line_items || []);
  const [subtotal, setSubtotal] = useState(0);
  const [total, setTotal] = useState(0);
  const [discountTotal, setDiscountTotal] = useState(0);
  const renderCountRef = useRef(0);

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredProducts, setFilteredProducts] = useState([]);

  const [appliedCoupons, setAppliedCoupons] = useState([]);
  const [loadingCoupon, setLoadingCoupon] = useState(false);
  const [couponError, setCouponError] = useState("");

  const [couponCode, setCouponCode] = useState("");
  const [suggestedCoupons, setSuggestedCoupons] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Refund modal state
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);

  const orderId = row?.original?.id;

  useEffect(() => {
    if (Array.isArray(line_items)) {
      setLineItems(line_items.filter((i) => parseInt(i.quantity) > 0));
    }
    if (Array.isArray(coupons_data) && coupons_data.length > 0) {
      setAppliedCoupons(coupons_data);
      const sum = coupons_data.reduce(
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
    let sum = lineItems.reduce(
      (acc, item) => acc + parseFloat(item.price) * parseInt(item.quantity),
      0
    );
    const totalAfterDiscount = Math.max(0, sum - discountTotal);
    setSubtotal(sum);
    setTotal(totalAfterDiscount);

    updateValue("line_items", lineItems);
    updateValue("subtotal", sum.toFixed(2));
    updateValue("total", totalAfterDiscount.toFixed(2));
    updateValue("discount_total", discountTotal.toFixed(2));
    updateValue("coupons_data", appliedCoupons);
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

  const fetchSuggestedCoupons = async (query) => {
    if (!query || query.length < 2) {
      setSuggestedCoupons([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const response = await getApi(`${window.siteUrl}/wp-json/wc/v3/coupons?search=${query}`);

      if (Array.isArray(response?.data)) {
        const filtered = response.data.map((c) => ({
          code: c.code,
          discount: c.amount,
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
      line_items: lineItems.map((i) => ({
        product_id: i.product_id,
        quantity: i.quantity,
        price: i.price,
      })),
    };

    try {
      const res = await postApi(
        `${window.siteUrl}/wp-json/whizmanage/v1/check_coupons/`,
        body
      );

      const result = res.data;

      if (result.success && Array.isArray(result.coupons)) {
        setAppliedCoupons(result.coupons);
        const sum = result.coupons.reduce(
          (acc, c) => acc + (parseFloat(c.discount) || 0),
          0
        );
        setDiscountTotal(sum);
      } else {
        setAppliedCoupons([]);
        setDiscountTotal(0);
        setCouponError(result.message || __("Error applying coupon", "whizmanage"));
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
      const newItem = {
        id: Date.now(),
        product_id: product.id,
        name: product.name,
        price: product.price || product.regular_price || "0",
        quantity: 1,
        image: product.image || null,
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
        }
        return updated;
      })
    );
  };

  const getProductImage = (item) =>
    item.image ? (
      <img
        src={item.image}
        alt={item.name}
        className="w-12 h-12 object-cover rounded-md"
      />
    ) : (
      <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 flex items-center justify-center rounded-md">
        <Package className="w-6 h-6 text-slate-400" />
      </div>
    );

  const renderCurrency = () =>
    window.currency ? (
      <span dangerouslySetInnerHTML={{ __html: window.currency }} />
    ) : (
      "$"
    );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-x-2">
        <IconBadge icon={ShoppingCart} />
        <h2 className="text-xl dark:text-gray-400">{__("Order Items", "whizmanage")}</h2>
      </div>
      {/* Product Selection */}
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
                  {filteredProducts.map((product) => (
                    <CommandItem
                      key={product.id}
                      onSelect={() => addLineItem(product)}
                      className="flex items-center gap-3 cursor-pointer py-2"
                    >
                      {product.image && product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-8 h-8 object-cover rounded-sm"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-slate-100 dark:bg-slate-600 rounded-sm flex items-center justify-center">
                          <Package className="w-4 h-4 opacity-50" />
                        </div>
                      )}
                      <div className="flex flex-col flex-1">
                        <span className="font-medium">{product.name}</span>
                        <span className="text-xs text-muted-foreground truncate">
                          ID: {product.id}
                        </span>
                      </div>
                      <div className="font-semibold">
                        {renderCurrency()}
                        {product.price || product.regular_price || "0"}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      {/* Line Items Table */}
      <div className="flex flex-col gap-4 px-1">
        {lineItems.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground border border-dashed rounded-lg">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>{__("No items in this order yet", "whizmanage")}</p>
            <p className="text-sm">
              {__("Search for products to add them to the order", "whizmanage")}
            </p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 bg-slate-50 dark:bg-slate-800 px-4 py-2 text-sm font-medium">
              <div className="col-span-4">{__("Product", "whizmanage")}</div>
              <div className="col-span-2 text-start">{__("Price", "whizmanage")}</div>
              <div className="col-span-4 text-start">{__("Quantity", "whizmanage")}</div>
              <div className="col-span-2 text-start">{__("Total", "whizmanage")}</div>
            </div>

            <div className="divide-y">
              {lineItems.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-12 p-2 items-center"
                >
                  <div className="col-span-4 flex items-center gap-3">
                    {getProductImage(item)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        ID: {item.product_id}
                      </p>
                    </div>
                  </div>

                  <div className="col-span-2 text-start">
                    {renderCurrency()}
                    {parseFloat(item.price).toFixed(2)}
                  </div>

                  <div className="col-span-4 flex gap-1 justify-start items-center">
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
                      disabled={parseInt(item.quantity) <= 1}
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
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="col-span-1 text-start font-medium">
                    {renderCurrency()}
                    {(parseFloat(item.price) * parseInt(item.quantity)).toFixed(
                      2
                    )}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLineItem(item.id)}
                      className="h-4 w-4 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {/* Coupon Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-x-2">
          <IconBadge icon={Tag} />
          <h3 className="text-lg dark:text-gray-400">{__("Coupons", "whizmanage")}</h3>
        </div>

        <div className="flex flex-col gap-3 px-1">
          {/* Input + Suggestions */}
          <div className="flex flex-col gap-1 relative w-full">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder={__("Enter coupon code", "whizmanage")}
                value={couponCode}
                onChange={(e) => {
                  const value = e.target.value;
                  setCouponCode(value);
                  fetchSuggestedCoupons(value);
                }}
                className="flex-1 dark:!text-slate-300"
                disabled={loadingCoupon}
                onKeyDown={async (e) => {
                  if (e.key === "Enter" && !loadingCoupon && couponCode.trim()) {
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

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestedCoupons.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-slate-800 border rounded shadow z-20 max-h-60 overflow-y-auto">
                {suggestedCoupons.map((coupon, i) => (
                  <div
                    key={i}
                    className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm"
                    onClick={() => {
                      setCouponCode(coupon.code);
                      setShowSuggestions(false);
                      simulate(coupon.code);
                      setCouponCode("");
                    }}
                  >
                    {coupon.code} – {renderCurrency()}
                    {parseFloat(coupon.discount).toFixed(2)}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error Message */}
          {couponError && (
            <div className="text-sm text-red-600 dark:text-red-400">
              {couponError}
            </div>
          )}

          {/* Applied Coupons */}
          {appliedCoupons.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label
                className="text-sm font-medium flex items-center gap-2"
                dir={i18n.dir()}
              >
                {__("Applied Coupons", "whizmanage")}
                {loadingCoupon && (
                  <span className="text-xs text-blue-600">
                    {__("Recalculating...", "whizmanage")}
                  </span>
                )}
              </Label>
              <div className="flex flex-wrap gap-2">
                {appliedCoupons.map((coupon, index) => (
                  <Badge
                    key={index}
                    className={`flex items-center gap-1 px-2 py-1 bg-green-200 text-muted-foreground ${loadingCoupon ? "opacity-50" : ""}`}
                  >
                    <Tag className="w-3 h-3" />
                    <span>{coupon.code}</span>
                    <span className="text-xs">
                      (-{renderCurrency()}
                      {parseFloat(coupon.discount || 0).toFixed(2)})
                    </span>
                    <button
                      onClick={() => removeCoupon(coupon.code)}
                      className="ml-1 hover:text-red-600 transition-colors"
                      disabled={loadingCoupon}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Refund Section - Only show if orderId exists */}
      {orderId && lineItems.length > 0 && row?.original?.status !== "refunded" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-x-2">
              <IconBadge icon={RotateCcw} />
              <h3 className="text-lg dark:text-gray-400">{__("Refunds", "whizmanage")}</h3>
            </div>
            <Button
              variant="outline"
              className="flex items-center gap-2 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
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
        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 ml-auto w-full px-4 space-y-2">
          <div className="flex justify-between py-2 text-sm">
            <span>{__("Subtotal", "whizmanage")}</span>
            <span className="font-medium">
              {renderCurrency()}
              {subtotal.toFixed(2)}
            </span>
          </div>

          {discountTotal > 0 && (
            <div className="flex justify-between py-2 text-sm text-green-600 dark:text-green-400">
              <span>{__("Discount", "whizmanage")}</span>
              <span className="font-medium">
                -{renderCurrency()}
                {discountTotal.toFixed(2)}
              </span>
            </div>
          )}

          <div className="flex justify-between border-t pt-3 font-semibold">
            <span>{__("Order Total", "whizmanage")}</span>
            <span>
              {renderCurrency()}
              {total.toFixed(2)}
            </span>
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
        renderCurrency={renderCurrency}
        getProductImage={getProductImage}
        orderData={row?.original}
      />
    </div>
  );
};

export default OrderLineItems;