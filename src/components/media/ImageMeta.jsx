// src/components/media/ImageMeta.jsx
import { toast } from "@/lib/utils";
import { putApi } from "@/services/services";
import { Input } from "@components/ui/input";
import {
  Button,
  CardFooter,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";
import { Pencil, Save, Type, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { __ } from "@wordpress/i18n";
import useMediaStore from "./store/useMediaStore";

const ImageMeta = ({ image, isMainImage = false }) => {
  const [editMode, setEditMode] = useState(null); // null | 'name' | 'alt'
  const [name, setName] = useState(image.name || "");
  const [altText, setAltText] = useState(image.alt || "");
  const patchItem = useMediaStore((s) => s.patchItem);

  useEffect(() => {
    setName(image.name || "");
    setAltText(image.alt || "");
  }, [image.name, image.alt]);

  const updateImageName = async () => {
    const oldName = image.name;

    // Optimistic update - עדכון מיידי של ה-UI
    patchItem(image.id, { name });
    setEditMode(null);

    try {
      await putApi(`${window.siteUrl}/wp-json/wp/v2/media/${image.id}/`, {
        title: name,
      });
    } catch (error) {
      // Rollback on error
      patchItem(image.id, { name: oldName });
      setName(oldName);
      console.error("Error updating name:", error);
      toast.error(__("Failed to update name", "whizmanage"));
    }
  };

  const updateImageAlt = async () => {
    const oldAlt = image.alt;

    // Optimistic update - עדכון מיידי של ה-UI
    patchItem(image.id, { alt: altText });
    setEditMode(null);

    try {
      await putApi(`${window.siteUrl}/wp-json/wp/v2/media/${image.id}/`, {
        alt_text: altText,
      });
    } catch (error) {
      // Rollback on error
      patchItem(image.id, { alt: oldAlt });
      setAltText(oldAlt);
      console.error("Error updating alt text:", error);
      toast.error(__("Failed to update alt text", "whizmanage"));
    }
  };

  const handleSave = () => {
    if (editMode === "name") {
      updateImageName();
    } else if (editMode === "alt") {
      updateImageAlt();
    }
  };

  const placeholder = editMode === "alt"
    ? __("Enter alt text...", "whizmanage")
    : __("Enter name...", "whizmanage");

  return (
    <CardFooter className="justify-between gap-2 bg-black/30 border-white/20 border-1 overflow-hidden py-1 absolute bottom-0 w-full shadow-small z-10">
      {editMode ? (
        <Input
          type="text"
          value={editMode === "alt" ? altText : name}
          placeholder={placeholder}
          onFocus={(event) => event.target.select()}
          onChange={(event) => {
            if (editMode === "alt") {
              setAltText(event.target.value);
            } else {
              setName(event.target.value);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSave();
            } else if (e.key === "Escape") {
              setEditMode(null);
            }
          }}
          autoFocus
          className="!border-none !ring-0 dark:!text-slate-300 focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0 z-50"
        />
      ) : (
        <p className="text-tiny text-white/80 truncate">{name}</p>
      )}

      {editMode ? (
        <Button
          className="text-tiny text-white bg-transparent"
          variant="flat"
          color="default"
          radius="sm"
          size="sm"
          isIconOnly
          onClick={handleSave}
        >
          <Save className="w-4" />
        </Button>
      ) : isMainImage ? (
        <Dropdown placement="top-end">
          <DropdownTrigger>
            <Button
              className="text-tiny text-white bg-transparent"
              variant="flat"
              color="default"
              radius="sm"
              size="sm"
              isIconOnly
            >
              <Pencil className="w-4" />
            </Button>
          </DropdownTrigger>
          <DropdownMenu
            aria-label="Edit options"
            onAction={(key) => setEditMode(String(key))}
          >
            <DropdownItem
              key="name"
              startContent={<FileText className="w-4 h-4" />}
            >
              {__("Edit name", "whizmanage")}
            </DropdownItem>
            <DropdownItem
              key="alt"
              startContent={<Type className="w-4 h-4" />}
            >
              {__("Edit alt text", "whizmanage")}
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      ) : (
        <Button
          className="text-tiny text-white bg-transparent"
          variant="flat"
          color="default"
          radius="sm"
          size="sm"
          isIconOnly
          onClick={() => setEditMode("name")}
        >
          <Pencil className="w-4" />
        </Button>
      )}
    </CardFooter>
  );
};

export default ImageMeta;
