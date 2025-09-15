import { forwardRef } from "react";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  currentThreadId: string | null;
  isOnline: boolean;
  isSendingRef: React.MutableRefObject<boolean>;
  generateAIResponseMutation: {
    isPending: boolean;
  };
  addMessageMutation: {
    isPending: boolean;
  };
  isWebSearching: boolean;
  send: () => void;
  performWebSearch: () => void;
}

const ChatInput = forwardRef<HTMLInputElement, ChatInputProps>(
  (
    {
      input,
      setInput,
      currentThreadId,
      isOnline,
      isSendingRef,
      generateAIResponseMutation,
      addMessageMutation,
      isWebSearching,
      send,
      performWebSearch,
    },
    ref,
  ) => {
    return (
      <div className="border-t border-gray-200/60 p-4 sm:p-6 dark:border-gray-700/60">
        {/* Network Status Indicator */}
        {!isOnline && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-center space-x-2">
              <div className="flex h-2 w-2 rounded-full bg-red-500"></div>
              <span className="text-sm font-medium text-red-800 dark:text-red-200">
                Offline - Check your internet connection
              </span>
            </div>
          </div>
        )}

        {/* Help text */}
        <div className="mb-4 flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="flex items-center space-x-4 text-xs sm:space-x-6">
            <div className="group flex items-center space-x-2 text-gray-600 dark:text-gray-300">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 transition-all duration-200 group-hover:bg-gray-200 dark:bg-gray-700 dark:group-hover:bg-gray-600">
                <svg
                  className="h-3 w-3 transition-transform duration-200 group-hover:scale-110"
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
              </div>
              <span className="font-medium">AI Chat</span>
            </div>
            <div className="group flex items-center space-x-2 text-gray-600 dark:text-gray-300">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 transition-all duration-200 group-hover:scale-110 group-hover:bg-gray-200 dark:bg-gray-700 dark:group-hover:bg-gray-600">
                <svg
                  className="h-3 w-3 transition-transform duration-200 group-hover:scale-110"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <span className="font-medium">Web Search</span>
            </div>
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500">
            Press Enter to send message
          </div>
        </div>

        <div className="relative flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
          <div className="relative flex-1">
            <input
              ref={ref}
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
                    !addMessageMutation.isPending &&
                    !isWebSearching
                  ) {
                    void send();
                  }
                }
              }}
              placeholder={
                !isOnline
                  ? "You're offline. Check your internet connection."
                  : isSendingRef.current ||
                      generateAIResponseMutation.isPending ||
                      addMessageMutation.isPending ||
                      isWebSearching
                    ? isWebSearching
                      ? "Searching the web..."
                      : "Sending message..."
                    : "Type your message..."
              }
              className="text-refined w-full rounded-xl border border-gray-300 px-4 py-3 pr-12 transition-all duration-200 hover:border-gray-400 focus:border-gray-500 focus:ring-2 focus:ring-gray-500/20 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700/30 dark:text-gray-100 dark:placeholder-gray-400 dark:hover:border-gray-500 dark:focus:border-gray-400 dark:disabled:bg-gray-800"
              disabled={
                !currentThreadId ||
                !isOnline ||
                isSendingRef.current ||
                generateAIResponseMutation.isPending ||
                addMessageMutation.isPending ||
                isWebSearching
              }
            />
            <div className="absolute top-1/2 right-3 -translate-y-1/2">
              {isWebSearching ? (
                <div className="flex h-5 w-5 items-center justify-center">
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                </div>
              ) : (
                <svg
                  className="h-5 w-5 text-gray-400 transition-colors duration-200 dark:text-gray-500"
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
              )}
            </div>
          </div>

          {/* Web Search Button */}
          <button
            onClick={performWebSearch}
            disabled={
              !input.trim() ||
              !currentThreadId ||
              !isOnline ||
              isSendingRef.current ||
              generateAIResponseMutation.isPending ||
              isWebSearching
            }
            className={`group relative flex w-full items-center justify-center space-x-2 rounded-xl px-4 py-3 font-medium text-white transition-all duration-300 sm:w-auto sm:px-5 ${
              isWebSearching
                ? "cursor-wait bg-gradient-to-r from-gray-600 to-gray-700"
                : "bg-gradient-to-r from-gray-700 to-gray-800 hover:scale-[1.02] hover:from-gray-600 hover:to-gray-700 hover:shadow-lg hover:shadow-gray-500/25 active:scale-[0.98]"
            } border border-gray-600/20 hover:border-gray-500/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none`}
            title="Search the web for information"
          >
            {/* Animated background effect */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-gray-500 to-gray-600 opacity-0 transition-opacity duration-300 group-hover:opacity-20 group-disabled:opacity-0" />

            {/* Button content */}
            <div className="relative flex items-center space-x-2">
              {isWebSearching ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent">
                    <div className="h-full w-full animate-pulse rounded-full bg-white/20" />
                  </div>
                  <span className="animate-pulse">Searching...</span>
                </>
              ) : (
                <>
                  <svg
                    className="h-4 w-4 transition-transform duration-200 group-hover:scale-110"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <span className="font-semibold">Search</span>
                </>
              )}
            </div>

            {/* Ripple effect on click */}
            <div className="absolute inset-0 scale-0 rounded-xl bg-white/20 transition-transform duration-150 group-active:scale-100" />

            {/* Ready indicator */}
            {!isWebSearching && input.trim() && (
              <div className="absolute -top-1 -right-1 h-3 w-3 animate-pulse rounded-full border-2 border-white bg-gray-400" />
            )}
          </button>

          {/* Send Button */}
          <button
            onClick={send}
            disabled={
              !input.trim() ||
              !currentThreadId ||
              !isOnline ||
              isSendingRef.current ||
              generateAIResponseMutation.isPending ||
              isWebSearching
            }
            className="hover:shadow-elegant flex w-full items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-gray-800 to-gray-900 px-4 py-3 font-medium text-white transition-all duration-200 hover:scale-[1.02] hover:from-gray-700 hover:to-gray-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-6 dark:from-gray-200 dark:to-gray-300 dark:text-gray-900 dark:hover:from-gray-100 dark:hover:to-gray-200"
          >
            {isSendingRef.current || generateAIResponseMutation.isPending ? (
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
    );
  },
);

ChatInput.displayName = "ChatInput";

export default ChatInput;
