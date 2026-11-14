import { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import Avatar from "./Avatar";
import Ticks from "./Ticks";
import { chatIdFor, dayLabel, formatTime, isOnline, statusText, toDate } from "../utils";

const EMOJIS = [
  "😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😎", "🤔", "😢",
  "😭", "😡", "😴", "🥳", "😇", "😉", "🙈", "🤝", "👍", "👎",
  "👏", "🙏", "💪", "👋", "🙌", "🔥", "❤️", "💔", "🎉", "✨",
  "🌹", "☕", "🍕", "🎂", "📞", "💬", "✅", "❌", "⭐", "💯",
];

function ChatWindow({ user, other, chat, now, onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [clock, setClock] = useState(Date.now());
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const prevLen = useRef(0);
  const lastTypingWrite = useRef(0);

  const chatId = other ? chatIdFor(user.uid, other.uid) : null;

  // Fast clock so the typing indicator disappears on time
  useEffect(() => {
    const id = setInterval(() => setClock(Date.now()), 1500);
    return () => clearInterval(id);
  }, []);

  // Live messages for this conversation
  useEffect(() => {
    if (!chatId) return;
    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt")
    );
    return onSnapshot(
      q,
      (snap) => {
        setMessages(
          snap.docs.map((d) => ({
            id: d.id,
            pending: d.metadata.hasPendingWrites,
            ...d.data({ serverTimestamps: "estimate" }),
          }))
        );
      },
      (err) => setError(`Could not load messages (${err.code}).`)
    );
  }, [chatId]);

  // Scroll to the newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: prevLen.current === 0 ? "auto" : "smooth",
    });
    prevLen.current = messages.length;
  }, [messages.length]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [chatId]);

  // Grow the text box as the person types
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  // Date dividers and "first message in a group" flags
  const items = useMemo(() => {
    const out = [];
    let lastLabel = "";
    let prev = null;
    messages.forEach((m) => {
      const d = toDate(m.createdAt);
      const label = d ? dayLabel(d) : "";
      if (label && label !== lastLabel) {
        out.push({ type: "day", id: `day-${label}-${m.id}`, label });
        lastLabel = label;
        prev = null;
      }
      out.push({
        type: "msg",
        ...m,
        mine: m.uid === user.uid,
        first: !prev || prev.uid !== m.uid,
      });
      prev = m;
    });
    return out;
  }, [messages, user.uid]);

  const otherTypingMs = other ? chat?.typing?.[other.uid]?.toMillis?.() ?? 0 : 0;
  const otherTyping = otherTypingMs && clock - otherTypingMs < 5000;

  // ✓ sent, ✓✓ delivered, blue ✓✓ read
  const statusOf = (m) => {
    if (m.pending) return "pending";
    const ms = toDate(m.createdAt)?.getTime() ?? 0;
    const read = chat?.lastRead?.[other.uid]?.toMillis?.() ?? 0;
    if (read && read >= ms) return "read";
    const seen = other.lastSeen?.toMillis?.() ?? 0;
    if (seen >= ms) return "delivered";
    return "sent";
  };

  const handleChange = (e) => {
    setInput(e.target.value);
    const t = Date.now();
    if (t - lastTypingWrite.current > 2500) {
      lastTypingWrite.current = t;
      setDoc(
        doc(db, "chats", chatId),
        { members: [user.uid, other.uid], typing: { [user.uid]: serverTimestamp() } },
        { merge: true }
      ).catch(() => {});
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !other) return;
    setInput("");
    setError("");
    setShowEmoji(false);
    lastTypingWrite.current = 0;

    const chatRef = doc(db, "chats", chatId);
    const msgRef = doc(collection(chatRef, "messages"));
    const batch = writeBatch(db);

    batch.set(msgRef, {
      text,
      uid: user.uid,
      createdAt: serverTimestamp(),
    });
    batch.set(
      chatRef,
      {
        members: [user.uid, other.uid],
        lastMessage: text.slice(0, 120),
        lastSender: user.uid,
        lastMessageAt: serverTimestamp(),
        unread: { [other.uid]: increment(1) },
        typing: { [user.uid]: null },
      },
      { merge: true }
    );

    try {
      await batch.commit();
    } catch (err) {
      console.error(err);
      setInput(text);
      setError("Message not sent. Check your connection and try again.");
    }
  };

  const deleteMessage = async (id) => {
    if (!window.confirm("Delete this message for everyone?")) return;
    try {
      await updateDoc(doc(db, "chats", chatId, "messages", id), {
        deleted: true,
        text: "",
      });
    } catch (err) {
      console.error(err);
      setError("Could not delete the message.");
    }
  };

  const addEmoji = (emoji) => {
    setInput((v) => v + emoji);
    inputRef.current?.focus();
  };

  if (!other) {
    return (
      <main className="chat-window empty-state">
        <div className="empty-card">
          <div className="empty-mark">
            <svg width="44" height="44" viewBox="0 0 32 32">
              <path d="M6 7h20v14H15l-6 5v-5H6z" fill="#00a884" />
            </svg>
          </div>
          <h2>Spark Chat</h2>
          <p>
            Send and receive messages in real time. Select a contact from the
            list to open your conversation.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="chat-window">
      <header className="chat-header">
        <button className="icon-btn back-btn" onClick={onBack} aria-label="Back to chats">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <Avatar name={other.name} photo={other.photo} size={40} />
        <div className="chat-title">
          <strong>{other.name}</strong>
          {otherTyping ? (
            <span className="typing">typing...</span>
          ) : (
            <span>{statusText(other.lastSeen, now)}</span>
          )}
        </div>
      </header>

      <div className="messages">
        {items.length === 0 && !error && (
          <p className="hint">No messages yet. Say hello to {other.name}.</p>
        )}

        {items.map((it) =>
          it.type === "day" ? (
            <div key={it.id} className="day-divider">
              <span>{it.label}</span>
            </div>
          ) : (
            <div
              key={it.id}
              className={`msg ${it.mine ? "out" : "in"} ${it.first ? "tail" : ""}`}
            >
              {it.mine && !it.deleted && !it.pending && (
                <button
                  className="msg-del"
                  onClick={() => deleteMessage(it.id)}
                  aria-label="Delete message"
                  title="Delete for everyone"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
              )}

              {it.deleted ? (
                <span className="msg-text deleted">
                  {it.mine ? "You deleted this message" : "This message was deleted"}
                </span>
              ) : (
                <span className="msg-text">{it.text}</span>
              )}

              <span className="msg-meta">
                {formatTime(it.createdAt)}
                {it.mine && <Ticks status={statusOf(it)} />}
              </span>
            </div>
          )
        )}
        <div ref={bottomRef} />
      </div>

      {error && <div className="inline-error">{error}</div>}

      {showEmoji && (
        <div className="emoji-panel">
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => addEmoji(e)} aria-label={`Insert ${e}`}>
              {e}
            </button>
          ))}
        </div>
      )}

      <div className="composer">
        <button
          className="icon-btn"
          onClick={() => setShowEmoji((v) => !v)}
          aria-label="Emoji"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="12" cy="12" r="9.5" />
            <path d="M8 14.5c1 1.5 2.4 2.3 4 2.3s3-.8 4-2.3" />
            <circle cx="9" cy="10" r=".6" fill="currentColor" />
            <circle cx="15" cy="10" r=".6" fill="currentColor" />
          </svg>
        </button>

        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          maxLength={2000}
          onChange={handleChange}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Type a message"
        />

        <button
          className="send-btn"
          onClick={sendMessage}
          disabled={!input.trim()}
          aria-label="Send message"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3.4 20.4 21 12 3.4 3.6l-.01 6.5L15 12 3.39 13.9z" />
          </svg>
        </button>
      </div>
    </main>
  );
}

export default ChatWindow;