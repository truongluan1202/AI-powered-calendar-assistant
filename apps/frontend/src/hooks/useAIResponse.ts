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

        // Determine tool type and update optimistic message once
        const toolType = data.toolCalls.find((call: any) =>
          ["getEvents", "handleEventConfirmation", "webSearch"].includes(
            call.function.name,
          ),
        )?.function.name;

        if (toolType) {
          const messages = {
            getEvents: "Accessing Google Calendar now...",
            handleEventConfirmation: "Accessing Google Calendar now...",
            webSearch: "🔍 Using WebSearch to find information...",
          };

          setOptimisticMessages((prev) =>
            prev.map((msg) =>
              msg.role === "assistant" && msg.isOptimistic
                ? {
                    ...msg,
                    content: messages[toolType as keyof typeof messages],
                    isLoading: true,
                  }
                : msg,
            ),
          );
        }

        const confirmationCalls = data.toolCalls.filter(
          (call: any) => call.function.name === "handleEventConfirmation",
        );

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

                // Clear the loading flag after 2 seconds, but keep the optimistic event
                setTimeout(() => {
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

                  // Also mark the optimistic event as confirmed to remove the "Creating..." flag
                  setOptimisticEvents((prev) =>
                    prev.map((event) => ({ ...event, isConfirmed: true })),
                  );
                }, 2000);
              } else if (action === "modify") {
                // For modify action, we only show the confirmation card - no other processing
                setOptimisticMessages((prev) =>
                  prev.map((msg) =>
                    msg.role === "assistant" && msg.isOptimistic
                      ? {
                          ...msg,
                          content: "Updating event details...",
                          isLoading: true,
                        }
                      : msg,
                  ),
                );

                // Clear the loading flag after 2 seconds for modify actions
                setTimeout(() => {
                  setOptimisticMessages((prev) =>
                    prev.map((msg) =>
                      msg.role === "assistant" && msg.isOptimistic
                        ? {
                            ...msg,
                            content: "Event details updated!",
                            isLoading: false,
                          }
                        : msg,
                    ),
                  );

                  // Also mark the optimistic event as confirmed to remove the "Creating..." flag
                  setOptimisticEvents((prev) =>
                    prev.map((event) => ({ ...event, isConfirmed: true })),
                  );
                }, 2000);
              }
            } catch (error) {
              console.error("Failed to parse confirmation call:", error);
            }
          });

          // Handle confirmation results - but with new backend flow, this may not execute
          // The backend now handles tool results directly and returns confirmation cards
          const confirmationResults =
            data.toolResults?.filter((result: any) =>
              confirmationCalls.some(
                (call: any) => call.id === result.tool_call_id,
              ),
            ) || [];

          // Only process tool results if they exist (old flow)
          if (confirmationResults.length > 0) {
            confirmationResults.forEach((result: any) => {
              if (result.success) {
                try {
                  const args = JSON.parse(
                    confirmationCalls.find(
                      (call: any) => call.id === result.tool_call_id,
                    )?.function.arguments || "{}",
                  );

                  if (args.action === "confirm") {
                    // Show toast only when Google Calendar API call succeeds
                    showToast(
                      "✅ Event created successfully!",
                      setToastMessage,
                    );
                    // Don't set isConfirmed here - let the timeout handle it to ensure users see the flag
                  } else if (args.action === "modify") {
                    // For modify action, the result.content contains the confirmation card
                    console.log(
                      "Modify action completed, confirmation card should be displayed",
                    );
                  }
                } catch (error) {
                  console.error("Failed to parse confirmation result:", error);
                }
              } else {
                // Show error toast when API call fails
                showToast(
                  "❌ Failed to create event. Please try again.",
                  setToastMessage,
                );
              }
            });
          } else {
            // New backend flow: Check if we have confirmation calls but no tool results
            // This means the backend handled the tool results directly
            const hasConfirmAction = confirmationCalls.some((call: any) => {
              try {
                const args = JSON.parse(call.function.arguments || "{}");
                return args.action === "confirm";
              } catch {
                return false;
              }
            });

            if (hasConfirmAction) {
              // Backend handled the confirm action, show success toast
              showToast("✅ Event created successfully!", setToastMessage);
              // Don't set isConfirmed here - let the timeout handle it to ensure users see the flag
            }
          }
        }
      }

      // Handle empty response
      if (!data.content?.trim()) {
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
              // Show confirmation buttons for modify actions, but not for confirm actions (which create events)
              const hasSuccessfulEventCreation = data.toolCalls?.some(
                (call: any) =>
                  call.function.name === "handleEventConfirmation" &&
                  JSON.parse(call.function.arguments || "{}").action ===
                    "confirm",
              );

              const hasModifyAction = data.toolCalls?.some(
                (call: any) =>
                  call.function.name === "handleEventConfirmation" &&
                  JSON.parse(call.function.arguments || "{}").action ===
                    "modify",
              );

              if (
                isConfirmationMessage(data.content || "") &&
                (hasModifyAction || !hasSuccessfulEventCreation)
              ) {
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
      // Clear all optimistic messages and reset state
      cleanupOptimisticState();

      isSendingRef.current = false;
      setIsExecutingTool(false);
      setIsStreaming(false);

      let toastMessage = "❌ Sorry, I encountered an error. Please try again.";

      if (!navigator.onLine) {
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
        toastMessage =
          "🌐 Network connection failed. Please check your internet.";
      } else if (error.message.includes("Unable to connect to AI service")) {
        toastMessage =
          "🔌 Unable to connect to AI service. Please check backend connection.";
      } else if (error.message.includes("AI service is unavailable")) {
        toastMessage =
          "⏳ AI service is temporarily unavailable. Please try again later.";
      } else if (error.message.includes("AI service error")) {
        toastMessage = "🤖 AI service error. Please try again.";
      } else if (error.message.includes("AI generation failed")) {
        toastMessage = "⚠️ AI generation failed. Please try again.";
      } else if (
        error.message.includes("503") ||
        error.message.includes("overloaded")
      ) {
        toastMessage =
          "🚀 AI model is overloaded. Please try again in a few moments.";
      } else if (error.message.includes("UNAVAILABLE")) {
        toastMessage =
          "⏳ AI service is temporarily unavailable. Please try again later.";
      }

      showToast(toastMessage, setToastMessage);

      // Refetch messages to get clean state
      void refetchMessages().then(() => {
        setOptimisticMessages([]);
        setTimeout(() => focusInput(), 100);
      });
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
