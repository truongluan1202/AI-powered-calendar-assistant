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
      clientKey?: string; // Stable key for streaming
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
  const [showConfirmationButtons, setShowConfirmationButtons] = useState<
    Set<string>
  >(new Set());
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const hasInitialized = useRef<boolean>(false);
  const lastMessageCountRef = useRef<number>(0);
  const isSendingRef = useRef<boolean>(false);

  // Show toast message and auto-hide after 3 seconds
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Check if a message is asking for confirmation
  const isConfirmationMessage = (content: string) => {
    const confirmationKeywords = [
      "Please confirm:",
      "Type 'confirm' to create",
      "Type 'cancel' to abort",
      "Event Details:",
      "📅 **Event Details:**",
    ];
    return confirmationKeywords.some((keyword) => content.includes(keyword));
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
      // Remove all optimistic messages and any error messages
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
    // Don't clear confirmation buttons here - only clear on thread switch
  };

  // Clear confirmation buttons (only called when switching threads)
  const clearConfirmationButtons = () => {
    setShowConfirmationButtons(new Set());
  };

  // Merge messages by serverId to avoid flicker
  const mergeMessages = (serverMessages: any[], optimisticMessages: any[]) => {
    const serverMessageIds = new Set(serverMessages.map((msg) => msg.id));

    // Remove optimistic messages that have been replaced by server messages
    const filteredOptimistic = optimisticMessages.filter(
      (msg) => !msg.isOptimistic || !serverMessageIds.has(msg.id),
    );

    return [...serverMessages, ...filteredOptimistic];
  };

  // Streaming text effect - streams into optimistic message
  const streamText = (text: string, onComplete?: () => void) => {
    setIsStreaming(true);

    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) {
        const currentText = text.slice(0, index + 1);
        // Update the optimistic message content
        setOptimisticMessages((prev) =>
          prev.map((msg) =>
            msg.role === "assistant" && msg.isOptimistic
              ? { ...msg, content: currentText }
              : msg,
          ),
        );
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
      // Reset sending flag on error
      isSendingRef.current = false;
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
      // Don't clear optimistic messages - transform them instead
      setIsExecutingTool(false);
      // Reset sending flag on success
      isSendingRef.current = false;

      // Check if there were tool calls for event creation FIRST
      if (data.toolCalls && data.toolCalls.length > 0) {
        // Set tool execution state to show calendar access message
        setIsExecutingTool(true);

        // Check if it's a calendar-related tool call
        const hasCalendarTool = data.toolCalls.some(
          (call: any) =>
            call.function.name === "getEvents" ||
            call.function.name === "createEvent" ||
            call.function.name === "handleEventConfirmation",
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

        const confirmationCalls = data.toolCalls.filter(
          (call: any) => call.function.name === "handleEventConfirmation",
        );

        if (createEventCalls.length > 0) {
          // Update AI message to show event creation
          setOptimisticMessages((prev) =>
            prev.map((msg) =>
              msg.role === "assistant" && msg.isOptimistic
                ? {
                    ...msg,
                    content: "I am creating an event for you...",
                    isLoading: true,
                  }
                : msg,
            ),
          );

          // Add optimistic event based on the actual tool call arguments
          createEventCalls.forEach((call: any) => {
            try {
              const eventData = JSON.parse(call.function.arguments || "{}");
              addOptimisticEvent({
                summary: eventData.summary || "New Event",
                description: eventData.description || "",
                start: eventData.start?.dateTime || eventData.start,
                end: eventData.end?.dateTime || eventData.end,
                location: eventData.location || "",
              });
            } catch (error) {
              console.error("Failed to parse event data:", error);
              // Add a generic optimistic event if parsing fails
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              tomorrow.setHours(14, 0, 0, 0);

              const endTime = new Date(tomorrow);
              endTime.setHours(
                tomorrow.getHours() + 1,
                tomorrow.getMinutes(),
                0,
                0,
              );

              addOptimisticEvent({
                summary: "New Event",
                description: "Creating event...",
                start: tomorrow.toISOString(),
                end: endTime.toISOString(),
                location: "",
              });
            }
          });

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
              // Update both events and optimistic events in a single state update to prevent flickering
              setEvents((prev) => [...prev, eventData]);
              setOptimisticEvents((prev) => prev.slice(0, -1));
            } else {
              // Just remove failed optimistic events
              setOptimisticEvents((prev) => prev.slice(0, -1));
            }
          });
        }

        if (confirmationCalls.length > 0) {
          // Handle event confirmation calls
          confirmationCalls.forEach((call: any) => {
            try {
              const args = JSON.parse(call.function.arguments || "{}");
              const { action } = args;

              if (action === "confirm") {
                // Update AI message to show event creation
                setOptimisticMessages((prev) =>
                  prev.map((msg) =>
                    msg.role === "assistant" && msg.isOptimistic
                      ? {
                          ...msg,
                          content: "Creating your event...",
                          isLoading: true,
                        }
                      : msg,
                  ),
                );

                // Add optimistic event if eventDetails are provided
                if (args.eventDetails) {
                  addOptimisticEvent({
                    summary: args.eventDetails.summary || "New Event",
                    description: args.eventDetails.description || "",
                    start:
                      args.eventDetails.start?.dateTime ||
                      args.eventDetails.start,
                    end:
                      args.eventDetails.end?.dateTime || args.eventDetails.end,
                    location: args.eventDetails.location || "",
                  });
                }
              } else if (action === "cancel") {
                // Update AI message to show cancellation
                setOptimisticMessages((prev) =>
                  prev.map((msg) =>
                    msg.role === "assistant" && msg.isOptimistic
                      ? {
                          ...msg,
                          content: "Event creation cancelled.",
                          isLoading: false,
                        }
                      : msg,
                  ),
                );
              } else if (action === "modify") {
                // Update AI message to show modification request
                setOptimisticMessages((prev) =>
                  prev.map((msg) =>
                    msg.role === "assistant" && msg.isOptimistic
                      ? {
                          ...msg,
                          content:
                            "I understand you'd like to modify the event. Let me update the details...",
                          isLoading: false,
                        }
                      : msg,
                  ),
                );
              }
            } catch (error) {
              console.error("Failed to parse confirmation call:", error);
            }
          });
        }
      }

      // Handle final response streaming AFTER tool call handling
      if (data.content?.trim()) {
        // If there were tool calls, show them first, then stream the final response
        if (data.toolCalls && data.toolCalls.length > 0) {
          // Show tool call message for 2 seconds, then stream final response
          setTimeout(() => {
            // Clear content to start streaming
            setOptimisticMessages((prev) =>
              prev.map((msg) =>
                msg.role === "assistant" && msg.isOptimistic
                  ? {
                      ...msg,
                      content: "", // Clear content to start streaming
                      isLoading: false,
                    }
                  : msg,
              ),
            );

            // Stream the final response
            streamText(data.content || "", () => {
              // Check if this is a confirmation message and show buttons
              if (isConfirmationMessage(data.content || "")) {
                // Use a timeout to ensure the message is rendered before showing buttons
                setTimeout(() => {
                  setShowConfirmationButtons((prev) => {
                    const newSet = new Set(prev);
                    // Add the specific message ID to show buttons for this message only
                    newSet.add(data.message?.id || `msg-${Date.now()}`);
                    return newSet;
                  });
                }, 100);
              }

              // Fetch and merge real messages after streaming completes
              void refetchMessages().then(() => {
                setOptimisticMessages([]);
                // Focus input after response is complete
                setTimeout(() => focusInput(), 100);
              });
            });

            // Show success toast for event creation if there were createEvent or confirmation tool calls
            if (
              data.toolCalls?.some(
                (call: any) =>
                  call.function.name === "createEvent" ||
                  (call.function.name === "handleEventConfirmation" &&
                    JSON.parse(call.function.arguments || "{}").action ===
                      "confirm"),
              )
            ) {
              showToast("✅ Event created successfully!");

              // Mark any remaining optimistic events as confirmed to stop flickering
              setOptimisticEvents((prev) =>
                prev.map((event) => ({ ...event, isConfirmed: true })),
              );
            }
          }, 2000); // 3 second delay to show tool call message
        } else {
          // No tool calls, stream immediately
          setOptimisticMessages((prev) =>
            prev.map((msg) =>
              msg.role === "assistant" && msg.isOptimistic
                ? {
                    ...msg,
                    content: "", // Clear content to start streaming
                    isLoading: false,
                  }
                : msg,
            ),
          );

          streamText(data.content, () => {
            // Check if this is a confirmation message and show buttons
            if (isConfirmationMessage(data.content)) {
              // Use a timeout to ensure the message is rendered before showing buttons
              setTimeout(() => {
                setShowConfirmationButtons((prev) => {
                  const newSet = new Set(prev);
                  // Add the specific message ID to show buttons for this message only
                  newSet.add(data.message?.id || `msg-${Date.now()}`);
                  return newSet;
                });
              }, 100);
            }

            // Streaming completed, now fetch and merge real messages
            void refetchMessages().then(() => {
              // Clear optimistic messages after successful merge
              setOptimisticMessages([]);
              // Focus input after response is complete
              setTimeout(() => focusInput(), 100);
            });
          });
        }
      } else {
        // Handle empty response - show appropriate message
        if (data.toolCalls && data.toolCalls.length > 0) {
          // If there are tool calls but no content, keep the tool call message
          if (
            data.toolCalls.some(
              (call: any) =>
                call.function.name === "createEvent" ||
                (call.function.name === "handleEventConfirmation" &&
                  JSON.parse(call.function.arguments || "{}").action ===
                    "confirm"),
            )
          ) {
            // For createEvent or confirmation, show success message
            setOptimisticMessages((prev) =>
              prev.map((msg) =>
                msg.role === "assistant" && msg.isOptimistic
                  ? {
                      ...msg,
                      content: "Event created successfully!",
                      isLoading: false,
                    }
                  : msg,
              ),
            );

            showToast("✅ Event created successfully!");

            // Mark any remaining optimistic events as confirmed to stop flickering
            setOptimisticEvents((prev) =>
              prev.map((event) => ({ ...event, isConfirmed: true })),
            );
          }

          // Fetch real messages after a delay
          setTimeout(() => {
            void refetchMessages().then(() => {
              setOptimisticMessages([]);
            });
          }, 2000);
        } else {
          // No tool calls and no content - show error message
          setOptimisticMessages((prev) =>
            prev.map((msg) =>
              msg.role === "assistant" && msg.isOptimistic
                ? {
                    ...msg,
                    content:
                      "I apologize, but I didn't receive a proper response. Please try again.",
                    isLoading: false,
                  }
                : msg,
            ),
          );

          // Fetch real messages
          setTimeout(() => {
            void refetchMessages().then(() => {
              setOptimisticMessages([]);
            });
          }, 2000);
        }
      }
    },
    onError: (error) => {
      // Clean up all optimistic state first
      cleanupOptimisticState();
      // Reset sending flag on error
      isSendingRef.current = false;

      // Determine user-friendly error message based on error type
      let userMessage = "Sorry, I encountered an error. Please try again.";
      let toastMessage = "❌ Sorry, I encountered an error. Please try again.";

      if (error.message.includes("Unable to connect to AI service")) {
        userMessage =
          "I'm unable to connect to the AI service. Please check if the backend is running and try again.";
        toastMessage =
          "🔌 Unable to connect to AI service. Please check backend connection.";
      } else if (error.message.includes("AI service is unavailable")) {
        userMessage =
          "The AI service is currently unavailable. Please try again later.";
        toastMessage =
          "⏳ AI service is temporarily unavailable. Please try again later.";
      } else if (error.message.includes("AI service error")) {
        userMessage =
          "There was an error with the AI service. Please try again.";
        toastMessage = "🤖 AI service error. Please try again.";
      } else if (error.message.includes("AI generation failed")) {
        userMessage = "AI generation failed. Please try again.";
        toastMessage = "⚠️ AI generation failed. Please try again.";
      }

      // Show error toast
      showToast(toastMessage);

      // Add a temporary error message that will be cleaned up immediately
      const errorMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: userMessage,
        createdAt: new Date(),
        isOptimistic: true, // Mark as optimistic so it gets cleaned up
        isLoading: false,
      };

      setOptimisticMessages((prev) => [...prev, errorMessage]);

      // Auto-cleanup error message after 5 seconds (longer for more detailed messages)
      setTimeout(() => {
        setOptimisticMessages((prev) =>
          prev.filter((msg) => msg.id !== errorMessage.id),
        );
      }, 5000);
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
      // Use relative time references that will be properly converted by the tool
      const timeMin = "7 days ago";
      const timeMax = "30 days from now";

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
                  maxResults: 250, // Increased limit to get more events
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
      if (results && results.length > 0) {
        const result = results[0];

        if (result.success) {
          const data = JSON.parse(result.content);
          setEvents(data.events ?? []);
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
    const tmpId = `tmp-${Date.now()}`;
    const optimisticEvent = {
      id: `optimistic-${Date.now()}`,
      tmpId, // Add tmpId for reliable removal
      summary: eventData.summary,
      start: eventData.start?.dateTime || eventData.start,
      end: eventData.end?.dateTime || eventData.end,
      location: eventData.location,
      description: eventData.description,
      attendees: eventData.attendees,
      isOptimistic: true,
    };
    setOptimisticEvents((prev) => [...prev, optimisticEvent]);
    return tmpId; // Return tmpId instead of id
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

      // Focus input when component initializes
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
    cleanupOptimisticState();
    clearConfirmationButtons();
    setStreamingText("");
    lastMessageCountRef.current = 0;
    // Reset sending flag when switching threads
    isSendingRef.current = false;
    // Focus input when switching threads
    setTimeout(() => focusInput(), 100);
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
                  content: "Our model is thinking...",
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

  // Clean up optimistic state when component unmounts
  useEffect(() => {
    return () => {
      cleanupOptimisticState();
      // Reset sending flag when component unmounts
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

    // Prevent multiple calls while processing
    if (
      isSendingRef.current ||
      generateAIResponseMutation.isPending ||
      addMessageMutation.isPending
    ) {
      return;
    }

    // Hide confirmation buttons for this specific message
    setShowConfirmationButtons((prev) => {
      const newSet = new Set(prev);
      newSet.delete(messageId);
      return newSet;
    });

    // Set sending flag
    isSendingRef.current = true;

    const userMessage = action;

    // Add optimistic user message
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

    // Save the user message
    addMessageMutation.mutate({
      threadId: currentThreadId,
      role: "user",
      content: userMessage,
    });

    // Generate AI response
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

    // Prevent multiple calls while processing
    if (
      isSendingRef.current ||
      generateAIResponseMutation.isPending ||
      addMessageMutation.isPending
    ) {
      return;
    }

    // Set sending flag
    isSendingRef.current = true;

    const userMessage = input.trim();
    setInput("");

    // Clean up any existing optimistic state before starting new query
    cleanupOptimisticState();

    // Additional cleanup to ensure no error messages persist
    setOptimisticMessages((prev) => {
      const cleaned = prev.filter(
        (msg) =>
          !msg.content.includes("Sorry, I encountered an error") &&
          !msg.content.includes("error") &&
          !msg.isOptimistic,
      );
      return cleaned;
    });

    // Add optimistic user message immediately
    const optimisticUserMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userMessage,
      createdAt: new Date(),
      isOptimistic: true,
    };

    // Add optimistic AI loading message with stable clientKey
    const optimisticAIMessage = {
      id: `ai-${Date.now()}`,
      role: "assistant",
      content: "Our model is thinking...",
      createdAt: new Date(),
      isOptimistic: true,
      isLoading: true,
      clientKey: `ai-${Date.now()}`, // Stable key for streaming
    };

    setOptimisticMessages((prev) => {
      const newMessages = [...prev, optimisticUserMessage, optimisticAIMessage];
      return newMessages;
    });

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
      .replace(/\*\*(.*?)\*\*/g, "<strong class='font-semibold'>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em class='italic'>$1</em>")
      .replace(
        /`(.*?)`/g,
        "<code class='bg-gray-100 px-2 py-1 rounded-lg text-sm font-mono text-gray-800 dark:bg-gray-700 dark:text-gray-200'>$1</code>",
      )
      .replace(/\n/g, "<br />");
  };

  if (status === "loading") {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-4 border-blue-500 border-t-transparent dark:border-blue-400"></div>
          <div className="text-lg font-medium text-gray-700 dark:text-gray-300">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-blue-600">
            <svg
              className="h-10 w-10 text-white"
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
          <h1 className="mb-4 text-3xl font-bold text-gray-900 dark:text-gray-100">
            Welcome to AI Calendar Assistant
          </h1>
          <p className="mb-8 text-lg text-gray-600 dark:text-gray-300">
            Please sign in to start managing your calendar with AI
          </p>
          <Link
            href="/api/auth/signin"
            className="inline-flex items-center space-x-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-4 font-medium text-white transition-all duration-200 hover:scale-[1.02] hover:from-blue-600 hover:to-blue-700 hover:shadow-lg active:scale-[0.98]"
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
    <div className="flex h-full bg-gray-50 dark:bg-gray-900">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="animate-in slide-in-from-right-5 fixed top-4 right-4 z-50 duration-300">
          <div className="rounded-xl bg-green-500 px-4 py-3 text-white shadow-xl backdrop-blur-sm dark:bg-green-600">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">{toastMessage}</span>
              <button
                onClick={() => setToastMessage(null)}
                className="ml-2 text-white transition-colors hover:text-gray-200"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Left Sidebar - Threads */}
      <div className="flex w-72 flex-col border-r border-gray-200/60 bg-white/80 backdrop-blur-sm dark:border-gray-700/60 dark:bg-gray-800/80">
        <div className="border-b border-gray-200/60 p-6 dark:border-gray-700/60">
          <button
            onClick={createNewThread}
            className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 font-medium text-white transition-all duration-200 hover:scale-[1.02] hover:from-blue-600 hover:to-blue-700 hover:shadow-lg active:scale-[0.98]"
          >
            <span className="flex items-center justify-center space-x-2">
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>New Chat</span>
            </span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {threads.length === 0 ? (
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
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <p className="mb-2 font-medium text-gray-700 dark:text-gray-300">
                No chat threads yet
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Click "New Chat" to start
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {threads.map((thread: any) => (
                <div
                  key={thread.id}
                  className={`group cursor-pointer rounded-xl p-4 transition-all duration-200 ${
                    currentThreadId === thread.id
                      ? "border border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 shadow-sm dark:border-blue-700 dark:from-blue-900/50 dark:to-blue-800/50"
                      : "border border-transparent bg-white/60 hover:border-gray-200 hover:bg-white hover:shadow-sm dark:bg-gray-700/60 dark:hover:border-gray-600 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setCurrentThreadId(thread.id)}
                >
                  {editingThread === thread.id ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-400"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            updateThreadTitle(thread.id, editingTitle);
                          } else if (e.key === "Escape") {
                            cancelEditing();
                          }
                        }}
                        onBlur={() =>
                          updateThreadTitle(thread.id, editingTitle)
                        }
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={() =>
                            updateThreadTitle(thread.id, editingTitle)
                          }
                          className="rounded-lg bg-green-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="rounded-lg bg-gray-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                          {thread.title}
                        </div>
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {thread.modelName}
                        </div>
                      </div>
                      <div className="ml-2 flex space-x-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(thread.id, thread.title);
                          }}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-600 dark:hover:text-gray-300"
                        >
                          <svg
                            className="h-3.5 w-3.5"
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
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteThread(thread.id);
                          }}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/50 dark:hover:text-red-400"
                        >
                          <svg
                            className="h-3.5 w-3.5"
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
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Two Panes */}
      <div className="flex flex-1">
        {/* Chat Pane */}
        <div className="flex h-full w-2/3 flex-col border-r border-gray-200/60 bg-white/80 backdrop-blur-sm dark:border-gray-700/60 dark:bg-gray-800/80">
          {/* Model Selection Header */}
          <div className="border-b border-gray-200/60 bg-white/90 p-6 backdrop-blur-sm dark:border-gray-700/60 dark:bg-gray-800/90">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-blue-600">
                  <svg
                    className="h-4 w-4 text-white"
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
                <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Chat
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:border-blue-400"
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
          <div
            ref={listRef}
            className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6"
          >
            {!currentThreadId ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50">
                    <svg
                      className="h-8 w-8 text-blue-500 dark:text-blue-400"
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
                  <p className="mb-2 text-xl font-semibold text-gray-700 dark:text-gray-300">
                    Welcome to AI Calendar Assistant
                  </p>
                  <p className="text-gray-500 dark:text-gray-400">
                    Select a chat thread or create a new one to start
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* All messages (Real + Optimistic merged) */}
                {mergeMessages(messages, optimisticMessages).map(
                  (message: any) => (
                    <div
                      key={message.clientKey || message.id}
                      className={`flex ${
                        message.role === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`w-fit max-w-[min(32rem,80vw)] rounded-2xl px-5 py-3 break-words shadow-sm ${
                          message.role === "user"
                            ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                            : message.isLoading
                              ? "border border-gray-200/60 bg-gray-50/80 backdrop-blur-sm dark:border-gray-700/60 dark:bg-gray-700/80"
                              : "border border-gray-200/60 bg-white/90 backdrop-blur-sm dark:border-gray-700/60 dark:bg-gray-800/90"
                        }`}
                      >
                        {message.isLoading ? (
                          <div className="space-y-3">
                            <div className="flex items-center space-x-3">
                              <div className="flex space-x-1">
                                <div className="h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.3s] dark:bg-blue-500"></div>
                                <div className="h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.15s] dark:bg-blue-500"></div>
                                <div className="h-2 w-2 animate-bounce rounded-full bg-blue-400 dark:bg-blue-500"></div>
                              </div>
                              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                AI is thinking...
                              </span>
                            </div>
                            {message.content && (
                              <div
                                className="overflow-wrap-anywhere break-words text-gray-700 dark:text-gray-300"
                                dangerouslySetInnerHTML={{
                                  __html: renderMarkdown(message.content),
                                }}
                              />
                            )}
                          </div>
                        ) : (
                          <div
                            className={`overflow-wrap-anywhere leading-relaxed break-words ${
                              message.role === "user"
                                ? "text-white"
                                : "text-gray-900 dark:text-gray-100"
                            }`}
                            dangerouslySetInnerHTML={{
                              __html: renderMarkdown(message.content),
                            }}
                          />
                        )}

                        {/* Confirmation buttons for AI messages asking for confirmation */}
                        {message.role === "assistant" &&
                          !message.isLoading &&
                          isConfirmationMessage(message.content) &&
                          showConfirmationButtons.has(message.id) && (
                            <div className="mt-4 flex space-x-3">
                              <button
                                onClick={() =>
                                  handleConfirmation(
                                    "confirm",
                                    message.clientKey || message.id,
                                  )
                                }
                                disabled={
                                  isSendingRef.current ||
                                  generateAIResponseMutation.isPending ||
                                  addMessageMutation.isPending
                                }
                                className="flex items-center space-x-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 transition-all duration-200 hover:border-green-300 hover:bg-green-100 active:bg-green-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400 dark:hover:border-green-700 dark:hover:bg-green-900/30 dark:active:bg-green-900/40"
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
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                                <span>Confirm</span>
                              </button>
                              <button
                                onClick={() =>
                                  handleConfirmation(
                                    "cancel",
                                    message.clientKey || message.id,
                                  )
                                }
                                disabled={
                                  isSendingRef.current ||
                                  generateAIResponseMutation.isPending ||
                                  addMessageMutation.isPending
                                }
                                className="flex items-center space-x-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 transition-all duration-200 hover:border-gray-300 hover:bg-gray-100 active:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:bg-gray-600 dark:active:bg-gray-800"
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
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                                <span>Cancel</span>
                              </button>
                            </div>
                          )}

                        <div
                          className={`mt-2 text-xs ${
                            message.role === "user"
                              ? "text-blue-100/80"
                              : "text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {new Date(message.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ),
                )}
              </>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-gray-200/60 bg-white/90 p-6 backdrop-blur-sm dark:border-gray-700/60 dark:bg-gray-800/90">
            <div className="flex space-x-3">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      // Only send if not already processing
                      if (
                        !isSendingRef.current &&
                        !generateAIResponseMutation.isPending &&
                        !addMessageMutation.isPending
                      ) {
                        void send();
                      }
                    }
                  }}
                  placeholder={
                    isSendingRef.current ||
                    generateAIResponseMutation.isPending ||
                    addMessageMutation.isPending
                      ? "Sending message..."
                      : "Type your message..."
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-12 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 dark:focus:border-blue-400 dark:disabled:bg-gray-800"
                  disabled={
                    !currentThreadId ||
                    isSendingRef.current ||
                    generateAIResponseMutation.isPending ||
                    addMessageMutation.isPending
                  }
                />
                <div className="absolute top-1/2 right-3 -translate-y-1/2">
                  <svg
                    className="h-5 w-5 text-gray-400 dark:text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                </div>
              </div>
              <button
                onClick={send}
                disabled={
                  !input.trim() ||
                  !currentThreadId ||
                  isSendingRef.current ||
                  generateAIResponseMutation.isPending
                }
                className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-3 font-medium text-white transition-all duration-200 hover:scale-[1.02] hover:from-blue-600 hover:to-blue-700 hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSendingRef.current ||
                generateAIResponseMutation.isPending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    <span>Sending...</span>
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
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                    <span>Send</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Pane */}
        <div className="flex w-1/3 flex-col bg-white/80 backdrop-blur-sm dark:bg-gray-800/80">
          <div className="border-b border-gray-200/60 bg-white/90 p-6 backdrop-blur-sm dark:border-gray-700/60 dark:bg-gray-800/90">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-green-500 to-green-600">
                  <svg
                    className="h-4 w-4 text-white"
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
                className="flex items-center space-x-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
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

          <div className="flex-1 overflow-y-auto p-6">
            {eventsError ? (
              <div className="py-8 text-center text-red-500 dark:text-red-400">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
                  <svg
                    className="h-6 w-6 text-red-500 dark:text-red-400"
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
                  className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
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
                    const isToday =
                      eventDate.toDateString() === now.toDateString();
                    const isPast = eventDate < now;

                    return (
                      <div
                        key={event.id ?? index}
                        className={`rounded-xl border p-4 shadow-sm transition-all duration-200 hover:shadow-md ${
                          isPast
                            ? "border-gray-200/60 bg-gray-50/80 opacity-75 dark:border-gray-700/60 dark:bg-gray-800/80"
                            : isToday
                              ? "border-blue-300/60 bg-gradient-to-r from-blue-50 to-blue-100/80 dark:border-blue-600/60 dark:from-blue-900/50 dark:to-blue-800/50"
                              : "border-gray-200/60 bg-white/90 backdrop-blur-sm dark:border-gray-700/60 dark:bg-gray-800/90"
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
                              {isToday && (
                                <span className="rounded-full bg-blue-500 px-2 py-1 text-xs font-medium text-white dark:bg-blue-600">
                                  Today
                                </span>
                              )}
                              {isPast && (
                                <span className="rounded-full bg-gray-500 px-2 py-1 text-xs font-medium text-white dark:bg-gray-600">
                                  Past
                                </span>
                              )}
                              {event.isOptimistic && !event.isConfirmed && (
                                <span className="rounded-full bg-yellow-500 px-2 py-1 text-xs font-medium text-white dark:bg-yellow-600">
                                  Creating...
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
