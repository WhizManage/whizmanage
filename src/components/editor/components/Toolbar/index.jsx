// src/layout/editor/components/Toolbar/index.jsx
import { Button } from "@components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
 import { __ } from "@wordpress/i18n";
import AlignmentTools from "./AlignmentTools";
import CodeTools from "./CodeTools";
import ColorTools from "./ColorTools";
import FontTools from "./FontTools";
import HistoryTools from "./HistoryTools";
import InsertTools from "./InsertTools";
import ListTools from "./ListTools";
import TextFormatting from "./TextFormatting";
import ViewTools from "./ViewTools";

/**
 * Props (העיקריים):
 * - editorRef: ref של ה-iframe (חובה בשביל CodeTools)
 * - insertLink, insertImage, insertTable, insertVideo, execCommand, ...
 */
const Toolbar = ({
  editorRef, // ← חשוב! נעביר ל-CodeTools
  activeTextValues,
  activeAlignValue,
  activeListValues,
  historyIndex,
  history,
  currentFontSize,
  showFontSelector,
  fontOptions,
  isPreview,
  isFullScreen,
  execCommand,
  customUndo,
  customRedo,
  togglePreview,
  toggleFullScreen,
  printContent,
  increaseFontSize,
  decreaseFontSize,
  changeFont,
  setShowFontSelector,
  insertLink,
  insertImage,
  insertTable,
  insertVideo,
  focusEditor,
  compact = false,
  onOpenFullEditor,
}) => {
   
  const containerRef = useRef(null);
  const rowRef = useRef(null);

  const [hasOverflow, setHasOverflow] = useState(false);
  const [forceSecondRow, setForceSecondRow] = useState(false); // שורת כלים שנייה פתוחה/סגורה
  const [isNarrow, setIsNarrow] = useState(false); // לפי breakpoint

  // קובע אם צריך להראות 3 נקודות
  const showMoreBtn = hasOverflow || isNarrow;

  useLayoutEffect(() => {
    const checkOverflow = () => {
      if (!containerRef.current || !rowRef.current) return;
      const c = containerRef.current;
      const r = rowRef.current;
      setHasOverflow(r.scrollWidth > c.clientWidth + 1);
    };
    checkOverflow();
    const ro = new ResizeObserver(checkOverflow);
    ro.observe(containerRef.current);
    ro.observe(rowRef.current);
    window.addEventListener("resize", checkOverflow);
    return () => {
      try {
        ro.disconnect();
      } catch {}
      window.removeEventListener("resize", checkOverflow);
    };
  }, []);

  // breakpoint: נניח < 1024px נחשב “צר”
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1024px)");
    const onChange = () => setIsNarrow(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  // Separator component for cleaner code - spacer only in compact mode
  const Separator = () => compact ? (
    <div className="w-2" />
  ) : (
    <div className="h-5 w-px bg-slate-300 dark:bg-slate-600 mx-1" />
  );

  return (
    <div className="w-full border-b border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800 backdrop-blur supports-[backdrop-filter]:bg-white/50 dark:supports-[backdrop-filter]:bg-slate-800 [&_button:hover]:dark:!bg-slate-700 [&_[data-state=on]]:dark:!bg-slate-700">
      <div className="max-w-full">
        {/* שורה ראשונה */}
        <div ref={containerRef} className="overflow-hidden">
          <div ref={rowRef} className={`flex items-center ${compact ? "gap-px px-1 py-1" : "gap-1 p-2"}`}>
            <HistoryTools
              execCommand={execCommand}
              customUndo={customUndo}
              customRedo={customRedo}
              historyIndex={historyIndex}
              history={history}
            />

            <Separator />

            <TextFormatting
              activeTextValues={activeTextValues}
              execCommand={execCommand}
            />

            <Separator />

            <ColorTools
              execCommand={execCommand}
              editorRef={editorRef}
              focusEditor={focusEditor}
            />

            <Separator />

            <AlignmentTools
              activeAlignValue={activeAlignValue}
              execCommand={execCommand}
            />

            <Separator />

            <FontTools
              currentFontSize={currentFontSize}
              fontOptions={fontOptions}
              increaseFontSize={increaseFontSize}
              showFontSelector={showFontSelector}
              decreaseFontSize={decreaseFontSize}
              changeFont={changeFont}
              setShowFontSelector={setShowFontSelector}
              compact={compact}
            />

            {/* במצב compact: מסתירים את הכלים שבין FontTools ל-ViewTools */}
            {!compact && (
              <>
                <Separator />

                <ListTools
                  activeListValues={activeListValues}
                  execCommand={execCommand}
                />

                <Separator />

                <InsertTools
                  insertLink={insertLink}
                  insertImage={insertImage}
                  insertTable={insertTable}
                  execCommand={execCommand}
                  insertVideo={insertVideo}
                />

                <Separator />

                {/* כפתורי קוד – בשורה ראשית */}
                <CodeTools editorRef={editorRef} />
              </>
            )}

            <div className="ml-auto flex items-center gap-1">
              <ViewTools
                isPreview={isPreview}
                isFullScreen={isFullScreen}
                togglePreview={togglePreview}
                toggleFullScreen={toggleFullScreen}
                printContent={printContent}
                focusEditor={focusEditor}
                compact={compact}
                onOpenFullEditor={onOpenFullEditor}
                showMoreButton={showMoreBtn}
              />

              {/* כפתור 3 נקודות – תמיד במסכים צרים, או כשיש overflow */}
              {showMoreBtn && (
                <Button
                  size="xs"
                  variant="outline"
                  className="h-7 px-2"
                  onClick={() => setForceSecondRow((v) => !v)}
                  aria-expanded={forceSecondRow ? "true" : "false"}
                  aria-controls="toolbar-second-row"
                  aria-label={__("More", "whizmanage")}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* שורה שנייה — נפתחת בלחיצה על ה-3 נקודות */}
        {forceSecondRow && (
          <div
            id="toolbar-second-row"
            className="p-2 border-t border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70"
          >
            <div className="flex flex-wrap items-center gap-1">
              {/* שים כאן את אותם כלים שתרצה לשכפל לשורה השנייה */}
              <TextFormatting
                activeTextValues={activeTextValues}
                execCommand={execCommand}
              />
              <div className="h-5 w-px bg-slate-300 dark:bg-slate-600 mx-1" />
              <ListTools
                activeListValues={activeListValues}
                execCommand={execCommand}
              />
              <div className="h-5 w-px bg-slate-300 dark:bg-slate-600 mx-1" />
              <InsertTools
                insertLink={insertLink}
                insertImage={insertImage}
                insertTable={insertTable}
                execCommand={execCommand}
                insertVideo={insertVideo}
              />
              <div className="h-5 w-px bg-slate-300 dark:bg-slate-600 mx-1" />
              <CodeTools editorRef={editorRef} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Toolbar;
