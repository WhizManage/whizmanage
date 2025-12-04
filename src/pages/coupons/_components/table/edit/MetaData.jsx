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
import DisplayColumns from "../../header/DisplayColumns";
import { __ } from '@wordpress/i18n';

const MetaData = ({ row, edit ,allMetaData}) => {
  const table = useTableContext();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
   
  
const initializeMetaData = () => {
  return allMetaData.map((item) => {
    const value =
      row.meta_data.find((metaItem) => metaItem.key === item.key)?.value || "";
    return {
      ...item,
      value: typeof value === 'string' ? value : ""
    };
  });
};

  

  const [metaData, setMetaData] = useState(initializeMetaData);
  useEffect(() => {
    if (row.meta_data.length === 0) {
      setMetaData(initializeMetaData);
    }
  }, [row.meta_data]);

  const handleInputChange = (key, value) => {
    setMetaData((prevMetaData) =>
      prevMetaData.map((item) => (item.key === key ? { ...item, value } : item))
    );
  };

  const onSave = () => {
    row.meta_data = metaData;
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
                  <h2 className="text-center dark:text-gray-400">{__("Meta Data", "whizmanage")}</h2>
                  <HoverCard openDelay={300}>
                    <HoverCardTrigger asChild>
                      <Info className="h-5 w-5 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer mt-2" />
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold">{__("Meta Data", "whizmanage")}</h4>
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
                        <Label
                          className={`w-full text-muted-foreground ${edit ? "px-2 " : "col-span-1"}`}
                        >
                          {item.label}
                        </Label>
                        {edit ? (
                          item.type === "text" ? (
                            <Input
                              className="w-full"
                              value={item.value}
                              onFocus={(event) => event.target.select()}
                              onChange={(event) =>
                                handleInputChange(item.key, event.target.value)
                              }
                            />
                          ) : (
                            <Select
                              value={item.value}
                              onValueChange={(value) =>
                                handleInputChange(item.key, value)
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder={__("Select an option", "whizmanage")} />
                              </SelectTrigger>
                              <SelectContent>
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
                          )
                        ) : (
                          <div className="w-full p-2 bg-gray-100 dark:bg-gray-600 rounded-md col-span-1">
                            {item.value || (
                              <span className="!text-slate-400/50">
                                {__("No Value", "whizmanage")}
                              </span>
                            )}
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
