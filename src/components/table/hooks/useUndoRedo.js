import { useReducer, useCallback, useRef, useEffect } from "react";

/**
 * useUndoRedo עם useReducer — עדכון אטומי של {history,index}
 * ✅ גרסה משופרת עם בדיקות בטיחות
 */
export function useUndoRedo(maxHistory = 50) {
  const isInternalUpdate = useRef(false);
  const initialized = useRef(false);

  const makeCid = () =>
    `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const initial = { history: [], index: -1 };

  function reducer(state, action) {
    // ✅ בטיחות - תמיד להחזיר state תקין
    if (!state || typeof state !== "object") {
      state = initial;
    }

    switch (action.type) {
      case "ADD": {
        if (isInternalUpdate.current) return state;
        
        const payload = action.payload;
        if (!payload) return state;

        const withCid =
          payload && !payload._cid
            ? { ...payload, _cid: makeCid() }
            : payload;

        let next = Array.isArray(state.history) 
          ? state.history.slice(0, state.index + 1)
          : [];
        
        next.push(withCid);
        
        if (next.length > maxHistory) {
          next = next.slice(next.length - maxHistory);
        }
        
        return { history: next, index: next.length - 1 };
      }

      case "UNDO": {
        const currentIndex = typeof state.index === "number" ? state.index : -1;
        if (currentIndex < 0) return state;
        return { ...state, index: currentIndex - 1 };
      }

      case "REDO": {
        const currentIndex = typeof state.index === "number" ? state.index : -1;
        const historyLength = Array.isArray(state.history) ? state.history.length : 0;
        if (currentIndex >= historyLength - 1) return state;
        return { ...state, index: currentIndex + 1 };
      }

      case "REMOVE_MATCHING": {
        const { predicate } = action;
        if (typeof predicate !== "function") return state;

        const history = Array.isArray(state.history) ? state.history : [];
        let newIdx = typeof state.index === "number" ? state.index : -1;
        const filtered = [];

        history.forEach((a, i) => {
          try {
            const remove = !!predicate(a);
            if (remove) {
              if (i <= newIdx) newIdx -= 1;
            } else {
              filtered.push(a);
            }
          } catch (e) {
            console.warn("Error in predicate:", e);
            filtered.push(a);
          }
        });

        return { history: filtered, index: Math.max(-1, newIdx) };
      }

      case "CLEAR":
        return { ...initial };

      default:
        return state;
    }
  }

  const [state, dispatch] = useReducer(reducer, initial);

  // ✅ סימון שאתחלנו
  useEffect(() => {
    initialized.current = true;
  }, []);

  const addToHistory = useCallback((action) => {
    if (!action) return null;
    dispatch({ type: "ADD", payload: action });
    return action;
  }, []);

  const undo = useCallback(() => {
    const currentIndex = typeof state.index === "number" ? state.index : -1;
    const history = Array.isArray(state.history) ? state.history : [];
    
    if (currentIndex < 0 || history.length === 0) return null;
    
    isInternalUpdate.current = true;
    const action = history[currentIndex] || null;
    dispatch({ type: "UNDO" });
    isInternalUpdate.current = false;
    
    return action;
  }, [state.index, state.history]);

  const redo = useCallback(() => {
    const currentIndex = typeof state.index === "number" ? state.index : -1;
    const history = Array.isArray(state.history) ? state.history : [];
    
    if (currentIndex >= history.length - 1) return null;
    
    isInternalUpdate.current = true;
    const action = history[currentIndex + 1] || null;
    dispatch({ type: "REDO" });
    isInternalUpdate.current = false;
    
    return action;
  }, [state.index, state.history]);

  const removeMatching = useCallback((predicate) => {
    if (typeof predicate !== "function") {
      console.warn("removeMatching: predicate must be a function");
      return;
    }
    dispatch({ type: "REMOVE_MATCHING", predicate });
  }, []);

  const clearHistory = useCallback(() => {
    dispatch({ type: "CLEAR" });
  }, []);

  // ✅ בדיקות בטיחות לערכים שמוחזרים
  const safeHistory = Array.isArray(state.history) ? state.history : [];
  const safeIndex = typeof state.index === "number" ? state.index : -1;

  // החזרת תכונות נוספות (`history` ו־`index`) לשמירת תאימות לאחור.
  // חלק מהקוד הישן במערכת מצפה לאובייקט בעל שדות אלה, כולל `history.length`.  אם
  // נשתמש רק בשמות חדשים כמו `historyLength` או `currentIndex`, הקוד הישן יקרוס.
  return {
    addToHistory,
    undo,
    redo,
    removeMatching,
    clearHistory,
    currentIndex: safeIndex,
    historyLength: safeHistory.length,
    canUndo: safeIndex >= 0,
    canRedo: safeIndex < safeHistory.length - 1,
    isInitialized: initialized.current,
    // שדות תאימות לאחור
    history: safeHistory,
    index: safeIndex,
  };
}