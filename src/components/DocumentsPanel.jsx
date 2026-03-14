import { useState } from "react";
import { COLORS, FONTS, styles } from "../styles/theme";
import { DEFAULT_DOCUMENT_NAME, TOPBAR_HEIGHT } from "../constants";

export function DocumentsPanel({ documents, onAddDocument, onUpdateDocument, onDeleteDocument, onClose }) {
  const [selectedDocId, setSelectedDocId] = useState(documents[0]?.id || null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const selectedDoc = documents.find((d) => d.id === selectedDocId) || null;

  const handleNew = () => {
    const id = onAddDocument(DEFAULT_DOCUMENT_NAME, "");
    setSelectedDocId(id);
    setConfirmDelete(false);
  };

  const handleDelete = () => {
    if (!selectedDoc) return;
    onDeleteDocument(selectedDoc.id);
    const remaining = documents.filter((d) => d.id !== selectedDoc.id);
    setSelectedDocId(remaining[0]?.id || null);
    setConfirmDelete(false);
  };

  const handleSelectDoc = (id) => {
    setSelectedDocId(id);
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
            height: TOPBAR_HEIGHT,
            background: COLORS.surface,
            borderBottom: `1px solid ${COLORS.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 20px",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 600, color: COLORS.text, fontFamily: FONTS.heading }}>
            Documents
          </span>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: `1px solid ${COLORS.border}`,
              borderRadius: 6,
              color: COLORS.textMuted,
              fontSize: 13,
              padding: "4px 14px",
              cursor: "pointer",
              fontFamily: FONTS.mono,
            }}
          >
            Close
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Sidebar */}
          <div
            style={{
              width: 220,
              background: COLORS.surface,
              borderRight: `1px solid ${COLORS.border}`,
              display: "flex",
              flexDirection: "column",
              flexShrink: 0,
            }}
          >
            <div style={{ padding: "12px 12px 8px" }}>
              <button
                onClick={handleNew}
                style={{
                  width: "100%",
                  padding: "7px 12px",
                  background: COLORS.accent012,
                  border: `1px solid ${COLORS.accent03}`,
                  borderRadius: 6,
                  color: COLORS.accentLight,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: FONTS.mono,
                  textAlign: "left",
                }}
              >
                + New Document
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto" }}>
              {documents.length === 0 && (
                <div style={{ padding: "16px 14px", fontSize: 12, color: COLORS.textDim, fontFamily: FONTS.mono }}>
                  No documents yet
                </div>
              )}
              {documents.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => handleSelectDoc(doc.id)}
                  style={{
                    width: "100%",
                    display: "block",
                    textAlign: "left",
                    padding: "10px 14px",
                    background: selectedDocId === doc.id ? COLORS.accent015 : "transparent",
                    border: "none",
                    borderLeft: `3px solid ${selectedDocId === doc.id ? COLORS.accent : "transparent"}`,
                    cursor: "pointer",
                    color: selectedDocId === doc.id ? COLORS.text : COLORS.textMuted,
                    fontFamily: FONTS.ui,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {doc.name || "Untitled"}
                  </div>
                  <div style={{ fontSize: 11, color: COLORS.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {doc.content ? doc.content.slice(0, 50).replace(/\n/g, " ") : "Empty"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Editor area */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {selectedDoc ? (
              <>
                <div
                  style={{
                    padding: "16px 24px",
                    borderBottom: `1px solid ${COLORS.border}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    flexShrink: 0,
                  }}
                >
                  <input
                    value={selectedDoc.name}
                    onChange={(e) => onUpdateDocument(selectedDoc.id, { name: e.target.value })}
                    placeholder="Document name"
                    style={{
                      ...styles.input,
                      flex: 1,
                      fontSize: 15,
                      fontWeight: 600,
                      background: "transparent",
                      border: "none",
                      borderBottom: `1px solid ${COLORS.border}`,
                      borderRadius: 0,
                      padding: "4px 0",
                      color: COLORS.text,
                    }}
                  />
                  {confirmDelete ? (
                    <>
                      <span style={{ fontSize: 12, color: COLORS.textDim }}>Delete?</span>
                      <button
                        onClick={handleDelete}
                        style={{ ...styles.btnDanger, padding: "4px 12px", fontSize: 12 }}
                      >
                        Yes, Delete
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        style={{ ...styles.btnCancel, padding: "4px 12px", fontSize: 12 }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      style={{ ...styles.btnDanger, padding: "4px 12px", fontSize: 12 }}
                    >
                      Delete
                    </button>
                  )}
                </div>

                <textarea
                  value={selectedDoc.content}
                  onChange={(e) => onUpdateDocument(selectedDoc.id, { content: e.target.value })}
                  placeholder="Paste API documentation, curl commands, OpenAPI specs, or any reference text..."
                  style={{
                    flex: 1,
                    padding: "20px 24px",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    resize: "none",
                    color: COLORS.text,
                    fontFamily: FONTS.mono,
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                />
              </>
            ) : (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 16,
                }}
              >
                <div style={{ fontSize: 36, opacity: 0.2 }}>&#128196;</div>
                <div style={{ fontSize: 14, color: COLORS.textDim, textAlign: "center" }}>
                  No document selected.<br />Create one to get started.
                </div>
                <button
                  onClick={handleNew}
                  style={{
                    padding: "8px 20px",
                    background: COLORS.accent012,
                    border: `1px solid ${COLORS.accent03}`,
                    borderRadius: 8,
                    color: COLORS.accentLight,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: FONTS.mono,
                  }}
                >
                  + New Document
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
