"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";

type ModelKey = "openai" | "anthropic" | "gemini";

export default function ChatPage() {
  const { data: session, status } = useSession();
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [input, setInput] = useState<string>("");
  const [model, setModel] = useState<ModelKey>("openai");
  const [editingThread, setEditingThread] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const hasInitialized = useRef<boolean>(false);

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
    onSuccess: () => {
      void refetchThreads();
      if (currentThreadId === editingThread) {
        setCurrentThreadId(null);
      }
      setEditingThread(null);
    },
  });

  const generateAIResponseMutation = api.ai.generateResponse.useMutation({
    onSuccess: () => {
      void refetchMessages();
    },
  });

  // Initialize by selecting first available thread (don't auto-create)
  useEffect(() => {
    if (session && !hasInitialized.current) {
      hasInitialized.current = true;

      if (threads.length > 0 && !currentThreadId) {
        // Select the first available thread if none is selected
        setCurrentThreadId(threads[0]?.id ?? null);
      }
    }
  }, [session, threads.length, currentThreadId]);

  // Update model selection when thread changes
  useEffect(() => {
    if (currentThreadId && threads.length > 0) {
      const selectedThread = threads.find(
        (thread: any) => thread.id === currentThreadId,
      );
      if (selectedThread) {
        setModel(selectedThread.modelProvider as ModelKey);
      }
    }
  }, [currentThreadId, threads]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

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
      modelProvider: model,
      modelName:
        model === "openai"
          ? "gpt-4"
          : model === "anthropic"
            ? "claude-3-sonnet-20240229"
            : "gemini-2.5-flash-lite",
    });
  };

  const createNewThread = () => {
    createThreadMutation.mutate({
      title: "New Chat",
      modelProvider: model,
      modelName:
        model === "openai"
          ? "gpt-4"
          : model === "anthropic"
            ? "claude-3-sonnet-20240229"
            : "gemini-2.5-flash-lite",
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
      {/* Sidebar */}
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
                        {thread.modelProvider} • {thread.modelName}
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

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col">
        {/* Model Selection Header */}
        <div className="border-b border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Chat</h1>
            <div className="flex items-center space-x-4">
              <select
                value={model}
                onChange={(e) => setModel(e.target.value as ModelKey)}
                className="rounded border border-gray-300 px-3 py-1 text-sm"
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="gemini">Gemini</option>
              </select>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto p-4">
          {!currentThreadId ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center text-gray-500">
                <p className="mb-2 text-lg">Welcome to AI Calendar Assistant</p>
                <p className="text-sm">
                  Select a chat thread or create a new one to start
                </p>
              </div>
            </div>
          ) : (
            messages.map((message: any) => (
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
            ))
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
    </div>
  );
}
