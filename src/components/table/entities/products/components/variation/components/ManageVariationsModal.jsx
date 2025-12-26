// src/components/table/products/components/variation/components/ManageVariationsModal.jsx

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
  useDisclosure,
} from "@heroui/react";
import { Tour } from "antd";
import {
  ExternalLink,
  Info,
  RefreshCcw,
} from "lucide-react";
import { toast } from "@/lib/utils";
import { IconBadge } from "@components/ui/custom/IconBadge";
import { Sliders } from "lucide-react";
import { useEffect, useState } from "react";
 import { __ } from "@wordpress/i18n";
import { useEntityStore } from "../../../products.config";
import { useVariationsStore } from "../store/variationsStore";
import GenerateVariations from "./GenerateVariations";
import VariationsTable from "./VariationsTable";
import { postApi } from "/src/services/services";

/**
 * 🔧 פונקציה לסנכרון variations עם attributes
 */
const syncVariationsWithAttributes = (variations, attributes) => {
  return variations.map((variation) => {
    // ✅ יצירת עותק חדש במקום מוטציה
    const newVariation = { ...variation };
    
    if (!newVariation.original) {
      newVariation.original = { ...variation };
    } else {
      newVariation.original = { ...newVariation.original };
    }

    if (!newVariation.original.attributes) {
      newVariation.original.attributes = [];
    }

    const existingAttrs = newVariation.original.attributes;

    const syncedAttributes = existingAttrs
      .map((existingAttr) => {
        const productAttr = attributes.find((attr) => {
          const expectedName = attr.id === 0 ? attr.name : attr.slug;
          return (
            existingAttr.name === expectedName ||
            existingAttr.name === attr.slug ||
            existingAttr.name === attr.name ||
            existingAttr.slug === expectedName
          );
        });

        if (productAttr) {
          const expectedName =
            productAttr.id === 0 ? productAttr.name : productAttr.slug;

          return {
            id: productAttr.id,
            name: expectedName,
            slug: productAttr.slug,
            option: existingAttr.option || "",
          };
        }

        return null;
      })
      .filter(Boolean);

    attributes.forEach((productAttr) => {
      const expectedName =
        productAttr.id === 0 ? productAttr.name : productAttr.slug;

      const exists = syncedAttributes.some(
        (attr) =>
          attr.name === expectedName ||
          attr.name === productAttr.slug ||
          attr.name === productAttr.name
      );

      if (!exists) {
        syncedAttributes.push({
          id: productAttr.id,
          name: expectedName,
          slug: productAttr.slug,
          option: "",
        });
      }
    });

    newVariation.original.attributes = syncedAttributes;
    return newVariation;
  });
};

