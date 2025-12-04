import { useProductsContext } from "@/context/ProductsContext";
import CustomTooltip from "@components/nextUI/Tooltip";
import { Alert, AlertDescription } from "@components/ui/alert";
import { Button } from "@components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
import {
  CheckCircle,
  Plus,
  RefreshCcw,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { __ } from "@wordpress/i18n";
import { MdError } from "react-icons/md";
import { toast } from "sonner";
import DownloadableEdit from "../../../table/edit/DownloadableEdit";
import EditGrouped from "../../../table/edit/EditGrouped";
import ExternalProductEdit from "../../../table/edit/ExternalProductEdit";
import StatusVariationEdit from "../variation/StatusVariationEdit";
import CustomFieldsGroup from "./CustomFieldsGroup";
import DescriptionGroup from "./DescriptionGroup";
import InventoryGroup from "./InventoryGroup";
import LabelsGroup from "./LabelsGroup";
import PhotosGroup from "./PhotosGroup";
import PricesGroup from "./PricesGroup";
import { postApi, putApi } from "/src/services/services";
import { Textarea } from "@components/ui/textarea";
import ProBadge from "../../../../../../components/nextUI/ProBadge";

const AddProduct = ({ fetchData, table, isTableImport }) => {
  if (isTableImport) {
    return;
  }

  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [formStates, setFormStates] = useState({});
  const [newProduct, setNewProduct] = useState(null);
  const [newProductType, setNewProductType] = useState("simple");
  const { data, setData } = useProductsContext();

  const formRef = useRef(null);


  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
  } = useForm({
    mode: "onBlur",
  });

  const updateValue = (keyName, value) => {
    setFormStates((prevState) => ({ ...prevState, [keyName]: value }));
  };

  const updateProduct = async (row, onClose) => {
    setIsLoading(true);

    const _bodyData = {
      ...row,
      attributes: data[0].attributes,
      ...formStates,
      id: data[0].id,
      type: newProductType,
    };
    console.log(_bodyData);

    const url = `${window.siteUrl}/wp-json/wc/v3/products/${_bodyData.id}`;
    await putApi(url, _bodyData)
      .then((data) => {
        toast(
          <div className="p-4 dark:bg-slate-800 w-full h-full dark:text-slate-400 !border-l-4 !border-l-fuchsia-600 rounded-md flex gap-4 items-center justify-start">
            <CheckCircle className="w-5 h-5 text-fuchsia-600" />
            {__("The product has been updated successfully", "whizmanage")}
          </div>,
          { duration: 5000 }
        );
        setNewProduct(null);
        onClose();
        resetForms();
        setNewProductType("simple");
        fetchData(true, [data.data.id]);
      })
      .catch((error) => {
        setIsLoading(false);
        toast(
          <div className="p-4 dark:bg-slate-800 w-full h-full dark:text-slate-300 !border-l-4 !border-l-red-500 rounded-md flex gap-4 items-center justify-start">
            <XCircle className="w-5 h-5 text-red-500" />
            {error?.response?.data?.message ||
              error ||
              "Unknown error occurred"}
          </div>,
          { duration: 5000 }
        );
      });
    setIsLoading(false);
  };

  const onSubmit = async (newData, onClose, keyName, value) => {
    const combinedData = { ...newData, ...formStates };
    combinedData[keyName] = value;
    combinedData.stock_quantity =
      combinedData.stock_quantity === "" ? null : combinedData.stock_quantity;
    combinedData.purchase_note = formStates.purchase_note || "";

    setIsLoading(true);
    try {
      const response = await postApi(
        `${window.siteUrl}/wp-json/wc/v3/products`,
        combinedData
      );

      postApi(`${window.siteUrl}/wp-json/whizmanage/v1/history`, {
        location: "products",
        items: [response.data],
        action: "add",
      });

      const newProductData = response.data;
      setData([newProductData, ...data]);
      
      toast(
        <div className="p-4 w-full h-full !border-l-4 !border-l-fuchsia-600 dark:bg-slate-800 dark:text-slate-300 rounded-md flex gap-4 items-center justify-start">
          <CheckCircle className="w-5 h-5 text-fuchsia-600" />
          {__("A new product added", "whizmanage")}
        </div>,
        { duration: 2000 }
      );

      setIsLoading(false);
      fetchData(true, [newProductData.id]);
      if (onClose) {
        onClose();
        reset();
        setNewProductType("simple");
        setErrorMessage("");
        setFormStates([]);
      }
    } catch (error) {
      setIsLoading(false);
      setErrorMessage(
        error?.response?.data?.message ||
          error.message ||
          "Unknown error occurred"
      );
      console.log(error);
    }
  };

  const handleTypeChange = async (newType) => {
    setNewProductType(newType);
    updateValue("type", newType);
    
  };

  const resetForms = () => {
    reset();
    setNewProductType("simple");
    setErrorMessage("");
    setFormStates({});
  };

  const isFormInvalid = Object.keys(errors).length > 0;
  const productName = watch("name");
  const formValues = watch();
  const isFormEmpty = Object.values(formValues).every((value) => !value);

  return (
    <>
      <Button
        className="flex group relative overflow-hidden gap-2"
        onClick={onOpen}
        variant="gradient"
      >
        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
        <Plus className="h-4 w-4" />
        {__("Add product", "whizmanage")}
      </Button>
      <Modal
        size="5xl"
        scrollBehavior="inside"
        backdrop="opaque"
        className="overflow-hidden"
        classNames={{
          backdrop:
            "bg-gradient-to-t from-zinc-800 to-zinc-800/30 backdrop-opacity-20 !overflow-hidden",
        }}
        isOpen={isOpen}
        isDismissable={false}
        onOpenChange={onOpenChange}
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
        <ModalContent className="dark:bg-gray-900">
          {(onClose) => (
            <>
              <ModalHeader className="flex gap-1 text-center text-3xl justify-center">
                <h2 className="text-center dark:text-gray-400">
                  {__("Create a new product", "whizmanage")}
                </h2>
              </ModalHeader>
              <ModalBody>
                <ScrollShadow
                  size={10}
                  className="w-full h-full scrollbar-whiz"
                >
                  <form
                    ref={formRef}
                    onSubmit={handleSubmit(onSubmit)}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6 p-1.5"
                  >
                    <div className="flex flex-col gap-6 overflow-auto py-6">
                      <DescriptionGroup
                        register={register}
                        updateValue={updateValue}
                        errors={errors}
                      />
                      <div className="px-2">
                        <label
                          htmlFor="purchase_note"
                          className="block text-sm font-medium dark:text-gray-200"
                        >
                          {__(
                            "Purchase note (email to customer)",
                            "whizmanage"
                          )}
                        </label>
                        <Textarea
                          id="purchase_note"
                          {...register("purchase_note")}
                          onChange={(e) =>
                            updateValue("purchase_note", e.target.value)
                          }
                          className="mt-1 w-full"
                          rows={3}
                          placeholder={__(
                            "send automaticly message after purchase",
                            "whizmanage"
                          )}
                        />
                        {errors.purchase_note && (
                          <p className="text-red-600 text-sm">
                            {errors.purchase_note.message}
                          </p>
                        )}
                      </div>
                      <InventoryGroup
                        register={register}
                        updateValue={updateValue}
                      />
                      <CustomFieldsGroup updateValue={updateValue} />
                    </div>
                    <div className="flex flex-col gap-6 overflow-auto py-6">
                      {newProductType != "variable" && (
                        <PricesGroup
                          register={register}
                          errors={errors}
                          updateValue={updateValue}
                        />
                      )}
                      <LabelsGroup updateValue={updateValue} />
                      <PhotosGroup updateValue={updateValue} />
                    </div>
                  </form>
                </ScrollShadow>
              </ModalBody>
              <ModalFooter className="flex justify-between">
                <div>
                  <CustomTooltip title={__("Reset form", "whizmanage")}>
                    <Button
                      variant="outline"
                      onClick={resetForms}
                      className="h-10"
                      size="icon"
                      disabled={isFormEmpty}
                    >
                      <RotateCcw />
                    </Button>
                  </CustomTooltip>
                </div>
                <div>
                  {errorMessage !== "" && (
                    <Alert
                      variant="primary"
                      className="flex items-center max-w-fit !h-10"
                    >
                      <AlertDescription className="flex gap-4 justify-center items-center">
                        <MdError className="h-4 w-4" />
                        <p className="dark:!text-white">{errorMessage}</p>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <div className="flex gap-4">
                  <div className="flex gap-2">
                    <DownloadableEdit updateValue={updateValue} />
                    <CustomTooltip
                      title={__("Select product type", "whizmanage")}
                    >
                      <Select
                        value={newProductType}
                        onValueChange={(newValue) => handleTypeChange(newValue)}
                        disabled={isFormInvalid || isLoading || !productName}
                      >
                        <SelectTrigger className="h-10 w-fit">
                          <SelectValue
                            placeholder={__(newProductType, "whizmanage")}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>
                              {__("Product Type", "whizmanage")}
                            </SelectLabel>
                            <SelectItem value="simple">
                              {__("Simple product", "whizmanage")}
                            </SelectItem>
                            <SelectItem value="grouped">
                              {__("Grouped product", "whizmanage")}
                            </SelectItem>
                            <SelectItem value="external">
                              {__("External/Affiliate product", "whizmanage")}
                            </SelectItem>
                            <SelectItem value="variable">
                              {__("Variable product", "whizmanage")}
                              <ProBadge/>
                            </SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </CustomTooltip>
                    {newProductType === "grouped" && (
                      <EditGrouped
                        row={newProduct}
                        isNew={true}
                        updateValue={updateValue}
                      />
                    )}
                    {newProductType === "external" && (
                      <ExternalProductEdit
                        row={newProduct}
                        isNew={true}
                        updateValue={updateValue}
                      />
                    )}
                  </div>

                  <CustomTooltip title={__("Select status", "whizmanage")}>
                    <div>
                      <StatusVariationEdit updateValue={updateValue} />
                    </div>
                  </CustomTooltip>

                  <CustomTooltip title={__("Save product", "whizmanage")}>
                    <Button
                      disabled={isFormInvalid || isLoading || !productName}
                      color="primary"
                      onClick={() => {
                        if (newProduct == null) {
                          handleSubmit((data) => onSubmit(data, onClose))();
                        } else {
                          handleSubmit((data) =>
                            updateProduct(data, onClose)
                          )();
                        }
                      }}
                      className="flex gap-2"
                    >
                      {__("Save", "whizmanage")}
                      {isLoading && (
                        <RefreshCcw className="text-white w-5 h-5 animate-spin" />
                      )}
                    </Button>
                  </CustomTooltip>
                </div>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

export default AddProduct;
