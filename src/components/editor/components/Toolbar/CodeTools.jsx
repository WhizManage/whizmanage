// src/layout/editor/components/Toolbar/CodeTools.jsx
import { Button } from "@components/ui/button";
import CustomTooltip from "@components/ui/nextUI/Tooltip";
import { CodeXml } from "lucide-react";
import { useEffect, useRef, useState } from "react";
 import { __ } from "@wordpress/i18n";
import { applyCodeStyles } from "../utils/colorUtils";

/* ---------- helpers ---------- */
const getDoc = (ref) =>
  ref?.current?.contentDocument ||
  ref?.current?.contentWindow?.document ||
  null;

const ancestorTag = (node, tag) => {
  let n = node;
  const t = tag.toLowerCase();
  while (n) {
    const el = n.nodeType === 3 ? n.parentElement : n;
    if (!el) break;
    if (el.tagName?.toLowerCase() === t) return el;
    n = el.parentElement;
  }
  return null;
};

const isCodeEmpty = (el) =>
  (el.textContent || "").replace(/\u200B/g, "").trim().length === 0;

const unwrapKeepCaret = (doc, sel, el) => {
  const m = doc.createElement( "span");
  m.setAttribute("data-caret", "1");
  el.appendChild(m);
  const p = el.parentNode;
  while (el.firstChild) p.insertBefore(el.firstChild, el);
  p.removeChild(el);
  const mk = p.querySelector('span[data-caret="1"]');
  if (mk) {
    const r = doc.createRange();
    r.setStartBefore(mk);
    r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);
    mk.remove();
  }
};

const placeCaretAfterWithZWSP = (doc, sel, el) => {
  const after = doc.createTextNode("\u200B");
  if (el.nextSibling) el.parentNode.insertBefore(after, el.nextSibling);
  else el.parentNode.appendChild(after);
  const r = doc.createRange();
  r.setStart(after, 1);
  r.collapse(true);
  sel.removeAllRanges();
  sel.addRange(r);
};

const rangeCoversNode = (range, node) => {
  const all = range.cloneRange();
  all.selectNodeContents(node);
  return (
    range.compareBoundaryPoints(Range.START_TO_START, all) <= 0 &&
    range.compareBoundaryPoints(Range.END_TO_END, all) >= 0
  );
};

/* ---------- action ---------- */
function toggleInlineCode(editorRef, lastRangeRef) {
  const doc = getDoc(editorRef);
  if (!doc) return;

  applyCodeStyles(doc);

  let sel = doc.getSelection?.();
  if (!sel || !sel.rangeCount) {
    const r = lastRangeRef?.current;
    if (r) {
      sel = doc.getSelection();
      sel.removeAllRanges();
      sel.addRange(r.cloneRange());
    }
  }
  if (!sel || !sel.rangeCount) return;

  const range = sel.getRangeAt(0);
  const startCode = ancestorTag(range.startContainer, "code");
  const endCode = ancestorTag(range.endContainer, "code");

  if (sel.isCollapsed) {
    if (startCode) {
      isCodeEmpty(startCode)
        ? unwrapKeepCaret(doc, sel, startCode)
        : placeCaretAfterWithZWSP(doc, sel, startCode);
      return;
    }
    const codeEl = doc.createElement( "code");
    codeEl.appendChild(doc.createTextNode("\u200B"));
    range.insertNode(codeEl);
    const r = doc.createRange();
    r.setStart(codeEl.firstChild, 1);
    r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);
    return;
  }

  if (startCode && startCode === endCode) {
    if (rangeCoversNode(range, startCode)) {
      unwrapKeepCaret(doc, sel, startCode);
      return;
    } else {
      placeCaretAfterWithZWSP(doc, sel, startCode);
      return;
    }
  }

  const codeEl = doc.createElement( "code");
  try {
    range.surroundContents(codeEl);
  } catch {
    const textOnly = range.cloneContents().textContent || "";
    codeEl.textContent = textOnly;
    range.deleteContents();
    range.insertNode(codeEl);
  }
  placeCaretAfterWithZWSP(doc, sel, codeEl);
}

/* ---------- component ---------- */
export default function CodeTools({ editorRef }) {
   
  const [active, setActive] = useState(false);
  const lastRangeRef = useRef(null);

  useEffect(() => {
    const doc = getDoc(editorRef);
    if (!doc) return;
    applyCodeStyles(doc);

    const onSel = () => {
      const sel = doc.getSelection?.();
      if (sel && sel.rangeCount) {
        lastRangeRef.current = sel.getRangeAt(0).cloneRange();
      }
      const inside = sel?.anchorNode
        ? !!ancestorTag(sel.anchorNode, "code")
        : false;
      setActive(!!inside);
    };

    doc.addEventListener("selectionchange", onSel);
    onSel();
    return () => doc.removeEventListener("selectionchange", onSel);
  }, [editorRef]);

  return (
    <CustomTooltip title={__("Inline code", "whizmanage")}>
      <Button
        type="button"
        data-editor-tool="1"
        size="xs"
        variant="ghost"
        className={`h-7 px-2 rounded-md ${active ? "bg-slate-200 dark:bg-slate-600" : ""}`}
        title={__("Inline code", "whizmanage")}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleInlineCode(editorRef, lastRangeRef);
        }}
        onFocus={(e) => e.currentTarget.blur()}
      >
        <CodeXml className="size-4" strokeWidth={1.5} />
      </Button>
    </CustomTooltip>
  );
}
