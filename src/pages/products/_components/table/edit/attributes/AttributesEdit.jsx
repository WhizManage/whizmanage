import CustomTooltip from "@components/nextUI/Tooltip";
import { Button } from "@components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@components/ui/hover-card";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  cn,
  useDisclosure,
} from "@heroui/react";
import { Info, RefreshCcw, Settings2 } from "lucide-react";
import { useState } from "react";
import { __ } from '@wordpress/i18n';
import AttributesTable from "./AttributesTable";

const AttributesEdit = ({
  row,
  updateValue,
  formStates,
  watch,
  data,
  wasVariable,
}) => {
   
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAttributes, setSelectedAttributes] = useState(
    wasVariable
      ? data[0].attributes
      : row?.original?.attributes
        ? row.original.attributes
        : []
  );

  const handleSave = async (onClose) => {
    const newAttributes = selectedAttributes.map((attr) => ({
      id: attr.id,
      name: attr.id === 0 ? attr.name : `pa_${attr.name}`,
      position: attr.position || 0,
      visible: attr.visible ?? true,
      variation: attr.variation || false,
      options: attr.options,
      is_taxonomy: attr.id !== 0,
      is_visible: true,
    }));

    if (row && row.original) {
      row.original.attributes = newAttributes;
    } else {
      updateValue("attributes", newAttributes);
    }

    onClose();
  };

  return (
    <>
      <CustomTooltip title={__("Manage attributes", "whizmanage")}>
        <Button
          className={cn(
            "flex px-2",
            updateValue ? "!min-h-10 !min-w-10 !h-10 !w-10" : "!size-8"
          )}
          variant="outline"
          size="icon"
          onClick={() => {
            onOpen();
          }}
        >
          <Settings2 className="!size-5" />
        </Button>
      </CustomTooltip>
      <Modal
        size="5xl"
        scrollBehavior="inside"
        backdrop="opaque"
        className="!overflow-hidden"
        classNames={{
          backdrop:
            "bg-gradient-to-t from-zinc-800 to-zinc-800/30 backdrop-opacity-20 !overflow-hidden",
          header: "border-b",
          footer: "border-t",
          body: "py-6",
        }}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        isDismissable={false}
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
        <ModalContent className="dark:bg-[#0f0e1c] !scrollbar-hide">
          {(onClose) => (
            <>
              <ModalHeader className="flex gap-2 text-center text-3xl justify-center items-center">
                <h2 className="text-center dark:text-gray-400 flex gap-1">
                  <span>{__("Manage Attributes of", "whizmanage")}</span>
                  <span>
                    {row?.original?.name ? row.original.name : watch("name")}
                  </span>
                </h2>
                <HoverCard openDelay={300}>
                  <HoverCardTrigger asChild>
                    <Info className="h-5 w-5 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer mt-2" />
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80">
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold">
                        {__("Product Attributes", "whizmanage")}
                      </h4>
                      <p className="text-sm font-normal text-muted-foreground">
                        {__("Product attributes allow you", "whizmanage")}
                      </p>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </ModalHeader>
              <ModalBody className="!scrollbar-hide">
                <div className="">
                  <div className="w-full flex justify-between !mb-8">
                    <div></div>
                    <div className="text-center text-3xl font-semibold">
                      {__("Existing product attributes", "whizmanage")}
                    </div>
                    <div></div>
                  </div>
                  <div className="flex justify-center items-center w-full">
                    <AttributesTable
                      product={row?.original ? row.original : formStates}
                      selectedAttributes={selectedAttributes}
                      setSelectedAttributes={setSelectedAttributes}
                    />
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button
                  color="primary"
                  onClick={() => handleSave(onClose)}
                  className="flex gap-2"
                  disabled={isLoading}
                >
                  {__("Save changes", "whizmanage")}
                  {isLoading && (
                    <RefreshCcw className="text-white w-5 h-5 animate-spin" />
                  )}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};
export default AttributesEdit;
