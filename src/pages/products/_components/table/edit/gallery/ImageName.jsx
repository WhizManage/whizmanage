import { Input } from "@components/ui/input";
import { Button, CardFooter } from "@heroui/react";
import axios from "axios";
import { CheckCircle, Pencil, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const ImageName = ({ image }) => {
  const [isEditName, setIsEditName] = useState(false);
  const [name, setName] = useState(image.name);

  useEffect(() => {
    setName(image.name);
  }, [image.name]);

  const UpdateImageMane = (id) => {
    const wordpressApiEndpoint = `${window.siteUrl}/wp-json/wp/v2/media/${id}/`;
    axios
      .post(
        wordpressApiEndpoint,
        { title: name },
        {
          headers: {
            "Content-Type": "application/json",
            "X-WP-Nonce": window.rest,
          },
        }
      )
      .then((response) => {
        toast(
          <div className="p-4 w-full h-full !border-l-4 !border-l-fuchsia-600 dark:bg-slate-800 dark:text-slate-300 rounded-md flex gap-4 items-center justify-start">
            <CheckCircle className="w-5 h-5 text-fuchsia-600" />
            {__("The image has been successfully edited", "whizmanage")}
          </div>,
          { duration: 5000 }
        );
      })
      .catch((error) => {
        console.error(
          "Error image name editing:",
          error?.response?.data?.message || error || "Unknown error occurred"
        );
      });
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
          isEditName && UpdateImageMane(image.id);
          setIsEditName((prev) => !prev);
        }}
      >
        {isEditName ? <Save className="w-4" /> : <Pencil className="w-4" />}
      </Button>
    </CardFooter>
  );
};

export default ImageName;
