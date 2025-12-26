// src/hooks/useDebounce.js
import { useEffect, useMemo, useRef, useState, useCallback } from "react";

/**
 * useDebouncedValue
 * מחזיר ערך "מדובנס" שמתרענן רק אחרי wait ms ללא שינוי נוסף.
 * שימושי כשיש מצב (state) שמשתנה מהר ואינך רוצה לרנדר/לשגר אפקטים על כל שינוי.
 */
export function useDebouncedValue(value, wait = 300) {
  const [debounced, setDebounced] = useState(value);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setDebounced(value), Math.max(0, wait));

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [value, wait]);

  return debounced;
}

/**
 * useDebounceFn
 * מחזיר פונקציה "מדובנסת".
 * options:
 *  - wait: עיכוב בין קריאות (ms)
 *  - maxWait: ירייה מובטחת אחרי מקס' זמן גם אם יש טריגרים רציפים
 *
 * API:
 *  - debounced(...args)
 *  - debounced.flush()  => ירייה מידית של הקריאה האחרונה הממתינה
 *  - debounced.cancel() => ביטול הקריאה הממתינה
 */
export function useDebounceFn(fn, options = {}) {
  const { wait = 300, maxWait } = options;
  const fnRef = useRef(fn);
  const timeoutRef = useRef(null);
  const maxTimeoutRef = useRef(null);
  const lastArgsRef = useRef(null);
  const lastThisRef = useRef(null);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  const clearAll = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (maxTimeoutRef.current) clearTimeout(maxTimeoutRef.current);
    timeoutRef.current = null;
    maxTimeoutRef.current = null;
  }, []);

  const flush = useCallback(() => {
    if (!lastArgsRef.current) return;
    const args = lastArgsRef.current;
    const ctx = lastThisRef.current;
    lastArgsRef.current = null;
    lastThisRef.current = null;
    clearAll();
    return fnRef.current.apply(ctx, args);
  }, [clearAll]);

  const cancel = useCallback(() => {
    lastArgsRef.current = null;
    lastThisRef.current = null;
    clearAll();
  }, [clearAll]);

  const debounced = useMemo(() => {
    function debouncedFn(...args) {
      lastArgsRef.current = args;
      lastThisRef.current = this;

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        flush();
      }, Math.max(0, wait));

      // הפעלת maxWait רק בפעם הראשונה במחזור
      if (maxWait != null && maxTimeoutRef.current == null) {
        maxTimeoutRef.current = setTimeout(() => {
          flush();
        }, Math.max(0, maxWait));
      }
    }

    debouncedFn.cancel = cancel;
    debouncedFn.flush = flush;
    return debouncedFn;
  }, [wait, maxWait, flush, cancel]);

  // ניקוי על unmount
  useEffect(() => cancel, [cancel]);

  return debounced;
}

/**
 * createDebouncedFunction
 * גרסת עזר ללא hooks – לשימוש מחוץ לרכיבי React.
 *
 * API זהה ל-useDebounceFn (debounced, debounced.cancel, debounced.flush)
 */
export function createDebouncedFunction(fn, wait = 300, maxWait) {
  let t = null;
  let m = null;
  let lastArgs = null;
  let lastThis = null;

  const clearAll = () => {
    if (t) clearTimeout(t);
    if (m) clearTimeout(m);
    t = null;
    m = null;
  };

  const flush = () => {
    if (!lastArgs) return;
    const args = lastArgs;
    const ctx = lastThis;
    lastArgs = null;
    lastThis = null;
    clearAll();
    return fn.apply(ctx, args);
  };

  function debounced(...args) {
    lastArgs = args;
    lastThis = this;

    if (t) clearTimeout(t);
    t = setTimeout(flush, Math.max(0, wait));

    if (maxWait != null && m == null) {
      m = setTimeout(flush, Math.max(0, maxWait));
    }
  }

  debounced.cancel = () => {
    lastArgs = null;
    lastThis = null;
    clearAll();
  };
  debounced.flush = flush;

  return debounced;
}
