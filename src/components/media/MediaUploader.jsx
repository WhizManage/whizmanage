// src/components/media/MediaUploader.jsx
import { cn, toast } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useState } from "react";
 import { __ } from "@wordpress/i18n";
import Dropzone from "react-dropzone";
import useMediaStore from "./store/useMediaStore";

// קיצור שם קובץ ארוך תוך שמירה על הסיומת
const truncateFileName = (file, maxLength = 80) => {
  const name = file.name;
  if (name.length <= maxLength) return file;

  const lastDot = name.lastIndexOf(".");
  const ext = lastDot !== -1 ? name.slice(lastDot) : "";
  const baseName = lastDot !== -1 ? name.slice(0, lastDot) : name;

  const maxBaseLength = maxLength - ext.length;
  const truncatedBase = baseName.slice(0, maxBaseLength);

  const newName = truncatedBase + ext;
  return new File([file], newName, { type: file.type });
};

const MediaUploader = ({ onUploadComplete, acceptedTypes = "all" }) => {
   
  const [loading, setLoading] = useState(false);
  const { uploadFile } = useMediaStore();

  // 🆕 הגדרת סוגי קבצים מותרים לפי הפרמטר
  const validFileTypes = (() => {
    if (acceptedTypes === "image") {
return {
    "image/jpeg": [".jpeg", ".jpg"],
    "image/png": [".png"],
    "image/gif": [".gif"],
    "image/webp": [".webp"],
    "image/avif": [".avif"],
    "image/x-avif": [".avif"],  
};

    }

    // 🆕 מצב וידאו
    if (acceptedTypes === "video") {
      return {
        "video/mp4": [".mp4"],
        "video/webm": [".webm"],
        "video/ogg": [".ogv", ".ogg"],
      };
    }

    if (acceptedTypes === "file") {
      return {
        "application/pdf": [".pdf"],
        "application/zip": [".zip"],
        "application/x-rar-compressed": [".rar"],
        "application/msword": [".doc"],
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
        "application/vnd.ms-excel": [".xls"],
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
        "text/plain": [".txt"],
      };
    }

    // 'all' - כל סוגי הקבצים
    return {
      "image/jpeg": [".jpeg", ".jpg"],
      "image/png": [".png"],
      "image/gif": [".gif"],
      "image/webp": [".webp"],
      "application/pdf": [".pdf"],
      "application/zip": [".zip"],
      "application/x-rar-compressed": [".rar"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "text/plain": [".txt"],
    };
  })();

  const uploadFiles = async (files) => {
    if (!files?.length) return;
    setLoading(true);

    try {
      const uploadedFiles = [];

      for (const file of files) {
        try {
          const safeFile = truncateFileName(file);
          const newFile = await uploadFile(safeFile);
          uploadedFiles.push(newFile);

          toast.success(__("The file has been uploaded successfully", "whizmanage"));
        } catch (error) {
          console.error("Error uploading file:", error);
          toast.error(`${__("Error uploading media: ", "whizmanage")} ${file.name}`);
        }
      }

      // Notify parent about uploaded files
      if (uploadedFiles.length > 0 && onUploadComplete) {
        onUploadComplete(uploadedFiles);
      }
    } finally {
      setLoading(false);
    }
  };

  const maxsize = 10000000; // 10MB

  return (
    <div className="w-full relative" aria-busy={loading}>
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-black/40 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin mb-2 text-white" />
          <span className="text-white font-medium">{__("Uploading...", "whizmanage")}</span>
        </div>
      )}
      <Dropzone
        onDrop={uploadFiles}
        accept={validFileTypes}
        maxSize={maxsize}
        disabled={loading}
      >
        {({
          getRootProps,
          getInputProps,
          isDragActive,
          isDragReject,
          fileRejections,
        }) => {
          const isFileTooLarge = fileRejections.some(
            (file) => file.file.size > maxsize
          );

          return (
            <section className="w-full">
              <div
                {...getRootProps()}
                className={cn(
                  "text-xl w-full h-24 flex justify-center items-center border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-lg text-center cursor-pointer dark:hover:bg-gray-700 hover:border-fuchsia-600 transition-all",
                  loading && "pointer-events-none opacity-60",
                  isDragActive
                    ? "bg-fuchsia-600 text-white animate-pulse"
                    : "dark:bg-slate-800/80 text-slate-400 font-semibold hover:text-fuchsia-600 hover:animate-pulse"
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
                {isDragReject && (
                  <p className="text-xl">{__("Unsupported file type...", "whizmanage")}</p>
                )}
                {isFileTooLarge && (
                  <p className="text-xl">{__("The file is too large.", "whizmanage")}</p>
                )}
              </div>
            </section>
          );
        }}
      </Dropzone>
    </div>
  );
};

export default MediaUploader;