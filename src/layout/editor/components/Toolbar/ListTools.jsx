// src/components/RichEditor/components/Toolbar/ListTools.jsx
import React from "react";
import { __ } from '@wordpress/i18n';
import { List, ListOrdered } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@components/ui/toggle-group";

const ListTools = ({ activeListValues, execCommand }) => {
   

  return (
    <div className="">
      <ToggleGroup
        type="multiple"
        variant="ghost"
        size="xs"
        value={activeListValues}
        className="h-7"
      >
        <ToggleGroupItem
          value="bullet"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            execCommand("insertUnorderedList");
          }}
          aria-label={__("Bulleted List", "whizmanage")}
          className="h-7 w-7 p-0 rounded-md"
          data-state={activeListValues.includes("bullet") ? "on" : "off"}
        >
          <List className="size-4" strokeWidth={1.5} />
        </ToggleGroupItem>

        <ToggleGroupItem
          value="number"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            execCommand("insertOrderedList");
          }}
          aria-label={__("Numbered List", "whizmanage")}
          className="h-7 w-7 p-0 rounded-md"
          data-state={activeListValues.includes("number") ? "on" : "off"}
        >
          <ListOrdered className="size-4" strokeWidth={1.5} />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
};

export default ListTools;
