// src/components/RichEditor/components/Toolbar/ViewTools.jsx
import React from "react";
import { __ } from '@wordpress/i18n';
import { Printer, Eye, Code, Maximize, Minimize2 } from "lucide-react";
import { Button } from "@components/ui/button";
import CustomTooltip from "@components/nextUI/Tooltip";

const ViewTools = ({
  printContent,
  togglePreview,
  toggleFullScreen,
  isPreview,
  isFullScreen,
  showMoreButton,
}) => {
   

  return (
    <div className="flex items-center gap-1">
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
      {!showMoreButton && (
        <CustomTooltip
          title={isFullScreen ? __("Exit Full Screen", "whizmanage") : __("Full Screen", "whizmanage")}
        >
          <Button
            size="xs"
            variant="ghost"
            className="h-7 w-7 p-0 rounded-md"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              toggleFullScreen();
            }}
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
