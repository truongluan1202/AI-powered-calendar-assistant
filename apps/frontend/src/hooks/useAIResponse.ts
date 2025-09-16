import { useEffect } from "react";
import { api } from "~/trpc/react";
import { isConfirmationMessage, showToast } from "~/utils/chat";
import type { GeminiModel, OptimisticMessage, Event } from "~/types/chat";

interface UseAIResponseProps {
  currentThreadId: string | null;
  model: GeminiModel;
  optimisticMessages: OptimisticMessage[];
  setOptimisticMessages: React.Dispatch<
    React.SetStateAction<OptimisticMessage[]>
  >;
  setEvents: React.Dispatch<React.SetStateAction<Event[]>>;
  setOptimisticEvents: React.Dispatch<React.SetStateAction<Event[]>>;
  setIsExecutingTool: React.Dispatch<React.SetStateAction<boolean>>;
  setIsStreaming: React.Dispatch<React.SetStateAction<boolean>>;
  setShowConfirmationButtons: React.Dispatch<React.SetStateAction<Set<string>>>;
  setToastMessage: React.Dispatch<React.SetStateAction<string | null>>;
  refetchMessages: () => Promise<any>;
  focusInput: () => void;
  isSendingRef: React.MutableRefObject<boolean>;
  addOptimisticEvent: (eventData: any) => string;
  cleanupOptimisticState: () => void;
}

