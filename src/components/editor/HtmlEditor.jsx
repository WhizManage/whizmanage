// src/components/editor/HtmlEditor.jsx
import MediaPicker from "@/components/media/MediaPicker";
import { confirm } from "@/components/ui/custom/CustomConfirm";
import { useTheme } from "@/layout/ThemeProvider";
import { useEffect, useRef, useState } from "react";
 import { __ } from "@wordpress/i18n";
import EditingArea from "./components/EditingArea";
import TableDialog from "./components/TableDialog";
import TableSelector from "./components/TableSelector";
import Toolbar from "./components/Toolbar";
import UniversalMediaSelector from "./components/UniversalMediaSelector";
import VideoDialog from "./components/VideoDialog";
import {
  generateEditorStyles,
  getTextDirection,
} from "./components/utils/themeHelpers";

/** -------------------------
 * Shortcode helpers
 * ------------------------- */

const stripEditorArtifacts = (html) =>
  (html || "")
    .replace(/<div id="image-toolbar-portal"[\s\S]*?<\/div>/g, "")
    .replace(/<div id="table-toolbar-portal"[\s\S]*?<\/div>/g, "")
    .replace(
      /<div class="umedia-wrap"[^>]*>\s*([\s\S]*?<table[\s\S]*?<\/table>)[\s\S]*?<\/div>/gi,
      (_m, innerTable) => innerTable
    )
    .replace(/<div class="umedia-outline"[\s\S]*?<\/div>/gi, "")
    .replace(/<div class="umedia-overlay[\s\S]*?<\/div>/gi, "")
    .replace(/<div class="umedia-badge[\s\S]*?<\/div>/gi, "")
    .replace(/\sclass="([^"]*)"/gi, (_m, cls) => {
      const cleaned = cls
        .split(/\s+/)
        .filter((c) => c && !/^umedia-/.test(c) && c !== "umedia-selected")
        .join(" ");
      return cleaned ? ` class="${cleaned}"` : "";
    })
    .replace(/\sdata-_um-[^=\s]+="[^"]*"/gi, "")
    .replace(/\sstyle="([^"]*)"/gi, (_m, style) => {
      const s = style
        .split(";")
        .map((x) => x.trim())
        .filter((x) => x && !/^will-change\s*:/i.test(x))
        .join("; ");
      return s ? ` style="${s}"` : "";
    })
    .replace(/<span[^>]*data-caret[^>]*>\u200B?<\/span>/gi, "");

const shortcodeToHtml = (content) => {
  if (!content) return "";
  let html = content;

  html = html.replace(/\[video\s+([^\]]+)\]\s*\[\/video\]/gi, (_m, attrs) => {
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

    const CARET = "<span data-caret>\u200B</span>";
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
  });

  return html;
};

