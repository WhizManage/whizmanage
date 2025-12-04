import { MultipleRowsToast } from "./MultipleRowsToolbar";
import { SingleRowToast } from "./SingleRowToolbar";

export const ToastContent = ({
  table,
  selectedRows,
  deleteCoupons,
  duplicateCoupons,
  setRowSelection,
  restoreCoupons,
  isTrash,
  dataProducts,
  setData,
  data,
}) => {
  return (
    <div>
      {selectedRows.length === 1 ? (
        <SingleRowToast
          table={table}
          selectedRows={selectedRows}
          deleteCoupons={deleteCoupons}
          duplicateCoupons={duplicateCoupons}
          restoreCoupons={restoreCoupons}
          isTrash={isTrash}
        />
      ) : (
        <MultipleRowsToast
          table={table}
          selectedRows={selectedRows}
          setSelectedRows={setRowSelection}
          setRowSelection={setRowSelection}
          deleteCoupons={deleteCoupons}
          restoreCoupons={restoreCoupons}
          duplicateCoupons={duplicateCoupons}
          isTrash={isTrash}
          dataProducts={dataProducts}
          setData={setData}
          data={data}
        />
      )}
    </div>
  );
};


