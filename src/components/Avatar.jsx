import { useState } from "react";

const COLORS = ["#00a884", "#53bdeb", "#ef8d5c", "#9b87f5", "#e86a92", "#4a90d9", "#b8962e"];

function colorFor(name = "") {
  let sum = 0;
  for (const ch of name) sum += ch.charCodeAt(0);
  return COLORS[sum % COLORS.length];
}

function Avatar({ name, photo, size = 49 }) {
  const [broken, setBroken] = useState(false);
  const initial = (name || "?").trim().charAt(0).toUpperCase();

  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: colorFor(name),
      }}
    >
      {photo && !broken ? (
        <img
          src={photo}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
        />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
}

export default Avatar;