const ManageVariationsModal = ({
  product,
  isOpen: externalIsOpen,
  onOpenChange: externalOnOpenChange,
  mode = "full",
  trigger,
  showTour = true,
}) => {
   

  const internalDisclosure = useDisclosure();
  const isOpen = externalIsOpen ?? internalDisclosure.isOpen;
  const onOpen = internalDisclosure.onOpen;
  const onOpenChange = externalOnOpenChange ?? internalDisclosure.onOpenChange;

  const {
    initializeStore,
    reset,
    selectedAttributes,
    allAttributes,
    variations,
    setVariations,
    newVariations,
    updatedVariations,
    deletedVariations,
    clearVariationsChanges,
    isLoading,
    setLoading,
    currentProductId,
    hasChanges,
  } = useVariationsStore();

  const updateItemWithHistory = useEntityStore(
    (state) => state.updateItemWithHistory
  );

  const [openTour, setOpenTour] = useState(false);

  useEffect(() => {
    if (isOpen && product && currentProductId !== product.id) {
      // ✅ העברת אובייקט חדש במקום מוטציה ישירה
      initializeStore(
        {
          ...product,
          subRows:
            product.subRows && product.attributes
              ? syncVariationsWithAttributes(
                  product.subRows,
                  product.attributes
                )
              : product.subRows,
        },
        mode
      );
    }
  }, [isOpen, product, mode, currentProductId, initializeStore]);

  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  const getDocsLink = () => {
    const currentLanguage = window.user_local || "en_US";
    const docsUrls = {
      he_IL:
        "https://whizmanage.com/he/docs/add-and-manage-products/variations/",
      en_US: "https://whizmanage.com/docs/add-and-manage-products/variations/",
      default:
        "https://whizmanage.com/docs/add-and-manage-products/variations/",
    };
    return docsUrls[currentLanguage] || docsUrls.default;
  };

  const CHUNK_SIZE = 80;
  const chunk = (arr, size = CHUNK_SIZE) => {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  };

  const handleSave = async (onClose) => {
    try {
      setLoading(true);

      if (mode === "attributes-only") {
        // מיזוג options: לאטריביוטים גלובליים, לקחת מ-allAttributes (המקור המלא)
        const attributesPayload = selectedAttributes.map((attr) => {
          // מצא את האטריביוט המקורי עם כל ה-options
          const originalAttr = allAttributes.find(
            (a) => a.id === attr.id && a.name === attr.name
          );

          // עבור אטריביוטים גלובליים (id !== 0), קח את ה-options מהמקור המקורי
          let options;
          if (attr.id && attr.id !== 0) {
            // אטריביוט גלובלי - קח מ-allAttributes או product.attributes
            const productAttr = product.attributes?.find(
              (a) => a.id === attr.id
            );
            options = productAttr?.options || originalAttr?.options || attr.options || [];
          } else {
            // אטריביוט מוצר - קח מ-selectedAttributes
            options = attr.options || [];
          }

          if (attr.id && attr.id !== 0) {
            return {
              id: attr.id,
              name: attr.name,
              slug: attr.slug,
              position: attr.position ?? 0,
              visible: attr.visible ?? true,
              variation: attr.variation ?? false,
              options: options.map((opt) =>
                typeof opt === "string" ? opt : opt.name
              ),
            };
          } else {
            return {
              id: 0,
              name: attr.name,
              position: attr.position ?? 0,
              visible: attr.visible ?? true,
              variation: attr.variation ?? false,
              options: options.map((opt) =>
                typeof opt === "string" ? opt : opt.name
              ),
            };
          }
        });

        const url = `${window.siteUrl}/wp-json/wc/v3/products/${product.id}`;
        const response = await postApi(url, {
          attributes: attributesPayload,
        });

        if (response?.data) {
          // ✅ עדכון דרך Store בלבד, בלי מוטציה ישירה
          updateItemWithHistory(product.id, {
            attributes: response.data.attributes,
          });
        }

        toast.success(__("Attributes have been saved successfully.", "whizmanage"));
      } else {
        const newData = variations.filter(
          (item) => !item.original?.date_modified
        );

        const create = newData.map((variation) => {
          const { name, ...rest } = variation.original || variation;
          return rest;
        });

        const update = updatedVariations.map((variation) => {
          const o = variation.original || variation;
          const cleanOriginal = {
            id: o.id || variation.id,
            date_created: o.date_created,
            date_modified: o.date_modified,
            description: o.description,
            permalink: o.permalink,
            sku: o.sku,
            price: o.price,
            regular_price: o.regular_price,
            sale_price: o.sale_price,
            on_sale: o.on_sale,
            purchasable: o.purchasable,
            visible: o.visible,
            virtual: o.virtual,
            downloadable: o.downloadable,
            manage_stock: o.manage_stock,
            stock_quantity: o.stock_quantity,
            stock_status: o.stock_status,
            weight: o.weight,
            dimensions: o.dimensions,
            shipping_class: o.shipping_class,
            image: o.image,
            attributes: o.attributes,
            menu_order: o.menu_order,
            meta_data: o.meta_data,
          };

          const newUpdate = { ...cleanOriginal };

          if (Array.isArray(newUpdate.attributes)) {
            newUpdate.attributes = newUpdate.attributes
              .map((attr) => {
                if (!attr?.name) return null;
                const cleanAttr = {
                  name: attr.name,
                  option: attr.option || "",
                };
                if (attr.id !== undefined) cleanAttr.id = attr.id;
                if (attr.slug) cleanAttr.slug = attr.slug;
                return cleanAttr;
              })
              .filter(Boolean);

            if (newUpdate.attributes.length === 0) {
              delete newUpdate.attributes;
            }
          }

          delete newUpdate.name;

          if (product.sku === newUpdate.sku) {
            delete newUpdate.sku;
          }

          return newUpdate;
        });

        const deleteIds = (deletedVariations || [])
          .map((v) => v?.id)
          .filter(Boolean);

        const batchUrl = `${window.siteUrl}/wp-json/wc/v3/products/${product.id}/variations/batch`;

        const allResponses = {
          created: [],
          updated: [],
          deleted: [],
        };

        if (create.length > 0) {
          for (const c of chunk(create)) {
            const response = await postApi(batchUrl, { create: c });
            if (response?.data?.create) {
              allResponses.created.push(...response.data.create);
            }
          }
        }

        if (update.length > 0) {
          for (const u of chunk(update)) {
            const response = await postApi(batchUrl, { update: u });
            if (response?.data?.update) {
              allResponses.updated.push(...response.data.update);
            }
          }
        }

        if (deleteIds.length > 0) {
          for (const d of chunk(deleteIds)) {
            const response = await postApi(batchUrl, { delete: d });
            if (response?.data?.delete) {
              allResponses.deleted.push(...response.data.delete);
            }
          }
        }

        // מיזוג options: לאטריביוטים גלובליים, לקחת מ-allAttributes (המקור המלא)
        // selectedAttributes מכיל רק את ה-options הנבחרים לווריאציות
        const attributesPayload = selectedAttributes.map((attr) => {
          // מצא את האטריביוט המקורי עם כל ה-options
          const originalAttr = allAttributes.find(
            (a) => a.id === attr.id && a.name === attr.name
          );

          // עבור אטריביוטים גלובליים (id !== 0), קח את ה-options מהמקור המקורי
          // עבור אטריביוטים של מוצר (id === 0), קח מ-selectedAttributes
          let options;
          if (attr.id && attr.id !== 0) {
            // אטריביוט גלובלי - קח מ-allAttributes או product.attributes
            const productAttr = product.attributes?.find(
              (a) => a.id === attr.id
            );
            options = productAttr?.options || originalAttr?.options || attr.options || [];
          } else {
            // אטריביוט מוצר - קח מ-selectedAttributes
            options = attr.options || [];
          }

          if (attr.id && attr.id !== 0) {
            return {
              id: attr.id,
              name: attr.name,
              slug: attr.slug,
              position: attr.position ?? 0,
              visible: attr.visible ?? true,
              variation: attr.variation ?? true,
              options: options.map((opt) =>
                typeof opt === "string" ? opt : opt.name
              ),
            };
          } else {
            return {
              id: 0,
              name: attr.name,
              position: attr.position ?? 0,
              visible: attr.visible ?? true,
              variation: attr.variation ?? true,
              options: options.map((opt) =>
                typeof opt === "string" ? opt : opt.name
              ),
            };
          }
        });

        const attributesUrl = `${window.siteUrl}/wp-json/wc/v3/products/${product.id}`;
        const attributesResponse = await postApi(attributesUrl, {
          attributes: attributesPayload,
        });

        const productsData = useEntityStore.getState().data;
        const currentProduct = productsData.find((p) => p.id === product.id);

        if (currentProduct) {
          let newSubRows = [...(currentProduct.subRows || [])];

          if (allResponses.deleted.length > 0) {
            const deletedIds = allResponses.deleted.map((v) => v.id);
            newSubRows = newSubRows.filter(
              (sub) => !deletedIds.includes(sub.id)
            );
          }

          if (allResponses.updated.length > 0) {
            allResponses.updated.forEach((updatedVar) => {
              const index = newSubRows.findIndex(
                (sub) => sub.id === updatedVar.id
              );
              if (index !== -1) {
                newSubRows[index] = {
                  ...newSubRows[index],
                  ...updatedVar,
                  original: updatedVar,
                };
              }
            });
          }

          if (allResponses.created.length > 0) {
            const newVars = allResponses.created.map((createdVar) => ({
              ...createdVar,
              original: createdVar,
            }));
            newSubRows = [...newSubRows, ...newVars];
          }

          // ✅ שימוש בתשובה מה-API במקום product.attributes
          updateItemWithHistory(product.id, {
            attributes: attributesResponse?.data?.attributes || [],
            subRows: newSubRows,
            has_options: newSubRows.length > 0,
          });
        }

        clearVariationsChanges();

        toast.success(__("Variations have been saved successfully.", "whizmanage"));
      }

      setLoading(false);
      onClose();
    } catch (error) {
      console.error("Error saving variations:", error);
      toast.error(error?.response?.data?.message ||
            error?.message ||
            __("Unknown error occurred", "whizmanage"));
      setLoading(false);
    }
  };

  const tourSteps =
    mode === "full"
      ? [
          {
            title: (
              <div className="flex gap-1 items-center">
                <h2 className="text-fuchsia-600 font-bold text-lg">
                  {__("Step 1: ", "whizmanage")}
                </h2>
                <p className="font-bold text-lg">
                  {__("Select Product Attributes", "whizmanage")}
                </p>
              </div>
            ),
            description: (
              <div className="flex flex-col gap-2">
                <p>
                  {__(
                    "Begin by adding attributes to your product. Attributes define the different aspects of your product that may vary, such as color, size, or material. You have two options when creating an attribute:",
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
              </div>
            ),
            target: () => document.querySelector('[data-tour="step-1"]'),
          },
          {
            title: (
              <div className="flex gap-1 items-center">
                <h2 className="text-fuchsia-600 font-bold text-lg">
                  {__("Step 2: ", "whizmanage")}
                </h2>
                <p className="font-bold text-lg">
                  {__("Define Attribute Options", "whizmanage")}
                </p>
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
              </div>
            ),
            target: () => document.querySelector('[data-tour="step-2"]'),
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
              </div>
            ),
            target: () => document.querySelector('[data-tour="step-3"]'),
          },
        ]
      : [];

  return (
    <>
      {trigger && <div onClick={onOpen}>{trigger}</div>}
      <Modal
        size="5xl"
        scrollBehavior="inside"
        backdrop="opaque"
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        isDismissable={false}
        classNames={{
          backdrop:
            "bg-gradient-to-t from-zinc-800 to-zinc-800/30 backdrop-opacity-20 !scrollbar-hide scrollbar-none",
          header: "border-b",
          footer: "border-t",
          body: "py-6",
          closeButton: "hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 rounded-lg",
        }}
        className="!scrollbar-hide scrollbar-none"
        motionProps={{
          variants: {
            enter: {
              y: 0,
              opacity: 1,
              transition: { duration: 0.3, ease: "easeOut" },
            },
            exit: {
              y: -20,
              opacity: 0,
              transition: { duration: 0.2, ease: "easeIn" },
            },
          },
        }}
      >
        <ModalContent className="dark:bg-[#0f0e1c] !scrollbar-hide">
          {(onClose) => (
            <>
            <div id="radix-select-portal" />
              <ModalHeader className="flex gap-3 text-center justify-center items-center">
                <IconBadge icon={Sliders} variant="default" size="default" />
                <h2 className="text-2xl font-semibold dark:text-slate-300 flex gap-1">
                  <span>
                    {mode === "attributes-only"
                      ? __("Manage Attributes of", "whizmanage")
                      : __("Manage Variations of", "whizmanage")}
                  </span>
                  <span>{product?.name}</span>
                </h2>

                {mode === "full" && showTour && (
                  <HoverCard openDelay={300}>
                    <HoverCardTrigger asChild>
                      <Info className="size-4 text-fuchsia-600 text-opacity-50 hover:text-opacity-100 cursor-pointer mt-1" />
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
                          onClick={() => setOpenTour(true)}
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
                )}
              </ModalHeader>

              <ModalBody className="!scrollbar-hide">
                <div className="mb-4">
                  <div className="w-full flex justify-between !mb-8">
                    <div></div>
                    <div className="text-center text-xl font-semibold dark:text-slate-300">
                      {mode === "attributes-only"
                        ? __("Product attributes", "whizmanage")
                        : __("Existing product attributes", "whizmanage")}
                    </div>
                    <div></div>
                  </div>

                  <div className="flex justify-center items-center w-full">
                    <GenerateVariations product={product} mode={mode} />
                  </div>
                </div>

                {mode === "full" && (
                  <>
                    <div className="text-center text-xl font-semibold dark:text-slate-300 !my-4">
                      {__("Existing product variations", "whizmanage")}
                    </div>
                    <VariationsTable
                      ProductRow={{ id: product.id, original: product }}
                    />
                  </>
                )}
              </ModalBody>

              <ModalFooter>
                <Button
                  color="primary"
                  onClick={() => handleSave(onClose)}
                  className="flex gap-2"
                  disabled={isLoading || (mode === "full" && !hasChanges())}
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
      {/* ✅ Tour עם mask + zIndex גבוה מעל המודל */}
      {mode === "full" && showTour && (
        <Tour
          open={openTour}
          onClose={() => setOpenTour(false)}
          steps={tourSteps}
          zIndex={200000}
          mask={{
            color: "rgba(0, 0, 0, 0.8)",
          }}
        />
      )}
    </>
  );
};

export default ManageVariationsModal;