import { cn } from "@/lib/utils";
import Button2, { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import {
  Card,
  CardBody,
  CardHeader,
  Image,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  useDisclosure,
} from "@heroui/react";
import Loader from "@components/Loader";
import { Check, CheckCircle, ImagePlus, Trash2, Upload, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { __ } from '@wordpress/i18n';
import { IoIosSearch } from "react-icons/io";
import { toast } from "sonner";
import ImageName from "../../../../pages/products/_components/table/edit/gallery/ImageName";
import UploadMediaClient from "../../../../pages/products/_components/table/edit/gallery/UploadMediaClient";
import { deleteApi, getApi } from "/src/services/services";
import ModalFooterPagination from "../../../../pages/products/_components/table/edit/Image/ModalFooterPagination";

const UploadImages = ({ handleImageUpload }) => {
   
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const [clientImages, setClientImages] = useState([]);
  const [searchImg, setSearchImg] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedImage, setSelectedImage] = useState({});

  const copyToClipboard = async (text, event) => {
    try {
      event?.stopPropagation?.();
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      toast(
        <div className="p-4 w-full !border-l-4 !border-l-fuchsia-600 dark:!bg-slate-800 dark:text-slate-300 rounded-md flex gap-4 items-center">
          <CheckCircle className="w-5 h-5 text-fuchsia-600" />
          {__("Link copied", "whizmanage")}
        </div>,
        { duration: 2500 }
      );
    } catch (err) {
      console.error("Copy link error:", err);
      toast(__("Failed to copy link", "whizmanage"), { duration: 2500 });
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    const endpoint = `${window.siteUrl}/wp-json/wp/v2/media?search=${encodeURIComponent(
      searchImg
    )}&media_type=image&per_page=100&page=${page}`;
    getApi(endpoint)
      .then((response) => {
        const fetchedImages = response.data.map((image) => ({
          id: image.id,
          src: image.source_url,
          name: image.title.rendered,
        }));
        setClientImages(fetchedImages);
        setTotalPages(parseInt(response.headers["x-wp-totalpages"], 10));
        setTotalItems(parseInt(response.headers["x-wp-total"], 10));
      })
      .catch((err) => console.error("WP media fetch error:", err))
      .finally(() => setLoading(false));
  }, [searchImg, page, isOpen]);

  const deleteImage = async (id, event) => {
    event.stopPropagation();
    const endpoint = `${window.siteUrl}/wp-json/wp/v2/media/${id}/`;
    const isConfirmed = await confirm({
      title: __("Delete Image", "whizmanage"),
      message: __("Are you sure you want to delete this image?", "whizmanage"),
      confirmText: __("Delete", "whizmanage"),
      cancelText: __("Cancel", "whizmanage"),
    });
    if (!isConfirmed) return;

    try {
      await deleteApi(endpoint);
      toast(
        <div className="p-4 w-full !border-l-4 !border-l-fuchsia-600 dark:!bg-slate-800 dark:text-slate-300 rounded-md flex gap-4 items-center">
          <CheckCircle className="w-5 h-5 text-fuchsia-600" />
          {__("The image has been deleted successfully", "whizmanage")}
        </div>,
        { duration: 5000 }
      );
      setClientImages((prev) => prev.filter((img) => img.id !== id));
    } catch (error) {
      console.error("Delete image error:", error);
    }
  };

  const handleClicked = (image) =>
    setSelectedImage((prev) => (prev?.src === image.src ? {} : image));

  const handleSave = () => handleImageUpload(selectedImage.src);

  return (
    <>
      <Button
        onClick={onOpen}
        size="xs"
        variant="ghost"
        className="!size-7 p-0 rounded-md"
        component="label"
      >
        <Upload className="size-4" strokeWidth={1.5} />
      </Button>
      <Modal
        size="3xl"
        backdrop="opaque"
        placement="top-center"
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        classNames={{ backdrop: "bg-gradient-to-t from-zinc-900 to-zinc-900/10 backdrop-opacity-20" }}
        isDismissable={false}
        preventClose
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
                {__("Select Image", "whizmanage")}
              </ModalHeader>

              <ModalBody>
                <div className="flex w-full flex-col items-center">
                  <div className="!h-[500px] w-full overflow-y-scroll">
                    <UploadMediaClient
                      setClientImages={setClientImages}
                      setSelectedImage={setSelectedImage}
                    />
                    <div className="w-full h-20 flex justify-center items-center gap-2">
                      <div className="relative h-10 w-60 border rounded-lg flex gap-1 items-center px-2 dark:bg-slate-700">
                        <IoIosSearch className="w-6 h-6 text-gray-500" />
                        <Input
                          placeholder={__("Search image...", "whizmanage")}
                          type="search"
                          value={searchImg}
                          onChange={(e) => {
                            setSearchImg(e.target.value);
                            setPage(1);
                          }}
                          className="!border-none !ring-0 placeholder:text-slate-400 dark:!text-slate-300 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 justify-center pb-4">
                      {loading ? (
                        <Loader />
                      ) : clientImages.length > 0 ? (
                        clientImages.map((image) => (
                          <Card
                            key={image.id}
                            isFooterBlurred
                            radius="md"
                            className={cn(
                              "max-h-fit !bg-slate-100 dark:bg-slate-700",
                              selectedImage?.src === image?.src && "shadow shadow-fuchsia-600"
                            )}
                          >
                            <CardHeader className="absolute z-10 top-0 flex-col !items-end">
                              <div className="flex gap-2">
                                <Button
                                  className="text-tiny text-fuchsia-600 bg-white/50 hover:!bg-white/70"
                                  variant="flat"
                                  color="default"
                                  radius="sm"
                                  size="sm"
                                  isIconOnly
                                  onClick={(e) => copyToClipboard(image.src, e)}
                                  title={__("Copy link", "whizmanage")}
                                >
                                  <Copy className="w-4" />
                                </Button>

                                <Button
                                  className="text-tiny text-fuchsia-600 bg-white/50 hover:!bg-white/70"
                                  variant="flat"
                                  color="default"
                                  radius="sm"
                                  size="sm"
                                  isIconOnly
                                  onClick={(e) => deleteImage(image.id, e)}
                                  title={__("Delete Image", "whizmanage")}
                                >
                                  <Trash2 className="w-4" />
                                </Button>
                              </div>
                            </CardHeader>

                            <div
                              className={cn(
                                selectedImage?.src === image?.src && "border-1 border-b-0 border-fuchsia-600",
                                "!w-[223px] !h-[223px] overflow-hidden image-container rounded-xl"
                              )}
                              onClick={() => handleClicked(image)}
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
                        <div className="flex flex-col items-center justify-center space-y-4 pt-4">
                          <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                              <Upload className="w-8 h-8 text-gray-400 dark:text-slate-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-slate-200 mb-2">
                              {__("No images found", "whizmanage")}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6 max-w-sm">
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
                              <Button
                                variant="outline"
                                onClick={() => setSearchImg("")}
                                className="px-4"
                              >
                                {__("Clear search", "whizmanage")}
                              </Button>
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
                    handleSave();
                    onClose();
                  }}
                />
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

export default UploadImages;
