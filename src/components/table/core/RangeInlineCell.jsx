// src/components/table/cells/RangeInlineCell.jsx
import { useEffect, useRef, useState, useMemo, memo } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { useDebounceFn } from "@components/table/hooks/useDebounce";

function RangeInlineCell({ getValue, row, column, table }) {
  const initialNum = toNumberSafe(getValue?.(), 0);
  const [val, setVal] = useState(initialNum);
  const [inputText, setInputText] = useState(String(initialNum));

  const store = table?.options?.meta?.store;
  const handleUpdate = table?.options?.meta?.handleCellUpdate;

  // normalize editOptions (strings/empty -> numbers/defaults)
  const {
    min: rawMin = 0,
    max: rawMax = 100,
    step: rawStep = 1,
    prefix = "",
    suffix = "",
    wait = 250,
    maxWait,
    showNumber = true,
    inputWidth = 48,
  } = column.columnDef.meta?.editOptions || {};

  const min = toNumberSafe(rawMin, 0);
  const max = toNumberSafe(rawMax, 100);
  const step = toNumberSafe(rawStep, 1) || 1;

  const id =
    row?.original?.id ?? row?.original?._id ?? row?.original?.key ?? row?.id;

  const committedRef = useRef(initialNum);
  const isDraggingRef = useRef(false);

  // עקוב אחרי ערך חיצוני – אבל לא מפריעים בזמן גרירה
  const externalValue = row?.original?.[column.id];
  useEffect(() => {
    if (isDraggingRef.current) return;
    const next = toNumberSafe(
      externalValue !== undefined ? externalValue : getValue?.(),
      committedRef.current
    );
    if (Number.isFinite(next) && next !== val) {
      setVal(next);
      setInputText(String(next));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalValue, column.id, row?.original]);

  const percent = useMemo(() => {
    if (!Number.isFinite(min) || !Number.isFinite(max) || max === min) return 0;
    return ((clamp(val, min, max) - min) / (max - min)) * 100;
  }, [val, min, max]);

  const doSave = async (next, prevCommitted) => {
    try {
      // שומרים לשרת
      await handleUpdate?.(id, column.id, next, row.original);
      // רק אחרי שהצליח: מעדכנים store כדי לא לגרור רינדורים בזמן גרירה
      committedRef.current = next;
    } catch (e) {
      // רולבק ב-UI
      setVal(prevCommitted);
      setInputText(String(prevCommitted));
      // ורולבק ב-store אם שונה קודם (פה אנחנו מעדכנים store רק אחרי הצלחה, אז בד"כ אין צורך)
      console.error("RangeInlineCell: save failed → rollback", e);
    }
  };

  // דיבאונס לשמירה (בלי לגעת ב-store בזמן הגרירה)
  const debouncedSave = useDebounceFn(
    (next, prevCommitted) => doSave(next, prevCommitted),
    { wait, maxWait }
  );

  // עדכון מקומי אחיד: מחזיר את הערך אחרי קלמפ
  const commitLocal = (nextNumber, { updateInput = false } = {}) => {
    const safeNum = toNumberSafe(nextNumber, val);
    if (!Number.isFinite(safeNum)) return;
    const clamped = clamp(safeNum, min, max);
    setVal(clamped);
    if (updateInput) setInputText(String(clamped));
    return clamped;
  };

  const stopBubble = (e) => e.stopPropagation();

  return (
    <div
      className="w-full h-full px-2 py-1"
      onPointerDown={stopBubble}
      onMouseDown={stopBubble}
      onKeyDown={stopBubble}
    >
      <div className="grid items-center gap-2 grid-cols-[minmax(0,auto)_1fr_minmax(0,auto)]">
        {/* prefix */}
        <div className="text-xs text-muted-foreground whitespace-nowrap">{prefix}</div>

        {/* slider + tooltip */}
        <div className="relative flex items-center">
          <div
            className="absolute -top-4 pointer-events-none select-none text-[10px] leading-none
                       px-1.5 py-0.5 rounded-md bg-slate-800 text-white shadow
                       transform -translate-x-1/2 tabular-nums"
            style={{ left: `calc(${percent}% )` }}
            aria-hidden
          >
            {clamp(val, min, max)}
            {suffix}
          </div>

          <Slider
            value={[clamp(val, min, max)]}
            min={min}
            max={max}
            step={step}
            onValueChange={(arr) => {
              const next = Array.isArray(arr) ? arr[0] : arr;
              if (!Number.isFinite(next)) return;
              // בזמן גרירה: עדכון לוקאלי בלבד (בלי שמירה, ובלי לשנות inputText)
              const clamped = commitLocal(next, { updateInput: false });

              if (!isDraggingRef.current) {
                debouncedSave(clamped, committedRef.current);
              }
            }}
            onValueCommit={(arr) => {
              const next = Array.isArray(arr) ? arr[0] : arr;
              if (!Number.isFinite(next)) return;
              // שמירה מיידית בסוף גרירה + סנכרון ה־input
              const clamped = commitLocal(next, { updateInput: true });
              // בטל דיבאונס תלוי־דרך כדי למנוע Double-save
              debouncedSave.cancel?.();
              doSave(clamped, committedRef.current);
            }}
            aria-label={column.columnDef.header || column.id}
            className="w-full select-none"
            onPointerDown={() => {
              isDraggingRef.current = true;
            }}
            onPointerUp={() => {
              isDraggingRef.current = false;
            }}
            onPointerCancel={() => {
              isDraggingRef.current = false;
            }}
            onPointerLeave={() => {
              // safety: במקרה שהסמן עוזב את הסליידר באמצע
              isDraggingRef.current = false;
            }}
          />
        </div>

        {/* suffix + input קטן */}
        <div className="flex items-center gap-1 justify-end">
          {suffix && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">{suffix}</span>
          )}
          {showNumber && (
            <Input
              type="text"
              inputMode="numeric"
              value={inputText}
              onChange={(e) => {
                const txt = e.target.value;
                setInputText(txt);
                const maybeNumber = tryParseNumber(txt);
                if (maybeNumber != null) {
                  // שינוי דרך האינפוט: עדכון לוקאלי + דיבאונס (לא מצב גרירה)
                  const clamped = commitLocal(maybeNumber, { updateInput: false });
                  debouncedSave(clamped, committedRef.current);
                }
              }}
              onBlur={(e) => {
                const maybeNumber = tryParseNumber(e.target.value);
                const safe = clamp(
                  maybeNumber != null ? maybeNumber : committedRef.current,
                  min,
                  max
                );
                // בטל דיבאונס פוטנציאלי כדי לשמור רק פעם אחת
                debouncedSave.cancel?.();
                doSave(safe, committedRef.current);
                setVal(safe);
                setInputText(String(safe));
              }}
              className="h-7 text-[11px] tabular-nums text-right px-1"
              style={{ width: `${inputWidth}px` }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* helpers */
function toNumberSafe(n, fallback = 0) {
  const num = Number(n);
  return Number.isFinite(num) ? num : Number(fallback) || 0;
}

function tryParseNumber(txt) {
  if (txt == null) return null;
  const s = String(txt).trim().replace(",", "."); // תמיכה בפסיק
  if (!s || s === "-" || s === "+") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export default memo(RangeInlineCell);
