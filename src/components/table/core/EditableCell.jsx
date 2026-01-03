// src/components/table/components/EditableCell.jsx
import { cn } from "@/lib/utils";
import { addToast, DatePicker, Switch } from "@heroui/react";
import { parseDateTime } from "@internationalized/date";
import { Portal } from "@radix-ui/react-portal";
import { Calendar, ChevronDown, TriangleAlert } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { __ } from "@wordpress/i18n";
import { formatValue } from "../../../utils/formatValue.js";
import { Input } from "../../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Textarea } from "../../ui/textarea";
import CustomTooltip from "@components/ui/nextUI/Tooltip.jsx";
import EditableTooltip from "@components/ui/nextUI/EditableTooltip.jsx";
import { useTableSaveStateStore } from "../store/saveStateStore.js";
import ProBadge from "@components/ui/nextUI/ProBadge";
import { Expand } from "lucide-react";

export const EditableCell = memo(function EditableCell({
  getValue,
  row,
  column,
  table,
  onUpdate,
  renderDisplay,
}) {

  const isRTL = window?.document?.documentElement?.dir === "rtl";


  const setSaveState = useTableSaveStateStore((s) => s.setSaveState);
  const setLastSaveTime = useTableSaveStateStore((s) => s.setLastSaveTime);

  const initialValue = getValue();
  const [value, setValue] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  // State שגורם לריענון כשרשימת המוצרים נטענת
  const [productListVersion, setProductListVersion] = useState(0);

  // האזנה לאירוע עדכון רשימת המוצרים
  useEffect(() => {
    const handleListProductUpdated = () => {
      setProductListVersion((v) => v + 1);
    };
    window.addEventListener("listProductUpdated", handleListProductUpdated);
    return () => {
      window.removeEventListener("listProductUpdated", handleListProductUpdated);
    };
  }, []);

  const inputRef = useRef(null);
  const cellRef = useRef(null);
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef(null);

  const doUpdate = onUpdate ?? table?.options?.meta?.handleCellUpdate;

  const resolveRowId = useCallback(
    (row) =>
      row?.original?.id ??
      row?.original?._id ??
      row?.original?.key ??
      row?.id,
    []
  );

  const editType = column.columnDef.meta?.editType || "text";
  const editOptions = column.columnDef.meta?.editOptions || {};
  const isEditable = column.columnDef.meta?.editable !== false;
  const validationRules = column.columnDef.meta?.validationRules || [];

  const displayFormat = column.columnDef.meta?.displayFormat || {};
  const CustomDisplayComponent = column.columnDef.meta?.customDisplayComponent;
  const CustomEditComponent = column.columnDef.meta?.customEditComponent;

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const validateValue = useCallback(
    (val, showToast = false) => {
      for (const rule of validationRules) {
        if (rule.required && (!val || val === "")) {
          const message = rule.message || __("Field required", "whizmanage");
          if (showToast) {
            addToast({
              title: "Validation Error",
              description: message,
              color: "danger",
              icon: <TriangleAlert absoluteStrokeWidth />,
              placement: "top-center",
            });
          }
          return message;
        }
        if (rule.min != null && Number(val) < rule.min) {
          const message = rule.message || __("Minimum value", { min: rule.min });
          if (showToast) {
            addToast({
              title: "Validation Error",
              description: message,
              color: "danger",
              icon: <TriangleAlert absoluteStrokeWidth />,
              placement: "top-center",
            });
          }
          return message;
        }
        if (rule.max != null && Number(val) > rule.max) {
          const message = rule.message || __("Maximum value", { max: rule.max });
          if (showToast) {
            addToast({
              title: "Validation Error",
              description: message,
              color: "danger",
              icon: <TriangleAlert absoluteStrokeWidth />,
              placement: "top-center",
            });
          }
          return message;
        }
        if (rule.pattern && !new RegExp(rule.pattern).test(val)) {
          const message = rule.message || __("Invalid format", "whizmanage");
          if (showToast) {
            addToast({
              title: "Validation Error",
              description: message,
              color: "danger",
              icon: <TriangleAlert absoluteStrokeWidth />,
              placement: "top-center",
            });
          }
          return message;
        }
        if (rule.custom && !rule.custom(val, row.original, table)) {
          const message = rule.message || __("Invalid value", "whizmanage");
          if (showToast) {
            addToast({
              title: "Validation Error",
              description: message,
              color: "danger",
              icon: <TriangleAlert absoluteStrokeWidth />,
              placement: "top-center",
            });
          }
          return message;
        }
      }
      if (column.columnDef.meta?.onValidate) {
        const message = column.columnDef.meta.onValidate(val, row.original, table);
        if (message && showToast) {
          addToast({
            title: "Validation Error",
            description: message,
            color: "danger",
            icon: <TriangleAlert absoluteStrokeWidth />,
            placement: "top-center",
          });
        }
        return message;
      }
      return null;
    },
    [validationRules, column, row, __]
  );

  const startEditing = useCallback(() => {
    if (!isEditable || !isMountedRef.current) return;
    setIsEditing(true);
    setValue(initialValue);
    setError(null);
  }, [initialValue, isEditable]);

  const finishEditing = useCallback(async () => {
    console.log("🔄 finishEditing called:", {
      columnId: column.id,
      value,
      initialValue,
      isMounted: isMountedRef.current,
    });

    if (!isMountedRef.current) return;

    setSaveState?.("saving");

    const currentValue = value;

    let hasChanged = false;
    if (Array.isArray(currentValue) && Array.isArray(initialValue)) {
      if (currentValue.length !== initialValue.length) {
        hasChanged = true;
      } else {
        const currentIds = currentValue
          .map((item) => (typeof item === "object" ? item.id : item))
          .sort();
        const initialIds = initialValue
          .map((item) => (typeof item === "object" ? item.id : item))
          .sort();
        hasChanged = JSON.stringify(currentIds) !== JSON.stringify(initialIds);
      }
    } else {
      hasChanged = currentValue !== initialValue;
    }

    console.log("🔄 hasChanged:", hasChanged);

    if (!hasChanged) {
      console.log("⏭️ No changes, skipping save");
      setIsEditing(false);
      setIsHovered(false);
      setSaveState?.("saved");
      return;
    }

    const validationError = validateValue(currentValue, true);
    if (validationError) {
      setError(validationError);
      setSaveState?.("saved");
      return;
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setError(null);

    try {
      const rowId = resolveRowId(row);

      await doUpdate?.(rowId, column.id, currentValue, row.original);

      setSaveState?.("saved");
      setLastSaveTime?.(new Date());

      if (isMountedRef.current) {
        setIsEditing(false);
        setIsHovered(false);
      }
    } catch (error) {
      if (error.name === "AbortError") return;

      console.error("Failed to update cell (via doUpdate):", error);
      setSaveState?.("error");

      const errorMessage = error.message || __("Error saving changes", "whizmanage");

      addToast({
        title: __("Error", "whizmanage"),
        description: errorMessage,
        color: "danger",
      });

      if (isMountedRef.current) {
        setError(errorMessage);
        setValue(initialValue);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    }
  }, [
    value,
    initialValue,
    row,
    column.id,
    validateValue,
    __,
    doUpdate,
    resolveRowId,
    setSaveState,
    setLastSaveTime,
  ]);

  const cancelEditing = useCallback(() => {
    if (!isMountedRef.current) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setIsEditing(false);
    setIsHovered(false);
    setValue(initialValue);
    setError(null);
    setIsLoading(false);
  }, [initialValue]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        cancelEditing();
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        finishEditing();
        return;
      }

      if (e.key === "Tab") {
        finishEditing();
      }
    },
    [finishEditing, cancelEditing]
  );

  useEffect(() => {
    if (isEditing && inputRef.current && isMountedRef.current) {
      inputRef.current.focus?.();
      inputRef.current.select?.();
    }
  }, [isEditing]);

  useEffect(() => {
    if (isEditing && CustomEditComponent && value !== initialValue) {
      const shouldAutoFinish = column.columnDef.meta?.autoFinishOnChange;
      const preventAutoClose = column.columnDef.meta?.preventAutoClose;

      if (shouldAutoFinish && !preventAutoClose) {
        finishEditing();
      }
    }
  }, [
    value,
    isEditing,
    CustomEditComponent,
    column.columnDef.meta?.autoFinishOnChange,
    column.columnDef.meta?.preventAutoClose,
    finishEditing,
    initialValue,
  ]);

  useEffect(() => {
    const preventAutoClose = column.columnDef.meta?.preventAutoClose;

    if (!isEditing && isMountedRef.current && !preventAutoClose) {
      setValue(initialValue);
    }
  }, [initialValue, isEditing, column.columnDef.meta?.preventAutoClose]);

  const renderEditingComponent = () => {
    if (CustomEditComponent) {
      const handleDirectUpdate = async (newValue, customFieldName = null) => {
        const fieldToUpdate = customFieldName || column.id;

        setSaveState?.("saving");

        try {
          setValue(newValue);

          await doUpdate?.(
            resolveRowId(row),
            fieldToUpdate,
            newValue,
            row.original
          );

          setSaveState?.("saved");
          setLastSaveTime?.(new Date());

          setIsEditing(false);
          setIsHovered(false);
        } catch (error) {
          console.error("Direct update failed:", error);

          setSaveState?.("error");

          setValue(initialValue);
          setError(error.message);
        }
      };

      return (
        <CustomEditComponent
          value={value}
          onChange={setValue}
          onFinish={finishEditing}
          onCancel={cancelEditing}
          onDirectUpdate={handleDirectUpdate}
          onValidate={(val) => setError(validateValue(val))}
          isLoading={isLoading}
          error={error}
          inputRef={inputRef}
          cellRef={cellRef}
          editOptions={editOptions}
          row={row}
          column={column}
          __={__}
        />
      );
    }

    const commonProps = {
      ref: inputRef,
      disabled: isLoading,
      className: cn(
        "h-8 text-sm",
        error && "border-red-500 focus:ring-red-500",
        isLoading && "opacity-50 cursor-not-allowed"
      ),
      "aria-invalid": !!error,
      "aria-describedby": error ? `${column.id}-error` : undefined,
    };

    const wrapWithPrefixSuffix = (inputComponent) => {
      if (!displayFormat.prefix && !displayFormat.suffix) {
        return inputComponent;
      }

      return (
        <div className="flex items-center">
          {displayFormat.prefix && (
            <span
              className="text-gray-500 text-sm mr-1 rtl:mr-0 rtl:ml-1"
              dangerouslySetInnerHTML={{ __html: displayFormat.prefix }}
            />
          )}
          {inputComponent}
          {displayFormat.suffix && (
            <span className="text-gray-500 text-sm ml-1 rtl:ml-0 rtl:mr-1">
              {displayFormat.suffix}
            </span>
          )}
        </div>
      );
    };

    switch (editType) {
      case "number":
        return wrapWithPrefixSuffix(
          <Input
            {...commonProps}
            type="number"
            value={value ?? ""}
            onChange={(e) => {
              const newValue =
                e.target.value !== "" ? Number(e.target.value) : "";
              setValue(newValue);
              const err = validateValue(e.target.value, false);
              setError(err);
            }}
            onBlur={finishEditing}
            onKeyDown={handleKeyDown}
            min={editOptions.min}
            max={editOptions.max}
            step={editOptions.step || 1}
            placeholder={editOptions.placeholder}
            autoFocus
            aria-label={__("Edit cell", { column: column.columnDef.header })}
            className={cn(
              "h-8 text-sm",
              error && "!border-red-500 !ring-red-500"
            )}
          />
        );

      case "select":
        return (
          <Select
            value={value ?? ""}
            disabled={isLoading}
            defaultOpen
            onOpenChange={(open) => {
              if (!open) {
                finishEditing();
              }
            }}
            onValueChange={(val) => {
              // 🔒 בדוק אם האפשרות נעולה
              const selectedOption = editOptions.options?.find(
                (opt) => (opt.value || opt.id) === val
              );
              if (selectedOption?.locked) {
                return; // לא לאפשר בחירה באפשרות נעולה
              }
              setValue(val);
              setTimeout(() => finishEditing(), 100);
            }}
          >
            <SelectTrigger
              ref={inputRef}
              className={cn(
                "h-8 text-sm focus:ring-2 relative z-[60] min-w-[8rem]",
                isLoading && "opacity-50 cursor-not-allowed"
              )}
              onKeyDown={handleKeyDown}
              aria-label={__("Select value", "whizmanage")}
            >
              <SelectValue
                placeholder={editOptions.placeholder || __("Select value", "whizmanage")}
              />
            </SelectTrigger>
            <Portal>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                sideOffset={6}
                className="z-[10000] max-h-[280px] min-w-[var(--radix-select-trigger-width)]"
              >
                {editOptions.options?.map((option) => {
                  const isLocked = option.locked === true;
                  return (
                    <SelectItem
                      key={option.value || option.id}
                      value={option.value || option.id}
                      disabled={isLocked}
                      className={cn(
                        isLocked && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <span className="flex items-center justify-between w-full gap-2">
                        <span className={cn(isLocked && "text-slate-400")}>
                          {option.label || option.name}
                        </span>
                        {isLocked && (
                          <span className="scale-75">
                            <ProBadge />
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Portal>
          </Select>
        );

      case "date":
        return (
          <DatePicker
            hideTimeZone
            autoFocus={true}
            showMonthAndYearPickers
            value={
              value
                ? (() => {
                  try {
                    const date = new Date(value);
                    if (isNaN(date.getTime())) return null;

                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(
                      2,
                      "0"
                    );
                    const day = String(date.getDate()).padStart(2, "0");
                    const hours = String(date.getHours()).padStart(2, "0");
                    const minutes = String(date.getMinutes()).padStart(
                      2,
                      "0"
                    );
                    const seconds = String(date.getSeconds()).padStart(
                      2,
                      "0"
                    );

                    const localISOString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;

                    return parseDateTime(localISOString);
                  } catch (e) {
                    console.error("Error parsing date for edit:", e);
                    return null;
                  }
                })()
                : null
            }
            onChange={(newDate) => {
              if (!newDate) {
                setValue(null);
                return;
              }

              try {
                const jsDate = newDate.toDate();
                const utcString = jsDate.toISOString();
                setValue(utcString);
              } catch (e) {
                console.error("Error converting date to UTC:", e);
              }
            }}
            onBlur={finishEditing}
            isDisabled={isLoading}
            aria-label={__("Choose date", "whizmanage")}
            hourCycle={24}
            granularity="day"
            classNames={{
              base: "rounded-md dark:!bg-slate-800 dark:!text-slate-300",
              inputWrapper:
                "rounded-md !h-8 !max-h-8 !py-1 !m-0 !ring-2 !ring-fuchsia-500 dark:!ring-fuchsia-500/90 bg-white dark:!bg-slate-700 dark:!text-slate-300",
              timeInput: "rounded-md dark:!bg-slate-800 dark:!text-slate-300",
              selectorButton:
                "rounded-md !bg-transparent dark:!bg-transparent dark:!text-slate-400",
            }}
          />
        );

      case "textarea":
        return (
          <Textarea
            {...commonProps}
            value={value ?? ""}
            onChange={(e) => {
              setValue(e.target.value);
              setError(validateValue(e.target.value, false));
            }}
            onBlur={finishEditing}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                finishEditing();
                return;
              }
              if (e.key === "Enter" && e.shiftKey) {
                return;
              }
              if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                cancelEditing();
                return;
              }
            }}
            rows={editOptions.rows || 1}
            placeholder={editOptions.placeholder}
            className={cn(
              "text-sm resize-none",
              error && "border-red-500 focus:ring-red-500",
              isLoading && "opacity-50 cursor-not-allowed"
            )}
            autoFocus
            aria-label={__("Edit cell", { column: column.columnDef.header })}
          />
        );

      case "email":
        return wrapWithPrefixSuffix(
          <Input
            {...commonProps}
            type="email"
            value={value ?? ""}
            onChange={(e) => {
              setValue(e.target.value);
              setError(validateValue(e.target.value));
            }}
            onBlur={finishEditing}
            onKeyDown={handleKeyDown}
            placeholder={editOptions.placeholder}
            autoFocus
            aria-label={__("Edit cell", { column: column.columnDef.header })}
          />
        );

      default:
        return wrapWithPrefixSuffix(
          <Input
            {...commonProps}
            type="text"
            value={value ?? ""}
            onChange={(e) => {
              const newValue = editOptions.slugify
                ? e.target.value.replace(/\s+/g, "-")
                : e.target.value;

              setValue(newValue);
              const err = validateValue(newValue, false);
              setError(err);
            }}
            onBlur={finishEditing}
            onKeyDown={handleKeyDown}
            placeholder={editOptions.placeholder}
            autoFocus
            aria-label={__("Edit cell", { column: column.columnDef.header })}
            className={cn(
              "h-8 text-sm",
              error && "!border-red-500 !ring-red-500"
            )}
          />
        );
    }
  };

  const formattedValue = useMemo(() => {
    if (typeof renderDisplay === "function") {
      return renderDisplay(value, row, column);
    }

    if (CustomDisplayComponent) {
      return (
        <CustomDisplayComponent
          value={value}
          row={row}
          column={column}
          __={__}
          editOptions={editOptions}
        />
      );
    }

    let displayValue;
    if (displayFormat?.formatValue) {
      displayValue = displayFormat.formatValue(value);
    } else if (editType === "select" && editOptions.options) {
      const option = editOptions.options.find(
        (opt) => (opt.value || opt.id) === value
      );
      displayValue = option?.label || option?.name || value;
    } else if (editType === "number" && value != null) {
      const formatType = editOptions.format || "number";
      displayValue = formatValue(value, formatType);
    } else if (editType === "date" && value) {
      const date = new Date(value);
      displayValue = new Intl.DateTimeFormat("he-IL", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } else {
      displayValue = value;
    }

    if (displayValue == null || displayValue === "") {
      return <span className="text-muted-foreground">—</span>;
    }

    if (
      editType === "textarea" &&
      displayValue &&
      String(displayValue).length > 20
    ) {
      const truncated = String(displayValue).substring(0, 20) + "...";
      return (
        <CustomTooltip
          title={column.columnDef.header}
          description={
            <div className="whitespace-pre-wrap max-h-48 overflow-y-auto scrollbar-whiz text-xs">
              {displayValue}
            </div>
          }
          contentClassName="max-w-xs"
        >
          <span className="truncate cursor-help">
            {displayFormat.prefix && (
              <span
                dangerouslySetInnerHTML={{ __html: displayFormat.prefix }}
              />
            )}
            {truncated}
            {displayFormat.suffix && displayFormat.suffix}
          </span>
        </CustomTooltip>
      );
    }

    // Text/email inputs with 50+ characters - show expand icon for EditableTooltip
    const longTextThreshold = editOptions.longTextThreshold ?? 50;
    if (
      (editType === "text" || editType === "email") &&
      displayValue &&
      String(displayValue).length >= longTextThreshold
    ) {
      return {
        displayValue,
        isLongText: true,
        prefix: displayFormat.prefix,
        suffix: displayFormat.suffix,
      };
    }

    return (
      <span>
        {displayFormat.prefix && (
          <span dangerouslySetInnerHTML={{ __html: displayFormat.prefix }} />
        )}
        {displayValue}
        {displayFormat.suffix && displayFormat.suffix}
      </span>
    );
  }, [
    value,
    editType,
    editOptions,
    displayFormat,
    column,
    row,
    __,
    CustomDisplayComponent,
    renderDisplay,
    productListVersion, // גורם לריענון כשרשימת המוצרים נטענת
  ]);

  // Handle long text with EditableTooltip
  const handleLongTextSave = useCallback(async (newValue) => {
    console.log("📝 handleLongTextSave called:", {
      rowId: resolveRowId(row),
      columnId: column.id,
      newValue,
      hasDoUpdate: !!doUpdate,
    });

    setSaveState?.("saving");
    try {
      await doUpdate?.(resolveRowId(row), column.id, newValue, row.original);
      console.log("✅ Save successful");
      setSaveState?.("saved");
      setLastSaveTime?.(new Date());
    } catch (error) {
      console.error("❌ Failed to update cell:", error);
      setSaveState?.("error");
    }
  }, [doUpdate, resolveRowId, row, column.id, setSaveState, setLastSaveTime]);

  if (!isEditable) {
    return (
      <div
        className="px-3 py-2 text-muted-foreground opacity-60"
        aria-label={`${column.columnDef.header}: ${formattedValue}`}
      >
        {formattedValue}
      </div>
    );
  }

  if (editType === "switch") {
    return (
      <div className="flex items-center justify-center h-full px-2">
        <Switch
          size="sm"
          isSelected={!!value}
          onValueChange={async (checked) => {
            if (!isMountedRef.current) return;

            setSaveState?.("saving");

            setValue(checked);

            try {
              await doUpdate?.(
                resolveRowId(row),
                column.id,
                checked,
                row.original
              );

              setSaveState?.("saved");
              setLastSaveTime?.(new Date());
            } catch (error) {
              console.error("Failed to update switch:", error);
              setSaveState?.("error");

              if (isMountedRef.current) {
                setValue(initialValue);
              }
            }
          }}
          isDisabled={isLoading}
          classNames={{
            base: "inline-flex [&_input]:hidden [&_input[type=checkbox]]:hidden",
            wrapper: "p-0 h-5 overflow-visible dark:bg-slate-500",
            thumb: cn(
              "w-5 h-5 shadow-lg transition-transform",
              isRTL
                ? "group-data-[selected=true]:mr-5 group-data-[selected=false]:mr-1"
                : "group-data-[selected=true]:ml-5 group-data-[selected=false]:ml-1"
            ),
          }}
          aria-label={`${column.columnDef.header} - ${value ? __("Enabled", "whizmanage") : __("Disabled", "whizmanage")
            }`}
        />
      </div>
    );
  }

  if (isEditing) {
    return (
      <div
        className="absolute inset-0 z-20 p-1 flex items-center"
        style={{ overflow: "visible" }}
      >
        {renderEditingComponent()}
      </div>
    );
  }

  // Check if formattedValue is a long text object
  const isLongTextValue = formattedValue && typeof formattedValue === "object" && formattedValue.isLongText;

  return (
    <div
      ref={cellRef}
      className={cn(
        "relative px-2 h-full w-full flex items-center justify-between",
        "transition-all duration-200 group",
        "hover:bg-slate-100/50 dark:hover:bg-slate-700/30",
        editType === "text" ? "cursor-text" : "cursor-pointer"
      )}
      onClick={isLongTextValue ? undefined : startEditing}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onKeyDown={(e) => {
        if (e.key === "F2" || e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          startEditing();
        }
      }}
      tabIndex={-1}
      role="gridcell"
      aria-label={`${column.columnDef.header}: ${isLongTextValue ? formattedValue.displayValue : formattedValue}. ${__("Click enter or F2 to edit", "whizmanage")}`}
      data-editable="true"
      data-tour="inline-edit"
    >
      <div className="flex items-center w-full">
        {editType === "select" ? (
          <>
            <span className="flex-1 truncate">{formattedValue}</span>
            {isHovered && (
              <ChevronDown className="h-4 w-4 text-slate-400 ml-1 rtl:ml-0 rtl:mr-1 flex-shrink-0" />
            )}
          </>
        ) : editType === "date" ? (
          <>
            <span className="flex-1 truncate">{formattedValue}</span>
            {isHovered && (
              <Calendar className="h-4 w-4 text-slate-400 ml-1 rtl:ml-0 rtl:mr-1 flex-shrink-0" />
            )}
          </>
        ) : isLongTextValue ? (
          <>
            <span
              className="flex-1 truncate cursor-text"
              onClick={startEditing}
            >
              {formattedValue.prefix && (
                <span dangerouslySetInnerHTML={{ __html: formattedValue.prefix }} />
              )}
              {formattedValue.displayValue}
              {formattedValue.suffix && formattedValue.suffix}
            </span>
            <EditableTooltip
              value={value}
              onSave={handleLongTextSave}
              title={column.columnDef.header}
              minChars={0}
            >
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "p-1 rounded transition-all flex-shrink-0",
                  "text-slate-400 hover:text-fuchsia-500 hover:bg-slate-100 dark:hover:bg-slate-700",
                  "ml-1 rtl:ml-0 rtl:mr-1",
                  isHovered ? "opacity-100" : "opacity-0"
                )}
                title={__("Expand for full view", "whizmanage")}
              >
                <Expand className="h-3.5 w-3.5" />
              </button>
            </EditableTooltip>
          </>
        ) : (
          <span className="truncate">{formattedValue}</span>
        )}
      </div>
    </div>
  );
},
  (prevProps, nextProps) => {
    const prevValue = prevProps.getValue();
    const nextValue = nextProps.getValue();

    if (typeof prevValue !== "object" && typeof nextValue !== "object") {
      if (prevValue !== nextValue) return false;
    } else {
      if (JSON.stringify(prevValue) !== JSON.stringify(nextValue)) return false;
    }

    if (prevProps.row.id !== nextProps.row.id) return false;

    if (prevProps.column.id !== nextProps.column.id) return false;

    const prevOriginal = prevProps.row.original;
    const nextOriginal = nextProps.row.original;
    if (prevOriginal?._isNew !== nextOriginal?._isNew) return false;
    if (prevOriginal?._needsSave !== nextOriginal?._needsSave) return false;

    return true;
  });

EditableCell.displayName = "EditableCell";
