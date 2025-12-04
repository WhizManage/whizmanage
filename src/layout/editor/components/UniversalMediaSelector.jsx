// ================================
// File: components/UniversalMediaSelector.jsx
// ================================
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@components/ui/button";
import { Trash2, Maximize } from "lucide-react";
import { useTheme } from "../../ThemeProvider";

const MIN_SIZE = 24;
const HIT = 8;              // עובי אזור גרירה בקצוות (למדיה שאינה טבלה)
const BADGE_OFFSET = 8;

export default function UniversalMediaSelector({ editorRef, onContentChange }) {
  const { theme } = useTheme();
  const [selectedEl, setSelectedEl] = useState(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPos, setToolbarPos] = useState({ top: 0, left: 0 });
  const toolbarRef = useRef(null);

  // מאזין כללי לאיפוס יזום של האוברליי (מקומפוננטים אחרים)
  useEffect(() => {
    const iframe = editorRef?.current;
    const doc = iframe?.contentDocument;
    if (!doc) return;

    const onUmediaReset = () => {
      try {
        if (selectedEl) teardown(selectedEl);
      } catch {}
      clearAllSelections(doc);
      setSelectedEl(null);
      setShowToolbar(false);
    };

    doc.addEventListener("umedia:reset", onUmediaReset);
    return () => doc.removeEventListener("umedia:reset", onUmediaReset);
  }, [editorRef, selectedEl]);

  // בחירה – כולל TABLE (בלי לעצור בועות כשזה TABLE)
  useEffect(() => {
    const iframe = editorRef?.current;
    const doc = iframe?.contentDocument;
    if (!doc) return;

    addBaseStylesOnce(doc);

    const onClick = (e) => {
      const el = e.target;
      if (el.closest?.(".umedia-toolbar")) return;

      const table = el.closest?.("table");
      const tag = el?.tagName;
      const isMedia = tag === "IMG" || tag === "VIDEO" || tag === "IFRAME";

      if (table) {
        // לא עוצרים בועות -> TableSelector עדיין יקבל את הקליק ויפתח טולבר שלו
        clearAllSelections(doc);
        table.classList.add("umedia-selected");
        setSelectedEl(table);
        setShowToolbar(false); // אין טולבר יוניברסל לטבלה
        return;
      }

      if (isMedia) {
        e.preventDefault();
        e.stopPropagation();
        clearAllSelections(doc);
        el.classList.add("umedia-selected");
        setSelectedEl(el);
        setShowToolbar(true);
        positionToolbarOver(el, iframe, setToolbarPos, toolbarRef);
        // preserve selection and focus on media to avoid losing context on subsequent commands
        try {
          const sel = doc.getSelection?.();
          if (sel) {
            const range = doc.createRange();
            range.selectNode(el);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
          }
          iframe.contentWindow?.focus();
        } catch {}
      } else {
        clearAllSelections(doc);
        setSelectedEl(null);
        setShowToolbar(false);
      }
    };

    const onScroll = () => {
      if (selectedEl && selectedEl.tagName !== "TABLE") {
        positionToolbarOver(selectedEl, iframe, setToolbarPos, toolbarRef);
      }
    };
    // listen to nearest outer scroll container as well
    let outerScrollEl = null;
    try {
      const candidate = iframe?.parentElement;
      const isScrollable = (el) => {
        if (!el) return false;
        const cs = window.getComputedStyle(el);
        return /(auto|scroll|overlay)/.test(cs.overflow + cs.overflowY + cs.overflowX);
      };
      let el = candidate;
      while (el && el !== document.body && el !== document.documentElement) {
        if (isScrollable(el)) { outerScrollEl = el; break; }
        el = el.parentElement;
      }
    } catch {}

    doc.addEventListener("click", onClick);
    doc.addEventListener("scroll", onScroll, { passive: true });
    iframe.contentWindow?.addEventListener("resize", onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    if (outerScrollEl) outerScrollEl.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      doc.removeEventListener("click", onClick);
      doc.removeEventListener("scroll", onScroll);
      iframe.contentWindow?.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll);
      if (outerScrollEl) outerScrollEl.removeEventListener("scroll", onScroll);
    };
  }, [editorRef, selectedEl]);

  // עטיפה/אוברליי/ריסייז – לכל מדיה, כולל TABLE (לטבלאות לא נציג טולבר)
  useEffect(() => {
    if (!selectedEl || !editorRef?.current) return;

    const iframe = editorRef.current;
    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    const isTable = selectedEl.tagName === "TABLE";

    try {
      addResizerStylesOnce(doc);

      // אם כבר יש עטיפה מהפעלה קודמת – לפרק כדי למנוע כפילויות
      if (selectedEl._um_wrap) {
        try { teardown(selectedEl); } catch {}
      }

      // עטיפה שלא שוברת זרימה
      const wrap = doc.createElement("div");
      wrap.className = "umedia-wrap";

      const cs = doc.defaultView.getComputedStyle(selectedEl);
      if (isTable) {
        wrap.style.display = "block";
      } else {
        wrap.style.display = cs.display === "block" ? "block" : "inline-block";
      }
      wrap.style.lineHeight = "0";
      wrap.style.verticalAlign = "top";

      // float -> לעטיפה
      const elFloat = selectedEl.style.float || cs.float;
      if (elFloat === "left" || elFloat === "right") {
        wrap.style.cssFloat = elFloat;
        wrap.style.float = elFloat;
        wrap.style.marginLeft = cs.marginLeft;
        wrap.style.marginRight = cs.marginRight;
        wrap.style.marginTop = cs.marginTop;
        wrap.style.marginBottom = cs.marginBottom;
        selectedEl.style.float = "none";
        selectedEl.style.margin = "0";
      }

      // הכנסה לעטיפה
      const parent = selectedEl.parentNode;
      parent.insertBefore(wrap, selectedEl);
      wrap.appendChild(selectedEl);

      // שכבת אוברליי + באדג' + ידיות
      const outline = doc.createElement("div");
      outline.className = "umedia-outline";
      wrap.appendChild(outline);

      const badge = doc.createElement("div");
      badge.className = "umedia-badge";
      wrap.appendChild(badge);

      // ידיות (מוצגות לכל מדיה; לטבלאות הן העיקריות)
      const handles = ["n", "s", "e", "w", "nw", "ne", "se", "sw"].map(pos => {
        const h = doc.createElement("div");
        h.className = `umedia-h umedia-h-${pos}`;
        outline.appendChild(h);
        return { pos, el: h };
      });

      // רפרנסים
      selectedEl._um_wrap = wrap;
      selectedEl._um_outline = outline;
      selectedEl._um_badge = badge;

      // לטבלה: שלא נחסום קליקים של TableSelector – רק הידיות לוכדות
      outline.style.pointerEvents = isTable ? "none" : "auto";
      handles.forEach(h => { h.el.style.pointerEvents = "auto"; });

      syncOverlay(selectedEl, outline, badge);

      const onLoad = () => syncOverlay(selectedEl, outline, badge);
      selectedEl.addEventListener("load", onLoad);

      const ro = new win.ResizeObserver(() => syncOverlay(selectedEl, outline, badge));
      ro.observe(selectedEl);

      const onScroll = () => syncOverlay(selectedEl, outline, badge);
      doc.addEventListener("scroll", onScroll, { passive: true });
      win.addEventListener("resize", onScroll);

      // ===== מצב גרירה + דגל כדי לא לזהות כשינוי חיצוני =====
      const state = {
        startX: 0, startY: 0,
        startW: 0, startH: 0,
        ratio: getAspect(selectedEl),
        pos: null, keepRatio: false, fromCenter: false,
        raf: null, nextSize: null,
        isResizing: false,
      };

      // ===== זיהוי שינוי חיצוני (מידות/מבנה) ופירוק =====
      let prevRect = selectedEl.getBoundingClientRect();
      const mo = new win.MutationObserver((mutations) => {
        if (state.isResizing) return;
        let relevant = false;
        for (const m of mutations) {
          if (m.type === "attributes") {
            if (m.attributeName === "style" || m.attributeName === "width" || m.attributeName === "height") { relevant = true; break; }
          } else if (m.type === "childList") { relevant = true; break; }
        }
        if (!relevant) return;

        const nr = selectedEl.getBoundingClientRect();
        const sizeChanged = Math.abs(nr.width - prevRect.width) > 1 || Math.abs(nr.height - prevRect.height) > 1;
        if (sizeChanged || !selectedEl.isConnected) {
          try { teardown(selectedEl); } catch { }
          clearAllSelections(doc);
          setSelectedEl(null);
          setShowToolbar(false);
        }
        prevRect = nr;
      });
      mo.observe(selectedEl, { attributes: true, attributeFilter: ["style", "width", "height"], attributeOldValue: true, childList: true });

      // ייצוב טבלה בזמן גרירה
      const beginTableResize = () => {
        if (!isTable) return;
        const csT = doc.defaultView.getComputedStyle(selectedEl);
        selectedEl.dataset._umPrevTableLayout = selectedEl.style.tableLayout || "";
        selectedEl.dataset._umPrevBoxSizing = selectedEl.style.boxSizing || "";
        selectedEl.dataset._umPrevW = selectedEl.style.width || "";
        selectedEl.dataset._umPrevH = selectedEl.style.height || "";
        selectedEl.style.tableLayout = "fixed";
        selectedEl.style.boxSizing = "border-box";

        const r = selectedEl.getBoundingClientRect();
        if (!selectedEl.style.width || selectedEl.style.width.includes("%")) {
          selectedEl.style.width = `${Math.max(MIN_SIZE, Math.round(r.width))}px`;
        }
        if (!selectedEl.style.height || selectedEl.style.height === "auto") {
          selectedEl.style.height = `${Math.max(MIN_SIZE, Math.round(r.height))}px`;
        }

        if ((csT.marginLeft === "auto") && (csT.marginRight === "auto")) {
          selectedEl.dataset._umWasCentered = "1";
          selectedEl.style.marginLeft = "0";
          selectedEl.style.marginRight = "0";
        } else {
          delete selectedEl.dataset._umWasCentered;
        }
      };
      const endTableResize = () => {
        if (!isTable) return;
        selectedEl.style.tableLayout = selectedEl.dataset._umPrevTableLayout || "";
        selectedEl.style.boxSizing = selectedEl.dataset._umPrevBoxSizing || "";
        if (selectedEl.dataset._umWasCentered === "1") {
          selectedEl.style.marginLeft = "auto";
          selectedEl.style.marginRight = "auto";
        }
        delete selectedEl.dataset._umPrevTableLayout;
        delete selectedEl.dataset._umPrevBoxSizing;
        delete selectedEl.dataset._umWasCentered;
      };

      // החלת גודל
      const applySize = (w, h) => {
        const newW = Math.max(MIN_SIZE, Math.round(w));
        const newH = Math.max(MIN_SIZE, Math.round(h));
        selectedEl.style.willChange = "width, height";
        selectedEl.style.width = `${newW}px`;
        selectedEl.style.height = `${newH}px`;
        try {
          selectedEl.setAttribute("width", String(newW));
          selectedEl.setAttribute("height", String(newH));
        } catch { }
        syncOverlay(selectedEl, outline, badge);
      };

      const moveCore = (clientX, clientY) => {
        const dx = clientX - state.startX;
        const dy = clientY - state.startY;
        const pos = state.pos;
        const sx = pos.includes("w") ? -1 : pos.includes("e") ? 1 : 0;
        const sy = pos.includes("n") ? -1 : pos.includes("s") ? 1 : 0;

        let w = state.startW;
        let h = state.startH;

        if (sx !== 0) w = state.startW + sx * dx * (state.fromCenter ? 2 : 1);
        if (sy !== 0) h = state.startH + sy * dy * (state.fromCenter ? 2 : 1);

        const isCorner = ["nw", "ne", "se", "sw"].includes(pos);
        if (state.keepRatio) {
          if (isCorner) {
            if (Math.abs(dx) > Math.abs(dy)) h = w / state.ratio; else w = h * state.ratio;
          } else if (pos === "e" || pos === "w") {
            h = w / state.ratio;
          } else {
            w = h * state.ratio;
          }
        }

        state.nextSize = { w, h };
        if (!state.raf) {
          state.raf = win.requestAnimationFrame(() => {
            if (!state.nextSize) return;
            applySize(state.nextSize.w, state.nextSize.h);
            state.raf = null;
          });
        }
      };

      const startFromPos = (pos) => (e) => {
        e.preventDefault();
        e.stopPropagation();

        state.isResizing = true;
        try { doc.dispatchEvent(new CustomEvent("umedia:resize:start", { bubbles: true, composed: true, detail: { el: selectedEl } })); } catch {}

        if (isTable) beginTableResize();

        const p = getPoint(e);
        state.pos = pos;
        state.keepRatio = !!e.shiftKey;
        state.fromCenter = !!(e.altKey || e.metaKey);
        state.ratio = getAspect(selectedEl);
        const r = selectedEl.getBoundingClientRect();
        state.startX = p.x;
        state.startY = p.y;
        state.startW = r.width;
        state.startH = r.height;

        doc.body.style.userSelect = "none";
        doc.body.style.cursor = cursorFor(pos);

        const move = (ev) => { ev.preventDefault(); const pt = getPoint(ev); moveCore(pt.x, pt.y); };
        const end = () => {
          doc.removeEventListener("pointermove", move);
          doc.removeEventListener("pointerup", end);
          doc.removeEventListener("mousemove", move);
          doc.removeEventListener("mouseup", end);
          doc.removeEventListener("touchmove", move, { passive: false });
          doc.removeEventListener("touchend", end);

          doc.body.style.userSelect = "";
          doc.body.style.cursor = "";
          if (isTable) endTableResize();
          state.isResizing = false;

          syncOverlay(selectedEl, outline, badge);
          const markerId = `um-resize-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          try { selectedEl.setAttribute("data-um-resize-marker", markerId); } catch {}
          debouncedChange(doc, onContentChange);
          setTimeout(() => {
            try {
              const d2 = editorRef.current?.contentDocument;
              const i2 = editorRef.current;
              if (!d2 || !i2) return;
              const el2 = d2.querySelector(`[data-um-resize-marker="${markerId}"]`);
              if (el2) {
                el2.removeAttribute("data-um-resize-marker");
                const sel2 = d2.getSelection?.();
                if (sel2) {
                  const r2 = d2.createRange();
                  r2.selectNode(el2);
                  r2.collapse(true);
                  sel2.removeAllRanges();
                  sel2.addRange(r2);
                }
                el2.dispatchEvent(new MouseEvent('click', { bubbles: true }));
              }
              i2.contentWindow?.focus();
            } catch {}
            try { doc.dispatchEvent(new CustomEvent("umedia:resize:end", { bubbles: true, composed: true, detail: { el: selectedEl } })); } catch {}
          }, 200);
        };

        doc.addEventListener("pointermove", move);
        doc.addEventListener("pointerup", end);
        doc.addEventListener("mousemove", move);
        doc.addEventListener("mouseup", end);
        doc.addEventListener("touchmove", move, { passive: false });
        doc.addEventListener("touchend", end);
      };

      // חיבור ידיות
      handles.forEach(({ pos, el }) => {
        el.addEventListener("pointerdown", startFromPos(pos));
        el.addEventListener("mousedown", startFromPos(pos));
        el.addEventListener("touchstart", startFromPos(pos), { passive: false });
      });

      // גרירה מהקצוות (רק למדיה שאינה TABLE)
      const edgeStart = (e) => {
        if (isTable) return;
        const p = getPoint(e);
        const pos = hitTest(outline, p, HIT);
        if (!pos) return;
        e.preventDefault();
        e.stopPropagation();
        startFromPos(pos)(e);
      };
      outline.addEventListener("pointerdown", edgeStart);
      outline.addEventListener("mousedown", (e) => { const p = getPoint(e); if (hitTest(outline, p, HIT)) edgeStart(e); });
      outline.addEventListener("touchstart", (e) => { const t = e.touches?.[0]; if (t && hitTest(outline, { x: t.clientX, y: t.clientY }, HIT)) edgeStart(e); }, { passive: false });

      // קורסור דינמי על הקצוות (לא לטבלה)
      const onMoveCursor = (e) => {
        if (isTable) return;
        const p = getPoint(e);
        const pos = hitTest(outline, p, HIT);
        outline.style.cursor = pos ? cursorFor(pos) : "default";
      };
      outline.addEventListener("pointermove", onMoveCursor);
      outline.addEventListener("mousemove", onMoveCursor);
      outline.addEventListener("touchmove", (e) => {
        if (isTable) return;
        const t = e.touches?.[0]; if (!t) return;
        const pos = hitTest(outline, { x: t.clientX, y: t.clientY }, HIT);
        outline.style.cursor = pos ? cursorFor(pos) : "default";
      }, { passive: true });

      selectedEl.classList.add("umedia-selected");

      return () => {
        try {
          handles.forEach(({ el, pos }) => {
            el.removeEventListener("pointerdown", startFromPos(pos));
            el.removeEventListener("mousedown", startFromPos(pos));
            el.removeEventListener("touchstart", startFromPos(pos));
          });
          outline.removeEventListener("pointerdown", edgeStart);
          outline.removeEventListener("mousedown", edgeStart);
          outline.removeEventListener("touchstart", edgeStart);
          outline.removeEventListener("pointermove", onMoveCursor);
          outline.removeEventListener("mousemove", onMoveCursor);
          outline.removeEventListener("touchmove", onMoveCursor);
          doc.removeEventListener("scroll", onScroll);
          win.removeEventListener("resize", onScroll);
          selectedEl.removeEventListener("load", onLoad);
          ro.disconnect();
          mo.disconnect();
          teardown(selectedEl);
        } catch {}
      };
    } catch (err) {
      console.error("Universal resizer init error:", err);
    }
  }, [selectedEl, editorRef, onContentChange]);

  const handleDelete = () => {
    if (!selectedEl) return;
    const container = selectedEl._um_wrap || selectedEl;
    container.remove();

    setSelectedEl(null);
    setShowToolbar(false);
    if (editorRef?.current) {
      const doc = editorRef.current.contentDocument;
      onContentChange?.(serializeWithShortcodes(doc));
    }
  };

  const handleQuickResize = () => {
    if (!selectedEl || selectedEl.tagName === "TABLE") return;
    const curW = selectedEl.getBoundingClientRect().width || Number(selectedEl.getAttribute("width")) || 560;
    const curH = selectedEl.getBoundingClientRect().height || Number(selectedEl.getAttribute("height")) || 315;
    const nw = prompt("Enter new width:", String(Math.round(curW)));
    const nh = prompt("Enter new height:", String(Math.round(curH)));
    if (!nw) return;
    try {
      selectedEl.style.width = `${parseInt(nw, 10)}px`;
      if (nh !== null) selectedEl.style.height = `${parseInt(nh, 10)}px`;
      // עדכן גם attributes כדי שהשורטקוד ישמר מידות
      selectedEl.setAttribute("width", String(parseInt(nw, 10)));
      if (nh !== null) selectedEl.setAttribute("height", String(parseInt(nh, 10)));
      if (editorRef?.current) {
        const doc = editorRef.current.contentDocument;
        onContentChange?.(serializeWithShortcodes(doc));
      }
    } catch {}
  };

  const renderToolbar = () => {
    if (!showToolbar || !selectedEl || selectedEl.tagName === "TABLE") return null;
    const isDark = theme === "dark";
    const style = {
      position: "fixed",
      top: `${toolbarPos.top}px`,
      left: `${toolbarPos.left}px`,
      zIndex: 1000,
      display: "flex",
      gap: "4px",
      background: isDark ? "#1e293b" : "white",
      borderRadius: "4px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      padding: "4px",
      border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
      pointerEvents: "auto",
    };

    return createPortal(
      <div className="umedia-toolbar" style={style} onClick={(e) => e.stopPropagation()} ref={toolbarRef}>
        <Button size="icon" variant="ghost" className="size-8" title="Resize" onClick={handleQuickResize}>
          <Maximize className="size-4" />
        </Button>
        <Button size="icon" variant="ghost" className="size-8" title="Delete" onClick={handleDelete}>
          <Trash2 className="size-4" />
        </Button>
      </div>,
      document.body
    );
  };

  return renderToolbar();
}

/* --------------------- helpers --------------------- */
function addBaseStylesOnce(doc) {
  const prev = doc.getElementById("umedia-base-styles");
  if (prev) prev.remove();
  const style = doc.createElement("style");
  style.id = "umedia-base-styles";
  style.textContent = `
    img:hover, video:hover, iframe:hover, table:hover { cursor: pointer; }
    img.umedia-selected, video.umedia-selected, iframe.umedia-selected, table.umedia-selected { outline: 2px solid #3b82f6; }
  `;
  doc.head.appendChild(style);
}

function addResizerStylesOnce(doc) {
  const prev = doc.getElementById("umedia-resizer-styles");
  if (prev) prev.remove();
  const style = doc.createElement("style");
  style.id = "umedia-resizer-styles";
  style.textContent = `
    .umedia-wrap{position:relative; line-height: normal;}
    .umedia-outline{
      position:absolute; left:0; top:0;
      pointer-events:auto; background:transparent;
      z-index: 2147483647; /* מעל הכל */
      box-sizing:border-box;
      transform: translateZ(0);
      outline:2px solid #3b82f6; outline-offset:0;
    }
    .umedia-badge{
      position:absolute; top:calc(-1em - ${BADGE_OFFSET}px); left:0;
      background:#111827; color:#fff; font:12px/1.8 system-ui,-apple-system,Segoe UI,Roboto,Arial;
      padding:0 6px; border-radius:4px; pointer-events:none; white-space:nowrap;
      box-shadow:0 2px 6px rgba(0,0,0,.2);
    }
    /* ידיות ריסייז ברורות */
    .umedia-h{
      position:absolute; width:12px; height:12px;
      background:#3b82f6; border:2px solid #fff; border-radius:50%;
      box-shadow:0 1px 3px rgba(0,0,0,.25);
      pointer-events:auto;
    }
    .umedia-h-n  { top:-6px; left:50%; transform:translate(-50%,-50%); cursor:ns-resize; }
    .umedia-h-s  { bottom:-6px; left:50%; transform:translate(-50%,50%);  cursor:ns-resize; }
    .umedia-h-e  { right:-6px; top:50%; transform:translate(50%,-50%);  cursor:ew-resize; }
    .umedia-h-w  { left:-6px; top:50%; transform:translate(-50%,-50%); cursor:ew-resize; }
    .umedia-h-nw { left:-6px; top:-6px; transform:translate(-50%,-50%); cursor:nwse-resize; }
    .umedia-h-ne { right:-6px; top:-6px; transform:translate(50%,-50%);  cursor:nesw-resize; }
    .umedia-h-se { right:-6px; bottom:-6px; transform:translate(50%,50%); cursor:nwse-resize; }
    .umedia-h-sw { left:-6px; bottom:-6px; transform:translate(-50%,50%); cursor:nesw-resize; }
  `;
  doc.head.appendChild(style);
}

function clearAllSelections(doc) {
  doc.querySelectorAll("img.umedia-selected, video.umedia-selected, iframe.umedia-selected, table.umedia-selected")
    .forEach(el => el.classList.remove("umedia-selected"));
}

function positionToolbarOver(el, iframe, setPos, toolbarRef) {
  const rect = el.getBoundingClientRect();
  const irect = iframe.getBoundingClientRect();
  const approxH = (toolbarRef.current?.offsetHeight ?? 36);
  const margin = 8;
  let top = rect.top + irect.top - approxH - margin;
  if (top < 0) top = rect.bottom + irect.top + margin;
  setPos({ top, left: rect.left + irect.left, width: rect.width });
}

function syncOverlay(el, outline, badge) {
  if (!el || !outline) return;
  const show = !!(el.offsetWidth && el.offsetHeight);
  outline.style.display = show ? "block" : "none";

  try {
    const r = el.getBoundingClientRect();
    const pr = el.parentElement?.getBoundingClientRect?.();
    if (pr) {
      outline.style.left = `${Math.round(r.left - pr.left)}px`;
      outline.style.top = `${Math.round(r.top - pr.top)}px`;
      outline.style.width = `${Math.round(r.width)}px`;
      outline.style.height = `${Math.round(r.height)}px`;
    }
  } catch { }

  if (badge) {
    const w = Math.round(el.getBoundingClientRect().width || Number(el.getAttribute("width")) || 0);
    const h = Math.round(el.getBoundingClientRect().height || Number(el.getAttribute("height")) || 0);
    const nw = el.naturalWidth || el.videoWidth || w;
    const nh = el.videoHeight || el.naturalHeight || h;
    const pct = Math.round(Math.min((w / nw) * 100, (h / nh) * 100));
    badge.textContent = `${w}×${h}${isFinite(pct) ? ` (${pct}%)` : ""}`;
  }
}

function getAspect(el) {
  const nw = el.naturalWidth || el.videoWidth || Number(el.getAttribute("width")) || el.offsetWidth || 1;
  const nh = el.videoHeight || el.naturalHeight || Number(el.getAttribute("height")) || el.offsetHeight || 1;
  return (nw / nh) || 1;
}

function getPoint(e) {
  const t = e.touches?.[0] || e;
  return { x: t.clientX, y: t.clientY };
}

function cursorFor(pos) {
  switch (pos) {
    case "n": case "s": return "ns-resize";
    case "e": case "w": return "ew-resize";
    case "nw": case "se": return "nwse-resize";
    case "ne": case "sw": return "nesw-resize";
    default: return "default";
  }
}

function hitTest(outline, point, hit) {
  const r = outline.getBoundingClientRect();
  const x = point.x - r.left;
  const y = point.y - r.top;
  const left = x <= hit;
  const right = x >= r.width - hit;
  const top = y <= hit;
  const bottom = y >= r.height - hit;
  if (top && left) return "nw";
  if (top && right) return "ne";
  if (bottom && right) return "se";
  if (bottom && left) return "sw";
  if (top) return "n";
  if (right) return "e";
  if (bottom) return "s";
  if (left) return "w";
  return null;
}

function teardown(el) {
  if (!el) return;
  const w = el._um_wrap;

  if (w && w.parentNode) {
    const ws = w.style;
    const fl = ws.cssFloat || ws.float;
    if (fl === "left" || fl === "right") {
      el.style.float = fl;
      el.style.marginLeft = ws.marginLeft || "";
      el.style.marginRight = ws.marginRight || "";
      el.style.marginTop = ws.marginTop || "";
      el.style.marginBottom = ws.marginBottom || "";
    }
    w.parentNode.insertBefore(el, w);
    w.parentNode.removeChild(w);
  }
  el._um_wrap = null;
  el._um_outline = null;
  el._um_badge = null;
}

/** ממיר את תוכן ה-iframe לשורטקודים של וידאו, עם שמירת width/height ו-controls
 *  + fallback ל-src גם מ-<video src> וגם מ-<source src>
 *  + בחירת מאפיין נכון (mp4/webm/ogv)
 */
function serializeWithShortcodes(doc) {
  const clone = doc.body.cloneNode(true);

  clone.querySelectorAll('div[data-wysiwyg="video"]').forEach((wrap) => {
    const v = wrap.querySelector('video');
    if (!v) return;

    // מקור הווידאו: data-mp4 -> video[src] -> source[src]
    const dataMp4 = v.getAttribute('data-mp4') || '';
    const videoSrcAttr = v.getAttribute('src') || '';
    const sourceSrc = wrap.querySelector('video > source')?.getAttribute('src') || '';
    const src = dataMp4 || videoSrcAttr || sourceSrc;
    if (!src) return;

    // בחר מאפיין לפי הסיומת
    let attrName = 'mp4';
    const lower = src.toLowerCase();
    if (/\.(webm)(\?|#|$)/.test(lower)) attrName = 'webm';
    else if (/\.(ogv|ogg)(\?|#|$)/.test(lower)) attrName = 'ogv'; // WP משתמש ogv

    // מימדים – קודם מאטריביוטים, אם לא – מ-style
    let w = v.getAttribute('width');
    let h = v.getAttribute('height');
    if (!w && v.style.width?.endsWith('px')) w = v.style.width.replace('px', '');
    if (!h && v.style.height?.endsWith('px')) h = v.style.height.replace('px', '');

    // controls: אם אין אטריביוט controls בוידאו – נכתוב controls="off"
    const controlsOff = v.hasAttribute('controls') ? '' : ' controls="off"';

    const parts = [];
    if (w) parts.push(`width="${w}"`);
    if (h) parts.push(`height="${h}"`);
    parts.push(`${attrName}="${src}"`);

    const shortcode = `[video ${parts.join(' ')}${controlsOff}][/video]`;

    // החלפה לטקסט (כדי לשמור על HTML חוקי ב-clone)
    wrap.replaceWith(shortcode);
  });

  return clone.innerHTML;
}

let _debTimer = null;
function debouncedChange(doc, cb) {
  if (!cb) return;
  if (_debTimer) clearTimeout(_debTimer);
  _debTimer = setTimeout(() => {
    try { cb(serializeWithShortcodes(doc)); } catch {}
  }, 120);
}
