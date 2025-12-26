// src/components/table/filters/ColumnFilter.jsx
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
import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
 import { __ } from "@wordpress/i18n";

import useCoreTaxonomiesStore from "../store/useCoreTaxonomiesStore";
import useCustomTaxonomiesStore from "../store/useCustomTaxonomiesStore";

// ---------- utilities ----------
export const columnFilterFn = (row, columnId, filterValue) => {
  if (row.depth > 0) return true;
  if (!filterValue || filterValue.length === 0) return true;

  const keyPath = "name";
  let rowValue = row.getValue(columnId);

  if (columnId === "downloadable") {
    rowValue = rowValue === true ? "downloadable" : "undownloadable";
  } else if (typeof rowValue === "boolean") {
    rowValue = rowValue.toString();
  }

  if (Array.isArray(filterValue) && filterValue.includes("[None]")) {
    const isEmpty = checkIfValueIsEmpty(rowValue, keyPath);
    if (filterValue.length > 1) {
      const others = filterValue.filter((v) => v !== "[None]");
      return isEmpty || checkOtherValues(rowValue, others, keyPath);
    }
    return isEmpty;
  }

  return checkOtherValues(rowValue, filterValue, keyPath);
};

function checkIfValueIsEmpty(value, keyPath) {
  if (Array.isArray(value)) {
    return value.length === 0 || value.every((item) => checkIfValueIsEmpty(item, keyPath));
  } else if (typeof value === "object" && value !== null) {
    return !(keyPath in value) || checkIfValueIsEmpty(value[keyPath], keyPath);
  }
  return value === null || value === undefined || value === "";
}

function checkOtherValues(rowValue, filterValue, keyPath) {
  if (Array.isArray(rowValue)) {
    return rowValue.some((item) => {
      if (typeof item === "object" && item !== null && keyPath in item) {
        return filterValue.includes(String(item[keyPath]));
      }
      return filterValue.includes(String(item));
    });
  } else if (rowValue && typeof rowValue === "object" && keyPath in rowValue) {
    return filterValue.includes(String(rowValue[keyPath]));
  }

  return filterValue.includes(String(rowValue));
}

function getAllUniqueValues(data, columnName, keyPath) {
  const uniq = new Set();
  if (!data) return [];

  data.forEach((row) => {
    const item = row[columnName];

    if (columnName === "downloadable" && typeof item === "boolean") {
      uniq.add(item ? "downloadable" : "undownloadable");
    } else if (typeof item === "boolean") {
      uniq.add(String(item));
    } else if (typeof item === "string") {
      uniq.add(item);
    } else if (Array.isArray(item)) {
      item.forEach((x) => {
        if (typeof x === "object" && x !== null && keyPath in x) uniq.add(x[keyPath]);
        else uniq.add(String(x));
      });
    } else if (item && typeof item === "object" && keyPath in item) {
      uniq.add(item[keyPath]);
    } else if (item !== undefined) {
      uniq.add(String(item));
    }
  });

  return [...uniq];
}

function normalizeOption(opt, t) {
  if (opt == null) return null;

  if (typeof opt === "object" && !Array.isArray(opt)) {
    const label = opt.label ?? opt.name ?? String(opt.value ?? opt.id ?? "");
    const raw = opt.value ?? opt.id ?? label;
    return { label: __(String(label), "whizmanage"), value: String(raw) };
  }

  const val = String(opt);
  return { label: __(val, "whizmanage"), value: val };
}

