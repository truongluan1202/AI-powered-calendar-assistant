"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { chatApi, type ChatMessage, type ChatThread } from "~/lib/api";

type ModelKey = "openai" | "anthropic" | "gemini";

export default function ChatPage() {
  const [currentThread, setCurrentThread] = useState<ChatThread | null>(null);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>("");
  const [model, setModel] = useState<ModelKey>("openai");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [editingThread, setEditingThread] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>("");
  const listRef = useRef<HTMLDivElement | null>(null);

  // Initialize with a default thread
  useEffect(() => {
    const initializeChat = async () => {
      try {
        setError(null);

        // Create a new thread
        const threadResponse = await chatApi.createThread({
          title: "New Chat",
          model_provider: model,
          model_name:
            model === "openai"
              ? "gpt-4"
              : model === "anthropic"
                ? "claude-3-sonnet-20240229"
                : "gemini-2.5-flash-lite",
        });

        // Get the thread details
        const threadsResponse = await chatApi.getThreads();
        const newThread = threadsResponse.threads.find(
          (t) => t.id === threadResponse.thread_id,
        );

        if (newThread) {
          setCurrentThread(newThread);
          setThreads(threadsResponse.threads);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to initialize chat",
        );
      }
    };

    void initializeChat();
  }, [model]);

  // Load messages when thread changes
  useEffect(() => {
    if (!currentThread) return;

    const loadMessages = async () => {
      try {
        setError(null);
        const response = await chatApi.getMessages(currentThread.id);
        setMessages(response.messages);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load messages",
        );
      }
    };

    void loadMessages();
  }, [currentThread]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const send = async () => {
    if (!currentThread || !input.trim()) return;

    const userText = input;
    setInput("");
    setLoading(true);

    try {
      setError(null);

      // Add user message optimistically
      const userMessage: ChatMessage = {
        id: Date.now(),
        role: "user",
        content: userText,
        created_at: new Date().toISOString(),
      };
      setMessages((m) => [...m, userMessage]);

      // Send message to backend
      const response = await chatApi.postMessage(currentThread.id, {
        content: userText,
      });

      // Add assistant response
      setMessages((m) => [...m, response]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
      // Remove the optimistic user message on error
      setMessages((m) => m.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const createNewThread = async () => {
    try {
      setError(null);
      const response = await chatApi.createThread({
        title: "New Chat",
        model_provider: model,
        model_name:
          model === "openai"
            ? "gpt-4"
            : model === "anthropic"
              ? "claude-3-sonnet-20240229"
              : "gemini-2.5-flash-lite",
      });

      // Refresh threads list
      const threadsResponse = await chatApi.getThreads();
      setThreads(threadsResponse.threads);

      // Set new thread as current
      const newThread = threadsResponse.threads.find(
        (t) => t.id === response.thread_id,
      );
      if (newThread) {
        setCurrentThread(newThread);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create new thread",
      );
    }
  };

  const updateThreadTitle = async (threadId: number, newTitle: string) => {
    try {
      setError(null);
      await chatApi.updateThread(threadId, { title: newTitle });

      // Refresh threads list
      const threadsResponse = await chatApi.getThreads();
      setThreads(threadsResponse.threads);

      // Update current thread if it's the one being edited
      if (currentThread?.id === threadId) {
        setCurrentThread({ ...currentThread, title: newTitle });
      }

      setEditingThread(null);
      setEditingTitle("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update thread title",
      );
    }
  };

  const deleteThread = async (threadId: number) => {
    if (
      !confirm(
        "Are you sure you want to delete this chat? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      setError(null);
      await chatApi.deleteThread(threadId);

      // Refresh threads list
      const threadsResponse = await chatApi.getThreads();
      setThreads(threadsResponse.threads);

      // Clear current thread if it was deleted
      if (currentThread?.id === threadId) {
        setCurrentThread(null);
        setMessages([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete thread");
    }
  };

  const startEditing = (thread: ChatThread) => {
    setEditingThread(thread.id);
    setEditingTitle(thread.title);
  };

  const cancelEditing = () => {
    setEditingThread(null);
    setEditingTitle("");
  };

  // Simple markdown renderer for basic formatting
  const renderMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(
        /`(.*?)`/g,
        '<code style="background: #f3f4f6; padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</code>',
      )
      .replace(/\n/g, "<br>");
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Sidebar with threads */}
      <div
        style={{
          width: 250,
          borderRight: "1px solid #e5e7eb",
          padding: 16,
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
          }}
        >
          <Link
            href="/"
            style={{
              display: "inline-block",
              padding: "4px 8px",
              background: "#6b7280",
              color: "white",
              textDecoration: "none",
              borderRadius: 4,
              fontSize: 12,
            }}
          >
            ← Back
          </Link>
          <button
            onClick={createNewThread}
            style={{
              padding: "4px 8px",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: 4,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            + New
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
            }}
          >
            <span>Model</span>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value as ModelKey)}
              style={{ padding: 4, borderRadius: 4, fontSize: 12 }}
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="gemini">Gemini</option>
            </select>
          </label>
        </div>

        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
            Threads
          </h3>
          {threads.map((thread) => (
            <div
              key={thread.id}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                backgroundColor:
                  currentThread?.id === thread.id ? "#f3f4f6" : "transparent",
                marginBottom: 4,
                fontSize: 14,
                position: "relative",
              }}
            >
              {editingThread === thread.id ? (
                <div>
                  <input
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        void updateThreadTitle(thread.id, editingTitle);
                      } else if (e.key === "Escape") {
                        cancelEditing();
                      }
                    }}
                    onBlur={() =>
                      void updateThreadTitle(thread.id, editingTitle)
                    }
                    style={{
                      width: "100%",
                      padding: "4px 8px",
                      border: "1px solid #d1d5db",
                      borderRadius: 4,
                      fontSize: 14,
                    }}
                    autoFocus
                  />
                </div>
              ) : (
                <div
                  onClick={() => setCurrentThread(thread)}
                  style={{ cursor: "pointer" }}
                >
                  <div style={{ fontWeight: 500 }}>{thread.title}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    {thread.model_provider} •{" "}
                    {new Date(thread.created_at).toLocaleDateString()}
                  </div>
                </div>
              )}

              {editingThread !== thread.id && (
                <div
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    display: "flex",
                    gap: 4,
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditing(thread);
                    }}
                    style={{
                      // padding: "2px 6px",
                      // background: "#6b7280",
                      color: "white",
                      border: "none",
                      borderRadius: 3,
                      fontSize: 10,
                      padding: 0,
                      margin: 0,
                      cursor: "pointer",
                    }}
                    title="Rename"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void deleteThread(thread.id);
                    }}
                    style={{
                      padding: "2px 6px",
                      // background: "#dc2626",
                      color: "white",
                      border: "none",
                      borderRadius: 3,
                      fontSize: 15,
                      cursor: "pointer",
                      margin: 0,
                    }}
                    title="Delete"
                  >
                    ❎
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <header
          style={{
            padding: 16,
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>
            {currentThread?.title ?? "Select a thread"}
          </h1>
          {currentThread && (
            <span
              style={{
                fontSize: 12,
                color: "#6b7280",
                background: "#f3f4f6",
                padding: "2px 8px",
                borderRadius: 12,
              }}
            >
              {currentThread.model_provider} • {currentThread.model_name}
            </span>
          )}
        </header>

        {error && (
          <div
            style={{
              padding: 12,
              background: "#fef2f2",
              color: "#dc2626",
              borderBottom: "1px solid #e5e7eb",
              fontSize: 14,
            }}
          >
            Error: {error}
          </div>
        )}

        <div
          ref={listRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 16,
          }}
        >
          {messages.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: "#6b7280",
                marginTop: 40,
                fontSize: 16,
              }}
            >
              Start a conversation by typing a message below
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={`${m.role}-${m.id}`}
                style={{
                  marginBottom: 16,
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    minWidth: 80,
                    fontSize: 14,
                    color: m.role === "assistant" ? "#2563eb" : "#6b7280",
                  }}
                >
                  {m.role === "assistant"
                    ? "Assistant"
                    : m.role === "system"
                      ? "System"
                      : "You"}
                </div>
                <div
                  style={{
                    flex: 1,
                    fontSize: 14,
                    lineHeight: 1.5,
                  }}
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(m.content),
                  }}
                />
              </div>
            ))
          )}
          {loading && (
            <div
              style={{
                padding: 16,
                color: "#6b7280",
                fontSize: 14,
                fontStyle: "italic",
              }}
            >
              Assistant is thinking…
            </div>
          )}
        </div>

        <div
          style={{
            padding: 16,
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            gap: 8,
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask to schedule, reschedule, summarize…"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            disabled={!currentThread || loading}
            style={{
              flex: 1,
              padding: 12,
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              fontSize: 14,
            }}
          />
          <button
            onClick={() => void send()}
            disabled={!currentThread || loading || !input.trim()}
            style={{
              padding: "12px 16px",
              borderRadius: 8,
              background:
                currentThread && !loading && input.trim() ? "#111" : "#9ca3af",
              color: "white",
              border: "none",
              cursor:
                currentThread && !loading && input.trim()
                  ? "pointer"
                  : "not-allowed",
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
