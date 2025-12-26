// src/layout/editor/components/Toolbar/ViewTools.jsx
import { Button } from "@components/ui/button";
import CustomTooltip from "@components/ui/nextUI/Tooltip";
import { Code, Eye, Maximize, Minimize2, Printer } from "lucide-react";
 import { __ } from "@wordpress/i18n";

const ViewTools = ({
  printContent,
  togglePreview,
  toggleFullScreen,
  isPreview,
  isFullScreen,
  showMoreButton,
  compact = false,
  onOpenFullEditor,
}) => {
   

  const handleFullScreenClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    // במצב compact, אם יש onOpenFullEditor - נפתח את המודל
    if (compact && onOpenFullEditor) {
      onOpenFullEditor();
    } else {
      toggleFullScreen();
    }
  };

  return (
    <div className="flex items-center gap-1">
      {/* במצב compact: מסתירים Print ו-Preview, מציגים רק Full Screen */}
      {!compact && (
        <>
          <CustomTooltip title={__("Print", "whizmanage")}>
            <Button
              size="xs"
              variant="ghost"
              className="h-7 w-7 p-0 rounded-md"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                printContent();
              }}
            >
              <Printer className="size-4" strokeWidth={1.5} />
            </Button>
          </CustomTooltip>

          <CustomTooltip title={isPreview ? __("Show Editor", "whizmanage") : __("Show HTML", "whizmanage")}>
            <Button
              size="xs"
              variant="ghost"
              className="h-7 w-7 p-0 rounded-md"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                togglePreview();
              }}
            >
              {isPreview ? <Eye className="size-4" /> : <Code className="size-4" />}
            </Button>
          </CustomTooltip>
        </>
      )}

      {!showMoreButton && (
        <CustomTooltip
          title={compact ? __("Open Full Editor", "whizmanage") : (isFullScreen ? __("Exit Full Screen", "whizmanage") : __("Full Screen", "whizmanage"))}
        >
          <Button
            size="xs"
            variant="ghost"
            className="h-7 w-7 p-0 rounded-md"
            onClick={handleFullScreenClick}
          >
            {isFullScreen ? (
              <Minimize2 className="size-4" />
            ) : (
              <Maximize className="size-4" />
            )}
          </Button>
        </CustomTooltip>
      )}
    </div>
  );
};

export default ViewTools;