// ---------- COMPONENT ----------
const ColumnFilter = ({
  setColumnFilters,
  columnFilters,
  length,
  label,
  column,
  defaultValues,
  options,
  data,
  keyPath = "name",
  isCoreTaxonomy = false,
}) => {
  const [filterValue, setFilterValue] = useState(defaultValues || []);
  const [uniqueValues, setUniqueValues] = useState([]);
  const [isFilterActive, setIsFilterActive] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isLocalLoading, setIsLocalLoading] = useState(true);

   
  const isRTL = window?.document?.documentElement?.dir === "rtl";

 

  // Sync with external columnFilters (e.g., when reset is triggered)
  useEffect(() => {
    if (!columnFilters) return;

    const externalFilter = columnFilters.find((f) => f.id === column);
    const externalValue = externalFilter?.value || [];

    // If external filter was cleared but local state still has values, reset local state
    if (externalValue.length === 0 && filterValue.length > 0) {
      setFilterValue([]);
    }
  }, [columnFilters, column]);
  // CORE STORE
  const { categories, tags, isLoaded, isLoading, loadTaxonomiesOnce } =
    useCoreTaxonomiesStore();

  // CUSTOM STORE
  const customStore = useCustomTaxonomiesStore();

  // ----------- detect the REAL taxonomy name -----------
  const customTaxonomies = Array.isArray(window.listTaxonomies)
    ? window.listTaxonomies
    : [];

  const taxonomyDef = customTaxonomies.find(
    (t) =>
      t.name === column ||
      t.slug === column ||
      t.rest_base === column ||
      t.name === column?.replace(/s$/, "") // handle brand → brands
  );

  const taxonomyName = taxonomyDef?.name ?? column;

  const isCustomTaxonomy = !isCoreTaxonomy && taxonomyDef;

  // update active state
  useEffect(() => {
    setIsFilterActive(!!filterValue?.length);
  }, [filterValue]);

  // CORE lazy load
  useEffect(() => {
    if (isOpen && isCoreTaxonomy && !isLoaded && !isLoading) {
      loadTaxonomiesOnce();
    }
  }, [isOpen, isCoreTaxonomy, isLoaded, isLoading, loadTaxonomiesOnce]);

  // CUSTOM lazy load
  useEffect(() => {
    if (isOpen && isCustomTaxonomy) {
      customStore.ensure(taxonomyName);
    }
  }, [isOpen, isCustomTaxonomy, taxonomyName, customStore]);

  // CORE options
  const coreOptions = useMemo(() => {
    if (!isCoreTaxonomy) return [];
    const list = column === "categories" ? categories : tags;

    return (Array.isArray(list) ? list : [])
      .map((x) =>
        normalizeOption(
          {
            label: x.name ?? x.slug ?? x.id,
            value: String(x.id ?? x.slug ?? x.name),
          },
          __
        )
      )
      .filter(Boolean);
  }, [isCoreTaxonomy, column, categories, tags, __]);

  // CUSTOM options
  const customOptions = useMemo(() => {
    if (!isCustomTaxonomy) return [];

    const terms = customStore.select(taxonomyName) || [];

    return terms
      .map((term) =>
        normalizeOption(
          {
            label: term.name ?? term.slug ?? term.id,
            value: String(term.id ?? term.slug ?? term.name),
          },
          __
        )
      )
      .filter(Boolean);
  }, [isCustomTaxonomy, taxonomyName, customStore, __]);

  // set unique values
  useEffect(() => {
    if (isCoreTaxonomy) {
      setUniqueValues(coreOptions);
      return;
    }

    if (isCustomTaxonomy) {
      setUniqueValues(customOptions);
      return;
    }

    // non-taxonomy
    setIsLocalLoading(true);
    try {
      let final = [];
      if (options?.length) {
        final = options.map((o) => normalizeOption(o, __)).filter(Boolean);
      } else if (data) {
        final = getAllUniqueValues(data, column, keyPath)
          .map((o) => normalizeOption(o, __))
          .filter(Boolean);
      }
      setUniqueValues(final);
    } catch (err) {
      console.error("Error building unique values:", err);
      setUniqueValues([]);
    } finally {
      setIsLocalLoading(false);
    }
  }, [
    isCoreTaxonomy,
    isCustomTaxonomy,
    coreOptions,
    customOptions,
    options,
    data,
    column,
    keyPath,
    __
  ]);

  // push to setColumnFilters
  useEffect(() => {
    if (column) {
      setColumnFilters((old = []) => [
        ...old.filter((f) => f.id !== column),
        { id: column, value: filterValue },
      ]);
    }
  }, [filterValue, setColumnFilters, column]);

  const handleFilterChange = (value, checked) => {
    setFilterValue((cur) =>
      checked ? [...cur, value] : cur.filter((v) => v !== value)
    );
  };

  const handleFilterToggle = () => {
    if (isFilterActive) setFilterValue([]);
    else setFilterValue(uniqueValues.map((o) => o.value));
  };

  const isBusy =
    isCoreTaxonomy
      ? isLoading && isOpen
      : isCustomTaxonomy
      ? customStore.isLoading(taxonomyName)
      : isLocalLoading;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          className={cn(
            isFilterActive
              ? "bg-fuchsia-50 hover:bg-fuchsia-100 border-fuchsia-600"
              : "border-slate-300 dark:border-slate-600 text-muted-foreground text-xs font-normal",
            "border-dashed capitalize px-1.5 gap-0 h-6 !ring-0 !outline-none focus:!ring-0 focus-visible:!ring-0"
          )}
          variant="outline"
        >
          <ChevronDown className="mr-1 rtl:ml-1 rtl:mr-0 size-3" />
          {__(label, "whizmanage")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[222px] overflow-y-auto scrollbar-whiz">
        <DropdownMenuLabel className="flex items-center justify-between">
          <Label>{__("Enable", "whizmanage")}</Label>
          <Switch
            dir={isRTL ? "rtl" : "ltr"}
            checked={isFilterActive}
            onCheckedChange={handleFilterToggle}
          />
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {isBusy ? (
          <div className="w-full flex justify-center py-4">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-fuchsia-600"></div>
          </div>
        ) : uniqueValues?.length > 0 ? (
          uniqueValues.map((opt) => (
            <DropdownMenuCheckboxItem
              key={opt.value}
              className="text-end hover:bg-fuchsia-600 hover:text-white capitalize"
              checked={filterValue.includes(opt.value)}
              onCheckedChange={(checked) =>
                handleFilterChange(opt.value, checked)
              }
            >
              {opt.label}
            </DropdownMenuCheckboxItem>
          ))
        ) : (
          <div className="py-2 px-4 text-center text-muted-foreground">
            {__("No options found", "whizmanage")}
          </div>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuCheckboxItem
          key="no-value"
          className="text-end hover:bg-fuchsia-600 hover:text-white capitalize"
          checked={filterValue.includes("[None]")}
          onCheckedChange={(checked) =>
            handleFilterChange("[None]", checked)
          }
        >
          {__("No Value", "whizmanage")}
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ColumnFilter;
