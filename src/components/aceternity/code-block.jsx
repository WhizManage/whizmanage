// src/components/aceternity/code-block.jsx
import CodeMirror from "@uiw/react-codemirror";
import { html as cmHtml } from "@codemirror/lang-html";
import { githubLight } from "@uiw/codemirror-theme-github";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view"; // 👈 לצורך שבירת שורות

export default function CodeBlock({ code = "", onChange, height = "400px", dark }) {
  const systemDark =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const isDark = typeof dark === "boolean" ? dark : systemDark;
  const cmHeight = height === "full" ? "100%" : height; // 👈 כדי ש-height=\"full\" יעבוד

  return (
    <div
      className="rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2"
      style={{ direction: "ltr", textAlign: "left" }}
    >
      <CodeMirror
        value={code ?? ""}
        onChange={(val) => onChange?.(val)}
        height={cmHeight}
        theme={isDark ? oneDark : githubLight}
        extensions={[
          cmHtml({ matchClosingTags: true, autoCloseTags: true }),
          EditorView.lineWrapping, // 👈 שבירת שורות בפועל (כמו VSCode word wrap)
        ]}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: true,
          foldGutter: true,
          bracketMatching: true,
          autocompletion: true,
        }}
      />
    </div>
  );
}
