import { forwardRef } from "react";
import {
  renderMarkdown,
  isConfirmationMessage,
  mergeMessages,
} from "~/utils/chat";
import type { Message, OptimisticMessage } from "~/types/chat";

interface MessagesListProps {
  messages: Message[];
  optimisticMessages: OptimisticMessage[];
  currentThreadId: string | null;
  setCurrentThreadId: (threadId: string | null) => void;
  showConfirmationButtons: Set<string>;
  isSendingRef: React.MutableRefObject<boolean>;
  generateAIResponseMutation: {
    isPending: boolean;
  };
  addMessageMutation: {
    isPending: boolean;
  };
  handleConfirmation: (
    action: "confirm" | "cancel" | "edit",
    messageId: string,
    eventDetails?: any,
  ) => void;
  editedEventDetails?: any;
  formatEventDetailsToMessage?: (eventDetails: any) => string;
  formatAIConfirmationMessage?: (content: string) => string;
}

const MessagesList = forwardRef<HTMLDivElement, MessagesListProps>(
  (
    {
      messages,
      optimisticMessages,
      currentThreadId,
      setCurrentThreadId,
      showConfirmationButtons,
      isSendingRef,
      generateAIResponseMutation,
      addMessageMutation,
      handleConfirmation,
      editedEventDetails,
      formatEventDetailsToMessage,
      formatAIConfirmationMessage,
    },
    ref,
  ) => {
    if (!currentThreadId) {
      return (
        <div className="flex h-full items-center justify-center">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800/50 dark:to-gray-700/50">
              <svg
                className="h-8 w-8 text-gray-500 dark:text-gray-400"
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
            <p className="mb-2 text-xl font-semibold">
              Welcome to{" "}
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:via-purple-400 dark:to-indigo-400">
                Calendara
              </span>
            </p>
            <p className="text-gray-500 dark:text-gray-400">
              Select a chat thread or create a new one to start
            </p>
          </div>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className="mobile-chat-messages min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:space-y-6 sm:p-6"
      >
        {/* All messages (Real + Optimistic merged) */}
        {mergeMessages(messages, optimisticMessages).map((message: any) => (
          <div
            key={message.clientKey || message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              data-message-content
              className={`shadow-refined w-fit max-w-[min(20rem,85vw)] rounded-2xl px-4 py-3 break-words sm:max-w-[min(32rem,80vw)] sm:px-5 ${
                message.role === "user"
                  ? "bg-gradient-to-r from-gray-700 to-gray-800 text-white dark:from-gray-200 dark:to-gray-300 dark:text-gray-900"
                  : message.isLoading
                    ? "border border-gray-200/60 bg-gray-50/80 backdrop-blur-sm dark:border-gray-700/60 dark:bg-gray-700/80"
                    : "gradient-card border border-gray-200/60 dark:border-gray-700/60"
              }`}
            >
              {message.isLoading ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex space-x-1">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s] dark:bg-gray-500"></div>
                      <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s] dark:bg-gray-500"></div>
                      <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 dark:bg-gray-500"></div>
                    </div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      AI is thinking...
                    </span>
                  </div>
                  {message.content && (
                    <div
                      className="overflow-wrap-anywhere break-words text-gray-700 dark:text-gray-300"
                      dangerouslySetInnerHTML={{
                        __html: renderMarkdown(
                          editedEventDetails && formatEventDetailsToMessage
                            ? formatEventDetailsToMessage(editedEventDetails)
                            : formatAIConfirmationMessage
                              ? formatAIConfirmationMessage(message.content)
                              : message.content,
                        ),
                      }}
                    />
                  )}
                </div>
              ) : (
                <div
                  className={`overflow-wrap-anywhere text-refined leading-relaxed break-words ${
                    message.role === "user"
                      ? "text-white dark:text-gray-900"
                      : "text-gray-900 dark:text-gray-100"
                  }`}
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(
                      editedEventDetails &&
                        formatEventDetailsToMessage &&
                        isConfirmationMessage(message.content)
                        ? formatEventDetailsToMessage(editedEventDetails)
                        : formatAIConfirmationMessage &&
                            isConfirmationMessage(message.content)
                          ? formatAIConfirmationMessage(message.content)
                          : message.content,
                    ),
                  }}
                />
              )}

              {/* Confirmation buttons for AI messages asking for confirmation */}
              {message.role === "assistant" &&
                !message.isLoading &&
                isConfirmationMessage(message.content) &&
                showConfirmationButtons.has(message.id) && (
                  <div className="mt-4 flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-3">
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
                      className="flex w-full items-center justify-center space-x-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 transition-all duration-200 hover:border-gray-300 hover:bg-gray-100 active:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto dark:border-gray-700 dark:bg-gray-800/20 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-800/30 dark:active:bg-gray-800/40"
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
                          "edit",
                          message.clientKey || message.id,
                        )
                      }
                      disabled={
                        isSendingRef.current ||
                        generateAIResponseMutation.isPending ||
                        addMessageMutation.isPending
                      }
                      className="flex w-full items-center justify-center space-x-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 transition-all duration-200 hover:border-gray-300 hover:bg-gray-100 active:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto dark:border-gray-700 dark:bg-gray-800/20 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-800/30 dark:active:bg-gray-800/40"
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
                      <span>Edit</span>
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
                      className="flex w-full items-center justify-center space-x-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 transition-all duration-200 hover:border-gray-300 hover:bg-gray-100 active:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:bg-gray-600 dark:active:bg-gray-800"
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
                className={`text-refined mt-2 text-xs ${
                  message.role === "user"
                    ? "text-white/70 dark:text-gray-900/70"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {new Date(message.createdAt).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  },
);

MessagesList.displayName = "MessagesList";

export default MessagesList;
