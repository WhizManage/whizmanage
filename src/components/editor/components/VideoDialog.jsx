// src/layout/editor/components/VideoDialog.jsx
import MediaUploader from "@/components/media/MediaUploader";
import useMediaStore from "@/components/media/store/useMediaStore";
import { confirm } from "@/components/ui/custom/CustomConfirm";
// import { cn, toast } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import {
  cn,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import {
  Check,
  Copy,
  Link as LinkIcon,
  Play,
  RefreshCcw,
  Trash2,
  Video,
} from "lucide-react";
import { IconBadge } from "@components/ui/custom/IconBadge";
import { useCallback, useEffect, useRef, useState } from "react";
 import { __ } from "@wordpress/i18n";

const VideoDialog = ({ isOpen, onClose, onInsert }) => {
   

  // Tab state
  const [activeTab, setActiveTab] = useState("url");

  // URL Tab state
  const [videoUrl, setVideoUrl] = useState("");
  const [width, setWidth] = useState(560);
  const [height, setHeight] = useState(315);
  const [autoplay, setAutoplay] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const [previewHtml, setPreviewHtml] = useState("");

  // Library Tab state
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [localSearch, setLocalSearch] = useState("");
  const debounceTimer = useRef(null);
  const listScrollRef = useRef(null);
  const sentinelRef = useRef(null);

  const {
    images: libraryVideos,
    loading: isLoadingLibrary,
    currentPage,
    totalPages,
    fetchImages,
    deleteImage,
    setMediaType,
  } = useMediaStore();

  // Filter only videos from library
  const videosOnly = libraryVideos.filter(
    (item) => item.mime_type && item.mime_type.startsWith("video/")
  );

  // Fetch videos when library tab opens
  useEffect(() => {
    if (isOpen && activeTab === "library") {
      setMediaType("all");
      fetchImages(localSearch, 1, "all");
    }
  }, [isOpen, activeTab, setMediaType, fetchImages, localSearch]);

  // Debounced search
  useEffect(() => {
    if (activeTab !== "library" || !isOpen) return;
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      fetchImages(localSearch, 1, "all");
    }, 300);
    return () => clearTimeout(debounceTimer.current);
  }, [localSearch, activeTab, fetchImages, isOpen]);

  // Infinite scroll
  useEffect(() => {
    if (activeTab !== "library" || !isOpen) return;
    const root = listScrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (
            entry.isIntersecting &&
            !isLoadingLibrary &&
            currentPage < totalPages
          ) {
            fetchImages(localSearch, currentPage + 1, "all");
          }
        });
      },
      { root, rootMargin: "600px", threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    activeTab,
    isOpen,
    isLoadingLibrary,
    currentPage,
    totalPages,
    fetchImages,
    localSearch,
  ]);

  // Cleanup when modal closes
  useEffect(() => {
    if (!isOpen) {
      clearTimeout(debounceTimer.current);
    }
  }, [isOpen]);

  // URL Helpers
  const extractYouTubeId = (url) => {
    const regExp =
      /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const extractVimeoId = (url) => {
    const regExp = /vimeo\.com\/(\d+)/;
    const match = url.match(regExp);
    return match ? match[1] : null;
  };

  const generateEmbedHtml = useCallback(
    (url, w, h, mimeType = null) => {
      const controlsAttr = showControls ? "controls" : "";
      const autoplayAttr = autoplay ? "autoplay muted playsinline" : "";

      // YouTube
      if (url && (url.includes("youtube.com") || url.includes("youtu.be"))) {
        const id = extractYouTubeId(url);
        if (id) {
          const a = autoplay ? "&autoplay=1" : "";
          const c = showControls ? "" : "&controls=0";
          return `
<div data-wysiwyg="video" contenteditable="false" style="margin:10px 0;">
  <iframe src="https://www.youtube.com/embed/${id}?rel=0${a}${c}" width="${w}" height="${h}" frameborder="0" allowfullscreen style="max-width:100%;"></iframe>
</div>`.trim();
        }
      }

      // Vimeo
      if (url && url.includes("vimeo.com")) {
        const id = extractVimeoId(url);
        if (id) {
          const a = autoplay ? "&autoplay=1" : "";
          return `
<div data-wysiwyg="video" contenteditable="false" style="margin:10px 0;">
  <iframe src="https://player.vimeo.com/video/${id}?color=ffffff&title=0&byline=0&portrait=0${a}" width="${w}" height="${h}" frameborder="0" allowfullscreen style="max-width:100%;"></iframe>
</div>`.trim();
        }
      }

      // Direct video file
      if (
        url &&
        (/\.(mp4|webm|ogg)$/i.test(url) ||
          (mimeType && /^video\//i.test(mimeType)))
      ) {
        return `
<div data-wysiwyg="video" contenteditable="false" style="margin:10px 0;">
  <video ${controlsAttr} ${autoplayAttr} width="${w}" height="${h}" data-mp4="${url}" style="max-width:100%;">
    <source src="${url}" ${mimeType ? `type="${mimeType}"` : ""}>
    ${__("Your browser does not support the video tag.", "whizmanage")}
  </video>
</div>`.trim();
      }

      return "";
    },
    [autoplay, showControls]
  );

  const generateShortcode = (url, w, h, mimeType = null) => {
    if (!url) return "";
    const isDirect =
      /\.(mp4|webm|ogg)$/i.test(url) ||
      (mimeType && /^video\//i.test(mimeType));
    if (!isDirect) return "";
    const attrs = [
      w ? `width="${w}"` : null,
      h ? `height="${h}"` : null,
      `mp4="${url}"`,
    ]
      .filter(Boolean)
      .join(" ");
    return `[video ${attrs}][/video]`;
  };

  // Update preview when URL or settings change
  useEffect(() => {
    if (activeTab === "url" && videoUrl) {
      const html = generateEmbedHtml(videoUrl, 320, 180);
      setPreviewHtml(html);
    } else if (activeTab === "url") {
      setPreviewHtml("");
    }
  }, [videoUrl, autoplay, showControls, activeTab, generateEmbedHtml]);

  const handleWidthChange = (e) => {
    const newW = parseInt(e.target.value) || 560;
    setWidth(newW);
    if (maintainAspectRatio) setHeight(Math.round((newW * 9) / 16));
  };

  const handleHeightChange = (e) => {
    const newH = parseInt(e.target.value) || 315;
    setHeight(newH);
    if (maintainAspectRatio) setWidth(Math.round((newH * 16) / 9));
  };

  const handleTabChange = (value) => {
    setActiveTab(value);
    setPreviewHtml("");
    if (value === "url") {
      setSelectedVideo(null);
    } else {
      setVideoUrl("");
    }
  };

  const handleInsert = () => {
    let finalUrl = "";
    let finalMime = null;

    if (activeTab === "url") {
      finalUrl = videoUrl;
    } else if (activeTab === "library" && selectedVideo) {
      finalUrl = selectedVideo.src;
      finalMime = selectedVideo.mime_type;
    }

    if (!finalUrl) {
      toast.error(__("Please select a valid video", "whizmanage"));
      return;
    }

    const html = generateEmbedHtml(finalUrl, width, height, finalMime);
    const shortcode = generateShortcode(finalUrl, width, height, finalMime);

    onInsert({ html, shortcode });
    handleClose();
  };

  const handleClose = () => {
    setActiveTab("url");
    setVideoUrl("");
    setSelectedVideo(null);
    setPreviewHtml("");
    setAutoplay(false);
    setShowControls(true);
    setMaintainAspectRatio(true);
    setWidth(560);
    setHeight(315);
    setLocalSearch("");
    onClose?.();
  };

  const handleDeleteVideo = async (id, e) => {
    e?.stopPropagation();
    const confirmed = await confirm({
      title: __("Delete Video", "whizmanage"),
      message: __("Are you sure you want to delete this video?", "whizmanage"),
      confirmText: __("Delete", "whizmanage"),
      cancelText: __("Cancel", "whizmanage"),
    });
    if (confirmed) {
      try {
        await deleteImage(id);
        if (selectedVideo?.id === id) setSelectedVideo(null);
        toast.success(__("Video deleted successfully", "whizmanage"));
      } catch {
        toast.error(__("Failed to delete video", "whizmanage"));
      }
    }
  };

  const copyVideoUrl = (url, e) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(url);
    toast.success(__("Link copied to clipboard", "whizmanage"));
  };

  const canInsert =
    (activeTab === "url" && !!videoUrl) ||
    (activeTab === "library" && !!selectedVideo);

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
      size={activeTab === "library" ? "5xl" : "2xl"}
      backdrop="opaque"
      placement="center"
      portalContainer={
        typeof document !== "undefined" ? document.body : undefined
      }
      classNames={{
        base: "dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-full max-w-[1100px]",
        backdrop:
          "bg-gradient-to-t from-zinc-900 to-zinc-900/10 backdrop-opacity-20",
        wrapper: "z-[99999]",
        header: "border-b dark:border-slate-700",
        footer: "border-t dark:border-slate-700",
        closeButton: "hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 rounded-lg",
      }}
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex gap-3 justify-center items-center">
              <IconBadge icon={Video} variant="default" size="default" />
              <h2 className="text-xl font-semibold dark:text-slate-200">
                {__("Insert Video", "whizmanage")}
              </h2>
            </ModalHeader>

            <ModalBody>
              <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="grid w-full grid-cols-2 mb-4 h-11 p-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                  <TabsTrigger
                    value="url"
                    className="flex items-center justify-center gap-2 h-full rounded-md text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:dark:bg-slate-800 data-[state=active]:shadow-sm data-[state=active]:text-fuchsia-600 data-[state=inactive]:text-slate-500 data-[state=inactive]:hover:text-slate-700 dark:data-[state=inactive]:text-slate-400"
                  >
                    <LinkIcon className="w-4 h-4" />
                    <span>{__("Embed URL", "whizmanage")}</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="library"
                    className="flex items-center justify-center gap-2 h-full rounded-md text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:dark:bg-slate-800 data-[state=active]:shadow-sm data-[state=active]:text-fuchsia-600 data-[state=inactive]:text-slate-500 data-[state=inactive]:hover:text-slate-700 dark:data-[state=inactive]:text-slate-400"
                  >
                    <Video className="w-4 h-4" />
                    <span>{__("Media Library", "whizmanage")}</span>
                  </TabsTrigger>
                </TabsList>

                {/* ============ URL TAB ============ */}
                <TabsContent value="url" className="h-[450px] overflow-y-auto scrollbar-whiz">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    {/* Left: Controls */}
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                        <Label
                          htmlFor="video-url"
                          className="dark:text-slate-300"
                        >
                          {__("Video URL", "whizmanage")}
                        </Label>
                        <Input
                          id="video-url"
                          type="url"
                          value={videoUrl}
                          onChange={(e) => setVideoUrl(e.target.value)}
                          placeholder="https://youtube.com/watch?v=... | https://vimeo.com/... | https://.../video.mp4"
                          className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300"
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-300">
                          {__(
                            "Supported: YouTube, Vimeo, direct video files (.mp4, .webm, .ogg)",
                            "whizmanage"
                          )}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <Label
                            htmlFor="width"
                            className="dark:text-slate-300"
                          >
                            {__("Width", "whizmanage")}
                          </Label>
                          <Input
                            id="width"
                            type="number"
                            min="100"
                            max="1920"
                            value={width}
                            onChange={handleWidthChange}
                            className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label
                            htmlFor="height"
                            className="dark:text-slate-300"
                          >
                            {__("Height", "whizmanage")}
                          </Label>
                          <Input
                            id="height"
                            type="number"
                            min="100"
                            max="1080"
                            value={height}
                            onChange={handleHeightChange}
                            className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="aspect-ratio"
                          checked={maintainAspectRatio}
                          onChange={(e) =>
                            setMaintainAspectRatio(e.target.checked)
                          }
                          className="w-4 h-4 rounded border-slate-300 text-fuchsia-600 focus:ring-fuchsia-500"
                        />
                        <Label
                          htmlFor="aspect-ratio"
                          className="text-sm dark:text-slate-300 cursor-pointer"
                        >
                          {__("Maintain aspect ratio (16:9)", "whizmanage")}
                        </Label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="show-controls"
                          checked={showControls}
                          onChange={(e) => setShowControls(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-fuchsia-600 focus:ring-fuchsia-500"
                        />
                        <Label
                          htmlFor="show-controls"
                          className="text-sm dark:text-slate-300 cursor-pointer"
                        >
                          {__("Show controls", "whizmanage")}
                        </Label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="autoplay"
                          checked={autoplay}
                          onChange={(e) => setAutoplay(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-fuchsia-600 focus:ring-fuchsia-500"
                        />
                        <Label
                          htmlFor="autoplay"
                          className="text-sm dark:text-slate-300 cursor-pointer"
                        >
                          {__("Autoplay", "whizmanage")}
                        </Label>
                      </div>
                    </div>

                    {/* Right: Preview */}
                    <div className="flex flex-col gap-3">
                      <h4 className="text-base font-medium dark:text-slate-300">
                        {__("Preview", "whizmanage")}
                      </h4>
                      <div className="border rounded-lg p-4 min-h-[220px] flex items-center justify-center bg-slate-50 dark:bg-slate-900 dark:border-slate-600">
                        {previewHtml ? (
                          <div
                            dangerouslySetInnerHTML={{ __html: previewHtml }}
                            className="w-full flex justify-center"
                          />
                        ) : (
                          <div className="text-center">
                            <Video className="mx-auto h-12 w-12 text-slate-400 mb-2" />
                            <p className="text-slate-500 dark:text-slate-300 text-sm">
                              {__("Enter a video URL to see preview", "whizmanage")}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* ============ LIBRARY TAB ============ */}
                <TabsContent value="library" className="h-[450px] overflow-y-auto scrollbar-whiz">
                  <div className="py-4 flex flex-col gap-4">
                    {/* Upload + Search */}
                    <MediaUploader
                      onUploadComplete={() => {}}
                      acceptedTypes="video"
                    />

                    <div className="flex items-center justify-between gap-4">
                      <Input
                        placeholder={__("Search videos...", "whizmanage")}
                        type="search"
                        value={localSearch}
                        onChange={(e) => setLocalSearch(e.target.value)}
                        className="max-w-xs dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300"
                      />
                      {selectedVideo && (
                        <div className="flex items-center gap-2 text-sm text-fuchsia-600">
                          <Check className="w-4 h-4" />
                          <span className="truncate max-w-[200px]">
                            {selectedVideo.name || `Video ${selectedVideo.id}`}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Video Grid */}
                    <div
                      ref={listScrollRef}
                      className="flex-1 min-h-0 overflow-y-auto pr-2 scrollbar-whiz"
                    >
                      {isLoadingLibrary && videosOnly.length === 0 ? (
                        <div className="flex items-center justify-center h-[300px]">
                          <RefreshCcw className="w-10 h-10 animate-spin text-fuchsia-600" />
                        </div>
                      ) : videosOnly.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[300px] text-slate-500 dark:text-slate-300">
                          <Video className="w-12 h-12 mb-3 opacity-50" />
                          <p>{__("No videos found", "whizmanage")}</p>
                          <p className="text-xs mt-1">
                            {__("Upload videos using the area above", "whizmanage")}
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                          {videosOnly.map((vid) => {
                            const isSelected = selectedVideo?.id === vid.id;
                            return (
                              <div
                                key={vid.id}
                                onClick={() => setSelectedVideo(vid)}
                                className={cn(
                                  "relative group border rounded-lg overflow-hidden cursor-pointer transition-all",
                                  isSelected
                                    ? "ring-2 ring-fuchsia-600 border-fuchsia-600"
                                    : "border-slate-300 dark:border-slate-600 hover:border-fuchsia-400"
                                )}
                              >
                                {/* Video thumbnail */}
                                <div className="aspect-video bg-slate-900 flex items-center justify-center">
                                  <video
                                    src={vid.src}
                                    className="w-full h-full object-cover"
                                    muted
                                    preload="metadata"
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Play className="w-10 h-10 text-white/80" />
                                  </div>
                                </div>
                                {/* Title */}
                                <div className="p-2 bg-white dark:bg-slate-800">
                                  <p className="text-xs truncate text-slate-700 dark:text-slate-300">
                                    {vid.name || `Video ${vid.id}`}
                                  </p>
                                </div>
                                {/* Actions */}
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={(e) => copyVideoUrl(vid.src, e)}
                                    className="p-1.5 rounded bg-white/80 hover:bg-white text-slate-600 hover:text-fuchsia-600 transition-colors"
                                    title={__("Copy link", "whizmanage")}
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) =>
                                      handleDeleteVideo(vid.id, e)
                                    }
                                    className="p-1.5 rounded bg-white/80 hover:bg-white text-slate-600 hover:text-red-600 transition-colors"
                                    title={__("Delete", "whizmanage")}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                {/* Selected badge */}
                                {isSelected && (
                                  <div className="absolute top-2 left-2 bg-fuchsia-600 text-white p-1 rounded">
                                    <Check className="w-3.5 h-3.5" />
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Infinite scroll sentinel */}
                          <div
                            ref={sentinelRef}
                            className="col-span-full h-4"
                          />
                        </div>
                      )}

                      {/* Loading more indicator */}
                      {isLoadingLibrary && videosOnly.length > 0 && (
                        <div className="flex justify-center py-4">
                          <RefreshCcw className="w-6 h-6 animate-spin text-fuchsia-600" />
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </ModalBody>

            <ModalFooter>
              <Button variant="outline" onClick={handleClose}>
                {__("Cancel", "whizmanage")}
              </Button>
              <Button
                onClick={handleInsert}
                disabled={!canInsert}
                className="gap-2"
              >
                <Play className="w-4 h-4" />
                {__("Insert Video", "whizmanage")}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default VideoDialog;
