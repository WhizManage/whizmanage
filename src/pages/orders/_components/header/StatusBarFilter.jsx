import ColumnFilter from "./ColumnFilter";

function StatusBarFilter({ enableFilters, data, setColumnFilters }) {
  return (
    <div className="h-8 flex flex-col overflow-hidden">
      <div className="flex flex-1 items-center gap-2">
        {Array.isArray(enableFilters)
          ? enableFilters.map(
              (column) =>
                column.enable && (
                  <ColumnFilter
                    setColumnFilters={setColumnFilters}
                    data={data}
                    column={column.column}
                    defaultValues={column.defaultValues}
                    label={column.label}
                  />
                )
            )
          : console.log(enableFilters)}
      </div>
    </div>
  );
}

export default StatusBarFilter;
