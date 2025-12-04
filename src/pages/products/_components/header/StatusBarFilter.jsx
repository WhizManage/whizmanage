import ColumnFilter from "./ColumnFilter";

function StatusBarFilter({ enableFilters, data, setColumnFilters }) {
  const trueCount = enableFilters.filter(item => item.enable === true).length;


  return (
    <div className="h-8 flex flex-col overflow-hidden">
      <div className="flex flex-1 items-center gap-2 overflow-x-auto overflow-y-hidden scrollbar-whiz ">
        {Array.isArray(enableFilters)
          ? enableFilters.map(
            (column) =>
              column.enable && (
                <ColumnFilter
                  length={trueCount}
                  setColumnFilters={setColumnFilters}
                  data={data}
                  label={column.label}
                  column={column.column}
                  defaultValues={column.defaultValues}
                />
              )
          )
          : console.log(enableFilters)}
      </div>
    </div>
  );
}

export default StatusBarFilter;
