import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Label } from "@components/ui/label";
import { Switch } from "@components/ui/switch";
import { Spinner } from "@heroui/react";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { __ } from '@wordpress/i18n';

export const columnFilterFn = (row, columnId, filterValue) => {
  // לא לסנן תתי שורות
  if (row.depth > 0) {
    return true;
  }
  if (!filterValue || filterValue.length === 0) return true;

  const keyPath = "name";
  let rowValue = row.getValue(columnId);

  if (columnId === "downloadable") {
    rowValue = rowValue === true ? "downloadable" : "undownloadable";
  } else if (typeof rowValue === "boolean") {
    rowValue = rowValue.toString();
  }

  // בדיקה עבור סינון "ללא ערך"
  if (Array.isArray(filterValue) && filterValue.includes("[None]")) {
    // בדיקה אם הערך בשורה הוא 'ריק' לפי ההגדרות הרחבות
    const isValueEmpty = checkIfValueIsEmpty(rowValue, keyPath);
    if (filterValue.length > 1) {
      // אם ישנם עוד ערכים לסינון בנוסף ל"[None]"
      const otherValues = filterValue.filter((v) => v !== "[None]");
      return isValueEmpty || checkOtherValues(rowValue, otherValues, keyPath);
    } else {
      return isValueEmpty;
    }
  }

  // טיפול בסינון של שאר הערכים
  return checkOtherValues(rowValue, filterValue, keyPath);
};

// פונקציה לבדיקה אם ערך 'ריק'
function checkIfValueIsEmpty(value, keyPath) {
  if (Array.isArray(value)) {
    return (
      value.length === 0 ||
      value.every((item) => checkIfValueIsEmpty(item, keyPath))
    );
  } else if (typeof value === "object" && value !== null) {
    return !(keyPath in value) || checkIfValueIsEmpty(value[keyPath], keyPath);
  }
  return value === null || value === undefined || value === "";
}

// פונקציה עזר לבדוק את שאר הערכים
function checkOtherValues(rowValue, filterValue, keyPath) {
  if (Array.isArray(rowValue)) {
    return rowValue.some((item) => {
      if (typeof item === "object" && item !== null && keyPath in item) {
        return (
          Array.isArray(filterValue) &&
          filterValue.includes(String(item[keyPath]))
        );
      }
      return filterValue.includes(String(item));
    });
  } else if (
    rowValue &&
    typeof rowValue === "object" &&
    rowValue !== null &&
    keyPath in rowValue
  ) {
    return filterValue.includes(String(rowValue[keyPath]));
  }

  return Array.isArray(filterValue) && filterValue.includes(String(rowValue));
}

