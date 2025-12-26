// src/components/table/components/CategoryTagsEdit.jsx
import MultiSelectEdit from "@components/table/components/MultiSelectEdit";

const CategoryTagsEdit = ({
  value,
  onChange,
  onFinish,
  editOptions,
  row,
  column,
}) => {
  return (
    <div className="relative w-full min-w-[160px]">
      <MultiSelectEdit
        row={{ original: { ...row.original, [column.id]: value || [] } }}
        columnName={column.id}
        label={editOptions?.label || column.columnDef?.header}
        onClose={onFinish}
        onValueChange={onChange}
        // דואגים שתמיד יהיה taxonomyType כדי שמקור הנתונים יהיה חד-משמעי
        editOptions={{ ...editOptions, taxonomyType: editOptions?.taxonomyType || column.id }}
      />
    </div>
  );
};

export default CategoryTagsEdit;