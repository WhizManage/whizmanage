// src/components/RichEditor/components/Toolbar/index.jsx
// Fixed version with proper overflow button display
import { useState, useEffect, useRef } from "react";
import { __ } from '@wordpress/i18n';
import { MoreHorizontal, ChevronUp } from "lucide-react";
import { Button } from "@components/ui/button";
import HistoryTools from "./HistoryTools";
import TextFormatting from "./TextFormatting";
import ColorTools from "./ColorTools";
import AlignmentTools from "./AlignmentTools";
import FontTools from "./FontTools";
import ListTools from "./ListTools";
import InsertTools from "./InsertTools";
import ViewTools from "./ViewTools";
import CodeTools from "./CodeTools";

const Toolbar = ({
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
  handleImageUpload,
  editorRef,
  insertVideo,
  focusEditor
}) => {
   
  const [expandToolbar, setExpandToolbar] = useState(false);
  const [toolbarOverflows, setToolbarOverflows] = useState(false);
  const [showMoreButton, setShowMoreButton] = useState(false);
  const mainToolbarRef = useRef(null);
  const toolbarContainerRef = useRef(null);

  // מגדיר רוחב מינימלי שמתחתיו תמיד יופעל מצב גלישה
  const OVERFLOW_BREAKPOINT = 800; // נקודת שבירה בפיקסלים

  // בדיקה האם הטולבר חורג מהרוחב המותר או שהמסך קטן מדי
  useEffect(() => {
    const checkToolbarOverflow = () => {
      if (mainToolbarRef.current && toolbarContainerRef.current) {
        const containerWidth = toolbarContainerRef.current.clientWidth;

        // אם רוחב המיכל קטן מנקודת השבירה, נפעיל מצב גלישה
        const shouldShowMoreButton = containerWidth < OVERFLOW_BREAKPOINT;

        // מצב מורחב יכבה אוטומטית אם נרחיב את המסך מעבר לנקודת השבירה
        if (!shouldShowMoreButton) {
          setExpandToolbar(false);
        }

        setToolbarOverflows(containerWidth < OVERFLOW_BREAKPOINT);
        setShowMoreButton(shouldShowMoreButton);
      }
    };

    // בדיקה ראשונית
    checkToolbarOverflow();

    // בדיקה נוספת לאחר מספר מילישניות כדי לוודא שה-DOM נטען במלואו
    const timeoutId = setTimeout(checkToolbarOverflow, 100);

    // הוספת האזנה לשינויי גודל
    window.addEventListener("resize", checkToolbarOverflow);

    return () => {
      window.removeEventListener("resize", checkToolbarOverflow);
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="flex-shrink-0 flex flex-col bg-white dark:bg-slate-700 border-b shadow-lg dark:border-slate-600">
      {/* Main toolbar container - REMOVED overflow-hidden to allow dropdowns */}
      <div
        ref={toolbarContainerRef}
        className="w-full relative"
        onPointerDown={(e) => {
          if (e.pointerType === "mouse") {
            e.preventDefault();
          }
          focusEditor();
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          focusEditor();
        }}
      >
        <div
          ref={mainToolbarRef}
          className="flex items-start py-1 px-2 w-auto justify-between"
        >
          <div className="flex items-center flex-wrap gap-0.5">
            {/* כלי היסטוריה */}
            <HistoryTools
              customUndo={customUndo}
              customRedo={customRedo}
              historyIndex={historyIndex}
              history={history}
            />

            {/* קו מפריד */}
            <div className="h-5 w-px bg-slate-300 dark:bg-slate-600 mx-1"></div>

            {/* כלי עיצוב טקסט */}
            <TextFormatting
              activeTextValues={activeTextValues}
              execCommand={execCommand}
            />

            {/* כלי צבע */}
            <ColorTools execCommand={execCommand} editorRef={editorRef} focusEditor={focusEditor} />

            {/* קו מפריד */}
            <div
              className={`h-5 w-px bg-slate-300 dark:bg-slate-600 mx-1 ${toolbarOverflows || expandToolbar ? "hidden" : ""}`}
            ></div>

            <CodeTools editorRef={editorRef} />
            {/* כלי יישור */}
            <AlignmentTools
              activeAlignValue={activeAlignValue}
              execCommand={execCommand}
              focusEditor={focusEditor}
            />

            {/* קו מפריד - מוסתר במצב גלישה או במצב מורחב */}
            <div
              className={`h-5 w-px bg-slate-300 dark:bg-slate-600 mx-1 ${toolbarOverflows || expandToolbar ? "hidden" : ""}`}
            ></div>

            {/* כלי גופן וגודל - תמיד מוסתרים בטולבר הראשי במצב מורחב */}
            <div
              className={`${toolbarOverflows || expandToolbar ? "hidden" : "flex"} items-center`}
            >
              <FontTools
                currentFontSize={currentFontSize}
                showFontSelector={showFontSelector}
                fontOptions={fontOptions}
                increaseFontSize={increaseFontSize}
                decreaseFontSize={decreaseFontSize}
                changeFont={changeFont}
                setShowFontSelector={setShowFontSelector}
                insertVideo={insertVideo}
              />
            </div>

            {/* קו מפריד - מוסתר במצב גלישה או במצב מורחב */}
            <div
              className={`h-5 w-px bg-slate-300 dark:bg-slate-600 mx-1 ${toolbarOverflows || expandToolbar ? "hidden" : ""}`}
            ></div>

            {/* כלי רשימות - תמיד מוסתרים בטולבר הראשי במצב מורחב */}
            <div
              className={`${toolbarOverflows || expandToolbar ? "hidden" : "flex"} items-center`}
            >
              <ListTools
                activeListValues={activeListValues}
                execCommand={execCommand}
              />
            </div>

            {/* קו מפריד - מוסתר במצב גלישה או במצב מורחב */}
            <div
              className={`h-5 w-px bg-slate-300 dark:bg-slate-600 mx-1 ${toolbarOverflows || expandToolbar ? "hidden" : ""}`}
            ></div>

            {/* כלי הוספה - תמיד מוסתרים בטולבר הראשי במצב מורחב */}
            <div
              className={`${toolbarOverflows || expandToolbar ? "hidden" : "flex"} items-center`}
            >
              <InsertTools
                insertLink={insertLink}
                insertImage={insertImage}
                insertTable={insertTable}
                handleImageUpload={handleImageUpload}
                execCommand={execCommand}
                insertVideo={insertVideo}
              />
            </div>
          </div>

          <div className="ml-auto flex items-start justify-end flex-1">
            {/* כפתור להרחבת הטולבר - מוצג תמיד כשהמסך קטן מדי */}
            {showMoreButton && (
              <Button
                size="xs"
                variant="ghost"
                className="h-7 w-7 p-0 rounded-md mx-1 flex items-center justify-center z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setExpandToolbar(!expandToolbar);
                }}
                title={expandToolbar ? __("Show Less", "whizmanage") : __("Show More", "whizmanage")}
              >
                {expandToolbar ? (
                  <ChevronUp className="size-4" strokeWidth={1.5} />
                ) : (
                  <MoreHorizontal className="size-4" strokeWidth={1.5} />
                )}
              </Button>
            )}

            {/* כלי תצוגה וכפתורים בצד ימין */}
            <ViewTools
              printContent={printContent}
              togglePreview={togglePreview}
              toggleFullScreen={toggleFullScreen}
              isPreview={isPreview}
              isFullScreen={isFullScreen}
              showMoreButton={showMoreButton}
            />
          </div>
        </div>
      </div>
      {/* Expanded toolbar row that appears when More is clicked */}
      {showMoreButton && expandToolbar && (
        <div className="flex items-center flex-wrap gap-1 p-1 dark:border-slate-600">
          <FontTools
            currentFontSize={currentFontSize}
            showFontSelector={showFontSelector}
            fontOptions={fontOptions}
            increaseFontSize={increaseFontSize}
            decreaseFontSize={decreaseFontSize}
            changeFont={changeFont}
            setShowFontSelector={setShowFontSelector}
          />

          <div className="h-5 w-px bg-slate-300 dark:bg-slate-600 mx-1"></div>

          <ListTools
            activeListValues={activeListValues}
            execCommand={execCommand}
          />

          <div className="h-5 w-px bg-slate-300 dark:bg-slate-600 mx-1"></div>

          <InsertTools
            insertLink={insertLink}
            insertImage={insertImage}
            insertTable={insertTable}
            handleImageUpload={handleImageUpload}
            execCommand={execCommand}
            insertVideo={insertVideo}
          />
        </div>
      )}
    </div>
  );
};

export default Toolbar;