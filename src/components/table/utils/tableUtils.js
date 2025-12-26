import { useTheme } from "@/layout/ThemeProvider";

export const getCommonPinningStyles = (column) => {
  const isPinned = column.getIsPinned();

  if (!isPinned) {
    return {
      position: "relative",
      zIndex: 0,
    };
  }

  // בדיקת RTL
  const isRTL = document.dir === 'rtl' || document.documentElement.dir === 'rtl';

  // בדיקה פשוטה של dark mode
  const isDarkMode = document.documentElement.classList.contains("dark");
  const backgroundColor = isDarkMode
    ? "rgb(30 41 59)"  // slate-800
    : "rgb(255 255 255)";

  // חישוב המיקום
  let positionStyles = {};

  if (isPinned === "left") {
    const position = `${column.getStart("left")}px`;
    // ב-RTL, עמודה "שמאלית" צריכה להיות מוצמדת מימין
    positionStyles = isRTL
      ? { right: position }
      : { left: position };
  } else if (isPinned === "right") {
    const position = `${column.getAfter("right")}px`;
    // ב-RTL, עמודה "ימנית" צריכה להיות מוצמדת משמאל
    positionStyles = isRTL
      ? { left: position }
      : { right: position };
  }

  return {
    ...positionStyles,
    position: "sticky",
    width: column.getSize(),
    zIndex: isPinned ? 10 : 0,
    backgroundColor: backgroundColor,
  };
};

// מודיפייר מותאם אישית שמגביל גרירת עמודות לאזור המותר
export const restrictColumnDragToTableBounds = ({
  transform,
  containerNodeRect,
  activeNodeRect,
}) => {
  if (!transform || !containerNodeRect || !activeNodeRect) {
    return transform;
  }

  const tableContainer = document.querySelector(
    '[data-table-container="true"]'
  );
  if (!tableContainer) {
    return transform;
  }

  const tableRect = tableContainer.getBoundingClientRect();
  const activeRect = activeNodeRect;

  // גבולות בסיסיים למניעת יציאה מהטבלה
  const leftBound = 0;
  const rightBound = tableRect.width - activeRect.width;

  const newX = Math.min(
    Math.max(transform.x, -activeRect.left + leftBound),
    rightBound - activeRect.left
  );

  return {
    ...transform,
    x: newX,
  };
};

// מודיפיייר מותאם אישית שמגביל גרירת שורות לאזור המותר
export const restrictRowDragToTableBounds = ({
  transform,
  containerNodeRect,
  activeNodeRect,
}) => {
  if (!transform || !containerNodeRect || !activeNodeRect) {
    return transform;
  }

  const tableContainer = document.querySelector(
    '[data-table-container="true"]'
  );
  if (!tableContainer) {
    return transform;
  }

  const tableRect = tableContainer.getBoundingClientRect();
  const activeRect = activeNodeRect;

  const topBound = -activeRect.top + tableRect.top + 48; // 48px לכותרת
  const bottomBound = tableRect.bottom - activeRect.bottom - 18; // 18px לתחתית

  const newY = Math.min(Math.max(transform.y, topBound), bottomBound);

  return {
    ...transform,
    y: newY,
    x: 0, // מונע תנועה אופקית לשורות
  };
};

const shadows = {
  pinnedLeft: {
    light: "3px 0 6px -3px rgba(0, 0, 0, 0.08), 2px 0 4px -2px rgba(0, 0, 0, 0.05)",
    dark: "4px 0 8px -2px rgba(15, 23, 42, 0.3), 2px 0 4px -1px rgba(15, 23, 42, 0.2)"
  },
  pinnedRight: {
    light: "-3px 0 6px -3px rgba(0, 0, 0, 0.08), -2px 0 4px -2px rgba(0, 0, 0, 0.05)",
    dark: "-4px 0 8px -2px rgba(15, 23, 42, 0.3), -2px 0 4px -1px rgba(15, 23, 42, 0.2)"
  },
  dragging: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  hover: {
    light: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
    dark: "0 1px 3px 0 rgba(0, 0, 0, 0.3)"
  }
};

export const getShadow = (type, isDark) => {
  const shadow = shadows[type];
  if (!shadow) return undefined;

  if (typeof shadow === 'string') return shadow;
  return shadow[isDark ? 'dark' : 'light'];
};

//
// ID utilities for stable row identification across the table
//
export function getAnyId(item) {
  if (item == null) return "";
  if (item.id != null) return String(item.id);
  // ❗אחידות עם getRowId: נשתמש באותו שדה זמני
  if (!item.__tmp_uid) {
    item.__tmp_uid = crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  }
  return String(item.__tmp_uid);
}

/**
 * Compare two identifiers for equality.
 */
export const idsEqual = (a, b) => {
  return String(a) === String(b);
};

// Helper קצר לבדיקת dark mode
export const isDarkMode = () => {
  return document.documentElement.classList.contains("dark");
};
