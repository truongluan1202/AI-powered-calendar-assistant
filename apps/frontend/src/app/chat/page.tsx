"use client";

import { useEffect, useRef, useState } from "react";

type ModelKey = "openai" | "gemini" | "claude";

function useBackendBaseUrl() {
  return process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
}

export default function ChatPage() {
  const baseUrl = useBackendBaseUrl();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<
    { id: number; role: string; content: string }[]
  >([]);
  const [input, setInput] = useState<string>("");
  const [model, setModel] = useState<ModelKey>("openai");
  const [loading, setLoading] = useState<boolean>(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      const res = await fetch(`${baseUrl}/chat/session`, { method: "POST" });
      const data = (await res.json()) as { session_id: string };
      setSessionId(data.session_id);
      const res2 = await fetch(`${baseUrl}/chat/${data.session_id}/messages`);
      const data2 = (await res2.json()) as {
        messages: { id: number; role: string; content: string }[];
      };
      setMessages(data2.messages);
    };
    void bootstrap();
  }, [baseUrl]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const send = async () => {
    if (!sessionId || !input.trim()) return;
    const userText = input;
    setInput("");
    setMessages((m) => [
      ...m,
      { id: Date.now(), role: "user", content: userText },
    ]);
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/chat/${sessionId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userText, model }),
      });
      const data = (await res.json()) as {
        id: number;
        role: string;
        content: string;
      };
      setMessages((m) => [...m, data]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginRight: "auto" }}>
          Chat with your calendar
        </h1>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>Model</span>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as ModelKey)}
            style={{ padding: 6, borderRadius: 8 }}
          >
            <option value="openai">OpenAI</option>
            <option value="gemini">Gemini</option>
            <option value="claude">Claude</option>
          </select>
        </label>
      </header>

      <div
        ref={listRef}
        style={{
          marginTop: 16,
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          height: 480,
          overflowY: "auto",
          padding: 12,
        }}
      >
        {messages.map((m) => (
          <div
            key={`${m.role}-${m.id}`}
            style={{ padding: "8px 10px", display: "flex", gap: 8 }}
          >
            <div style={{ fontWeight: 600, width: 90 }}>
              {m.role === "assistant"
                ? "Assistant"
                : m.role === "system"
                  ? "System"
                  : "You"}
            </div>
            <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
          </div>
        ))}
        {loading && (
          <div style={{ padding: 8, color: "#6b7280" }}>Thinking…</div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
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
          style={{
            flex: 1,
            padding: 10,
            border: "1px solid #e5e7eb",
            borderRadius: 10,
          }}
        />
        <button
          onClick={() => void send()}
          disabled={!sessionId || loading}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: "#111",
            color: "white",
          }}
        >
          Send
        </button>
      </div>
      {/* Calendar integration removed (no auth backend). */}
    </main>
  );
}
