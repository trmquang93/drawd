import { useState } from "react";
import { COLORS, styles } from "../styles/theme";
import { generateId } from "../utils/generateId";

function FollowUpSection({ title, titleColor, action, setAction, targetId, setTargetId,
                           customDesc, setCustomDesc, otherScreens }) {
  return (
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
        color: titleColor,
        marginBottom: 10,
        textTransform: "uppercase",
      }}>
        {title}
      </div>

      <label style={styles.monoLabel}>
        ACTION
        <select value={action} onChange={(e) => setAction(e.target.value)} style={styles.select}>
          <option value="">None</option>
          <option value="navigate">Navigate to screen</option>
          <option value="back">Go back</option>
          <option value="modal">Open modal/overlay</option>
          <option value="custom">Custom action</option>
        </select>
      </label>

      {(action === "navigate" || action === "modal") && (
        <label style={{ ...styles.monoLabel, marginTop: 10 }}>
          TARGET SCREEN
          <select value={targetId} onChange={(e) => setTargetId(e.target.value)} style={styles.select}>
            <option value="">— Select screen —</option>
            {otherScreens.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
      )}

      {action === "custom" && (
        <label style={{ ...styles.monoLabel, marginTop: 10 }}>
          DESCRIPTION
          <textarea
            value={customDesc}
            onChange={(e) => setCustomDesc(e.target.value)}
            placeholder="Describe what happens..."
            rows={2}
            style={{ ...styles.input, resize: "vertical", fontFamily: "inherit" }}
          />
        </label>
      )}
    </div>
  );
}

