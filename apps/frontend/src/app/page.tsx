"use client";

import { useEffect, useState } from "react";

function useBackendBaseUrl() {
  return process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
}

export default function HomePage() {
  const baseUrl = useBackendBaseUrl();

  const [health, setHealth] = useState<string>("?");
  const [echoInput, setEchoInput] = useState<string>("");
  const [echoResponse, setEchoResponse] = useState<string>("");
  const [context, setContext] = useState<string>("");
  const [suggestion, setSuggestion] = useState<string>("");
  const [loadingHealth, setLoadingHealth] = useState<boolean>(false);
  const [loadingEcho, setLoadingEcho] = useState<boolean>(false);
  const [loadingSuggest, setLoadingSuggest] = useState<boolean>(false);

  useEffect(() => {
    const fetchHealth = async () => {
      setLoadingHealth(true);
      try {
        const res = await fetch(`${baseUrl}/health`);
        const data = (await res.json()) as { status?: string };
        setHealth(data.status ?? "unknown");
      } catch {
        setHealth("error");
      } finally {
        setLoadingHealth(false);
      }
    };
    void fetchHealth();
  }, [baseUrl]);

  const doEcho = async () => {
    setLoadingEcho(true);
    try {
      const res = await fetch(`${baseUrl}/echo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: echoInput }),
      });
      const data = (await res.json()) as { echoed?: string };
      setEchoResponse(data.echoed ?? JSON.stringify(data));
    } catch {
      setEchoResponse("request failed");
    } finally {
      setLoadingEcho(false);
    }
  };

  const doSuggest = async () => {
    setLoadingSuggest(true);
    try {
      const res = await fetch(`${baseUrl}/ai/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context }),
      });
      const data = (await res.json()) as { suggestion?: string };
      setSuggestion(data.suggestion ?? JSON.stringify(data));
    } catch {
      setSuggestion("request failed");
    } finally {
      setLoadingSuggest(false);
    }
  };

  return (
    <main
      style={{
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial",
        padding: "2rem",
        maxWidth: 820,
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>
        AI Calendar Assistant (preview)
      </h1>
      <p style={{ color: "#555" }}>
        Backend: <code>{baseUrl}</code> · Health:{" "}
        {loadingHealth ? "loading..." : health}
      </p>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Echo Test</h2>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input
            value={echoInput}
            onChange={(e) => setEchoInput(e.target.value)}
            placeholder="Type a message"
            style={{
              flex: 1,
              padding: 8,
              border: "1px solid #ddd",
              borderRadius: 8,
            }}
          />
          <button
            onClick={doEcho}
            disabled={loadingEcho}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              background: "#111",
              color: "white",
            }}
          >
            {loadingEcho ? "Sending..." : "Send"}
          </button>
        </div>
        {echoResponse && (
          <p style={{ marginTop: 8 }}>
            Response: <code>{echoResponse}</code>
          </p>
        )}
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>AI Suggest (stub)</h2>
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Describe your schedule context or goal..."
          rows={5}
          style={{
            width: "100%",
            padding: 8,
            border: "1px solid #ddd",
            borderRadius: 8,
          }}
        />
        <div style={{ marginTop: 8 }}>
          <button
            onClick={doSuggest}
            disabled={loadingSuggest}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              background: "#2563eb",
              color: "white",
            }}
          >
            {loadingSuggest ? "Thinking..." : "Generate suggestion"}
          </button>
        </div>
        {suggestion && (
          <p style={{ marginTop: 8 }}>
            Suggestion: <code>{suggestion}</code>
          </p>
        )}
      </section>
    </main>
  );
}
