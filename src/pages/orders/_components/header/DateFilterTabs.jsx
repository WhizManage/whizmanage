import { Button } from "@components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/ui/popover";
import { DatePicker } from "@heroui/react";
import { endOfMonth, format, startOfMonth, subDays, subMonths } from "date-fns";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { __ } from '@wordpress/i18n';

// TabItem component for each individual tab
const TabItem = ({ active, label, onClick }) => {
   

  return (
    <button
      onClick={onClick}
      className={`relative px-2 py-1 text-sm font-medium transition-colors duration-200 ${
        active
          ? "text-fuchsia-600"
          : "text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-200"
      }`}
    >
      {__(label, "whizmanage")}
      {active && (
        <motion.div
          layoutId="activeTab"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-fuchsia-600"
          initial={false}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
    </button>
  );
};

const DateFilterTabs = ({ onDateRangeChange }) => {
   
  const [activeTab, setActiveTab] = useState("custom");
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const isInitialRender = useRef(true);
  const lastAppliedDates = useRef({ startDate: null, endDate: null });

  // HeroUI date object to standard Date object
  const heroUIDateToDate = (heroDate) => {
    if (!heroDate) return null;

    // Check if it's already a Date object
    if (heroDate instanceof Date && !isNaN(heroDate.getTime())) {
      return heroDate;
    }

    // Check if we're dealing with the special HeroUI date format
    // that has { year, month, day } properties
    if (
      heroDate &&
      typeof heroDate === "object" &&
      "year" in heroDate &&
      "month" in heroDate &&
      "day" in heroDate
    ) {
      // Convert to proper JS Date (note: JS months are 0-based, so subtract 1 from month)
      try {
        const jsDate = new Date(
          heroDate.year,
          heroDate.month - 1,
          heroDate.day
        );
        if (!isNaN(jsDate.getTime())) {
          return jsDate;
        }
      } catch (e) {
        console.error("Error converting HeroUI date format:", e);
      }
    }

    // Try standard date parsing for string dates
    if (typeof heroDate === "string") {
      try {
        const parsed = new Date(heroDate);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      } catch (e) {
        console.error("Failed to parse date string:", heroDate);
      }
    }

    console.warn(
      "Could not convert to valid date, returning current date:",
      heroDate
    );
    return new Date(); // Return current date as fallback
  };

  // Effect to handle initial tab selection (today)
  useEffect(() => {
    // Only run on initial mount
    if (isInitialRender.current) {
      isInitialRender.current = false;

      handleDateSelection(null, null);
    }
  }, []);

  // Function to determine if this is a new date range
  const isNewDateRange = (startDate, endDate) => {
    const last = lastAppliedDates.current;

    // No previous dates set
    if (!last.startDate || !last.endDate) return true;

    // Convert to strings for comparison
    const startStr = startDate.toISOString();
    const endStr = endDate.toISOString();
    const lastStartStr = last.startDate.toISOString();
    const lastEndStr = last.endDate.toISOString();

    // Different start or end date
    if (startStr !== lastStartStr || endStr !== lastEndStr) {
      return true;
    }

    return false;
  };

  // Function to safely apply date range changes
  const handleDateSelection = (startDate, endDate) => {
    if (!startDate || !endDate) return;

    // Convert to proper Date objects
    const startDateObj = heroUIDateToDate(startDate);
    const endDateObj = heroUIDateToDate(endDate);

    // Only call onDateRangeChange if this is a new date range
    if (isNewDateRange(startDateObj, endDateObj)) {
      // Update the last applied dates
      lastAppliedDates.current = {
        startDate: startDateObj,
        endDate: endDateObj,
      };

      // Call the callback with the new dates
      try {
        onDateRangeChange(startDateObj, endDateObj);
      } catch (error) {
        console.error("Error in onDateRangeChange:", error);
      }
    }
  };

  const handleTabChange = (tab) => {
    // Skip if already on this tab
    if (tab === activeTab) return;

    setActiveTab(tab);

    const today = new Date();
    let startDate = null;
    let endDate = null;

    switch (tab) {
      case "today":
        startDate = today;
        endDate = today;
        handleDateSelection(startDate, endDate);
        break;
      case "yesterday":
        startDate = subDays(today, 1);
        endDate = subDays(today, 1);
        handleDateSelection(startDate, endDate);
        break;
      case "thisMonth":
        startDate = startOfMonth(today);
        endDate = endOfMonth(today);
        handleDateSelection(startDate, endDate);
        break;
      case "lastMonth":
        const lastMonth = subMonths(today, 1);
        startDate = startOfMonth(lastMonth);
        endDate = endOfMonth(lastMonth);
        handleDateSelection(startDate, endDate);
        break;
      case "custom":
        // Just open the popover for custom, dates will be applied later
        setPopoverOpen(true);
        break;
      default:
        break;
    }
  };

  const applyCustomRange = () => {
    if (customStartDate && customEndDate) {
      handleDateSelection(customStartDate, customEndDate);
      setPopoverOpen(false);
    }
  };

  const handleStartDateChange = (newDate) => {
    setCustomStartDate(newDate);
  };

  const handleEndDateChange = (newDate) => {
    setCustomEndDate(newDate);
  };

  const formatDateDisplay = (date) => {
    if (!date) return "";

    try {
      // Convert to standard Date
      const dateObj = heroUIDateToDate(date);
      return format(dateObj, "dd/MM/yyyy");
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  };

  return (
    <div className="relative overflow-hidden px-2">
      <div className="flex space-x-1 rtl:space-x-reverse overflow-x-auto overflow-y-hidden scrollbar-none pt-1">
        <TabItem
          active={activeTab === "today"}
          label="Today"
          onClick={() => handleTabChange("today")}
        />
        <TabItem
          active={activeTab === "yesterday"}
          label="Yesterday"
          onClick={() => handleTabChange("yesterday")}
        />
        <TabItem
          active={activeTab === "thisMonth"}
          label="This Month"
          onClick={() => handleTabChange("thisMonth")}
        />
        <TabItem
          active={activeTab === "lastMonth"}
          label="Last Month"
          onClick={() => handleTabChange("lastMonth")}
        />

        <Popover open={popoverOpen} onOpenChange={setPopoverOpen} modal={false}>
          <PopoverTrigger asChild>
            <div>
              <TabItem
                active={activeTab === "custom"}
                label="Custom Range"
                onClick={() => handleTabChange("custom")}
              />
            </div>
          </PopoverTrigger>
          <PopoverContent
            className="p-2 sm:w-[444px] z-50"
            align="end"
            sideOffset={10}
            alignOffset={-4}
            avoidCollisions={true}
            side="bottom"
          >
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <DatePicker
                  label={__("Start Date", "whizmanage")}
                  value={customStartDate}
                  onChange={handleStartDateChange}
                  placeholder={__("Select start date", "whizmanage")}
                  classNames={{
                    base: "rounded-md dark:!bg-slate-800 dark:!text-slate-300",
                    inputWrapper:
                      "rounded-md !h-14 !max-h-14 border dark:!border-slate-800 bg-white dark:!bg-slate-700 dark:!text-slate-300",
                    timeInput:
                      "rounded-md dark:!bg-slate-800 dark:!text-slate-300",
                    selectorButton:
                      "rounded-md dark:!bg-slate-700 dark:!text-slate-400",
                  }}
                />

                <DatePicker
                  label={__("End Date", "whizmanage")}
                  value={customEndDate}
                  onChange={handleEndDateChange}
                  placeholder={__("Select end date", "whizmanage")}
                  classNames={{
                    base: "rounded-md dark:!bg-slate-800 dark:!text-slate-300",
                    inputWrapper:
                      "rounded-md !h-14 !max-h-14 border dark:!border-slate-800 bg-white dark:!bg-slate-700 dark:!text-slate-300",
                    timeInput:
                      "rounded-md dark:!bg-slate-800 dark:!text-slate-300",
                    selectorButton:
                      "rounded-md dark:!bg-slate-700 dark:!text-slate-400",
                  }}
                />
              </div>

              {customStartDate && customEndDate && (
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">
                    {formatDateDisplay(customStartDate)} -{" "}
                    {formatDateDisplay(customEndDate)}
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPopoverOpen(false)}
                >
                  {__("Cancel", "whizmanage")}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={applyCustomRange}
                  disabled={!customStartDate || !customEndDate}
                >
                  {__("Apply", "whizmanage")}
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default DateFilterTabs;
