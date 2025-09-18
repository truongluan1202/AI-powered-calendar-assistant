"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useChat } from "~/hooks/useChat";
import { useAIResponse } from "~/hooks/useAIResponse";
import { useCalendar } from "~/hooks/useCalendar";
import { useLocalStorage } from "~/hooks/useLocalStorage";
import { showToast } from "~/utils/chat";
import ThreadSidebar from "~/components/chat/ThreadSidebar";
import CalendarPane from "~/components/chat/CalendarPane";
import MessagesList from "~/components/chat/MessagesList";
import ChatInput from "~/components/chat/ChatInput";
import EventConfirmationModal from "~/components/chat/EventConfirmationModal";
import type { GeminiModel } from "~/types/chat";

export default function ChatPage() {
  const chatState = useChat();
  const {
    session,
    status,
    currentThreadId,
    setCurrentThreadId,
    input,
    setInput,
    model,
    setModel,
    editingThread,
    setEditingThread,
    editingTitle,
    setEditingTitle,
    optimisticMessages,
    setOptimisticMessages,
    events,
    setEvents,
    optimisticEvents,
    setOptimisticEvents,
    eventsLoading,
    setEventsLoading,
    eventsError,
    setEventsError,
    toastMessage,
    setToastMessage,
    isExecutingTool,
    setIsExecutingTool,
    streamingText,
    setStreamingText,
    isStreaming,
    setIsStreaming,
    showConfirmationButtons,
    setShowConfirmationButtons,
    isWebSearching,
    setIsWebSearching,
    isOnline,
    setIsOnline,
    networkError,
    setNetworkError,
    listRef,
    inputRef,
    hasInitialized,
    lastMessageCountRef,
    isSendingRef,
    threads,
    refetchThreads,
    messages,
    refetchMessages,
    availableProviders,
    createThreadMutation,
    addMessageMutation,
    updateThreadMutation,
    deleteThreadMutation,
    updateThreadModelMutation,
  } = chatState;

  // State for event confirmation modal
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [pendingEventDetails, setPendingEventDetails] = useState<any>(null);
  const [pendingMessageId, setPendingMessageId] = useState<string | null>(null);

  // State for panel visibility (persisted in localStorage)
  // These states will be remembered across page refreshes
  const [showCalendar, setShowCalendar] = useLocalStorage(
    "chat-show-calendar",
    true,
  );
  const [showThreads, setShowThreads] = useLocalStorage(
    "chat-show-threads",
    true,
  );
  const [editedEventDetails, setEditedEventDetails] = useState<any>(null);

  // Parse event details from confirmation message (memoized for performance)
  const parseEventDetailsFromMessage = useCallback((content: string) => {
    const lines = content.split("\n");
    const eventDetails: any = {};

    for (const line of lines) {
      if (line.includes("**Title:**")) {
        eventDetails.summary = line.replace("**Title:**", "").trim();
      } else if (line.includes("**Date & Time:**")) {
        const dateTimeText = line.replace("**Date & Time:**", "").trim();
        // Parse the date/time format - handle various formats
        const [startTime, endTime] = dateTimeText.split(" - ");
        if (startTime && endTime) {
          try {
            // Parse the human-readable Australian date format
            // Format: "Monday, 20 January 2025 at 2:00 PM"
            const parseAustralianDate = (dateStr: string) => {
              try {
                // Remove "at" and clean up the string
                const cleanStr = dateStr.trim().replace(" at ", " ");

                // Try to parse using Intl.DateTimeFormat with Australian locale
                // This should handle the Australian date format properly
                const date = new Date(cleanStr);

                if (!isNaN(date.getTime())) {
                  return date;
                }

                // Fallback: try to parse by removing day name and using a more standard format
                const withoutDay = cleanStr.replace(/^[A-Za-z]+,\s*/, "");
                const fallbackDate = new Date(withoutDay);

                if (!isNaN(fallbackDate.getTime())) {
                  return fallbackDate;
                }

                throw new Error("Could not parse date");
              } catch (error) {
                console.error("Date parsing error:", error);
                throw error;
              }
            };

            const startDate = parseAustralianDate(startTime.trim());
            const endDate = parseAustralianDate(endTime.trim());

            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
              // Always convert to ISO format for backend
              eventDetails.start = {
                dateTime: startDate.toISOString(),
                timeZone: "Australia/Sydney",
              };
              eventDetails.end = {
                dateTime: endDate.toISOString(),
                timeZone: "Australia/Sydney",
              };
            } else {
              throw new Error("Invalid date format");
            }
          } catch (error) {
            console.error("Error parsing dates:", error);
            // Fallback to current time + 1 hour
            const now = new Date();
            const endTime = new Date(now.getTime() + 60 * 60 * 1000);
            eventDetails.start = {
              dateTime: now.toISOString(),
              timeZone: "Australia/Sydney",
            };
            eventDetails.end = {
              dateTime: endTime.toISOString(),
              timeZone: "Australia/Sydney",
            };
          }
        }
      } else if (line.includes("**Location:**")) {
        eventDetails.location = line.replace("**Location:**", "").trim();
      } else if (line.includes("**Description:**")) {
        eventDetails.description = line.replace("**Description:**", "").trim();
      }
    }

    return eventDetails;
  }, []);

  // Format AI's confirmation message to display local time instead of ISO
  const formatAIConfirmationMessage = (content: string) => {
    // Check if this is a confirmation message with ISO dates
    if (!content.includes("**Date & Time:**") || !content.includes("T")) {
      return content; // Not a confirmation message or no ISO dates
    }

    // Extract the date/time line and ensure all fields are present
    const lines = content.split("\n");
    let hasLocation = false;

    const formattedLines = lines.map((line) => {
      if (line.includes("**Date & Time:**")) {
        const dateTimeText = line.replace("**Date & Time:**", "").trim();
        const [startTime, endTime] = dateTimeText.split(" - ");

        if (startTime && endTime) {
          try {
            // Parse ISO dates and convert to local time display
            const startDate = new Date(startTime.trim());
            const endDate = new Date(endTime.trim());

            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
              const formatDateTime = (date: Date) => {
                return date.toLocaleString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                  timeZone: "Australia/Sydney", // Always display in Australia/Sydney timezone
                });
              };

              return `**Date & Time:** ${formatDateTime(startDate)} - ${formatDateTime(endDate)}`;
            }
          } catch (error) {
            console.error("Error parsing dates in AI message:", error);
          }
        }
      } else if (line.includes("**Location:**")) {
        hasLocation = true;
      }
      return line;
    });

    // Add missing fields if they don't exist
    const result = [...formattedLines];

    // Find the position to insert missing fields (after Date & Time, before the end)
    let insertIndex =
      result.findIndex((line) => line.includes("**Date & Time:**")) + 1;

    if (!hasLocation) {
      result.splice(insertIndex, 0, "**Location:** None");
      insertIndex++;
    }

    return result.join("\n");
  };

  // Format event details back to confirmation message format
  const formatEventDetailsToMessage = (eventDetails: any) => {
    // Handle timezone properly - if we have timezone info, use it, otherwise assume local timezone
    const startDateTime = eventDetails.start?.dateTime || eventDetails.start;
    const endDateTime = eventDetails.end?.dateTime || eventDetails.end;

    // Parse dates - these should already be in the correct timezone
    const startDate = new Date(startDateTime);
    const endDate = new Date(endDateTime);

    const formatDateTime = (date: Date) => {
      // Always display in Australia/Sydney timezone for consistency
      return date.toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "Australia/Sydney", // Always display in Australia/Sydney timezone
      });
    };

    let message = `**Title:** ${eventDetails.summary || "Untitled Event"}\n**Date & Time:** ${formatDateTime(startDate)} - ${formatDateTime(endDate)}`;

    // Always include location field
    message += `\n**Location:** ${eventDetails.location || "None"}`;

    if (eventDetails.description) {
      message += `\n**Description:** ${eventDetails.description}`;
    }

    return message;
  };

  // Format event details for modify messages (consistent with edit confirmations)
  const formatEventDetailsForModify = (eventDetails: any) => {
    const startDateTime = eventDetails.start?.dateTime || eventDetails.start;
    const endDateTime = eventDetails.end?.dateTime || eventDetails.end;

    const startDate = new Date(startDateTime);
    const endDate = new Date(endDateTime);

    const formatDateTime = (date: Date) => {
      return date.toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "Australia/Sydney",
      });
    };

    const details = [];
    if (eventDetails.summary)
      details.push(`**Title:** ${eventDetails.summary}`);
    if (eventDetails.start) {
      const startTime = formatDateTime(startDate);
      const endTime = eventDetails.end ? formatDateTime(endDate) : "TBD";
      details.push(`**Date & Time:** ${startTime} - ${endTime}`);
    }
    if (eventDetails.location)
      details.push(`**Location:** ${eventDetails.location}`);
    if (eventDetails.description)
      details.push(`**Description:** ${eventDetails.description}`);

    return details.join("\n");
  };

  // Handle modal confirmation
  const handleModalConfirm = (updatedEventDetails: any) => {
    if (!pendingMessageId) return;

    // Store the edited event details
    setEditedEventDetails(updatedEventDetails);

    // Close modal
    setIsConfirmationModalOpen(false);
    setPendingEventDetails(null);
    setPendingMessageId(null);
  };

  // Handle modal cancel
  const handleModalCancel = () => {
    setIsConfirmationModalOpen(false);
    setPendingEventDetails(null);
    setPendingMessageId(null);
    // Don't clear editedEventDetails on cancel - keep them for next edit
  };

  // Focus the input box
  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Clean up all optimistic state
  const cleanupOptimisticState = () => {
    setOptimisticMessages((prev) => {
      // Keep only non-optimistic messages
      const cleanedMessages = prev.filter((msg) => !msg.isOptimistic);
      return cleanedMessages;
    });
    setOptimisticEvents((prev) => {
      const nonOptimisticEvents = prev.filter((event) => !event.isOptimistic);
      return nonOptimisticEvents;
    });
    setIsExecutingTool(false);
    setIsStreaming(false);
    setIsWebSearching(false);
  };

  // Clear confirmation buttons (only called when switching threads)
  const clearConfirmationButtons = () => {
    setShowConfirmationButtons(new Set());
  };

  // Calendar hook
  const { fetchEvents, addOptimisticEvent, updateEvent, deleteEvent } =
    useCalendar({
      setEvents,
      setOptimisticEvents,
      setEventsLoading,
      setEventsError,
      setToastMessage,
    });

  // AI Response hook
  const { generateAIResponseMutation } = useAIResponse({
    currentThreadId,
    model,
    optimisticMessages,
    setOptimisticMessages,
    setEvents,
    setOptimisticEvents,
    setIsExecutingTool,
    setIsStreaming,
    setShowConfirmationButtons,
    setToastMessage,
    refetchMessages,
    focusInput,
    isSendingRef,
    addOptimisticEvent,
    cleanupOptimisticState,
  });

  // Initialize by selecting first available thread (don't auto-create)
  useEffect(() => {
    if (session && !hasInitialized.current) {
      hasInitialized.current = true;

      if (threads.length > 0 && !currentThreadId) {
        setCurrentThreadId(threads[0]?.id ?? null);
      }

      void fetchEvents();
      setTimeout(() => focusInput(), 500);
    }
  }, [session, threads.length]);

  // Handle case where current thread no longer exists (e.g., after deletion)
  useEffect(() => {
    if (currentThreadId && threads.length > 0) {
      const threadExists = threads.some(
        (thread: any) => thread.id === currentThreadId,
      );
      if (!threadExists) {
        setCurrentThreadId(threads[0]?.id ?? null);
      }
    } else if (currentThreadId && threads.length === 0) {
      setCurrentThreadId(null);
    }
  }, [threads, currentThreadId]);

  // Update model selection when thread changes
  useEffect(() => {
    if (currentThreadId && threads.length > 0) {
      const selectedThread = threads.find(
        (thread: any) => thread.id === currentThreadId,
      );
      if (selectedThread) {
        const validModels: GeminiModel[] = [
          "gemini-2.5-flash-lite",
          "gemini-2.0-flash-lite",
          "gemini-2.5-flash",
          "gemini-2.0-flash",
        ];

        if (validModels.includes(selectedThread.modelName as GeminiModel)) {
          setModel(selectedThread.modelName as GeminiModel);
        } else {
          setModel("gemini-2.5-flash");
        }
      }
    }
  }, [currentThreadId, threads]);

  // Clear optimistic messages when switching threads
  useEffect(() => {
    cleanupOptimisticState();
    clearConfirmationButtons();
    setStreamingText("");
    lastMessageCountRef.current = 0;
    isSendingRef.current = false;
    setTimeout(() => focusInput(), 100);
  }, [currentThreadId]);

  // Update optimistic AI message to show loading state, remove user messages
  useEffect(() => {
    if (
      messages.length > lastMessageCountRef.current &&
      optimisticMessages.length > 0
    ) {
      setOptimisticMessages((prev) =>
        prev
          .filter((msg) => msg.role !== "user")
          .map((msg) =>
            msg.role === "assistant" && msg.isOptimistic
              ? {
                  ...msg,
                  content: "Our model is thinking...",
                  isLoading: true,
                }
              : msg,
          ),
      );
      setStreamingText("");
      setIsStreaming(false);
    }
    lastMessageCountRef.current = messages.length;
  }, [messages, optimisticMessages.length]);

  // Update optimistic AI message when mutation is pending
  useEffect(() => {
    if (generateAIResponseMutation.isPending && optimisticMessages.length > 0) {
      setOptimisticMessages((prev) =>
        prev.map((msg) =>
          msg.role === "assistant" && msg.isOptimistic
            ? {
                ...msg,
                content: "Our model is thinking...",
                isLoading: true,
              }
            : msg,
        ),
      );
    }
  }, [generateAIResponseMutation.isPending, optimisticMessages.length]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, optimisticMessages]);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setNetworkError(null);
      showToast("🌐 Connection restored!", setToastMessage);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setNetworkError("You're offline. Please check your internet connection.");
      showToast(
        "📡 You're offline. Please check your internet connection.",
        setToastMessage,
      );
    };

    setIsOnline(navigator.onLine);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Clean up optimistic state when component unmounts
  useEffect(() => {
    return () => {
      cleanupOptimisticState();
      isSendingRef.current = false;
    };
  }, []);

  // Memoized message lookup for better performance
  const findMessageById = useCallback(
    (messageId: string) => {
      return (
        messages.find((m) => m.id === messageId) ||
        optimisticMessages.find((m) => m.id === messageId)
      );
    },
    [messages, optimisticMessages],
  );

  // Handle confirmation button clicks
  const handleConfirmation = async (
    action: "confirm" | "cancel" | "edit",
    messageId: string,
    eventDetails?: any,
  ) => {
    if (!currentThreadId) {
      console.error("No thread selected");
      return;
    }

    if (
      isSendingRef.current ||
      generateAIResponseMutation.isPending ||
      addMessageMutation.isPending
    ) {
      return;
    }

    // Handle edit action - open modal instead of sending message
    if (action === "edit") {
      // Use edited details if available, otherwise parse from message
      let eventDetails;

      if (editedEventDetails) {
        // Use the previously edited details
        eventDetails = editedEventDetails;
      } else {
        // Parse event details from the confirmation message
        const message = findMessageById(messageId);

        if (message) {
          eventDetails = parseEventDetailsFromMessage(message.content);
        }
      }

      if (eventDetails) {
        setPendingEventDetails(eventDetails);
        setPendingMessageId(messageId);
        setIsConfirmationModalOpen(true);
      }
      return;
    }

    setShowConfirmationButtons((prev) => {
      const newSet = new Set(prev);
      newSet.delete(messageId);
      return newSet;
    });

    isSendingRef.current = true;

    // Use edited event details if available, otherwise use the original action
    let userMessage: string = action;
    let displayMessage: string = action; // Message to display in UI
    let eventDetailsToSend = eventDetails;

    if (action === "confirm" && editedEventDetails) {
      // If we have edited details, send them as a modify message
      // Use formatted details that are easier for LLM to understand
      const formattedDetails = formatEventDetailsForModify(editedEventDetails);
      userMessage = `modify the event with these details:\n\n${formattedDetails}`;

      // Use the same message for both display and LLM processing
      displayMessage = `I modified the event with these details:\n\n${formattedDetails}`;

      eventDetailsToSend = editedEventDetails;
    }

    // Clear the edited details after any action (confirm or cancel)
    if (action === "confirm" || action === "cancel") {
      setEditedEventDetails(null);
    }

    const optimisticUserMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: displayMessage, // Use display message for UI
      createdAt: new Date(),
      isOptimistic: true,
    };

    const optimisticAIMessage = {
      id: `ai-${Date.now()}`,
      role: "assistant",
      content: "Processing your response...",
      createdAt: new Date(),
      isOptimistic: true,
      isLoading: true,
      clientKey: `ai-${Date.now()}`,
    };

    setOptimisticMessages((prev) => {
      const newMessages = [...prev, optimisticUserMessage, optimisticAIMessage];
      return newMessages;
    });

    // Always store the display message for the user, but send JSON to AI
    addMessageMutation.mutate({
      threadId: currentThreadId,
      role: "user",
      content: displayMessage, // Store the display message (e.g., "modify")
    });

    generateAIResponseMutation.mutate({
      threadId: currentThreadId,
      message: userMessage,
      modelProvider: "gemini",
      modelName: model,
    });
  };

  const send = async () => {
    if (!input.trim()) return;

    if (!currentThreadId) {
      console.error(
        "No thread selected. Please wait for thread initialization or create a new thread.",
      );
      return;
    }

    if (!isOnline) {
      showToast(
        "📡 You're offline. Please check your internet connection.",
        setToastMessage,
      );
      return;
    }

    if (
      isSendingRef.current ||
      generateAIResponseMutation.isPending ||
      addMessageMutation.isPending
    ) {
      return;
    }

    isSendingRef.current = true;

    const userMessage = input.trim();
    setInput("");

    cleanupOptimisticState();

    setOptimisticMessages((prev) => {
      const cleaned = prev.filter(
        (msg) =>
          !msg.content.includes("Sorry, I encountered an error") &&
          !msg.content.includes("error") &&
          !msg.isOptimistic,
      );
      return cleaned;
    });

    const optimisticUserMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userMessage,
      createdAt: new Date(),
      isOptimistic: true,
    };

    const optimisticAIMessage = {
      id: `ai-${Date.now()}`,
      role: "assistant",
      content: "Our model is thinking...",
      createdAt: new Date(),
      isOptimistic: true,
      isLoading: true,
      clientKey: `ai-${Date.now()}`,
    };

    setOptimisticMessages((prev) => {
      const newMessages = [...prev, optimisticUserMessage, optimisticAIMessage];
      return newMessages;
    });

    addMessageMutation.mutate({
      threadId: currentThreadId,
      role: "user",
      content: userMessage,
    });

    generateAIResponseMutation.mutate({
      threadId: currentThreadId,
      message: userMessage,
      modelProvider: "gemini",
      modelName: model,
    });
  };

  const performWebSearch = async () => {
    if (!input.trim()) return;

    if (!currentThreadId) {
      console.error(
        "No thread selected. Please wait for thread initialization or create a new thread.",
      );
      return;
    }

    if (!isOnline) {
      showToast(
        "📡 You're offline. Please check your internet connection.",
        setToastMessage,
      );
      return;
    }

    if (
      isSendingRef.current ||
      generateAIResponseMutation.isPending ||
      addMessageMutation.isPending ||
      isWebSearching
    ) {
      return;
    }

    setIsWebSearching(true);
    isSendingRef.current = true;

    const searchQuery = input.trim();
    setInput("");

    cleanupOptimisticState();

    const optimisticUserMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: `🔍 Web Search: ${searchQuery}`,
      createdAt: new Date(),
      isOptimistic: true,
    };

    const optimisticAIMessage = {
      id: `ai-${Date.now()}`,
      role: "assistant",
      content: "Searching the web for information...",
      createdAt: new Date(),
      isOptimistic: true,
      isLoading: true,
      clientKey: `ai-${Date.now()}`,
    };

    setOptimisticMessages((prev) => {
      const newMessages = [...prev, optimisticUserMessage, optimisticAIMessage];
      return newMessages;
    });

    try {
      addMessageMutation.mutate({
        threadId: currentThreadId,
        role: "user",
        content: `🔍 Web Search: ${searchQuery}`,
      });

      generateAIResponseMutation.mutate({
        threadId: currentThreadId,
        message: `🔍 Web Search: ${searchQuery}`,
        modelProvider: "gemini",
        modelName: model,
      });
    } finally {
      setIsWebSearching(false);
      isSendingRef.current = false;
    }
  };

  const createNewThread = () => {
    // Prevent multiple calls if mutation is already pending
    if (createThreadMutation.isPending) {
      return;
    }

    createThreadMutation.mutate({
      title: "New Chat",
      modelProvider: "gemini",
      modelName: model,
    });
  };

  const updateThreadTitle = (threadId: string, newTitle: string) => {
    updateThreadMutation.mutate({
      threadId,
      title: newTitle,
    });
  };

  const deleteThread = (threadId: string) => {
    if (deleteThreadMutation.isPending) {
      return; // Prevent multiple delete calls
    }
    deleteThreadMutation.mutate({ threadId });
  };

  const startEditing = (threadId: string, currentTitle: string) => {
    setEditingThread(threadId);
    setEditingTitle(currentTitle);
  };

  const cancelEditing = () => {
    setEditingThread(null);
    setEditingTitle("");
  };

  if (status === "loading") {
    return (
      <div className="relative z-10 flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="animate-pulse-glow animate-float animate-shimmer flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-gray-900 to-gray-950 dark:from-gray-400 dark:to-gray-500">
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                Cal
              </span>
            </div>
          </div>

          <div className="mb-6">
            <div className="relative mx-auto h-12 w-12">
              <div className="absolute inset-0 rounded-full border-3 border-gray-200 dark:border-gray-700"></div>
              <div className="absolute inset-0 animate-spin rounded-full border-3 border-transparent border-t-blue-600 dark:border-t-blue-400"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-600 dark:bg-blue-400"></div>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Loading Chat
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Setting up your AI assistant...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="relative z-10 flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-gray-700 to-gray-800 dark:from-gray-300 dark:to-gray-400">
            <svg
              className="h-10 w-10 text-white dark:text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <h1 className="text-refined mb-4 text-3xl font-bold text-gray-900 dark:text-gray-100">
            Welcome to Calendara
          </h1>
          <p className="text-refined mb-8 text-lg text-gray-600 dark:text-gray-400">
            Please sign in to start managing your calendar with AI
          </p>
          <Link
            href="/api/auth/signin"
            className="hover:shadow-elegant inline-flex items-center space-x-2 rounded-xl bg-gradient-to-r from-gray-700 to-gray-800 px-8 py-4 font-medium text-white transition-all duration-200 hover:scale-[1.02] hover:from-gray-600 hover:to-gray-700 active:scale-[0.98] dark:from-gray-200 dark:to-gray-300 dark:text-gray-900 dark:hover:from-gray-100 dark:hover:to-gray-200"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
              />
            </svg>
            <span>Sign In with Google</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative z-40 flex min-h-full flex-col lg:h-full lg:flex-row"
      style={{ background: "transparent" }}
    >
      {/* Background Effects - Static Flakes/Stars */}
      <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
        {/* Static decorative flakes/stars - subtle */}
        <div className="absolute top-20 left-10 h-0.5 w-0.5 rounded-full bg-white/50 dark:bg-white/35"></div>
        <div className="absolute top-32 right-16 h-0.5 w-0.5 rounded-full bg-white/45 dark:bg-white/30"></div>
        <div className="absolute top-48 left-1/4 h-1 w-1 rounded-full bg-white/55 dark:bg-white/40"></div>
        <div className="absolute top-64 right-1/3 h-0.5 w-0.5 rounded-full bg-white/45 dark:bg-white/30"></div>
        <div className="absolute top-80 left-1/2 h-0.5 w-0.5 rounded-full bg-white/50 dark:bg-white/35"></div>

        <div className="absolute top-96 right-20 h-1 w-1 rounded-full bg-white/55 dark:bg-white/40"></div>
        <div className="absolute top-1/3 left-16 h-0.5 w-0.5 rounded-full bg-white/45 dark:bg-white/30"></div>
        <div className="absolute top-1/3 right-1/4 h-0.5 w-0.5 rounded-full bg-white/50 dark:bg-white/35"></div>
        <div className="absolute top-1/2 left-8 h-1 w-1 rounded-full bg-white/55 dark:bg-white/40"></div>
        <div className="absolute top-1/2 right-12 h-0.5 w-0.5 rounded-full bg-white/45 dark:bg-white/30"></div>

        <div className="absolute top-2/3 left-1/3 h-0.5 w-0.5 rounded-full bg-white/50 dark:bg-white/35"></div>
        <div className="absolute top-2/3 right-8 h-1 w-1 rounded-full bg-white/55 dark:bg-white/40"></div>
        <div className="absolute top-3/4 left-20 h-0.5 w-0.5 rounded-full bg-white/45 dark:bg-white/30"></div>
        <div className="absolute top-3/4 right-1/3 h-0.5 w-0.5 rounded-full bg-white/50 dark:bg-white/35"></div>
        <div className="absolute bottom-20 left-1/4 h-1 w-1 rounded-full bg-white/55 dark:bg-white/40"></div>

        <div className="absolute right-16 bottom-32 h-0.5 w-0.5 rounded-full bg-white/45 dark:bg-white/30"></div>
        <div className="absolute bottom-48 left-12 h-0.5 w-0.5 rounded-full bg-white/50 dark:bg-white/35"></div>
        <div className="absolute right-1/4 bottom-64 h-1 w-1 rounded-full bg-white/55 dark:bg-white/40"></div>
        <div className="absolute bottom-80 left-1/2 h-0.5 w-0.5 rounded-full bg-white/45 dark:bg-white/30"></div>
        <div className="absolute right-8 bottom-96 h-0.5 w-0.5 rounded-full bg-white/50 dark:bg-white/35"></div>

        {/* Additional scattered flakes - subtle */}
        <div className="absolute top-40 left-1/5 h-0.5 w-0.5 rounded-full bg-white/45 dark:bg-white/30"></div>
        <div className="absolute top-56 right-1/5 h-0.5 w-0.5 rounded-full bg-white/50 dark:bg-white/35"></div>
        <div className="absolute top-72 left-3/4 h-0.5 w-0.5 rounded-full bg-white/45 dark:bg-white/30"></div>
        <div className="absolute top-88 right-1/2 h-1 w-1 rounded-full bg-white/55 dark:bg-white/40"></div>
        <div className="absolute top-1/4 left-1/6 h-0.5 w-0.5 rounded-full bg-white/45 dark:bg-white/30"></div>

        <div className="absolute top-1/4 right-1/6 h-0.5 w-0.5 rounded-full bg-white/50 dark:bg-white/35"></div>
        <div className="absolute top-1/2 left-2/3 h-0.5 w-0.5 rounded-full bg-white/45 dark:bg-white/30"></div>
        <div className="absolute top-1/2 right-1/5 h-1 w-1 rounded-full bg-white/55 dark:bg-white/40"></div>
        <div className="absolute top-3/5 left-1/8 h-0.5 w-0.5 rounded-full bg-white/45 dark:bg-white/30"></div>
        <div className="absolute top-3/5 right-2/3 h-0.5 w-0.5 rounded-full bg-white/50 dark:bg-white/35"></div>

        <div className="absolute top-4/5 left-1/7 h-1 w-1 rounded-full bg-white/55 dark:bg-white/40"></div>
        <div className="absolute top-4/5 right-1/7 h-0.5 w-0.5 rounded-full bg-white/45 dark:bg-white/30"></div>
        <div className="absolute bottom-40 left-1/6 h-0.5 w-0.5 rounded-full bg-white/50 dark:bg-white/35"></div>
        <div className="absolute right-1/6 bottom-56 h-0.5 w-0.5 rounded-full bg-white/45 dark:bg-white/30"></div>
        <div className="absolute bottom-72 left-2/3 h-1 w-1 rounded-full bg-white/55 dark:bg-white/40"></div>
      </div>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="animate-in slide-in-from-right-5 fixed top-4 right-4 z-50 duration-300">
          <div className="shadow-elegant rounded-xl bg-gradient-to-r from-gray-700 to-gray-800 px-4 py-3 text-white backdrop-blur-sm dark:from-gray-300 dark:to-gray-400 dark:text-gray-900">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">{toastMessage}</span>
              <button
                onClick={() => setToastMessage(null)}
                className="ml-2 text-white transition-colors hover:text-gray-200 dark:text-gray-900 dark:hover:text-gray-700"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Left Sidebar - Threads */}
      {showThreads && (
        <ThreadSidebar
          threads={threads}
          currentThreadId={currentThreadId}
          setCurrentThreadId={setCurrentThreadId}
          editingThread={editingThread}
          setEditingThread={setEditingThread}
          editingTitle={editingTitle}
          setEditingTitle={setEditingTitle}
          createNewThread={createNewThread}
          updateThreadTitle={updateThreadTitle}
          deleteThread={deleteThread}
          startEditing={startEditing}
          cancelEditing={cancelEditing}
          isDeletingThread={deleteThreadMutation.isPending}
          onHide={() => setShowThreads(false)}
        />
      )}

      {/* Main Content - Two Panes */}
      <div className="flex min-h-0 flex-1 flex-col lg:min-h-0 xl:flex-row">
        {/* Chat Pane */}
        <div className="chat-panel-transparent relative z-10 flex min-h-0 w-full flex-col backdrop-blur-sm lg:h-full">
          {/* Model Selection Header */}
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
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <h1 className="text-lg font-semibold text-gray-900 sm:text-xl dark:text-gray-100">
                  Chat
                </h1>
              </div>
              <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
                <div className="flex items-center space-x-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Model:
                  </label>
                  <select
                    value={model}
                    onChange={(e) => {
                      const newModel = e.target.value as GeminiModel;
                      setModel(newModel);

                      if (currentThreadId) {
                        updateThreadModelMutation.mutate({
                          threadId: currentThreadId,
                          modelName: newModel,
                        });
                      }
                    }}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-gray-500 focus:ring-2 focus:ring-gray-500/20 focus:outline-none sm:w-auto dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:border-gray-400"
                  >
                    <option value="gemini-2.5-flash-lite">
                      Gemini 2.5 Flash Lite
                    </option>
                    <option value="gemini-2.0-flash-lite">
                      Gemini 2.0 Flash Lite
                    </option>
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowThreads(!showThreads)}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200 ${
                      showThreads
                        ? "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
                        : "bg-gray-100/50 text-gray-500 hover:bg-gray-200/50 dark:bg-gray-700/50 dark:text-gray-500 dark:hover:bg-gray-600/50"
                    }`}
                    title={showThreads ? "Hide Chat List" : "Show Chat List"}
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
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => setShowCalendar(!showCalendar)}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200 ${
                      showCalendar
                        ? "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
                        : "bg-gray-100/50 text-gray-500 hover:bg-gray-200/50 dark:bg-gray-700/50 dark:text-gray-500 dark:hover:bg-gray-600/50"
                    }`}
                    title={showCalendar ? "Hide Calendar" : "Show Calendar"}
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
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <MessagesList
            ref={listRef}
            messages={messages}
            optimisticMessages={optimisticMessages}
            currentThreadId={currentThreadId}
            setCurrentThreadId={setCurrentThreadId}
            showConfirmationButtons={showConfirmationButtons}
            isSendingRef={isSendingRef}
            generateAIResponseMutation={generateAIResponseMutation}
            addMessageMutation={addMessageMutation}
            handleConfirmation={handleConfirmation}
            editedEventDetails={editedEventDetails}
            formatEventDetailsToMessage={formatEventDetailsToMessage}
            formatAIConfirmationMessage={formatAIConfirmationMessage}
          />

          {/* Input */}
          <ChatInput
            ref={inputRef}
            input={input}
            setInput={setInput}
            currentThreadId={currentThreadId}
            isOnline={isOnline}
            isSendingRef={isSendingRef}
            generateAIResponseMutation={generateAIResponseMutation}
            addMessageMutation={addMessageMutation}
            isWebSearching={isWebSearching}
            send={send}
            performWebSearch={performWebSearch}
          />
        </div>

        {/* Calendar Pane */}
        {showCalendar && (
          <CalendarPane
            events={events}
            optimisticEvents={optimisticEvents}
            eventsLoading={eventsLoading}
            eventsError={eventsError}
            fetchEvents={fetchEvents}
            updateEvent={updateEvent}
            deleteEvent={deleteEvent}
            onHide={() => setShowCalendar(false)}
          />
        )}
      </div>

      {/* Event Confirmation Modal */}
      <EventConfirmationModal
        isOpen={isConfirmationModalOpen}
        onClose={handleModalCancel}
        onConfirm={handleModalConfirm}
        onCancel={handleModalCancel}
        eventDetails={pendingEventDetails}
      />
    </div>
  );
}
