// status: "pending" | "sent" | "delivered" | "read"
function Ticks({ status }) {
  if (status === "pending") {
    return (
      <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="#8696a0" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="9" r="6.5" />
        <path d="M9 5.5V9l2.3 1.5" />
      </svg>
    );
  }

  const double = status !== "sent";
  const color = status === "read" ? "#53bdeb" : "#8696a0";

  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={double ? "M1.5 9.5l3.5 3.5 8-9" : "M4 9.5l3.5 3.5 8-9"} />
      {double && <path d="M8 12.5l1 1 8-9" />}
    </svg>
  );
}

export default Ticks;