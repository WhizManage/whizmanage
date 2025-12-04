import { IconBadge } from "@components/IconBadge";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import { LayoutList } from "lucide-react";
import { useEffect, useState } from "react";
import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";
import { __ } from '@wordpress/i18n';
import HtmlEditor from "../../../../../../layout/editor/HtmlEditor";


const convertRGBToHex = (html) => {
  return html.replace(
    /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/gi,
    (match, r, g, b) => {
      const hex = [r, g, b]
        .map((x) => {
          const hexPart = parseInt(x, 10).toString(16);
          return hexPart.length === 1 ? "0" + hexPart : hexPart;
        })
        .join("");
      return "#" + hex;
    }
  );
};



const DescriptionGroup = ({ register, updateValue, errors }) => {
   
  const [content, setContent] = useState("");
  const [initialContent, setInitialContent] = useState("");

  const renderEditor = (title, name) => {
    const handleContentUpdate = (newContent) => {
      setContent(newContent);
      updateValue(title, newContent);
    };
    useEffect(() => {
      if (content && content.includes("rgb(")) {
        const newContent = convertRGBToHex(content);
        if (newContent !== content) {
          setContent(newContent);
        }
      }
    }, [content]);
    return (
      <div className="flex flex-col w-full gap-1.5">
        <Label htmlFor="email">{__(`Product ${name}`, "whizmanage")}</Label>
        <div className="relative h-fit border rounded-xl overflow-hidden flex gap-1 items-center dark:bg-slate-700">
          <HtmlEditor
            key={initialContent}
            initialContent={content}
            onSave={handleContentUpdate}
            height="full"
          />
        </div>
      </div>
    );
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-x-2">
        <IconBadge icon={LayoutList} />
        <h2 className="text-xl dark:text-gray-400">
          {__("Describe your product", "whizmanage")}
        </h2>
      </div>
      <div className="flex flex-col w-full gap-1.5">
        <Label htmlFor="name">{__("Product Name", "whizmanage")} *</Label>
        <div className="relative h-10 border rounded-lg flex gap-1 items-center px-1 dark:bg-slate-700">
          <Input
            type="text"
            id="name"
            placeholder={__("Name", "whizmanage")}
            className="!border-none dark:!text-slate-300 !ring-0 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0"
            {...register("name", { required: __("Product name is required", "whizmanage") })}
          />
        </div>
        {errors.name && (
          <p className="text-red-500 dark:text-pink-500 text-sm px-2">
            {errors.name.message}
          </p>
        )}
      </div>
      {renderEditor("description", "Description")}
      {renderEditor("short_description", "Short description")}
    </div>
  );
};

export default DescriptionGroup;
