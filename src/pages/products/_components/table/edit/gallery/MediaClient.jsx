import { cn } from "@/lib/utils";
import Loader from "@components/Loader";
import CustomTooltip from "@components/nextUI/Tooltip";
import Button2 from "@components/ui/button";
import { Input } from "@components/ui/input";
import {
  Avatar,
  Button,
  Card,
  CardHeader,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  useDisclosure,
} from "@heroui/react";
import { CheckCircle, ImageIcon, Plus, Trash2, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { IoIosSearch } from "react-icons/io";
import { toast } from "sonner";
import { __ } from '@wordpress/i18n';
import ImageMediaClient from "./ImageMediaClient";
import ImageName from "./ImageName";
import UploadMediaClient from "./UploadMediaClient";
import { deleteApi } from "/src/services/services";
import { confirm } from "@components/CustomConfirm";
import ModalFooterPagination from "../Image/ModalFooterPagination";

const MediaClient = ({
  bulkEdit,
  clientImages,
  galleryImages,
  setGalleryImages,
  setUpdateUI,
  setClientImages,
  setSearchImg,
  form,
  page,
  setPage,
  totalPages,
  totalItems,
  setTotalItems, // חדש: כדי לעדכן מונים אחרי מחיקה/העלאה
  loading,
  perPage,       // חדש: יישור ל-UI
}) => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [localSearchImg, setLocalSearchImg] = useState("");
  const originalImagesRef = useRef(galleryImages);
  const [selectedImages, setSelectedImages] = useState([]);
  const [isSelectionChanged, setIsSelectionChanged] = useState(false);
   

  // דיבאונס לחיפוש
  const debounceTimer = useRef(null);
  useEffect(() => {
    if (!setSearchImg) return;
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setSearchImg(localSearchImg);
      setPage?.(1);
    }, 300);
    return () => clearTimeout(debounceTimer.current);
  }, [localSearchImg]);

  const hasSelectionChanged = () => {
    const currentIds = new Set(selectedImages.map((img) => img.id));
    const originalIds = new Set(originalImagesRef.current.map((img) => img.id));
    return (
      selectedImages.some((img) => !originalIds.has(img.id)) ||
      originalImagesRef.current.some((img) => !currentIds.has(img.id))
    );
  };

  useEffect(() => {
    setIsSelectionChanged(hasSelectionChanged());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedImages, originalImagesRef.current]);

  useEffect(() => {
    originalImagesRef.current = galleryImages;
  }, [galleryImages]);

  const updateGallery = () => {
    const newImages = selectedImages.filter(
      (img) => !galleryImages.some((g) => g.id === img.id)
    );
    const keptImages = galleryImages.filter((g) =>
      selectedImages.some((img) => img.id === g.id)
    );
    setGalleryImages([...keptImages, ...newImages]);
    setUpdateUI((prev) => !prev);
    setSelectedImages([]);
  };

  const openModal = () => {
    setSelectedImages(galleryImages);
    onOpen();
  };

  const deleteImage = async (id, event) => {
    event?.stopPropagation?.();
    const isConfirmed = await confirm({
      title: __("Delete Image", "whizmanage"),
      message: __("Are you sure you want to delete this image?", "whizmanage"),
      confirmText: __("Delete", "whizmanage"),
      cancelText: __("Cancel", "whizmanage"),
    });
    if (!isConfirmed) return;

    try {
      await deleteApi(`${window.siteUrl}/wp-json/wp/v2/media/${id}/`);
      toast(
        <div className="p-4 w-full !border-l-4 !border-l-fuchsia-600 dark:!bg-slate-800 dark:text-slate-300 rounded-md flex gap-4 items-center">
          <CheckCircle className="w-5 h-5 text-fuchsia-600" />
          {__("The image has been deleted successfully", "whizmanage")}
        </div>,
        { duration: 5000 }
      );
      // הסרה מהרשימה המקומית + עדכון מונים + טיפול בריקון עמוד
      setClientImages?.((prev) => prev.filter((image) => image.id !== id));
      setTotalItems?.((prev) => Math.max(0, prev - 1));
      setPage?.((p) => {
        // אם נמחק הפריט האחרון בעמוד ואנחנו לא בעמוד הראשון - לזוז אחורה
        const willBeCount = Math.max(0, (clientImages?.length || 0) - 1);
        return willBeCount === 0 && p > 1 ? p - 1 : p;
      });
    } catch (error) {
      console.error("Delete image error:", error);
    }
  };

  const copyImageUrl = async (src, event) => {
    event?.stopPropagation?.();
    try {
      if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(src);
      else {
        const ta = document.createElement("textarea");
        ta.value = src;
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      toast(
        <div className="p-4 w-full !border-l-4 !border-l-fuchsia-600 dark:!bg-slate-800 dark:text-slate-300 rounded-md flex gap-4 items-center">
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

  return (
    <>
      {bulkEdit ? (
        <div onClick={openModal} className="w-40 max-w-16 h-full flex items-center justify-center">
          <CustomTooltip title={__("Add images", "whizmanage")}>
            <Avatar
              className="cursor-pointer"
              src=""
              fallback={<Plus className="animate-pulse w-6 h-6 !text-slate-300 dark:!text-gray-50" size={20} />}
              radius="sm"
              isBordered
              onPress={onOpen}
            />
          </CustomTooltip>
        </div>
      ) : (
        <Card
          isPressable
          radius="md"
          className="border-2 border-dashed border-slate-300 dark:border-slate-500 hover:border-fuchsia-600 max-h-fit shadow-none"
          onPress={openModal}
        >
          <div
            className={cn(
              form ? "!h-[184px] !w-full" : "w-[223px] !h-[223px]",
              "overflow-hidden text-gray-400 hover:text-fuchsia-600 bg-white dark:bg-slate-700 hover:animate-pulse flex flex-col justify-center items-center p-2 rounded-xl"
            )}
          >
            <Plus className={cn(form ? "w-20 h-20" : "w-32 h-32")} />
            <p className={cn(form ? "text-xl" : "text-3xl")}>{__("Add images", "whizmanage")}</p>
          </div>
        </Card>
      )}
      <Modal
        size="5xl"
        backdrop="opaque"
        placement="top-center"
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        classNames={{ backdrop: "bg-gradient-to-t from-zinc-900 to-zinc-900/10 backdrop-opacity-20" }}
        isDismissable={false}
        motionProps={{
          variants: {
            enter: { y: 0, opacity: 1, transition: { duration: 0.3, ease: "easeOut" } },
            exit: { y: -20, opacity: 0, transition: { duration: 0.2, ease: "easeIn" } },
          },
        }}
      >
        <ModalContent className="dark:bg-slate-800">
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 text-center text-3xl text-gray-400">
                {__("Select Photos from your gallery or upload new", "whizmanage")}
              </ModalHeader>

              <ModalBody>
                <div className="flex w-full flex-col items-center">
                  <div className="!h-[500px] w-full overflow-y-scroll scrollbar-default">
                    <UploadMediaClient
                      setClientImages={setClientImages}
                      setSelectedImages={setSelectedImages}
                      // העלאה חדשה – עדכן/י גם מונה
                      onUploaded={() => setTotalItems?.((prev) => prev + 1)}
                    />

                    <div className="w-full h-14 flex justify-center items-start gap-2">
                      <div className="relative h-10 w-60 border rounded-lg flex gap-1 items-center px-2 dark:bg-slate-700">
                        <IoIosSearch className="w-6 h-6 text-gray-500" />
                        <Input
                          placeholder={__("Search image...", "whizmanage")}
                          type="search"
                          value={localSearchImg}
                          onChange={(e) => setLocalSearchImg(e.target.value)}
                          className="!border-none !ring-0 placeholder:text-slate-400 dark:!text-slate-300 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 justify-center ">
                      {loading ? (
                        <Loader />
                      ) : clientImages.length > 0 ? (
                        clientImages.map((image) => (
                          <Card
                            key={image.id}
                            isFooterBlurred
                            radius="md"
                            className="border-none max-h-fit cursor-pointer !bg-slate-100 dark:bg-slate-700"
                          >
                            <CardHeader className="absolute z-10 top-0 flex gap-1 !items-end justify-end">
                              <Button
                                className="text-tiny text-fuchsia-600 bg-white/50 hover:!bg-white/70"
                                variant="flat"
                                color="default"
                                radius="sm"
                                size="sm"
                                isIconOnly
                                onClick={(e) => copyImageUrl(image.src, e)}
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
                                onClick={(e) => deleteImage(image.id, e)}
                              >
                                <Trash2 className="w-4" />
                              </Button>
                            </CardHeader>

                            <ImageMediaClient
                              image={image}
                              selectedImages={selectedImages}
                              setSelectedImages={setSelectedImages}
                              clientImages={clientImages}
                              galleryClient={galleryImages}
                            />
                            <ImageName image={image} />
                          </Card>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center space-y-4 pt-4 max-w-60 mx-auto">
                          <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                              <ImageIcon className="w-8 h-8 text-gray-400 dark:text-slate-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-slate-200 mb-2">
                              {localSearchImg ? __("No images found", "whizmanage") : __("No images in gallery", "whizmanage")}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
                              {localSearchImg
                                ? __(
                                "No images match your search. Try different keywords or upload new images.",
                                "whizmanage"
                              )
                                : __(
                                "Your media library is empty. Upload your first images to get started.",
                                "whizmanage"
                              )}
                            </p>
                          </div>
                          <div className="flex gap-3">
                            {localSearchImg && (
                              <Button2 variant="outline" onClick={() => setLocalSearchImg("")} className="px-4">
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
                  onCancel={onClose}
                  onSave={() => {
                    if (isSelectionChanged) updateGallery();
                    onClose();
                  }}
                  pageSize={perPage} // אם הקומפוננטה תומכת – זה יישר חישובי דפים
                />
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

export default MediaClient;
