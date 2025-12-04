// src/components/RichEditor/components/Toolbar/InsertTools.jsx
import { __ } from '@wordpress/i18n';
import { Link, Image, Table, Minus, Video } from "lucide-react";
import { Button } from "@components/ui/button";
import CustomTooltip from "@components/nextUI/Tooltip";
import UploadImages from "./UploadImages";

const InsertTools = ({
  insertLink,
  insertImage,
  insertTable,
  handleImageUpload,
  execCommand,
  insertVideo,
}) => {
   

  return (
    <div className="flex items-center gap-0.5">
      <CustomTooltip title={__("Insert Link", "whizmanage")}>
        <Button
          size="xs"
          variant="ghost"
          className="h-7 w-7 p-0 rounded-md"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            insertLink();
          }}
        >
          <Link className="size-4" strokeWidth={1.5} />
        </Button>
      </CustomTooltip>
      <CustomTooltip title={__("Insert Image", "whizmanage")}>
        <Button
          size="xs"
          variant="ghost"
          className="h-7 w-7 p-0 rounded-md"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            insertImage();
          }}
        >
          <Image className="size-4" strokeWidth={1.5} />
        </Button>
      </CustomTooltip>
      <CustomTooltip title={__("Upload Image", "whizmanage")}>
        <UploadImages handleImageUpload={handleImageUpload} />
      </CustomTooltip>
      <CustomTooltip title={__("Insert Video", "whizmanage")}>
        <Button
          size="xs"
          variant="ghost"
          className="h-7 w-7 p-0 rounded-md"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            insertVideo(); 
          }}
        >
          <Video className="size-4" strokeWidth={1.5} />
        </Button>
      </CustomTooltip>
      <CustomTooltip title={__("Insert Table", "whizmanage")}>
        <Button
          size="xs"
          variant="ghost"
          className="h-7 w-7 p-0 rounded-md"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            insertTable();
          }}
        >
          <Table className="size-4" strokeWidth={1.5} />
        </Button>
      </CustomTooltip>
      <CustomTooltip title={__("Insert Horizontal Line", "whizmanage")}>
        <Button
          size="xs"
          variant="ghost"
          className="h-7 w-7 p-0 rounded-md"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            execCommand("insertHorizontalRule");
          }}
        >
          <Minus className="size-4" strokeWidth={1.5} />
        </Button>
      </CustomTooltip>
    </div>
  );
};

export default InsertTools;
