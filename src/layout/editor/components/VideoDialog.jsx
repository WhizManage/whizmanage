import { useState, useRef, useCallback, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Switch, Tabs, Tab } from '@heroui/react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { __ } from '@wordpress/i18n';
import { Upload, Link as LinkIcon, Video, Play, X, RefreshCcw } from 'lucide-react';
import { uploadWpMedia } from '@/utils/wpMedia';
import { getApi } from '@/services/services';

const srOnlyStyle = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

const VideoDialog = ({ isOpen, onClose, onInsert, loadingIcon }) => {
   

  const [videoType, setVideoType] = useState('url');
  const [videoUrl, setVideoUrl] = useState('');
  const [width, setWidth] = useState(560);
  const [height, setHeight] = useState(315);
  const [previewData, setPreviewData] = useState(null);
  const [autoplay, setAutoplay] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);

  const [uploadedMedia, setUploadedMedia] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef(null);
  const previewContainerRef = useRef(null);

  // Media Library state
  const [libraryVideos, setLibraryVideos] = useState([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [selectedLibraryVideo, setSelectedLibraryVideo] = useState(null);
  const [libraryPage, setLibraryPage] = useState(1);
  const [libraryTotalPages, setLibraryTotalPages] = useState(1);

  // Scroll + infinite scroll sentinels
  const listScrollRef = useRef(null);
  const sentinelRef = useRef(null);

  // Customizable loading icon (default spinner)
  const LoadingIconEl = loadingIcon ?? (
    <RefreshCcw className="h-8 w-8 text-fuchsia-600 dark:text-fuchsia-500 animate-spin" />
  );

  // --- Media Library fetch (with paging) ---
  const fetchLibraryVideos = useCallback(
    async (page = 1, { append = false } = {}) => {
      try {
        setIsLoadingLibrary(true);
        const res = await getApi(
          `/wp-json/wp/v2/media?media_type=video&per_page=18&page=${page}&orderby=date&order=desc&_fields=id,source_url,title,mime_type,media_type`
        );
        const items = res?.data || [];
        const totalPages = parseInt(res?.headers?.['x-wp-totalpages'] ?? '1', 10);
        setLibraryTotalPages(Number.isFinite(totalPages) ? totalPages : 1);
        setLibraryPage(page);

        setLibraryVideos((prev) => {
          if (!append) return items;
          // דה-דופליקציה פשוטה
          const byId = new Map(prev.map((v) => [v.id, v]));
          for (const it of items) byId.set(it.id, { ...byId.get(it.id), ...it });
          return Array.from(byId.values());
        });
      } catch (err) {
        console.error('Error fetching library videos:', err);
      } finally {
        setIsLoadingLibrary(false);
      }
    },
    []
  );


  // Infinite scroll via IntersectionObserver (prefetch earlier via big rootMargin)
  useEffect(() => {
    if (videoType !== 'library') return;
    const root = listScrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (
            entry.isIntersecting &&
            !isLoadingLibrary &&
            libraryPage < libraryTotalPages
          ) {
            fetchLibraryVideos(libraryPage + 1, { append: true });
          }
        });
      },
      // טוען "קצת לפני" — פרה-פצ' מוקדם
      { root, rootMargin: '1200px', threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [videoType, isLoadingLibrary, libraryPage, libraryTotalPages, fetchLibraryVideos]);

  const extractYouTubeId = (url) => {
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const extractVimeoId = (url) => {
    const regExp = /vimeo\.com\/(\d+)/;
    const match = url.match(regExp);
    return match ? match[1] : null;
  };

  const generateShortcode = (url, w, h, type = null) => {
    if (!url) return '';
    const isDirect = /\.(mp4|webm|ogg)$/i.test(url) || (type && /^video\//i.test(type));
    if (!isDirect) return '';
    const attrs = [w ? `width="${w}"` : null, h ? `height="${h}"` : null, `mp4="${url}"`]
      .filter(Boolean)
      .join(' ');
    return `[video ${attrs}][/video]`;
  };

  const generateEmbedHtml = (url, w, h, type = null) => {
    const controlsAttr = showControls ? 'controls' : '';
    const autoplayAttr = autoplay ? 'autoplay muted playsinline' : '';

    if (url && (url.includes('youtube.com') || url.includes('youtu.be'))) {
      const id = extractYouTubeId(url);
      if (id) {
        const a = autoplay ? '&autoplay=1' : '';
        const c = showControls ? '' : '&controls=0';
        return `
<div data-wysiwyg="video" contenteditable="false" style="margin:10px 0;">
  <iframe src="https://www.youtube.com/embed/${id}?rel=0${a}${c}" width="${w}" height="${h}" frameborder="0" allowfullscreen style="max-width:100%;"></iframe>
</div>`.trim();
      }
    } else if (url && url.includes('vimeo.com')) {
      const id = extractVimeoId(url);
      if (id) {
        const a = autoplay ? '&autoplay=1' : '';
        return `
<div data-wysiwyg="video" contenteditable="false" style="margin:10px 0;">
  <iframe src="https://player.vimeo.com/video/${id}?color=ffffff&title=0&byline=0&portrait=0${a}" width="${w}" height="${h}" frameborder="0" allowfullscreen style="max-width:100%;"></iframe>
</div>`.trim();
      }
    } else if (url && (/\.(mp4|webm|ogg)$/i.test(url) || (type && /^video\//i.test(type)))) {
      return `
<div data-wysiwyg="video" contenteditable="false" style="margin:10px 0;">
 <video ${controlsAttr} ${autoplayAttr} width="${w}" height="${h}" 
  data-mp4="${url}" style="max-width:100%;">
  <source src="${url}" ${type ? `type="${type}"` : ''}>
  ${__('Your browser does not support the video tag.', "whizmanage")}
</video>
</div>`.trim();
    }
    return '';
  };

  const safeUpdatePreview = useCallback((htmlContent) => {
    try {
      setPreviewData(null);
      setTimeout(() => {
        if (htmlContent) {
          setPreviewData(htmlContent);
        }
      }, 50);
    } catch (error) {
      console.warn('Error updating preview:', error);
      setPreviewData(null);
    }
  }, []);

  const updatePreviewFromUrl = useCallback(
    (url) => {
      if (!url) {
        setPreviewData(null);
        return;
      }
      try {
        const html = generateEmbedHtml(url, 300, 200);
        safeUpdatePreview(html);
      } catch (error) {
        console.warn('Error generating preview from URL:', error);
        setPreviewData(null);
      }
    },
    [safeUpdatePreview]
  );

  // מאפשר העברת מימדים (ל־Library נשתמש גדול יותר)
  const updatePreviewFromUploaded = useCallback(
    (media, w = 560, h = 315) => {
      if (!media?.source_url) {
        setPreviewData(null);
        return;
      }
      try {
        const html = generateEmbedHtml(media.source_url, w, h, media.mime_type);
        safeUpdatePreview(html);
      } catch (error) {
        console.warn('Error generating preview from upload:', error);
        setPreviewData(null);
      }
    },
    [safeUpdatePreview]
  );

  const handleUrlChange = useCallback(
    (e) => {
      const url = e.target.value;
      setVideoUrl(url);
      setUploadedMedia(null);
      setPreviewData(null);
      if (url) {
        setTimeout(() => {
          updatePreviewFromUrl(url);
        }, 300);
      }
    },
    [updatePreviewFromUrl]
  );

  const handleWidthChange = (e) => {
    const newW = parseInt(e.target.value) || 560;
    setWidth(newW);
    if (maintainAspectRatio) setHeight(Math.round((newW * 9) / 16));
    if (videoType === 'url' && videoUrl) {
      setTimeout(() => updatePreviewFromUrl(videoUrl), 100);
    }
    if (videoType === 'file' && uploadedMedia) {
      setTimeout(() => updatePreviewFromUploaded(uploadedMedia), 100);
    }
    if (videoType === 'library' && selectedLibraryVideo) {
      setTimeout(() => updatePreviewFromUploaded(selectedLibraryVideo, newW, maintainAspectRatio ? Math.round((newW * 9) / 16) : height), 100);
    }
  };

  const handleHeightChange = (e) => {
    const newH = parseInt(e.target.value) || 315;
    setHeight(newH);
    if (maintainAspectRatio) setWidth(Math.round((newH * 16) / 9));
    if (videoType === 'url' && videoUrl) {
      setTimeout(() => updatePreviewFromUrl(videoUrl), 100);
    }
    if (videoType === 'file' && uploadedMedia) {
      setTimeout(() => updatePreviewFromUploaded(uploadedMedia), 100);
    }
    if (videoType === 'library' && selectedLibraryVideo) {
      setTimeout(() => updatePreviewFromUploaded(selectedLibraryVideo, maintainAspectRatio ? Math.round((newH * 16) / 9) : width, newH), 100);
    }
  };

  const clearUploaded = () => {
    setUploadedMedia(null);
    setPreviewData(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTabChange = (key) => {
    setPreviewData(null);
    setVideoType(key);

    if (key === 'url') {
      clearUploaded();
    } else {
      setVideoUrl('');
      if (uploadedMedia) {
        setTimeout(() => updatePreviewFromUploaded(uploadedMedia), 100);
      }
    }
    if (key === 'library' && libraryVideos.length === 0) {
      fetchLibraryVideos(1, { append: false });
    }
  };

  const handleFileSelectAndUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setPreviewData(null);

    try {
      const media = await uploadWpMedia(file);
      setUploadedMedia(media);
      setVideoUrl('');

      // הכנסה לראש הספרייה (ללא כפילויות)
      if (media?.mime_type?.startsWith('video/')) {
        setLibraryVideos((prev = []) => {
          if (prev.some((v) => v.id === media.id)) {
            // הרם לראש אם כבר קיים
            const without = prev.filter((v) => v.id !== media.id);
            return [media, ...without];
          }
          return [media, ...prev].slice(0, 18);
        });
      }

      setTimeout(() => updatePreviewFromUploaded(media), 200);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 413) {
        alert(
          __(
            'The file is too large for the server limit. Please increase upload_max_filesize/post_max_size or choose a smaller file.',
            "whizmanage"
          )
        );
      } else if (status === 500) {
        alert(
          __(
            'Server error during upload. If the file is large, increase upload limits (upload_max_filesize/post_max_size).',
            "whizmanage"
          )
        );
      } else {
        alert(__('Video upload failed: ', "whizmanage") + (err?.message || ''));
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleInsert = () => {
    let finalUrl = '';
    let finalType = null;

    if (videoType === 'file') {
      finalUrl = uploadedMedia?.source_url || '';
      finalType = uploadedMedia?.mime_type || null;
    } else if (videoType === 'url') {
      finalUrl = videoUrl;
    } else if (videoType === 'library') {
      finalUrl = selectedLibraryVideo?.source_url || '';
      finalType = selectedLibraryVideo?.mime_type || null;
    }

    const html = generateEmbedHtml(finalUrl, width, height, finalType);
    if (!html) {
      alert(t('Please select a valid video'));
      return;
    }

    const shortcode = generateShortcode(finalUrl, width, height, finalType);
    onInsert({ html, shortcode });
    handleClose();
  };

  useEffect(() => {
    if (videoType === 'library' && selectedLibraryVideo) {
      // רענון פריוויו לפי הבחירה הקיימת והמידות הנוכחיות
      updatePreviewFromUploaded(selectedLibraryVideo, width, height);
    }
  }, [videoType, selectedLibraryVideo, width, height, updatePreviewFromUploaded]);

  const handleClose = () => {
    setPreviewData(null);

    setTimeout(() => {
      setVideoUrl('');
      setUploadedMedia(null);
      setAutoplay(false);
      setShowControls(true);
      setMaintainAspectRatio(true);
      setVideoType('file'); // חזרה לברירת מחדל
      setWidth(560);
      setHeight(315);
      setIsUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      if (onClose) {
        onClose();
      }
    }, 50);
  };

  const canInsert =
    (videoType === 'url' && !!videoUrl) ||
    (videoType === 'file' && !!uploadedMedia) ||
    (videoType === 'library' && !!selectedLibraryVideo);

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          handleClose();
        }
      }}
      unmountOnClose={true}
      size={videoType === 'library' ? '5xl' : '2xl'} // רחב יותר רק בטאב הספרייה
      backdrop="opaque"
      placement="center"
      isDismissable={!isUploading}
      classNames={{
        base: 'dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-full max-w-[1100px]',
        backdrop: 'bg-gradient-to-t from-zinc-900 to-zinc-900/10 backdrop-opacity-20',
        header: 'border-b dark:border-slate-700',
        footer: 'border-t dark:border-slate-700',
      }}
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader>
              <h3 className="text-xl font-semibold dark:text-slate-200">
                {__('Insert Video', "whizmanage")}
              </h3>
            </ModalHeader>

            <ModalBody>
              <Tabs
                aria-label="Video source options"
                variant="underlined"
                selectedKey={videoType}
                onSelectionChange={handleTabChange}
                disableAnimation={true}
              >
                {/* URL */}
                <Tab
                  key="url"
                  title={
                    <div className="flex items-center gap-2">
                      <LinkIcon className="w-4 h-4" />
                      <span>{__('URL', "whizmanage")}</span>
                    </div>
                  }
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="video-url" className="dark:text-slate-300">
                          {__('Video URL', "whizmanage")}
                        </Label>
                        <Input
                          id="video-url"
                          type="url"
                          value={videoUrl}
                          onChange={handleUrlChange}
                          placeholder="https://.../file.mp4  |  https://www.youtube.com/watch?v=...  |  https://vimeo.com/..."
                          className="dark:!bg-slate-700 dark:!border-slate-600 dark:!text-slate-300 dark:!placeholder-slate-400"
                          disabled={isUploading}
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {__(
                            'Supported: YouTube, Vimeo, direct video files (.mp4, .webm, .ogg)',
                            "whizmanage"
                          )}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="width" className="dark:text-slate-300">
                            {__('Width', "whizmanage")}
                          </Label>
                          <Input
                            id="width"
                            type="number"
                            min="100"
                            max="1200"
                            value={width}
                            onChange={handleWidthChange}
                            className="dark:!bg-slate-700 dark:!border-slate-600 dark:!text-slate-300 dark:!placeholder-slate-400"
                            disabled={isUploading}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="height" className="dark:text-slate-300">
                            {__('Height', "whizmanage")}
                          </Label>
                          <Input
                            id="height"
                            type="number"
                            min="100"
                            max="800"
                            value={height}
                            onChange={handleHeightChange}
                            className="dark:!bg-slate-700 dark:!border-slate-600 dark:!text-slate-300 dark:!placeholder-slate-400"
                            disabled={isUploading}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          isSelected={maintainAspectRatio}
                          onValueChange={setMaintainAspectRatio}
                          size="sm"
                          color="primary"
                          isDisabled={isUploading}
                        />
                        <Label className="text-sm dark:text-slate-300">
                          {__('Maintain aspect ratio (16:9)', "whizmanage")}
                        </Label>
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Switch
                            isSelected={showControls}
                            onValueChange={setShowControls}
                            size="sm"
                            color="primary"
                            isDisabled={isUploading}
                          />
                          <Label className="text-sm dark:text-slate-300">{__('Show controls', "whizmanage")}</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            isSelected={autoplay}
                            onValueChange={setAutoplay}
                            size="sm"
                            color="primary"
                            isDisabled={isUploading}
                          />
                          <Label className="text-sm dark:text-slate-300">{__('Autoplay', "whizmanage")}</Label>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      <h4 className="text-lg font-medium dark:text-slate-300">{__('Preview', "whizmanage")}</h4>
                      <div className="border rounded-lg p-4 min-h-[250px] flex items-center justify-center bg-slate-50 dark:bg-slate-900 dark:border-slate-600">
                        {previewData ? (
                          <div dangerouslySetInnerHTML={{ __html: previewData }} className="w-full flex justify-center" />
                        ) : (
                          <div className="text-center">
                            <Video className="mx-auto h-12 w-12 text-slate-400 mb-2" />
                            <p className="text-slate-500 dark:text-slate-400 text-sm">
                              {__('Enter a video URL to see preview', "whizmanage")}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Tab>

                {/* File Upload */}
                <Tab
                  key="file"
                  title={
                    <div className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      <span>{__('Upload File', "whizmanage")}</span>
                    </div>
                  }
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                        <Label className="dark:text-slate-300">{__('Video File', "whizmanage")}</Label>

                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="video/*"
                          onChange={handleFileSelectAndUpload}
                          style={srOnlyStyle}
                          aria-hidden="true"
                          tabIndex={-1}
                          disabled={isUploading}
                        />

                        <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center hover:border-fuchsia-600 dark:hover:border-fuchsia-600 transition-colors">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            className="mx-auto h-9"
                            disabled={isUploading}
                          >
                            <Upload className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                            {uploadedMedia
                              ? uploadedMedia.title?.rendered || __('Video selected & uploaded', "whizmanage")
                              : __('Click to select video file', "whizmanage")}
                          </Button>
                          <div className="mt-2 text-xs text-slate-500 dark:text-slate-500">
                            {__('Supported formats: MP4, WebM, OGG', "whizmanage")}
                          </div>
                        </div>

                        {isUploading && (
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            {LoadingIconEl}
                            <span className="sr-only">{__('Uploading video...', "whizmanage")}</span>
                            <span aria-hidden>{__('Uploading video... please wait', "whizmanage")}</span>
                          </div>
                        )}

                        {uploadedMedia && (
                          <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-900 dark:border-slate-700 border rounded-md px-3 py-2">
                            <div className="truncate">
                              <span className="font-medium">ID:</span> {uploadedMedia.id} ·{' '}
                              <span className="font-medium">MIME:</span> {uploadedMedia.mime_type}
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={clearUploaded}
                              className="ml-2 h-7 px-2"
                              disabled={isUploading}
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="file-width" className="dark:text-slate-300">
                            {__('Width', "whizmanage")}
                          </Label>
                          <Input
                            id="file-width"
                            type="number"
                            min="100"
                            max="1200"
                            value={width}
                            onChange={handleWidthChange}
                            className="dark:!bg-slate-700 dark:!border-slate-600 dark:!text-slate-300 dark:!placeholder-slate-400"
                            disabled={isUploading}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="file-height" className="dark:text-slate-300">
                            {__('Height', "whizmanage")}
                          </Label>
                          <Input
                            id="file-height"
                            type="number"
                            min="100"
                            max="800"
                            value={height}
                            onChange={handleHeightChange}
                            className="dark:!bg-slate-700 dark:!border-slate-600 dark:!text-slate-300 dark:!placeholder-slate-400"
                            disabled={isUploading}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          isSelected={maintainAspectRatio}
                          onValueChange={setMaintainAspectRatio}
                          size="sm"
                          color="primary"
                          isDisabled={isUploading}
                        />
                        <Label className="text-sm dark:text-slate-300">
                          {__('Maintain aspect ratio (16:9)', "whizmanage")}
                        </Label>
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Switch
                            isSelected={showControls}
                            onValueChange={setShowControls}
                            size="sm"
                            color="primary"
                            isDisabled={isUploading}
                          />
                          <Label className="text-sm dark:text-slate-300">{__('Show controls', "whizmanage")}</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            isSelected={autoplay}
                            onValueChange={setAutoplay}
                            size="sm"
                            color="primary"
                            isDisabled={isUploading}
                          />
                          <Label className="text-sm dark:text-slate-300">{__('Autoplay', "whizmanage")}</Label>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      <h4 className="text-lg font-medium dark:text-slate-300">{__('Preview', "whizmanage")}</h4>
                      <div
                        ref={previewContainerRef}
                        className="border rounded-lg p-4 min-h-[250px] flex items-center justify-center bg-slate-50 dark:bg-slate-900 dark:border-slate-600"
                      >
                        {previewData ? (
                          <div dangerouslySetInnerHTML={{ __html: previewData }} className="w-full flex justify-center" />
                        ) : (
                          <div className="text-center">
                            <Upload className="mx-auto h-12 w-12 text-slate-400 mb-2" />
                            <p className="text-slate-500 dark:text-slate-400 text-sm">
                              {__('Select a video file to upload & preview', "whizmanage")}
                            </p>
                          </div>
                        )}
                      </div>
                      {uploadedMedia?.source_url && (
                        <a
                          href={uploadedMedia.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 underline break-all"
                        >
                          {uploadedMedia.source_url}
                        </a>
                      )}
                    </div>
                  </div>
                </Tab>

                {/* Media Library — שמאל = רשימה, ימין = Preview */}
                <Tab key="library" title={
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    <span>{__('Media Library', "whizmanage")}</span>
                  </div>
                }>
                  <div className="py-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 📂 ספריית מדיה */}
                    <div
                      ref={listScrollRef}
                      className="lg:col-span-2 max-h-[500px] overflow-y-auto pr-2"
                    >
                      {isLoadingLibrary && libraryVideos.length === 0 ? (
                        <div className="flex items-center justify-center h-[400px]">
                          <RefreshCcw className="w-12 h-12 animate-spin text-fuchsia-600" />
                        </div>
                      ) : libraryVideos.length === 0 ? (
                        <div className="flex items-center justify-center h-[400px] text-sm text-slate-500">
                          {__('No videos found', "whizmanage")}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {libraryVideos.map((vid) => {
                            const isSelected = selectedLibraryVideo?.id === vid.id;
                            return (
                              <div
                                key={vid.id}
                                className={`border rounded p-2 cursor-pointer transition ${isSelected
                                  ? 'ring-2 ring-fuchsia-600 border-fuchsia-600'
                                  : 'border-slate-300 hover:border-fuchsia-400'
                                  }`}
                                onClick={() => {
                                  setSelectedLibraryVideo(vid);
                                  updatePreviewFromUploaded(vid, width, height);
                                }}
                              >
                                <video src={vid.source_url} className="w-full rounded" controls={false} />
                                <p className="mt-1 text-xs truncate text-center">
                                  {vid.title?.rendered || `Video ${vid.id}`}
                                </p>
                                {isSelected && (
                                  <p className="text-xs text-fuchsia-600 font-medium text-center mt-1">
                                    {__('Selected', "whizmanage")}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                          {/* sentinel ל־infinite scroll */}
                          <div ref={sentinelRef} className="col-span-full h-8" />
                        </div>
                      )}
                    </div>

                    {/* 👁️ Preview + פקדים */}
                    <div className="flex flex-col gap-4">
                      <h4 className="text-lg font-medium dark:text-slate-300">{__('Preview', "whizmanage")}</h4>
                      <div className="border rounded-lg p-3 min-h-[180px] flex items-center justify-center bg-slate-50 dark:bg-slate-900 dark:border-slate-600">
                        {previewData ? (
                          <div
                            dangerouslySetInnerHTML={{ __html: previewData }}
                            className="w-full flex justify-center"
                          />
                        ) : (
                          <div className="text-center">
                            <Video className="mx-auto h-10 w-10 text-slate-400 mb-2" />
                            <p className="text-slate-500 dark:text-slate-400 text-sm">
                              {__('Select a video to see preview', "whizmanage")}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* פקדים מתחת ל-preview */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="lib-width" className="dark:text-slate-300">{__('Width', "whizmanage")}</Label>
                          <Input
                            id="lib-width"
                            type="number"
                            min="100"
                            max="1200"
                            value={width}
                            onChange={handleWidthChange}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="lib-height" className="dark:text-slate-300">{__('Height', "whizmanage")}</Label>
                          <Input
                            id="lib-height"
                            type="number"
                            min="100"
                            max="800"
                            value={height}
                            onChange={handleHeightChange}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch isSelected={maintainAspectRatio} onValueChange={setMaintainAspectRatio} size="sm" color="primary" />
                        <Label className="text-sm dark:text-slate-300">{__('Maintain aspect ratio (16:9)', "whizmanage")}</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch isSelected={showControls} onValueChange={setShowControls} size="sm" color="primary" />
                        <Label className="text-sm dark:text-slate-300">{__('Show controls', "whizmanage")}</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch isSelected={autoplay} onValueChange={setAutoplay} size="sm" color="primary" />
                        <Label className="text-sm dark:text-slate-300">{__('Autoplay', "whizmanage")}</Label>
                      </div>

                      {selectedLibraryVideo?.source_url && (
                        <a href={selectedLibraryVideo.source_url} target="_blank" rel="noreferrer"
                          className="text-xs text-blue-600 underline break-all">
                          {selectedLibraryVideo.source_url}
                        </a>
                      )}
                    </div>
                  </div>
                </Tab>


              </Tabs>
            </ModalBody>

            <ModalFooter>
              <Button variant="outline" onClick={handleClose} disabled={isUploading}>
                {__('Cancel', "whizmanage")}
              </Button>
              <Button
                onClick={handleInsert}
                disabled={!canInsert || isUploading}
                className="flex gap-2 items-center"
              >
                <Play className="size-4" /> {__('Insert Video', "whizmanage")}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );

};

export default VideoDialog;
