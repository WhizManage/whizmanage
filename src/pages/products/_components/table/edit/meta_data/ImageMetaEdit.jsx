// ImageMetaEdit.jsx — fixed to avoid `row` being undefined and to guard optional fields
// Notes:
// - Default `row = {}` and `handleInputChange = () => {}`
// - Use optional chaining for `row?.format`, `row?.value`, `row?.key`
// - When bubbling change up, fallback key to "_yoast_wpseo_opengraph-image"
// - Normalize function is async for consistent returns

import { cn } from "@/lib/utils";
import Loader from "@components/Loader";
import Button2 from "@components/ui/button";
import { Input } from "@components/ui/input";
import {
  Avatar,
  Button,
  Card,
  CardBody,
  CardHeader,
  Image,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Tooltip,
  useDisclosure,
} from "@heroui/react";
import {
  Check,
  CheckCircle,
  ImagePlus,
  Trash2,
  Copy
} from "lucide-react"; // ⬅️ הוסר ChevronLeftIcon/ChevronRightIcon
import { useEffect, useState } from "react";
import { IoIosSearch } from "react-icons/io";
import { toast } from "sonner";
import ImageName from "../gallery/ImageName";
import UploadMediaClient from "../gallery/UploadMediaClient";
import { deleteApi, getApi } from "/src/services/services";
import { __ } from '@wordpress/i18n';
import { postApi } from "@/services/services";
import { confirm } from "@components/CustomConfirm";
// ⬅️ הוסף את קומפ' הפוטר הגנרי שלך
import ModalFooterPagination from "../Image/ModalFooterPagination";

