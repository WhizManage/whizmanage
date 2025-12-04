import { useProductsContext } from "@/context/ProductsContext";
import CustomTooltip from "@components/nextUI/Tooltip";
import { Button } from "@components/ui/button";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  cn,
  useDisclosure,
} from "@heroui/react";
import {
  CheckCircle,
  ExternalLink,
  Info,
  Plus,
  RefreshCcw,
  Settings2,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import GenerateVariations from "./GenerateVariations";
import { postApi, getApi } from "/src/services/services";
import { __ } from '@wordpress/i18n';
import VariationsTable from "./VariationsTable";
import { Button as AntButton, Tour } from "antd";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@components/ui/hover-card";
import { chunkBatchPayloads } from "@/utils/networkUtils";

const AddVariations = ({ row, isNew }) => {
   
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [variations, setVariations] = useState(row?.subRows ? row.subRows : []);
  const [isLoading, setIsLoading] = useState(false);
  const [newVariations, setNewVariations] = useState([]);
  const [updatedVariations, setUpdatedVariations] = useState([]);
  const [deletedVariations, setDeletedVariations] = useState([]);
  const [updatedTable, setUpdatedTable] = useState(false);
  const [allAttributes, setAllAttributes] = useState(
    row?.original?.attributes ? row.original.attributes : []
  );
  const [currentIdCount, setCurrentIdCount] = useState(
    row?.original?.subRows ? row.original.subRows.length : 0
  );
  const [open, setOpen] = useState(false);
  const ref1 = useRef(null);
  const ref2 = useRef(null);
  const ref3 = useRef(null);
  const ref4 = useRef(null);

  const [selectedAttributes, setSelectedAttributes] = useState(
    row?.original?.attributes
  );

  const steps = [
    {
      title: (
        <div className="flex gap-1 items-center">
          <h2 className="text-fuchsia-600 font-bold text-lg">
            {__("Step 1: ", "whizmanage")}
          </h2>
          <p className="font-bold text-lg">
            {__("Add Attributes to the Product", "whizmanage")}
          </p>
        </div>
      ),
      description: (
        <div className="flex flex-col gap-2">
          <p>
            {__(
              "Attributes are characteristics that define a product and enable variations. Here’s how you can add them:",
              "whizmanage"
            )}
          </p>
          <p>
            {__(
              "First, click the 'Add Attribute' button and select the type of attribute you wish to add. There are two types of attributes as follows:",
              "whizmanage"
            )}
          </p>
          <p>
            <span className="font-bold mr-1 rtl:mr-0 rtl:ml-1">
              {__("Product Attribute:", "whizmanage")}
            </span>
            {__(
              'Select this option to add attributes that are unique to this specific product, such as "Storage Capacity" for electronics or "Frame Material" for glasses.',
              "whizmanage"
            )}
          </p>
          <p>
            <span className="font-bold mr-1 rtl:mr-0 rtl:ml-1">
              {__("Global Attribute:", "whizmanage")}
            </span>
            {__(
              'Select this for attributes like "Size" or "Color" that are common across multiple products. Creating a global attribute once allows you to reuse it, avoiding repetitive setup for each product.',
              "whizmanage"
            )}
          </p>
          <p>
            {__(
              "After selecting the desired attribute type, a list of existing attributes will appear. Choose the attribute you wish to add to your product. If the attribute is not listed, click the plus button to add it.",
              "whizmanage"
            )}
          </p>
        </div>
      ),
      // cover: (
      //   <img
      //     alt="tour.png"
      //     src="https://user-images.githubusercontent.com/5378891/197385811-55df8480-7ff4-44bd-9d43-a7dade598d70.png"
      //   />
      // ),
      target: () => ref1.current,
    },
    {
      title: (
        <div className="flex gap-1 items-center">
          <h2 className="text-fuchsia-600 font-bold text-lg">
            {__("Step 2: ", "whizmanage")}
          </h2>
          <p className="font-bold text-lg">{__("Define Attribute Options", "whizmanage")}</p>
        </div>
      ),
      description: (
        <div className="flex flex-col gap-2">
          <p>
            {__(
              "After selecting an attribute for your product, you now need to define the available options. For instance, if the attribute is 'Color', you will need to specify the available colors.",
              "whizmanage"
            )}
          </p>
          <p>
            {__(
              "The default option is 'Any', which will display all available options for the attribute to the customers in the store. This is suitable when you do not wish to specify different settings for each variation, such as different prices, stock levels, or images. If the attribute is global, options can be imported from existing terms instead of creating them individually.",
              "whizmanage"
            )}
          </p>
          <p>
            {__(
              "Alternatively, instead of choosing 'Any', you can select specific options that you want to manage differently for each variation. This is ideal if you want to manage different prices, stock levels, or images for each variation. You can mark the existing options from the list or create new ones. For global attributes, options can be imported as mentioned earlier.",
              "whizmanage"
            )}
          </p>
        </div>
      ),
      target: () => ref2.current,
    },
    {
      title: (
        <div className="flex gap-1 items-center">
          <h2 className="text-fuchsia-600 font-bold text-lg">
            {__("Step 3: ", "whizmanage")}
          </h2>
          <p className="font-bold text-lg">
            {__("Combine and Generate Variations", "whizmanage")}
          </p>
        </div>
      ),
      description: (
        <div className="flex flex-col gap-2">
          <p>
            {__(
              "At this stage, by clicking 'Generate', you will create combinations of the selected attributes and options for your product, resulting in new variations. For example, selecting 'Color' with options 'Blue' and 'Green', and 'Size' with options 'Small' and 'Large', will generate four product variations: Small Blue, Large Blue, Small Green, and Large Green.",
              "whizmanage"
            )}
          </p>
          <p>
            {__(
              "If the 'Any' option is chosen for an attribute, no distinct variations for each option are created. Instead, a selection list will be included in the main product, which prevents the seller from setting different prices for each variation. Customers can choose their preferred option directly from the product page.",
              "whizmanage"
            )}
          </p>
        </div>
      ),
      target: () => ref3.current,
    },
    {
      title: (
        <div className="flex gap-1 items-center">
          <h2 className="text-fuchsia-600 font-bold text-lg">
            {__("Step 4: ", "whizmanage")}
          </h2>
          <p className="font-bold text-lg">{__("Define Attribute Options", "whizmanage")}</p>
        </div>
      ),
      description: (
        <div className="flex flex-col gap-2">
          <p>
            {__(
              "After selecting an attribute for your product, you now need to define the available options. For instance, if the attribute is 'Color', you will need to specify the available colors.",
              "whizmanage"
            )}
          </p>
          <p>
            {__(
              "The default option is 'Any', which will display all available options for the attribute to the customers in the store. This is suitable when you do not wish to specify different settings for each variation, such as different prices, stock levels, or images. If the attribute is global, options can be imported from existing terms instead of creating them individually.",
              "whizmanage"
            )}
          </p>
          <p>
            {__(
              "Alternatively, instead of choosing 'Any', you can select specific options that you want to manage differently for each variation. This is ideal if you want to manage different prices, stock levels, or images for each variation. You can mark the existing options from the list or create new ones. For global attributes, options can be imported as mentioned earlier.",
              "whizmanage"
            )}
          </p>
        </div>
      ),
      target: () => ref4.current,
    },
  ];

  const { data, setData } = useProductsContext();

  useEffect(() => {
    // הפונקציה שממירה מערך של attributes למחרוזת JSON מסודרת, מתעלמת מ-slug ומסירה את התחילית "pa_" מ-name אם קיימת
    function stringifyAttributes(attributes) {
      const filteredAttributes = attributes.map((attr) => ({
        name: attr.name.startsWith("pa_") ? attr.name.substring(3) : attr.name,
        option: attr.option,
      }));
      return JSON.stringify(filteredAttributes);
    }

    // הפונקציה שבודקת אם מערך attributes מסוים קיים במערך הגדול
    function attributesExist(bigArray, newAttributes) {
      const newAttributesString = stringifyAttributes(newAttributes);
      return bigArray.some(
        (item) =>
          stringifyAttributes(item.original.attributes) === newAttributesString
      );
    }

    let oldArray = [...variations]; // עותק של הווריאציות הישנות
    let filteredNewVariations = [...newVariations]; // עותק של הווריאציות החדשות

    // סינון הווריאציות החדשות שמתווספות
    filteredNewVariations = filteredNewVariations.filter((newItem) => {
      if (!attributesExist(oldArray, newItem.attributes)) {
        return true; // נוסיף את זה למערך החדש
      } else {
        console.log("The array already exists in the old array.");
        return false; // לא נוסיף את זה
      }
    });
    // אם נשארו ווריאציות חדשות לאחר הסינון, נוסיף אותן
    if (filteredNewVariations.length > 0) {
      addNewVariations(filteredNewVariations);
    }
  }, [newVariations]);

  useEffect(() => {
    setVariations(row?.subRows);
  }, [row?.subRows]);

  useEffect(() => {
    setAllAttributes((prev) => {
      const prevIds = new Set(prev.map((attr) => attr.id)); // יוצר סט של כל ה-id-ים הקיימים
      const newAttributes = selectedAttributes.filter(
        (attr) => !prevIds.has(attr.id)
      ); // מסנן רק את הערכים החדשים
      return [...prev, ...newAttributes]; // מחזיר מערך חדש בלי כפילויות
    });
  }, [selectedAttributes]);

  const addNewVariations = async () => {
    let localIdCount = currentIdCount;
    const data = newVariations.map((item, i) => {
      const name = item.attributes.map((attr) => attr.option).join(", ");
      localIdCount += 1;
      const anyCount = item.attributes.reduce((count, attr) => {
        return count + (attr.option ? 0 : 1);
      }, 0);
      return {
        id: `${row.id}.${localIdCount}`,
        original: {
          attributes: item.attributes,
          image: row.original.images[0] || null,
          name: name || "",
          regular_price: row.original.regular_price,
          sale_price: row.original.sale_price,
          attributes: item.attributes,
          description: "",
          menu_order: i + 1 + variations.length,
        },
        index: localIdCount,
        depth: 1,
        parentId: row.id,
      };
    });
    console.log(data);

    setVariations((prev) => [...data, ...prev]);
    setCurrentIdCount(localIdCount);
    setUpdatedTable(!updatedTable);
  };

  const onSubmit = async (_data, onClose) => {
    try {
      setIsLoading(true);

      const newData = _data.filter((item) => !item.original.date_modified);
      const create = newData.map((variation) => {
        const newCreate = { ...variation.original };
        delete newCreate.name;
        return newCreate;
      });

      const update = updatedVariations.map((variation) => {
        const newUpdate = { ...variation.original };
        const parent = data.find((item) => item.id === newUpdate.parent_id);
        if (parent && parent.sku === newUpdate.sku) {
          delete newUpdate.sku;
        }
        return newUpdate;
      });

      const del = deletedVariations
        .map((variation) => variation?.id)
        .filter((id) => id !== undefined);

      // מחלקים למנות של עד 100
      const batches = chunkBatchPayloads(create, update, del, 100);
      const batchUrl = `${window.siteUrl}/wp-json/wc/v3/products/${row.original.id}/variations/batch`;

      await Promise.all(
        batches.map((batch) =>
          postApi(batchUrl, {
            create: batch.create,
            update: batch.update,
            delete: batch.delete,
          })
        )
      );

      // שליפת מידע חדש לאחר שמירה
      const url = `${window.siteUrl}/wp-json/whizmanage/v1/get_product/`;
      const resProduct = await postApi(url, {
        product_ids: [row.original.id],
      });

      setData((prevData) => {
        const newData = JSON.parse(resProduct.data);
        const updatedData = prevData.map((item) => {
          const updatedItem = newData.find((newItem) => newItem.id === item.id);
          return updatedItem ? updatedItem : item;
        });

        const newItems = newData.filter(
          (newItem) => !prevData.some((item) => item.id === newItem.id)
        );

        return [...updatedData, ...newItems];
      });

      toast(
        <div className="p-4 w-full h-full !border-l-4 !border-l-fuchsia-600 dark:bg-slate-800 dark:text-slate-300 rounded-md flex gap-4 items-center justify-start">
          <CheckCircle className="w-5 h-5 text-fuchsia-600" />
          {__("Variations updates have been saved successfully.", "whizmanage")}
        </div>,
        { duration: 5000 }
      );

      setIsLoading(false);
      onClose();
    } catch (error) {
      setIsLoading(false);
      toast(
        <div className="p-4 w-full h-full !border-l-4 !border-l-fuchsia-600 dark:bg-slate-800 dark:text-slate-300 rounded-md flex gap-4 items-center justify-start">
          <XCircle className="w-5 h-5 text-red-500" />
          {error?.response?.data?.message || error || "Unknown error occurred"}
        </div>,
        { duration: 5000 }
      );
    }
  };

  const local = window.user_local;
  const getDocsLink = () => {
    return local == "he_IL"
      ? "https://docs.whizmanage.com/he/docs/variations"
      : "https://docs.whizmanage.com/en/docs/variations";
  };
  return (
    <>
      <CustomTooltip title={__("Manage variations", "whizmanage")}>
        <Button
          className={cn(
            "flex px-2",
            isNew ? "!min-h-10 !min-w-10 !h-10 !w-10" : "!size-8"
          )}
          variant="outline"
          size="icon"
          onClick={onOpen}
        >
          <Settings2 className="!size-5" />
        </Button>
      </CustomTooltip>
      <Modal
        size="5xl"
        scrollBehavior="inside"
        backdrop="opaque"
        className="!scrollbar-hide scrollbar-none"
        classNames={{
          backdrop:
            "bg-gradient-to-t from-zinc-800 to-zinc-800/30 backdrop-opacity-20 !scrollbar-hide scrollbar-none",
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
                  <span>{__("Manage Variations of", "whizmanage")}</span>
                  <span>{row?.original?.name && row.original.name}</span>
                </h2>
                <HoverCard openDelay={300}>
                  <HoverCardTrigger asChild>
                    <Info className="h-5 w-5 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer mt-2" />
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80">
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold">
                        {__("Variations", "whizmanage")}
                      </h4>
                      <p className="text-sm font-normal text-muted-foreground">
                        {__(
                          "Variations are different versions of a product, each with unique attributes such as size, color, or material. By using variations, you can offer multiple options for a single product, allowing customers to choose exactly what they prefer. This feature simplifies inventory management and enhances the shopping experience by grouping similar items under one product listing. For a guided tour of how to use variations, please visit this link:",
                          "whizmanage"
                        )}
                      </p>
                      <span
                        className="text-sm text-fuchsia-600 underline cursor-pointer"
                        onClick={() => setOpen(true)}
                      >
                        {__("Take a tour", "whizmanage")}
                      </span>
                      <div className="flex justify-center mt-2">
                        <a
                          href={getDocsLink()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-fuchsia-600 hover:text-fuchsia-600/80 flex items-center gap-2 text-sm"
                        >
                          <ExternalLink className="h-4 w-4" />
                          {__("View variations documentation", "whizmanage")}
                        </a>
                      </div>
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
                    <GenerateVariations
                      ref1={ref1}
                      ref2={ref2}
                      ref3={ref3}
                      selectedAttributes={selectedAttributes}
                      setSelectedAttributes={setSelectedAttributes}
                      setAllAttributes={setAllAttributes}
                      product={row.original}
                      setNewVariations={setNewVariations}
                    />
                  </div>
                </div>
                <div className="text-center text-3xl font-semibold !my-8">
                  {__("Existing product variations", "whizmanage")}
                </div>
                <VariationsTable
                  ProductRow={row}
                  allAttributes={allAttributes}
                  variations={variations}
                  setVariations={setVariations}
                  updatedTable={updatedTable}
                  setUpdatedVariations={setUpdatedVariations}
                  setDeletedVariations={setDeletedVariations}
                  setUpdatedTable={setUpdatedTable}
                  selectedAttributes={selectedAttributes}
                  setSelectedAttributes={setSelectedAttributes}
                  deletedVariations={deletedVariations}
                />
              </ModalBody>
              <ModalFooter>
                <Button
                  color="primary"
                  onClick={() => onSubmit(variations, onClose)}
                  className="flex gap-2"
                  disabled={
                    false
                    // variations.length === row.subRows.length || 0
                  }
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
      <Tour
        open={open}
        onClose={() => setOpen(false)}
        steps={steps}
        mask={{
          style: {
            boxShadow: "inset 0 0 15px #333",
          },
          color: "rgba(0, 0, 0, .8)",
        }}
      />
    </>
  );
};

export default AddVariations;