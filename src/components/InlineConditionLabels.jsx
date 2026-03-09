import { useRef, useEffect, useCallback } from "react";
import { COLORS, FONTS } from "../styles/theme";
import { computePoints } from "./ConnectionLines";

export function InlineConditionLabels({ connections, screens, conditionGroupId, onUpdateLabel, onDone }) {
  const groupConns = connections.filter((c) => c.conditionGroupId === conditionGroupId);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
      inputRefs.current[0].select();
    }
  }, []);

  const saveInput = useCallback((index) => {
    const el = inputRefs.current[index];
    if (!el) return;
    const val = el.value.trim();
    const conn = groupConns[index];
    if (conn) onUpdateLabel(conn.id, { condition: val, label: val });
  }, [groupConns, onUpdateLabel]);

  const onKeyDown = useCallback((e, index) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveInput(index);
      if (index < groupConns.length - 1) {
        inputRefs.current[index + 1]?.focus();
        inputRefs.current[index + 1]?.select();
      } else {
        onDone();
      }
    }
    if (e.key === "Escape") {
      e.preventDefault();
      // Save all inputs before closing
      groupConns.forEach((_, i) => saveInput(i));
      onDone();
    }
  }, [groupConns.length, onDone, saveInput]);

  return (
    <>
      {groupConns.map((conn, i) => {
        const pts = computePoints(conn, screens);
        if (!pts) return null;
        const midX = (pts.fromX + pts.toX) / 2;
        const midY = (pts.fromY + pts.toY) / 2 - 24;

        return (
          <div
            key={conn.id}
            style={{
              position: "absolute",
              left: midX - 60,
              top: midY - 12,
              zIndex: 50,
              pointerEvents: "all",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <input
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              defaultValue={conn.condition || conn.label || ""}
              placeholder={`condition ${i + 1}`}
              onBlur={(e) => {
                const val = e.target.value.trim();
                onUpdateLabel(conn.id, { condition: val, label: val });
              }}
              onKeyDown={(e) => onKeyDown(e, i)}
              style={{
                width: 120,
                padding: "4px 8px",
                background: COLORS.surface,
                border: `1px solid ${COLORS.condition}`,
                borderRadius: 6,
                color: COLORS.condition,
                fontSize: 11,
                fontFamily: FONTS.mono,
                outline: "none",
                textAlign: "center",
              }}
            />
          </div>
        );
      })}
    </>
  );
}
