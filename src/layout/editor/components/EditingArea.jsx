import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import CodeBlock from "../../../components/aceternity/code-block";
import { applyCodeStyles } from "./utils/colorUtils";
import { __ } from '@wordpress/i18n';
import beautify from "js-beautify";

const EditingArea = ({
  editorRef,
  isPreview,
  htmlContent,
  handleCodeChange,
  focusEditor,
  height = "400px",
}) => {
  const [displayCode, setDisplayCode] = useState("");
  const [copied, setCopied] = useState(false);
   

  const getDoc = (ref) =>
    ref?.current?.contentDocument ||
    ref?.current?.contentWindow?.document ||
    null;

  // In preview (code) mode, surface the raw shortcode string as-is
  useEffect(() => {
    if (isPreview) {
      // פרמט את ה־HTML לפני ההצגה
      const formatted = beautify.html(htmlContent ?? "", {
        indent_size: 2,
        wrap_line_length: 80,
        preserve_newlines: true,
      });
      setDisplayCode(formatted);
    }
  }, [htmlContent, isPreview]);


  // When returning to visual mode, make sure code styles are injected into the iframe
  useEffect(() => {
    if (!isPreview && editorRef?.current) {
      const doc = getDoc(editorRef);
      const inject = () => {
        const d = getDoc(editorRef);
        if (d?.head) applyCodeStyles(d);
      };
      if (doc?.readyState === "complete") {
        inject();
      } else {
        const onload = () => inject();
        editorRef.current.addEventListener("load", onload, { once: true });
        return () => editorRef.current?.removeEventListener("load", onload);
      }
    }
  }, [isPreview, editorRef]);

  const onCodeChange = (newCode) => {
    // Pass the raw shortcode text through, unchanged
    handleCodeChange({ target: { value: newCode } });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = displayCode;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        console.error("Fallback copy failed:", fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div
      className="flex-grow overflow-auto !scrollbar-whiz dark:!bg-slate-900 relative"
      style={{ height }}
    >
      {isPreview ? (
        <div className="relative h-full flex flex-col">
          {/* שורת כפתורים מעל הקוד */}
          <div className="flex justify-end items-center p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <button
              type="button"
              onClick={handleCopy}
              title={copied ? __("copied", "whizmanage") : __("copy", "whizmanage")}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg transition-all"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* הקוד עצמו */}
          <div className="flex-grow">
            <CodeBlock
              className="whitespace-pre-wrap"
              code={displayCode}
              onChange={onCodeChange}
              height="full"
            />
          </div>
        </div>
      ) : (
        <iframe
          src="about:blank"
          ref={editorRef}
          className="w-full h-full border-0 bg-blue dark:!bg-slate-900"
          title="HTML Editor"
          onLoad={() => {
            const doc = getDoc(editorRef);
            applyCodeStyles(doc); // re-inject on every load
            focusEditor?.();
          }}
        />
      )}
    </div>
  );
};

export default React.memo(EditingArea, areEqual);

function areEqual(prev, next) {
  if (!prev.isPreview && !next.isPreview) {
    return (
      prev.isPreview === next.isPreview &&
      prev.height === next.height &&
      prev.focusEditor === next.focusEditor &&
      prev.editorRef === next.editorRef
    );
  }
  return (
    prev.isPreview === next.isPreview &&
    prev.height === next.height &&
    prev.htmlContent === next.htmlContent &&
    prev.focusEditor === next.focusEditor &&
    prev.editorRef === next.editorRef
  );
}