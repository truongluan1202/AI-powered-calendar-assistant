"use client";

import { useState, useEffect } from "react";
import type { Event } from "~/types/chat";

interface EventEditModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedEvent: Partial<Event>) => Promise<void>;
  onDelete: (eventId: string) => Promise<void>;
  isLoading?: boolean;
}

export default function EventEditModal({
  event,
  isOpen,
  onClose,
  onSave,
  onDelete,
  isLoading = false,
}: EventEditModalProps) {
  const [formData, setFormData] = useState({
    summary: "",
    description: "",
    location: "",
    start: "",
    end: "",
  });

  // Update form data when event changes
  useEffect(() => {
    if (event) {
      const startDate = new Date(event.start);
      const endDate = new Date(event.end);

      // Format dates for datetime-local input
      const formatDateTime = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      };

      setFormData({
        summary: event.summary || "",
        description: event.description || "",
        location: event.location || "",
        start: formatDateTime(startDate),
        end: formatDateTime(endDate),
      });
    }
  }, [event]);

  // Handle start time change with auto end time adjustment
  const handleStartTimeChange = (newStartTime: string) => {
    const startDate = new Date(newStartTime);
    const endDate = new Date(formData.end);

    // If start time is later than or equal to end time, adjust end time to 1 hour later
    if (startDate >= endDate) {
      const newEndDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Add 1 hour
      const formatDateTime = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      };

      setFormData((prev) => ({
        ...prev,
        start: newStartTime,
        end: formatDateTime(newEndDate),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        start: newStartTime,
      }));
    }
  };

  // Handle end time change with auto start time adjustment
  const handleEndTimeChange = (newEndTime: string) => {
    const startDate = new Date(formData.start);
    const endDate = new Date(newEndTime);

    // If end time is earlier than or equal to start time, adjust start time to 1 hour earlier
    if (endDate <= startDate) {
      const newStartDate = new Date(endDate.getTime() - 60 * 60 * 1000); // Subtract 1 hour
      const formatDateTime = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      };

      setFormData((prev) => ({
        ...prev,
        start: formatDateTime(newStartDate),
        end: newEndTime,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        end: newEndTime,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event?.id) return;

    const updatedEvent: Partial<Event> = {
      id: event.id,
      summary: formData.summary,
      description: formData.description,
      location: formData.location,
      start: new Date(formData.start).toISOString(),
      end: new Date(formData.end).toISOString(),
    };

    await onSave(updatedEvent);
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  if (!isOpen || !event) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Full-page Modal */}
      <div className="gradient-card shadow-refined relative z-10 flex h-full w-full flex-col border-b border-gray-200/60 backdrop-blur-sm dark:border-gray-700/60">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200/60 px-6 py-5.5 dark:border-gray-700/60">
          <div className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-gray-700 to-gray-800 dark:from-gray-300 dark:to-gray-400">
              <svg
                className="h-4 w-4 text-white dark:text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Edit Event
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="rounded-lg p-2 text-gray-400 transition-all duration-200 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
            <div>
              <label
                htmlFor="summary"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Title *
              </label>
              <input
                type="text"
                id="summary"
                value={formData.summary}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, summary: e.target.value }))
                }
                required
                disabled={isLoading}
                className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:ring-2 focus:ring-gray-500/20 focus:outline-none disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:border-gray-400"
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                disabled={isLoading}
                rows={3}
                className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:ring-2 focus:ring-gray-500/20 focus:outline-none disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:border-gray-400"
              />
            </div>

            <div>
              <label
                htmlFor="location"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Location
              </label>
              <input
                type="text"
                id="location"
                value={formData.location}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, location: e.target.value }))
                }
                disabled={isLoading}
                className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:ring-2 focus:ring-gray-500/20 focus:outline-none disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:border-gray-400"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="start"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Start Time *
                </label>
                <input
                  type="datetime-local"
                  id="start"
                  value={formData.start}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  required
                  disabled={isLoading}
                  className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:ring-2 focus:ring-gray-500/20 focus:outline-none disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:border-gray-400"
                />
              </div>

              <div>
                <label
                  htmlFor="end"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  End Time *
                </label>
                <input
                  type="datetime-local"
                  id="end"
                  value={formData.end}
                  onChange={(e) => handleEndTimeChange(e.target.value)}
                  required
                  disabled={isLoading}
                  className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:ring-2 focus:ring-gray-500/20 focus:outline-none disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:border-gray-400"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800/20 dark:text-gray-300 dark:hover:bg-gray-800/30 dark:hover:text-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="hover:shadow-elegant rounded-lg bg-gradient-to-r from-gray-800 to-gray-900 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02] hover:from-gray-700 hover:to-gray-800 active:scale-[0.98] disabled:opacity-50 dark:from-gray-200 dark:to-gray-300 dark:text-gray-900 dark:hover:from-gray-100 dark:hover:to-gray-200"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    <span>Saving...</span>
                  </div>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
