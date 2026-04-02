import { useState, useEffect } from "react";
import { COLORS, FONTS, styles } from "../styles/theme";
import { generateId } from "../utils/generateId";
import { DataFlowEditor } from "./DataFlowEditor";
import { TRANSITION_TYPES, ACCESSIBILITY_ROLES, ACCESSIBILITY_TRAITS } from "../constants";

function FollowUpSection({ title, titleColor, action, setAction, targetId, setTargetId,
                           customDesc, setCustomDesc, otherScreens, dataFlow, onDataFlowChange }) {
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
        <>
          <label style={{ ...styles.monoLabel, marginTop: 10 }}>
            TARGET SCREEN
            <select value={targetId} onChange={(e) => setTargetId(e.target.value)} style={styles.select}>
              <option value="">— Select screen —</option>
              {otherScreens.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          {dataFlow && onDataFlowChange && (
            <div style={{ marginTop: 10 }}>
              <DataFlowEditor items={dataFlow} onChange={onDataFlowChange} />
            </div>
          )}
        </>
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

function loadPresets() {
  try {
    const raw = localStorage.getItem("drawd-hotspot-presets");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePresetsToStorage(presets) {
  try {
    localStorage.setItem("drawd-hotspot-presets", JSON.stringify(presets));
  } catch {
    // Private browsing or quota exceeded
  }
}

export function HotspotModal({ screen, hotspot, connection, screens, documents = [], onAddDocument, prefilledTarget, prefilledRect, onSave, onDelete, onClose }) {
  const [presets, setPresets] = useState(loadPresets);
  const [label, setLabel] = useState(hotspot?.label || "");
  const [elementType, setElementType] = useState(hotspot?.elementType || "button");
  const [interactionType, setInteractionType] = useState(hotspot?.interactionType || "tap");
  const [targetId, setTargetId] = useState(hotspot?.targetScreenId || prefilledTarget || "");
  const [action, setAction] = useState(hotspot?.action || "navigate");
  const [apiEndpoint, setApiEndpoint] = useState(hotspot?.apiEndpoint || "");
  const [apiMethod, setApiMethod] = useState(hotspot?.apiMethod || "GET");
  const [requestSchema, setRequestSchema] = useState(hotspot?.requestSchema || "");
  const [responseSchema, setResponseSchema] = useState(hotspot?.responseSchema || "");
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

  // Data flow fields
  const [dataFlow, setDataFlow] = useState(hotspot?.dataFlow || []);
  const [onSuccessDataFlow, setOnSuccessDataFlow] = useState(hotspot?.onSuccessDataFlow || []);
  const [onErrorDataFlow, setOnErrorDataFlow] = useState(hotspot?.onErrorDataFlow || []);

  // Conditional branching fields
  const [conditions, setConditions] = useState(
    hotspot?.conditions?.length > 0
      ? hotspot.conditions
      : [{ id: generateId(), label: "", targetScreenId: "" }]
  );

  // Transition (read from associated connection when opened via double-click)
  const [transitionType, setTransitionType] = useState(connection?.transitionType || "");
  const [transitionLabel, setTransitionLabel] = useState(connection?.transitionLabel || "");

  // TBD marker
  const [tbd, setTbd] = useState(hotspot?.tbd || false);
  const [tbdNote, setTbdNote] = useState(hotspot?.tbdNote || "");

  // Input validation (text-input only)
  const [validationExpanded, setValidationExpanded] = useState(!!(hotspot?.validation));
  const [validationRequired, setValidationRequired] = useState(hotspot?.validation?.required || false);
  const [validationInputType, setValidationInputType] = useState(hotspot?.validation?.inputType || "text");
  const [validationMinLength, setValidationMinLength] = useState(hotspot?.validation?.minLength ?? "");
  const [validationMaxLength, setValidationMaxLength] = useState(hotspot?.validation?.maxLength ?? "");
  const [validationPattern, setValidationPattern] = useState(hotspot?.validation?.pattern || "");
  const [validationErrorMessage, setValidationErrorMessage] = useState(hotspot?.validation?.errorMessage || "");

  // Accessibility annotations
  const [a11yExpanded, setA11yExpanded] = useState(!!(hotspot?.accessibility));
  const [a11yLabel, setA11yLabel] = useState(hotspot?.accessibility?.label || "");
  const [a11yRole, setA11yRole] = useState(hotspot?.accessibility?.role || "");
  const [a11yHint, setA11yHint] = useState(hotspot?.accessibility?.hint || "");
  const [a11yTraits, setA11yTraits] = useState(hotspot?.accessibility?.traits || []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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

        {/* Presets row */}
        <div style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
          alignItems: "center",
        }}>
          <select
            value=""
            onChange={(e) => {
              const preset = presets.find((p) => p.id === e.target.value);
              if (!preset) return;
              setLabel(preset.label || "");
              setElementType(preset.elementType || "button");
              setAction(preset.action || "navigate");
              setW(preset.w ?? w);
              setH(preset.h ?? h);
              if (preset.customDescription) setCustomDescription(preset.customDescription);
              if (preset.accessibility) {
                setA11yExpanded(true);
                setA11yLabel(preset.accessibility.label || "");
                setA11yRole(preset.accessibility.role || "");
                setA11yHint(preset.accessibility.hint || "");
                setA11yTraits(preset.accessibility.traits || []);
              }
            }}
            style={{ ...styles.select, flex: 1, marginTop: 0 }}
          >
            <option value="">-- Apply Preset --</option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              const name = prompt("Preset name:");
              if (!name?.trim()) return;
              const preset = {
                id: generateId(),
                name: name.trim(),
                label,
                elementType,
                action,
                w,
                h,
                customDescription,
                accessibility: a11yExpanded ? { label: a11yLabel, role: a11yRole, hint: a11yHint, traits: a11yTraits } : null,
              };
              const updated = [...presets, preset];
              setPresets(updated);
              savePresetsToStorage(updated);
            }}
            style={{
              padding: "8px 14px",
              background: COLORS.accent01,
              border: `1px solid ${COLORS.accent025}`,
              borderRadius: 8,
              color: COLORS.accentLight,
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
            }}
          >
            Save Preset
          </button>
          {presets.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const name = prompt("Delete which preset? Enter name:");
                if (!name?.trim()) return;
                const updated = presets.filter((p) => p.name.toLowerCase() !== name.trim().toLowerCase());
                setPresets(updated);
                savePresetsToStorage(updated);
              }}
              style={{
                padding: "8px 10px",
                background: "rgba(255,107,107,0.08)",
                border: `1px solid rgba(255,107,107,0.2)`,
                borderRadius: 8,
                color: COLORS.danger,
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "inherit",
                whiteSpace: "nowrap",
              }}
            >
              Del
            </button>
          )}
        </div>

        <form onSubmit={(e) => {
          e.preventDefault();
          onSave({
            ...hotspot,
            id: hotspot?.id || generateId(),
            label,
            elementType,
            interactionType,
            targetScreenId: action === "conditional" ? null : (targetId || null),
            action,
            apiEndpoint,
            apiMethod,
            requestSchema,
            responseSchema,
            customDescription,
            documentId: documentId || null,
            onSuccessAction,
            onSuccessTargetId: onSuccessTargetId || null,
            onSuccessCustomDesc,
            onErrorAction,
            onErrorTargetId: onErrorTargetId || null,
            onErrorCustomDesc,
            dataFlow: (action === "navigate" || action === "modal") ? dataFlow : [],
            onSuccessDataFlow: action === "api" ? onSuccessDataFlow : [],
            onErrorDataFlow: action === "api" ? onErrorDataFlow : [],
            conditions: action === "conditional" ? conditions : [],
            x, y, w, h,
            transitionType,
            transitionLabel: transitionType === "custom" ? transitionLabel : "",
            tbd,
            tbdNote: tbd ? tbdNote : "",
            validation: elementType === "text-input" && validationExpanded ? {
              required: validationRequired,
              inputType: validationInputType,
              minLength: validationMinLength !== "" ? Number(validationMinLength) : null,
              maxLength: validationMaxLength !== "" ? Number(validationMaxLength) : null,
              pattern: validationPattern,
              errorMessage: validationErrorMessage,
            } : null,
            accessibility: a11yExpanded ? {
              label: a11yLabel,
              role: a11yRole,
              hint: a11yHint,
              traits: a11yTraits,
            } : null,
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
              GESTURE / INTERACTION
              <select value={interactionType} onChange={(e) => setInteractionType(e.target.value)} style={styles.select}>
                <option value="tap">Tap</option>
                <option value="long-press">Long Press</option>
                <option value="swipe-left">Swipe Left</option>
                <option value="swipe-right">Swipe Right</option>
                <option value="swipe-up">Swipe Up</option>
                <option value="swipe-down">Swipe Down</option>
                <option value="pull-to-refresh">Pull to Refresh</option>
                <option value="pinch">Pinch</option>
                <option value="double-tap">Double Tap</option>
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
                  REQUEST BODY / PARAMS
                  <textarea
                    value={requestSchema}
                    onChange={(e) => setRequestSchema(e.target.value)}
                    placeholder={"{ userId: string, page: number }"}
                    rows={3}
                    style={{ ...styles.input, resize: "vertical", fontFamily: "monospace", fontSize: 11 }}
                  />
                </label>

                <label style={styles.monoLabel}>
                  RESPONSE SHAPE
                  <textarea
                    value={responseSchema}
                    onChange={(e) => setResponseSchema(e.target.value)}
                    placeholder={"{ data: User[], total: number }"}
                    rows={3}
                    style={{ ...styles.input, resize: "vertical", fontFamily: "monospace", fontSize: 11 }}
                  />
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
                  dataFlow={onSuccessDataFlow}
                  onDataFlowChange={setOnSuccessDataFlow}
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
                  dataFlow={onErrorDataFlow}
                  onDataFlowChange={setOnErrorDataFlow}
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
              <>
                <label style={styles.monoLabel}>
                  TARGET SCREEN
                  <select value={targetId} onChange={(e) => setTargetId(e.target.value)} style={styles.select}>
                    <option value="">— Select screen —</option>
                    {otherScreens.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </label>

                <DataFlowEditor items={dataFlow} onChange={setDataFlow} />
              </>
            )}

            {/* Validation rules (text-input only) */}
            {elementType === "text-input" && (
              <div style={{
                border: `1px solid ${validationExpanded ? "rgba(0,210,211,0.25)" : COLORS.border}`,
                borderRadius: 8,
                overflow: "hidden",
              }}>
                <button
                  type="button"
                  onClick={() => setValidationExpanded(!validationExpanded)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    background: validationExpanded ? "rgba(0,210,211,0.06)" : "rgba(255,255,255,0.02)",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: FONTS.mono,
                  }}
                >
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    color: validationExpanded ? COLORS.success : COLORS.textMuted,
                    textTransform: "uppercase",
                  }}>
                    Validation Rules
                  </span>
                  <span style={{ color: COLORS.textDim, fontSize: 12 }}>{validationExpanded ? "▲" : "▼"}</span>
                </button>
                {validationExpanded && (
                  <div style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                      <span style={{ fontSize: 10, color: COLORS.textMuted, fontFamily: FONTS.mono, textTransform: "uppercase", letterSpacing: "0.08em" }}>Required</span>
                      <button
                        type="button"
                        onClick={() => setValidationRequired(!validationRequired)}
                        style={{
                          padding: "3px 9px",
                          borderRadius: 4,
                          border: `1px solid ${validationRequired ? "rgba(0,210,211,0.35)" : COLORS.border}`,
                          background: validationRequired ? "rgba(0,210,211,0.12)" : "rgba(255,255,255,0.05)",
                          color: validationRequired ? COLORS.success : COLORS.textDim,
                          fontFamily: FONTS.mono,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {validationRequired ? "Required" : "Optional"}
                      </button>
                    </div>
                    <label style={styles.monoLabel}>
                      INPUT TYPE
                      <select value={validationInputType} onChange={(e) => setValidationInputType(e.target.value)} style={styles.select}>
                        <option value="text">Text</option>
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                        <option value="number">Number</option>
                        <option value="password">Password</option>
                        <option value="url">URL</option>
                      </select>
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <label style={styles.monoLabel}>
                        MIN LENGTH
                        <input
                          type="number"
                          min={0}
                          value={validationMinLength}
                          onChange={(e) => setValidationMinLength(e.target.value)}
                          placeholder="—"
                          style={styles.input}
                        />
                      </label>
                      <label style={styles.monoLabel}>
                        MAX LENGTH
                        <input
                          type="number"
                          min={0}
                          value={validationMaxLength}
                          onChange={(e) => setValidationMaxLength(e.target.value)}
                          placeholder="—"
                          style={styles.input}
                        />
                      </label>
                    </div>
                    <label style={styles.monoLabel}>
                      PATTERN
                      <input
                        value={validationPattern}
                        onChange={(e) => setValidationPattern(e.target.value)}
                        placeholder="e.g. ^\d{10}$ or 'US phone number format'"
                        style={styles.input}
                      />
                    </label>
                    <label style={styles.monoLabel}>
                      ERROR MESSAGE
                      <input
                        value={validationErrorMessage}
                        onChange={(e) => setValidationErrorMessage(e.target.value)}
                        placeholder="e.g. Please enter a valid email address"
                        style={styles.input}
                      />
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Accessibility annotations */}
            <div style={{
              border: `1px solid ${a11yExpanded ? "rgba(198,120,221,0.25)" : COLORS.border}`,
              borderRadius: 8,
              overflow: "hidden",
            }}>
              <button
                type="button"
                onClick={() => setA11yExpanded(!a11yExpanded)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  background: a11yExpanded ? "rgba(198,120,221,0.06)" : "rgba(255,255,255,0.02)",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: FONTS.mono,
                }}
              >
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: a11yExpanded ? "#c678dd" : COLORS.textMuted,
                  textTransform: "uppercase",
                }}>
                  Accessibility
                </span>
                <span style={{ color: COLORS.textDim, fontSize: 12 }}>{a11yExpanded ? "\u25B2" : "\u25BC"}</span>
              </button>
              {a11yExpanded && (
                <div style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <label style={{ ...styles.monoLabel, marginTop: 8 }}>
                    ACCESSIBILITY LABEL
                    <input
                      value={a11yLabel}
                      onChange={(e) => setA11yLabel(e.target.value)}
                      placeholder="e.g. Sign in button"
                      style={styles.input}
                    />
                  </label>
                  <label style={styles.monoLabel}>
                    ROLE
                    <select value={a11yRole} onChange={(e) => setA11yRole(e.target.value)} style={styles.select}>
                      <option value="">-- None --</option>
                      {ACCESSIBILITY_ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </label>
                  <label style={styles.monoLabel}>
                    HINT
                    <input
                      value={a11yHint}
                      onChange={(e) => setA11yHint(e.target.value)}
                      placeholder="e.g. Double tap to sign in"
                      style={styles.input}
                    />
                  </label>
                  <div>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      color: COLORS.textMuted,
                      textTransform: "uppercase",
                      fontFamily: FONTS.mono,
                      display: "block",
                      marginBottom: 6,
                    }}>
                      TRAITS
                    </span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {ACCESSIBILITY_TRAITS.map((trait) => {
                        const isActive = a11yTraits.includes(trait);
                        return (
                          <button
                            key={trait}
                            type="button"
                            onClick={() => {
                              setA11yTraits((prev) =>
                                prev.includes(trait)
                                  ? prev.filter((t) => t !== trait)
                                  : [...prev, trait]
                              );
                            }}
                            style={{
                              padding: "3px 9px",
                              borderRadius: 4,
                              border: `1px solid ${isActive ? "rgba(198,120,221,0.35)" : COLORS.border}`,
                              background: isActive ? "rgba(198,120,221,0.12)" : "rgba(255,255,255,0.05)",
                              color: isActive ? "#c678dd" : COLORS.textDim,
                              fontFamily: FONTS.mono,
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            {trait}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Transition type — only visible when editing a connection-backed hotspot */}
            {connection && (action === "navigate" || action === "back" || action === "modal" || action === "api") && (
              <>
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
              </>
            )}

            {/* TBD marker */}
            <div style={{
              padding: "10px 12px",
              background: tbd ? "rgba(240,147,43,0.06)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${tbd ? "rgba(240,147,43,0.25)" : COLORS.border}`,
              borderRadius: 8,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: tbd ? 8 : 0 }}>
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: COLORS.textMuted,
                  textTransform: "uppercase",
                  flex: 1,
                }}>
                  TBD / Uncertain
                </span>
                <button
                  type="button"
                  onClick={() => setTbd(!tbd)}
                  style={{
                    padding: "3px 9px",
                    borderRadius: 4,
                    border: `1px solid ${tbd ? "rgba(240,147,43,0.35)" : COLORS.border}`,
                    background: tbd ? "rgba(240,147,43,0.18)" : "rgba(255,255,255,0.05)",
                    color: tbd ? "#f0932b" : COLORS.textDim,
                    fontFamily: FONTS.mono,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {tbd ? "? TBD" : "Mark TBD"}
                </button>
              </div>
              {tbd && (
                <input
                  value={tbdNote}
                  onChange={(e) => setTbdNote(e.target.value)}
                  placeholder="What's uncertain about this element?"
                  style={{ ...styles.input, marginTop: 0 }}
                />
              )}
            </div>

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
