// src/layout/editor/components/Toolbar/AlignmentTools.jsx
import CustomTooltip from "@components/ui/nextUI/Tooltip";
import { ToggleGroup, ToggleGroupItem } from "@components/ui/toggle-group";
import { AlignCenter, AlignJustify, AlignLeft, AlignRight } from "lucide-react";
 import { __ } from "@wordpress/i18n";

const AlignmentTools = ({ activeAlignValue, execCommand, focusEditor }) => {
   

  return (
    <ToggleGroup
      type="single"
      variant="ghost"
      size="xs"
      value={activeAlignValue}
      className="h-7"
    >
      {/* Align Left */}
      <CustomTooltip title={__("Align Left", "whizmanage")}>
        <ToggleGroupItem
          value="left"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            try {
              focusEditor?.();
            } catch {}
            execCommand("justifyLeft");
          }}
          aria-label={__("Align Left", "whizmanage")}
          className="h-7 w-7 p-0 rounded-md"
          data-state={activeAlignValue === "left" ? "on" : "off"}
        >
          <AlignLeft className="size-4" strokeWidth={1.5} />
        </ToggleGroupItem>
      </CustomTooltip>
      {/* Align Center */}
      <CustomTooltip title={__("Align Center", "whizmanage")}>
        <ToggleGroupItem
          value="center"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            try {
              focusEditor?.();
            } catch {}
            execCommand("justifyCenter");
          }}
          aria-label={__("Align Center", "whizmanage")}
          className="h-7 w-7 p-0 rounded-md"
          data-state={activeAlignValue === "center" ? "on" : "off"}
        >
          <AlignCenter className="size-4" strokeWidth={1.5} />
        </ToggleGroupItem>
      </CustomTooltip>
      {/* Align Right */}
      <CustomTooltip title={__("Align Right", "whizmanage")}>
        <ToggleGroupItem
          value="right"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            try {
              focusEditor?.();
            } catch {}
            execCommand("justifyRight");
          }}
          aria-label={__("Align Right", "whizmanage")}
          className="h-7 w-7 p-0 rounded-md"
          data-state={activeAlignValue === "right" ? "on" : "off"}
        >
          <AlignRight className="size-4" strokeWidth={1.5} />
        </ToggleGroupItem>
      </CustomTooltip>
      {/* Justify */}
      <CustomTooltip title={__("Justify", "whizmanage")}>
        <ToggleGroupItem
          value="justify"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            try {
              focusEditor?.();
            } catch {}
            execCommand("justifyFull");
          }}
          aria-label={__("Justify", "whizmanage")}
          className="h-7 w-7 p-0 rounded-md"
          data-state={activeAlignValue === "justify" ? "on" : "off"}
        >
          <AlignJustify className="size-4" strokeWidth={1.5} />
        </ToggleGroupItem>
      </CustomTooltip>
    </ToggleGroup>
  );
};

export default AlignmentTools;
