"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";

type GeminiModel =
  | "gemini-2.5-flash-lite"
  | "gemini-2.0-flash-lite"
  | "gemini-2.5-flash"
  | "gemini-2.0-flash";

export default function ChatPage() {
  const { data: session, status } = useSession();
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [input, setInput] = useState<string>("");
  const [model, setModel] = useState<GeminiModel>("gemini-2.5-flash-lite");
  const [editingThread, setEditingThread] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>("");
  const [optimisticMessages, setOptimisticMessages] = useState<
    Array<{
      id: string;
      role: string;
      content: string;
      createdAt: Date;
      isOptimistic: boolean;
      isLoading?: boolean;
    }>
  >([]);
  const [events, setEvents] = useState<any[]>([]);
  const [optimisticEvents, setOptimisticEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isExecutingTool, setIsExecutingTool] = useState(false);
  const [streamingText, setStreamingText] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const hasInitialized = useRef<boolean>(false);
  const lastMessageCountRef = useRef<number>(0);

  // Show toast message and auto-hide after 3 seconds
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Streaming text effect
  const streamText = (text: string, onComplete?: () => void) => {
    setIsStreaming(true);
    setStreamingText("");

    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) {
        setStreamingText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
        setIsStreaming(false);
        onComplete?.();
      }
    }, 20); // Adjust speed as needed (20ms per character)
  };

  // tRPC queries and mutations
  const threadsQuery = api.chat.getThreads.useQuery(undefined, {
    enabled: !!session,
  });
  const threads = threadsQuery.data ?? [];
  const refetchThreads = threadsQuery.refetch;

  const messagesQuery = api.chat.getMessages.useQuery(
    { threadId: currentThreadId! },
    { enabled: !!currentThreadId && !!session },
  );
  const messages = messagesQuery.data ?? [];
  const refetchMessages = messagesQuery.refetch;

  const availableProvidersQuery = api.ai.getAvailableProviders.useQuery();
  const availableProviders = availableProvidersQuery.data;

  const createThreadMutation = api.chat.createThread.useMutation({
    onSuccess: (newThread) => {
      setCurrentThreadId(newThread.id);
      void refetchThreads();
    },
  });

  const addMessageMutation = api.chat.addMessage.useMutation({
    onSuccess: () => {
      void refetchMessages();
      // Don't remove optimistic user message here - let it be replaced by the real message
    },
    onError: () => {
      // Remove optimistic user message on error
      setOptimisticMessages((prev) =>
        prev.filter((msg) => !msg.isOptimistic || msg.role !== "user"),
      );
    },
  });

  const updateThreadMutation = api.chat.updateThread.useMutation({
    onSuccess: () => {
      void refetchThreads();
      setEditingThread(null);
      setEditingTitle("");
    },
  });

  const deleteThreadMutation = api.chat.deleteThread.useMutation({
    onSuccess: (_, variables) => {
      void refetchThreads();

      // Clear currentThreadId if the deleted thread is currently selected
      if (currentThreadId === variables.threadId) {
        setCurrentThreadId(null);
        // Clear optimistic messages when current thread is deleted
        setOptimisticMessages([]);
      }

      // Clear editingThread if it matches the deleted thread
      if (editingThread === variables.threadId) {
        setEditingThread(null);
      }
    },
  });

  const updateThreadModelMutation = api.chat.updateThreadModel.useMutation({
    onSuccess: () => {
      void refetchThreads();
    },
  });

  const generateAIResponseMutation = api.ai.generateResponse.useMutation({
    onSuccess: (data) => {
      // Don't refetch messages immediately - we'll do it after streaming

      // Clear optimistic messages after a short delay
      setTimeout(() => {
        setOptimisticMessages([]);
        setIsExecutingTool(false);

        // Start streaming the final response
        if (data.content) {
          streamText(data.content, () => {
            // Streaming completed, now fetch and show real messages
            void refetchMessages();
            setStreamingText("");
          });
        } else {
          // No content to stream, just fetch messages
          void refetchMessages();
        }
      }, 500);

      // Check if there were tool calls for event creation
      if (data.toolCalls && data.toolCalls.length > 0) {
        // Set tool execution state to show calendar access message
        setIsExecutingTool(true);

        // Check if it's a calendar-related tool call
        const hasCalendarTool = data.toolCalls.some(
          (call: any) =>
            call.function.name === "getEvents" ||
            call.function.name === "createEvent",
        );

        if (hasCalendarTool) {
          // Update optimistic message to show calendar access
          setOptimisticMessages((prev) =>
            prev.map((msg) =>
              msg.role === "assistant" && msg.isOptimistic
                ? {
                    ...msg,
                    content: "Accessing Google Calendar now...",
                    isLoading: true,
                  }
                : msg,
            ),
          );
        }
        const createEventCalls = data.toolCalls.filter(
          (call: any) => call.function.name === "createEvent",
        );

        if (createEventCalls.length > 0) {
          // Find the corresponding tool results
          const createEventResults =
            data.toolResults?.filter((result: any) =>
              createEventCalls.some(
                (call: any) => call.id === result.tool_call_id,
              ),
            ) || [];

          // Move successful events from optimistic to real events
          createEventResults.forEach((result: any) => {
            if (result.success) {
              const eventData = JSON.parse(result.content);
              // Remove the most recent optimistic event and add the real one
              setOptimisticEvents((prev) => prev.slice(0, -1));
              setEvents((prev) => [...prev, eventData]);

              // Show success toast
              showToast(
                `✅ Event "${eventData.summary || "Untitled"}" created successfully!`,
              );
            } else {
              // Just remove failed optimistic events
              setOptimisticEvents((prev) => prev.slice(0, -1));
            }
          });
        }
      }
    },
    onError: () => {
      // Remove optimistic AI message on error and show error state
      setOptimisticMessages((prev) =>
        prev.map((msg) =>
          msg.isOptimistic && msg.role === "assistant"
            ? {
                ...msg,
                content: "Sorry, I encountered an error. Please try again.",
                isLoading: false,
              }
            : msg,
        ),
      );
      setIsExecutingTool(false);

      // Remove optimistic events on error
      setOptimisticEvents((prev) => prev.slice(0, -1));
    },
  });

  // Fetch events from Google Calendar
  const fetchEvents = async () => {
    if (!session?.access_token) {
      console.error("No access token available for fetching events");
      setEventsError("No access token available");
      return;
    }

    setEventsLoading(true);
    setEventsError(null);
    // Clear optimistic events when refreshing
    setOptimisticEvents([]);

    try {
      const timeMin = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000,
      ).toISOString(); // 7 days ago
      const timeMax = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString(); // 30 days from now

      console.log("Fetching events from Google Calendar...");
      console.log("Time range:", { timeMin, timeMax });

      const response = await fetch("/api/tools/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          toolCalls: [
            {
              id: "fetch-events",
              type: "function",
              function: {
                name: "getEvents",
                arguments: JSON.stringify({
                  timeMin,
                  timeMax,
                  maxResults: 50,
                }),
              },
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to fetch events:", response.status, errorText);
        setEventsError(
          `Failed to fetch events: ${response.status} ${errorText}`,
        );
        return;
      }

      const { results } = await response.json();
      console.log("Tool execution results:", results);

      if (results && results.length > 0) {
        const result = results[0];
        console.log("First result:", result);

        if (result.success) {
          const data = JSON.parse(result.content);
          console.log("Parsed event data:", data);
          setEvents(data.events ?? []);
          console.log(`Successfully loaded ${data.events?.length || 0} events`);
          setEventsError(null);

          // Show refresh success toast
          const eventCount = data.events?.length || 0;
          showToast(
            `📅 Calendar refreshed! Found ${eventCount} event${eventCount !== 1 ? "s" : ""}`,
          );
        } else {
          console.error("Tool execution failed:", result.error);
          setEventsError(`Tool execution failed: ${result.error}`);
        }
      } else {
        console.error("No results returned from tool execution");
        setEventsError("No results returned from tool execution");
      }
    } catch (error) {
      console.error("Failed to fetch events:", error);
      setEventsError(
        `Failed to fetch events: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setEventsLoading(false);
    }
  };

  // Add optimistic event
  const addOptimisticEvent = (eventData: any) => {
    const optimisticEvent = {
      id: `optimistic-${Date.now()}`,
      summary: eventData.summary,
      start: eventData.start?.dateTime || eventData.start,
      end: eventData.end?.dateTime || eventData.end,
      location: eventData.location,
      description: eventData.description,
      attendees: eventData.attendees,
      isOptimistic: true,
    };
    setOptimisticEvents((prev) => [...prev, optimisticEvent]);
    return optimisticEvent.id;
  };

  // Initialize by selecting first available thread (don't auto-create)
  useEffect(() => {
    if (session && !hasInitialized.current) {
      hasInitialized.current = true;

      if (threads.length > 0 && !currentThreadId) {
        // Select the first available thread if none is selected
        setCurrentThreadId(threads[0]?.id ?? null);
      }

      // Fetch events when session is available
      void fetchEvents();
    }
  }, [session, threads.length, currentThreadId]);

  // Handle case where current thread no longer exists (e.g., after deletion)
  useEffect(() => {
    if (currentThreadId && threads.length > 0) {
      const threadExists = threads.some(
        (thread: any) => thread.id === currentThreadId,
      );
      if (!threadExists) {
        // Current thread no longer exists, select the first available thread
        setCurrentThreadId(threads[0]?.id ?? null);
      }
    } else if (currentThreadId && threads.length === 0) {
      // No threads left, clear current thread
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
        // Validate that the modelName is a valid GeminiModel
        const validModels: GeminiModel[] = [
          "gemini-2.5-flash-lite",
          "gemini-2.0-flash-lite",
          "gemini-2.5-flash",
          "gemini-2.0-flash",
        ];

        if (validModels.includes(selectedThread.modelName as GeminiModel)) {
          setModel(selectedThread.modelName as GeminiModel);
        } else {
          // Fallback to default model if thread has invalid model
          setModel("gemini-2.5-flash-lite");
        }
      }
    }
  }, [currentThreadId, threads]);

  // Clear optimistic messages when switching threads
  useEffect(() => {
    setOptimisticMessages([]);
    setStreamingText("");
    setIsStreaming(false);
    lastMessageCountRef.current = 0;
  }, [currentThreadId]);

  // Update optimistic AI message to show loading state, remove user messages
  useEffect(() => {
    if (
      messages.length > lastMessageCountRef.current &&
      optimisticMessages.length > 0
    ) {
      // New messages arrived, remove optimistic user messages but keep AI message with loading
      setOptimisticMessages((prev) =>
        prev
          .filter((msg) => msg.role !== "user") // Remove optimistic user messages
          .map((msg) =>
            msg.role === "assistant" && msg.isOptimistic
              ? {
                  ...msg,
                  content: "I'm processing your request...",
                  isLoading: true,
                }
              : msg,
          ),
      );
      // Clear streaming text when new messages arrive
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
                content: "I'm processing your request...",
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

  const send = async () => {
    if (!input.trim()) return;

    if (!currentThreadId) {
      console.error(
        "No thread selected. Please wait for thread initialization or create a new thread.",
      );
      return;
    }

    const userMessage = input.trim();
    setInput("");

    // Check if this looks like an event creation request (more specific)
    const isEventCreation =
      /(create|schedule|add|book|plan|arrange)\s+(a\s+)?(meeting|appointment|event|call|conference)/i.test(
        userMessage,
      ) ||
      /(meeting|appointment|event|call|conference)\s+(with|for|at)/i.test(
        userMessage,
      );

    // Add optimistic user message immediately
    const optimisticUserMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userMessage,
      createdAt: new Date(),
      isOptimistic: true,
    };

    // Add optimistic AI loading message
    const optimisticAIMessage = {
      id: `ai-${Date.now()}`,
      role: "assistant",
      content: "I'm processing your request...",
      createdAt: new Date(),
      isOptimistic: true,
      isLoading: true,
    };

    setOptimisticMessages((prev) => [
      ...prev,
      optimisticUserMessage,
      optimisticAIMessage,
    ]);

    // If this looks like event creation, add a placeholder optimistic event
    if (isEventCreation) {
      // Try to extract time information from the message
      const timeRegex = /(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/i;
      const timeMatch = timeRegex.exec(userMessage);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (timeMatch?.[1]) {
        const hour = parseInt(timeMatch[1]);
        const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        const period = timeMatch[3]?.toLowerCase();

        let adjustedHour = hour;
        if (period === "pm" && hour !== 12) {
          adjustedHour = hour + 12;
        } else if (period === "am" && hour === 12) {
          adjustedHour = 0;
        }

        tomorrow.setHours(adjustedHour, minute, 0, 0);
      } else {
        tomorrow.setHours(14, 0, 0, 0); // Default to 2 PM
      }

      const endTime = new Date(tomorrow);
      endTime.setHours(tomorrow.getHours() + 1, tomorrow.getMinutes(), 0, 0);

      // Extract event title from the message
      const titleRegex =
        /(?:create|schedule|add|book|plan|arrange)\s+(.+?)(?:\s+(?:at|on|for|tomorrow|today|next week))/i;
      const titleMatch = titleRegex.exec(userMessage);
      const eventTitle = titleMatch?.[1]?.trim() ?? "New Event";

      addOptimisticEvent({
        summary: eventTitle,
        description: userMessage,
        start: tomorrow.toISOString(),
        end: endTime.toISOString(),
        location: "",
      });
    }

    // First save the user message
    addMessageMutation.mutate({
      threadId: currentThreadId,
      role: "user",
      content: userMessage,
    });

    // Then generate AI response
    generateAIResponseMutation.mutate({
      threadId: currentThreadId,
      message: userMessage,
      modelProvider: "gemini",
      modelName: model,
    });
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

  const renderMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(
        /`(.*?)`/g,
        "<code class='bg-gray-100 px-1 py-0.5 rounded text-sm'>$1</code>",
      )
      .replace(/\n/g, "<br />");
  };

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold">
            Please sign in to use the chat
          </h1>
          <Link
            href="/api/auth/signin"
            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="animate-in slide-in-from-right-5 fixed top-4 right-4 z-50 duration-300">
          <div className="rounded-lg bg-green-500 px-4 py-3 text-white shadow-lg">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">{toastMessage}</span>
              <button
                onClick={() => setToastMessage(null)}
                className="ml-2 text-white hover:text-gray-200"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Left Sidebar - Threads */}
      <div className="flex w-64 flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-4">
          <button
            onClick={createNewThread}
            className="w-full rounded bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
          >
            + New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {threads.length === 0 ? (
            <div className="text-center text-gray-500">
              <p className="mb-2">No chat threads yet</p>
              <p className="text-sm">Click "New Chat" to start</p>
            </div>
          ) : (
            threads.map((thread: any) => (
              <div
                key={thread.id}
                className={`mb-2 cursor-pointer rounded-lg p-3 transition-colors ${
                  currentThreadId === thread.id
                    ? "border border-blue-300 bg-blue-100"
                    : "bg-gray-50 hover:bg-gray-100"
                }`}
                onClick={() => setCurrentThreadId(thread.id)}
              >
                {editingThread === thread.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      className="w-full rounded border px-2 py-1 text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          updateThreadTitle(thread.id, editingTitle);
                        } else if (e.key === "Escape") {
                          cancelEditing();
                        }
                      }}
                      onBlur={() => updateThreadTitle(thread.id, editingTitle)}
                    />
                    <div className="flex space-x-1">
                      <button
                        onClick={() =>
                          updateThreadTitle(thread.id, editingTitle)
                        }
                        className="rounded bg-green-500 px-2 py-1 text-xs text-white hover:bg-green-600"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="rounded bg-gray-500 px-2 py-1 text-xs text-white hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-gray-900">
                        {thread.title}
                      </div>
                      <div className="text-xs text-gray-500">
                        {thread.modelName}
                      </div>
                    </div>
                    <div className="ml-2 flex space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(thread.id, thread.title);
                        }}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteThread(thread.id);
                        }}
                        className="text-xs text-gray-400 hover:text-red-600"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content - Two Panes */}
      <div className="flex flex-1">
        {/* Chat Pane */}
        <div className="flex w-2/3 flex-col border-r border-gray-200">
          {/* Model Selection Header */}
          <div className="border-b border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold">Chat</h1>
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">
                  Model:
                </label>
                <select
                  value={model}
                  onChange={(e) => {
                    const newModel = e.target.value as GeminiModel;
                    setModel(newModel);

                    // Persist the model selection to the current thread
                    if (currentThreadId) {
                      updateThreadModelMutation.mutate({
                        threadId: currentThreadId,
                        modelName: newModel,
                      });
                    }
                  }}
                  className="rounded border border-gray-300 px-3 py-1 text-sm"
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
          <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto p-4">
            {!currentThreadId ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center text-gray-500">
                  <p className="mb-2 text-lg">
                    Welcome to AI Calendar Assistant
                  </p>
                  <p className="text-sm">
                    Select a chat thread or create a new one to start
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Real messages from database */}
                {messages.map((message: any) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-3xl rounded-lg px-4 py-2 ${
                        message.role === "user"
                          ? "bg-blue-500 text-white"
                          : "border border-gray-200 bg-white"
                      }`}
                    >
                      <div
                        dangerouslySetInnerHTML={{
                          __html: renderMarkdown(message.content),
                        }}
                      />
                      <div
                        className={`mt-1 text-xs ${
                          message.role === "user"
                            ? "text-blue-100"
                            : "text-gray-500"
                        }`}
                      >
                        {new Date(message.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Streaming text display */}
                {isStreaming && streamingText && (
                  <div className="flex justify-start">
                    <div className="max-w-3xl rounded-lg border border-gray-200 bg-white px-4 py-2">
                      <div
                        dangerouslySetInnerHTML={{
                          __html: renderMarkdown(streamingText),
                        }}
                      />
                      <div className="mt-1 text-xs text-gray-500">
                        {new Date().toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                )}

                {/* Optimistic messages */}
                {optimisticMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-3xl rounded-lg px-4 py-2 ${
                        message.role === "user"
                          ? "bg-blue-500 text-white"
                          : message.isLoading
                            ? "border border-gray-200 bg-gray-50"
                            : "border border-gray-200 bg-white"
                      }`}
                    >
                      {message.isLoading ? (
                        <div className="flex items-center space-x-3">
                          <div className="flex space-x-1">
                            <div className="h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.3s]"></div>
                            <div className="h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.15s]"></div>
                            <div className="h-2 w-2 animate-bounce rounded-full bg-blue-400"></div>
                          </div>
                          <span className="font-medium text-gray-600">
                            {message.content}
                          </span>
                        </div>
                      ) : (
                        <div
                          dangerouslySetInnerHTML={{
                            __html: renderMarkdown(message.content),
                          }}
                        />
                      )}
                      <div
                        className={`mt-1 text-xs ${
                          message.role === "user"
                            ? "text-blue-100"
                            : "text-gray-500"
                        }`}
                      >
                        {message.createdAt.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 bg-white p-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder="Type your message..."
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                disabled={!currentThreadId}
              />
              <button
                onClick={send}
                disabled={
                  !input.trim() ||
                  !currentThreadId ||
                  generateAIResponseMutation.isPending
                }
                className="rounded-lg bg-blue-500 px-6 py-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generateAIResponseMutation.isPending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Pane */}
        <div className="flex w-1/3 flex-col bg-white">
          <div className="border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Calendar</h2>
              <button
                onClick={fetchEvents}
                disabled={eventsLoading}
                className="rounded-md bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200 disabled:opacity-50"
              >
                {eventsLoading ? "Loading..." : "Refresh"}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {eventsError ? (
              <div className="text-center text-red-500">
                <p className="mb-2">Error loading events</p>
                <p className="text-sm">{eventsError}</p>
                <button
                  onClick={fetchEvents}
                  className="mt-2 rounded bg-red-500 px-3 py-1 text-xs text-white hover:bg-red-600"
                >
                  Try Again
                </button>
              </div>
            ) : events.length === 0 && optimisticEvents.length === 0 ? (
              <div className="text-center text-gray-500">
                <p className="mb-2">No events scheduled</p>
                <p className="text-sm">Ask me to create an event!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* All Events (Real + Optimistic) */}
                {[...events, ...optimisticEvents].map((event, index) => (
                  <div
                    key={event.id ?? index}
                    className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">
                        {event.summary}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {new Date(event.start).toLocaleString()}
                      </p>
                      {event.location && (
                        <p className="text-xs text-gray-500">
                          📍 {event.location}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
