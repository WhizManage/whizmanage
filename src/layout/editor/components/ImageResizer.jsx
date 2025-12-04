import React, { useEffect } from "react";

/**
 * Clean, WooCommerce-style image resizer
 * - No visible "bullets"/handles; resize from edges/corners with cursors
 * - Smooth updates via rAF; minimal layout thrashing
 * - Works inside an iframe-based editor (designMode/execCommand environments)
 * - Shift = keep aspect ratio, Alt/Option = resize from center
 * - Debounced onContentChange to avoid spam
 */

const MIN_SIZE = 24;
const HIT = 8; // px hit-area from each edge for resizing
const BADGE_OFFSET = 8;

const ImageResizer = ({ editorRef, selectedImage, onContentChange }) => {
  useEffect(() => {
    if (!selectedImage || !editorRef?.current) return;
    const iframe = editorRef.current;
    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) return;

    try {
      addStylesOnce(doc);

      // --- wrap image (to allow outline without affecting layout) ---
      const wrapper = doc.createElement("div");
      wrapper.className = "wcimg-wrap";
      const cs = doc.defaultView.getComputedStyle(selectedImage);

      // Move float/margins to wrapper so outline fits neatly
      const imgFloat = selectedImage.style.float || cs.float;
      if (imgFloat === "left" || imgFloat === "right") {
        wrapper.style.cssFloat = imgFloat;
        wrapper.style.float = imgFloat; // Safari
        wrapper.style.marginLeft = cs.marginLeft;
        wrapper.style.marginRight = cs.marginRight;
        wrapper.style.marginTop = cs.marginTop;
        wrapper.style.marginBottom = cs.marginBottom;
        selectedImage.style.float = "none";
        selectedImage.style.margin = "0";
      }
      wrapper.style.display = cs.display === "block" ? "block" : "inline-block";
      wrapper.style.lineHeight = "0";
      wrapper.style.verticalAlign = "top";

      const parent = selectedImage.parentNode;
      parent.insertBefore(wrapper, selectedImage);
      wrapper.appendChild(selectedImage);

      // --- outline overlay (catch events) ---
      const outline = doc.createElement("div");
      outline.className = "wcimg-outline";
      wrapper.appendChild(outline);

      const badge = doc.createElement("div");
      badge.className = "wcimg-badge";
      wrapper.appendChild(badge);

      // refs for cleanup
      selectedImage._wc_wrap = wrapper;
      selectedImage._wc_outline = outline;
      selectedImage._wc_badge = badge;

      // initial sync
      syncOutline(selectedImage, outline, badge);

      const onImgLoad = () => syncOutline(selectedImage, outline, badge);
      selectedImage.addEventListener("load", onImgLoad);

      // ResizeObserver => track inline size changes without MutationObserver churn
      const ro = new win.ResizeObserver(() => syncOutline(selectedImage, outline, badge));
      ro.observe(selectedImage);

      // scroll/resize => keep overlay aligned
      const onScroll = () => syncOutline(selectedImage, outline, badge);
      const onWinResize = () => syncOutline(selectedImage, outline, badge);
      doc.addEventListener("scroll", onScroll, { passive: true });
      win.addEventListener("resize", onWinResize);

      // --- dragging state ---
      const state = {
        startX: 0,
        startY: 0,
        startW: 0,
        startH: 0,
        ratio: getAspect(selectedImage),
        pos: null, // 'n'|'s'|'e'|'w'|'ne'|'nw'|'se'|'sw'
        keepRatio: false,
        fromCenter: false,
        raf: null,
        nextSize: null,
      };

      const start = (e) => {
        // Only start when on edge/corner
        const p = getPoint(e);
        const pos = hitTest(outline, p, HIT);
        if (!pos) return;
        e.preventDefault();
        e.stopPropagation();

        state.pos = pos;
        state.keepRatio = !!e.shiftKey;
        state.fromCenter = !!(e.altKey || e.metaKey);
        state.ratio = getAspect(selectedImage);
        state.startX = p.x;
        state.startY = p.y;
        state.startW = selectedImage.offsetWidth || selectedImage.width;
        state.startH = selectedImage.offsetHeight || selectedImage.height;

        doc.body.style.userSelect = "none";
        doc.body.style.cursor = getCursor(pos);

        // Pointer capture for reliable drags
        try { outline.setPointerCapture?.(e.pointerId); } catch {}

        doc.addEventListener("pointermove", move);
        doc.addEventListener("pointerup", end);

        doc.dispatchEvent(new win.CustomEvent("wcimg-resize-start"));
      };

      const move = (e) => {
        e.preventDefault();
        const p = getPoint(e);
        const dx = p.x - state.startX;
        const dy = p.y - state.startY;

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
            // choose dominant axis
            if (Math.abs(dx) > Math.abs(dy)) h = w / state.ratio; else w = h * state.ratio;
          } else if (pos === "e" || pos === "w") {
            h = w / state.ratio;
          } else {
            w = h * state.ratio;
          }
        }

        w = Math.max(MIN_SIZE, Math.round(w));
        h = Math.max(MIN_SIZE, Math.round(h));

        // Defer DOM writes to rAF for smoothness
        state.nextSize = { w, h };
        if (!state.raf) {
          state.raf = win.requestAnimationFrame(() => {
            if (state.nextSize) {
              const { w, h } = state.nextSize;
              selectedImage.style.willChange = "width, height";
              selectedImage.style.width = `${w}px`;
              selectedImage.style.height = `${h}px`;
              selectedImage.width = w;
              selectedImage.height = h;
              syncOutline(selectedImage, outline, badge);
            }
            state.raf = null;
          });
        }
      };

      const end = () => {
        doc.removeEventListener("pointermove", move);
        doc.removeEventListener("pointerup", end);
        doc.body.style.userSelect = "";
        doc.body.style.cursor = "";
        try { outline.releasePointerCapture?.(); } catch {}

        // Final sync
        syncOutline(selectedImage, outline, badge);
        doc.dispatchEvent(new win.CustomEvent("wcimg-resize-end"));

        // Debounced content change
        debouncedContentChange(doc, onContentChange);
      };

      outline.addEventListener("pointerdown", start);

      // cursor feedback on hover (edge-only)
      const onMoveCursor = (e) => {
        const p = getPoint(e);
        const pos = hitTest(outline, p, HIT);
        outline.style.cursor = pos ? getCursor(pos) : "default";
      };
      outline.addEventListener("pointermove", onMoveCursor);

      // selection state (adds a subtle highlight)
      selectedImage.classList.add("wcimg-selected");

      // cleanup
      return () => {
        try {
          outline.removeEventListener("pointerdown", start);
          outline.removeEventListener("pointermove", onMoveCursor);
          doc.removeEventListener("pointermove", move);
          doc.removeEventListener("pointerup", end);
          doc.removeEventListener("scroll", onScroll);
          win.removeEventListener("resize", onWinResize);
          selectedImage.removeEventListener("load", onImgLoad);
          ro.disconnect();
          teardownImage(selectedImage);
        } catch {}
      };
    } catch (err) {
      console.error("Clean resizer init error:", err);
    }
  }, [selectedImage, editorRef, onContentChange]);

  return null;
};