export const useAIResponse = ({
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
}: UseAIResponseProps) => {
  const generateAIResponseMutation = api.ai.generateResponse.useMutation({
    onSuccess: (data) => {
      setIsExecutingTool(false);
      isSendingRef.current = false;

      // Check if there were tool calls for event creation FIRST
      if (data.toolCalls && data.toolCalls.length > 0) {
        setIsExecutingTool(true);

        // Check if it's a calendar-related tool call
        const hasCalendarTool = data.toolCalls.some(
          (call: any) =>
            call.function.name === "getEvents" ||
            call.function.name === "createEvent" ||
            call.function.name === "handleEventConfirmation",
        );

        if (hasCalendarTool) {
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

          const createEventResults =
            data.toolResults?.filter((result: any) =>
              createEventCalls.some(
                (call: any) => call.id === result.tool_call_id,
              ),
            ) || [];

          createEventResults.forEach((result: any) => {
            if (result.success) {
              const eventData = JSON.parse(result.content);
              setEvents((prev) => [...prev, eventData]);
              setOptimisticEvents((prev) => prev.slice(0, -1));
            } else {
              setOptimisticEvents((prev) => prev.slice(0, -1));
            }
          });
        }

        if (confirmationCalls.length > 0) {
          confirmationCalls.forEach((call: any) => {
            try {
              const args = JSON.parse(call.function.arguments || "{}");
              const { action } = args;

              if (action === "confirm") {
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

      // Handle empty response
      if (!data.content || !data.content.trim()) {
        setOptimisticMessages((prev) =>
          prev.map((msg) =>
            msg.role === "assistant" && msg.isOptimistic
              ? {
                  ...msg,
                  content:
                    "I didn't quite catch that. Could you please rephrase your question or try asking again? I'm here to help with your calendar and any other questions you might have!",
                  isLoading: false,
                }
              : msg,
          ),
        );

        void refetchMessages().then(() => {
          setOptimisticMessages([]);
          setTimeout(() => focusInput(), 100);
        });
        return;
      }

      // Handle final response streaming AFTER tool call handling
      if (data.content?.trim()) {
        if (data.toolCalls && data.toolCalls.length > 0) {
          setTimeout(() => {
            setOptimisticMessages((prev) =>
              prev.map((msg) =>
                msg.role === "assistant" && msg.isOptimistic
                  ? {
                      ...msg,
                      content: "",
                      isLoading: false,
                    }
                  : msg,
              ),
            );

            streamText(data.content || "", () => {
              if (isConfirmationMessage(data.content || "")) {
                setTimeout(() => {
                  setShowConfirmationButtons((prev) => {
                    const newSet = new Set(prev);
                    newSet.add(data.message?.id || `msg-${Date.now()}`);
                    return newSet;
                  });
                }, 100);
              }

              void refetchMessages().then(() => {
                setOptimisticMessages([]);
                setTimeout(() => focusInput(), 100);
              });
            });

            if (
              data.toolCalls?.some(
                (call: any) =>
                  call.function.name === "createEvent" ||
                  (call.function.name === "handleEventConfirmation" &&
                    JSON.parse(call.function.arguments || "{}").action ===
                      "confirm"),
              )
            ) {
              showToast("✅ Event created successfully!", setToastMessage);
              setOptimisticEvents((prev) =>
                prev.map((event) => ({ ...event, isConfirmed: true })),
              );
            }
          }, 2000);
        } else {
          setOptimisticMessages((prev) =>
            prev.map((msg) =>
              msg.role === "assistant" && msg.isOptimistic
                ? {
                    ...msg,
                    content: "",
                    isLoading: false,
                  }
                : msg,
            ),
          );

          streamText(data.content, () => {
            if (isConfirmationMessage(data.content)) {
              setTimeout(() => {
                setShowConfirmationButtons((prev) => {
                  const newSet = new Set(prev);
                  newSet.add(data.message?.id || `msg-${Date.now()}`);
                  return newSet;
                });
              }, 100);
            }

            void refetchMessages().then(() => {
              setOptimisticMessages([]);
              setTimeout(() => focusInput(), 100);
            });
          });
        }
      } else {
        if (data.toolCalls && data.toolCalls.length > 0) {
          if (
            data.toolCalls.some(
              (call: any) =>
                call.function.name === "createEvent" ||
                (call.function.name === "handleEventConfirmation" &&
                  JSON.parse(call.function.arguments || "{}").action ===
                    "confirm"),
            )
          ) {
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

            showToast("✅ Event created successfully!", setToastMessage);
            setOptimisticEvents((prev) =>
              prev.map((event) => ({ ...event, isConfirmed: true })),
            );
          }

          setTimeout(() => {
            void refetchMessages().then(() => {
              setOptimisticMessages([]);
            });
          }, 2000);
        } else {
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

          setTimeout(() => {
            void refetchMessages().then(() => {
              setOptimisticMessages([]);
            });
          }, 2000);
        }
      }
    },
    onError: (error) => {
      cleanupOptimisticState();
      isSendingRef.current = false;

      let userMessage = "Sorry, I encountered an error. Please try again.";
      let toastMessage = "❌ Sorry, I encountered an error. Please try again.";

      if (!navigator.onLine) {
        userMessage =
          "You appear to be offline. Please check your internet connection and try again.";
        toastMessage =
          "📡 You're offline. Please check your internet connection.";
      } else if (
        error.message.includes("Failed to fetch") ||
        error.message.includes("NetworkError") ||
        error.message.includes("ERR_NETWORK") ||
        error.message.includes("ERR_INTERNET_DISCONNECTED") ||
        error.message.includes("ERR_CONNECTION_REFUSED") ||
        error.message.includes("ERR_CONNECTION_TIMED_OUT")
      ) {
        userMessage =
          "Network connection failed. Please check your internet connection and try again.";
        toastMessage =
          "🌐 Network connection failed. Please check your internet.";
      } else if (error.message.includes("Unable to connect to AI service")) {
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

      showToast(toastMessage, setToastMessage);

      const errorMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: userMessage,
        createdAt: new Date(),
        isOptimistic: true,
        isLoading: false,
      };

      setOptimisticMessages((prev) => [...prev, errorMessage]);

      setTimeout(() => {
        setOptimisticMessages((prev) =>
          prev.filter((msg) => msg.id !== errorMessage.id),
        );
      }, 5000);
    },
  });

  // Streaming text effect - streams into optimistic message
  const streamText = (text: string, onComplete?: () => void) => {
    setIsStreaming(true);

    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) {
        const currentText = text.slice(0, index + 1);
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
    }, 20);
  };

  return {
    generateAIResponseMutation,
  };
};
