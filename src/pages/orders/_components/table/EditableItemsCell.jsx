import {
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  useDisclosure,
} from "@heroui/react";
import { useEffect, useState } from "react";
import Button from "@components/ui/button";
import { getApi } from "../../../../services/services";
import { __ } from '@wordpress/i18n';
import OrderLineItems from "../header/add/order/OrderLineItems";
import { ShoppingCart, Package } from "lucide-react";
import { useOrdersContext } from "@/context/OrdersContext";

export default function EditableItemsCell({ row }) {
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();

  const [isLoading, setIsLoading] = useState(true);
  const { products } = useOrdersContext();

   
  const [formStates, setFormStates] = useState({});

  const updateValue = (field, value) => {
    setFormStates((prevState) => ({ ...prevState, [field]: value }));
  };

  // if (
  //   row.original.status === "completed" ||
  //   row.original.status === "processing" ||
  //   row.original.status === "refunded"
  // ) {
  //   return (
  //     <div className="flex items-center gap-2 text-muted-foreground">
  //       <span className="text-sm">
  //         {row.original.line_items?.length || 0} items
  //       </span>
  //     </div>
  //   );
  // }

  const itemsCount = row.original.line_items?.length || 0;

  const handleSave = async () => {
    try {
      const currentLineItems = formStates["line_items"] || [];

      const allUpdatedLineItems = [];

      currentLineItems?.forEach((item) => {
        // פריט קיים - שלח ID + quantity
        if (item.id && item.id < 1000000) {
          allUpdatedLineItems.push({
            id: item.id,
            quantity: item.quantity,
            price: item.price,
          });
        } else {
          // פריט חדש - שלח product_id + quantity
          allUpdatedLineItems.push({
            product_id: item.product_id,
            quantity: item.quantity,
            price: item.price,
          });
        }
      });

      // מצא פריטים שהוסרו (פריטים שהיו במקור אבל לא קיימים עכשיו)
      const originalItems = row.original.line_items || [];
      const currentItemIds = currentLineItems.map((item) => item.id);

      originalItems?.forEach((originalItem) => {
        if (originalItem.id && !currentItemIds.includes(originalItem.id)) {
          // פריט שהוסר - שלח עם quantity: 0 כדי למחוק אותו
          allUpdatedLineItems.push({
            id: originalItem.id,
            quantity: 0,
          });
        }
      });

      row.original.line_items = allUpdatedLineItems;
      row.original.total = formStates["total"];
      row.original.coupons_data = formStates["coupons_data"];
      console.log(row.original);

      onClose();
    } catch (error) {
      console.error("Error updating order:", error);
    }
  };

  return (
    <>
      <Button
        variant="flat"
        size="sm"
        onClick={onOpen}
        className="w-full flex items-center gap-2 border"
        isLoading={isLoading}
      >
        <ShoppingCart className="w-4 h-4" />
        <span>
          {__("Edit Items", "whizmanage")} ({itemsCount})
        </span>
      </Button>
      <Modal
        size="5xl"
        scrollBehavior="inside"
        backdrop="opaque"
        className="!scrollbar-hide scrollbar-none"
        isDismissable={false}
        isOpen={isOpen}
        isDismissable={false}
        onOpenChange={onOpenChange}
      >
        <ModalContent className="dark:bg-gray-900">
          <ModalHeader>
            <h2 className="text-2xl text-fuchsia-600">
              {__("Edit Order Items", "whizmanage")} - #{row.original.id}
            </h2>
          </ModalHeader>
          <ModalBody className="pb-6">
            <OrderLineItems
              updateValue={updateValue}
              products={products}
              line_items={row.original.line_items}
              row={row}
              coupons_data={row?.original?.coupons_data}
              email={row?.original?.billing?.email}
            />
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
              <Button variant="light" onClick={onClose}>
                {__("Cancel", "whizmanage")}
              </Button>
              <Button color="primary" onClick={handleSave}>
                {__("Save Changes", "whizmanage")}
              </Button>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
