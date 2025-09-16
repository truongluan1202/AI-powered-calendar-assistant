"use client";

import { useState, useEffect } from "react";
import type { Event } from "~/types/chat";

interface EventConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (eventData: any) => void;
  onCancel: () => void;
  eventDetails: any;
}

export default function EventConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  eventDetails,
}: EventConfirmationModalProps) {
  const [formData, setFormData] = useState({
    summary: "",
    description: "",
    location: "",
    start: "",
    end: "",
  });

  // Update form data when event details change
  useEffect(() => {
    if (eventDetails) {
      const startDate = new Date(
        eventDetails.start?.dateTime || eventDetails.start,
      );
      const endDate = new Date(eventDetails.end?.dateTime || eventDetails.end);

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
        summary: eventDetails.summary || "",
        description: eventDetails.description || "",
        location: eventDetails.location || "",
        start: formatDateTime(startDate),
        end: formatDateTime(endDate),
      });
    }
  }, [eventDetails]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Use the original timezone from event details
    const timeZone = eventDetails.start?.timeZone || "Australia/Sydney";

    // Parse the datetime-local values as local time
    const startDateTime = new Date(formData.start);
    const endDateTime = new Date(formData.end);

    const updatedEventData = {
      summary: formData.summary,
      description: formData.description,
      location: formData.location,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: timeZone,
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: timeZone,
      },
      attendees: eventDetails.attendees || [],
    };

    onConfirm(updatedEventData);
  };

  const handleCancel = () => {
    onCancel();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="gradient-card shadow-refined relative z-10 w-full max-w-md rounded-xl border border-gray-200/60 p-6 backdrop-blur-sm dark:border-gray-700/60">
        <div className="mb-4 flex items-center justify-between">
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
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Edit Event Details
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition-all duration-200 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
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

        <form onSubmit={handleSubmit} className="space-y-4">
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
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:ring-2 focus:ring-gray-500/20 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:border-gray-400"
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
              rows={3}
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:ring-2 focus:ring-gray-500/20 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:border-gray-400"
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
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:ring-2 focus:ring-gray-500/20 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:border-gray-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
                className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:ring-2 focus:ring-gray-500/20 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:border-gray-400"
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
                className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:ring-2 focus:ring-gray-500/20 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:border-gray-400"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-100 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800/20 dark:text-gray-300 dark:hover:bg-gray-800/30 dark:hover:text-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="hover:shadow-elegant rounded-lg bg-gradient-to-r from-gray-800 to-gray-900 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02] hover:from-gray-700 hover:to-gray-800 active:scale-[0.98] dark:from-gray-200 dark:to-gray-300 dark:text-gray-900 dark:hover:from-gray-100 dark:hover:to-gray-200"
            >
              Confirm Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
