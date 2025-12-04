/**
 * Get text direction based on locale
 */
export const getTextDirection = () => {
  return window.user_local === "he_IL" ? "rtl" : "ltr";
};

/**
 * Generate styles for editor iframe based on theme
 */
export const generateEditorStyles = (theme, textDirection) => {
  const isDarkMode = theme === "dark";

  return `
    body {
      font-family: Arial, sans-serif;
      margin: 10px;
      direction: ${textDirection};
      color: ${isDarkMode ? "#e2e8f0" : "#0f172a"};
      background-color: ${isDarkMode ? "#1e293b" : "#ffffff"};
    }
    
    ul, ol {
      padding-inline-start: 25px;
    }
    
    /* סגנונות טבלה משופרים */
    table {
      border-collapse: collapse;
      width: 100%;
      margin-bottom: 1rem;
    }
    
    table.selected {
      outline: 2px solid #3b82f6 !important;
    }
    
    table:hover {
      outline: 1px dashed #3b82f6;
    }
    
    table td, table th {
      border: 1px solid ${isDarkMode ? "#334155" : "#ddd"};
      padding: 8px;
    }
    
    table td.selected, table th.selected {
      background-color: rgba(59, 130, 246, 0.1);
    }
    
    table td:hover, table th:hover {
      background-color: rgba(59, 130, 246, 0.05);
    }
    
    table.zebra tr:nth-child(even) {
      background-color: ${isDarkMode ? "#1e293b" : "#f9f9f9"};
    }
    
    table thead th {
      background-color: ${isDarkMode ? "#334155" : "#f5f5f5"};
      font-weight: bold;
    }
    
    /* סגנונות תמונה */
    img {
      max-width: 100%;
      height: auto;
      box-sizing: border-box;
    }
    
    img.selected {
      outline: 2px solid #3b82f6 !important;
      box-sizing: border-box;
    }
    
    img {
      -webkit-user-select: none;
      user-select: none;
    }
    
    img.resizable-image {
      outline: 2px solid #3b82f6 !important;
      box-sizing: border-box;
    }
    
    img {
      max-width: 100%;
      height: auto;
      display: inline-block;
    }

    [data-wysiwyg="video"] {
      display: block;
      margin: 10px 0;
      /* חשוב: שלא יגנוב בחירה/גרירה מיותרת */
      user-select: none;
    }

    /* כשסמן העכבר מעל הווידאו, נעודד "טקסט" (ויזואלית) */
    [data-wysiwyg="video"], [data-wysiwyg="video"] * {
      cursor: text;
    }

    /* עוגן caret זמני (ZWSP) – נקודת נחיתה לסמן */
    span[data-caret] {
      display: inline-block;
      width: 0;           /* לא שוברים ליי־אאוט */
      overflow: visible;
      line-height: 1;
    }
  `;
};

/**
 * Generate print styles for the editor
 */
export const generatePrintStyles = (textDirection) => {
  return `
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      direction: ${textDirection};
    }
    @media print {
      body {
        color: #000;
        background: #fff;
      }
      
      table {
        border-collapse: collapse;
        width: 100%;
      }
      
      table td, table th {
        border: 1px solid #ddd;
      }
    }
  `;
};
