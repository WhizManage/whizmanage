// src/layout/editor/components/Toolbar/TextFormatting.jsx
import CustomTooltip from "@components/ui/nextUI/Tooltip";
import { ToggleGroup, ToggleGroupItem } from "@components/ui/toggle-group";
import { Bold, Italic, Underline } from "lucide-react";
 import { __ } from "@wordpress/i18n";

const TextFormatting = ({ activeTextValues, execCommand }) => {
   

  return (
    <ToggleGroup
      type="multiple"
      variant="ghost"
      size="xs"
      value={activeTextValues}
      className="h-7"
    >
      <CustomTooltip title={__("Bold", "whizmanage")}>
        <ToggleGroupItem
          value="bold"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            execCommand("bold");
          }}
          aria-label={__("Bold", "whizmanage")}
          className="h-7 w-7 p-0 rounded-md"
          data-state={activeTextValues.includes("bold") ? "on" : "off"}
        >
          <Bold className="size-4" strokeWidth={1.5} />
        </ToggleGroupItem>
      </CustomTooltip>
      <CustomTooltip title={__("Italic", "whizmanage")}>
        <ToggleGroupItem
          value="italic"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            execCommand("italic");
          }}
          aria-label={__("Italic", "whizmanage")}
          className="h-7 w-7 p-0 rounded-md"
          data-state={activeTextValues.includes("italic") ? "on" : "off"}
        >
          <Italic className="size-4" strokeWidth={1.5} />
        </ToggleGroupItem>
      </CustomTooltip>
      <CustomTooltip title={__("Underline", "whizmanage")}>
        <ToggleGroupItem
          value="underline"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            execCommand("underline");
          }}
          aria-label={__("Underline", "whizmanage")}
          className="h-7 w-7 p-0 rounded-md"
          data-state={activeTextValues.includes("underline") ? "on" : "off"}
        >
          <Underline className="size-4" strokeWidth={1.5} />
        </ToggleGroupItem>
      </CustomTooltip>
    </ToggleGroup>
  );
};

export default TextFormatting;
