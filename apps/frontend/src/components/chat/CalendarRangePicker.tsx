import { useState, useRef, useEffect } from "react";

export type CalendarRange = {
  startDate: Date | null;
  endDate: Date | null;
  label: string;
  timeMin: string;
  timeMax: string;
};

interface CalendarRangePickerProps {
  selectedRange: CalendarRange;
  onRangeChange: (range: CalendarRange) => void;
  isLoading?: boolean;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const QUICK_PRESETS = [
  { label: "Today", days: 0 },
  { label: "This Week", days: 7 },
  { label: "Next 2 Weeks", days: 14 },
  { label: "This Month", days: 30 },
  { label: "Next 3 Months", days: 90 },
];

export default function CalendarRangePicker({
  selectedRange,
  onRangeChange,
  isLoading = false,
}: CalendarRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date | null>(null);
  const [tempEndDate, setTempEndDate] = useState<Date | null>(null);
  const [pendingRange, setPendingRange] = useState<CalendarRange | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setIsSelecting(false);
        setTempStartDate(null);
        setTempEndDate(null);
        setHoveredDate(null);
        setPendingRange(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Generate calendar days for current month
  const generateCalendarDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const currentDate = new Date(startDate);

    // Generate 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  };

  const formatDateForAPI = (date: Date) => {
    // Format as RFC3339 for Google Calendar API
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}T00:00:00Z`;
  };

  const formatDateForDisplay = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const isDateInRange = (date: Date, start: Date | null, end: Date | null) => {
    if (!start || !end) return false;
    return date >= start && date <= end;
  };

  const isDateSelected = (date: Date) => {
    const rangeToCheck = pendingRange || selectedRange;
    if (rangeToCheck.startDate && rangeToCheck.endDate) {
      return isDateInRange(date, rangeToCheck.startDate, rangeToCheck.endDate);
    }
    return false;
  };

  const isDateStart = (date: Date) => {
    const rangeToCheck = pendingRange || selectedRange;
    return (
      rangeToCheck.startDate &&
      date.toDateString() === rangeToCheck.startDate.toDateString()
    );
  };

  const isDateEnd = (date: Date) => {
    const rangeToCheck = pendingRange || selectedRange;
    return (
      rangeToCheck.endDate &&
      date.toDateString() === rangeToCheck.endDate.toDateString()
    );
  };

  const isDateInTempRange = (date: Date) => {
    if (!tempStartDate || !tempEndDate) return false;
    return isDateInRange(date, tempStartDate, tempEndDate);
  };

  const isDateHovered = (date: Date) => {
    if (!hoveredDate || !tempStartDate) return false;
    const start = tempStartDate < hoveredDate ? tempStartDate : hoveredDate;
    const end = tempStartDate < hoveredDate ? hoveredDate : tempStartDate;
    return isDateInRange(date, start, end);
  };

  const handleDateClick = (date: Date) => {
    if (!isSelecting) {
      // Start new selection
      setIsSelecting(true);
      setTempStartDate(date);
      setTempEndDate(null);
    } else {
      // Complete selection
      if (tempStartDate) {
        const start = tempStartDate < date ? tempStartDate : date;
        const end = tempStartDate < date ? date : tempStartDate;

        const range: CalendarRange = {
          startDate: start,
          endDate: end,
          label: `${formatDateForDisplay(start)} - ${formatDateForDisplay(end)}`,
          timeMin: formatDateForAPI(start),
          timeMax: formatDateForAPI(end),
        };

        console.log("Calendar range selected:", range);
        setPendingRange(range);
        setIsSelecting(false);
        setTempStartDate(null);
        setTempEndDate(null);
        setHoveredDate(null);
      }
    }
  };

  const handleDateHover = (date: Date) => {
    if (isSelecting && tempStartDate) {
      setHoveredDate(date);
    }
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth((prev) => {
      const newMonth = new Date(prev);
      if (direction === "prev") {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const clearSelection = () => {
    const range: CalendarRange = {
      startDate: null,
      endDate: null,
      label: "Select date range",
      timeMin: "",
      timeMax: "",
    };
    setPendingRange(range);
    setIsSelecting(false);
    setTempStartDate(null);
    setTempEndDate(null);
    setHoveredDate(null);
  };

  const applyPendingRange = () => {
    if (pendingRange) {
      onRangeChange(pendingRange);
      setIsOpen(false);
    }
  };

  const applyQuickPreset = (preset: { label: string; days: number }) => {
    const today = new Date();
    const startDate = new Date(today);
    const endDate = new Date(today);

    if (preset.days === 0) {
      // Today only
      endDate.setDate(today.getDate());
    } else {
      // Future range
      endDate.setDate(today.getDate() + preset.days);
    }

    const range: CalendarRange = {
      startDate,
      endDate,
      label: preset.label,
      timeMin: formatDateForAPI(startDate),
      timeMax: formatDateForAPI(endDate),
    };

    console.log("Quick preset selected:", range);
    setPendingRange(range);
  };

  const calendarDays = generateCalendarDays(currentMonth);
  const today = new Date();
  const isCurrentMonth =
    currentMonth.getMonth() === today.getMonth() &&
    currentMonth.getFullYear() === today.getFullYear();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex items-center space-x-2 rounded-lg border border-gray-200/60 bg-white/90 px-3 py-2 text-sm font-medium text-gray-700 transition-all duration-200 hover:border-gray-300/60 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700/60 dark:bg-gray-700/40 dark:text-gray-300 dark:hover:border-gray-600/60 dark:hover:bg-gray-700/60"
        title={selectedRange.label}
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span className="max-w-32 truncate text-xs sm:text-sm">
          {selectedRange.label}
        </span>
        <svg
          className={`h-4 w-4 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="calendar-dropdown absolute top-full right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl shadow-2xl sm:right-0">
          {/* Header */}
          <div className="border-b border-gray-200/60 p-4 dark:border-gray-700/60">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Select Date Range
              </h3>
              <button
                onClick={clearSelection}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-gray-700/60 dark:hover:text-gray-100"
              >
                Clear
              </button>
            </div>

            {/* Quick Presets */}
            <div className="mt-3">
              <div className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                Quick Select
              </div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => applyQuickPreset(preset)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 transition-all duration-200 hover:bg-gray-100 hover:text-gray-800 hover:shadow-sm dark:text-gray-300 dark:hover:bg-gray-700/60 dark:hover:text-gray-100"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Month Navigation */}
            <div className="mt-3 flex items-center justify-between">
              <button
                onClick={() => navigateMonth("prev")}
                className="rounded-lg p-2 text-gray-500 transition-all duration-200 hover:bg-gray-100 hover:text-gray-700 hover:shadow-sm dark:text-gray-300 dark:hover:bg-gray-700/60 dark:hover:text-gray-100"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              <div className="text-center">
                <div className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </div>
                {!isCurrentMonth && (
                  <button
                    onClick={goToToday}
                    className="text-xs text-purple-600 hover:text-purple-700 dark:text-purple-500 dark:hover:text-purple-400"
                  >
                    Go to today
                  </button>
                )}
              </div>

              <button
                onClick={() => navigateMonth("next")}
                className="rounded-lg p-2 text-gray-500 transition-all duration-200 hover:bg-gray-100 hover:text-gray-700 hover:shadow-sm dark:text-gray-300 dark:hover:bg-gray-700/60 dark:hover:text-gray-100"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="p-4" ref={calendarRef}>
            {/* Day Headers */}
            <div className="mb-2 grid grid-cols-7 gap-1">
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, index) => {
                const isCurrentMonth =
                  date.getMonth() === currentMonth.getMonth();
                const isToday = date.toDateString() === today.toDateString();
                const isSelected = isDateSelected(date);
                const isStart = isDateStart(date);
                const isEnd = isDateEnd(date);
                const isInTempRange = isDateInTempRange(date);
                const isHovered = isDateHovered(date);
                const isInRange = isSelected || isInTempRange || isHovered;

                return (
                  <button
                    key={index}
                    onClick={() => handleDateClick(date)}
                    onMouseEnter={() => handleDateHover(date)}
                    className={`relative h-8 w-8 rounded-lg text-sm transition-all duration-200 ${
                      !isCurrentMonth
                        ? "text-gray-300 dark:text-gray-600"
                        : "text-gray-700 dark:text-gray-300"
                    } ${
                      isToday
                        ? "bg-purple-100 font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                        : ""
                    } ${
                      isStart || isEnd
                        ? "bg-gradient-to-r from-purple-600 to-purple-700 font-semibold text-white shadow-sm hover:from-purple-700 hover:to-purple-800 dark:from-purple-700 dark:to-purple-800 dark:hover:from-purple-800 dark:hover:to-purple-900"
                        : ""
                    } ${
                      isInRange && !isStart && !isEnd
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                        : ""
                    } ${
                      !isInRange && !isToday && isCurrentMonth
                        ? "hover:bg-gray-100 hover:shadow-sm dark:hover:bg-gray-700/60"
                        : ""
                    } `}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            {/* Instructions */}
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isSelecting
                  ? "Click another date to complete selection"
                  : "Click a date to start selecting range"}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200/60 p-4 dark:border-gray-600/40">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {pendingRange?.startDate && pendingRange?.endDate ? (
                  <span>
                    {formatDateForDisplay(pendingRange.startDate)} -{" "}
                    {formatDateForDisplay(pendingRange.endDate)}
                  </span>
                ) : selectedRange.startDate && selectedRange.endDate ? (
                  <span>
                    {formatDateForDisplay(selectedRange.startDate)} -{" "}
                    {formatDateForDisplay(selectedRange.endDate)}
                  </span>
                ) : (
                  <span>No date range selected</span>
                )}
              </div>
              <button
                onClick={applyPendingRange}
                disabled={!pendingRange}
                className="rounded-lg bg-gradient-to-r from-black/70 to-black/70 px-3 py-1.5 text-sm font-medium text-white transition-all duration-200 hover:from-black/90 hover:to-black/90 disabled:cursor-not-allowed disabled:opacity-50 dark:from-gray-700/80 dark:to-gray-700/80 dark:hover:from-gray-600 dark:hover:to-gray-600"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
