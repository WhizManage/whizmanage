import { useCouponsContext } from "@/context/CouponsContext";
import CustomTooltip from "@components/nextUI/Tooltip";
import { Alert, AlertDescription } from "@components/ui/alert";
import { Button } from "@components/ui/button";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ScrollShadow,
  useDisclosure,
} from "@heroui/react";
import { CheckCircle, Plus, RefreshCcw, RotateCcw } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { __ } from '@wordpress/i18n';
import { MdError } from "react-icons/md";
import { toast } from "sonner";
import StatusVariationEdit from "../../../../../products/_components/header/add/variation/StatusVariationEdit";
import AdvancedUsageRestrictions from "./AdvancedUsageRestrictions";
import CouponDetails from "./CouponDetails";
import GeneralRestrictions from "./GeneralRestrictions";
import UsageLimits from "./UsageLimits";
import { postApi } from "/src/services/services";

const AddCoupon = ({ fetchData, table }) => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [formStates, setFormStates] = useState({});
  const { data, setData } = useCouponsContext();
   
  const formRef = useRef(null);
  const {
    register,
    setValue,
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

  const onSubmit = async (newData, onClose, keyName, value) => {
    const combinedData = { ...newData, ...formStates };
    combinedData[keyName] = value;

    if (!combinedData.date) {
      combinedData.date = new Date().toUTCString();
    }
    console.log(combinedData);

    setIsLoading(true);
    try {
      const response = await postApi(
        `${window.siteUrl}/wp-json/wc/v3/coupons`,
        combinedData
      );

      postApi(`${window.siteUrl}/wp-json/whizmanage/v1/history`, {
        location: "coupons",
        items: [response.data],
        action: "add"
      });


      const newCouponData = response.data;
      setData([newCouponData, ...data]);
      fetchData(true);
      toast(
        <div className="p-4 w-full h-full !border-l-4 !border-l-fuchsia-600 dark:bg-slate-800 dark:text-slate-300 rounded-md flex gap-4 items-center justify-start">
          <CheckCircle className="w-5 h-5 text-fuchsia-600" />
          {__("A new coupon added", "whizmanage")}
        </div>,
        { duration: 5000 }
      );

      setIsLoading(false);

      if (onClose) {
        onClose();
        reset();
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

  const resetForms = () => {
    console.log("fd");
    reset({});
    setErrorMessage("");
    setFormStates({});
  };

  const isFormInvalid = Object.keys(errors).length > 0;
  const couponCode = watch("code");
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
        {__("Add coupon", "whizmanage")}
      </Button>
      <Modal
        size="5xl"
        scrollBehavior="inside"
        backdrop="opaque"
        className=" !overflow-hidden"
        classNames={{
          backdrop:
            "bg-gradient-to-t from-zinc-800 to-zinc-800/30 backdrop-opacity-20 !overflow-hidden",
        }}
        isDismissable={false}
        isOpen={isOpen}
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
                  {__("Create a new coupon", "whizmanage")}
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
                    <div className="flex flex-col gap-6 overflow-auto py-8">
                      <CouponDetails
                        register={register}
                        errors={errors}
                        setValue={setValue}
                        updateValue={updateValue}
                        watch={watch}
                      />
                      <UsageLimits
                        register={register}
                        updateValue={updateValue}
                      />
                    </div>
                    <div className="flex flex-col gap-6 overflow-auto py-8">
                      <AdvancedUsageRestrictions
                        updateValue={updateValue}
                        formStates={formStates}
                      />
                      <GeneralRestrictions
                        register={register}
                        errors={errors}
                        updateValue={updateValue}
                      />
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
                  <CustomTooltip title={__("Select status", "whizmanage")}>
                    <div>
                      <StatusVariationEdit updateValue={updateValue} />
                    </div>
                  </CustomTooltip>

                  <CustomTooltip title={__("Save coupon", "whizmanage")}>
                    <Button
                      disabled={isFormInvalid || isLoading || !couponCode}
                      color="primary"
                      onClick={() => {
                        handleSubmit((data) => onSubmit(data, onClose))();
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

export default AddCoupon;
