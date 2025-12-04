import { CardBody, Image } from "@heroui/react";
import { Check } from "lucide-react";
import { useState } from "react";

const ImageMediaClient = ({ image, setSelectedImages, galleryClient }) => {
  const isImageSelected = galleryClient.some(
    (clientImage) => clientImage.id === image.id
  );
  const [isSelected, setIsSelected] = useState(isImageSelected);
  const handleSelected = () => {
    setIsSelected((currentIsSelected) => {
      setSelectedImages((selectedImages) => {
        if (!currentIsSelected) {
          // אם התמונה לא נבחרה עד כה, הוסף אותה למערך
          return [...selectedImages, image];
        } else {
          // אם התמונה כבר נבחרה, הסר אותה מהמערך
          return selectedImages.filter(
            (selectedImage) => selectedImage.id !== image.id
          );
        }
      });
      return !currentIsSelected;
    });
  };

  return (
    <div
      className="!w-[223px] !h-[223px] overflow-hidden image-container"
      onClick={handleSelected}
    >
      <Image
        alt={image.name}
        className="!object-cover !z-0 "
        src={image.src}
        isPressable
      />
      {isSelected && (
        <CardBody className="absolute z-10 top-0 h-full flex-col !items-center justify-center bg-black/30">
          <Check className="w-20 h-20 text-fuchsia-600" />
        </CardBody>
      )}
    </div>
  );
};

export default ImageMediaClient;
