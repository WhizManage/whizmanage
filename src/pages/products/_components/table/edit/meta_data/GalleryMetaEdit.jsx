import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@components/ui/carousel";
import {
  Avatar,
  AvatarGroup,
  Button,
  Card,
  CardHeader,
  Image,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  useDisclosure,
} from "@heroui/react";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getApi } from "/src/services/services";

import { postApi } from "@/services/services";
import { __ } from '@wordpress/i18n';
import ImageName from "../gallery/ImageName";
import MediaClient from "../gallery/MediaClient";

const GalleryMetaEdit = ({ row, handleInputChange, edit }) => {
  const normalizeGalleryData = (data) => {
    if (!data) {
      return [];
    }
    // בדיקה אם הנתונים הם כבר מערך של אובייקטים
    if (typeof data === "object" && data !== null) {
      const updatedData = data.map((item) => ({
        ...item,
        src: item.url, // העתקת הערך של url ל-src
      }));
      return updatedData.map(({ url, ...rest }) => rest); // מחזיר את המערך עם src ומסיר את url
    }

    // אם הנתונים הם מחרוזת של מזהים
    if (typeof data === "string" && row.format === "id") {
      const ids = data.split(",").map((id) => id.trim());

      // עיבוד הנתונים כבקשת GET
      const fetchImageLinks = async () => {
        try {
          const results = await Promise.all(
            ids.map(async (id) => {
              const response = await fetch(
                window.siteUrl + `/wp-json/wp/v2/media/${id}`
              );
              if (!response.ok) {
                throw new Error(`Failed to fetch media for ID: ${id}`);
              }
              const mediaData = await response.json();
              return {
                id: Number(id), // המרת המזהה למספר
                src: mediaData.link || null, // חילוץ הקישור של התמונה
              };
            })
          );
          return results; // החזרת התוצאות
        } catch (error) {
          console.error("Error fetching media data:", error);
          return [];
        }
      };

      return fetchImageLinks();
    }
    // אם הנתונים הם מחרוזת של URLs
    if (typeof data === "string" && row.format == "url") {
      if (!data) {
        return [];
      }
      const urls = data.split(",").map((url) => url.trim());

      // פונקציה פנימית לאזור האסינכרוני בלבד
      const fetchMediaData = async () => {
        const endpoint = `${window.siteUrl}/wp-json/whizmanage/v1/media-by-url`;

        try {
          const response = await postApi(endpoint, { urls });

          if (!response || response.status !== 200) {
            console.error(
              `Failed to fetch media data. Status: ${response?.status || "unknown"}`
            );
            return [];
          }

          const results = response.data; // postApi מחזירה את הנתונים בתוך data
          if (!Array.isArray(results)) {
            console.error("Unexpected response format:", results);
            return [];
          }
          return results.map((item) => ({
            id: item.id || "unknown", // מזהה או "unknown" אם לא נמצא
            src: item.src, // כתובת ה-URL
          }));
        } catch (error) {
          console.error("Error during fetch operation:", error);
          return [];
        }
      };

      return fetchMediaData();
    }

    // ברירת מחדל - מחזיר מערך ריק אם הנתונים לא תואמים
    return [];
  };

  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [clientImages, setClientImages] = useState([]);
  const [galleryImages, setGalleryImages] = useState([]);
  const [searchImg, setSearchImg] = useState("");
  const [UpdateUI, setUpdateUI] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
   

  const denormalizeGalleryData = (normalizedData) => {
    if (Array.isArray(normalizedData) && row.format === "both") {
      // שחזור למערך אובייקטים
      return normalizedData.map((item) => ({
        id: item.id,
        url: item.src || "", // העתקת src ל-url
      }));
    }

    if (Array.isArray(normalizedData) && row.format == "id") {
      // שחזור למחרוזת מזהים
      return normalizedData.map((item) => item.id).join(",");
    }

    if (Array.isArray(normalizedData) && row.format === "url") {
      // שחזור למחרוזת URLs
      return normalizedData.map((item) => item.src).join(",");
    }

    // אם אין סוג קלט מוגדר או normalizedData אינו מערך, מחזירים ריק
    console.error("Invalid normalizedData:", normalizedData);
    return [];
  };

  useEffect(() => {
    if (edit && isOpen) {
      setLoading(true);
      const wordpressApiEndpoint = `${window.siteUrl}/wp-json/wp/v2/media?search=${searchImg}&per_page=100&page=${page}`;
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
    }
  }, [searchImg, page, isOpen]);

  useEffect(() => {
    if (edit) {
      handleInputChange(row.key, denormalizeGalleryData(galleryImages));
    }
  }, [galleryImages]);

  useEffect(() => {
    const fetchGalleryImages = async () => {
      try {
        const data = await normalizeGalleryData(row.value);

        setGalleryImages(data);
      } catch (error) {
        console.error("Error fetching initial gallery images:", error);
      }
    };

    fetchGalleryImages();
    // setGalleryImages(normalizeGalleryData(row.value));
  }, []);

  const handleRemoveImage = (id) => {
    setGalleryImages(galleryImages.filter((image) => image.id !== id));
  };

  return (
    <>
      {!edit ? (
        <>
          {row.value ? (
            <Carousel className="w-full max-h-14">
              <CarouselContent>
                {galleryImages.map((image, index) => (
                  <CarouselItem key={index}>
                    <div className="flex items-center w-full justify-center p-1 h-14 bg-transparent">
                      <img
                        src={image.src}
                        className="max-h-full object-contain !mix-blend-hard-light rounded"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          ) : (
            <div className="flex items-center w-full justify-center p-0 h-14 bg-transparent text-slate-300">
              {__("No images", "whizmanage")}
            </div>
          )}
        </>
      ) : (
        <>
          <Button
            onPress={onOpen}
            variant="light"
            className="p-2 h-fit w-fit flex justify-center items-center mx-auto"
          >
            <AvatarGroup isBordered max={3} radius="sm">
              {galleryImages.length > 0 ? (
                galleryImages.map((image, index) => (
                  <Avatar src={image.src} key={index} radius="sm" isBordered />
                ))
              ) : (
                <div className="dark:bg-slate-600">{__("Add Images", "whizmanage")}</div>
              )}
            </AvatarGroup>
          </Button>
          <Modal
            size="3xl"
            backdrop="opaque"
            placement="top-center"
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            motionProps={{
              variants: {
                enter: {
                  y: 0,
                  opacity: 1,
                  transition: {
                    duration: 0.3,
                    ease: "easeOut",
                  },
                },
                exit: {
                  y: -20,
                  opacity: 0,
                  transition: {
                    duration: 0.2,
                    ease: "easeIn",
                  },
                },
              },
            }}
            classNames={{
              backdrop:
                "bg-gradient-to-t from-zinc-900 to-zinc-900/10 backdrop-opacity-20",
            }}
          >
            <ModalContent className="dark:bg-slate-800">
              {(onClose) => (
                <>
                  <ModalHeader className="flex flex-col gap-1 text-center text-3xl text-gray-400">
                    {__("Edit Gallery", "whizmanage")}
                  </ModalHeader>
                  <ModalBody className="">
                    <div className="flex w-full flex-col items-center">
                      <div className="!h-[500px] overflow-y-scroll">
                        <div className="flex flex-wrap gap-4 justify-center ">
                          {galleryImages.length > 0 ? (
                            galleryImages.map((image, index) => (
                              <Card
                                key={index}
                                isFooterBlurred
                                radius="md"
                                className="border-none max-h-fit !bg-slate-100 dark:bg-slate-700"
                              >
                                <CardHeader className="absolute z-10 top-0 flex-col !items-end">
                                  <Button
                                    className="text-tiny text-fuchsia-600 bg-white/50"
                                    variant="flat"
                                    color="default"
                                    radius="sm"
                                    size="sm"
                                    isIconOnly
                                    onClick={() => handleRemoveImage(image.id)}
                                  >
                                    <Trash2 className="w-4" />
                                  </Button>
                                </CardHeader>
                                <div className="!w-[223px] !h-[223px] overflow-hidden image-container">
                                  <Image
                                    alt="Woman listing to music"
                                    className="object-contain z-0"
                                    src={image.src}
                                  />
                                </div>
                                <ImageName image={image} />
                              </Card>
                            ))
                          ) : (
                            <div className="flex items-center text-xl w-full justify-center p-0 h-14 bg-transparent text-slate-300">
                              {__("No images", "whizmanage")}
                            </div>
                          )}
                          <MediaClient
                            clientImages={clientImages}
                            galleryImages={galleryImages}
                            setGalleryImages={setGalleryImages}
                            setUpdateUI={setUpdateUI}
                            setClientImages={setClientImages}
                            setSearchImg={setSearchImg}
                            page={page}
                            setPage={setPage}
                            totalPages={totalPages}
                            totalItems={totalItems}
                            loading={loading}
                          />
                        </div>
                      </div>
                    </div>
                  </ModalBody>
                  <ModalFooter>
                    <Button color="primary" onPress={onClose}>
                      {__("Save", "whizmanage")}
                    </Button>
                  </ModalFooter>
                </>
              )}
            </ModalContent>
          </Modal>
        </>
      )}
    </>
  );
};

export default GalleryMetaEdit;
