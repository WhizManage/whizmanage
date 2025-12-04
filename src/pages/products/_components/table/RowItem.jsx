import { cn } from "@/lib/utils";
import CustomTooltip from "@components/nextUI/Tooltip";
import { TableCell, TableRow } from "@components/ui/table";
import { flexRender } from "@tanstack/react-table";
import {
  CheckCircle,
  EditIcon,
  GripVertical,
  ListRestart,
  RefreshCcw,
  Save,
  X,
  XCircle,
} from "lucide-react";
import { forwardRef, useCallback, useEffect, useState } from "react";
import { __ } from '@wordpress/i18n';
import { toast } from "sonner";
import { putApi } from "/src/services/services";
import { getChangedFields } from "@/utils/historyUtils";
import { postApi } from "../../../../services/services";
import ProBadge from "../../../../components/nextUI/ProBadge";
import { metaDataColumns } from "./Columns";

const RowItem = forwardRef(function RowItem(
  {
    row,
    isEditing,
    toggleEdit,
    fetchData,
    editAll,
    editedItems,
    setEditedItems,
    setData,
    isTrash,
    isTableImport,
    isRTL,
    isDark,
    data,
    dragHandle,
    style,
  },
  ref
) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
   
  const [initialDataOnEdit, setInitialDataOnEdit] = useState(null);

  const listOfColumns = window.listTaxonomies.map(obj => obj.name);
  const listOfMetadata = metaDataColumns.map(obj => obj.key);
  // תיקון: הבדלה ברורה בין מצב dragging למצב רגיל
  const getRowZIndex = useCallback(() => {
    if (dragHandle?.isDragging) return 9999;
    if (isDropdownOpen) return 50;
    if (isEditing) return 38;
    return "auto";
  }, [dragHandle?.isDragging, isDropdownOpen, isEditing]);

  // תיקון עיקרי: החזרת הלוגיקה המקורית עם תוספת מינימלית לdrag
  const getCommonPinningStyles = useCallback(
    (column) => {
      const isPinned = column.getIsPinned();
      const isPinnedLeft = isPinned === "left";
      const isPinnedRight = isPinned === "right";

      // רק כשבאמת גוררים - מחזירים styling מיוחד
      if (dragHandle?.isDragging) {
        return {
          width: column.getSize(),
          minWidth: column.getSize(),
          position: "relative",
          zIndex: 9998,
          transform: "translateZ(0)",
          backfaceVisibility: "hidden",
        };
      }

      // אחרת - הלוגיקה המקורית בדיוק כמו קודם
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
        zIndex: 1, // הורדת z-index כדי שהצל והבורדר יראו
      };
    },
    [dragHandle?.isDragging, isRTL]
  );

  useEffect(() => {
    if (isEditing) {
      setInitialDataOnEdit(JSON.parse(JSON.stringify(row.original)));
    } else {
      setInitialDataOnEdit(null);
    }
  }, [isEditing]);

  useEffect(() => {
    if (editAll && !isEditing) toggleEdit(row);
  }, [editAll]);

  const updateProduct = async (row) => {
    setIsLoading(true);
    const _bodyData = row.original;

    if (_bodyData?.short_description?.length >= 0) {
    } else {
      delete _bodyData.shipping_class_id;
      const parent = data.find((item) => item.id === _bodyData.parent_id);

      if (parent && parent.sku === _bodyData.sku) {
        delete _bodyData.sku;
      }
      if (_bodyData.manage_stock == "parent") {
        delete _bodyData.manage_stock;
      }
    }

    const isVariation = !!_bodyData.parent_id;
    const url = isVariation
      ? `${window.siteUrl}/wp-json/wc/v3/products/${_bodyData.parent_id}/variations/${_bodyData.id}`
      : `${window.siteUrl}/wp-json/wc/v3/products/${_bodyData.id}`;

    try {
      const data = await putApi(url, _bodyData);
      showToast("success", __("The product has been updated successfully", "whizmanage"));

      if (initialDataOnEdit) {
        const changedFields = getChangedFields(initialDataOnEdit, row.original);
        if (Object.keys(changedFields).length > 0) {
          const itemsWithType = changedFields.map((ch) => ({
            ...ch,
            // סוג המוצר: simple / variable / variation / grouped / external וכו'
            type:
              row.original?.type ??
              (row.original?.parent_id ? "variation" : "simple"),
            // שימושי לשחזורים של וריאציות
            parent_id: row.original?.parent_id ?? null,
          }));

          postApi(`${window.siteUrl}/wp-json/whizmanage/v1/history`, {
            location: "products",
            items: itemsWithType,
            action: "put",
          });
        }
      }

      if (isEditing) {
        toggleEdit(row);
      }
      const loading = true;
      const idData =
        data.data.parent_id > 0 ? [data.data.parent_id] : [data.data.id];
      fetchData(loading, idData);
    } catch (error) {
      showToast(
        "error",
        error?.response?.data?.message || error || "Unknown error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = useCallback((type, message) => {
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
  }, []);

  const dataValidation = useCallback(
    (data) => {
      if (data.name == "" && data?.short_description?.length >= 0) {
        showToast("error", __("Product name is required", "whizmanage"));
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
    },
    [showToast]
  );

  // תיקון: החזרת z-index המקורי כשלא גוררים
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
          zIndex: 2, // z-index נמוך יותר כדי שהצל יראה
          pointerEvents: "none",
        }}
      />
    );
  };

  const ActionButton = ({ onClick, icon, tooltip, isLoading, loadingIcon }) => (
    <button
      onClick={onClick}
      className="w-8 h-8 rounded-full flex items-center justify-center 
                text-slate-600 hover:bg-slate-100 hover:text-slate-700
                dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-300
                focus:outline-none focus:ring-2 focus:ring-slate-500/30 
                transition-all duration-200"
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
      ref={ref}
      key={row.id}
      data-state={row.getIsSelected() && "selected"}
      style={{
        ...style,
        zIndex: getRowZIndex(),
        // שיפורי ביצועים נוספים
        ...(dragHandle?.isDragging && {
          pointerEvents: "none", // מונע התערבות של hover effects
          userSelect: "none", // מונע selection של טקסט
        }),
      }}
      className={cn(
        "group transition-all duration-200 relative",
        row.original.status === "pending" &&
          !isEditing &&
          "opacity-30 dark:opacity-20",
        isEditing &&
          "bg-slate-50 dark:bg-gray-800 shadow-md dark:shadow-inner overflow-hidden hover:bg-slate-50",
        isEditing &&
          !editAll &&
          "border-l-4 rtl:border-r-4 border-x-slate-500 dark:!border-x-slate-400 dark:border-b-slate-500",
        !isEditing && "hover:bg-slate-50 dark:hover:bg-slate-800/50",
        row.depth != 0 &&
          "bg-slate-50 hover:bg-slate-100 dark:!bg-gray-800 !border !border-slate-300 dark:!border-slate-600",
        dragHandle?.isDragging && [
          "opacity-95",
          "shadow-lg ring-2 ring-fuchsia-200 dark:ring-fuchsia-800",
          "border-fuchsia-200 dark:border-fuchsia-600",
          "bg-white dark:bg-gray-800",
          "!z-[9999]",
          "backdrop-blur-sm",
          "transform-gpu",
          "drop-shadow-[0_4px_15px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_0_8px_rgba(59,130,246,0.2)]",
        ]
      )}
    >
      {dragHandle?.isOver && !dragHandle?.isDragging && (
        <>
          <div className="absolute bottom-0 left-0 right-0 h-1 z-50 bg-gradient-to-r from-0% via-20% to-60% from-slate-400/60 via-slate-500/80 to-slate-400/60 rounded-full shadow-lg shadow-slate-500/50" />
          <div className="absolute bottom-0 top-3/4 left-0 right-0 z-40 pointer-events-none bg-gradient-to-r from-transparent via-slate-500/20 to-transparent rounded-b" />
        </>
      )}
      {row.getVisibleCells().map((cell, index) =>
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
            {index === 0 && dragHandle && (
              // <div
              //   {...dragHandle.attributes}
              //   {...dragHandle.listeners}
              //   className={cn(
              //     "absolute left-9 rtl:right-9 top-[31px] -translate-y-1/2",
              //     "cursor-grab active:cursor-grabbing",
              //     "opacity-0 group-hover:opacity-100 transition-all duration-300", // שיפור transition
              //     "hover:scale-110 active:scale-95", // אנימציות hover ו-active
              //     // "p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700", // רקע לhover
              //     row.depth !== 0 && "hidden"
              //   )}
              //   style={{
              //     touchAction: "none",
              //     zIndex: dragHandle?.isDragging ? 10000 : 50,
              //     // שיפור הביצועים
              //     willChange: dragHandle?.isDragging ? "transform" : "auto",
              //   }}
              //   // הוספת aria label לנגישות
              //   aria-label={`Drag to reorder ${row.original.name || "product"}`}
              // >
              //   <GripVertical
              //     data-testid={`grip-${row.original.id}`}
              //     className={cn(
              //       "size-[18px] transition-all duration-200", // הקטנה של duration
              //       "text-slate-400",
              //       "hover:text-slate-600 dark:hover:text-slate-200",
              //       dragHandle.isDragging &&
              //         "scale-110 drop-shadow-sm text-fuchsia-500"
              //     )}
              //   />
              // </div>
              (<></>)
            )}

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
            {(cell.column.id === "categories" ||
              cell.column.id === "tags" ||
              listOfColumns.includes(cell.column.id) ||
              listOfMetadata.includes(cell.column.id)) && (
              <div className="absolute top-4 right-6 transform translate-x-4 -translate-y-3 rotate-[20deg]">
                <ProBadge />
              </div>
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
            "sm:px-0 w-fit h-full bg-transparent",
            "transition-colors duration-200"
          )}
          style={{
            position: "sticky",
            [isRTL ? "left" : "right"]: 0,
            zIndex: 1, // z-index נמוך יותר כדי שהצל יראה
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
                    updateProduct(row);
                  }}
                  icon={<ListRestart className="size-5" />}
                  tooltip={__("Restore product", "whizmanage")}
                  isLoading={isLoading}
                  loadingIcon={<RefreshCcw className="size-4 animate-spin" />}
                />
              ) : isEditing ? (
                <>
                  {!isTableImport && (
                    <ActionButton
                      onClick={async () => {
                        setData((prev) =>
                          prev.map((item) =>
                            item.id === initialDataOnEdit.id
                              ? initialDataOnEdit
                              : item
                          )
                        );
                        initialDataOnEdit.type !== row.original.type &&
                          (await putApi(
                            `${window.siteUrl}/wp-json/wc/v3/products/${initialDataOnEdit.id}`,
                            { type: initialDataOnEdit.type }
                          ));
                        toggleEdit(row, false);
                      }}
                      icon={<X className="size-5" />}
                      tooltip={__("Cancel Edits", "whizmanage")}
                    />
                  )}

                  <ActionButton
                    onClick={() => {
                      if (isTableImport) {
                        toggleEdit(row, false);
                        return;
                      }
                      if (!dataValidation(row.original)) return;
                      updateProduct(row);
                    }}
                    isLoading={isLoading}
                    icon={<Save className="size-4" />}
                    loadingIcon={<RefreshCcw className="size-4 animate-spin" />}
                    tooltip={__("Save Changes", "whizmanage")}
                  />
                </>
              ) : (
                <ActionButton
                  onClick={() => toggleEdit(row, true)}
                  icon={<EditIcon className="size-4" />}
                  tooltip={__("Edit product", "whizmanage")}
                  isLoading={isLoading}
                  loadingIcon={<RefreshCcw className="size-4 animate-spin" />}
                />
              )}
            </div>
          </div>
        </TableCell>
      )}
    </TableRow>
  );
});

export default RowItem;
