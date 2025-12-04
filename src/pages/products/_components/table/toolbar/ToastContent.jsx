// ToastContent.js
import { MultipleRowsToast } from "./MultipleRowsToolbar";
import { SingleRowToast } from "./SingleRowToolbar";
export const ToastContent = ({
  table,
  selectedRows,
  setSelectedRows,
  setRowSelection,
  deleteProducts,
  restoreProducts,
  duplicateProducts,
  fetchData,
  isTrash,
  isTableImport,
  setData
}) => {
  return (
    <div>
      {selectedRows.length === 1 ? (
        <SingleRowToast
        table={table}
        selectedRows={selectedRows}
        deleteProducts={deleteProducts}
        duplicateProducts={duplicateProducts}
        restoreProducts={restoreProducts}
        isTrash={isTrash}
        isTableImport={isTableImport}
        />
      ) : (
        <MultipleRowsToast
        table={table}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        setRowSelection={setRowSelection}
        deleteProducts={deleteProducts}
        restoreProducts={restoreProducts}
        duplicateProducts={duplicateProducts}
        fetchData={fetchData}
        isTrash={isTrash}
        isTableImport={isTableImport}
        setData={setData}
        />
      )}
    </div>
  );
};
