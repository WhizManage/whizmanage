// src/components/media/MediaDisplay.jsx
import Button from "@components/ui/button";
import { Card, CardBody, CardFooter, Tooltip } from "@heroui/react";
import { ChevronLeft, ChevronRight, ImagePlus, X } from "lucide-react";
import { memo, useEffect, useMemo, useState } from "react";
 import { __ } from "@wordpress/i18n";

const galleryIndexStore = new Map();

function srcOf(item) {
  if (!item) return "";
  if (typeof item === "string") return item;
  return item?.src || "";
}

function areEqual(prev, next) {
  // במצב טופס - לא לעשות memo כי יש פונקציות שצריכות להתעדכן
  if (prev.isForm || next.isForm) return false;

  const prevIsGallery = !!prev.editOptions?.multiple;
  const nextIsGallery = !!next.editOptions?.multiple;
  if (prevIsGallery || nextIsGallery) {
    const a = Array.isArray(prev.value) ? prev.value : [];
    const b = Array.isArray(next.value) ? next.value : [];
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (srcOf(a[i]) !== srcOf(b[i])) return false;
    }
    return true;
  }
  return srcOf(prev.value) === srcOf(next.value);
}

// תצוגה קטנה לטבלה
const Img = ({ src, size = 32, rounded = 6, alt = "img", __ = (key) => key }) => {
  if (!src) {
    return (
      <div
        className="flex items-center justify-center text-slate-300 dark:text-slate-600 border dark:border-slate-600 rounded-md bg-slate-100 dark:bg-slate-800"
        style={{ width: size, height: size }}
      >
        <ImagePlus className="w-5 h-5" />
      </div>
    );
  }

  return (
    <Tooltip
      className="p-0 m-0 bg-slate-50 dark:!bg-slate-700"
      placement={window?.user_local === "he_IL" ? "left" : "right"}
      delay={0}
      closeDelay={0}
      offset={15}
      motionProps={{
        variants: {
          exit: { opacity: 0, transition: { duration: 0 } },
          enter: { opacity: 1, transition: { duration: 0.1 } },
        },
      }}
      content={
        <img
          src={src}
          alt={alt}
          width={200}
          height={200}
          className="pointer-events-none"
          style={{
            width: 200,
            height: 200,
            objectFit: "cover",
            borderRadius: 8,
          }}
        />
      }
    >
      <div
        className="flex items-center justify-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md overflow-hidden"
        style={{ width: size, height: size }}
      >
        <img
          src={src}
          alt={alt}
          width={size}
          height={size}
          loading="eager"
          decoding="async"
          style={{
            width: size,
            height: size,
            borderRadius: rounded,
            objectFit: "cover",
            cursor: "pointer",
            transition: "none",
            animation: "none",
            willChange: "auto",
            backfaceVisibility: "hidden",
          }}
          draggable={false}
        />
      </div>
    </Tooltip>
  );
};

