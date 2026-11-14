import { useMemo, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import Avatar from "./Avatar";
import { chatIdFor, listTime } from "../utils";

function Sidebar({ user, users, chats, selectedUid, onSelect }) {
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users
      .filter((u) => !q || (u.name || "").toLowerCase().includes(q))
      .map((u) => ({ u, chat: chats[chatIdFor(user.uid, u.uid)] }))
      .sort((a, b) => {
        const ta = a.chat?.lastMessageAt?.toMillis?.() ?? 0;
        const tb = b.chat?.lastMessageAt?.toMillis?.() ?? 0;
        if (tb !== ta) return tb - ta;
        return (a.u.name || "").localeCompare(b.u.name || "");
      });
  }, [users, chats, search, user.uid]);

  return (
    <aside className="sidebar">
      <header className="sidebar-top">
        <Avatar name={user.displayName} photo={user.photoURL} size={40} />
        <span className="grow">Chats</span>
        <button className="icon-btn" onClick={() => signOut(auth)} aria-label="Log out" title="Log out">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
        </button>
      </header>

      <div className="search-wrap">
        <label className="search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Search or start a new chat"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>

      <div className="user-list">
        {users.length === 0 && (
          <p className="side-empty">
            No contacts yet. Ask a friend to sign in with their Google account
            and they will show up here.
          </p>
        )}

        {users.length > 0 && rows.length === 0 && (
          <p className="side-empty">No chats or contacts found.</p>
        )}

        {rows.map(({ u, chat }) => {
          const unread = chat?.unread?.[user.uid] || 0;
          const typingMs = chat?.typing?.[u.uid]?.toMillis?.() ?? 0;
          const isTyping = typingMs && Date.now() - typingMs < 5000;
          const preview = chat?.lastMessage
            ? `${chat.lastSender === user.uid ? "You: " : ""}${chat.lastMessage}`
            : "Tap to start chatting";

          return (
            <button
              key={u.uid}
              className={`user-row ${selectedUid === u.uid ? "active" : ""}`}
              onClick={() => onSelect(u.uid)}
            >
              <Avatar name={u.name} photo={u.photo} />
              <div className="user-meta">
                <div className="user-line">
                  <span className="user-name">{u.name}</span>
                  <span className={`user-time ${unread ? "unread" : ""}`}>
                    {listTime(chat?.lastMessageAt)}
                  </span>
                </div>
                <div className="user-line">
                  <span className={`user-preview ${isTyping ? "typing" : ""}`}>
                    {isTyping ? "typing..." : preview}
                  </span>
                  {unread > 0 && (
                    <span className="badge">{unread > 99 ? "99+" : unread}</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

export default Sidebar;