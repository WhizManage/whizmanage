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
  if (!doc || !doc.head) return;
  const EXISTING_ID = "code-styles";
  doc.getElementById(EXISTING_ID)?.remove();

  const s = doc.createElement("style");
  s.id = EXISTING_ID;
  s.textContent = `
    /* ------ Minimal, strong background for code ------ */
    code {
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 500;
      /* Use a medium-strong background, but let text/color come from theme */
      background: rgba(84, 84, 84, 0.15); /* כהה-עדין בלייט */
    }

    pre {
      border-radius: 8px;
      padding: .85rem 1rem;
      margin: .6rem 0;
      overflow: auto;
      white-space: pre;
      tab-size: 2;
      line-height: 1.5;
      /* חוזק רקע מעט פחות */
      background: rgba(84, 84, 84, 0.10);
    }

    pre code {
      background: transparent !important;
      border: 0 !important;
      border-radius: 0;
      padding: 0;
      color: inherit;
    }

    /* Light mode */
    @media (prefers-color-scheme: light) {
      code { background: #e2e8f0; } /* Tailwind slate-200 */
      pre { background: #f1f5f9; } /* slate-100 */
    }

    /* Dark mode */
    @media (prefers-color-scheme: dark) {
      code { background: #475569; } /* slate-600 */
      pre { background: #334155; } /* slate-700 */
    }

    /* Manual dark class */
    .dark code { background: #475569; }
    .dark pre { background: #334155; }
  `;
  doc.head.appendChild(s);
}



