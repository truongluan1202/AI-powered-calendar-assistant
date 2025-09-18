import { useState } from "react";

export type TimeWindow = {
  label: string;
  timeMin: string;
  timeMax: string;
  description: string;
};

const TIME_WINDOWS: TimeWindow[] = [
  {
    label: "Today",
    timeMin: "today",
    timeMax: "today",
    description: "Events for today only",
  },
  {
    label: "This Week",
    timeMin: "7 days ago",
    timeMax: "7 days from now",
    description: "Events for this week",
  },
  {
    label: "Next 2 Weeks",
    timeMin: "today",
    timeMax: "14 days from now",
    description: "Events for the next 2 weeks",
  },
  {
    label: "This Month",
    timeMin: "30 days ago",
    timeMax: "30 days from now",
    description: "Events for this month",
  },
  {
    label: "Next 3 Months",
    timeMin: "today",
    timeMax: "90 days from now",
    description: "Events for the next 3 months",
  },
  {
    label: "All Upcoming",
    timeMin: "today",
    timeMax: "1 year from now",
    description: "All upcoming events",
  },
];

interface TimeWindowSelectorProps {
  selectedTimeWindow: TimeWindow;
  onTimeWindowChange: (timeWindow: TimeWindow) => void;
  isLoading?: boolean;
}

export default function TimeWindowSelector({
  selectedTimeWindow,
  onTimeWindowChange,
  isLoading = false,
}: TimeWindowSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleTimeWindowSelect = (timeWindow: TimeWindow) => {
    onTimeWindowChange(timeWindow);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex items-center space-x-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:bg-gray-600"
        title={selectedTimeWindow.description}
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
        <span>{selectedTimeWindow.label}</span>
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
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full right-0 z-20 mt-1 w-64 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <div className="p-2">
              <div className="mb-2 px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                Time Range
              </div>
              {TIME_WINDOWS.map((timeWindow) => (
                <button
                  key={timeWindow.label}
                  onClick={() => handleTimeWindowSelect(timeWindow)}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors duration-200 ${
                    selectedTimeWindow.label === timeWindow.label
                      ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
                      : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                  }`}
                >
                  <div className="font-medium">{timeWindow.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {timeWindow.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
