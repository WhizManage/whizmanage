import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@components/ui/hover-card";
import { IconBadge } from "@components/IconBadge";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select";
import { Switch } from "@components/ui/switch";
import { Checkbox } from "@heroui/react";
import { ChevronDown, ChevronUp, Info, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { __ } from '@wordpress/i18n';
import HtmlEditor from "../../../../../../layout/editor/HtmlEditor";
import GalleryMetaEdit from "../../../table/edit/meta_data/GalleryMetaEdit";
import ImageMetaEdit from "../../../table/edit/meta_data/ImageMetaEdit";

const CustomFieldsGroup = ({ updateValue }) => {
   
  const [isOpen, setIsOpen] = useState(false);
  const [fieldValues, setFieldValues] = useState({});
  const customMetaData = window?.WhizManageCustomFields;
  

  useEffect(() => {
    if (customMetaData && customMetaData.length > 0) {
      const initialValues = {};
      customMetaData.forEach((field) => {
        if (field.value) {
          const decodedValue = field.value
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, "&");
          initialValues[field.key] = decodedValue;
        }
      });
      setFieldValues(initialValues);

      if (Object.keys(initialValues).length > 0) {
        const metaData = Object.entries(initialValues).map(([key, value]) => ({
          key,
          value,
        }));
        updateValue("meta_data", metaData);
      }
    }
  }, [customMetaData]);

  const handleFieldChange = (fieldKey, newValue) => {
    const updatedValues = {
      ...fieldValues,
      [fieldKey]: newValue,
    };
    setFieldValues(updatedValues);

    const metaData = Object.entries(updatedValues)
      .filter(
        ([key, value]) => value !== "" && value !== null && value !== undefined
      )
      .map(([key, value]) => ({
        key,
        value,
      }));

    updateValue("meta_data", metaData);
  };

  const handleImageChange = (fieldKey, imageData) => {
    const imageValue = imageData?.src || imageData?.id || "";
    handleFieldChange(fieldKey, imageValue);
  };

  const renderField = (field) => {
    const currentValue = fieldValues[field.key] || "";

    switch (field.type) {
      case "text":
        return (
          <div className="relative h-10 border rounded-lg flex gap-1 items-center px-1 dark:bg-slate-700">
            <Input
              type="text"
              id={field.key}
              placeholder={__(field.label, "whizmanage")}
              value={currentValue}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              onFocus={(event) => event.target.select()}
              className="!border-none dark:!text-slate-300 !ring-0 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0"
            />
          </div>
        );

      case "textarea":
        return (
          <div className="relative border rounded-lg dark:bg-slate-700">
            <textarea
              id={field.key}
              placeholder={__(field.label, "whizmanage")}
              value={currentValue}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              rows={4}
              className="w-full p-3 bg-transparent border-none resize-none dark:text-slate-300 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base focus:outline-none focus:ring-0"
            />
          </div>
        );

      case "number":
        return (
          <div className="relative h-10 border rounded-lg flex gap-1 items-center px-1 dark:bg-slate-700">
            <Input
              type="number"
              id={field.key}
              placeholder={field.label}
              value={currentValue}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              onFocus={(event) => event.target.select()}
              className="!border-none dark:!text-slate-300 !ring-0 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0"
            />
          </div>
        );

      case "date":
        return (
          <div className="relative h-10 border rounded-lg flex gap-1 items-center px-1 dark:bg-slate-700">
            <Input
              type="date"
              id={field.key}
              value={currentValue}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              className="!border-none dark:!text-slate-300 !ring-0 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0"
            />
          </div>
        );

      case "select":
        return (
          <Select
            value={currentValue}
            onValueChange={(value) => handleFieldChange(field.key, value)}
          >
            <SelectTrigger className="h-10 dark:bg-slate-700 dark:hover:!bg-slate-600">
              <SelectValue placeholder={`${__("Select", "whizmanage")} ${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(field.choices || {}).map(([key, value]) => (
                <SelectItem key={key} value={key}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "checkbox":
        return (
          <div className="flex items-center gap-2 p-2">
            <Checkbox
              id={field.key}
              isSelected={currentValue === "1"}
              onValueChange={(isSelected) =>
                handleFieldChange(field.key, isSelected ? "1" : "0")
              }
              color="primary"
              classNames={{
                label: "text-base text-muted-foreground font-extralight",
              }}
            >
              {field.label}
            </Checkbox>
          </div>
        );

      case "switcher":
        return (
          <div className="flex items-center gap-2 p-2">
            <Switch
              id={field.key}
              checked={currentValue === "1"}
              onCheckedChange={(checked) =>
                handleFieldChange(field.key, checked ? "1" : "0")
              }
            />
            <Label
              htmlFor={field.key}
              className="text-sm text-muted-foreground"
            >
              {currentValue === "1" ? __("Enabled", "whizmanage") : __("Disabled", "whizmanage")}
            </Label>
          </div>
        );

      case "wysiwyg":
        return (
          <div className="relative border rounded-xl overflow-hidden dark:bg-slate-700">
            <HtmlEditor
              key={field.key}
              initialContent={currentValue}
              onSave={(content) => handleFieldChange(field.key, content)}
              height="200px"
            />
          </div>
        );

      case "image":
        return (
          <div className="w-full">
            <ImageMetaEdit
              row={{ ...field, value: currentValue }}
              handleInputChange={handleFieldChange}
              edit={true}
              isColumn={false}
            />
          </div>
        );

      case "media":
        return (
          <div className="w-full">
            <ImageMetaEdit
              row={{ ...field, value: currentValue }}
              handleInputChange={handleFieldChange}
              edit={true}
              isColumn={false}
            />
          </div>
        );

      case "gallery":
        return (
          <div className="w-full">
            <GalleryMetaEdit
              row={{ ...field, value: currentValue }}
              handleInputChange={handleFieldChange}
              edit={true}
            />
          </div>
        );
      
      default:
        return (
          <div className="p-3 border rounded-lg bg-slate-100 dark:bg-slate-800 text-sm text-muted-foreground">
            {__("Unsupported field type", "whizmanage")}: {field.type}
          </div>
        );
    }
  };

  if (!customMetaData || customMetaData.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-x-2">
          <IconBadge icon={Settings2} />
          <h2 className="text-xl dark:text-gray-400">{__("Custom Fields", "whizmanage")}</h2>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg text-center text-muted-foreground">
          {__("No custom fields available", "whizmanage")}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-x-2">
        <IconBadge icon={Settings2} />
        <h2 className="text-xl dark:text-gray-400">{__("Custom Fields", "whizmanage")}</h2>
      </div>
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full flex items-center justify-between p-3 hover:bg-slate-100 dark:hover:bg-slate-800 border border-input rounded-lg"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {__("Custom Product Fields", "whizmanage")}
              </span>
              <span className="text-xs text-muted-foreground">
                ({customMetaData.length} {__("fields available", "whizmanage")})
              </span>
            </div>
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-4 pt-2">
          <div className="grid grid-cols-1 gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
          {(Array.isArray(customMetaData) ? customMetaData : []).map((field, index) => {
  try {
    // דלג אם זה לא אובייקט או אם הטייפ הוא multi-select
    if (!field || typeof field !== 'object' || field.type === 'multi-select') return null;

    const currentValue = fieldValues[field.key] || "";

    return (
      <div key={field.key || index} className="flex flex-col gap-1.5">
        <Label htmlFor={field.key}>
          {__(field.label || "", "whizmanage")}
          {field.source && (
            <span className="text-xs text-muted-foreground ml-1">
              ({field.source})
            </span>
          )}
        </Label>
        {field.help && (
          <HoverCard openDelay={300}>
            <HoverCardTrigger asChild>
              <Info className="h-4 w-4 text-blue-500 opacity-60 hover:opacity-100 cursor-pointer" />
            </HoverCardTrigger>
            <HoverCardContent
              className="max-w-xs text-sm break-words z-[9999] shadow-md p-3"
              align="start"
              avoidCollisions
              collisionPadding={10}
              sideOffset={5}
            >
              <p className="whitespace-pre-wrap break-words">
                {__(field.help || "", "whizmanage")}
              </p>
            </HoverCardContent>
          </HoverCard>
        )}
        {renderField(field)}
        {typeof field.value === "string" && field.value && (
          <div className="text-xs text-muted-foreground px-2">
            {__("Default", "whizmanage")}:{" "}
            {field.value.replace(/&quot;/g, '"').replace(/&amp;/g, "&")}
          </div>
        )}
      </div>
    );
  } catch (err) {
    console.error("❌ שגיאה בשדה:", field, err);
    return (
      <div key={index} className="p-3 bg-red-100 text-red-700 rounded">
        ⚠️ שגיאה ברינדור שדה <strong>{field?.label || "ללא תווית"}</strong>
      </div>
    );
  }
})}

          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default CustomFieldsGroup;
