// src/layout/editor/components/utils/colorUtils.js

/**
 * המר צבע HEX לפורמט RGB
 * @param {string} hex - קוד צבע בפורמט HEX (לדוגמה "#ff0000")
 * @returns {string} - צבע בפורמט RGB (לדוגמה "rgb(255, 0, 0)")
 */
export const hexToRgb = (hex) => {
  // וידוא שהקלט הוא בפורמט תקין
  hex = hex.trim();
  if (!hex) return "rgb(0, 0, 0)";

  // הסרת # אם קיים
  if (hex.startsWith('#')) {
    hex = hex.substring(1);
  }

  // השלמת פורמט קצר (כמו #FFF ל-#FFFFFF)
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }

  // המרה לקומפוננטות RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // בדיקת תקינות הערכים
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return "rgb(0, 0, 0)";
  }

  return `rgb(${r}, ${g}, ${b})`;
};

/**
 * המר צבע RGB לפורמט HEX
 * @param {string} rgb - צבע בפורמט RGB (לדוגמה "rgb(255, 0, 0)")
 * @returns {string} - קוד צבע בפורמט HEX (לדוגמה "#ff0000")
 */
export const rgbToHex = (rgb) => {
  // וידוא שהקלט הוא בפורמט תקין
  if (!rgb || typeof rgb !== 'string') return "#000000";

  // אם כבר בפורמט HEX, החזר כמו שהוא
  if (rgb.startsWith('#')) {
    return rgb;
  }

  // ניסיון למצוא את הערכים המספריים
  const rgbMatch = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/) || rgb.match(/rgba\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/) || rgb.match(/(\d+),\s*(\d+),\s*(\d+)/);

  if (!rgbMatch) {
    return "#000000";
  }

  // המרה לערכים שלמים
  const r = parseInt(rgbMatch[1]);
  const g = parseInt(rgbMatch[2]);
  const b = parseInt(rgbMatch[3]);

  // וידוא תקינות הערכים
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return "#000000";
  }

  // המרה להקסדצימלי עם אפסים מובילים אם צריך
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

/**
 * פונקציה שבודקת אם שני צבעים שווים, ללא קשר לפורמט
 * @param {string} color1 - צבע ראשון (HEX או RGB)
 * @param {string} color2 - צבע שני (HEX או RGB)
 * @returns {boolean} - האם הצבעים שווים
 */
export const areColorsEqual = (color1, color2) => {
  if (!color1 || !color2) return false;

  // המרה לפורמט אחיד (HEX) לצורך השוואה
  const hex1 = color1.startsWith('#') ? color1.toLowerCase() : rgbToHex(color1).toLowerCase();
  const hex2 = color2.startsWith('#') ? color2.toLowerCase() : rgbToHex(color2).toLowerCase();

  return hex1 === hex2;
};

// מזריק סטייל נקי ל-inline <code> ול-<pre><code> בתוך ה-iframe

export function applyCodeStyles(doc) {
  if (!doc) return;
  const id = "editor-code-styles";
  if (doc.getElementById(id)) return;
  const style = doc.createElement( "style");
  style.id = id;
  style.textContent = `
    /* inline code */
    code {
      background: rgba(30, 41, 59, 0.08);
      color: #0f172a;
      padding: 0.1em 0.35em;
      border-radius: 0.35rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 0.95em;
    }
    /* block code */
    pre code, code.block {
      display: block;
      white-space: pre-wrap;
      background: #0b1220;
      color: #e5e7eb;
      padding: 0.85rem 1rem;
      border-radius: 0.5rem;
      line-height: 1.5;
      overflow-x: auto;
    }
    pre { margin: 0.75rem 0; }

    /* Custom scrollbar styles (scrollbar-whiz) */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    ::-webkit-scrollbar-track {
      background: transparent;
      border-radius: 9999px;
    }
    ::-webkit-scrollbar-thumb {
      background: #c026d3; /* fuchsia-600 */
      border-radius: 9999px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #a21caf; /* fuchsia-700 */
    }
    /* Firefox */
    html {
      scrollbar-width: thin;
      scrollbar-color: #c026d3 transparent;
    }
  `;
  doc.head.appendChild(style);
}




