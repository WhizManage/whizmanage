import { MultipleRowsToast } from "./MultipleRowsToolbar";
import { SingleRowToast } from "./SingleRowToolbar";

export const ToastContent = ({
  table,
  selectedRows,
  deleteOrders,
  duplicateOrders,
  setRowSelection,
  restoreOrders,
  isTrash,
  ordersData,
  setData
}) => {
  return (
    <div>
      {selectedRows.length === 1 ? (
        <SingleRowToast
          table={table}
          selectedRows={selectedRows}
          deleteOrders={deleteOrders}
          duplicateOrders={duplicateOrders}
          restoreOrders={restoreOrders}
          isTrash={isTrash}
        />
      ) : (
        <MultipleRowsToast
        table={table}
        selectedRows={selectedRows}
        setSelectedRows={setRowSelection}
        setRowSelection={setRowSelection}
        deleteOrders={deleteOrders}
        restoreOrders={restoreOrders}
        duplicateOrders={duplicateOrders}
        isTrash={isTrash} 
        ordersData={ordersData}
        setData={setData}
        />
      )}
    </div>
  );
};


