// ================================
// File: HtmlEditor.jsx
// ================================
import { useState, useRef, useEffect } from "react";
import { __ } from '@wordpress/i18n';
import { useTheme } from "../ThemeProvider";
import EditingArea from "./components/EditingArea";
import TableDialog from "./components/TableDialog";
import TableSelector from "./components/TableSelector";
import Toolbar from "./components/Toolbar";
import VideoDialog from "./components/VideoDialog";
import UniversalMediaSelector from "./components/UniversalMediaSelector";
import {
  generateEditorStyles,
  getTextDirection,
} from "./components/utils/themeHelpers";
import { confirm } from "@/components/CustomConfirm";

/** -------------------------
 * Shortcode helpers
 * ------------------------- */

/** remove editor-only artifacts that slipped into content */
const stripEditorArtifacts = (html) => (html || "")
  // פורטלים קיימים
  .replace(/<div id="image-toolbar-portal"[\s\S]*?<\/div>/g, "")
  .replace(/<div id="table-toolbar-portal"[\s\S]*?<\/div>/g, "")

  // עטיפה סביב הטבלה: להשאיר רק את ה־TABLE מבפנים
  .replace(
    /<div class="umedia-wrap"[^>]*>\s*([\s\S]*?<table[\s\S]*?<\/table>)[\s\S]*?<\/div>/gi,
    (_m, innerTable) => innerTable
  )

  // הסרה מוחלטת של אלמנטים ויזואליים/ידיות
  .replace(/<div class="umedia-outline"[\s\S]*?<\/div>/gi, "")
  .replace(/<div class="umedia-overlay[\s\S]*?<\/div>/gi, "")
  .replace(/<div class="umedia-badge[\s\S]*?<\/div>/gi, "")

  // הוצאת umedia-* מה־class, ואם נותר class ריק – להסיר את המאפיין
  .replace(/\sclass="([^"]*)"/gi, (_m, cls) => {
    const cleaned = cls
      .split(/\s+/)
      .filter(c => c && !/^umedia-/.test(c) && c !== 'umedia-selected')
      .join(' ');
    return cleaned ? ` class="${cleaned}"` : "";
  })

  // ניקוי data-_um-prev-* (מידות קודמות) ושאר data של היוניברסל
  .replace(/\sdata-_um-[^=\s]+="[^"]*"/gi, "")

  // הסרת will-change מה־style
  .replace(/\sstyle="([^"]*)"/gi, (_m, style) => {
    const s = style
      .split(';')
      .map(x => x.trim())
      .filter(x => x && !/^will-change\s*:/i.test(x))
      .join('; ');
    return s ? ` style="${s}"` : "";
  })

  // ✅ הסרת עוגני סמן אם זלגו למקור
  .replace(/<span[^>]*data-caret[^>]*>\u200B?<\/span>/gi, "");

/** [video ...][/video]  ->  <div data-wysiwyg="video"><video ...><source .../></video></div> */
const shortcodeToHtml = (content) => {
  if (!content) return "";
  let html = content;

  // convert WP video shortcode to <video>
  html = html.replace(
    /\[video\s+([^\]]+)\]\s*\[\/video\]/gi,
    (_m, attrs) => {
      const get = (name) => {
        const r = new RegExp(`${name}="([^"]+)"`, "i").exec(attrs);
        return r ? r[1] : "";
      };
      const mp4 = get("mp4") || get("src") || "";
      const width = get("width");
      const height = get("height");
      const poster = get("poster");
      const autoplay = /autoplay="?on"?/i.test(attrs);
      const loop = /loop="?on"?/i.test(attrs);
      const muted = /muted="?on"?/i.test(attrs);
      const controlsOff = /controls="?off"?/i.test(attrs);

      const controls = controlsOff ? "" : "controls";
      const ap = autoplay ? "autoplay playsinline" : "";
      const lo = loop ? "loop" : "";
      const mu = muted || autoplay ? "muted" : "";
      const wh =
        (width ? ` width="${width}"` : "") +
        (height ? ` height="${height}"` : "");
      const posterAttr = poster ? ` poster="${poster}"` : "";

      // ✅ הזרקת עוגני סמן לפני ואחרי הווידאו (ZWSP)
      const CARET = '<span data-caret>\u200B</span>';

      // ✅ שמירת מקור גם ב־data-mp4 ושחילת <source>
      const dataMp4 = mp4 ? ` data-mp4="${mp4}"` : "";
      const source = mp4 ? `<source src="${mp4}" type="video/mp4">` : "";

      return `
        ${CARET}
        <div data-wysiwyg="video" contenteditable="false" style="margin:10px 0;">
          <video ${controls} ${ap} ${lo} ${mu}${wh}${posterAttr}${dataMp4} style="max-width:100%;">
            ${source}
            Your browser does not support the video tag.
          </video>
        </div>
        ${CARET}
      `.trim();
    }
  );

  return html;
};

