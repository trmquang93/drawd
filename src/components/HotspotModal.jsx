import { useState } from "react";
import { COLORS, styles } from "../styles/theme";
import { generateId } from "../utils/generateId";

export function HotspotModal({ screen, hotspot, screens, prefilledTarget, prefilledRect, onSave, onDelete, onClose }) {
  const [label, setLabel] = useState(hotspot?.label || "");
  const [targetId, setTargetId] = useState(hotspot?.targetScreenId || prefilledTarget || "");
  const [action, setAction] = useState(hotspot?.action || "navigate");
  const [x, setX] = useState(hotspot?.x ?? prefilledRect?.x ?? 10);
  const [y, setY] = useState(hotspot?.y ?? prefilledRect?.y ?? 10);
  const [w, setW] = useState(hotspot?.w ?? prefilledRect?.w ?? 80);
  const [h, setH] = useState(hotspot?.h ?? prefilledRect?.h ?? 15);

  const otherScreens = screens.filter((s) => s.id !== screen.id);

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ ...styles.modalCard, width: 380 }}
      >
        <h3 style={styles.modalTitle}>Configure Tap Area</h3>

        <form onSubmit={(e) => {
          e.preventDefault();
          onSave({
            ...hotspot,
            id: hotspot?.id || generateId(),
            label,
            targetScreenId: targetId || null,
            action,
            x, y, w, h,
          });
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label style={styles.monoLabel}>
              LABEL
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Login Button, Menu Icon"
                style={styles.input}
              />
            </label>

            <label style={styles.monoLabel}>
              ACTION
              <select value={action} onChange={(e) => setAction(e.target.value)} style={styles.select}>
                <option value="navigate">Navigate to screen</option>
                <option value="back">Go back</option>
                <option value="modal">Open modal/overlay</option>
                <option value="api">API call</option>
                <option value="custom">Custom action</option>
              </select>
            </label>

            {(action === "navigate" || action === "modal") && (
              <label style={styles.monoLabel}>
                TARGET SCREEN
                <select value={targetId} onChange={(e) => setTargetId(e.target.value)} style={styles.select}>
                  <option value="">— Select screen —</option>
                  {otherScreens.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </label>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                ["X %", x, setX],
                ["Y %", y, setY],
                ["W %", w, setW],
                ["H %", h, setH],
              ].map(([lbl, val, setter]) => (
                <label key={lbl} style={styles.monoLabel}>
                  {lbl}
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={val}
                    onChange={(e) => setter(Number(e.target.value))}
                    style={styles.input}
                  />
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
            <button type="submit" style={{ ...styles.btnPrimary, flex: 1 }}>
              Save
            </button>
            {hotspot?.id && (
              <button type="button" onClick={() => onDelete(hotspot.id)} style={styles.btnDanger}>
                Delete
              </button>
            )}
            <button type="button" onClick={onClose} style={styles.btnCancel}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
