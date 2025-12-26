// src/components/media/ImageName.jsx
import { toast } from "@/lib/utils";
import { putApi } from "@/services/services";
import { Input } from "@components/ui/input";
import { Button, CardFooter } from "@heroui/react";
import { Pencil, Save } from "lucide-react";
import { useEffect, useState } from "react";
 import { __ } from "@wordpress/i18n";
import useMediaStore from "./store/useMediaStore";

const ImageName = ({ image }) => {
   
  const [isEditName, setIsEditName] = useState(false);
  const [name, setName] = useState(image.name);
  const patchItem = useMediaStore((s) => s.patchItem);

  useEffect(() => {
    setName(image.name);
  }, [image.name]);

  const updateImageName = async (id) => {
    try {
      await putApi(`${window.siteUrl}/wp-json/wp/v2/media/${id}/`, {
        title: name,
      });

      // עדכון מיידי ב־store ובקאש כך שה־UI יתעדכן בלי רענון
      patchItem(id, { name });

      toast.success(__("The image has been successfully edited", "whizmanage"));
    } catch (error) {
      console.error("Error editing image name:", error);
      toast.error(__("Failed to edit image name", "whizmanage"));
    }
  };

  return (
    <CardFooter className="justify-between gap-2 bg-black/30 border-white/20 border-1 overflow-hidden py-1 absolute bottom-0 w-full shadow-small z-10">
      {isEditName ? (
        <Input
          type="text"
          defaultValue={image.name}
          onFocus={(event) => {
            event.target.select();
          }}
          onChange={(event) => {
            setName(event.target.value);
          }}
          className="!border-none !ring-0 dark:!text-slate-300 focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0 z-50"
        />
      ) : (
        <p className="text-tiny text-white/80 truncate">{name}</p>
      )}

      <Button
        className="text-tiny text-white bg-transparent"
        variant="flat"
        color="default"
        radius="sm"
        size="sm"
        isIconOnly
        onClick={() => {
          if (isEditName) updateImageName(image.id);
          setIsEditName((prev) => !prev);
        }}
      >
        {isEditName ? <Save className="w-4" /> : <Pencil className="w-4" />}
      </Button>
    </CardFooter>
  );
};

export default ImageName;
