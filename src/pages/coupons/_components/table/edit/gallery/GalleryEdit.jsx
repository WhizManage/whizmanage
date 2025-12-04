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
import ImageName from "./ImageName";
import MediaClient from "./MediaClient";
import { getApi } from "/src/services/services";

import { __ } from '@wordpress/i18n';

const GalleryEdit = ({ row }) => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [clientImages, setClientImages] = useState([]);
  const [galleryImages, setGalleryImages] = useState(
    row.original.images.slice(1)
  );
  const [searchImg, setSearchImg] = useState("");
  const [UpdateUI, setUpdateUI] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
   
  useEffect(() => {
    if (isOpen) {
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
  }, [searchImg, page,isOpen]);

  useEffect(() => {
    // בדיקה אם יש תמונה ראשית
    if (row.original.images.length > 0) {
      const mainImage = row.original.images[0];
      row.original.images = [mainImage, ...galleryImages];
    } else {
      row.original.images = galleryImages;
    }
  }, [galleryImages]);

  const handleRemoveImage = (id) => {
    setGalleryImages(galleryImages.filter((image) => image.id !== id));
  };

  return (
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
  );
};

export default GalleryEdit;
