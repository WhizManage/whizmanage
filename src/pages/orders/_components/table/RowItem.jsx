import { cn } from "@/lib/utils";
import CustomTooltip from "@components/nextUI/Tooltip";
import { TableCell, TableRow } from "@components/ui/table";
import { flexRender } from "@tanstack/react-table";
import {
  CheckCircle,
  EditIcon,
  ListRestart,
  RefreshCcw,
  Save,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { putApi } from "/src/services/services";
import { __ } from '@wordpress/i18n';
import { getChangedFields } from "@/utils/historyUtils";
import { postApi } from "../../../../services/services";

function RowItem({
  row,
  isEditing,
  toggleEdit,
  editAll,
  setData,
  editedItems,
  setEditedItems,
  isTrash,
  isDark,
}) {
  const [isLoading, setIsLoading] = useState(false);
  
  const [initialDataOnEdit, setInitialDataOnEdit] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const isRTL = document.documentElement.dir === 'rtl';
  // apply coupon for real (existing order or simulation)

  // פונקציה להגדרת z-index דינמי
  const getRowZIndex = () => {
    if (isDropdownOpen) return 50; // z-index גבוה לשורה עם dropdown פתוח או בפוקוס
    if (isEditing) return 38; // z-index רגיל לשורות במצב עריכה
    return 'auto'; // z-index רגיל לשורות רגילות
  };

  useEffect(() => {
    if (isEditing) {
      setInitialDataOnEdit(JSON.parse(JSON.stringify(row.original)));
    } else {
      setInitialDataOnEdit(null);
    }
  }, [isEditing]);

  useEffect(() => {
    if (editAll && !isEditing && row.original.parent_id == 0) toggleEdit(row);
  }, [editAll]);

  const updateOrder = async (row) => {
    setIsLoading(true);

    const _bodyData = row.original;

    if (_bodyData?.billing?.email === "") {
      _bodyData.billing.email = null;
    }

    let discountTotal = 0;

    if (JSON.stringify(_bodyData.coupons_data) === JSON.stringify(initialDataOnEdit.coupons_data)) {
      delete _bodyData.coupons_data;
    }

    _bodyData.line_items = _bodyData.line_items.map(item => {
      if (item?.parent_name === null) {
        item.parent_name = "";
      }

      if (typeof item?.image !== 'object' || item?.image === null) {
        item.image = {};
      }

      if (typeof item?.image?.id === 'string') item.image.id = 0;

      // ודא ש־price ו־quantity קיימים ונכונים
      const price = parseFloat(item.price || 0);
      const quantity = parseInt(item.quantity || 1);

      item.subtotal = (price * quantity).toFixed(2);
      item.total = (price * quantity).toFixed(2);

      delete item.price;

      return item;
    });

    // חישוב הסכום הכולל לפני הנחה
    const totalAmount = _bodyData.line_items.reduce((sum, item) => {
      return sum + parseFloat(item.total);
    }, 0);

    // חישוב הסכום הסופי אחרי הנחה
    _bodyData.total = Math.max(0, totalAmount - discountTotal).toFixed(2);

    console.log(_bodyData);
    const url = `${window.siteUrl}/wp-json/wc/v3/orders/${_bodyData.id}`;

    await putApi(url, _bodyData)
      .then((data) => {
        console.log(data);

        // if (initialDataOnEdit) {
        //   const changedFields = getChangedFields(initialDataOnEdit, row.original);
        //   if (Object.keys(changedFields).length > 0) {
        //     postApi(`${window.siteUrl}/wp-json/whizmanage/v1/history`, {
        //       location: "orders",
        //       items: changedFields,
        //       action: "put"
        //     });
        //   }
        // }

        showToast("success", __("The order has been updated successfully", "whizmanage"));
        if (isEditing && row.original.parent_id == 0) {
          toggleEdit(row);
        }

        setData(prev => prev.map(item => {
          if (item.id !== data.data.id) return item;

          const incoming = data.data;
          const parentSource = incoming.source ?? item.source ?? row?.original?.source ?? null;
          const baseSubRows = Array.isArray(incoming.subRows) && incoming.subRows.length
            ? incoming.subRows
            : (item.subRows || []);

          return {
            ...item,
            ...incoming,
            source: parentSource,
            subRows: baseSubRows.map(sr => sr.source ? sr : { ...sr, source: parentSource }),
            refunds: Array.isArray(incoming.refunds) ? incoming.refunds : item.refunds,
          };
        }));
      })
      .catch((error) => {
        setIsLoading(false);
        console.log(error);

        showToast(
          "error",
          error?.response?.data?.message || error || "Unknown error occurred"
        );
      });

    setIsLoading(false);
  };

  const showToast = (type, message) => {
    const baseClasses =
      "p-3 w-full h-full rounded-md flex gap-3 items-center justify-start";
    const variants = {
      success: {
        containerClass: `${baseClasses} bg-emerald-50 dark:bg-slate-800 dark:text-slate-200 border-l-4 border-l-emerald-500`,
        icon: <CheckCircle className="w-5 h-5 text-emerald-500" />,
      },
      error: {
        containerClass: `${baseClasses} bg-rose-50 dark:bg-slate-800 dark:text-slate-200 border-l-4 border-l-rose-500`,
        icon: <XCircle className="w-5 h-5 text-rose-500" />,
      },
    };

    toast(
      <div className={variants[type].containerClass}>
        {variants[type].icon}
        <span className="font-medium">{message}</span>
      </div>,
      { duration: 4000 }
    );
  };

  const dataValidation = (data) => {
    if (data.name == "" && data?.short_description?.length >= 0) {
      showToast("error", __("Coupon name is required", "whizmanage"));
      return false;
    } else if (
      parseFloat(data.regular_price) < 0 ||
      parseFloat(data.sale_price) < 0
    ) {
      showToast("error", __("Price cannot be less than 0", "whizmanage"));
      return false;
    } else if (parseFloat(data.sale_price) > parseFloat(data.regular_price)) {
      showToast("error", __("Sale price cannot be more then regular price", "whizmanage"));
      return false;
    } else return true;
  };

  const getCommonPinningStyles = (column) => {
    const isPinned = column.getIsPinned();
    const isPinnedLeft = isPinned === "left";
    const isPinnedRight = isPinned === "right";

    if (!isPinned) {
      return {
        width: column.getSize(),
        minWidth: column.getSize(),
      };
    }

    return {
      width: column.getSize(),
      minWidth: column.getSize(),
      position: "sticky",
      [isRTL ? "right" : "left"]: isPinnedLeft
        ? `${column.getStart("left")}px`
        : undefined,
      [isRTL ? "left" : "right"]: isPinnedRight
        ? `${column.getAfter("right")}px`
        : undefined,
      zIndex: 37,
    };
  };

  const ShadowEffect = ({ pinSide }) => {
    const isLeft = pinSide === "left";
    return (
      <div
        className="absolute top-0 bottom-0 transition-opacity duration-200 opacity-60 dark:!opacity-100 group-hover:opacity-80"
        style={{
          [isRTL ? (isLeft ? "left" : "right") : isLeft ? "right" : "left"]:
            "-4px",
          width: "4px",
          background: isDark
            ? `linear-gradient(to ${isLeft ? "right" : "left"}, rgba(255,255,255,0.75), transparent)`
            : `linear-gradient(to ${isLeft ? "right" : "left"}, rgba(0,0,0,0.08), transparent)`,
          zIndex: 38,
          pointerEvents: "none",
        }}
      />
    );
  };

  const ActionButton = ({ onClick, icon, tooltip, isLoading, loadingIcon }) => (
    <button
      onClick={onClick}
      className="w-8 h-8 rounded-full flex items-center justify-center 
                text-fuchsia-600 hover:bg-slate-100 hover:text-fuchsia-600/80
                dark:hover:bg-slate-700 dark:hover:text-fuchsia-600/90
                focus:outline-none focus:ring-2 focus:ring-fuchsia-600/30 
                transition-colors duration-200"
      disabled={isLoading}
    >
      <CustomTooltip title={tooltip}>
        <div className="flex items-center justify-center">
          {isLoading ? loadingIcon : icon}
        </div>
      </CustomTooltip>
    </button>
  );

  return (
    <TableRow
      key={row.id}
      data-state={row.getIsSelected() && "selected"}
      style={{ zIndex: getRowZIndex() }}
      className={cn(
        "group transition-colors duration-200",
        row.original.status === "pending" &&
        !isEditing &&
        "opacity-30 dark:opacity-20",
        isEditing &&
        "bg-slate-50 dark:bg-gray-800 shadow-md dark:shadow-inner overflow-hidden hover:bg-slate-50",
        isEditing &&
        !editAll &&
        "border-l-4 rtl:border-r-4 border-x-fuchsia-600 dark:!border-x-fuchsia-600 dark:border-b-slate-500",
        !isEditing && "hover:bg-slate-50",
        row.depth != 0 &&
        "bg-slate-50 hover:bg-slate-100 dark:!bg-gray-800 !border !border-slate-300 dark:!border-slate-600"
      )}
    >
      {row.getVisibleCells().map((cell) =>
        !isEditing ? (
          <TableCell
            key={cell.id}
            data-state={row.getIsSelected() && "selected"}
            style={getCommonPinningStyles(cell.column)}
            className={cn(
              "transition-colors duration-200 relative",
              cell.column.getIsPinned() &&
              "bg-background dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-gray-700 dark:data-[state=selected]:!bg-slate-900 dark:data-[state=selected]:group-hover:!bg-slate-700",
              cell.column.getIsPinned() &&
              row.depth != 0 &&
              "bg-slate-50 dark:bg-gray-800 group-hover:bg-slate-100 dark:group-hover:bg-gray-700 dark:data-[state=selected]:!bg-slate-900 dark:data-[state=selected]:group-hover:!bg-slate-700"
            )}
          >
            {cell.column.getIsPinned() === "left" &&
              cell.column.getIsLastColumn("left") && (
                <ShadowEffect pinSide="left" />
              )}

            {cell.column.getIsPinned() === "right" &&
              cell.column.getIsFirstColumn("right") && (
                <ShadowEffect pinSide="right" />
              )}

            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        ) : (
          <TableCell
            key={cell.id}
            data-state={row.getIsSelected() && "selected"}
            style={getCommonPinningStyles(cell.column)}
            onClick={() => {
              if (!editedItems.includes(row.original.id)) {
                setEditedItems([...editedItems, row.original.id]);
              }
            }}
            className={cn(
              "transition-colors duration-200 relative dark:data-[state=selected]:!bg-slate-900 dark:data-[state=selected]:group-hover:!bg-slate-700",
              cell.column.getIsPinned() &&
              "bg-slate-50 dark:bg-gray-800 dark:group-hover:bg-gray-700 transition-colors duration-200",
              cell.column.getIsPinned() &&
              row.depth != 0 &&
              "bg-slate-50 dark:bg-gray-800 transition-colors duration-200 dark:group-hover:bg-gray-700"
            )}
          >
            {cell.column.getIsPinned() === "left" &&
              cell.column.getIsLastColumn("left") && (
                <ShadowEffect pinSide="left" />
              )}

            {cell.column.getIsPinned() === "right" &&
              cell.column.getIsFirstColumn("right") && (
                <ShadowEffect pinSide="right" />
              )}
            <div
              tabIndex={0}
              onFocus={() => setIsDropdownOpen(true)}
              onBlur={() => setIsDropdownOpen(false)}
            >
              {flexRender(cell.column.columnDef.edit, cell.getContext())}
            </div>
          </TableCell>
        )
      )}
      {!editAll && (
        <TableCell
          className={cn(
            "sm:px-0 w-fit h-full bg-transparent z-40",
            "transition-colors duration-200"
          )}
          style={{
            position: "sticky",
            [isRTL ? "left" : "right"]: 0,
            zIndex: 38,
          }}
        >
          <div className="relative w-full h-full">
            <ShadowEffect pinSide={isRTL ? "left" : "right"} />
            <div
              data-state={row.getIsSelected() && "selected"}
              className={cn(
                "h-full w-full flex items-center justify-center gap-1",
                "transition-colors duration-200 dark:data-[state=selected]:!bg-slate-900 dark:data-[state=selected]:group-hover:!bg-slate-700",
                !isEditing &&
                "bg-background dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-gray-700",
                isEditing &&
                "bg-slate-50 dark:bg-gray-800 dark:group-hover:bg-gray-700",
                row.depth != 0 &&
                !isEditing &&
                "bg-slate-50 dark:bg-gray-800 group-hover:bg-slate-100 dark:group-hover:bg-gray-700"
              )}
            >
              {isTrash ? (
                <ActionButton
                  onClick={() => {
                    row.original.status = "publish";
                    updateOrder(row);
                  }}
                  icon={<ListRestart className="size-5" />}
                  tooltip={__("Restore order", "whizmanage")}
                  isLoading={isLoading}
                  loadingIcon={<RefreshCcw className="size-4 animate-spin" />}
                />
              ) : (
                row.original.parent_id == 0 &&
                (isEditing ? (
                  <>
                    <ActionButton
                      onClick={async () => {
                        setData((prev) =>
                          prev.map((item) =>
                            item.id === initialDataOnEdit.id
                              ? initialDataOnEdit
                              : item
                          )
                        );
                        toggleEdit(row, false);
                      }}
                      icon={<X className="size-5" />}
                      tooltip={__("Cancel Edits", "whizmanage")}
                    />

                    <ActionButton
                      onClick={() => {
                        if (!dataValidation(row.original)) return;
                        updateOrder(row);
                      }}
                      isLoading={isLoading}
                      loadingIcon={
                        <RefreshCcw className="size-4 animate-spin" />
                      }
                      icon={<Save className="size-4" />}
                      tooltip={__("Save Changes", "whizmanage")}
                    />
                  </>
                ) : (
                  <ActionButton
                    onClick={() => toggleEdit(row, true)}
                    icon={<EditIcon className="size-4" />}
                    tooltip={__("Edit order", "whizmanage")}
                    isLoading={isLoading}
                    loadingIcon={<RefreshCcw className="size-4 animate-spin" />}
                  />
                ))
              )}
            </div>
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}
export default RowItem;
