import { useState, useEffect, useRef } from "react";
import { FONTS, Z_INDEX } from "../styles/theme";
import { COLLAB_CURSOR_FADE_MS } from "../constants";

function CursorArrow({ color }) {
  return (
    <svg width="12" height="16" viewBox="0 0 12 16" fill="none" style={{ display: "block" }}>
      <path
        d="M1 1L11 8L6.5 8.5L4.5 15L1 1Z"
        fill={color}
        stroke="rgba(0,0,0,0.4)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RemoteCursor({ cursor }) {
  const [labelVisible, setLabelVisible] = useState(true);
  const fadeTimerRef = useRef(null);
  const prevPosRef = useRef({ x: cursor.x, y: cursor.y });

  useEffect(() => {
    // Detect movement
    if (cursor.x !== prevPosRef.current.x || cursor.y !== prevPosRef.current.y) {
      prevPosRef.current = { x: cursor.x, y: cursor.y };
      setLabelVisible(true);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = setTimeout(() => setLabelVisible(false), COLLAB_CURSOR_FADE_MS);
    }
    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [cursor.x, cursor.y]);

  return (
    <div
      style={{
        position: "absolute",
        left: cursor.x,
        top: cursor.y,
        pointerEvents: "none",
        zIndex: Z_INDEX.remoteCursor,
        transition: "left 0.08s linear, top 0.08s linear",
      }}
    >
      <CursorArrow color={cursor.color} />
      <div
        style={{
          marginTop: 2,
          marginLeft: 10,
          padding: "2px 6px",
          background: cursor.color,
          borderRadius: 4,
          fontSize: 10,
          fontFamily: FONTS.mono,
          fontWeight: 600,
          color: "#fff",
          whiteSpace: "nowrap",
          opacity: labelVisible ? 1 : 0,
          transition: "opacity 0.3s ease",
          textShadow: "0 1px 2px rgba(0,0,0,0.3)",
        }}
      >
        {cursor.displayName}
      </div>
    </div>
  );
}

export function RemoteCursors({ cursors }) {
  if (!cursors || cursors.length === 0) return null;

  return (
    <>
      {cursors.map((c) => (
        <RemoteCursor key={c.id} cursor={c} />
      ))}
    </>
  );
}
