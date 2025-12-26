// src/components/media/MediaPicker.jsx
import { cn, toast } from "@/lib/utils";
import Button2 from "@components/ui/button";
import { confirm } from "@components/ui/custom/CustomConfirm";
import Loader from "@components/ui/custom/Loader";
import { Input } from "@components/ui/input";
import {
  Button,
  Card,
  CardHeader,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import { Check, Copy, FileIcon, ImageIcon, Trash2, X, Image } from "lucide-react";
import { IconBadge } from "@components/ui/custom/IconBadge";
import { useEffect, useMemo, useRef, useState } from "react";
 import { __ } from "@wordpress/i18n";
import { IoIosSearch } from "react-icons/io";
import ImageName from "./ImageName";
import MediaPagination from "./MediaPagination";
import MediaUploader from "./MediaUploader";
import useMediaStore from "./store/useMediaStore";

const PlainThumb = ({ src, alt, isFile = false }) => {
  if (isFile || !src) {
    return (
      <div className="bg-transparent border-1 border-muted-foreground border-dashed justify-center flex rounded-lg h-60">
        <ImageIcon className="w-16 h-16 text-slate-400" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || "thumb"}
      width={223}
      height={223}
      loading="eager"
      decoding="async"
      style={{
        width: 223,
        height: 223,
        objectFit: "cover",
        borderRadius: 4,
        transition: "none",
        animation: "none",
        backfaceVisibility: "hidden",
        willChange: "auto",
        display: "block",
      }}
      draggable={false}
    />
  );
};

const SmallThumb = ({ src, size = 64, isFile = false }) => {
  if (isFile || !src) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(148, 163, 184, 0.1)",
          border: "1px solid rgba(100,116,139,0.3)",
        }}
      >
        <ImageIcon className="w-6 h-6 text-slate-400" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt="selected"
      width={size}
      height={size}
      loading="eager"
      decoding="async"
      style={{
        width: size,
        height: size,
        objectFit: "cover",
        borderRadius: 6,
        border: "1px solid rgba(100,116,139,0.3)",
        transition: "none",
        animation: "none",
        backfaceVisibility: "hidden",
        willChange: "auto",
        display: "block",
      }}
      draggable={false}
    />
  );
};

