import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import Dropzone from "react-dropzone";
import { __ } from '@wordpress/i18n';
import { toast } from "sonner";

const UploadMediaClient = ({
  setClientImages,
  setSelectedImages,
  setSelectedImage,
}) => {
  const [loading, setLoading] = useState(false);
   

  const validFileTypes = {
    "image/jpeg": [".jpeg", ".jpg"],
    "image/png": [".png"],
    "image/gif": [".gif"],
    "image/webp": [".webp"],
    "application/pdf": [".pdf"],
    "application/msword": [".doc"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    "application/vnd.ms-powerpoint": [".ppt", ".pps"],
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx", ".ppsx"],
    "application/vnd.oasis.opendocument.text": [".odt"],
    "application/vnd.ms-excel": [".xls"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    "application/vnd.apple.keynote": [".key"],
    "audio/*": [],
    "video/*": [],
    "application/zip": [".zip"],
    "application/x-zip-compressed": [".zip"],
    "text/uri-list": [],
    "text/html": [],
  };

  const resolveImageUrl = (raw) => {
    try {
      if (!raw) return null;
      if (raw.startsWith("data:image/")) return raw;
      const u = new URL(raw);
      if (u.hostname.includes("google.") && u.pathname === "/imgres") {
        const actual = u.searchParams.get("imgurl");
        if (actual) return actual;
      }
      return raw;
    } catch {
      return raw;
    }
  };

  const uploadFiles = async (files) => {
    if (!files?.length) return;
    setLoading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(window.siteUrl + "/wp-json/wp/v2/media", {
          method: "POST",
          headers: { "X-WP-Nonce": window.rest },
          body: formData,
        });
        if (!response.ok) throw new Error(await response.text());

        const data = await response.json();
        toast(
          <div className="p-4 w-full h-full !border-l-4 !border-l-fuchsia-600 dark:bg-slate-800 dark:text-slate-300 rounded-md flex gap-4 items-center justify-start">
            <CheckCircle className="w-5 h-5 text-fuchsia-600" />
            {__("The image has been uploaded successfully", "whizmanage")}
          </div>,
          { duration: 5000 }
        );

        const newClientImage = {
          id: data.id,
          src: data.source_url,
          name: data?.title?.rendered || data?.title,
        };
        setClientImages && setClientImages((prev) => [newClientImage, ...prev]);
        setSelectedImages && setSelectedImages((prev) => [newClientImage, ...prev]);
        setSelectedImage && setSelectedImage(newClientImage);
      }
    } catch (error) {
      console.error("Error uploading media:", error);
      toast(
        <div className="p-4 w-full h-full !border-l-4 !border-l-red-500 dark:bg-slate-800 dark:text-slate-300 rounded-md flex gap-4 items-center justify-start">
          <XCircle className="w-5 h-5 text-red-500" />
          {__("Error uploading media: ", "whizmanage")} <br />
          {error.message || "Unknown error occurred"}
        </div>,
        { duration: 5000 }
      );
    } finally {
      setLoading(false);
    }
  };

  const convertImageToPng = (blob) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((newBlob) => {
          if (!newBlob) return reject("המרת blob נכשלה");
          const file = new File([newBlob], "converted.png", { type: "image/png" });
          resolve(file);
        }, "image/png");
      };
      img.onerror = () => reject("טעינת תמונה נכשלה");
      img.src = URL.createObjectURL(blob);
    });
  };

  const uploadImageFromUrl = async (rawUrl) => {
    try {
      const url = resolveImageUrl(rawUrl);

      const response = await fetch(url, { mode: "cors", referrerPolicy: "no-referrer" });
      if (!response.ok) throw new Error("הקישור לא נגיש: " + response.status);

      const blob = await response.blob();
      if (!blob.type.startsWith("image/")) throw new Error("לא מדובר בקובץ תמונה");

      const type = blob.type || "image/jpeg";
      const extension = type.split("/")[1] || "jpeg";
      const name = `external-image.${extension}`;

      let file = new File([blob], name, { type });

      const supportedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!supportedTypes.includes(file.type)) {
        const converted = await convertImageToPng(blob);
        if (!converted) throw new Error("המרת קובץ נכשלה");
        file = converted;
      }

      await uploadFiles([file]);
    } catch (error) {
      if (error && (error.name === "TypeError" || /Failed to fetch/i.test(error.message))) {
        return;
      }
      console.error("שגיאה בהעלאה מ-URL:", error);
      toast.error(t(error.message) || __("Error occurred during uploading", "whizmanage"));
    }
  };

  const onDrop = async (acceptedFiles, event) => {
    if (loading) return;

    const dt = event?.dataTransfer;
    const types = Array.from(dt?.types || []);
    const items = dt?.items || [];
    const seen = new Set();

    // מסלול URI/HTML
    if (types.includes("text/html") || types.includes("text/uri-list")) {
      const tasks = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        if (item.kind === "string" && item.type === "text/html") {
          tasks.push(new Promise((res) => {
            item.getAsString((html) => {
              try {
                const doc = new DOMParser().parseFromString(html, "text/html");
                const img = doc.querySelector("img");
                const url = resolveImageUrl(img?.src);
                if (url && !seen.has(url)) {
                  seen.add(url);
                  uploadImageFromUrl(url);
                }
              } finally { res(); }
            });
          }));
        }

        if (item.kind === "string" && item.type === "text/uri-list") {
          tasks.push(new Promise((res) => {
            item.getAsString((list) => {
              try {
                list
                  .split("\n")
                  .map((u) => resolveImageUrl(u.trim()))
                  .filter(Boolean)
                  .forEach((u) => {
                    if (!seen.has(u)) {
                      seen.add(u);
                      uploadImageFromUrl(u);
                    }
                  });
              } finally { res(); }
            });
          }));
        }
      }

      await Promise.all(tasks);
      return; // לא לעבור גם למסלול הקבצים
    }

    // מסלול קבצים רגיל
    const filteredFiles = acceptedFiles.filter((file) => {
      const ext = "." + file.name.split(".").pop().toLowerCase();
      return validFileTypes[file.type]?.includes(ext);
    });

    if (filteredFiles.length) {
      await uploadFiles(filteredFiles);
    }
  };

  const maxsize = 3000000;

  return (
    <div className="w-full mb-2 p-2 relative" aria-busy={loading}>
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-black/40 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin mb-2 text-white" />
          <span className="text-white font-medium">{__("Uploading...", "whizmanage")}</span>
        </div>
      )}
      <Dropzone
        onDrop={onDrop}
        accept={validFileTypes}
        maxSize={maxsize}
        disabled={loading}
      >
        {({ getRootProps, getInputProps, isDragActive, isDragReject, fileRejections }) => {
          const isFileTooLarge = fileRejections.some((file) => file.file.size > maxsize);
          return (
            <section className="w-full">
              <div
                {...getRootProps()}
                className={cn(
                  "text-xl w-full h-24 flex justify-center items-center border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-lg text-center cursor-pointer dark:hover:bg-gray-700 hover:border-fuchsia-600 transition-all",
                  loading && "pointer-events-none opacity-60",
                  isDragActive
                    ? "bg-fuchsia-600 text-white animate-pulse"
                    : "dark:bg-gray-800/80 text-slate-400 font-semibold hover:text-fuchsia-600 hover:animate-pulse"
                )}
              >
                <input {...getInputProps()} multiple />
                {!isDragActive && (
                  <p className="text-xl">
                    {__("Drag and drop some files here, or click to select files", "whizmanage")}
                  </p>
                )}
                {isDragActive && !isDragReject && (
                  <p className="text-xl">{__("Drop the files here...", "whizmanage")}</p>
                )}
                {isDragReject &&
                  fileRejections.some(
                    (rej) =>
                      rej.file.type !== "text/html" && rej.file.type !== "text/uri-list"
                  ) && <p className="text-xl">{__("Unsupported file type...", "whizmanage")}</p>}
                {isFileTooLarge && <p className="text-xl">{__("The file is too large.", "whizmanage")}</p>}
              </div>
            </section>
          );
        }}
      </Dropzone>
    </div>
  );
};

export default UploadMediaClient;