const ColumnFilter = ({
  setColumnFilters,
  length,
  data,
  label,
  column,
  defaultValues,
  keyPath = "name",
}) => {
  const [filterValue, setFilterValue] = useState(defaultValues || []);
  const [uniqueValues, setUniqueValues] = useState([]);
  const [valueCounts, setValueCounts] = useState({});
  const [isFilterActive, setIsFilterActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const isRTL = document.documentElement.dir === 'rtl';

  // פונקציה משופרת לקבלת ערכים ייחודיים
  const getAllUniqueValues = (data, columnName, keyPath) => {
    const uniqueValues = new Set();

    data.forEach((row) => {
      const item = row[columnName];

      if (columnName === "downloadable" && typeof item === "boolean") {
        uniqueValues.add(item ? "downloadable" : "undownloadable");
      } else if (typeof item === "boolean") {
        uniqueValues.add(String(item));
      }
      // טיפול בערך מחרוזת
      else if (typeof item === "string") {
        uniqueValues.add(item);
      }
      // טיפול במערך
      else if (Array.isArray(item)) {
        item.forEach((innerItem) => {
          if (
            typeof innerItem === "object" &&
            innerItem !== null &&
            keyPath in innerItem
          ) {
            uniqueValues.add(innerItem[keyPath]);
          } else if (typeof innerItem === "boolean") {
            uniqueValues.add(String(innerItem));
          } else {
            uniqueValues.add(String(innerItem));
          }
        });
      }
      // טיפול באובייקט
      else if (item && typeof item === "object" && keyPath in item) {
        uniqueValues.add(item[keyPath]);
      }
      // טיפול בערכים נוספים (גם null/undefined)
      else if (item !== undefined) {
        uniqueValues.add(String(item));
      }
    });

    const result = Array.from(uniqueValues);
    return result;
  };

  // פונקציה משופרת לספירת ערכים
  const getValueCounts = (data, columnName, keyPath) => {
    return data.reduce((acc, row) => {
      const item = row[columnName];

      // Inside getValueCounts
      if (columnName === "downloadable" && typeof item === "boolean") {
        const value = item ? "downloadable" : "undownloadable";
        acc[value] = (acc[value] || 0) + 1;
      } else if (typeof item === "boolean") {
        const value = String(item);
        acc[value] = (acc[value] || 0) + 1;
      }
      // טיפול בערך מחרוזת
      else if (typeof item === "string") {
        acc[item] = (acc[item] || 0) + 1;
      }
      // טיפול במערך
      else if (Array.isArray(item)) {
        item.forEach((innerItem) => {
          let value;
          if (
            typeof innerItem === "object" &&
            innerItem !== null &&
            keyPath in innerItem
          ) {
            value = innerItem[keyPath];
          } else {
            value = String(innerItem);
          }
          acc[value] = (acc[value] || 0) + 1;
        });
      }
      // טיפול באובייקט
      else if (item && typeof item === "object" && keyPath in item) {
        const value = item[keyPath];
        acc[value] = (acc[value] || 0) + 1;
      }
      // טיפול בערכים ריקים
      else if (item === null || item === undefined || item === "") {
        const noneValue = "[None]";
        acc[noneValue] = (acc[noneValue] || 0) + 1;
      }

      return acc;
    }, {});
  };

  // עדכון ספירת הערכים כאשר הנתונים משתנים
  useEffect(() => {
    const counts = getValueCounts(data, column, keyPath);
    setValueCounts(counts);
  }, [data, column, keyPath]);

  // עדכון סטטוס הפילטר הפעיל
  useEffect(() => {
    if (filterValue && filterValue.length > 0 && filterValue[0] !== "") {
      setIsFilterActive(true);
    } else {
      setIsFilterActive(false);
    }
  }, [filterValue]);

  // איפוס ערכי הפילטר אם יש ברירת מחדל ריקה
  useEffect(() => {
    if (
      defaultValues &&
      defaultValues.length === 1 &&
      defaultValues[0] === ""
    ) {
      setFilterValue([]);
      setIsFilterActive(false);
    } else if (defaultValues && defaultValues.length > 0) {
      setIsFilterActive(true);
    }
  }, [defaultValues]);

  // קביעת הערכים הייחודיים
  useEffect(() => {
    setIsLoading(true);
    try {
      const uniqueValues = getAllUniqueValues(data, column, keyPath);
      setUniqueValues(uniqueValues);
    } catch (error) {
      console.error(`Error getting unique values for ${column}:`, error);
      setUniqueValues([]);
    } finally {
      setIsLoading(false);
    }
  }, [data, column, keyPath]);

  // עדכון פילטרים של העמודה
  useEffect(() => {
    if (column) {
      setColumnFilters((old) => [
        ...old.filter((filter) => filter.id !== column),
        { id: column, value: filterValue },
      ]);
    }
  }, [filterValue, setColumnFilters, column]);

  // מטפל בשינוי ערך הפילטר
  const handleFilterChange = (valueOption, isChecked) => {
    setFilterValue((currentFilterValue) =>
      isChecked
        ? [...currentFilterValue, valueOption]
        : currentFilterValue.filter((value) => value !== valueOption)
    );
  };

  // מטפל בשינוי מצב הפילטר (פעיל/לא פעיל)
  const handleFilterToggle = () => {
    if (isFilterActive) {
      setFilterValue([]);
    } else {
      setFilterValue(uniqueValues);
    }
  };

  return (
    <div className="">
      <DropdownMenu className="">
        <DropdownMenuTrigger asChild>
          <Button
            className={cn(
              isFilterActive
                ? "bg-fuchsia-50 hover:bg-fuchsia-100 border-fuchsia-600 dark:text-slate-200"
                : "border-slate-400 dark:border-slate-600 text-muted-foreground dark:text-slate-400",
              length > 10 ? "h-4" : "h-8",
              "border-dashed capitalize px-2"
            )}
            variant="outline"
          >
            <ChevronDown className="mr-2 rtl:ml-2 rtl:mr-0 h-4 w-4 select-none" />
            {__(label, "whizmanage")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="max-h-[222px] overflow-y-auto"
        >
          <DropdownMenuLabel className="flex items-center justify-between">
            <Label
              htmlFor={`filter-toggle-${column}`}
              className="flex-1 h-full"
            >
              {__("Enable", "whizmanage")}
            </Label>
            <Switch
              dir={isRTL ? "rtl" : "ltr"}
              className=""
              id={`filter-toggle-${column}`}
              checked={isFilterActive}
              onCheckedChange={handleFilterToggle}
            />
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {isLoading ? (
            <div className="w-full flex justify-center items-center py-4">
              <Spinner />
            </div>
          ) : uniqueValues.length > 0 ? (
            uniqueValues.map((valueOption) => (
              <DropdownMenuCheckboxItem
                key={valueOption}
                className="text-end hover:!bg-fuchsia-600 capitalize hover:!text-white group transition-colors"
                checked={
                  Array.isArray(filterValue) &&
                  filterValue.includes(valueOption)
                }
                onCheckedChange={(isChecked) =>
                  handleFilterChange(valueOption, isChecked)
                }
              >
                <p className="flex gap-1">
                  <span className="text-slate-400 group-hover:text-fuchsia-200">
                    ({valueCounts[valueOption] || 0})
                  </span>
                  <span>{__(valueOption, "whizmanage")}</span>
                </p>
              </DropdownMenuCheckboxItem>
            ))
          ) : (
            <div className="py-2 px-4 text-center text-muted-foreground">
              {__("No options available", "whizmanage")}
            </div>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            key="no-value"
            className="text-end hover:bg-fuchsia-600 capitalize hover:text-white transition-colors"
            checked={
              Array.isArray(filterValue) && filterValue.includes("[None]")
            }
            onCheckedChange={(isChecked) =>
              handleFilterChange("[None]", isChecked)
            }
          >
            <p>{__("No Value", "whizmanage")}</p>
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default ColumnFilter;
