import { IconBadge } from "@components/IconBadge";
import { Label } from "@components/ui/label";
import { Card, CardBody, CardFooter } from "@heroui/react";
import { Image, X } from "lucide-react";
import { useEffect, useState } from "react";
import ImageEdit from "../../../table/edit/Image/ImageEdit";
import MediaClient from "../../../table/edit/gallery/MediaClient";
import { getApi } from "/src/services/services";
import { __ } from '@wordpress/i18n';

const PhotosGroup = ({ updateValue }) => {
  const [image, setImage] = useState({});
  const [clientImages, setClientImages] = useState([]);
  const [searchImg, setSearchImg] = useState("");
  const [UpdateUI, setUpdateUI] = useState(false);
  const [galleryImages, setGalleryImages] = useState([]);
   
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const wordpressApiEndpoint = `${window.siteUrl}/wp-json/wp/v2/media?search=${searchImg}&per_page=100`;
    getApi(wordpressApiEndpoint)
      .then((response) => {
        const fetchedImages = response.data
          .filter((image) => image.media_type === "image")
          .map((image) => ({
            id: image.id,
            src: image.source_url,
            name: image.title.rendered,
          }));
        setClientImages(fetchedImages);
        setTotalPages(parseInt(response.headers["x-wp-totalpages"], 10));
        setTotalItems(parseInt(response.headers["x-wp-total"], 10));
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching images from WordPress API:", error);
        setLoading(false);
      });
  }, [searchImg]);

  useEffect(() => {
    const combineImages = [image, ...galleryImages];
    updateValue("images", combineImages);
  }, [image, galleryImages]);

  const removeImageFromGallery = (imageToRemove) => {
    setGalleryImages(
      galleryImages.filter((image) => image.id !== imageToRemove.id)
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-x-2">
        <IconBadge icon={Image} />
        <h2 className="text-xl dark:text-gray-400">{__("Product image & Gallery", "whizmanage")}</h2>
      </div>
      <div className="flex flex-col w-full gap-1.5">
        <Label htmlFor="email">{__("Product image", "whizmanage")}</Label>
        <ImageEdit setImage={setImage} />
      </div>
      <div className="flex flex-col w-full gap-1.5">
        <Label htmlFor="email">{__("Product gallery", "whizmanage")}</Label>
        <div className="gap-2 grid grid-cols-2 xs:max-md:grid-cols-3 lg:grid-cols-3">
          <MediaClient
            clientImages={clientImages}
            galleryImages={galleryImages}
            setGalleryImages={setGalleryImages}
            setUpdateUI={setUpdateUI}
            setClientImages={setClientImages}
            setSearchImg={setSearchImg}
            form
            page={page}
            setPage={setPage}
            totalPages={totalPages}
            totalItems={totalItems}
            loading={loading}
          />
          {galleryImages.map((item, index) => (
            <Card shadow="sm" key={index} isPressable>
              <CardBody className="overflow-visible p-0 relative group">
                <img
                  alt={item.name}
                  className="w-full object-cover h-[140px]"
                  src={item.src}
                />
                <div className="absolute right-0 top-0 w-fit h-fit overflow-visible">
                  <div
                    className="w-6 h-6 rounded-full bg-fuchsia-600 text-white hidden group-hover:block"
                    onClick={() => removeImageFromGallery(item)}
                  >
                    <X />
                  </div>
                </div>
              </CardBody>
              <CardFooter className="text-small justify-between">
                <b className="truncate !line-clamp-1">{item.name}</b>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PhotosGroup;
