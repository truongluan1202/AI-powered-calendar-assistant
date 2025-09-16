import { useState } from "react";
import type { Event } from "~/types/chat";
import EventEditModal from "./EventEditModal";

interface CalendarPaneProps {
  events: Event[];
  optimisticEvents: Event[];
  eventsLoading: boolean;
  eventsError: string | null;
  fetchEvents: () => void;
  updateEvent: (eventId: string, eventData: any) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
}

export default function CalendarPane({
  events,
  optimisticEvents,
  eventsLoading,
  eventsError,
  fetchEvents,
  updateEvent,
  deleteEvent,
}: CalendarPaneProps) {
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEvent(null);
    setIsUpdating(false);
  };

  const handleSaveEvent = async (updatedEvent: Partial<Event>) => {
    if (!editingEvent?.id) return;

    setIsUpdating(true);
    try {
      await updateEvent(editingEvent.id, updatedEvent);
      handleCloseModal();
    } catch (error) {
      console.error("Failed to update event:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteEvent(eventId);
      handleCloseModal();
    } catch (error) {
      console.error("Failed to delete event:", error);
    }
  };
  return (
    <div className="chat-panel-transparent relative z-10 flex min-h-0 w-full flex-col backdrop-blur-sm xl:h-full xl:w-2/7 xl:min-w-2/7">
      <div className="border-b border-gray-200/60 p-4 sm:p-6 dark:border-gray-700/60">
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
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
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Calendar
            </h2>
          </div>
          <button
            onClick={fetchEvents}
            disabled={eventsLoading}
            className="hover:shadow-elegant flex w-full items-center justify-center space-x-2 rounded-lg bg-gradient-to-r from-gray-100 to-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:from-gray-200 hover:to-gray-300 disabled:opacity-50 sm:w-auto dark:from-gray-700 dark:to-gray-800 dark:text-gray-300 dark:hover:from-gray-600 dark:hover:to-gray-700"
          >
            {eventsLoading ? (
              <>
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent"></div>
                <span>Loading...</span>
              </>
            ) : (
              <>
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
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>Refresh</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="mobile-scrollable flex-1 overflow-y-auto p-4 sm:p-6 lg:max-h-96">
        {eventsError ? (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800/50">
              <svg
                className="h-6 w-6 text-gray-500 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="mb-2 font-medium">Error loading events</p>
            <p className="mb-4 text-sm">{eventsError}</p>
            <button
              onClick={fetchEvents}
              className="hover:shadow-elegant rounded-lg bg-gradient-to-r from-gray-600 to-gray-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:from-gray-500 hover:to-gray-600 dark:from-gray-400 dark:to-gray-500 dark:text-gray-900 dark:hover:from-gray-300 dark:hover:to-gray-400"
            >
              Try Again
            </button>
          </div>
        ) : events.length === 0 && optimisticEvents.length === 0 ? (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
              <svg
                className="h-6 w-6 text-gray-400 dark:text-gray-500"
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
            </div>
            <p className="mb-2 font-medium text-gray-700 dark:text-gray-300">
              No events scheduled
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Ask me to create an event!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* All Events (Real + Optimistic) - Sorted by start time */}
            {[...events, ...optimisticEvents]
              .sort((a, b) => {
                const dateA = new Date(a.start).getTime();
                const dateB = new Date(b.start).getTime();
                return dateA - dateB; // Sort chronologically (earliest first)
              })
              .map((event, index) => {
                const eventDate = new Date(event.start);
                const now = new Date();
                const isUpcoming = eventDate > now;
                const isToday = eventDate.toDateString() === now.toDateString();
                const isPast = eventDate < now;

                return (
                  <div
                    key={event.id ?? index}
                    className={`shadow-refined hover:shadow-elegant rounded-xl border p-4 transition-all duration-200 ${
                      isPast
                        ? "border-gray-200/60 bg-gray-50/80 opacity-75 dark:border-gray-700/60 dark:bg-gray-700/10"
                        : isToday
                          ? "border-gray-300/60 bg-gradient-to-r from-gray-100 to-gray-200/80 dark:border-gray-600/60 dark:from-gray-700/10 dark:to-gray-700/40"
                          : "border-gray-200/60 bg-white/90 backdrop-blur-sm dark:border-gray-700/60 dark:bg-gray-700/40"
                    } ${event.isOptimistic && !event.isConfirmed ? "animate-pulse" : ""}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-semibold text-gray-900 dark:text-gray-100">
                            {event.summary}
                          </h3>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                            {new Date(event.start).toLocaleString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </p>
                          {event.location && (
                            <p className="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">
                              <svg
                                className="mr-1 h-3 w-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                              </svg>
                              {event.location}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          <div className="flex space-x-1">
                            {event.id && !event.isOptimistic && (
                              <>
                                <button
                                  onClick={() => handleEditEvent(event)}
                                  disabled={eventsLoading}
                                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                                  title="Edit event"
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
                                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                    />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteEvent(event.id!)}
                                  disabled={eventsLoading}
                                  className="rounded-lg p-1 text-gray-400 hover:bg-red-100 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                                  title="Delete event"
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
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                          <div className="flex flex-col space-y-1">
                            {isToday && (
                              <span className="rounded-full bg-black px-2 py-1 text-xs font-medium text-white dark:bg-white dark:text-black">
                                Today
                              </span>
                            )}
                            {isPast && (
                              <span className="rounded-full bg-black px-2 py-1 text-xs font-medium text-white dark:bg-white dark:text-black">
                                Past
                              </span>
                            )}
                            {event.isOptimistic && !event.isConfirmed && (
                              <span className="rounded-full bg-black px-2 py-1 text-xs font-medium text-white dark:bg-white dark:text-black">
                                Creating...
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Event Edit Modal */}
      <EventEditModal
        event={editingEvent}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        isLoading={isUpdating}
      />
    </div>
  );
}
