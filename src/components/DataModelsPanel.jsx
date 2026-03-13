import { useState } from "react";
import { COLORS, FONTS, styles } from "../styles/theme";
import { generateId } from "../utils/generateId";

export function DataModelsPanel({ dataModels, onAddModel, onUpdateModel, onDeleteModel, onClose }) {
  const [selectedId, setSelectedId] = useState(dataModels[0]?.id || null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const selected = dataModels.find((m) => m.id === selectedId) || null;

  const handleNew = () => {
    const id = onAddModel("Untitled Model", "");
    setSelectedId(id);
    setConfirmDelete(false);
  };

  const handleDelete = () => {
    if (!selected) return;
    onDeleteModel(selected.id);
    const remaining = dataModels.filter((m) => m.id !== selected.id);
    setSelectedId(remaining[0]?.id || null);
    setConfirmDelete(false);
  };

  return (
    <div
      style={{
        ...styles.modalOverlay,
        alignItems: "stretch",
        justifyContent: "stretch",
        padding: 0,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: COLORS.bg,
        }}
      >
        {/* Header */}
        <div
          style={{
            height: 56,
            background: COLORS.surface,
            borderBottom: `1px solid ${COLORS.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 20px",
            flexShrink: 0,
          }}
        >
          <h3 style={{ margin: 0, color: COLORS.text, fontFamily: FONTS.heading, fontSize: 16, fontWeight: 600 }}>
            Data Models
          </h3>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: COLORS.textDim, fontFamily: FONTS.mono }}>
              Paste TypeScript types, JSON schemas, or any type definition — included in AI output as types.md
            </span>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: COLORS.textMuted,
                cursor: "pointer",
                fontSize: 18,
                padding: "4px 8px",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body: sidebar + editor */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* List */}
          <div
            style={{
              width: 220,
              background: COLORS.surface,
              borderRight: `1px solid ${COLORS.border}`,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
              {dataModels.map((m) => (
                <div
                  key={m.id}
                  onClick={() => { setSelectedId(m.id); setConfirmDelete(false); }}
                  style={{
                    padding: "10px 16px",
                    cursor: "pointer",
                    background: selectedId === m.id ? "rgba(108,92,231,0.15)" : "transparent",
                    borderLeft: selectedId === m.id ? `3px solid ${COLORS.accent}` : "3px solid transparent",
                    color: selectedId === m.id ? COLORS.accentLight : COLORS.textMuted,
                    fontSize: 12,
                    fontFamily: FONTS.mono,
                    fontWeight: selectedId === m.id ? 600 : 400,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    transition: "background 0.1s",
                  }}
                >
                  {m.name || "Untitled Model"}
                </div>
              ))}
              {dataModels.length === 0 && (
                <div style={{ padding: "20px 16px", color: COLORS.textDim, fontSize: 12, fontFamily: FONTS.ui, fontStyle: "italic" }}>
                  No models yet
                </div>
              )}
            </div>

            <div style={{ padding: 12, borderTop: `1px solid ${COLORS.border}`, flexShrink: 0 }}>
              <button
                onClick={handleNew}
                style={{
                  width: "100%",
                  padding: "8px 0",
                  background: "rgba(108,92,231,0.12)",
                  border: `1px solid rgba(108,92,231,0.3)`,
                  borderRadius: 8,
                  color: COLORS.accentLight,
                  fontSize: 12,
                  fontFamily: FONTS.mono,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                + New Model
              </button>
            </div>
          </div>

          {/* Editor */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: 20 }}>
            {selected ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <input
                    type="text"
                    value={selected.name}
                    onChange={(e) => onUpdateModel(selected.id, { name: e.target.value })}
                    placeholder="Model name"
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      background: COLORS.surface,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 8,
                      color: COLORS.text,
                      fontSize: 16,
                      fontFamily: FONTS.heading,
                      fontWeight: 600,
                      outline: "none",
                    }}
                  />
                  {!confirmDelete ? (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      style={{
                        padding: "8px 14px",
                        background: "rgba(255,107,107,0.08)",
                        border: `1px solid rgba(255,107,107,0.2)`,
                        borderRadius: 8,
                        color: COLORS.danger,
                        fontSize: 12,
                        fontFamily: FONTS.mono,
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  ) : (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: COLORS.danger, fontFamily: FONTS.mono }}>Confirm?</span>
                      <button
                        onClick={handleDelete}
                        style={{
                          padding: "6px 12px",
                          background: COLORS.danger,
                          border: "none",
                          borderRadius: 6,
                          color: "#fff",
                          fontSize: 12,
                          fontFamily: FONTS.mono,
                          cursor: "pointer",
                        }}
                      >
                        Yes, delete
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        style={{
                          padding: "6px 12px",
                          background: "rgba(255,255,255,0.06)",
                          border: `1px solid ${COLORS.border}`,
                          borderRadius: 6,
                          color: COLORS.textMuted,
                          fontSize: 12,
                          fontFamily: FONTS.mono,
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                <textarea
                  value={selected.schema}
                  onChange={(e) => onUpdateModel(selected.id, { schema: e.target.value })}
                  placeholder={"// TypeScript types, JSON Schema, or plain description\ninterface User {\n  id: string;\n  email: string;\n  name: string;\n}"}
                  style={{
                    flex: 1,
                    padding: "14px 16px",
                    background: COLORS.surface,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 8,
                    color: COLORS.text,
                    fontFamily: "monospace",
                    fontSize: 13,
                    lineHeight: 1.6,
                    resize: "none",
                    outline: "none",
                  }}
                />
              </>
            ) : (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: COLORS.textDim,
                  fontFamily: FONTS.ui,
                  fontSize: 14,
                  fontStyle: "italic",
                }}
              >
                {dataModels.length === 0
                  ? "Create a model to document your data types"
                  : "Select a model to edit"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
