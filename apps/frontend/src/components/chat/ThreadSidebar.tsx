import type { Thread } from "~/types/chat";

interface ThreadSidebarProps {
  threads: Thread[];
  currentThreadId: string | null;
  setCurrentThreadId: (id: string | null) => void;
  editingThread: string | null;
  setEditingThread: (id: string | null) => void;
  editingTitle: string;
  setEditingTitle: (title: string) => void;
  createNewThread: () => void;
  updateThreadTitle: (threadId: string, newTitle: string) => void;
  deleteThread: (threadId: string) => void;
  startEditing: (threadId: string, currentTitle: string) => void;
  cancelEditing: () => void;
  isDeletingThread?: boolean;
  onHide?: () => void;
}

export default function ThreadSidebar({
  threads,
  currentThreadId,
  setCurrentThreadId,
  editingThread,
  setEditingThread,
  editingTitle,
  setEditingTitle,
  createNewThread,
  updateThreadTitle,
  deleteThread,
  startEditing,
  cancelEditing,
  isDeletingThread = false,
  onHide,
}: ThreadSidebarProps) {
  return (
    <div className="chat-panel-transparent flex w-full flex-col backdrop-blur-sm transition-all duration-300 ease-in-out lg:max-h-full lg:min-h-0 lg:w-70">
      <div className="border-b border-gray-200/60 p-4 sm:p-6 dark:border-gray-700/60">
        <div className="flex items-center justify-between space-x-3">
          <button
            onClick={createNewThread}
            className="hover:shadow-elegant flex-1 rounded-xl bg-gradient-to-r from-gray-800 to-gray-900 px-4 py-1.75 font-medium text-white transition-all duration-200 hover:scale-[1.02] hover:from-gray-700 hover:to-gray-800 active:scale-[0.98] dark:from-gray-200 dark:to-gray-300 dark:text-gray-900 dark:hover:from-gray-100 dark:hover:to-gray-200"
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
      </div>

      <div
        className="mobile-scrollable flex-1 overflow-y-auto p-3 sm:p-4"
        onClick={(e) => {
          // Clear thread if clicking on empty space (not on thread items)
          const target = e.target as HTMLElement;
          const isThreadItem = target.closest("[data-thread-item]");

          if (!isThreadItem) {
            setCurrentThreadId(null);
          }
        }}
      >
        {threads.length === 0 ? (
          <div
            data-thread-item
            className="py-8 text-center text-gray-500 dark:text-gray-400"
          >
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
            <p className="text-refined mb-2 font-medium text-gray-700 dark:text-gray-300">
              No chat threads yet
            </p>
            <p className="text-refined text-sm text-gray-500 dark:text-gray-400">
              Click "New Chat" to start
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {threads.map((thread: any) => (
              <div
                key={thread.id}
                data-thread-item
                className={`group cursor-pointer rounded-xl p-3 transition-all duration-200 sm:p-4 ${
                  currentThreadId === thread.id
                    ? "shadow-refined border border-gray-300 bg-gradient-to-r from-gray-100 to-gray-200 dark:border-gray-600 dark:from-gray-700/10 dark:to-gray-700/50"
                    : "hover:shadow-refined border border-gray-200 bg-white/60 hover:border-gray-400 hover:bg-white dark:border-transparent dark:bg-gray-700/20 dark:hover:border-gray-600 dark:hover:bg-gray-800"
                }`}
                onClick={() => setCurrentThreadId(thread.id)}
              >
                {editingThread === thread.id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-0.5 text-sm focus:border-gray-500 focus:ring-2 focus:ring-gray-500/20 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-gray-400"
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
                    <div className="flex space-x-2">
                      <button
                        onClick={() =>
                          updateThreadTitle(thread.id, editingTitle)
                        }
                        className="rounded-lg bg-gradient-to-r from-gray-600 to-gray-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:from-gray-500 hover:to-gray-600 dark:from-gray-400 dark:to-gray-500 dark:hover:from-gray-300 dark:hover:to-gray-400"
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
                          if (!isDeletingThread) {
                            deleteThread(thread.id);
                          }
                        }}
                        disabled={isDeletingThread}
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
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
  );
}
