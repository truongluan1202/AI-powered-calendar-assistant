"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useChat } from "~/hooks/useChat";
import { useAIResponse } from "~/hooks/useAIResponse";
import { useCalendar } from "~/hooks/useCalendar";
import { showToast } from "~/utils/chat";
import ThreadSidebar from "~/components/chat/ThreadSidebar";
import CalendarPane from "~/components/chat/CalendarPane";
import MessagesList from "~/components/chat/MessagesList";
import ChatInput from "~/components/chat/ChatInput";
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

  // Focus the input box
  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Clean up all optimistic state
  const cleanupOptimisticState = () => {
    setOptimisticMessages((prev) => {
      const cleanedMessages = prev.filter(
        (msg) =>
          !msg.isOptimistic &&
          !msg.content.includes("Sorry, I encountered an error") &&
          !msg.content.includes("error"),
      );
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
  const { fetchEvents, addOptimisticEvent } = useCalendar({
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
  }, [session, threads.length, currentThreadId]);

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

  // Handle confirmation button clicks
  const handleConfirmation = async (
    action: "confirm" | "cancel",
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

    setShowConfirmationButtons((prev) => {
      const newSet = new Set(prev);
      newSet.delete(messageId);
      return newSet;
    });

    isSendingRef.current = true;

    const userMessage = action;

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
      className="relative z-10 flex min-h-full flex-col lg:h-full lg:flex-row"
      style={{ background: "transparent" }}
    >
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
      />

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
            </div>
          </div>

          {/* Messages */}
          <MessagesList
            ref={listRef}
            messages={messages}
            optimisticMessages={optimisticMessages}
            currentThreadId={currentThreadId}
            showConfirmationButtons={showConfirmationButtons}
            isSendingRef={isSendingRef}
            generateAIResponseMutation={generateAIResponseMutation}
            addMessageMutation={addMessageMutation}
            handleConfirmation={handleConfirmation}
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
        <CalendarPane
          events={events}
          optimisticEvents={optimisticEvents}
          eventsLoading={eventsLoading}
          eventsError={eventsError}
          fetchEvents={fetchEvents}
        />
      </div>
    </div>
  );
}
