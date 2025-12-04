import { useOrdersContext } from "@/context/OrdersContext";
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
import { useRef, useState,useEffect } from "react";
import { useForm } from "react-hook-form";
import { __ } from '@wordpress/i18n';
import { MdError } from "react-icons/md";
import { toast } from "sonner";
import CustomerDetails from "./CustomerDetails";
import OrderDetails from "./OrderDetails";
import OrderLineItems from "./OrderLineItems";
import { postApi ,getApi} from "/src/services/services";
import CustomFieldsInput from "./CustomFieldInput";

const AddOrder = () => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [formStates, setFormStates] = useState({});
  const [resetKey, setResetKey] = useState(0);
  const { data, setData, products } = useOrdersContext();
   
  const formRef = useRef(null);
  // Fetch products if they don't exist in context

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

  const onSubmit = async (newData, onClose) => {
    setIsLoading(true);

    let combinedData = { ...newData, ...formStates };

    if (combinedData.line_items && combinedData.line_items.length > 0) {
      combinedData.line_items = combinedData.line_items.map((item) => {
        const qty = Number(item.quantity || 0);
        const unit = Number(item.price || 0); // מהטופס שלך
        const lineTotal = (qty * unit).toFixed(2); // "545.00" וכו'
        return {
          product_id: Number(item.product_id),
          quantity: qty,
          subtotal: lineTotal, // ✅ מותר
          total: lineTotal, // ✅ מותר
        };
      });

      // בתוך onSubmit, לפני ה-postApi:
      if (
        Array.isArray(combinedData.custom_fields) &&
        combinedData.custom_fields.length > 0
      ) {
        const meta = combinedData.custom_fields
          .filter((cf) => cf?.key && cf?.value)
          .map((cf) => ({ key: String(cf.key), value: cf.value })); // Woo: [{key, value}]

        combinedData.meta_data = Array.isArray(combinedData.meta_data)
          ? [...combinedData.meta_data, ...meta]
          : meta;

        delete combinedData.custom_fields; // לא שולחים שכבה מיותרת
      }
    }

    if (!combinedData.date_created_gmt) {
      const now = new Date();
      const localDate = new Date(
        now.getTime() - now.getTimezoneOffset() * 60000
      );
      combinedData.date_created_gmt = localDate.toISOString().slice(0, 19);
    }

    if (combinedData?.billing?.email === "") {
      combinedData.billing.email = null;
    }

    console.log(combinedData);

    try {
      // יצירת ההזמנה
      const response = await postApi(
        `${window.siteUrl}/wp-json/wc/v3/orders`,
        combinedData
      );

      const newOrderData = response.data;

      postApi(`${window.siteUrl}/wp-json/whizmanage/v1/history`, {
        location: "orders",
        items: [newOrderData],
        action: "add",
      });
      console.log(newOrderData);
      setData((prev) => [newOrderData, ...prev]);

      toast(
        <div className="p-4 w-full h-full !border-l-4 !border-l-fuchsia-600 dark:bg-slate-800 dark:text-slate-300 rounded-md flex gap-4 items-center justify-start">
          <CheckCircle className="w-5 h-5 text-fuchsia-600" />
          {__("A new order added", "whizmanage")}
        </div>,
        { duration: 5000 }
      );

      if (onClose) {
        onClose();
        reset();
        setFormStates({});
        setErrorMessage("");
        setResetKey((prev) => prev + 1);
      }
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error?.response?.data?.message ||
          error.message ||
          "Unknown error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const resetForms = () => {
    reset();
    setErrorMessage("");
    setFormStates({});
    setResetKey((prev) => prev + 1);
  };

  const isFormInvalid = Object.keys(errors).length > 0;

  const isFormEmpty =
    !formStates.line_items || formStates.line_items.length === 0;
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await getApi(`${window.siteUrl}/wp-json/wc/v3/customers`);
        setCustomers(res.data);
        console.log(res.data);
      } catch (err) {
        console.error("Error fetching customers", err);
      }
    };
    fetchCustomers();
  }, []);

  return (
    <>
      <Button
        className="flex group relative overflow-hidden gap-2"
        onClick={onOpen}
        variant="gradient"
      >
        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
        <Plus className="h-4 w-4" />
        {__("Add order", "whizmanage")}
      </Button>
      <Modal
        size="5xl"
        scrollBehavior="inside"
        backdrop="opaque"
       className="!scrollbar-hide scrollbar-none"
        classNames={{
          backdrop:
        "bg-gradient-to-t from-zinc-800 to-zinc-800/30 backdrop-opacity-20 !scrollbar-hide scrollbar-none",
          wrapper: "overflow-hidden",
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
                  {__("Create a new order", "whizmanage")}
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
                    <div className="flex flex-col gap-6 overflow-auto py-8 px-4">
                      <OrderDetails
                        key={`order-details-${resetKey}`}
                        updateValue={updateValue}
                      />
                      <CustomerDetails
                        key={`customer-details-${resetKey}`}
                        updateValue={updateValue}
                        customers={customers}
                      />
                    </div>
                    <div className="flex flex-col gap-6 overflow-auto py-8">
                      <OrderLineItems
                        key={`order-line-items-${resetKey}`}
                        products={products}
                        updateValue={updateValue}
                        email={formStates?.billing?.email || null}
                      />
                      <CustomFieldsInput
                        key={`custom-fields-${resetKey}`}
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
                  <CustomTooltip title={__("Save order", "whizmanage")}>
                    <Button
                      disabled={isFormInvalid || isLoading || isFormEmpty}
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

export default AddOrder;