/* ---------------- helpers ---------------- */

function addStylesOnce(doc) {
  if (doc.getElementById("wcimg-styles-clean")) return;
  const style = doc.createElement("style");
  style.id = "wcimg-styles-clean";
  style.textContent = `
  .wcimg-wrap{position:relative}
  .wcimg-outline{position:absolute; inset:0; pointer-events:auto;}
  /* Subtle outline only on hover/active */
  .wcimg-wrap:hover .wcimg-outline, .wcimg-wrap:active .wcimg-outline{ outline:2px solid #3b82f6; outline-offset:0; }
  .wcimg-badge{ position:absolute; top:calc(-1em - ${BADGE_OFFSET}px); left:0; background:#111827; color:#fff; font:12px/1.8 system-ui, -apple-system, Segoe UI, Roboto, Arial; padding:0 6px; border-radius:4px; pointer-events:none; white-space:nowrap; box-shadow:0 2px 6px rgba(0,0,0,.2); }
  img.wcimg-selected{ outline:0 !important; }
  `;
  doc.head.appendChild(style);
}

function syncOutline(img, outline, badge) {
  if (!img || !outline) return;
  const show = !!(img.offsetWidth && img.offsetHeight);
  outline.style.display = show ? "block" : "none";
  if (badge) {
    const w = Math.round(img.offsetWidth || img.width || 0);
    const h = Math.round(img.offsetHeight || img.height || 0);
    const nw = img.naturalWidth || w; const nh = img.naturalHeight || h;
    const pct = Math.round(Math.min((w / nw) * 100, (h / nh) * 100));
    badge.textContent = `${w}×${h} (${pct}%)`;
  }
}

function getAspect(img) {
  const nw = img.naturalWidth || img.width || 1;
  const nh = img.naturalHeight || img.height || 1;
  return nw / nh;
}

function getPoint(e) {
  const t = e.touches?.[0] || e;
  return { x: t.clientX, y: t.clientY };
}

function getCursor(pos) {
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

function teardownImage(img) {
  if (!img) return;
  const w = img._wc_wrap;
  if (w && w.parentNode) {
    // Restore float/margins if we moved them
    const ws = w.style;
    const floatVal = ws.cssFloat || ws.float;
    if (floatVal === "left" || floatVal === "right") {
      img.style.float = floatVal;
      img.style.marginLeft = ws.marginLeft || "";
      img.style.marginRight = ws.marginRight || "";
      img.style.marginTop = ws.marginTop || "";
      img.style.marginBottom = ws.marginBottom || "";
    }
    w.parentNode.insertBefore(img, w);
    w.parentNode.removeChild(w);
  }
  img._wc_wrap = null;
  img._wc_outline = null;
  img._wc_badge = null;
}

let _contentChangeTimer = null;
function debouncedContentChange(doc, cb) {
  if (!cb) return;
  if (_contentChangeTimer) clearTimeout(_contentChangeTimer);
  _contentChangeTimer = setTimeout(() => {
    try { cb(doc.body.innerHTML); } catch {}
  }, 120);
}

export default ImageResizer;
