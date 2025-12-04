// src/components/RichEditor/components/ColorTools.jsx
import React, { useState, useEffect, useRef } from "react";
import { __ } from '@wordpress/i18n';
import { Type, PaintBucket, X } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@components/ui/toggle-group";
import CustomTooltip from "@components/nextUI/Tooltip";
import { useTheme } from "../../../ThemeProvider";

const ColorTools = ({ execCommand, editorRef, focusEditor }) => {
   
  const { theme } = useTheme();

  // רפרנסים לאינפוטים של בחירת הצבע
  const textColorInputRef = useRef(null);
  const bgColorInputRef = useRef(null);

  // שמירת הצבעים שנבחרו
  const [textColor, setTextColor] = useState(null);
  const [bgColor, setBgColor] = useState(null);

  // מצב פעיל של כפתורי הצבע
  const [textColorActive, setTextColorActive] = useState(false);
  const [bgColorActive, setBgColorActive] = useState(false);

  // מצב ריחוף על הכפתורים ועל כפתורי האיפוס
  const [hoverTextColor, setHoverTextColor] = useState(false);
  const [hoverBgColor, setHoverBgColor] = useState(false);
  const [hoverTextReset, setHoverTextReset] = useState(false);
  const [hoverBgReset, setHoverBgReset] = useState(false);

  // צבעי ברירת מחדל לפי מצב תאורה
  const defaultTextColor = theme === "dark" ? "#e2e8f0" : "#0f172a";
  const defaultBgColor = theme === "dark" ? "#0f172a" : "#ffffff";

  // בעת שינוי בצבע הטקסט
  const handleTextColorChange = (e) => {
    const color = e.target.value;
    setTextColor(color);
    setTextColorActive(true);
    focusEditor();
    execCommand("foreColor", color);
  };

  // בעת שינוי בצבע הרקע – תמיכה בדפדפנים שונים
  const handleBgColorChange = (e) => {
    const color = e.target.value;
    setBgColor(color);
    setBgColorActive(true);
    focusEditor();
    try { execCommand("hiliteColor", color); } catch { }
    try { execCommand("backColor", color); } catch { }
  };

  const resetTextColor = () => {
    setTextColorActive(false);
    setTextColor(null);
    focusEditor();
    execCommand("foreColor", defaultTextColor);
  };

  // פתיחת בורר הצבע של טקסט
  const openTextColorPicker = (e) => {
    if (textColorInputRef.current && !e.target.closest(".reset-button")) {
      textColorInputRef.current.click();
    }
  };

  // פתיחת בורר הצבע של רקע
  const openBgColorPicker = (e) => {
    if (bgColorInputRef.current && !e.target.closest(".reset-button")) {
      bgColorInputRef.current.click();
    }
  };

  /** ===== עוזרים לפיצול עטיפה צבועה בנקודת הסמן ===== */
  const closestColoredAncestor = (node, doc) => {
    let n = node;
    while (n && n !== doc.body) {
      if (
        n.nodeType === 1 &&
        (
          (n.style && n.style.backgroundColor && n.style.backgroundColor !== "") ||
          n.tagName === "MARK"
        )
      ) {
        return n;
      }
      n = n.parentNode;
    }
    return null;
  };

  const resetBgColor = () => {
    // איפוס מיידי של מצב ה-React
    setBgColorActive(false);
    setBgColor(null);
    setHoverBgColor(false);
    setHoverBgReset(false); 

    focusEditor();

    const doc = editorRef.current?.contentDocument;
    if (!doc) return;

    const sel = doc.getSelection?.();
    if (!sel || sel.rangeCount === 0) {
      // אם אין בחירה, נסה לנקות את צבע הרקע הנוכחי
      try { execCommand("hiliteColor", "transparent"); } catch { }
      try { execCommand("backColor", "transparent"); } catch { }
      return;
    }

    const range = sel.getRangeAt(0);

    if (range.collapsed) {
      // מצב סמן: מפצלים את העטיפה הצבעונית ומוציאים את הסמן
      const currentNode = range.startContainer;
      const coloredAncestor = closestColoredAncestor(currentNode, doc);

      if (coloredAncestor) {
        const parent = coloredAncestor.parentNode;
        const afterRange = doc.createRange();
        afterRange.setStart(range.startContainer, range.startOffset);
        afterRange.setEndAfter(coloredAncestor);
        const afterContent = afterRange.extractContents();

        // יוצר נקודת יציאה נקייה
        const cleanExitPoint = doc.createElement("span");
        cleanExitPoint.innerHTML = "&#x200B;";

        // ממקם את נקודת היציאה ואת התוכן שנותק
        if (parent) {
          parent.insertBefore(cleanExitPoint, coloredAncestor.nextSibling);
          if (afterContent.hasChildNodes()) {
            const newEl = coloredAncestor.cloneNode(false);
            newEl.appendChild(afterContent);
            parent.insertBefore(newEl, cleanExitPoint.nextSibling);
          }
        }

        // ממקם את הסמן בנקודת היציאה
        const newRange = doc.createRange();
        newRange.setStart(cleanExitPoint.firstChild, 1);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);

        // מונע ביצוע של הפקודה הבעייתית
        return;
      }
    }

    // נקיטת הפעולות הכלליות במקרה של בחירה או חוסר פיצול
    try { execCommand("hiliteColor", "transparent"); } catch { }
    try { execCommand("backColor", "transparent"); } catch { }
  };

  // המרת צבע לפורמט אחיד
  const normalizeColor = (color) => {
    if (!color) return "";
    color = color.toString().trim().toLowerCase();

    if (color.startsWith("#")) return color;

    if (color.startsWith("rgb")) {
      const parts = color.match(/\d+/g);
      if (!parts || parts.length < 3) return color;
      return (
        "#" +
        parts
          .slice(0, 3)
          .map((x) => {
            const hex = parseInt(x, 10).toString(16);
            return hex.length === 1 ? "0" + hex : hex;
          })
          .join("")
      );
    }

    const named = {
      transparent: "transparent",
      black: "#000000",
      white: "#ffffff",
      red: "#ff0000",
      green: "#008000",
      blue: "#0000ff",
    };
    return named[color] || color;
  };

  // השוואת צבעים
  const isColorSimilar = (c1, c2) => {
    if (!c1 || !c2) return c1 === c2;
    const n1 = normalizeColor(c1);
    const n2 = normalizeColor(c2);
    if (n1 === "transparent" || n2 === "transparent") {
      return (
        n1 === n2 || n1 === "rgba(0, 0, 0, 0)" || n2 === "rgba(0, 0, 0, 0)"
      );
    }
    return n1 === n2;
  };

  /** בדיקת צבע רקע של הבחירה:
   * קודם מחפשים inline (style / <span> / <mark>), ואם אין –
   * נבדוק computedStyle רק אם שונה מה־body ומה־defaultBgColor.
   */
  const getBackgroundColorOfSelection = () => {
    if (!editorRef?.current) return null;

    const doc = editorRef.current.contentDocument;
    const selection = doc.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    try {
      const range = selection.getRangeAt(0);
      const bodyBg = doc.defaultView.getComputedStyle(doc.body).backgroundColor;

      const ancestor =
        range.commonAncestorContainer.nodeType === 3
          ? range.commonAncestorContainer.parentNode
          : range.commonAncestorContainer;

      // בדיקה מעלה: inline background או <mark>
      let cur = ancestor;
      while (cur && cur !== doc.body) {
        if (cur.tagName === "SPAN" && cur.style?.backgroundColor) {
          return cur.style.backgroundColor;
        }
        if (cur.style?.backgroundColor) {
          return cur.style.backgroundColor;
        }
        if (cur.tagName === "MARK") {
          // נתייחס כלא-מנוהל (mark ברירת מחדל)
          return null;
        }
        cur = cur.parentNode;
      }

      // ערכי פקודות דפדפן
      const cmd1 = doc.queryCommandValue?.("hiliteColor");
      if (cmd1 && cmd1 !== "transparent" && cmd1 !== "rgba(0, 0, 0, 0)") {
        return cmd1;
      }
      const cmd2 = doc.queryCommandValue?.("backColor");
      if (cmd2 && cmd2 !== "transparent" && cmd2 !== "rgba(0, 0, 0, 0)") {
        return cmd2;
      }

      // fallback זהיר – computedStyle שונה מה־body ומה־default
      const parentEl =
        range.commonAncestorContainer.nodeType === 3
          ? range.commonAncestorContainer.parentNode
          : range.commonAncestorContainer;
      const computedStyle = doc.defaultView.getComputedStyle(parentEl);
      const computedBg = computedStyle.backgroundColor;

      if (
        computedBg &&
        computedBg !== "transparent" &&
        computedBg !== "rgba(0, 0, 0, 0)" &&
        computedBg !== bodyBg &&
        computedBg !== defaultBgColor
      ) {
        return computedBg;
      }
    } catch (error) {
      console.error("Error checking background color:", error);
    }

    return null;
  };

  // בדיקה אם הטקסט הנוכחי כבר צבוע
  const checkCurrentColors = () => {
    if (!editorRef?.current) return;

    const doc = editorRef.current.contentDocument;
    if (!doc || !doc.queryCommandValue) return;

    try {
      // טקסט
      const currentTextColor = doc.queryCommandValue("foreColor");
      if (currentTextColor && !isColorSimilar(currentTextColor, defaultTextColor)) {
        setTextColor(normalizeColor(currentTextColor));
        setTextColorActive(true);
      } else {
        setTextColorActive(false);
        setTextColor(null);
      }

      // רקע
      const currentBgColor = getBackgroundColorOfSelection();
      const transparentValues = [
        "transparent",
        "rgba(0, 0, 0, 0)",
        "",
        defaultBgColor,
        "rgb(255, 255, 255)",
        "#ffffff",
        "white",
      ];
      if (currentBgColor && !transparentValues.includes(normalizeColor(currentBgColor))) {
        setBgColor(normalizeColor(currentBgColor));
        setBgColorActive(true);
      } else {
        setBgColorActive(false);
        setBgColor(null);
      }
    } catch (e) {
      console.error("Error checking current colors:", e);
    }
  };

  // עדכון צבעים בעת בחירת טקסט
  useEffect(() => {
    if (!editorRef?.current) return;

    const doc = editorRef.current.contentDocument;
    if (!doc) return;

    const handleSelectionChange = () => setTimeout(checkCurrentColors, 10);

    doc.addEventListener("selectionchange", handleSelectionChange);
    doc.addEventListener("click", handleSelectionChange);
    doc.addEventListener("keyup", handleSelectionChange);

    return () => {
      doc.removeEventListener("selectionchange", handleSelectionChange);
      doc.removeEventListener("click", handleSelectionChange);
      doc.removeEventListener("keyup", handleSelectionChange);
    };
  }, [editorRef, theme]);

  return (
    <ToggleGroup type="multiple" variant="ghost" size="xs" className="h-7">
      {/* כלי צבע טקסט */}
      <div className="relative">
        <CustomTooltip title={hoverTextReset ? __("Reset Text Color", "whizmanage") : __("Text Color", "whizmanage")}>
          <ToggleGroupItem
            value="textColor"
            onClick={(e) => openTextColorPicker(e)}
            aria-label={__("Text Color", "whizmanage")}
            className="h-7 w-7 p-0 rounded-md relative"
            data-state={textColorActive ? "on" : "off"}
            onMouseEnter={() => setHoverTextColor(true)}
            onMouseLeave={() => setHoverTextColor(false)}
          >
            <Type
              className="size-4"
              strokeWidth={1.5}
              style={{ color: textColorActive ? textColor : "currentColor" }}
            />
            <input
              ref={textColorInputRef}
              type="color"
              value={textColor || "#000000"}
              className="absolute opacity-0 w-0 h-0"
              onChange={handleTextColorChange}
            />
            {textColorActive && hoverTextColor && (
              <div
                className="absolute -top-2 -left-2 h-5 w-5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 flex items-center justify-center cursor-pointer shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-all reset-button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  resetTextColor();
                }}
                onMouseEnter={() => setHoverTextReset(true)}
                onMouseLeave={() => setHoverTextReset(false)}
              >
                <X className="size-3" strokeWidth={2} />
              </div>
            )}
          </ToggleGroupItem>
        </CustomTooltip>
      </div>
      {/* כלי צבע רקע */}
      <div className="relative">
        <CustomTooltip title={hoverBgReset ? __("Reset Background Color", "whizmanage") : __("Background Color", "whizmanage")}>
          <ToggleGroupItem
            value="bgColor"
            onClick={(e) => openBgColorPicker(e)}
            aria-label={__("Background Color", "whizmanage")}
            className="h-7 w-7 p-0 rounded-md relative"
            data-state={bgColorActive ? "on" : "off"}
            onMouseEnter={() => setHoverBgColor(true)}
            onMouseLeave={() => setHoverBgColor(false)}
          >
            <PaintBucket
              className="size-4"
              strokeWidth={1.5}
              style={{ color: bgColorActive ? bgColor : "currentColor" }}
            />
            <input
              ref={bgColorInputRef}
              type="color"
              value={bgColor || "#ffffff"}
              className="absolute opacity-0 w-0 h-0"
              onChange={handleBgColorChange}
            />
            {bgColorActive && hoverBgColor && (
              <div
                className="absolute -top-2 -left-2 h-5 w-5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 flex items-center justify-center cursor-pointer shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-all reset-button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  resetBgColor();
                }}
                onMouseEnter={() => setHoverBgReset(true)}
                onMouseLeave={() => setHoverBgReset(false)}
              >
                <X className="size-3" strokeWidth={2} />
              </div>
            )}
          </ToggleGroupItem>
        </CustomTooltip>
      </div>
    </ToggleGroup>
  );
};

export default ColorTools;
