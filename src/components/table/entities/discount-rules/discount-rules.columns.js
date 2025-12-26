// src/components/table/entities/discount-rules/discount-rules.columns.js

import React from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { EditableCell } from "@/components/table/core/EditableCell.jsx";
import { Switch, cn } from "@heroui/react";
import i18n from "@/i18n";
import TypeWithDiscountSettingsCell from "./components/TypeWithDiscountSettingsCell.jsx";
import ConditionsCell from "./components/ConditionsCell.jsx";
import FiltersCell from "./components/FiltersCell";

const columnHelper = createColumnHelper();

export function createEntityColumns(store, __, handleCellUpdate) {
  const cols = [
    // --- Name ---
    columnHelper.accessor("name", {
      header: __("Name", "whizmanage"),
      size: 220,
      cell: (ctx) => <EditableCell {...ctx} onUpdate={handleCellUpdate} />,
      meta: {
        editable: true,
        editType: "text",
        validationRules: [{ required: true, message: __("Name is required", "whizmanage") }],
      },
    }),

    // --- Type (+ כפתור ההגדרות ליד) ---
    // 🔒 חסימת אפשרויות עבור Free users - רק product_adjustment זמין
    (() => {
      const noLicence = typeof window !== "undefined" && window.hasLicence === false;
      const allTypeOptions = [
        { value: "product_adjustment", label: __("Product adjustment", "whizmanage") },
        { value: "cart_adjustment", label: __("Cart adjustment", "whizmanage"), locked: noLicence },
        { value: "bulk_discount", label: __("Bulk discount", "whizmanage"), locked: noLicence },
        { value: "bogo_discount", label: __("BOGO", "whizmanage"), locked: noLicence },
        { value: "bxgy_discount", label: __("BXGY", "whizmanage"), locked: noLicence },
        { value: "shipping_discount", label: __("Shipping discount", "whizmanage"), locked: noLicence },
        { value: "spend_bundle", label: __("Spend bundle", "whizmanage"), locked: noLicence },
      ];
      return columnHelper.accessor("type", {
        header: __("Type", "whizmanage"),
        size: 200,
        cell: (ctx) => <TypeWithDiscountSettingsCell {...ctx} />,
        meta: {
          editable: true,
          editType: "select",
          editOptions: {
            options: allTypeOptions,
          },
        },
      });
    })(),

    columnHelper.accessor("message", {
      header: __("Message", "whizmanage"),
      size: 300,
      cell: (ctx) => (
        <EditableCell {...ctx} multiline onUpdate={handleCellUpdate} />
      ),
      meta: {
        editable: true,
        editType: "textarea",
        validationRules: [],
      },
    }),

    // --- Show Message Switch (New Column) ---
    columnHelper.accessor("show_message", {
      header: __("Show Msg", "whizmanage"), // כותרת קצרה
      size: 100,
      meta: { editable: true },
      cell: (info) => {
        const { row, column } = info;
        const rowId = row.original?.id ?? row.id;
     const isRTL = window?.document?.documentElement?.dir === "rtl";


        // ברירת מחדל ל-true אם לא מוגדר
        const value = row.original?.show_message ?? true;
        // המרה לבוליאני כי לפעמים מהשרת זה מגיע כ-1/0
        const isChecked = Boolean(value) && value !== "0" && value !== 0;

        const [pending, setPending] = React.useState(false);

        return (
          <div className="flex justify-start">
            <Switch
              size="sm"
              isSelected={isChecked}
              isDisabled={pending}
              onValueChange={async (next) => {
                setPending(true);
                try {
                  // עדכון אופטימי ב-Store
                  store?.updateItem?.(rowId, { [column.id]: next });

                  // שליחה לשרת
                  await handleCellUpdate(rowId, column.id, next, row.original);
                } catch (error) {
                  // במקרה שגיאה נחזיר למצב הקודם
                  store?.updateItem?.(rowId, { [column.id]: isChecked });
                  console.error("Failed to update show_message", error);
                } finally {
                  setPending(false);
                }
              }}
              aria-label={__("Show Message", "whizmanage")}
              color="primary"
              classNames={{
                base: "inline-flex [&_input]:hidden [&_input[type=checkbox]]:hidden",
                wrapper: "p-0 h-5 overflow-visible dark:bg-slate-500",
                thumb: cn(
                  "w-5 h-5 shadow-lg",
                  isRTL
                    ? "group-data-[selected=true]:mr-5"
                    : "group-data-[selected=true]:ml-5"
                ),
              }}
            />
          </div>
        );
      },
    }),

    columnHelper.accessor("status", {
      header: __("Status", "whizmanage"),
      size: 140,
      meta: { editable: true },
      cell: (info) => {
        const { row, table, column } = info;
        const rowId = row.original?.id ?? row.id;
        const update = table?.options?.meta?.handleCellUpdate;
        const isRTL = window?.document?.documentElement?.dir === "rtl";

        // ניהול השבתה מקומית בזמן בקשה — בלי store חיצוני
        const [pending, setPending] = React.useState(false);

        // המצב הנוכחי מגיע מה־store דרך row.original, שמתעדכן ע"י masterUpdateCell
        const currentStatus = String(row.original?.status || "draft");
        const isOn = currentStatus === "publish";

        return (
          <div className="flex justify-start">
            <Switch
              size="sm"
              isSelected={isOn}
              isDisabled={pending || row.original?.status === "trash"}
              onValueChange={async (next) => {
                const nextStatus = next ? "publish" : "draft";

                // ✅ אופטימי דרך ה-store (עם היסטוריה אם יש):
                table?.options?.meta?.store?.updateItemWithHistory?.(
                  rowId,
                  { [column.id]: nextStatus },
                  true
                ) ?? table?.options?.meta?.store?.updateItem?.(rowId, { [column.id]: nextStatus });

                setPending(true);
                try {
                  await update(rowId, "status", nextStatus, row.original, false);
                  // masterUpdateCell כבר ידאג לסנכרן חזרה כל שינוי מהשרת (כולל status)
                } catch (e) {
                  // רולבאק אופטימי
                  table?.options?.meta?.store?.updateItemWithHistory?.(
                    rowId,
                    { [column.id]: currentStatus },
                    false
                  ) ?? table?.options?.meta?.store?.updateItem?.(rowId, { [column.id]: currentStatus });
                  throw e;
                } finally {
                  setPending(false);
                }
              }}
              aria-label={__("Status", "whizmanage")}
              color="primary"
              classNames={{
                base: "inline-flex [&_input]:hidden [&_input[type=checkbox]]:hidden",
                wrapper: "p-0 h-5 overflow-visible dark:bg-slate-500",
                thumb: cn(
                  "w-5 h-5 shadow-lg",
                  isRTL
                    ? "group-data-[selected=true]:mr-5"
                    : "group-data-[selected=true]:ml-5"
                ),
              }}
            />
          </div>
        );
      },
    }),

    // --- Dates ---
    // start_date
    columnHelper.accessor("start_date", {
      header: __("Start date", "whizmanage"),
      minSize: 220,
      size: 220,
      cell: (ctx) => <EditableCell {...ctx} onUpdate={handleCellUpdate} />,
      meta: {
        editable: true,
        editType: "date",
        onValidate: (nextStart, row) => {
          const end = row?.end_date;
          if (end && new Date(end) <= new Date(nextStart)) {
            return __("End date must be after start date", "whizmanage");
          }
          return null;
        },
      },
    }),

    // end_date
    columnHelper.accessor("end_date", {
      header: __("End date", "whizmanage"),
      size: 180,
      cell: (ctx) => <EditableCell {...ctx} onUpdate={handleCellUpdate} />,
      meta: {
        editable: true,
        editType: "date",
        onValidate: (nextEnd, row) => {
          const start = row?.start_date;
          if (start && new Date(nextEnd) <= new Date(start)) {
            return __("End date must be after start date", "whizmanage");
          }
          return null;
        },
      },
    }),

    // --- Priority ---
    columnHelper.accessor("priority", {
      header: __("Priority", "whizmanage"),
      size: 120,
      cell: (ctx) => <EditableCell {...ctx} onUpdate={handleCellUpdate} />,
      meta: {
        editable: true,
        editType: "number",
        editOptions: { min: 0, step: 1 },
      },
    }),

    // 👇 Filters ככפתור שמפתח דיאלוג
    columnHelper.accessor("filters", {
      header: __("Filters", "whizmanage"),
      size: 260,
      meta: { editable: false },
      cell: (ctx) => <FiltersCell {...ctx} />,
    }),

    columnHelper.accessor("conditions", {
      header: __("Conditions", "whizmanage"),
      size: 260,
      meta: { editable: false },
      cell: (ctx) => <ConditionsCell {...ctx} />,
    }),
  ];

  return cols;
}