const ImageMetaEdit = ({ row = {}, handleInputChange = () => { }, edit = false, isColumn = false }) => {
   
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [clientImages, setClientImages] = useState([]);
  const [searchImg, setSearchImg] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedImage, setSelectedImage] = useState({});

  const normalizeGalleryData = async (data) => {
    if (!data) {
      return { id: null, src: null };
    }
    if (typeof data === "object" && !Array.isArray(data) && data !== null) {
      const { id, url, src, ...rest } = data;
      return {
        ...rest,
        id: id ? Number(id) : null,
        src: src || url || null,
      };
    }
    if (typeof data === "string" && row?.format === "id") {
      const fetchImageData = async (id) => {
        try {
          const response = await fetch(`${window.siteUrl}/wp-json/wp/v2/media/${id}`);
          if (!response.ok) throw new Error(`Failed to fetch media for ID: ${id}`);
          const mediaData = await response.json();
          return { id: Number(id), src: mediaData?.link || mediaData?.source_url || null };
        } catch (error) {
          console.error("Error fetching media data:", error);
          return { id: Number(id), src: null };
        }
      };
      return fetchImageData(data.trim());
    }
    if (typeof data === "string" && row?.format === "url") {
      const fetchMediaData = async (url) => {
        const endpoint = `${window.siteUrl}/wp-json/whizmanage/v1/media-by-url`;
        try {
          const response = await postApi(endpoint, { urls: [url] });
          if (!response || response.status !== 200) {
            console.error(`Failed to fetch media data. Status: ${response?.status || "unknown"}`);
            return { id: null, src: url };
          }
          const result = response.data?.[0] || {};
          return { id: result.id || null, src: result.src || url };
        } catch (error) {
          console.error("Error during fetch operation:", error);
          return { id: null, src: url };
        }
      };
      return fetchMediaData(data.trim());
    }
    return { id: null, src: null };
  };

  useEffect(() => {
    if (edit && isOpen) {
      setLoading(true);
      const wordpressApiEndpoint = `${window.siteUrl}/wp-json/wp/v2/media?search=${encodeURIComponent(
        searchImg
      )}&per_page=100&page=${page}`;
      getApi(wordpressApiEndpoint)
        .then((response) => {
          const fetchedImages = (response?.data || [])
            .filter((image) => image.media_type === "image")
            .map((image) => ({ id: image.id, src: image.source_url, format: row?.format }));
          setClientImages(fetchedImages);
          setTotalPages(parseInt(response?.headers?.["x-wp-totalpages"], 10) || 1);
          setTotalItems(parseInt(response?.headers?.["x-wp-total"], 10) || fetchedImages.length);
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching images from WordPress API:", error);
          setLoading(false);
        });
    }
  }, [searchImg, page, isOpen]);

  const deleteImage = async (id, event) => {
    event?.stopPropagation?.();
    const wordpressApiEndpoint = `${window.siteUrl}/wp-json/wp/v2/media/${id}/`;
    const isConfirmed = await confirm({
      title: __("Delete Image", "whizmanage"),
      message: __("Are you sure you want to delete this image?", "whizmanage"),
      confirmText: __("Delete", "whizmanage"),
      cancelText: __("Cancel", "whizmanage"),
    });
    if (isConfirmed) {
      try {
        await deleteApi(wordpressApiEndpoint);
        toast(
          <div className="p-4 w-full h-full !border-l-4 !border-l-fuchsia-600 dark:!bg-slate-800 dark:text-slate-300 rounded-md flex gap-4 items-center justify-start">
            <CheckCircle className="w-5 h-5 text-fuchsia-600" />
            {__("The image has been deleted successfully", "whizmanage")}
          </div>,
          { duration: 5000 }
        );
        setClientImages((prev) => prev.filter((img) => img.id !== id));
      } catch (error) {
        console.error("Error deleting the image:", error?.response?.data?.message || error || "Unknown error occurred");
      }
    }
  };

  useEffect(() => {
    const fetchGalleryImages = async () => {
      if (!row || row.value === undefined) return;
      try {
        const raw = Array.isArray(row.value) ? row.value[0] : row.value;
        const data = await normalizeGalleryData(raw);
        setSelectedImage(data);
      } catch (error) {
        console.error("Error fetching initial gallery images:", error);
      }
    };
    fetchGalleryImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClicked = (image) => {
    setSelectedImage(image);
  };

  const copyImageUrl = async (src, event) => {
    event?.stopPropagation?.();
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(src);
      } else {
        const ta = document.createElement("textarea");
        ta.value = src;
        ta.setAttribute("readonly", "");
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      toast(
        <div className="p-4 w-full h-full !border-l-4 !border-l-fuchsia-600 dark:!bg-slate-800 dark:text-slate-300 rounded-md flex gap-4 items-center justify-start">
          <CheckCircle className="w-5 h-5 text-fuchsia-600" />
          {__("Link copied to clipboard", "whizmanage")}
        </div>,
        { duration: 3000 }
      );
    } catch (err) {
      console.error("Copy failed:", err);
      toast.error(t("Failed to copy link"));
    }
  };

  useEffect(() => {
    if (
      edit &&
      selectedImage?.id &&
      selectedImage?.src &&
      selectedImage.src !== row?.value?.url
    ) {
      const targetKey = row?.key ?? "_yoast_wpseo_opengraph-image";
      handleInputChange(targetKey, selectedImage.src);
    }
  }, [selectedImage]);

  return (
    <>
      {isColumn ? (
        <Tooltip
          className="p-0 m-0"
          placement={window.user_local == "he_IL" ? "left" : "right"}
          content={<Image width={300} alt="NextUI hero Image" src={selectedImage?.src || ""} />}
        >
          <Avatar
            src={selectedImage?.src || undefined}
            radius="sm"
            isBordered
            className={`${isColumn ? "cursor-pointer dark:!bg-slate-700 dark:!border-slate-700" : ""}`}
            isPressable={edit}
            onClick={edit ? onOpen : undefined}
            fallback={
              <img
                className="w-full h-full object-fill"
                src={window.placeholderImg}
                alt="Placeholder"
              />
            }
          />
        </Tooltip>
      ) : (
        <div
          className="relative overflow-hidden h-[260px] border-2 border-dashed border-slate-300 dark:border-slate-500 hover:border-fuchsia-600 rounded-lg flex flex-col gap-1 items-center justify-center cursor-pointer text-gray-400 hover:text-fuchsia-600 bg-white dark:bg-slate-700 hover:animate-pulse"
          onClick={edit ? onOpen : undefined}
        >
          {selectedImage?.src ? (
            <img alt="product image" src={selectedImage.src} className="object-cover w-full h-full" />
          ) : (
            <>
              <ImagePlus className="w-24 h-24" />
              <p className="text-center text-xl">{__("Add image", "whizmanage")}</p>
            </>
          )}
        </div>
      )}
      <Modal
        size="3xl"
        backdrop="opaque"
        placement="top-center"
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        motionProps={{
          variants: {
            enter: { y: 0, opacity: 1, transition: { duration: 0.3, ease: "easeOut" } },
            exit: { y: -20, opacity: 0, transition: { duration: 0.2, ease: "easeIn" } },
          },
        }}
        classNames={{ backdrop: "bg-gradient-to-t from-zinc-900 to-zinc-900/10 backdrop-opacity-20" }}
        isDismissable={false}
      >
        <ModalContent className="dark:bg-slate-800">
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 text-center text-3xl text-gray-400">
                {__("Select Image", "whizmanage")}
              </ModalHeader>
              <ModalBody>
                <div className="flex w-full flex-col items-center">
                  <div className="!h-[500px] w-full overflow-y-scroll">
                    <UploadMediaClient setClientImages={setClientImages} setSelectedImage={setSelectedImage} />
                    <div className="w-full h-20 flex justify-center items-center gap-2">
                      <div className="relative h-10 w-60 border rounded-lg flex gap-1 items-center px-2 dark:bg-slate-700">
                        <IoIosSearch className="w-6 h-6 text-gray-500" />
                        <Input
                          placeholder={__("Search image...", "whizmanage")}
                          type="search"
                          value={searchImg}
                          onChange={(e) => setSearchImg(e.target.value)}
                          className="!border-none !ring-0 placeholder:text-slate-400 dark:!text-slate-300 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 justify-center pb-4">
                      {loading ? (
                        <Loader />
                      ) : clientImages.length > 0 ? (
                        clientImages.map((image, index) => (
                          <Card
                            key={`${image.id}-${index}`}
                            isFooterBlurred
                            radius="md"
                            className={cn(
                              "max-h-fit !bg-slate-100 dark:bg-slate-700",
                              selectedImage?.src === image?.src && "shadow shadow-fuchsia-600"
                            )}
                          >
                            <CardHeader className="absolute z-10 top-0 flex gap-1 !items-end justify-end">
                              <Button
                                className="text-tiny text-fuchsia-600 bg-white/50 hover:!bg-white/70"
                                variant="flat"
                                color="default"
                                radius="sm"
                                size="sm"
                                isIconOnly
                                onClick={(event) => copyImageUrl(image.src, event)}
                                aria-label={__("Copy link", "whizmanage")}
                              >
                                <Copy className="w-4" />
                              </Button>
                              <Button
                                className="text-tiny text-fuchsia-600 bg-white/50"
                                variant="flat"
                                color="default"
                                radius="sm"
                                size="sm"
                                isIconOnly
                                onClick={() => deleteImage(image.id)}
                              >
                                <Trash2 className="w-4" />
                              </Button>
                            </CardHeader>

                            <div
                              className={cn(
                                selectedImage?.src === image?.src && "border-1 border-b-0 border-fuchsia-600",
                                "!w-[223px] !h-[223px] overflow-hidden image-container rounded-xl"
                              )}
                              onClick={() => setSelectedImage(image)}
                            >
                              <Image alt="Media item" className="object-contain z-0 rounded-lg" src={image.src} isPressable />
                              {selectedImage?.src === image?.src && (
                                <CardBody className="absolute z-10 top-0 h-full flex-col !items-center justify-center bg-black/30">
                                  <Check className="w-20 h-20 text-fuchsia-600" />
                                </CardBody>
                              )}
                            </div>
                            <ImageName image={image} />
                          </Card>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center space-y-4 pt-4 max-w-60 mx-auto">
                          <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                              <ImagePlus className="w-8 h-8 text-gray-400 dark:text-slate-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-slate-200 mb-2">
                              {searchImg ? __("No images found", "whizmanage") : __("No images available", "whizmanage")}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
                              {searchImg
                                ? __(
                                "No images match your search. Try different keywords or upload new images.",
                                "whizmanage"
                              )
                                : __(
                                "No images in your media library yet. Upload your first image to get started.",
                                "whizmanage"
                              )}
                            </p>
                          </div>
                          <div className="flex gap-3">
                            {searchImg && (
                              <Button2 variant="outline" onClick={() => setSearchImg("")} className="px-4">
                                {__("Clear search", "whizmanage")}
                              </Button2>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </ModalBody>

              <ModalFooter>
                <ModalFooterPagination
                  page={page}
                  totalPages={totalPages}
                  onChange={(next) => setPage(next)}
                  currentCount={clientImages.length}
                  totalItems={totalItems}
                  // resourceLabel לא חובה; אם תרצה: resourceLabel={__("images")}
                  onCancel={onClose}
                  onSave={() => onClose()}
                />
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

export default ImageMetaEdit;