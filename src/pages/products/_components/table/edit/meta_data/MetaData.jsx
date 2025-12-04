import { useTableContext } from "@/context/TableContext";
import { Button } from "@components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@components/ui/hover-card";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ScrollShadow,
  useDisclosure,
} from "@heroui/react";
import { Edit, Info } from "lucide-react";
import { useEffect, useState } from "react";
import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";
import DisplayColumns from "../../../header/DisplayColumns";
import { __ } from '@wordpress/i18n';

import { HTMLToText } from "../../Columns";
import GalleryMetaEdit from "./GalleryMetaEdit";
import WysiwygEditor from "./WysiwygEditor";
import ImageMetaEdit from "./ImageMetaEdit";
import { Switch } from "@components/ui/switch";
import MultiSelectEdit from "../MultiSelectEdit";

const MetaData = ({ row, edit, allMetaData, source }) => {
  const table = useTableContext();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
   

  const getDisplayValue = (item, row) => {
    const value =
      row.meta_data?.find((meta) => meta.key === item.key)?.value ??
      item.value ??
      "";

    // טיפולים מיוחדים לפי key
    if (
      item.key === "_yoast_wpseo_opengraph-image" &&
      typeof value === "object" &&
      value?.url
    ) {
      return value.url;
    }

    if (item.key === "_yoast_wpseo_title" && (!value || value === "")) {
      return row?.name + " - " + (window.store_name || "") || __("No Value", "whizmanage");
    }

    // טיפול בסוגים כלליים
    switch (item.type) {
      case "text":
      case "textarea":
      case "number":
      case "date":
        return value || __("No Value", "whizmanage");

      case "select":
        return item.choices?.[value] || value || __("No Value", "whizmanage");

      case "wysiwyg":
        return HTMLToText(value) || __("No Value", "whizmanage");

      case "checkbox":
      case "switcher":
        return value === "1" || value === true ? __("Yes", "whizmanage") : __("No", "whizmanage");

      // case "multi-select":
      //   return (
      //     <MultiSelectEdit
      //       row={row}
      //       columnName={item.key}
      //       label={item.label}
      //       handleInputChange={handleInputChange}
      //     />
      //   );
      case "gallery":
        return (
          <GalleryMetaEdit
            handleInputChange={handleInputChange}
            row={item}
            edit={false}
          />
        );

      case "image":
      case "media":
        return (
          <ImageMetaEdit
            handleInputChange={handleInputChange}
            row={item}
            edit={false}
            isColumn={false}
          />
        );
      default:
        return value || __("No Value", "whizmanage");
    }
  };

  const initializeMetaData = () => {
    return allMetaData
      .filter((item) => {
        if (source === "Yoast SEO") return item.source === "Yoast SEO";
        if (!source) return item.source !== "Yoast SEO";
      })
      .map((item) => {
        let value =
          row.meta_data.find((metaItem) => metaItem.key === item.key)?.value ||
          "";

        if (["gallery", "image", "media"].includes(item.type)) {
          return {
            ...item,
            value,
          };
        }

        return {
          ...item,
          value: typeof value === "string" ? value : "",
          choices: item.choices || {},
        };
      });
  };

  const [metaData, setMetaData] = useState(initializeMetaData());

  const [switchStates, setSwitchStates] = useState(() => {
    const valueMeta = initializeMetaData();
    return valueMeta.reduce((acc, item) => {
      acc[item.key] = item.value === "1";
      return acc;
    }, {});
  });

  const handleChange = (key) => {
    setSwitchStates((prev) => {
      const newValue = !prev[key];
      handleInputChange(key, newValue ? "1" : "0");
      return { ...prev, [key]: newValue };
    });
  };

  const handleInputChange = (key, value) => {
    setMetaData((prevMetaData) =>
      prevMetaData.map((item) => (item.key === key ? { ...item, value } : item))
    );
  };

  const onSave = () => {
    row.meta_data = metaData.map((item) => ({
      ...item,
      value: row.meta_data.find((m) => m.key === item.key)?.value ?? item.value,
    }));
  };

  return (
    <>
      <Button
        onClick={onOpen}
        variant="outline"
        className="flex gap-2 h-8 capitalize"
      >
        {__("Open", "whizmanage")}
        {edit && (
          <Edit className="ml-2 rtl:mr-2 rtl:ml-0 h-4 w-4 shrink-0 opacity-50" />
        )}
      </Button>
      <Modal
        size="2xl"
        backdrop="opaque"
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        scrollBehavior="inside"
        isDismissable={false}
        classNames={{
          backdrop:
            "bg-gradient-to-t from-zinc-900 to-zinc-900/10 backdrop-opacity-20",
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
        <ModalContent className="dark:bg-slate-800">
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 text-center text-3xl justify-center border-b dark:border-slate-700">
                <div className="flex items-center justify-center space-x-2">
                  <h2 className="text-center dark:text-gray-400">
                    {source === "Yoast SEO"
                      ? __("Yoast SEO", "whizmanage")
                      : __("Custom fields", "whizmanage")}
                  </h2>
                  <HoverCard openDelay={300}>
                    <HoverCardTrigger asChild>
                      <Info className="h-5 w-5 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer mt-2" />
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold">
                          {__("Meta Data", "whizmanage")}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {__(
                            "Meta data values are fields that originate from external plugins supported by WooCommerce. These fields allow you to store additional information related to your products, enhancing their details and functionality within your store.",
                            "whizmanage"
                          )}
                        </p>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </div>
              </ModalHeader>
              {!edit && (
                <div className="px-8 py-2 bg-fuchsia-100/85 dark:bg-slate-700 text-fuchsia-600 dark:text-white/60">
                  <p className="text-center font-semibold">
                    {__(
                      "To edit the meta data values, please switch the product to edit mode.",
                      "whizmanage"
                    )}
                  </p>
                </div>
              )}
              <ModalBody>
                <ScrollShadow
                  size={10}
                  className="w-full h-full flex flex-col gap-4 p-2 mt-4"
                >
                  <DisplayColumns
                    table={table}
                    metaData={true}
                    allMetaData={allMetaData}
                  />
                  {metaData.length > 0 ? (
                    metaData.map((item, index) => (
                      <div
                        key={index}
                        className={`flex flex-col gap-2 ${edit ? "" : "grid grid-cols-2 gap-4"}`}
                      >
                        <div
                          className={`flex items-center gap-2 ${edit ? "px-2" : "col-span-1"}`}
                        >
                          <Label className="text-muted-foreground">
                            {__(item.label, "whizmanage")}
                          </Label>
                          {item.help && (
                            <HoverCard openDelay={300}>
                              <HoverCardTrigger asChild>
                                <Info className="h-4 w-4 text-blue-500 opacity-60 hover:opacity-100 cursor-pointer" />
                              </HoverCardTrigger>
                              <HoverCardContent
                                className="max-w-xs text-sm break-words z-[9999] shadow-md p-3"
                                side={
                                  index < metaData.length / 2 ? "bottom" : "top"
                                }
                                align="start"
                                avoidCollisions={true}
                                collisionPadding={10}
                                sideOffset={5}
                              >
                                <div className="space-y-1">
                                  <p className="whitespace-pre-wrap break-words">
                                    {__(item.help, "whizmanage")}
                                  </p>
                                </div>
                              </HoverCardContent>
                            </HoverCard>
                          )}
                        </div>
                        {edit ? (
                          <>
                            {item.type === "multi-select" && (
                              <MultiSelectEdit
                                row={row}
                                columnName={item.key}
                                label={item.label}
                                handleInputChange={handleInputChange}
                              />
                            )}
                            {item.type === "text" && (
                              <Input
                                className="w-full"
                                defaultValue={getDisplayValue(item, row)}
                                onFocus={(event) => event.target.select()}
                                onChange={(event) =>
                                  handleInputChange(
                                    item.key,
                                    event.target.value
                                  )
                                }
                              />
                            )}
                            {item.type === "select" && (
                              <Select
                                defaultValue={item.value}
                                onValueChange={(value) =>
                                  handleInputChange(item.key, value)
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue
                                    placeholder={__("Select an option", "whizmanage")}
                                  />
                                </SelectTrigger>
                                <SelectContent
                                  side={
                                    metaData.length == index + 1
                                      ? "top"
                                      : "bottom"
                                  }
                                >
                                  {item.choices &&
                                    Object.entries(item.choices).map(
                                      ([value, label]) => (
                                        <SelectItem key={value} value={value}>
                                          {label}
                                        </SelectItem>
                                      )
                                    )}
                                </SelectContent>
                              </Select>
                            )}
                            {item.type === "textarea" && (
                              <textarea
                                className="w-full p-2 border rounded"
                                defaultValue={item.value}
                                onChange={(event) =>
                                  handleInputChange(
                                    item.key,
                                    event.target.value
                                  )
                                }
                                rows={4}
                                placeholder={__("Enter your text here", "whizmanage")}
                              />
                            )}
                            {item.type === "checkbox" && (
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  id={item.key}
                                  checked={item.value == "1" ? true : false}
                                  onChange={(e) => {
                                    const newValue = e.target.checked;
                                    handleInputChange(
                                      item.key,
                                      newValue ? "1" : "0"
                                    );
                                  }}
                                  className="mr-2"
                                />
                                <label htmlFor={item.key}>
                                  {__(item.label, "whizmanage")}
                                </label>
                              </div>
                            )}
                            {item.type === "number" && (
                              <Input
                                className="w-full"
                                type="number"
                                defaultValue={item.value}
                                onFocus={(event) => event.target.select()}
                                onChange={(event) =>
                                  handleInputChange(
                                    item.key,
                                    event.target.value
                                  )
                                }
                              />
                            )}
                            {item.type === "date" && (
                              <Input
                                className="w-full"
                                type="date"
                                defaultValue={item.value}
                                onChange={(event) =>
                                  handleInputChange(
                                    item.key,
                                    event.target.value
                                  )
                                }
                              />
                            )}
                            {item.type === "wysiwyg" && (
                              <WysiwygEditor
                                item={item}
                                handleInputChange={handleInputChange}
                              />
                            )}
                            {item.type === "gallery" && (
                              <GalleryMetaEdit
                                row={item}
                                handleInputChange={handleInputChange}
                                edit={edit}
                              />
                            )}
                            {item.type === "image" && (
                              <ImageMetaEdit
                                row={item}
                                handleInputChange={handleInputChange}
                                edit={edit}
                                isColumn={false}
                              />
                            )}
                            {item.type === "media" && (
                              <ImageMetaEdit
                                row={item}
                                handleInputChange={handleInputChange}
                                edit={edit}
                                isColumn={false}
                              />
                            )}
                            {item.type === "switcher" && (
                              <Switch
                                className=""
                                id="airplane-mode"
                                checked={switchStates[item.key] || false}
                                onCheckedChange={() => handleChange(item.key)}
                              />
                            )}
                          </>
                        ) : (
                          <div className="w-full p-2 bg-gray-100 dark:bg-gray-600 rounded-md col-span-1">
                            {getDisplayValue(item, row)}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="flex justify-center items-center h-24">
                      {__("No Meta Data", "whizmanage")}
                    </div>
                  )}
                </ScrollShadow>
              </ModalBody>
              <ModalFooter className="px-8">
                <Button onClick={onClose} variant="outline">
                  {__("Close", "whizmanage")}
                </Button>
                {edit && (
                  <Button
                    onClick={() => {
                      onSave();
                      onClose();
                    }}
                  >
                    {__("Save", "whizmanage")}
                  </Button>
                )}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

export default MetaData;
