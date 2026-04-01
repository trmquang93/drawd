import { useState } from "react";
import { COLORS, styles } from "../styles/theme";
import { generateId } from "../utils/generateId";
import { DataFlowEditor } from "./DataFlowEditor";
import { TRANSITION_TYPES } from "../constants";

export function ConnectionEditModal({ connection, groupConnections, screens, fromScreen, onSave, onDelete, onClose }) {
  const isConditional = groupConnections.length > 1 || !!connection.conditionGroupId;

  const [mode, setMode] = useState(isConditional ? "conditional" : "navigate");
  const [label, setLabel] = useState(connection.label || "");
  const [targetId, setTargetId] = useState(connection.toScreenId || "");
  const [transitionType, setTransitionType] = useState(connection.transitionType || "");
  const [transitionLabel, setTransitionLabel] = useState(connection.transitionLabel || "");
  const [dataFlow, setDataFlow] = useState(connection.dataFlow || []);

  const [conditions, setConditions] = useState(() => {
    if (isConditional) {
      return groupConnections.map((c) => ({
        id: c.id,
        label: c.condition || c.label || "",
        targetScreenId: c.toScreenId || "",
        dataFlow: c.dataFlow || [],
      }));
    }
    return [{ id: generateId(), label: "", targetScreenId: connection.toScreenId || "", dataFlow: [] }];
  });

  const otherScreens = screens.filter((s) => s.id !== fromScreen.id);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      mode,
      label,
      targetId: targetId || null,
      fromScreenId: connection.fromScreenId,
      conditions: mode === "conditional" ? conditions : [],
      conditionGroupId: connection.conditionGroupId || null,
      transitionType: transitionType || null,
      transitionLabel: transitionType === "custom" ? transitionLabel : "",
      dataFlow: mode === "navigate" ? dataFlow : [],
    });
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ ...styles.modalCard, width: 480, maxHeight: "85vh", overflowY: "auto" }}
      >
        <h3 style={styles.modalTitle}>Edit Connection</h3>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* FROM screen badge */}
            <div style={styles.monoLabel}>
              FROM
              <div style={{
                marginTop: 6,
                padding: "8px 12px",
                background: COLORS.bg,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 8,
                color: COLORS.text,
                fontSize: 13,
              }}>
                {fromScreen.name}
              </div>
            </div>

            {/* MODE selector */}
            <label style={styles.monoLabel}>
              MODE
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                style={styles.select}
              >
                <option value="navigate">Navigate to screen</option>
                <option value="conditional">Conditional branch</option>
              </select>
            </label>

            {/* Navigate mode */}
            {mode === "navigate" && (
              <>
                <label style={styles.monoLabel}>
                  LABEL
                  <input
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g. On tap, Continue"
                    style={styles.input}
                  />
                </label>

                <label style={styles.monoLabel}>
                  TARGET SCREEN
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    style={styles.select}
                  >
                    <option value="">-- Select screen --</option>
                    {otherScreens.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </label>

                <DataFlowEditor items={dataFlow} onChange={setDataFlow} />
              </>
            )}

            {/* Conditional mode */}
            {mode === "conditional" && (
              <div style={{
                border: `1px solid ${COLORS.border}`,
                borderRadius: 8,
                padding: 12,
                background: "rgba(255,255,255,0.02)",
              }}>
                <div style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: "#f0932b",
                  marginBottom: 10,
                  textTransform: "uppercase",
                }}>
                  Condition Branches
                </div>

                {conditions.map((cond, i) => (
                  <div key={cond.id} style={{ marginBottom: 8 }}>
                    <div style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "flex-end",
                    }}>
                      <label style={{ ...styles.monoLabel, flex: 1 }}>
                        {i === 0 ? "CONDITION" : ""}
                        <input
                          value={cond.label}
                          onChange={(e) => {
                            const updated = [...conditions];
                            updated[i] = { ...updated[i], label: e.target.value };
                            setConditions(updated);
                          }}
                          placeholder={i === conditions.length - 1 ? "e.g. otherwise" : "e.g. user is subscriber"}
                          style={styles.input}
                        />
                      </label>
                      <label style={{ ...styles.monoLabel, flex: 1 }}>
                        {i === 0 ? "TARGET SCREEN" : ""}
                        <select
                          value={cond.targetScreenId || ""}
                          onChange={(e) => {
                            const updated = [...conditions];
                            updated[i] = { ...updated[i], targetScreenId: e.target.value || "" };
                            setConditions(updated);
                          }}
                          style={styles.select}
                        >
                          <option value="">-- Select --</option>
                          {otherScreens.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </label>
                      {conditions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setConditions(conditions.filter((_, j) => j !== i))}
                          style={{
                            background: "none",
                            border: "none",
                            color: COLORS.danger,
                            cursor: "pointer",
                            fontSize: 16,
                            padding: "6px",
                            marginBottom: 6,
                          }}
                        >
                          &#10005;
                        </button>
                      )}
                    </div>
                    <div style={{ marginTop: 6, marginLeft: 8 }}>
                      <DataFlowEditor
                        items={cond.dataFlow || []}
                        onChange={(newDataFlow) => {
                          const updated = [...conditions];
                          updated[i] = { ...updated[i], dataFlow: newDataFlow };
                          setConditions(updated);
                        }}
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setConditions([...conditions, { id: generateId(), label: "", targetScreenId: "", dataFlow: [] }])}
                  style={{
                    width: "100%",
                    padding: "6px 0",
                    marginTop: 4,
                    background: "rgba(240,147,43,0.08)",
                    border: "1px dashed rgba(240,147,43,0.3)",
                    borderRadius: 6,
                    color: "#f0932b",
                    fontSize: 11,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  + Add Branch
                </button>
              </div>
            )}
          </div>

          {/* Transition type */}
          <label style={styles.monoLabel}>
            TRANSITION
            <select
              value={transitionType}
              onChange={(e) => setTransitionType(e.target.value)}
              style={styles.select}
            >
              <option value="">— Unspecified —</option>
              {TRANSITION_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>

          {transitionType === "custom" && (
            <label style={styles.monoLabel}>
              CUSTOM TRANSITION
              <input
                value={transitionLabel}
                onChange={(e) => setTransitionLabel(e.target.value)}
                placeholder="e.g. fade-in overlay"
                style={styles.input}
              />
            </label>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
            <button type="submit" style={{ ...styles.btnPrimary, flex: 1 }}>
              Save
            </button>
            <button type="button" onClick={onDelete} style={styles.btnDanger}>
              Delete
            </button>
            <button type="button" onClick={onClose} style={styles.btnCancel}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
