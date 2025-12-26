// src/layout/editor/components/utils/getPortalRoot.js
export function getPortalRoot(editorRef) {
  if (typeof document === "undefined") return;
  const iframe = editorRef?.current;
  if (!iframe) return document.body;

  const candidate =
    iframe.closest?.(
      '[data-layer-root],[data-overlay-root],[role="dialog"],.modal,.Modal'
    ) || iframe.parentElement;

  return candidate || document.body;
}
