// src/components/table/filters/StatusBarFilter.jsx
import ColumnFilter from "./ColumnFilter";
import DateFilterTabs from "./DateFilterTabs";

function StatusBarFilter({
  enableFilters = [],
  setColumnFilters,
  columnFilters = [],
  data,
  showDateFilter = false,
}) {
  const trueCount = Array.isArray(enableFilters)
    ? enableFilters.filter((item) => item?.enable === true).length
    : 0;

  // ⬅️ אין טעינה כאן - נעביר את זה ל-ColumnFilter עצמו

  // מקבלים Date objects וממירים ל-yyyy-MM-dd
  const applyDateRange = (startDate, endDate) => {
    if (!startDate || !endDate) return;
    const formatDate = (date) => {
      const d = date instanceof Date ? date : new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    setColumnFilters((prev = []) => {
      const withoutDates = prev.filter(
        (f) => f.id !== "date_from" && f.id !== "date_to"
      );
      return [
        ...withoutDates,
        { id: "date_from", value: formatDate(startDate) },
        { id: "date_to", value: formatDate(endDate) },
      ];
    });
  };

  return (
    <div className="">
      <div className="flex items-center justify-between gap-2 overflow-visible">
        <div className="flex items-center gap-2 overflow-x-auto overflow-y-visible scrollbar-whiz">
          {Array.isArray(enableFilters) &&
            enableFilters.map((column) => {
              if (!column?.enable) return null;

              return (
                <ColumnFilter
                  key={column.column}
                  length={trueCount}
                  setColumnFilters={setColumnFilters}
                  columnFilters={columnFilters}
                  label={column.label}
                  column={column.column}
                  defaultValues={column.defaultValues}
                  options={column.options}
                  data={data}
                  // ⬅️ נעביר flag שזו טקסונומיה שצריכה טעינה lazy
                  isCoreTaxonomy={
                    column.column === "categories" ||
                    column.column === "tags"
                  }
                />
              );
            })}
        </div>

        {showDateFilter && (
          <div className="flex-shrink-0">
            <DateFilterTabs
              onDateRangeChange={applyDateRange}
              columnFilters={columnFilters}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default StatusBarFilter;