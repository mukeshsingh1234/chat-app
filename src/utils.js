// One shared id for a pair of users, same for both sides
export const chatIdFor = (a, b) => [a, b].sort().join("_");

export const toDate = (ts) =>
  ts && typeof ts.toDate === "function" ? ts.toDate() : null;

const sameDay = (a, b) => a.toDateString() === b.toDateString();

export function formatTime(ts) {
  const d = toDate(ts);
  return d
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";
}

export function dayLabel(d) {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: d.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

// Time shown in the chat list: clock time today, otherwise the day
export function listTime(ts) {
  const d = toDate(ts);
  if (!d) return "";
  const label = dayLabel(d);
  return label === "Today" ? formatTime(ts) : label;
}

// A user counts as online if their heartbeat arrived in the last minute
export function isOnline(lastSeen, now) {
  const d = toDate(lastSeen);
  return !!d && now - d.getTime() < 60000;
}

export function statusText(lastSeen, now) {
  const d = toDate(lastSeen);
  if (!d) return "offline";
  if (now - d.getTime() < 60000) return "online";
  const label = dayLabel(d);
  if (label === "Today") return `last seen today at ${formatTime(lastSeen)}`;
  if (label === "Yesterday") return `last seen yesterday at ${formatTime(lastSeen)}`;
  return `last seen ${label}`;
}