const MediaPicker = ({
  value,
  onChange,
  onClose,
  multiple = false,
  maxSelection = 100,
  title,
  trigger,
  autoOpen = true,
  mediaType = "image",
  acceptedFileTypes,
  isForm = false, // מצב טופס - ללא תווית MAIN
}) => {
   
  // 🆕 האם זה בחירה לוידאו בלבד? (כל ה-MIME מתחיל ב-video/)
  const isVideoOnly =
    Array.isArray(acceptedFileTypes) &&
    acceptedFileTypes.length > 0 &&
    acceptedFileTypes.every((m) => typeof m === "string" && m.startsWith("video/"));

  const [isOpen, setIsOpen] = useState(autoOpen);
  const [localSearch, setLocalSearch] = useState("");
  const [localSelectedImages, setLocalSelectedImages] = useState([]);
  const [filterMode, setFilterMode] = useState("all"); // all, selected, unselected
  const [typeFilter, setTypeFilter] = useState(isVideoOnly ? "files" : "all"); // all, images, files
  const debounceTimer = useRef(null);

  const {
    images,
    loading,
    currentPage,
    totalPages,
    totalItems,
    fetchImages,
    deleteImage,
    setMediaType,
  } = useMediaStore();

  useEffect(() => {
    if (isOpen) {
      setMediaType(isVideoOnly ? "all" : mediaType);
    }
  }, [isOpen, mediaType, setMediaType, isVideoOnly]);

  useEffect(() => {
    if (isOpen) {
      if (multiple) {
        const initialValue = Array.isArray(value)
          ? value.filter((img) => img && img.id)
          : [];
        setLocalSelectedImages(initialValue);
      } else {
        const initialValue = value ? [value] : [];
        setLocalSelectedImages(initialValue);
      }
    }
  }, [isOpen, value, multiple]);

  // טעינת עמוד ראשון (100 פריטים)+  שימוש בקאש אם כבר נטען בעבר
  useEffect(() => {
    if (!isOpen || filterMode !== "all") return;
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      fetchImages(localSearch, 1, mediaType);
    }, 300);
    return () => clearTimeout(debounceTimer.current);
  }, [localSearch, isOpen, filterMode, fetchImages, mediaType]);

  const isImageSelected = (image) => {
    return localSelectedImages.some((img) => img.id === image.id);
  };

  const isImageFile = (item) => {
    if (item.media_type === "image") return true;

    // בדיקה שנייה: לפי mime_type
    if (item.mime_type && item.mime_type.startsWith("image/")) return true;

    // בדיקה שלישית: לפי סיומת הקובץ
    if (item.src) {
      const ext = item.src.toLowerCase().split(".").pop();
      const imageExtensions = [
        "jpg",
        "jpeg",
        "png",
        "gif",
        "webp",
        "svg",
        "bmp",
      ];
      if (imageExtensions.includes(ext)) return true;
    }

    return false;
  };

  const imagesToDisplay = useMemo(() => {
    let filtered = images;

    if (typeFilter === "images") {
      filtered = filtered.filter((img) => isImageFile(img));
    } else if (typeFilter === "files") {
      filtered = filtered.filter((img) => !isImageFile(img));
    }

    if (acceptedFileTypes && acceptedFileTypes.length > 0) {
      filtered = filtered.filter((img) => acceptedFileTypes.includes(img.mime_type));
    }

    if (filterMode === "selected") return localSelectedImages;
    if (filterMode === "unselected") return filtered.filter((img) => !isImageSelected(img));
    return filtered;
  }, [images, localSelectedImages, filterMode, typeFilter, acceptedFileTypes]);

  const handleImageClick = (image) => {
    const currentCleanSelection = localSelectedImages.filter((img) => img && img.id);
    const currentlySelected = currentCleanSelection.some((img) => img.id === image.id);

    if (multiple) {
      if (currentlySelected) {
        const newSelection = currentCleanSelection.filter((img) => img.id !== image.id);
        setLocalSelectedImages(newSelection);
      } else {
        if (currentCleanSelection.length >= maxSelection) {
          toast.warning(__("Maximum selection reached", "whizmanage"));
          return;
        }
        const newSelection = [...currentCleanSelection, image];
        setLocalSelectedImages(newSelection);
      }
    } else {
      setLocalSelectedImages(currentlySelected ? [] : [image]);
    }
  };

  const handleRemoveSelected = (image) => {
    setLocalSelectedImages((prev) => prev.filter((img) => img.id !== image.id));
  };

  const handleSave = () => {
    const cleanSelection = localSelectedImages.filter((img) => img && img.id);
    const result = multiple ? cleanSelection : cleanSelection[0] || null;
    setIsOpen(false);
    onChange(result);
    // לא קוראים ל-onClose כאן כי onChange כבר מטפל בסגירה
  };

  const handleCancel = () => {
    setLocalSelectedImages([]);
    setFilterMode("all");
    setIsOpen(false);
    onClose?.();
  };

  // מעבר בין עמודים – תמיד מהשרת (100 פריטים), תוך שימוש בקאש אם כבר נטען
  const handlePageChange = (page) => {
    fetchImages(localSearch, page, mediaType);
  };

  const handleDelete = async (id, event) => {
    event?.stopPropagation();

    const isConfirmed = await confirm({
      title: __("Delete Media", "whizmanage"),
      message: __("Are you sure you want to delete this item?", "whizmanage"),
      confirmText: __("Delete", "whizmanage"),
      cancelText: __("Cancel", "whizmanage"),
    });

    if (isConfirmed) {
      try {
        await deleteImage(id);
        toast.success(__("Media deleted successfully", "whizmanage"));
      } catch (error) {
        console.error("Error deleting media:", error);
        toast.error(__("Failed to delete media", "whizmanage"));
      }
    }
  };

  const copyImageUrl = (url, event) => {
    event?.stopPropagation();
    navigator.clipboard.writeText(url);
    toast.success(__("Link copied to clipboard", "whizmanage"));
  };

  // אין refetch אחרי העלאה – ה-store מעדכן את הרשימה והקאש
  const handleUploadComplete = () => { };

  return (
    <Modal
      size="5xl"
      backdrop="opaque"
      placement="top-center"
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) handleCancel();
        setIsOpen(open);
      }}
      isDismissable={false}
      isKeyboardDismissDisabled={false}
      portalContainer={
        typeof document !== "undefined" ? document.body : undefined
      }
      motionProps={{
        variants: {
          enter: {
            y: 0,
            opacity: 1,
            transition: { duration: 0.3, ease: "easeOut" },
          },
          exit: {
            y: -20,
            opacity: 0,
            transition: { duration: 0.2, ease: "easeIn" },
          },
        },
      }}
      classNames={{
        backdrop: "bg-gradient-to-t from-zinc-900 to-zinc-900/10 backdrop-opacity-20",
        wrapper: "z-[99999]",
        closeButton: "hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 rounded-lg",
      }}
    >
      <ModalContent className="dark:bg-slate-800">
        {(onCloseModal) => (
          <>
            <ModalHeader className="flex gap-3 justify-center items-center">
              <IconBadge icon={Image} variant="default" size="default" />
              <h2 className="text-2xl font-semibold text-slate-400">
                {title || __("Select Media", "whizmanage")}
              </h2>
            </ModalHeader>

            <ModalBody className="!px-2">
              <div className="!h-[500px] w-full overflow-y-scroll scrollbar-whiz px-2">
                <MediaUploader
                  onUploadComplete={handleUploadComplete}
                  acceptedTypes={isVideoOnly ? "video" : mediaType === "image" ? "image" : "all"}
                />

                <div className="w-full h-20 flex justify-between items-center gap-2 px-4">
                  <div className="flex justify-around gap-2">
                    {/* 🆕 Type Filters - רק אם mediaType="all" */}
                    {mediaType === "all" && !isVideoOnly && (
                      <>
                        <Button2
                          variant={typeFilter === "all" ? "default" : "outline"}
                          onClick={() => setTypeFilter("all")}
                          className="h-8 rounded-full"
                        >
                          {__("All", "whizmanage")}
                        </Button2>
                        {!isVideoOnly && (
                          <Button2
                            variant={typeFilter === "images" ? "default" : "outline"}
                            onClick={() => setTypeFilter("images")}
                            className="h-8 rounded-full"
                          >
                            {__("Images", "whizmanage")}
                          </Button2>
                        )}
                        <Button2
                          variant={
                            typeFilter === "files" ? "default" : "outline"
                          }
                          onClick={() => setTypeFilter("files")}
                          className="h-8 rounded-full"
                        >
                          {__("Files", "whizmanage")}
                        </Button2>
                        <div className="w-px h-6 bg-slate-300 dark:bg-slate-600" />
                      </>
                    )}

                    {/* Selection Filters */}
                    <Button2
                      variant={filterMode === "all" ? "default" : "outline"}
                      onClick={() => setFilterMode("all")}
                      className="h-8 rounded-full"
                    >
                      {mediaType === "all" ? __("Show All", "whizmanage") : __("All", "whizmanage")}
                    </Button2>
                    <Button2
                      variant={
                        filterMode === "selected" ? "default" : "outline"
                      }
                      onClick={() => setFilterMode("selected")}
                      className="h-8 rounded-full"
                    >
                      {__("Selected", "whizmanage")} ({localSelectedImages.length})
                    </Button2>
                    <Button2
                      variant={
                        filterMode === "unselected" ? "default" : "outline"
                      }
                      onClick={() => setFilterMode("unselected")}
                      className="h-8 rounded-full"
                    >
                      {__("Unselected", "whizmanage")}
                    </Button2>
                  </div>

                  <div className="relative">
                    <IoIosSearch className="absolute start-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-300 pointer-events-none" />
                    <Input
                      placeholder={__("Search...", "whizmanage")}
                      type="search"
                      value={localSearch}
                      onChange={(event) => setLocalSearch(event.target.value)}
                      className="w-80 h-8 !ps-7 !pe-7 !rounded-full"
                    />
                  </div>
                </div>

                {/* 🆕 Selected Images Preview - ללא תווית MAIN בטופס */}
                {multiple && localSelectedImages.length > 0 && (
                  <div className="w-full px-4 pb-4 pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {isVideoOnly ? __("Selected Videos", "whizmanage") : __("Selected Items", "whizmanage")} ({localSelectedImages.length})
                      </h4>
                      <Button
                        size="sm"
                        variant="light"
                        color="danger"
                        onClick={() => setLocalSelectedImages([])}
                      >
                        {__("Clear all", "whizmanage")}
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {localSelectedImages.map((image, index) => (
                        <div
                          key={image.id}
                          className={cn(
                            "relative inline-block",
                            // 🆕 בטופס אין תמונה ראשית מיוחדת
                            !isForm &&
                            index === 0 &&
                            "ring-2 ring-fuchsia-500 rounded-lg"
                          )}
                        >
                          <SmallThumb
                            src={image.src}
                            size={64}
                            isFile={!isImageFile(image)}
                          />

                          {/* 🆕 תווית MAIN רק אם לא בטופס */}
                          {!isForm && index === 0 && (
                            <div className="absolute bottom-0 left-0 right-0 bg-fuchsia-700/60 text-white text-[8px] text-center rounded-b-md py-0.5 font-bold">
                              MAIN
                            </div>
                          )}

                          <button
                            onClick={() => handleRemoveSelected(image)}
                            className="absolute -top-1.5 -right-1.5 bg-slate-300 dark:bg-slate-600 text-white rounded-full w-4 h-4 flex items-center justify-center hover:bg-muted-foreground shadow-md transition-colors"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Media Grid */}
                <div className="flex flex-wrap gap-5 justify-center pb-4">
                  {loading && filterMode === "all" ? (
                    <Loader />
                  ) : imagesToDisplay.length > 0 ? (
                    imagesToDisplay.map((image) => {
                      const selected = isImageSelected(image);
                      // 🆕 בטופס אין תמונה ראשית מיוחדת
                      const isMainImage =
                        !isForm &&
                        selected &&
                        multiple &&
                        localSelectedImages[0]?.id === image.id;
                      const isFile = !isImageFile(image);

                      return (
                        <Card
                          key={image.id}
                          isFooterBlurred
                          radius="sm"
                          className={cn(
                            "border-none max-h-fit transition-all",
                            selected
                              ? "ring-2 ring-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-900/20"
                              : "!bg-slate-100 dark:bg-slate-700"
                          )}
                          isPressable
                          onPress={() => handleImageClick(image)}
                        >
                          <CardHeader className="absolute z-10 top-0 flex gap-1 !items-end justify-between">
                            <Button
                              className={cn(
                                "transition-all",
                                selected
                                  ? "bg-fuchsia-600 text-white"
                                  : "bg-white/20 border-2 border-gray-300"
                              )}
                              variant="flat"
                              color="default"
                              radius="sm"
                              size="sm"
                              isIconOnly
                              onClick={(e) => {
                                e.stopPropagation();
                                handleImageClick(image);
                              }}
                              aria-label={
                                selected ? __("Deselect", "whizmanage") : __("Select", "whizmanage")
                              }
                            >
                              {selected && <Check className="w-4 h-4" />}
                            </Button>

                            <div className="flex gap-1">
                              <Button
                                className="text-tiny text-fuchsia-600 bg-white/50 hover:!bg-white/70"
                                variant="flat"
                                color="default"
                                radius="sm"
                                size="sm"
                                isIconOnly
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyImageUrl(image.src, e);
                                }}
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(image.id, e);
                                }}
                              >
                                <Trash2 className="w-4" />
                              </Button>
                            </div>
                          </CardHeader>
                          {/* 🆕 תווית MAIN רק אם לא בטופס */}
                          {isMainImage && (
                            <div className="absolute top-3 left-12 z-20 bg-fuchsia-600 text-white p-2 rounded text-xs font-medium">
                              {__("MAIN", "whizmanage")}
                            </div>
                          )}
                          <div className="!w-[223px] !h-[223px] overflow-hidden !rounded-sm image-container relative">
                            <PlainThumb
                              src={image.src}
                              alt={image.name}
                              isFile={isFile}
                            />
                            {selected && (
                              <div className="absolute inset-0 bg-fuchsia-600/10" />
                            )}
                          </div>
                          <ImageName image={image} />
                        </Card>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-4 pt-4 max-w-60 mx-auto">
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                          {mediaType === "image" ? (
                            <ImageIcon className="w-8 h-8 text-slate-400 dark:text-slate-300" />
                          ) : (
                            <FileIcon className="w-8 h-8 text-slate-400 dark:text-slate-300" />
                          )}
                        </div>
                        <h3 className="text-lg font-medium ...">
                          {filterMode === "selected"
                            ? __("No selected items", "whizmanage")
                            : filterMode === "unselected"
                              ? __("All items are selected", "whizmanage")
                              : localSearch
                                ? __("No items found", "whizmanage")
                                : isVideoOnly
                                  ? __("No videos in library", "whizmanage")
                                  : __("No media in library", "whizmanage")}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-300 mb-6">
                          {filterMode === "selected"
                            ? __("Select items from the library first", "whizmanage")
                            : localSearch
                              ? __("Try different keywords or upload new files.", "whizmanage")
                              : __("Upload your first files to get started.", "whizmanage")}
                        </p>
                      </div>
                      {(localSearch ||
                        filterMode !== "all" ||
                        typeFilter !== "all") && (
                          <div className="flex gap-3">
                            <Button2
                              variant="outline"
                              onClick={() => {
                                setLocalSearch("");
                                setFilterMode("all");
                                setTypeFilter("all");
                              }}
                              className="px-4"
                            >
                              {__("Reset filters", "whizmanage")}
                            </Button2>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              </div>
            </ModalBody>

            <ModalFooter>
              <MediaPagination
                page={currentPage}
                totalPages={filterMode === "all" ? totalPages : 1}
                totalItems={filterMode === "all" ? totalItems : imagesToDisplay.length}
                currentCount={imagesToDisplay.length}
                onChange={handlePageChange}
                onCancel={handleCancel}
                onSave={handleSave}
              />
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default MediaPicker;
