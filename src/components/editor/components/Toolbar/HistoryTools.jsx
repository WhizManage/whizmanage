// src/layout/editor/components/Toolbar/HistoryTools.jsx
import { Button } from "@components/ui/button";
import CustomTooltip from "@components/ui/nextUI/Tooltip";
import { Redo, Undo } from "lucide-react";
 import { __ } from "@wordpress/i18n";

const HistoryTools = ({ customUndo, customRedo, historyIndex, history }) => {
   

  return (
    <div className="flex items-center gap-0.5">
      <CustomTooltip title={__("Undo", "whizmanage")}>
        <Button
          size="xs"
          variant="ghost"
          className="h-7 w-7 p-0 rounded-md"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            customUndo();
          }}
          disabled={historyIndex <= 0}
        >
          <Undo className="size-4" strokeWidth={1.5} />
        </Button>
      </CustomTooltip>
      <CustomTooltip title={__("Redo", "whizmanage")}>
        <Button
          size="xs"
          variant="ghost"
          className="h-7 w-7 p-0 rounded-md"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            customRedo();
          }}
          disabled={historyIndex >= history.length - 1}
        >
          <Redo className="size-4" strokeWidth={1.5} />
        </Button>
      </CustomTooltip>
    </div>
  );
};

export default HistoryTools;
