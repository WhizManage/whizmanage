import { cn } from "@/lib/utils";
import { confirm } from "@components/CustomConfirm";
import Loader from "@components/Loader";
import Button2 from "@components/ui/button";
import { Input } from "@components/ui/input";
import {
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
  useDisclosure,
} from "@heroui/react";
import {
  Check,
  CheckCircle,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { __ } from '@wordpress/i18n';
import { IoIosSearch } from "react-icons/io";
import { toast } from "sonner";
import ImageName from "./gallery/ImageName";
import UploadMediaClient from "./gallery/UploadMediaClient";
import { deleteApi, getApi } from "/src/services/services";
import ModalFooterPagination from "./Image/ModalFooterPagination";

const defaultFileIcon =
  window.siteUrl +
  "/wp-content/plugins/whizmanage/assets/images/placeholders/file.jfif";

const ChooseFile = ({
  selectedFile,
  setSelectedFile,
  index,
  handleInputChange,
}) => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [files, setFiles] = useState([]);
  const [searchFile, setSearchFile] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [filter, setFilter] = useState("all");
   

  useEffect(() => {
    fetchFiles();
  }, [searchFile, page, filter]);

  const fetchFiles = () => {
    setLoading(true);
    const wordpressApiEndpoint = `${window.siteUrl}/wp-json/wp/v2/media?search=${searchFile}&per_page=100&page=${page}`;
    getApi(wordpressApiEndpoint)
      .then((response) => {
        let fetchedFiles = response.data.map((file) => ({
          id: file.id,
          src: file.source_url,
          name: file.title.rendered,
          media_type: file.media_type,
        }));

        if (filter === "images") {
          fetchedFiles = fetchedFiles.filter(
            (file) => file.media_type === "image"
          );
        } else if (filter === "files") {
          fetchedFiles = fetchedFiles.filter(
            (file) => file.media_type !== "image"
          );
        }

        setFiles(fetchedFiles);
        setTotalPages(parseInt(response.headers["x-wp-totalpages"], 10));
        setTotalItems(parseInt(response.headers["x-wp-total"], 10));
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching files from WordPress API:", error);
        setLoading(false);
      });
  };

  const deleteFile = async (id, event) => {
    event.stopPropagation();
    const wordpressApiEndpoint = `${window.siteUrl}/wp-json/wp/v2/media/${id}/`;

    const isConfirmed = await confirm({
      title: __("Delete File", "whizmanage"),
      message: __("Are you sure you want to delete this file?", "whizmanage"),
      confirmText: __("Delete", "whizmanage"),
      cancelText: __("Cancel", "whizmanage"),
    });

    if (isConfirmed) {
      try {
        await deleteApi(wordpressApiEndpoint);

        toast(
          <div className="p-4 w-full h-full !border-l-4 !border-l-fuchsia-600 dark:!bg-slate-800 dark:text-slate-300 rounded-md flex gap-4 items-center justify-start">
            <CheckCircle className="w-5 h-5 text-fuchsia-600" />
            {__("The file has been deleted successfully", "whizmanage")}
          </div>,
          { duration: 5000 }
        );

        setFiles((prevFiles) => prevFiles.filter((file) => file.id !== id));
      } catch (error) {
        console.error(
          "Error deleting the file:",
          error?.response?.data?.message || error || "Unknown error occurred"
        );
      }
    }
  };

  const handleClicked = (file) => {
    if (selectedFile?.src === file.src) {
      setSelectedFile({});
    } else {
      setSelectedFile(file);
      handleInputChange(index, "file", file.src);
      handleInputChange(index, "name", file.name);
    }
  };

  const handleSave = () => {
    setSelectedFile(selectedFile);
  };

  return (
    <>
      <Button2 variant="outline" className="h-8" onClick={onOpen}>
        {__("Choose file", "whizmanage")}
      </Button2>
      <Modal
        size="5xl"
        backdrop="opaque"
        placement="top-center"
        isOpen={isOpen}
        onOpenChange={onOpenChange}
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
          backdrop:
            "bg-gradient-to-t from-zinc-900 to-zinc-900/10 backdrop-opacity-20",
        }}
      >
        <ModalContent className="dark:bg-slate-800">
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 text-center text-3xl text-gray-400">
                {__("Select File", "whizmanage")}
              </ModalHeader>

              <ModalBody>
                <div className="flex w-full flex-col items-center">
                  <div className="!h-[500px] w-full overflow-y-scroll">
                    <UploadMediaClient
                      setClientImages={setFiles}
                      setSelectedImage={setSelectedFile}
                    />

                    {/* סינון + חיפוש */}
                    <div className="w-full h-20 flex justify-between items-center gap-2 px-4">
                      <div className="flex justify-around gap-2">
                        <Button2
                          variant={filter === "all" ? "default" : "outline"}
                          onClick={() => setFilter("all")}
                          className="h-8 rounded-full"
                        >
                          {__("All", "whizmanage")}
                        </Button2>
                        <Button2
                          variant={filter === "images" ? "default" : "outline"}
                          onClick={() => setFilter("images")}
                          className="h-8 rounded-full"
                        >
                          {__("Images", "whizmanage")}
                        </Button2>
                        <Button2
                          variant={filter === "files" ? "default" : "outline"}
                          onClick={() => setFilter("files")}
                          className="h-8 rounded-full"
                        >
                          {__("Files", "whizmanage")}
                        </Button2>
                      </div>

                      <div className="relative h-10 w-80 border rounded-lg flex gap-1 items-center px-2 dark:bg-slate-700">
                        <IoIosSearch className="w-6 h-6 text-gray-500" />
                        <Input
                          placeholder={__("Search file...", "whizmanage")}
                          type="search"
                          value={searchFile}
                          onChange={(event) => setSearchFile(event.target.value)}
                          className="!border-none !ring-0 placeholder:text-slate-400 dark:!text-slate-300 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0"
                        />
                      </div>
                    </div>

                    {/* קבצים */}
                    <div className="flex flex-wrap gap-4 justify-center pb-4">
                      {loading ? (
                        <Loader />
                      ) : files.length > 0 ? (
                        files.map((file) => (
                          <Card
                            key={file.id}
                            isFooterBlurred
                            radius="md"
                            className={cn(
                              "max-h-fit !bg-slate-100 dark:bg-slate-700",
                              selectedFile?.src === file?.src &&
                                "shadow shadow-fuchsia-600"
                            )}
                          >
                            <CardHeader className="absolute z-10 top-0 flex-col !items-end">
                              <Button
                                className="text-tiny text-fuchsia-600 bg-white/50 hover:!bg-white/70"
                                variant="flat"
                                color="default"
                                radius="sm"
                                size="sm"
                                isIconOnly
                                onClick={(event) => deleteFile(file.id, event)}
                              >
                                <Trash2 className="w-4" />
                              </Button>
                            </CardHeader>

                            <div
                              className={cn(
                                selectedFile?.src === file?.src &&
                                  "border-1 border-b-0 border-fuchsia-600",
                                "!w-[223px] !h-[223px] overflow-hidden image-container rounded-xl"
                              )}
                              onClick={() => handleClicked(file)}
                            >
                              <Image
                                alt={file.name}
                                className="object-contain z-0 rounded-lg"
                                src={
                                  file.media_type === "image"
                                    ? file.src
                                    : defaultFileIcon
                                }
                                isPressable
                              />
                              {selectedFile?.src === file?.src && (
                                <CardBody className="absolute z-10 top-0 h-full flex-col !items-center justify-center bg-black/30">
                                  <Check className="w-20 h-20 text-fuchsia-600" />
                                </CardBody>
                              )}
                            </div>

                            <ImageName image={file} />
                          </Card>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center space-y-4 pt-4 max-w-60 mx-auto">
                          <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                              <Check className="w-8 h-8 text-gray-400 dark:text-slate-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-slate-200 mb-2">
                              {searchFile
                                ? __("No files found", "whizmanage")
                                : __("No files available", "whizmanage")}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
                              {searchFile
                                ? __(
                                "No files match your search. Try different keywords or upload new files.",
                                "whizmanage"
                              )
                                : __(
                                "No files in your media library yet. Upload your first file to get started.",
                                "whizmanage"
                              )}
                            </p>
                          </div>
                          {searchFile && (
                            <Button2
                              variant="outline"
                              onClick={() => setSearchFile("")}
                              className="px-4"
                            >
                              {__("Clear search", "whizmanage")}
                            </Button2>
                          )}
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
                  currentCount={files.length}
                  totalItems={totalItems}
                  resourceLabel={__("media items", "whizmanage")}
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

export default ChooseFile;
