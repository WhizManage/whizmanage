import { getApi } from "@/services/services";
import { Avatar, AvatarGroup } from "@heroui/react";
import { useEffect, useState } from "react";
import MediaClient from "../../edit/gallery/MediaClient";

const AddImages = ({ images, updateValue, index }) => {
  const [clientImages, setClientImages] = useState([]);
  const [galleryImages, setGalleryImages] = useState(images);
  const [searchImg, setSearchImg] = useState("");
  const [UpdateUI, setUpdateUI] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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
  }, [searchImg, page]);

  useEffect(() => {
    updateValue(index, "value", galleryImages);
  }, [galleryImages]);

  return (
    <div
      className="w-full shadow dark:shadow-xl !rounded-lg border border-neutral-200 dark:border-slate-700 overflow-auto scroll-smooth select-none
  !scrollbar-hide scrollbar-none h-16 flex gap-10"
    >
      <MediaClient
        bulkEdit={true}
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
      <div className="flex-1 h-full flex items-center justify-start">
        <AvatarGroup isBordered max={12} radius="sm">
          {galleryImages.map((image, index) => (
            <Avatar src={image.src} key={index} radius="sm" isBordered />
          ))}
        </AvatarGroup>
      </div>
    </div>
  );
};

export default AddImages;
