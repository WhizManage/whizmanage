// src/components/media/ImageAlt.jsx
import { toast } from "@/lib/utils";
import { putApi } from "@/services/services";
import { Input } from "@components/ui/input";
import { Button, CardFooter } from "@heroui/react";
import { Pencil, Save, Type } from "lucide-react";
import { useEffect, useState } from "react";
import { __ } from "@wordpress/i18n";
import useMediaStore from "./store/useMediaStore";

const ImageAlt = ({ image }) => {
  const [isEditAlt, setIsEditAlt] = useState(false);
  const [altText, setAltText] = useState(image.alt || "");
  const patchItem = useMediaStore((s) => s.patchItem);

  useEffect(() => {
    setAltText(image.alt || "");
  }, [image.alt]);

  const updateImageAlt = async (id) => {
    try {
      await putApi(`${window.siteUrl}/wp-json/wp/v2/media/${id}/`, {
        alt_text: altText,
      });

      // עדכון מיידי ב־store ובקאש
      patchItem(id, { alt: altText });

      toast.success(__("Alt text updated successfully", "whizmanage"));
    } catch (error) {
      console.error("Error updating alt text:", error);
      toast.error(__("Failed to update alt text", "whizmanage"));
    }
  };

  return (
    <CardFooter className="justify-between gap-2 bg-fuchsia-600/80 border-white/20 border-1 overflow-hidden py-1 absolute bottom-7 w-full shadow-small z-10">
      {isEditAlt ? (
        <Input
          type="text"
          value={altText}
          placeholder={__("Enter alt text...", "whizmanage")}
          onFocus={(event) => {
            event.target.select();
          }}
          onChange={(event) => {
            setAltText(event.target.value);
          }}
          className="!border-none !ring-0 dark:!text-slate-100 !text-white placeholder:text-white/60 focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0 z-50 bg-transparent"
        />
      ) : (
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <Type className="w-3 h-3 text-white/80 flex-shrink-0" />
          <p className="text-tiny text-white/90 truncate">
            {altText || __("Add alt...", "whizmanage")}
          </p>
        </div>
      )}

      <Button
        className="text-tiny text-white bg-transparent"
        variant="flat"
        color="default"
        radius="sm"
        size="sm"
        isIconOnly
        onClick={() => {
          if (isEditAlt) updateImageAlt(image.id);
          setIsEditAlt((prev) => !prev);
        }}
      >
        {isEditAlt ? <Save className="w-4" /> : <Pencil className="w-4" />}
      </Button>
    </CardFooter>
  );
};

export default ImageAlt;
