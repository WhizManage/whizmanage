// src/utils/formatValue.js

// 🧩 מפענח HTML Entities (כמו &#8362; → ₪)
export const decodeHtml = (html) => {
  if (!html) return "";
  const txt = document.createElement( "textarea");
  txt.innerHTML = html;
  return txt.value;
};

// 🔢 כמה ספרות אחרי הנקודה למחירים (מ-WooCommerce)
const getPriceDecimals = () => {
  if (typeof window === "undefined") return 2;
  const d = Number(window.priceDecimals);
  return Number.isFinite(d) ? d : 2;
};

// 🔢 כמה ספרות אחרי הנקודה ליחידות (מידות/משקל)
// ניתן להגדיר window.dimensionDecimals / window.weightDecimals בפלאגין.
// אם לא הוגדר – נשתמש בערך ברירת מחדל ייעודי.
const getUnitDecimals = (type = "dimension") => {
  if (typeof window === "undefined") return 2;

  if (type === "weight") {
    const d = Number(window.weightDecimals);
    if (Number.isFinite(d)) return d;
    return 3; // ברירת מחדל מומלצת למשקלים
  }

  if (type === "dimension") {
    const d = Number(window.dimensionDecimals);
    if (Number.isFinite(d)) return d;
    return 2; // ברירת מחדל למידות
  }

  return 2;
};

// 💰 מעצב מטבע לפי הגדרות WooCommerce (סמל, מיקום, מספר ספרות)
export const formatCurrency = (amount) => {
  if (amount == null || amount === "") return "";

  const decimals = getPriceDecimals();

  const rawSymbol =
    (typeof window !== "undefined" && window.currencySymbol) || "";
  const symbol = decodeHtml(rawSymbol) || "₪";

  const pos =
    (typeof window !== "undefined" && window.currencyPos) || "left";

  const num = Number(amount);
  const formatted = Number.isNaN(num)
    ? amount
    : num.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

  switch (pos) {
    case "left":
      return `${symbol}${formatted}`;
    case "left_space":
      return `${symbol} ${formatted}`;
    case "right":
      return `${formatted}${symbol}`;
    case "right_space":
      return `${formatted} ${symbol}`;
    default:
      return `${symbol}${formatted}`;
  }
};

// 📏 יחידות מידה (מידות / משקל)
export const formatUnit = (value, type = "dimension") => {
  if (value == null || value === "") return "";

  const decimals = getUnitDecimals(type);

  const num = Number(value);
  const formatted = Number.isNaN(num)
    ? value
    : num.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

  const unit =
    type === "weight"
      ? ((typeof window !== "undefined" && window.weightUnit) || "kg")
      : ((typeof window !== "undefined" && window.dimensionUnit) || "cm");

  return `${formatted} ${unit}`;
};

// ⚙️ פונקציה מאחדת לכל סוג ערך
export const formatValue = (value, formatType = "number", unitType) => {
  if (value == null || value === "") return "";

  switch (formatType) {
    case "currency":
      return formatCurrency(value);

    case "percent": {
      const num = Number(value);
      return Number.isNaN(num) ? `${value}%` : `${num}%`;
    }

    case "weight":
    case "dimension":
      return formatUnit(value, formatType);

    case "number":
    default: {
      const num = Number(value);
      if (Number.isNaN(num)) return value;

      // כאן אפשר לבחור – האם מספר רגיל יעקוב אחרי priceDecimals או לא.
      // כרגע נותן 0 מינימום ו-max כמו מחירים.
      const decimals = getPriceDecimals();
      return num.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals,
      });
    }
  }
};