export function HotspotModal({ screen, hotspot, screens, documents = [], onAddDocument, prefilledTarget, prefilledRect, onSave, onDelete, onClose }) {
  const [label, setLabel] = useState(hotspot?.label || "");
  const [elementType, setElementType] = useState(hotspot?.elementType || "button");
  const [targetId, setTargetId] = useState(hotspot?.targetScreenId || prefilledTarget || "");
  const [action, setAction] = useState(hotspot?.action || "navigate");
  const [apiEndpoint, setApiEndpoint] = useState(hotspot?.apiEndpoint || "");
  const [apiMethod, setApiMethod] = useState(hotspot?.apiMethod || "GET");
  const [customDescription, setCustomDescription] = useState(hotspot?.customDescription || "");
  const [x, setX] = useState(hotspot?.x ?? prefilledRect?.x ?? 10);
  const [y, setY] = useState(hotspot?.y ?? prefilledRect?.y ?? 10);
  const [w, setW] = useState(hotspot?.w ?? prefilledRect?.w ?? 80);
  const [h, setH] = useState(hotspot?.h ?? prefilledRect?.h ?? 15);

  // API follow-up fields
  const [documentId, setDocumentId] = useState(hotspot?.documentId || null);
  const [pasteText, setPasteText] = useState("");
  const [onSuccessAction, setOnSuccessAction] = useState(hotspot?.onSuccessAction || "");
  const [onSuccessTargetId, setOnSuccessTargetId] = useState(hotspot?.onSuccessTargetId || "");
  const [onSuccessCustomDesc, setOnSuccessCustomDesc] = useState(hotspot?.onSuccessCustomDesc || "");
  const [onErrorAction, setOnErrorAction] = useState(hotspot?.onErrorAction || "");
  const [onErrorTargetId, setOnErrorTargetId] = useState(hotspot?.onErrorTargetId || "");
  const [onErrorCustomDesc, setOnErrorCustomDesc] = useState(hotspot?.onErrorCustomDesc || "");

  // Conditional branching fields
  const [conditions, setConditions] = useState(
    hotspot?.conditions?.length > 0
      ? hotspot.conditions
      : [{ id: generateId(), label: "", targetScreenId: "" }]
  );

  const otherScreens = screens.filter((s) => s.id !== screen.id);
  const selectedDoc = documents.find((d) => d.id === documentId) || null;

  const handleDocumentChange = (value) => {
    if (value === "__create__") {
      const autoName = label ? `${label} — API Docs` : "New API Document";
      const id = onAddDocument(autoName, "");
      setDocumentId(id);
    } else {
      setDocumentId(value || null);
    }
  };

  const handlePasteZone = (e) => {
    const pasted = e.clipboardData?.getData("text") || "";
    if (!pasted.trim()) return;
    e.preventDefault();
    const autoName = label ? `${label} — API Docs` : "New API Document";
    const id = onAddDocument(autoName, pasted.trim());
    setDocumentId(id);
    setPasteText("");
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ ...styles.modalCard, width: 480, maxHeight: "85vh", overflowY: "auto" }}
      >
        <h3 style={styles.modalTitle}>Configure Tap Area</h3>

        <form onSubmit={(e) => {
          e.preventDefault();
          onSave({
            ...hotspot,
            id: hotspot?.id || generateId(),
            label,
            elementType,
            targetScreenId: action === "conditional" ? null : (targetId || null),
            action,
            apiEndpoint,
            apiMethod,
            customDescription,
            documentId: documentId || null,
            onSuccessAction,
            onSuccessTargetId: onSuccessTargetId || null,
            onSuccessCustomDesc,
            onErrorAction,
            onErrorTargetId: onErrorTargetId || null,
            onErrorCustomDesc,
            conditions: action === "conditional" ? conditions : [],
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
              ELEMENT TYPE
              <select value={elementType} onChange={(e) => setElementType(e.target.value)} style={styles.select}>
                <option value="button">Button</option>
                <option value="text-input">Text Input</option>
                <option value="toggle">Toggle</option>
                <option value="card">Card</option>
                <option value="icon">Icon</option>
                <option value="link">Link</option>
                <option value="image">Image</option>
                <option value="tab">Tab</option>
                <option value="list-item">List Item</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label style={styles.monoLabel}>
              ACTION
              <select value={action} onChange={(e) => setAction(e.target.value)} style={styles.select}>
                <option value="navigate">Navigate to screen</option>
                <option value="back">Go back</option>
                <option value="modal">Open modal/overlay</option>
                <option value="conditional">Conditional branch</option>
                <option value="api">API call</option>
                <option value="custom">Custom action</option>
              </select>
            </label>

            {action === "conditional" && (
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
                  <div key={cond.id} style={{
                    display: "flex",
                    gap: 8,
                    marginBottom: 8,
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
                ))}

                <button
                  type="button"
                  onClick={() => setConditions([...conditions, { id: generateId(), label: "", targetScreenId: "" }])}
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

            {action === "api" && (
              <>
                <label style={styles.monoLabel}>
                  API ENDPOINT
                  <input
                    value={apiEndpoint}
                    onChange={(e) => setApiEndpoint(e.target.value)}
                    placeholder="e.g. /api/users/login"
                    style={styles.input}
                  />
                </label>
                <label style={styles.monoLabel}>
                  HTTP METHOD
                  <select value={apiMethod} onChange={(e) => setApiMethod(e.target.value)} style={styles.select}>
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                    <option value="PATCH">PATCH</option>
                  </select>
                </label>

                <label style={styles.monoLabel}>
                  API DOCUMENTATION
                  <select
                    value={documentId || ""}
                    onChange={(e) => handleDocumentChange(e.target.value)}
                    style={styles.select}
                  >
                    <option value="">— None —</option>
                    {documents.map((doc) => (
                      <option key={doc.id} value={doc.id}>{doc.name}</option>
                    ))}
                    <option value="__create__">+ Create New Document</option>
                  </select>
                </label>

                {selectedDoc && (
                  <div style={{
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 6,
                    padding: "10px 12px",
                    fontSize: 12,
                    color: COLORS.textDim,
                    fontFamily: "inherit",
                    maxHeight: 80,
                    overflow: "hidden",
                    lineHeight: 1.5,
                    position: "relative",
                  }}>
                    <div style={{ fontSize: 10, color: COLORS.textDim, marginBottom: 4, letterSpacing: "0.06em" }}>
                      PREVIEW
                    </div>
                    <div style={{ whiteSpace: "pre-wrap", overflow: "hidden" }}>
                      {selectedDoc.content.slice(0, 200) || <em>Empty document</em>}
                    </div>
                  </div>
                )}

                {!documentId && (
                  <label style={styles.monoLabel}>
                    PASTE TO CREATE DOCUMENT
                    <textarea
                      value={pasteText}
                      onChange={(e) => setPasteText(e.target.value)}
                      onPaste={handlePasteZone}
                      placeholder="Paste curl commands, OpenAPI specs, or API docs here to create a new document..."
                      rows={4}
                      style={{ ...styles.input, resize: "vertical", fontFamily: "inherit" }}
                    />
                  </label>
                )}

                <FollowUpSection
                  title="On Success"
                  titleColor={COLORS.success}
                  action={onSuccessAction}
                  setAction={setOnSuccessAction}
                  targetId={onSuccessTargetId}
                  setTargetId={setOnSuccessTargetId}
                  customDesc={onSuccessCustomDesc}
                  setCustomDesc={setOnSuccessCustomDesc}
                  otherScreens={otherScreens}
                />

                <FollowUpSection
                  title="On Error"
                  titleColor={COLORS.danger}
                  action={onErrorAction}
                  setAction={setOnErrorAction}
                  targetId={onErrorTargetId}
                  setTargetId={setOnErrorTargetId}
                  customDesc={onErrorCustomDesc}
                  setCustomDesc={setOnErrorCustomDesc}
                  otherScreens={otherScreens}
                />
              </>
            )}

            {action === "custom" && (
              <label style={styles.monoLabel}>
                DESCRIPTION
                <textarea
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Describe what this action does..."
                  rows={3}
                  style={{ ...styles.input, resize: "vertical", fontFamily: "inherit" }}
                />
              </label>
            )}

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
                    step={0.1}
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
