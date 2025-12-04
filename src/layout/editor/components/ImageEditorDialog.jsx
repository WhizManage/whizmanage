// src/components/RichEditor/components/ImageEditorDialog.jsx
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import { Switch } from "@components/ui/switch";
import {
  Divider,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Slider,
  Tab,
  // Switch,
  Tabs,
} from "@heroui/react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Check,
  CropIcon,
  Link as LinkIcon,
  LockIcon,
  Maximize,
  RotateCcw,
  RotateCw,
  Trash2,
  UnlockIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { __ } from '@wordpress/i18n';

const ImageEditorDialog = ({
  isOpen,
  onOpenChange,
  selectedImage,
  onApplyChanges,
  onDeleteImage,
  editorRef,
  currentSize,
}) => {
  
  const isRTL = document.documentElement.dir === 'rtl';
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [alt, setAlt] = useState("");
  const [align, setAlign] = useState("none");
  const [link, setLink] = useState("");
  const [proportionalResize, setProportionalResize] = useState(true);
  const [aspectRatio, setAspectRatio] = useState(1);
  const [previewStyle, setPreviewStyle] = useState({});
  const [borderStyle, setBorderStyle] = useState({});
  const [borderRadius, setBorderRadius] = useState(0);
  const [applyShadow, setApplyShadow] = useState(false);
  const [rotation, setRotation] = useState(0);
  const previewRef = useRef(null);

  useEffect(() => {
    if (currentSize && currentSize.width && currentSize.height) {
      setWidth(currentSize.width);
      setHeight(currentSize.height);
    }
  }, [currentSize]);

  // עדכון הערכים כשהתמונה הנבחרת משתנה
  useEffect(() => {
    if (selectedImage) {
      // בדיקה האם יש מידות מוגדרות או להשתמש במידות הטבעיות
      const imageWidth =
        selectedImage.width || selectedImage.naturalWidth || "";
      const imageHeight =
        selectedImage.height || selectedImage.naturalHeight || "";

      setWidth(imageWidth);
      setHeight(imageHeight);
      setAlt(selectedImage.alt || "");

      // בדיקת יישור התמונה
      if (selectedImage.style.float === "left") {
        setAlign("left");
      } else if (selectedImage.style.float === "right") {
        setAlign("right");
      } else if (
        selectedImage.style.display === "block" &&
        selectedImage.style.marginLeft === "auto" &&
        selectedImage.style.marginRight === "auto"
      ) {
        setAlign("center");
      } else {
        setAlign("none");
      }

      // בדיקה אם התמונה בתוך קישור
      const parentLink = selectedImage.closest("a");
      if (parentLink) {
        setLink(parentLink.href || "");
      } else {
        setLink("");
      }

      // חישוב יחס הגובה-רוחב
      if (selectedImage.naturalWidth && selectedImage.naturalHeight) {
        setAspectRatio(
          selectedImage.naturalWidth / selectedImage.naturalHeight
        );
      }

      // בדיקת עיגול פינות
      if (selectedImage.style.borderRadius) {
        const radiusValue = parseInt(selectedImage.style.borderRadius, 10);
        setBorderRadius(isNaN(radiusValue) ? 0 : radiusValue);
      } else {
        setBorderRadius(0);
      }

      // בדיקת צל
      setApplyShadow(
        selectedImage.style.boxShadow &&
          selectedImage.style.boxShadow !== "none"
      );

      // בדיקת סגנון גבול
      if (selectedImage.style.border) {
        const borderMatch = selectedImage.style.border.match(
          /(\d+)px\s+(\w+)\s+([#\w]+)/
        );
        if (borderMatch) {
          setBorderStyle({
            width: parseInt(borderMatch[1], 10),
            style: borderMatch[2],
            color: borderMatch[3],
          });
        } else {
          setBorderStyle({
            width: 0,
            style: "solid",
            color: "#000000",
          });
        }
      } else {
        setBorderStyle({
          width: 0,
          style: "solid",
          color: "#000000",
        });
      }

      // עדכון התצוגה המקדימה
      updatePreviewStyle();
    }
  }, [selectedImage]);

  // עדכון סגנון התצוגה המקדימה
  const updatePreviewStyle = () => {
    const newStyle = {
      borderRadius: `${borderRadius}px`,
      boxShadow: applyShadow ? "0 4px 8px rgba(0, 0, 0, 0.3)" : "none",
      maxWidth: "100%",
      maxHeight: "200px",
      objectFit: "contain",
    };

    if (borderStyle && borderStyle.width > 0) {
      newStyle.border = `${borderStyle.width}px ${borderStyle.style} ${borderStyle.color}`;
    }

    setPreviewStyle(newStyle);
  };

  // עדכון בכל פעם שמשתנה אחד מהסגנונות
  useEffect(() => {
    updatePreviewStyle();
  }, [borderRadius, applyShadow, borderStyle]);

  // עדכון הגובה בהתאם לרוחב בשמירה על יחס הצגה
  const handleWidthChange = (e) => {
    const newWidth = parseInt(e.target.value || "0", 10);
    setWidth(newWidth);

    if (proportionalResize && aspectRatio && newWidth) {
      setHeight(Math.round(newWidth / aspectRatio));
    }
  };

  // עדכון הרוחב בהתאם לגובה בשמירה על יחס הצגה
  const handleHeightChange = (e) => {
    const newHeight = parseInt(e.target.value || "0", 10);
    setHeight(newHeight);

    if (proportionalResize && aspectRatio && newHeight) {
      setWidth(Math.round(newHeight * aspectRatio));
    }
  };

  // איפוס הגדרות התמונה
  const resetToOriginalSize = () => {
    if (selectedImage) {
      setWidth(selectedImage.naturalWidth || "");
      setHeight(selectedImage.naturalHeight || "");
    }
  };

  // טיפול בשינוי טאב
  const handleTabChange = (key) => {
    // מניעת קריסה בעת החלפת טאבים - שמירת הפוקוס בתוך המודל
    setTimeout(() => {
      // החזק את הפוקוס בתוך המודל
      const modal = document.querySelector(".nextui-modal-content");
      if (modal) {
        modal.focus();
      }
    }, 10);
  };

  // טיפול בשינוי מצב מודל
  const handleOpenChange = (open) => {
    // כאשר המודל נסגר
    if (!open && editorRef?.current) {
      // דחיית החזרת הפוקוס לעורך
      setTimeout(() => {
        try {
          if (editorRef.current && editorRef.current.contentWindow) {
            // מיקוד מחדש על העורך
            const doc = editorRef.current.contentDocument;
            // כיבוי והפעלה מחדש של מצב העריכה
            doc.designMode = "off";
            setTimeout(() => {
              doc.designMode = "on";
              editorRef.current.contentWindow.focus();
            }, 50);
          }
        } catch (error) {
          console.error(
            "Error restoring focus after image editor dialog:",
            error
          );
        }
      }, 100);
    }

    // קריאה לפונקציה המקורית לשינוי מצב
    onOpenChange(open);
  };

  // יישום השינויים
  const applyChanges = () => {
    const changes = {
      width: width || "auto",
      height: height || "auto",
      alt: alt,
      align: align,
      link: link,
      styles: {
        borderRadius: borderRadius > 0 ? `${borderRadius}px` : "",
        boxShadow: applyShadow ? "0 4px 8px rgba(0, 0, 0, 0.3)" : "",
        border:
          borderStyle.width > 0
            ? `${borderStyle.width}px ${borderStyle.style} ${borderStyle.color}`
            : "",
        transform: rotation !== 0 ? `rotate(${rotation}deg)` : "",
      },
    };
    // השבת designMode לזמן השינוי
    if (editorRef?.current?.contentDocument) {
      editorRef.current.contentDocument.designMode = "off";
    }

    onApplyChanges(changes);

    setTimeout(() => {
      if (editorRef?.current?.contentDocument) {
        editorRef.current.contentDocument.designMode = "on";
        editorRef.current.contentWindow.focus();
      }
    }, 50);
  };
  const rotateRight = () => {
    const newRotate = (rotation + 90) % 360;
    setRotation(newRotate);
    if (previewRef.current) {
      previewRef.current.style.transform = `rotate(${newRotate}deg)`;
    }
  };
  const rotateLeft = () => {
    const newRotate = (rotation - 90 + 360) % 360;
    setRotation(newRotate);
    if (previewRef.current) {
      previewRef.current.style.transform = `rotate(${newRotate}deg)`;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      size="2xl"
      backdrop="opaque"
      placement="center"
      classNames={{
        backdrop:
          "bg-gradient-to-t from-zinc-900 to-zinc-900/10 backdrop-opacity-20",
        base: "dark:bg-slate-800 border border-slate-200 dark:border-slate-700",
        header: "border-b dark:border-slate-700",
        footer: "border-t dark:border-slate-700",
      }}
      motionProps={{
        variants: {
          enter: {
            y: 0,
            opacity: 1,
            transition: {
              duration: 0.3,
              ease: "easeOut",
            },
          },
          exit: {
            y: -20,
            opacity: 0,
            transition: {
              duration: 0.2,
              ease: "easeIn",
            },
          },
        },
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <h3 className="text-xl font-semibold dark:text-gray-300">
                {__("Edit Image", "whizmanage")}
              </h3>
            </ModalHeader>

            <ModalBody>
              <div className="flex justify-center mb-6">
                {selectedImage && (
                  <div className="border dark:border-slate-600 p-4 rounded-lg w-full flex justify-center bg-slate-50 dark:bg-slate-900 transition-all">
                    <img
                      ref={previewRef}
                      src={selectedImage.src}
                      alt="Preview"
                      style={previewStyle}
                      className="transition-all duration-200"
                    />
                  </div>
                )}
              </div>

              <Tabs
                aria-label="Image editing options"
                variant="underlined"
                className="w-full"
                onSelectionChange={handleTabChange}
                disableAnimation={true}
                classNames={{
                  tabList:
                    "gap-6 w-full relative rounded-none border-b dark:border-slate-700 p-0",
                  cursor: "w-full bg-fuchsia-600",
                  tab: "max-w-fit px-0 h-12 data-[selected=true]:text-fuchsia-600",
                  tabContent: "group-data-[selected=true]:text-fuchsia-600",
                }}
              >
                <Tab
                  key="size"
                  title={
                    <div className="flex items-center gap-2">
                      <Maximize className="w-4 h-4" />
                      <span>{__("Size & Alignment", "whizmanage")}</span>
                    </div>
                  }
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    <div className="flex flex-col gap-4">
                      <h4 className="text-lg font-medium text-slate-700 dark:text-slate-300">
                        {__("Size", "whizmanage")}
                      </h4>

                      <div className="flex items-center gap-2 mb-2">
                        <Switch
                          dir={isRTL ? "rtl" : "ltr"}
                          isSelected={proportionalResize}
                          onValueChange={setProportionalResize}
                        />
                        <span className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1">
                          {proportionalResize ? (
                            <LockIcon className="w-3 h-3" />
                          ) : (
                            <UnlockIcon className="w-3 h-3" />
                          )}
                          {__("Maintain aspect ratio", "whizmanage")}
                        </span>
                      </div>

                      <div className="flex flex-col w-full gap-1.5">
                        <Label htmlFor="width">{__("Width", "whizmanage")}</Label>
                        <div className="relative h-10 border rounded-lg flex gap-1 items-center px-1 dark:bg-slate-700">
                          <Input
                            type="number"
                            id="width"
                            value={width}
                            onChange={handleWidthChange}
                            min="1"
                            placeholder={__("Width in pixels", "whizmanage")}
                            className="!border-none !ring-0 dark:!text-slate-300 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0"
                          />
                          <span className="text-sm text-slate-500 dark:text-slate-400 mr-2">
                            px
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col w-full gap-1.5">
                        <Label htmlFor="height">{__("Height", "whizmanage")}</Label>
                        <div className="relative h-10 border rounded-lg flex gap-1 items-center px-1 dark:bg-slate-700">
                          <Input
                            type="number"
                            id="height"
                            value={height}
                            onChange={handleHeightChange}
                            min="1"
                            placeholder={__("Height in pixels", "whizmanage")}
                            className="!border-none !ring-0 dark:!text-slate-300 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0"
                          />
                          <span className="text-sm text-slate-500 dark:text-slate-400 mr-2">
                            px
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resetToOriginalSize}
                        className="flex gap-2 items-center w-fit"
                      >
                        <Maximize className="size-4" />
                        {__("Reset to original size", "whizmanage")}
                      </Button>
                    </div>

                    <div className="flex flex-col gap-4">
                      <h4 className="text-lg font-medium text-slate-700 dark:text-slate-300">
                        {__("Alignment", "whizmanage")}
                      </h4>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant={align === "none" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setAlign("none")}
                          className="flex gap-2 items-center"
                        >
                          {__("None", "whizmanage")}
                        </Button>

                        <Button
                          variant={align === "left" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setAlign("left")}
                          className="flex gap-2 items-center"
                        >
                          <AlignLeft className="size-4" />
                          {__("Left", "whizmanage")}
                        </Button>

                        <Button
                          variant={align === "center" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setAlign("center")}
                          className="flex gap-2 items-center"
                        >
                          <AlignCenter className="size-4" />
                          {__("Center", "whizmanage")}
                        </Button>

                        <Button
                          variant={align === "right" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setAlign("right")}
                          className="flex gap-2 items-center"
                        >
                          <AlignRight className="size-4" />
                          {__("Right", "whizmanage")}
                        </Button>
                      </div>

                      <Divider className="my-2" />

                      <h4 className="text-lg font-medium text-slate-700 dark:text-slate-300">
                        {__("Rotate", "whizmanage")}
                      </h4>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={rotateLeft}
                          className="flex gap-2 items-center"
                        >
                          <RotateCcw className="size-4" />
                          {__("Left", "whizmanage")}
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={rotateRight}
                          className="flex gap-2 items-center"
                        >
                          <RotateCw className="size-4" />
                          {__("Right", "whizmanage")}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Tab>

                <Tab
                  key="style"
                  title={
                    <div className="flex items-center gap-2">
                      <CropIcon className="w-4 h-4" />
                      <span>{__("Style", "whizmanage")}</span>
                    </div>
                  }
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    <div className="flex flex-col gap-4">
                      <h4 className="text-lg font-medium text-slate-700 dark:text-slate-300">
                        {__("Border Radius", "whizmanage")}
                      </h4>

                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {__("Round corners", "whizmanage")}
                          </span>
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {borderRadius}px
                          </span>
                        </div>

                        <Slider
                          aria-label="Border radius"
                          size="sm"
                          step={1}
                          minValue={0}
                          maxValue={50}
                          value={borderRadius}
                          onChange={setBorderRadius}
                          className="max-w-md"
                          classNames={{
                            track: "bg-slate-200 dark:bg-slate-700",
                            filler: "bg-fuchsia-600 dark:bg-fuchsia-600",
                          }}
                        />
                      </div>

                      <div className="flex items-center gap-2 mt-4">
                        <Switch
                          dir={isRTL ? "rtl" : "ltr"}
                          isSelected={applyShadow}
                          onValueChange={setApplyShadow}
                        />
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {__("Apply shadow", "whizmanage")}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      <h4 className="text-lg font-medium text-slate-700 dark:text-slate-300">
                        {__("Border", "whizmanage")}
                      </h4>

                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col w-full gap-1.5">
                          <Label htmlFor="border-width">
                            {__("Border width", "whizmanage")}
                          </Label>
                          <div className="relative h-10 border rounded-lg flex gap-1 items-center px-1 dark:bg-slate-700">
                            <Input
                              type="number"
                              id="border-width"
                              min="0"
                              max="10"
                              value={borderStyle.width}
                              onChange={(e) =>
                                setBorderStyle({
                                  ...borderStyle,
                                  width: parseInt(e.target.value || "0", 10),
                                })
                              }
                              className="!border-none !ring-0 dark:!text-slate-300 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0"
                            />
                            <span className="text-sm text-slate-500 dark:text-slate-400 mr-2">
                              px
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col w-full gap-1.5">
                          <Label htmlFor="border-style">
                            {__("Border style", "whizmanage")}
                          </Label>
                          <div className="relative h-10 border rounded-lg overflow-hidden dark:bg-slate-700">
                            <select
                              id="border-style"
                              value={borderStyle.style}
                              onChange={(e) =>
                                setBorderStyle({
                                  ...borderStyle,
                                  style: e.target.value,
                                })
                              }
                              className="w-full h-full px-2 bg-transparent dark:text-slate-300 border-0 focus:outline-none focus:ring-0"
                            >
                              <option value="solid">{__("Solid", "whizmanage")}</option>
                              <option value="dashed">{__("Dashed", "whizmanage")}</option>
                              <option value="dotted">{__("Dotted", "whizmanage")}</option>
                              <option value="double">{__("Double", "whizmanage")}</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex flex-col w-full gap-1.5">
                          <Label htmlFor="border-color">
                            {__("Border color", "whizmanage")}
                          </Label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              id="border-color"
                              value={borderStyle.color}
                              onChange={(e) =>
                                setBorderStyle({
                                  ...borderStyle,
                                  color: e.target.value,
                                })
                              }
                              className="w-10 h-10 p-0 border-0 rounded"
                            />
                            <div className="relative flex-1 h-10 border rounded-lg flex gap-1 items-center px-1 dark:bg-slate-700">
                              <Input
                                type="text"
                                value={borderStyle.color}
                                onChange={(e) =>
                                  setBorderStyle({
                                    ...borderStyle,
                                    color: e.target.value,
                                  })
                                }
                                className="!border-none !ring-0 dark:!text-slate-300 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Tab>

                <Tab
                  key="properties"
                  title={
                    <div className="flex items-center gap-2">
                      <LinkIcon className="w-4 h-4" />
                      <span>{__("Properties", "whizmanage")}</span>
                    </div>
                  }
                >
                  <div className="flex flex-col gap-4 py-4">
                    <div className="flex flex-col w-full gap-1.5">
                      <Label htmlFor="alt">{__("Alt Text", "whizmanage")}</Label>
                      <div className="relative h-10 border rounded-lg flex gap-1 items-center px-1 dark:bg-slate-700">
                        <Input
                          type="text"
                          id="alt"
                          value={alt}
                          onChange={(e) => setAlt(e.target.value)}
                          placeholder={__("Alternative text for the image", "whizmanage")}
                          className="!border-none !ring-0 dark:!text-slate-300 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0"
                        />
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {__("Describe the image for accessibility and SEO purposes", "whizmanage")}
                      </p>
                    </div>

                    <div className="flex flex-col w-full gap-1.5 mt-2">
                      <Label htmlFor="link">{__("Link URL", "whizmanage")}</Label>
                      <div className="relative h-10 border rounded-lg flex gap-1 items-center px-1 dark:bg-slate-700">
                        <LinkIcon className="size-4 text-gray-400 ml-1" />
                        <Input
                          type="text"
                          id="link"
                          value={link}
                          onChange={(e) => setLink(e.target.value)}
                          placeholder={__("URL if the image is a link", "whizmanage")}
                          className="!border-none !ring-0 dark:!text-slate-300 placeholder:text-slate-400 placeholder:dark:text-slate-300/90 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0"
                        />
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {__("Leave empty if the image should not be clickable", "whizmanage")}
                      </p>
                    </div>
                  </div>
                </Tab>
              </Tabs>
            </ModalBody>

            <ModalFooter className="flex justify-between">
              <Button
                variant="destructive"
                onClick={() => {
                  onDeleteImage();
                  onClose();
                }}
                className="flex gap-2 items-center"
              >
                <Trash2 className="size-4" />
                {__("Delete", "whizmanage")}
              </Button>

              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  {__("Cancel", "whizmanage")}
                </Button>

                <Button
                  onClick={() => {
                    applyChanges();
                    onClose();
                  }}
                  className="flex gap-2 items-center"
                >
                  <Check className="size-4" />
                  {__("Apply", "whizmanage")}
                </Button>
              </div>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default ImageEditorDialog;
