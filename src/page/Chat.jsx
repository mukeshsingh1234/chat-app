import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import { chatIdFor } from "../utils";

function Chat({ user }) {
  const [users, setUsers] = useState([]);
  const [chats, setChats] = useState({});
  const [selectedUid, setSelectedUid] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [visible, setVisible] = useState(document.visibilityState === "visible");

  // Save my profile and send a heartbeat so others can see I'm online
  useEffect(() => {
    const ref = doc(db, "users", user.uid);
    const beat = () =>
      setDoc(
        ref,
        {
          uid: user.uid,
          name: user.displayName || "Unknown",
          email: user.email,
          photo: user.photoURL || "",
          lastSeen: serverTimestamp(),
        },
        { merge: true }
      ).catch(console.error);

    beat();
    const id = setInterval(beat, 25000);
    return () => clearInterval(id);
  }, [user]);

  // Track whether this tab is visible (used for read receipts)
  useEffect(() => {
    const onVisible = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // Re-check "online" status every 20 seconds
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 20000);
    return () => clearInterval(id);
  }, []);

  // All other users
  useEffect(() => {
    return onSnapshot(
      collection(db, "users"),
      (snap) => {
        setUsers(
          snap.docs
            .map((d) => d.data({ serverTimestamps: "estimate" }))
            .filter((u) => u.uid !== user.uid)
        );
      },
      console.error
    );
  }, [user.uid]);

  // My chats (last message, unread counts, read receipts, typing)
  useEffect(() => {
    const q = query(
      collection(db, "chats"),
      where("members", "array-contains", user.uid)
    );
    return onSnapshot(
      q,
      (snap) => {
        setChats(
          Object.fromEntries(
            snap.docs.map((d) => [d.id, d.data({ serverTimestamps: "estimate" })])
          )
        );
      },
      console.error
    );
  }, [user.uid]);

  // Opening a chat marks its messages as read
  useEffect(() => {
    if (!selectedUid || !visible) return;
    const id = chatIdFor(user.uid, selectedUid);
    const unread = chats[id]?.unread?.[user.uid] || 0;
    if (unread > 0) {
      setDoc(
        doc(db, "chats", id),
        {
          unread: { [user.uid]: 0 },
          lastRead: { [user.uid]: serverTimestamp() },
        },
        { merge: true }
      ).catch(console.error);
    }
  }, [chats, selectedUid, user.uid, visible]);

  const other = users.find((u) => u.uid === selectedUid) || null;
  const chat = other ? chats[chatIdFor(user.uid, other.uid)] : null;

  return (
    <div className={`app-shell ${other ? "has-chat" : ""}`}>
      <Sidebar
        user={user}
        users={users}
        chats={chats}
        selectedUid={selectedUid}
        onSelect={setSelectedUid}
      />
      <ChatWindow
        key={selectedUid || "none"}
        user={user}
        other={other}
        chat={chat}
        now={now}
        onBack={() => setSelectedUid(null)}
      />
    </div>
  );
}

export default Chat;