const htmlToShortcode = (content) => {
  if (!content) return "";
  let html = stripEditorArtifacts(content);

  html = html.replace(/<span[^>]*data-caret[^>]*>\u200B?<\/span>/gi, "");

  html = html.replace(
    /<div[^>]*data-wysiwyg="video"[^>]*>([\s\S]*?)<\/div>/gi,
    (_m, inner) => inner
  );

  html = html.replace(
    /<video([^>]*)>([\s\S]*?)<\/video>/gi,
    (m, attrs, inner) => {
      const pick = (name) => {
        const r = new RegExp(`${name}="([^"]+)"`, "i").exec(attrs);
        return r ? r[1] : "";
      };

      let src =
        pick("data-mp4") ||
        /<source[^>]*type=["']video\/mp4["'][^>]*src=["']([^"']+)["'][^>]*>/i.exec(
          inner
        )?.[1] ||
        "" ||
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
    }
  );

  return html;
};

/** -------------------------
 * DOM helpers for first insert
 * ------------------------- */
function ensureEditableScaffold(doc) {
  // אם ה-body ריק לחלוטין – ניצור פסקה ריקה כדי שהטווח יוכל להתמקם
  const empty = !doc.body || !doc.body.innerHTML || !doc.body.innerHTML.trim();
  if (empty) {
    doc.body.innerHTML = '<p><br data-empty="1"></p>';
  }
}

function placeCaretAtEnd(doc) {
  try {
    const range = doc.createRange();
    const sel = doc.getSelection?.() || doc.defaultView?.getSelection?.();
    let node = doc.body;
    // מצא את ה־lastChild הלא-ריק
    while (
      node.lastChild &&
      node.lastChild.nodeType === 1 &&
      node.lastChild.childNodes.length
    ) {
      node = node.lastChild;
    }
    const target =
      node.nodeType === 3
        ? node
        : node.childNodes[node.childNodes.length - 1] || node;
    const len =
      target.nodeType === 3
        ? target.textContent.length
        : target.childNodes?.length || 0;
    if (target.nodeType === 3) {
      range.setStart(target, len);
    } else {
      range.selectNodeContents(target);
      range.collapse(false);
    }
    sel.removeAllRanges();
    sel.addRange(range);
  } catch {}
}

function hasValidSelection(doc) {
  const sel = doc.getSelection?.() || doc.defaultView?.getSelection?.();
  return !!(sel && sel.rangeCount && !sel.getRangeAt(0).collapsed);
}

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
        const s = doc.createElement( "source");
        s.setAttribute("src", dataMp4);
        s.setAttribute("type", "video/mp4");
        v.insertBefore(s, v.firstChild);
      }
    });
  } catch {}
}


   
const HtmlEditor = ({ initialContent = "", onSave, height = 400, row, compact = false, onOpenFullEditor }) => {

  const { theme } = useTheme();

  const [htmlContent, setHtmlContent] = useState(() =>
    stripEditorArtifacts(initialContent)
  );
  const [isPreview, setIsPreview] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const editorRef = useRef(null);
  const updateTimeoutRef = useRef(null);
  const [showFontSelector, setShowFontSelector] = useState(false);
  const [currentFontSize, setCurrentFontSize] = useState(3);
  const ignoreSavingToHistory = useRef(false);
  const [isTableDialogOpen, setIsTableDialogOpen] = useState(false);

  // MediaPicker for images
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  // VideoDialog for videos (with URL embed + library support)
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);

  const [history, setHistory] = useState([
    stripEditorArtifacts(initialContent),
  ]);
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
      const isAlign = [
        "justifyLeft",
        "justifyCenter",
        "justifyRight",
        "justifyFull",
      ].includes(command);
      if (isAlign) {
        let target = null;
        const tableEl = doc.querySelector(
          "table.selected, table.umedia-selected"
        );
        if (tableEl) {
          target = tableEl;
        } else {
          const mediaEl = doc.querySelector(
            "img.umedia-selected, video.umedia-selected, iframe.umedia-selected"
          );
          if (mediaEl) target = mediaEl;
        }

        if (!target) {
          try {
            const sel =
              doc.getSelection?.() || doc.defaultView?.getSelection?.();
            if (sel && sel.rangeCount > 0) {
              let node = sel.getRangeAt(0).startContainer;
              if (node && node.nodeType === Node.TEXT_NODE)
                node = node.parentElement;
              if (node && node.closest) {
                const el = node.closest("table, img, video, iframe");
                if (el) target = el;
              }
            }
          } catch {}
        }

        if (target) {
          if (target._um_wrap) {
            const wrapper = target._um_wrap;
            wrapper.parentNode?.insertBefore(target, wrapper);
            wrapper.remove();
            if (target._um_outline && target._um_outline.remove)
              target._um_outline.remove();
            if (target._um_badge && target._um_badge.remove)
              target._um_badge.remove();
            target._um_wrap = null;
            target._um_outline = null;
            target._um_badge = null;
            try {
              doc.dispatchEvent?.(new Event("umedia:reset"));
            } catch {}
          }

          const el = target;
          el.style.margin = "";
          el.style.float = "";
          el.style.cssFloat = "";

          if (command === "justifyLeft") {
            el.style.cssFloat = "left";
            el.style.margin = "0 1em 0 0";
            if (el.tagName === "TABLE") el.style.display = "inline-table";
          } else if (command === "justifyRight") {
            el.style.cssFloat = "right";
            el.style.margin = "0 0 0 1em";
            if (el.tagName === "TABLE") el.style.display = "inline-table";
          } else {
            el.style.float = "none";
            el.style.cssFloat = "none";
            el.style.display = "block";
            el.style.marginLeft = "auto";
            el.style.marginRight = "auto";
          }

          checkFormatting();

          clearTimeout(updateTimeoutRef.current);
          updateTimeoutRef.current = setTimeout(() => {
            if (!editorRef.current) return;
            ensureVideoSourceIntegrity(doc);
            const visualHtml = doc.body.innerHTML;
            const shortcodeHtml = htmlToShortcode(visualHtml);
            if (shortcodeHtml !== htmlContent) {
              fromIframeRef.current = true;
              setHtmlContent(shortcodeHtml);
              addContentToHistory(shortcodeHtml);
              onSave && onSave(shortcodeHtml);
            }

            if (target.tagName === "TABLE") {
              try {
                const resetEvent = new CustomEvent("table-position-changed", {
                  bubbles: true,
                  detail: { table: target, reason: "alignment" },
                });
                target.dispatchEvent(resetEvent);
                setTimeout(() => {
                  target.dispatchEvent(
                    new MouseEvent("click", { bubbles: true })
                  );
                }, 100);
              } catch (error) {
                console.error("Error triggering table position update:", error);
              }
            }
          }, 150);

          return;
        }
      }

      if (command === "insertHorizontalRule") {
        doc.execCommand(command, false, value);
        // Ensure there's a paragraph after the HR so the user can type
        const hr =
          doc.getSelection()?.anchorNode?.lastChild ||
          doc.querySelector("hr:last-of-type");
        if (
          hr &&
          (!hr.nextSibling ||
            (hr.nextSibling.nodeType === 1 && hr.nextSibling.tagName === "BR"))
        ) {
          const p = doc.createElement( "p");
          p.innerHTML = "<br>";
          if (hr.nextSibling) {
            hr.parentNode.insertBefore(p, hr.nextSibling);
          } else {
            hr.parentNode.appendChild(p);
          }

          // Move cursor to the new paragraph
          const range = doc.createRange();
          range.setStart(p, 0);
          range.collapse(true);
          const sel = doc.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
      } else {
        doc.execCommand(command, false, value);
      }

      checkFormatting();
      editorRef.current.contentWindow.focus();

      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = setTimeout(() => {
        if (!editorRef.current) return;
        ensureVideoSourceIntegrity(doc);
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
    } catch {}
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

    if (!doc.body.innerHTML) {
      doc.body.innerHTML = shortcodeToHtml(
        stripEditorArtifacts(initialContent)
      );
      ensureVideoSourceIntegrity(doc);
    }

    // אם המסמך עדיין ריק אחרי ההמרה – נבנה שלד
    if (!doc.body.innerHTML || !doc.body.innerHTML.trim()) {
      ensureEditableScaffold(doc);
    }

    const textDirection = getTextDirection();
    const style = doc.createElement( "style");
    style.id = "editor-styles";
    style.textContent = generateEditorStyles(theme, textDirection, compact);
    doc.head.appendChild(style);

    const formatHandler = () => setTimeout(checkFormatting, 0);

    const inputHandler = () => {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = setTimeout(() => {
        if (editorRef.current) {
          const d = editorRef.current.contentDocument;
          ensureVideoSourceIntegrity(d);
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

    const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || "");
    const keydownHandler = (e) => {
      if (isPreview) return;
      if (!doc.hasFocus?.()) return;
      const cmd = isMac ? e.metaKey : e.ctrlKey;
      if (!cmd) return;

      const code = e.code;
      const isZ = code === "KeyZ";
      const isY = code === "KeyY";
      const isX = code === "KeyX";
      const isC = code === "KeyC";
      const isV = code === "KeyV";
      const isUndoKey = e.key === "Undo";
      const isRedoKey = e.key === "Redo";

      // Allow native cut/copy/paste to work
      if (isX || isC || isV) {
        return; // Let browser handle these natively
      }

      if (isUndoKey || (cmd && isZ && !e.shiftKey)) {
        e.preventDefault();
        customUndo();
        return;
      }
      if (
        isRedoKey ||
        (isMac && cmd && isZ && e.shiftKey) ||
        (!isMac && cmd && (isY || (isZ && e.shiftKey)))
      ) {
        e.preventDefault();
        customRedo();
      }
    };

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

    // תן פוקוס קצר אחרי mount כדי לאפשר הזרקה מיידית
    setTimeout(() => {
      try {
        editorRef.current?.contentWindow?.focus();
      } catch {}
    }, 0);

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

  useEffect(() => {
    if (!editorRef.current || isPreview) return;
    if (fromIframeRef.current) {
      fromIframeRef.current = false;
      return;
    }
    const doc = editorRef.current.contentDocument;
    const visual = shortcodeToHtml(htmlContent);
    // Compare stripped versions to avoid resetting due to temporary artifacts (like selection wrappers)
    if (
      doc &&
      stripEditorArtifacts(doc.body.innerHTML) !== stripEditorArtifacts(visual)
    ) {
      doc.body.innerHTML = visual;
      ensureVideoSourceIntegrity(doc);
      if (!doc.body.innerHTML.trim()) ensureEditableScaffold(doc);
    }
  }, [htmlContent, isPreview]);

  useEffect(() => {
    if (!editorRef.current) return;
    const doc = editorRef.current.contentDocument;
    const styleElement = doc.head.querySelector("#editor-styles");
    if (styleElement) {
      const textDirection = getTextDirection();
      styleElement.textContent = generateEditorStyles(theme, textDirection, compact);
    }
  }, [theme, compact]);

  const togglePreview = () => setIsPreview((p) => !p);
  const toggleFullScreen = () => setIsFullScreen((v) => !v);

  const printContent = () => {
    if (!editorRef.current) return;
    const doc = editorRef.current.contentDocument;
    const win = editorRef.current.contentWindow;
    const style = doc.createElement( "style");
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

  /** ---------- Media Picker open helpers ---------- */
  const openImagePicker = () => {
    setMediaPickerOpen(true);
  };
  const openVideoPicker = () => {
    setVideoDialogOpen(true);
  };

  /** ---------- Injectors (with Range fallback) ---------- */
  const injectImage = (src, alt = "") => {
    if (!editorRef.current || !src) return;
    const doc = editorRef.current.contentDocument;
    const CARET = "<span data-caret>\u200B</span>";
    const html = `${CARET}<img src="${src}" alt="${alt}" style="max-width:100%;height:auto;display:inline-block;vertical-align:top;">${CARET}`;
    const ok = doc.execCommand("insertHTML", false, html);
    if (!ok) {
      const range = doc.getSelection?.()?.getRangeAt?.(0);
      const tmp = doc.createElement( "div");
      tmp.innerHTML = html;
      const frag = doc.createDocumentFragment();
      while (tmp.firstChild) frag.appendChild(tmp.firstChild);
      if (range) {
        range.deleteContents();
        range.insertNode(frag);
        range.collapse(false);
      } else {
        doc.body.appendChild(frag);
      }
    }
  };

  const injectVideo = (mp4, poster = "") => {
    if (!editorRef.current || !mp4) return;
    const doc = editorRef.current.contentDocument;
    const CARET = "<span data-caret>\u200B</span>";
    const posterAttr = poster ? ` poster="${poster}"` : "";
    const html =
      `${CARET}<div data-wysiwyg="video" contenteditable="false" style="margin:10px 0;">` +
      `<video controls data-mp4="${mp4}"${posterAttr} style="max-width:100%;">` +
      `<source src="${mp4}" type="video/mp4">Your browser does not support the video tag.` +
      `</video></div>${CARET}`;
    const ok = doc.execCommand("insertHTML", false, html);
    if (!ok) {
      const range = doc.getSelection?.()?.getRangeAt?.(0);
      const tmp = doc.createElement( "div");
      tmp.innerHTML = html;
      const frag = doc.createDocumentFragment();
      while (tmp.firstChild) frag.appendChild(tmp.firstChild);
      if (range) {
        range.deleteContents();
        range.insertNode(frag);
        range.collapse(false);
      } else {
        doc.body.appendChild(frag);
      }
    }
  };

  /** MediaPicker selection handler (images only) */
  const handleMediaPicked = (media) => {
    if (!media) {
      setMediaPickerOpen(false);
      return;
    }

    setMediaPickerOpen(false);

    requestAnimationFrame(() =>
      setTimeout(() => {
        const doc = editorRef.current?.contentDocument;
        if (!doc) return;

        try {
          if (doc.designMode !== "on") doc.designMode = "on";
        } catch {}
        ensureEditableScaffold(doc);

        const sel = doc.getSelection?.() || doc.defaultView?.getSelection?.();
        if (!sel || !sel.rangeCount || sel.getRangeAt(0).collapsed) {
          placeCaretAtEnd(doc);
        }

        try {
          editorRef.current?.contentWindow?.focus();
        } catch {}

        const items = Array.isArray(media) ? media : [media];
        items.forEach((item) => {
          if (!item?.src) return;
          injectImage(item.src, item.alt || item.name || "");
        });

        ensureVideoSourceIntegrity(doc);

        const visualHtml = doc.body.innerHTML;
        const newShortcode = htmlToShortcode(visualHtml);

        fromIframeRef.current = true;
        setHtmlContent(newShortcode);
        addContentToHistory(newShortcode);
        onSave && onSave(newShortcode);
      }, 0)
    );
  };

  /** VideoDialog insert handler */
  const handleVideoInsert = ({ html, shortcode }) => {
    setVideoDialogOpen(false);

    if (!html) return;

    requestAnimationFrame(() =>
      setTimeout(() => {
        const doc = editorRef.current?.contentDocument;
        if (!doc) return;

        try {
          if (doc.designMode !== "on") doc.designMode = "on";
        } catch {}
        ensureEditableScaffold(doc);

        const sel = doc.getSelection?.() || doc.defaultView?.getSelection?.();
        if (!sel || !sel.rangeCount || sel.getRangeAt(0).collapsed) {
          placeCaretAtEnd(doc);
        }

        try {
          editorRef.current?.contentWindow?.focus();
        } catch {}

        // Insert the HTML from VideoDialog
        const CARET = "<span data-caret>\u200B</span>";
        const safeHtml = `${CARET}${html}${CARET}`;
        const ok = doc.execCommand("insertHTML", false, safeHtml);
        if (!ok) {
          const range = doc.getSelection?.()?.getRangeAt?.(0);
          const tmp = doc.createElement( "div");
          tmp.innerHTML = safeHtml;
          const frag = doc.createDocumentFragment();
          while (tmp.firstChild) frag.appendChild(tmp.firstChild);
          if (range) {
            range.deleteContents();
            range.insertNode(frag);
            range.collapse(false);
          } else {
            doc.body.appendChild(frag);
          }
        }

        ensureVideoSourceIntegrity(doc);

        const visualHtml = doc.body.innerHTML;
        const newShortcode = htmlToShortcode(visualHtml);

        fromIframeRef.current = true;
        setHtmlContent(newShortcode);
        addContentToHistory(newShortcode);
        onSave && onSave(newShortcode);
      }, 0)
    );
  };

  const insertTable = () => setIsTableDialogOpen(true);

  const handleInsertTable = (tableHtml) => {
    if (!editorRef.current) return;
    const doc = editorRef.current.contentDocument;
    if (!doc) return;
    ensureEditableScaffold(doc);
    const CARET = "<span data-caret>\u200B</span>";
    const safeHtml = `${CARET}${tableHtml}${CARET}`;
    const ok = doc.execCommand("insertHTML", false, safeHtml);
    if (!ok) {
      const range = doc.getSelection?.()?.getRangeAt?.(0);
      const tmp = doc.createElement( "div");
      tmp.innerHTML = safeHtml;
      const frag = doc.createDocumentFragment();
      while (tmp.firstChild) frag.appendChild(tmp.firstChild);
      if (range) {
        range.deleteContents();
        range.insertNode(frag);
        range.collapse(false);
      } else {
        doc.body.appendChild(frag);
      }
    }

    ensureVideoSourceIntegrity(doc);
    const visualHtml = doc.body.innerHTML;
    const newShortcode = htmlToShortcode(visualHtml);
    fromIframeRef.current = true;
    setHtmlContent(newShortcode);
    addContentToHistory(newShortcode);
    onSave && onSave(newShortcode);
  };

  const handleCodeChange = (e) => {
    const newContent = stripEditorArtifacts(e.target.value ?? e);
    setHtmlContent(newContent);
    onSave && onSave(newContent);
    clearTimeout(window.codeChangeTimeout);
    window.codeChangeTimeout = setTimeout(
      () => addContentToHistory(newContent),
      500
    );
  };

  const handleImageUpload = (url) => {
    if (!editorRef.current) return;
    const doc = editorRef.current.contentDocument;
    if (!doc || !url) return;
    ensureEditableScaffold(doc);
    const CARET = "<span data-caret>\u200B</span>";
    const html = `${CARET}<img src="${url}" alt="" style="max-width:100%;height:auto;display:inline-block;vertical-align:top;">${CARET}`;
    const ok = doc.execCommand("insertHTML", false, html);
    if (!ok) {
      const range = doc.getSelection?.()?.getRangeAt?.(0);
      const tmp = doc.createElement( "div");
      tmp.innerHTML = html;
      const frag = doc.createDocumentFragment();
      while (tmp.firstChild) frag.appendChild(tmp.firstChild);
      if (range) {
        range.deleteContents();
        range.insertNode(frag);
        range.collapse(false);
      } else {
        doc.body.appendChild(frag);
      }
    }

    ensureVideoSourceIntegrity(doc);
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
    ? {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        width: "100vw",
        height: "100vh",
      }
    : {};

  const editorHeight = isFullScreen
    ? "calc(100vh - 50px)"
    : typeof height === "number"
      ? `${height}px`
      : height || "400px";

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

  const focusEditor = () => {
    try {
      editorRef.current?.contentWindow?.focus();
    } catch {}
  };

  return (
    <div
      className="w-full h-full flex flex-col border-[1px] border-slate-50 dark:border-0 overflow-hidden scrollbar-whiz bg-white dark:bg-slate-800 shadow-sm"
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
        insertImage={openImagePicker}
        insertVideo={openVideoPicker}
        insertTable={insertTable}
        handleImageUpload={handleImageUpload}
        editorRef={editorRef}
        focusEditor={focusEditor}
        compact={compact}
        onOpenFullEditor={onOpenFullEditor}
      />

      <EditingArea
        editorRef={editorRef}
        isPreview={isPreview}
        htmlContent={htmlContent}
        handleCodeChange={handleCodeChange}
        height={editorHeight}
        focusEditor={focusEditor}
        compact={compact}
      />

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
          currency={window?.currency || ""}
        />
      )}

      {!isPreview && (
        <TableSelector
          editorRef={editorRef}
          execCommand={execCommand}
          onContentChange={handleContentUpdate}
        />
      )}

      {mediaPickerOpen && (
        <MediaPicker
          onChange={handleMediaPicked}
          onClose={() => setMediaPickerOpen(false)}
          mediaType="image"
          multiple={false}
          autoOpen
          isForm={false}
        />
      )}

      {videoDialogOpen && (
        <VideoDialog
          isOpen={videoDialogOpen}
          onClose={() => setVideoDialogOpen(false)}
          onInsert={handleVideoInsert}
        />
      )}
    </div>
  );
};

export default HtmlEditor;