/** <video>...</video>  ->  [video mp4="..." width="..." height="..." ...][/video] */
const htmlToShortcode = (content) => {
  if (!content) return "";
  let html = stripEditorArtifacts(content);

  // ✅ הסרת עוגני סמן לפני ההמרה
  html = html.replace(/<span[^>]*data-caret[^>]*>\u200B?<\/span>/gi, "");

  // turn any WYSIWYG wrapper back to clean <video> for parsing
  html = html.replace(
    /<div[^>]*data-wysiwyg="video"[^>]*>([\s\S]*?)<\/div>/gi,
    (_m, inner) => inner
  );

  // Replace <video ...>...</video> with [video ...][/video]
  html = html.replace(/<video([^>]*)>([\s\S]*?)<\/video>/gi, (m, attrs, inner) => {
    const pick = (name) => {
      const r = new RegExp(`${name}="([^"]+)"`, "i").exec(attrs);
      return r ? r[1] : "";
    };

    // סדר עדיפויות למקור:
    // 1) data-mp4 על הווידאו
    // 2) <source type="video/mp4" src="...">
    // 3) video[src]
    let src =
      pick("data-mp4") ||
      (/<source[^>]*type=["']video\/mp4["'][^>]*src=["']([^"']+)["'][^>]*>/i.exec(inner)?.[1] || "") ||
      pick("src");

    const width = pick("width");
    const height = pick("height");
    const poster = pick("poster");
    const autoplay = /\sautoplay(\s|>|$)/i.test(attrs);
    const loop = /\sloop(\s|>|$)/i.test(attrs);
    const muted = /\smuted(\s|>|$)/i.test(attrs);
    const controls = /\scontrols(\s|>|$)/i.test(attrs);

    const parts = [];
    if (width) parts.push(`width="${width}"`);
    if (height) parts.push(`height="${height}"`);
    if (poster) parts.push(`poster="${poster}"`);
    if (src) parts.push(`mp4="${src}"`);
    if (autoplay) parts.push(`autoplay="on"`);
    if (loop) parts.push(`loop="on"`);
    if (muted) parts.push(`muted="on"`);
    if (!controls) parts.push(`controls="off"`);

    return `[video ${parts.join(" ")}][/video]`;
  });

  return html;
};

/** -------------------------
 * Safety: ensure video <source> exists if data-mp4 exists
 * ------------------------- */
function ensureVideoSourceIntegrity(doc) {
  try {
    doc.querySelectorAll("video").forEach((v) => {
      const dataMp4 = v.getAttribute("data-mp4");
      if (!dataMp4) return;
      const hasMp4Source = !!v.querySelector('source[type="video/mp4"]');
      const hasSrc = v.getAttribute("src");
      if (!hasMp4Source && !hasSrc) {
        const s = doc.createElement("source");
        s.setAttribute("src", dataMp4);
        s.setAttribute("type", "video/mp4");
        v.insertBefore(s, v.firstChild);
      }
    });
  } catch {}
}

const HtmlEditor = ({ initialContent = "", onSave, height = 400, row }) => {
   
  const { theme } = useTheme();

  /** NOTE:
   * htmlContent נשמר תמיד בפורמט ה"סופי" – כלומר עם shortcode
   * לפני הצגה ב-iframe אנחנו ממירים לשפת HTML ויזואלית.
   */
  const [htmlContent, setHtmlContent] = useState(() => stripEditorArtifacts(initialContent));
  const [isPreview, setIsPreview] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const editorRef = useRef(null);
  const updateTimeoutRef = useRef(null);
  const [showFontSelector, setShowFontSelector] = useState(false);
  const [currentFontSize, setCurrentFontSize] = useState(3);
  const ignoreSavingToHistory = useRef(false);
  const [isTableDialogOpen, setIsTableDialogOpen] = useState(false);
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  const [history, setHistory] = useState([stripEditorArtifacts(initialContent)]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [activeFormatting, setActiveFormatting] = useState({
    bold: false,
    italic: false,
    underline: false,
    justifyLeft: false,
    justifyCenter: false,
    justifyRight: false,
    justifyFull: false,
    insertUnorderedList: false,
    insertOrderedList: false,
  });

  // ← NEW: דגל שסמן שהעדכון הגיע מתוך ה-iframe כדי לדלג על mirror
  const fromIframeRef = useRef(false);

  const fontOptions = [
    { value: "Arial, sans-serif", label: "Arial" },
    { value: "Calibri, sans-serif", label: "Calibri" },
    { value: "Tahoma, sans-serif", label: "Tahoma" },
    { value: "Times New Roman, serif", label: "Times New Roman" },
    { value: "Courier New, monospace", label: "Courier New" },
    { value: "Helvetica, sans-serif", label: "Helvetica" },
    { value: "Verdana, sans-serif", label: "Verdana" },
    { value: "Georgia, serif", label: "Georgia" },
    { value: "David, sans-serif", label: "David" },
    { value: "Miriam, sans-serif", label: "Miriam" },
  ];

  const addContentToHistory = (content) => {
    if (ignoreSavingToHistory.current) return;
    if (history[historyIndex] === content) return;
    const newHistory = history.slice(0, historyIndex + 1);
    const lastContent = newHistory[newHistory.length - 1];
    const isSignificantChange =
      !lastContent || Math.abs(lastContent.length - content.length) > 10;
    if (isSignificantChange || newHistory.length <= 1) {
      setHistory([...newHistory, content]);
      setHistoryIndex(newHistory.length);
    }
  };

  const checkFormatting = () => {
    if (!editorRef.current) return;
    const doc = editorRef.current.contentDocument;
    if (!doc || !doc.queryCommandState) return;
    try {
      const newFormatting = {
        bold: doc.queryCommandState("bold"),
        italic: doc.queryCommandState("italic"),
        underline: doc.queryCommandState("underline"),
        justifyLeft: doc.queryCommandState("justifyLeft"),
        justifyCenter: doc.queryCommandState("justifyCenter"),
        justifyRight: doc.queryCommandState("justifyRight"),
        justifyFull: doc.queryCommandState("justifyFull"),
        insertUnorderedList: doc.queryCommandState("insertUnorderedList"),
        insertOrderedList: doc.queryCommandState("insertOrderedList"),
      };
      setActiveFormatting((prev) =>
        JSON.stringify(newFormatting) === JSON.stringify(prev)
          ? prev
          : newFormatting
      );
    } catch (e) {
      console.error("Error checking formatting:", e);
    }
  };

  const execCommand = (command, value = null) => {
    if (!editorRef.current) return;
    const doc = editorRef.current.contentDocument;
    if (!doc) return;

    try {
      // intercept alignment commands for tables and media
      const isAlign = ["justifyLeft", "justifyCenter", "justifyRight", "justifyFull"].includes(command);
      if (isAlign) {
        let target = null;
        // Prefer a table explicitly selected via our table selector
        const tableEl = doc.querySelector("table.selected, table.umedia-selected");
        if (tableEl) {
          target = tableEl;
        } else {
          const mediaEl = doc.querySelector("img.umedia-selected, video.umedia-selected, iframe.umedia-selected");
          if (mediaEl) target = mediaEl;
        }

        if (!target) {
          try {
            const sel = doc.getSelection?.() || doc.defaultView?.getSelection?.();
            if (sel && sel.rangeCount > 0) {
              let node = sel.getRangeAt(0).startContainer;
              if (node && node.nodeType === Node.TEXT_NODE) node = node.parentElement;
              if (node && node.closest) {
                const el = node.closest('table, img, video, iframe');
                if (el) target = el;
              }
            }
          } catch { }
        }

        if (target) {
          // If the element is wrapped by the universal resizer wrapper, unwrap it
          if (target._um_wrap) {
            const wrapper = target._um_wrap;
            wrapper.parentNode?.insertBefore(target, wrapper);
            wrapper.remove();
            if (target._um_outline && target._um_outline.remove) target._um_outline.remove();
            if (target._um_badge && target._um_badge.remove) target._um_badge.remove();
            target._um_wrap = null;
            target._um_outline = null;
            target._um_badge = null;
            try {
              doc.dispatchEvent?.(new Event('umedia:reset'));
            } catch { }
          }

          // ✅ Apply alignment enabling text wrapping
          const el = target;
          // reset previous
          el.style.margin = '';
          el.style.float = '';
          el.style.cssFloat = '';

          if (command === 'justifyLeft') {
            // float left – text wraps on the right
            el.style.cssFloat = 'left';
            el.style.margin = '0 1em 0 0';
            if (el.tagName === 'TABLE') el.style.display = 'inline-table';
          } else if (command === 'justifyRight') {
            // float right – text wraps on the left
            el.style.cssFloat = 'right';
            el.style.margin = '0 0 0 1em';
            if (el.tagName === 'TABLE') el.style.display = 'inline-table';
          } else {
            // center – block on its own line
            el.style.float = 'none';
            el.style.cssFloat = 'none';
            el.style.display = 'block';
            el.style.marginLeft = 'auto';
            el.style.marginRight = 'auto';
          }

          checkFormatting();

          // Schedule update with longer delay to ensure DOM changes are complete
          clearTimeout(updateTimeoutRef.current);
          updateTimeoutRef.current = setTimeout(() => {
            if (!editorRef.current) return;
            ensureVideoSourceIntegrity(doc); // ← בטיחות
            const visualHtml = doc.body.innerHTML;
            const shortcodeHtml = htmlToShortcode(visualHtml);
            if (shortcodeHtml !== htmlContent) {
              fromIframeRef.current = true;
              setHtmlContent(shortcodeHtml);
              addContentToHistory(shortcodeHtml);
              onSave && onSave(shortcodeHtml);
            }

            // Reset placement lock to allow repositioning (tables)
            if (target.tagName === 'TABLE') {
              try {
                const resetEvent = new CustomEvent('table-position-changed', {
                  bubbles: true,
                  detail: { table: target, reason: 'alignment' }
                });
                target.dispatchEvent(resetEvent);
                setTimeout(() => {
                  target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                }, 100);
              } catch (error) {
                console.error('Error triggering table position update:', error);
              }
            }
          }, 150);

          return;
        }
      }

      // default behaviour for all other commands
      doc.execCommand(command, false, value);
      checkFormatting();
      editorRef.current.contentWindow.focus();

      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = setTimeout(() => {
        if (!editorRef.current) return;
        ensureVideoSourceIntegrity(doc); // ← בטיחות
        const visualHtml = doc.body.innerHTML;
        const shortcodeHtml = htmlToShortcode(visualHtml);
        if (shortcodeHtml !== htmlContent) {
          fromIframeRef.current = true;
          setHtmlContent(shortcodeHtml);
          addContentToHistory(shortcodeHtml);
          onSave && onSave(shortcodeHtml);
        }
      }, 120);
    } catch (e) {
      console.error(`Error executing command: ${command}`, e);
    }
  };

  const dispatchUmediaReset = () => {
    try {
      const d = editorRef.current?.contentDocument;
      d?.dispatchEvent?.(new Event("umedia:reset"));
    } catch { }
  };

  const customUndo = () => {
    if (historyIndex > 0) {
      ignoreSavingToHistory.current = true;
      const newIndex = historyIndex - 1;
      const prevShortcode = history[newIndex];
      setHistoryIndex(newIndex);
      setHtmlContent(prevShortcode);

      if (editorRef.current) {
        const doc = editorRef.current.contentDocument;
        // נקה אובייקטי בחירה/ריסייז קיימים
        dispatchUmediaReset();
        doc.body.innerHTML = shortcodeToHtml(prevShortcode);
        setTimeout(() => {
          editorRef.current?.contentWindow?.focus();
          ignoreSavingToHistory.current = false;
        }, 10);
      }
      onSave && onSave(prevShortcode);
    }
  };

  const customRedo = () => {
    if (historyIndex < history.length - 1) {
      ignoreSavingToHistory.current = true;
      const newIndex = historyIndex + 1;
      const nextShortcode = history[newIndex];
      setHistoryIndex(newIndex);
      setHtmlContent(nextShortcode);
      if (editorRef.current) {
        const doc = editorRef.current.contentDocument;
        // נקה אובייקטי בחירה/ריסייז קיימים
        dispatchUmediaReset();
        doc.body.innerHTML = shortcodeToHtml(nextShortcode);
        setTimeout(() => {
          editorRef.current?.contentWindow?.focus();
          ignoreSavingToHistory.current = false;
        }, 10);
      }
      onSave && onSave(nextShortcode);
    }
  };

  /** init iframe */
  useEffect(() => {
    if (!editorRef.current) return;
    const doc = editorRef.current.contentDocument;
    doc.designMode = "on";

    // load initial content as visual HTML
    if (!doc.body.innerHTML) {
      doc.body.innerHTML = shortcodeToHtml(stripEditorArtifacts(initialContent));
      ensureVideoSourceIntegrity(doc); // ← בטיחות ראשונית
    }

    const textDirection = getTextDirection();
    const style = doc.createElement("style");
    style.id = "editor-styles";
    style.textContent = generateEditorStyles(theme, textDirection);
    doc.head.appendChild(style);

    const formatHandler = () => setTimeout(checkFormatting, 0);

    const inputHandler = () => {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = setTimeout(() => {
        if (editorRef.current) {
          const d = editorRef.current.contentDocument;
          ensureVideoSourceIntegrity(d); // ← בטיחות
          const visualHtml = d.body.innerHTML;
          const shortcodeHtml = htmlToShortcode(visualHtml);
          if (shortcodeHtml !== htmlContent) {
            fromIframeRef.current = true;
            setHtmlContent(shortcodeHtml);
            onSave && onSave(shortcodeHtml);
            if (!ignoreSavingToHistory.current) {
              addContentToHistory(shortcodeHtml);
            }
          }
        }
      }, 300);
    };

    doc.addEventListener("selectionchange", formatHandler);
    doc.addEventListener("click", formatHandler);
    doc.addEventListener("input", inputHandler);

    // ===== Keyboard Undo/Redo (layout-independent) =====
    const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || "");
    const keydownHandler = (e) => {
      if (isPreview) return;            // במצב קוד – לא נתערב
      if (!doc.hasFocus?.()) return;    // רק כשה-iframe בפוקוס
      const cmd = isMac ? e.metaKey : e.ctrlKey;
      if (!cmd) return;

      const code = e.code;
      const isZ = code === "KeyZ";
      const isY = code === "KeyY";
      const isUndoKey = e.key === "Undo";
      const isRedoKey = e.key === "Redo";

      // Undo
      if (isUndoKey || (cmd && isZ && !e.shiftKey)) {
        e.preventDefault();
        customUndo();
        return;
      }
      // Redo
      if (
        isRedoKey ||
        (isMac && cmd && isZ && e.shiftKey) ||          // ⇧⌘Z
        (!isMac && cmd && (isY || (isZ && e.shiftKey))) // Ctrl+Y או Ctrl+Shift+Z
      ) {
        e.preventDefault();
        customRedo();
      }
    };

    // תמיכה גם ב-beforeinput historyUndo/historyRedo (כולל תפריטי מערכת)
    const beforeInputHandler = (e) => {
      if (isPreview) return;
      if (e.inputType === "historyUndo") {
        e.preventDefault();
        customUndo();
      } else if (e.inputType === "historyRedo") {
        e.preventDefault();
        customRedo();
      }
    };

    doc.addEventListener("keydown", keydownHandler);
    doc.addEventListener("beforeinput", beforeInputHandler);

    return () => {
      if (editorRef.current?.contentDocument) {
        const d = editorRef.current.contentDocument;
        d.removeEventListener("selectionchange", formatHandler);
        d.removeEventListener("click", formatHandler);
        d.removeEventListener("input", inputHandler);
        d.removeEventListener("keydown", keydownHandler);
        d.removeEventListener("beforeinput", beforeInputHandler);
      }
      clearTimeout(updateTimeoutRef.current);
    };
  }, [isPreview, theme, initialContent]); // eslint-disable-line react-hooks/exhaustive-deps

  /** whenever htmlContent (shortcodes) changes while in visual mode, mirror into iframe as HTML */
  useEffect(() => {
    if (!editorRef.current || isPreview) return;
    // ← NEW: אם העדכון הגיע מה-iframe, דלג על mirror כדי לא להחליף nodeים
    if (fromIframeRef.current) {
      fromIframeRef.current = false;
      return;
    }
    const doc = editorRef.current.contentDocument;
    const visual = shortcodeToHtml(htmlContent);
    if (doc && doc.body.innerHTML !== visual) {
      doc.body.innerHTML = visual;
      ensureVideoSourceIntegrity(doc); // ← בטיחות לאחר מראה
    }
  }, [htmlContent, isPreview]);

  useEffect(() => {
    if (!editorRef.current) return;
    const doc = editorRef.current.contentDocument;
    const styleElement = doc.head.querySelector("#editor-styles");
    if (styleElement) {
      const textDirection = getTextDirection();
      styleElement.textContent = generateEditorStyles(theme, textDirection);
    }
  }, [theme]);

  const togglePreview = () => setIsPreview((p) => !p);
  const toggleFullScreen = () => setIsFullScreen((v) => !v);

  const printContent = () => {
    if (!editorRef.current) return;
    const doc = editorRef.current.contentDocument;
    const win = editorRef.current.contentWindow;
    const style = doc.createElement("style");
    const textDirection = getTextDirection();
    style.textContent = `
      body { font-family: Arial, sans-serif; margin: 20px; direction: ${textDirection}; }
      @media print { body { color:#000; background:#fff; } }
    `;
    doc.head.appendChild(style);
    win.print();
    setTimeout(() => doc.head.removeChild(style), 1000);
  };

  const increaseFontSize = () => {
    const newSize = Math.min(currentFontSize + 1, 7);
    setCurrentFontSize(newSize);
    execCommand("fontSize", newSize);
  };

  const decreaseFontSize = () => {
    const newSize = Math.max(currentFontSize - 1, 1);
    setCurrentFontSize(newSize);
    execCommand("fontSize", newSize);
  };

  const changeFont = (fontFamily) => {
    execCommand("fontName", fontFamily);
    setShowFontSelector(false);
  };

  const insertLink = async () => {
    const url = await confirm({
      title: __("Insert Link", "whizmanage"),
      message: __("Please enter the link URL:", "whizmanage"),
      confirmText: __("Insert", "whizmanage"),
      cancelText: __("Cancel", "whizmanage"),
      type: "warning",
      inputPlaceholder: "https://example.com",
    });

    if (!url) return;
    execCommand("createLink", url);
  };

  const insertImage = async () => {
    const url = await confirm({
      title: __("Insert Image", "whizmanage"),
      message: __("Please enter the image URL:", "whizmanage"),
      confirmText: __("Insert", "whizmanage"),
      cancelText: __("Cancel", "whizmanage"),
      type: "warning",
      inputPlaceholder: "https://example.com/image.png",
    });

    if (!url) return;
    execCommand("insertImage", url);
  };

  const insertTable = () => setIsTableDialogOpen(true);

  const handleInsertTable = (tableHtml) => {
    if (!editorRef.current) return;
    const doc = editorRef.current.contentDocument;
    if (!doc) return;

    const CARET = '<span data-caret>\u200B</span>';
    const safeHtml = `${CARET}${tableHtml}${CARET}`;
    doc.execCommand("insertHTML", false, safeHtml);

    ensureVideoSourceIntegrity(doc); // ← בטיחות
    const visualHtml = doc.body.innerHTML;
    const newShortcode = htmlToShortcode(visualHtml);
    fromIframeRef.current = true;
    setHtmlContent(newShortcode);
    addContentToHistory(newShortcode);
    onSave && onSave(newShortcode);
  };

  /** when editing code (preview pane) we receive raw text to become the new source (shortcode-friendly) */
  const handleCodeChange = (e) => {
    const newContent = stripEditorArtifacts(e.target.value ?? e);
    setHtmlContent(newContent);
    onSave && onSave(newContent);
    clearTimeout(window.codeChangeTimeout);
    window.codeChangeTimeout = setTimeout(() => addContentToHistory(newContent), 500);
  };

  // פונקציה להעלאת תמונה - מתוקנת
  const handleImageUpload = (url) => {
    if (!editorRef.current) return;
    const doc = editorRef.current.contentDocument;
    if (!doc || !url) return;

    const CARET = '<span data-caret>\u200B</span>';
    const html = `${CARET}<img src="${url}" alt="" style="max-width:100%;height:auto;display:inline-block;vertical-align:top;">${CARET}`;

    doc.execCommand("insertHTML", false, html);

    ensureVideoSourceIntegrity(doc); // ← בטיחות
    const visualHtml = doc.body.innerHTML;
    const newShortcode = htmlToShortcode(visualHtml);
    fromIframeRef.current = true;
    setHtmlContent(newShortcode);
    addContentToHistory(newShortcode);
    onSave && onSave(newShortcode);
  };

  const handleContentUpdate = (newContent) => {
    const cleanedHtml = stripEditorArtifacts(newContent ?? "");
    const shortcode = htmlToShortcode(cleanedHtml);
    if (shortcode !== htmlContent) {
      // ← NEW: מקור מתוך ה-iframe/selector
      fromIframeRef.current = true;
      setHtmlContent(shortcode);
      addContentToHistory(shortcode);
      onSave && onSave(shortcode);
    }
  };

  useEffect(() => {
    return () => {
      clearTimeout(window.codeChangeTimeout);
      clearTimeout(updateTimeoutRef.current);
    };
  }, []);

  const fullScreenStyles = isFullScreen
    ? { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, width: "100vw", height: "100vh" }
    : {};

  const editorHeight = isFullScreen
    ? "calc(100vh - 50px)"
    : typeof height === "number" ? `${height}px` : (height || "400px");

  const activeTextValues = [];
  if (activeFormatting.bold) activeTextValues.push("bold");
  if (activeFormatting.italic) activeTextValues.push("italic");
  if (activeFormatting.underline) activeTextValues.push("underline");

  const activeAlignValue = activeFormatting.justifyLeft
    ? "left"
    : activeFormatting.justifyCenter
      ? "center"
      : activeFormatting.justifyRight
        ? "right"
        : activeFormatting.justifyFull
          ? "justify"
          : null;

  const activeListValues = [];
  if (activeFormatting.insertUnorderedList) activeListValues.push("bullet");
  if (activeFormatting.insertOrderedList) activeListValues.push("number");

  const insertVideo = () => setIsVideoDialogOpen(true);

  /** accept either html string (legacy) or {html, shortcode} from VideoDialog */
  const handleInsertVideo = (payload) => {
    if (!editorRef.current) return;
    const doc = editorRef.current.contentDocument;

    let visualChunk = "";
    let shortcodeFromDialog = "";

    if (typeof payload === "string") {
      // תמיכה לאחור – קיבלנו html string בלבד
      visualChunk = payload;
    } else if (payload && typeof payload === "object") {
      visualChunk = payload.html || "";
      shortcodeFromDialog = payload.shortcode || "";
    }

    if (!visualChunk) return;

    // ✅ עטיפה בעוגנים אם חסרים
    const hasCaret = /data-caret/.test(visualChunk);
    const CARET = '<span data-caret>\u200B</span>';
    const safeVisual = hasCaret ? visualChunk : `${CARET}${visualChunk}${CARET}`;

    // הזרקה ל־iframe (תצוגה ויזואלית)
    doc.execCommand("insertHTML", false, safeVisual);

    ensureVideoSourceIntegrity(doc); // ← בטיחות
    // עדכון ה־source (מקור) בפורמט shortcode אם קיים, אחרת המרה מה־DOM
    const visualHtml = doc.body.innerHTML;
    const newShortcode = shortcodeFromDialog || htmlToShortcode(visualHtml);

    fromIframeRef.current = true;
    setHtmlContent(newShortcode);
    addContentToHistory(newShortcode);
    onSave && onSave(newShortcode);

    setIsVideoDialogOpen(false);
  };

  const focusEditor = () => {
    try {
      editorRef.current?.contentWindow?.focus();
    } catch { }
  };

  return (
    <div
      className="w-full h-full flex flex-col border-[1px] border-slate-50 dark:border-0 overflow-hidden bg-white dark:bg-slate-800 shadow-sm"
      style={fullScreenStyles}
    >
      <Toolbar
        activeTextValues={activeTextValues}
        activeAlignValue={activeAlignValue}
        activeListValues={activeListValues}
        historyIndex={historyIndex}
        history={history}
        currentFontSize={currentFontSize}
        showFontSelector={showFontSelector}
        fontOptions={fontOptions}
        isPreview={isPreview}
        isFullScreen={isFullScreen}
        execCommand={execCommand}
        customUndo={customUndo}
        customRedo={customRedo}
        togglePreview={togglePreview}
        toggleFullScreen={toggleFullScreen}
        printContent={printContent}
        increaseFontSize={increaseFontSize}
        decreaseFontSize={decreaseFontSize}
        changeFont={changeFont}
        setShowFontSelector={setShowFontSelector}
        insertLink={insertLink}
        insertImage={insertImage}
        insertTable={insertTable}
        handleImageUpload={handleImageUpload}
        editorRef={editorRef}
        insertVideo={insertVideo}
        focusEditor={focusEditor}
      />

      <EditingArea
        editorRef={editorRef}
        isPreview={isPreview}
        htmlContent={htmlContent}
        handleCodeChange={handleCodeChange}
        height={editorHeight}
        focusEditor={focusEditor}
      />

      {/* בחירה/מחיקה/ריסייז אוניברסליים לתמונות/וידאו/iframe */}
      {!isPreview && (
        <UniversalMediaSelector
          editorRef={editorRef}
          onContentChange={handleContentUpdate}
        />
      )}

      {!isPreview && (
        <TableDialog
          row={row}
          isOpen={isTableDialogOpen}
          onClose={() => setIsTableDialogOpen(false)}
          onInsert={handleInsertTable}
        />
      )}

      {!isPreview && (
        <TableSelector
          editorRef={editorRef}
          execCommand={execCommand}
          onContentChange={handleContentUpdate}
        />
      )}

      <VideoDialog
        isOpen={isVideoDialogOpen}
        onClose={() => setIsVideoDialogOpen(false)}
        onInsert={handleInsertVideo}
        focusEditor={focusEditor}   // ← חדש
      />
    </div>
  );
};

export default HtmlEditor;
