// src/components/table/hooks/useKeyboardNavigation.js
import { useCallback, useEffect, useRef } from "react";

export function useKeyboardNavigation(table, config = {}) {
  const { enableNavigation = true, enableEditing = true } = config;
  const containerRef = useRef(null);

const focusCell = useCallback((cell) => {
  if (!cell) return;

  // הסר פוקוס מהתא הקודם
  const previousFocused = document.querySelector('td:focus');
  if (previousFocused && previousFocused !== cell) {
    previousFocused.blur();
  }

  // תן פוקוס לתא החדש
  cell.focus();
  
  // גלול אליו
  cell.scrollIntoView({
    behavior: "smooth",
    block: "nearest",
    inline: "nearest",
  });
}, []);

  const isInEditMode = useCallback((target) => {
    return (
      ["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(target.tagName) ||
      target.isContentEditable ||
      target.closest('[role="dialog"]') ||
      target.closest('[data-state="open"]') ||
      target.closest(".tiptap") ||
      // בדוק אם יש קלאס של עריכה
      target
        .closest('[class*="absolute"]')
        ?.querySelector("input, select, textarea")
    );
  }, []);

  const startEditing = useCallback((cell) => {
    if (!cell) return false;

    // מצא את הדיב עם role="gridcell"
    const editableDiv = cell.querySelector('[role="gridcell"]');
    if (editableDiv) {
      editableDiv.click();
      return true;
    }

    // fallback - לחץ על התא עצמו
    cell.click();
    return true;
  }, []);

  useEffect(() => {
    if (!enableNavigation || !table) return;

    const handleKeyDown = (event) => {
      // בדוק אם אנחנו בתוך הטבלה
      const target = event.target;
      const currentCell = target.closest("td");

      if (!currentCell) return;

      const currentRow = currentCell.parentElement;
      const tbody = currentRow?.parentElement;
      if (!tbody) return;

      const rows = Array.from(tbody.querySelectorAll("tr"));
      const cells = Array.from(currentRow.querySelectorAll("td"));

      const currentRowIndex = rows.indexOf(currentRow);
      const currentCellIndex = cells.indexOf(currentCell);

      // בדוק אם אנחנו במצב עריכה
      const inEditMode = isInEditMode(target);

      // ===== ESCAPE - יציאה ממצב עריכה =====
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();

        // סגור כל מודל/dropdown פתוח
        const openModals = document.querySelectorAll(
          '[role="dialog"][data-state="open"]'
        );
        openModals.forEach((modal) => {
          const closeButton =
            modal.querySelector('[aria-label*="Close"]') ||
            modal.querySelector('button[type="button"]');
          if (closeButton) {
            closeButton.click();
          }
        });

        // אם אנחנו באינפוט, צא ממנו
        if (inEditMode && target.blur) {
          target.blur();
        }

        // תמיד החזר פוקוס לתא
        setTimeout(() => {
          if (currentCell) {
            focusCell(currentCell);
          }
        }, 100);
        return;
      }

      // ===== ENTER =====
      if (event.key === "Enter") {
        if (inEditMode) {
          // במצב עריכה - אם זה textarea עם Shift, תן להוסיף שורה
          if (target.tagName === "TEXTAREA" && event.shiftKey) {
            return; // תן ל-Shift+Enter לעבוד
          }

          // אחרת - צא ושמור
          event.preventDefault();
          event.stopPropagation();

          if (target.blur) {
            target.blur();
          }

          setTimeout(() => {
            focusCell(currentCell);
          }, 100);
        } else if (enableEditing) {
          // לא במצב עריכה - התחל
          event.preventDefault();
          event.stopPropagation();
          startEditing(currentCell);
        }
        return;
      }

      // ===== F2 =====
      if (event.key === "F2" && !inEditMode && enableEditing) {
        event.preventDefault();
        event.stopPropagation();
        startEditing(currentCell);
        return;
      }

      // ===== חיצי ניווט - רק אם לא במצב עריכה =====
      if (inEditMode) {
        return; // במצב עריכה - תן לחיצים לעבוד באינפוט
      }

      let nextCell = null;
      const isRTL =
        document.dir === "rtl" || document.documentElement.dir === "rtl";

      switch (event.key) {
        case "ArrowUp":
          event.preventDefault();
          event.stopPropagation();
          if (currentRowIndex > 0) {
            nextCell =
              rows[currentRowIndex - 1].querySelectorAll("td")[
                currentCellIndex
              ];
          }
          break;

        case "ArrowDown":
          event.preventDefault();
          event.stopPropagation();
          if (currentRowIndex < rows.length - 1) {
            nextCell =
              rows[currentRowIndex + 1].querySelectorAll("td")[
                currentCellIndex
              ];
          }
          break;

        case "ArrowLeft":
          event.preventDefault();
          event.stopPropagation();
          const leftIndex = isRTL ? currentCellIndex + 1 : currentCellIndex - 1;
          if (leftIndex >= 0 && leftIndex < cells.length) {
            nextCell = cells[leftIndex];
          }
          break;

        case "ArrowRight":
          event.preventDefault();
          event.stopPropagation();
          const rightIndex = isRTL
            ? currentCellIndex - 1
            : currentCellIndex + 1;
          if (rightIndex >= 0 && rightIndex < cells.length) {
            nextCell = cells[rightIndex];
          }
          break;

        case "Tab":
          event.preventDefault();
          event.stopPropagation();

          if (event.shiftKey) {
            // Shift+Tab - אחורה
            if (currentCellIndex > 0) {
              nextCell = cells[currentCellIndex - 1];
            } else if (currentRowIndex > 0) {
              const prevRow = rows[currentRowIndex - 1];
              const prevCells = prevRow.querySelectorAll("td");
              nextCell = prevCells[prevCells.length - 1];
            }
          } else {
            // Tab - קדימה
            if (currentCellIndex < cells.length - 1) {
              nextCell = cells[currentCellIndex + 1];
            } else if (currentRowIndex < rows.length - 1) {
              nextCell = rows[currentRowIndex + 1].querySelectorAll("td")[0];
            }
          }
          break;

        case "Home":
          event.preventDefault();
          event.stopPropagation();
          if (event.ctrlKey) {
            nextCell = rows[0]?.querySelectorAll("td")[0];
          } else {
            nextCell = cells[0];
          }
          break;

        case "End":
          event.preventDefault();
          event.stopPropagation();
          if (event.ctrlKey) {
            const lastRow = rows[rows.length - 1];
            const lastCells = lastRow?.querySelectorAll("td");
            nextCell = lastCells?.[lastCells.length - 1];
          } else {
            nextCell = cells[cells.length - 1];
          }
          break;

        case "PageUp":
          event.preventDefault();
          event.stopPropagation();
          const pageUpRow = Math.max(0, currentRowIndex - 10);
          nextCell = rows[pageUpRow]?.querySelectorAll("td")[currentCellIndex];
          break;

        case "PageDown":
          event.preventDefault();
          event.stopPropagation();
          const pageDownRow = Math.min(rows.length - 1, currentRowIndex + 10);
          nextCell =
            rows[pageDownRow]?.querySelectorAll("td")[currentCellIndex];
          break;
      }

      if (nextCell) {
        focusCell(nextCell);
      }
    };

    // חיבור ל-document (לא לקונטיינר!) כדי לתפוס הכל
    document.addEventListener("keydown", handleKeyDown, true); // true = capture phase

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [
    table,
    enableNavigation,
    enableEditing,
    focusCell,
    isInEditMode,
    startEditing,
  ]);

  return {
    focusFirstCell: () => {
      const container = document.querySelector('[data-table-container="true"]');
      const firstCell = container?.querySelector("tbody td");
      if (firstCell) {
        focusCell(firstCell);
      }
    },
    focusCell,
  };
}

export default useKeyboardNavigation;
