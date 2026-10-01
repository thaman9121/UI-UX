import { FormEvent, useMemo, useState } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type Chat = {
  id: string;
  title: string;
  messages: Message[];
};

const starterChats: Chat[] = [
  {
    id: "welcome",
    title: "Welcome to Orbit",
    messages: [
      {
        id: "welcome-1",
        role: "assistant",
        content:
          "Hey — I’m Orbit. Ask me anything, and I’ll stream the answer as it arrives. Web search, files, memory, and multi-model routing are next in the build."
      }
    ]
  }
];

function uid() {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

function titleFrom(text: string) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned.length > 34 ? cleaned.slice(0, 34) + "…" : cleaned || "New chat";
}

export default function App() {
  const [chats, setChats] = useState<Chat[]>(starterChats);
  const [activeId, setActiveId] = useState("welcome");
  const [input, setInput] = useState("");
  const [model, setModel] = useState("gpt-5.6-luna");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState("");

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeId) ?? chats[0],
    [activeId, chats]
  );

  function newChat() {
    const chat: Chat = { id: uid(), title: "New chat", messages: [] };
    setChats((current) => [chat, ...current]);
    setActiveId(chat.id);
    setInput("");
    setError("");
  }

  function updateActiveMessages(messages: Message[]) {
    setChats((current) =>
      current.map((chat) =>
        chat.id === activeId ? { ...chat, messages } : chat
      )
    );
  }

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    const text = input.trim();
    if (!text || isStreaming || !activeChat) return;

    setError("");
    setInput("");

    const userMessage: Message = { id: uid(), role: "user", content: text };
    const assistantMessage: Message = { id: uid(), role: "assistant", content: "" };
    const nextMessages = [...activeChat.messages, userMessage, assistantMessage];

    setChats((current) =>
      current.map((chat) =>
        chat.id === activeId
          ? {
              ...chat,
              title: chat.messages.length === 0 ? titleFrom(text) : chat.title,
              messages: nextMessages
            }
          : chat
      )
    );

    setIsStreaming(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [...activeChat.messages, userMessage]
        })
      });

      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Request failed with ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") continue;

          const eventData = JSON.parse(payload) as
            | { type: "delta"; text: string }
            | { type: "error"; message: string }
            | { type: "done" };

          if (eventData.type === "delta") {
            setChats((current) =>
              current.map((chat) => {
                if (chat.id !== activeId) return chat;
                const messages = [...chat.messages];
                const last = messages[messages.length - 1];
                if (!last || last.role !== "assistant") return chat;
                messages[messages.length - 1] = {
                  ...last,
                  content: last.content + eventData.text
                };
                return { ...chat, messages };
              })
            );
          }

          if (eventData.type === "error") {
            throw new Error(eventData.message);
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      setChats((current) =>
        current.map((chat) => {
          if (chat.id !== activeId) return chat;
          return {
            ...chat,
            messages: chat.messages.map((m, index) =>
              index === chat.messages.length - 1 && m.role === "assistant"
                ? { ...m, content: m.content || "I couldn't complete that response." }
                : m
            )
          };
        })
      );
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">✦</div>
          <div>
            <div className="brand-name">Orbit</div>
            <div className="brand-subtitle">AI workspace</div>
          </div>
        </div>

        <button className="new-chat" onClick={newChat}>
          <span>＋</span>
          New chat
        </button>

        <div className="sidebar-section-label">Recent</div>
        <div className="chat-list">
          {chats.map((chat) => (
            <button
              key={chat.id}
              className={`chat-row ${chat.id === activeId ? "active" : ""}`}
              onClick={() => setActiveId(chat.id)}
            >
              <span className="chat-dot" />
              <span className="chat-title">{chat.title}</span>
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="status-pill">
            <span className="status-dot" />
            Local workspace
          </div>
          <div className="footer-note">Supabase + web search arrive next.</div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="mobile-brand">
            <span className="brand-mark small">✦</span>
            Orbit
          </div>
          <div className="topbar-spacer" />
          <label className="model-select">
            <span>Model</span>
            <select value={model} onChange={(event) => setModel(event.target.value)}>
              <option value="gpt-5.6-luna">Luna</option>
              <option value="gpt-5.6-terra">Terra</option>
              <option value="gpt-5.6-sol">Sol</option>
            </select>
          </label>
        </header>

        <section className="conversation">
          <div className="conversation-inner">
            {activeChat?.messages.length === 0 ? (
              <div className="empty-state">
                <div className="orbital-icon">✦</div>
                <p className="eyebrow">ORBIT AI</p>
                <h1>What are you exploring?</h1>
                <p className="empty-description">
                  Ask a question, brainstorm an idea, debug code, or start a research thread.
                </p>
              </div>
            ) : (
              <div className="message-stack">
                {activeChat?.messages.map((message) => (
                  <article key={message.id} className={`message ${message.role}`}>
                    <div className="avatar">{message.role === "assistant" ? "✦" : "You"}</div>
                    <div className="message-body">
                      <div className="message-role">
                        {message.role === "assistant" ? "Orbit" : "You"}
                      </div>
                      <div className="message-content">
                        {message.content || (isStreaming ? <span className="typing">Thinking…</span> : "")}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {error && <div className="error-banner">{error}</div>}
          </div>
        </section>

        <div className="composer-wrap">
          <form className="composer" onSubmit={sendMessage}>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder="Ask anything…"
              rows={1}
              disabled={isStreaming}
            />
            <div className="composer-actions">
              <div className="composer-hints">
                <span>↵ send</span>
                <span>⇧↵ new line</span>
              </div>
              <button
                className="send-button"
                type="submit"
                disabled={!input.trim() || isStreaming}
                aria-label="Send message"
              >
                {isStreaming ? "…" : "↑"}
              </button>
            </div>
          </form>
          <div className="disclaimer">
            Orbit can make mistakes. Check important information.
          </div>
        </div>
      </main>
    </div>
  );
}