// תצוגה גדולה לתמונה בודדת בטופס
const FormSingleImage = ({ src, __ = (key) => key }) => {
  if (!src) {
    return (
      <div className="group w-full h-[200px] flex items-center justify-center border-1 border-dashed border-slate-300 dark:border-slate-600 hover:border-fuchsia-600 rounded-lg bg-white hover:bg-fuchsia-50 dark:bg-slate-800 dark:hover:bg-slate-700 cursor-pointer hover:animate-pulse transition-colors">
        <div className="text-center">
          <ImagePlus className="w-12 h-12 mx-auto mb-2 text-slate-400 dark:text-muted-foreground group-hover:text-fuchsia-600 transition-colors" />
          <p className="text-sm text-slate-500 dark:text-muted-foreground/50 group-hover:text-fuchsia-600 transition-colors">
           {__("Click to select image", "whizmanage")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[200px] rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 hover:border-fuchsia-500 transition-colors">
      <img
        src={src}
        alt="Product"
        className="w-full h-full object-cover"
        loading="eager"
      />
    </div>
  );
};

// תצוגת גלריה בכרטיסיות לטופס
const FormGallery = ({ images, onRemove, onOpenPicker, __ = (key) => key }) => {
  const handleClick = (e) => {
    e.stopPropagation();
    if (onOpenPicker) onOpenPicker();
  };

  if (!images || images.length === 0) {
    return (
      <div
        onClick={handleClick}
        className="group w-full min-h-[140px] flex items-center justify-center border-1 border-dashed border-slate-300 dark:border-slate-600 hover:border-fuchsia-600 rounded-lg bg-white hover:bg-fuchsia-50 dark:bg-slate-800 dark:hover:bg-slate-700 cursor-pointer hover:animate-pulse transition-colors"
      >
        <div className="text-center pointer-events-none">
          <ImagePlus className="w-12 h-12 mx-auto mb-2 text-slate-400 dark:text-muted-foreground group-hover:text-fuchsia-600 transition-colors" />
          <p className="text-sm text-slate-500 dark:text-muted-foreground/50 group-hover:text-fuchsia-600 transition-colors">
            {__("Click to add images", "whizmanage")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="gap-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
      {images.map((item, index) => {
        const src = srcOf(item);
        return (
          <div
            key={item.id || index}
            onClick={handleClick}
            className="relative cursor-pointer group rounded-lg overflow-hidden shadow-sm bg-slate-100 dark:bg-slate-800"
          >
            <div className="relative w-full aspect-square overflow-hidden">
              <img
                alt={item.name || `Image ${index + 1}`}
                src={src}
                loading="eager"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            {onRemove && (
              <button
                className="absolute right-1 top-1 z-10 w-6 h-6 rounded-full bg-fuchsia-600 text-white hidden group-hover:flex items-center justify-center shadow-md"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(item);
                }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <div className="px-2 py-1.5 bg-slate-50 dark:bg-slate-700">
              <span className="truncate block text-slate-700 dark:text-slate-200 text-xs">
                {item.name || `Image ${index + 1}`}
              </span>
            </div>
          </div>
        );
      })}
      {/* כפתור הוספת תמונות */}
      <div
        onClick={handleClick}
        className="group flex flex-col items-center justify-center border-1 border-dashed border-slate-300 dark:border-slate-600 hover:border-fuchsia-600 rounded-lg bg-white hover:bg-fuchsia-50 dark:bg-slate-800 dark:hover:bg-slate-700 cursor-pointer transition-colors aspect-square"
      >
        <ImagePlus className="w-10 h-10 text-slate-400 group-hover:text-fuchsia-600 transition-colors" />
        <span className="text-slate-500 group-hover:text-fuchsia-600 transition-colors text-xs mt-2">
          {__("Add more", "whizmanage")}
        </span>
      </div>
    </div>
  );
};

const MediaDisplay = ({ value, row, column, editOptions, isForm = false, onRemove, onOpenPicker }) => {
  // ליצור t פעם אחת כאן ולהעביר הלאה כמו שהוא
   

  const isGallery = editOptions?.multiple === true;

  // מצב טופס
  if (isForm) {
    if (isGallery) {
      const images = Array.isArray(value) ? value : [];
      return <FormGallery images={images} __={__} onRemove={onRemove} onOpenPicker={onOpenPicker} />;
    } else {
      const singleSrc = useMemo(() => {
        if (Array.isArray(value)) return srcOf(value[0]);
        return srcOf(value);
      }, [value]);
      return <FormSingleImage src={singleSrc} __={__} />;
    }
  }

  // מצב טבלה (גלריה)
  if (isGallery) {
    const images = Array.isArray(value) ? value : [];
    const gallery = images.slice(1);
    const rowId = row?.id ?? column?.id ?? "__unknown";
    const [idx, setIdx] = useState(() => galleryIndexStore.get(rowId) ?? 0);

    useEffect(() => {
      galleryIndexStore.set(rowId, idx);
    }, [rowId, idx]);

    const curSrc = gallery.length
      ? srcOf(gallery[Math.min(idx, gallery.length - 1)])
      : "";

    if (gallery.length === 0) {
      return (
        <div className="flex items-center gap-1">
          <div className="!size-4" />
          <Img src="" size={32} __={__} />
          <div className="!size-4" />
        </div>
      );
    }

    const onPrev = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIdx((p) => (p === 0 ? gallery.length - 1 : p - 1));
    };

    const onNext = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIdx((p) => (p === gallery.length - 1 ? 0 : p + 1));
    };

    return (
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          disabled={gallery.length <= 1}
          onClick={onPrev}
          onMouseDown={(e) => e.preventDefault()}
          className="!size-4 p-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
        >
          <ChevronLeft className="w-3 h-3" />
        </Button>
        <Img src={curSrc} size={32} __={__} />
        <Button
          variant="ghost"
          disabled={gallery.length <= 1}
          onClick={onNext}
          onMouseDown={(e) => e.preventDefault()}
          className="!size-4 p-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
        >
          <ChevronRight className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  // תמונה בודדת בטבלה
  const singleSrc = useMemo(() => {
    if (Array.isArray(value)) return srcOf(value[0]);
    return srcOf(value);
  }, [value]);

  return <Img src={singleSrc} size={32} __={__} />;
};

export default memo(MediaDisplay, areEqual);
