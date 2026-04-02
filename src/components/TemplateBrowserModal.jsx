import { useState } from "react";
import { COLORS, FONTS, styles } from "../styles/theme";
import { TEMPLATES } from "../templates";

const TemplateIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

function TemplateCard({ template, onSelect, loading }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={() => onSelect(template)}
      disabled={loading}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 10,
        padding: 16,
        background: hovered ? COLORS.surfaceHover : COLORS.bg,
        border: `1px solid ${hovered ? COLORS.accent : COLORS.border}`,
        borderRadius: 12,
        cursor: loading ? "wait" : "pointer",
        transition: "all 0.15s ease",
        textAlign: "left",
        outline: "none",
        width: "100%",
        opacity: loading ? 0.6 : 1,
      }}
    >
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
      }}>
        <span style={{
          color: COLORS.text,
          fontFamily: FONTS.heading,
          fontSize: 14,
          fontWeight: 600,
        }}>
          {template.name}
        </span>
        <span style={{
          color: COLORS.textDim,
          fontFamily: FONTS.mono,
          fontSize: 11,
          background: COLORS.accent01,
          padding: "2px 8px",
          borderRadius: 4,
        }}>
          {template.screenCount} screens
        </span>
      </div>
      <span style={{
        color: COLORS.textMuted,
        fontFamily: FONTS.ui,
        fontSize: 12,
        lineHeight: 1.4,
      }}>
        {template.description}
      </span>
      <span style={{
        color: COLORS.textDim,
        fontFamily: FONTS.mono,
        fontSize: 10,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
      }}>
        {template.category}
      </span>
    </button>
  );
}

export function TemplateBrowserModal({ onInsert, onClose }) {
  const [loading, setLoading] = useState(false);

  const handleSelect = async (template) => {
    setLoading(true);
    try {
      const data = await template.getData();
      onInsert(data);
    } catch {
      setLoading(false);
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          ...styles.modalCard,
          width: 540,
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <TemplateIcon />
            <div>
              <h3 style={{ ...styles.modalTitle, margin: 0 }}>Templates</h3>
              <p style={{
                margin: "4px 0 0",
                color: COLORS.textMuted,
                fontFamily: FONTS.ui,
                fontSize: 12,
              }}>
                Start with a pre-built flow and customize it
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: COLORS.textMuted,
              fontSize: 18,
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: 4,
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          overflow: "auto",
          paddingRight: 4,
        }}>
          {TEMPLATES.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onSelect={handleSelect}
              loading={loading}
            />
          ))}
        </div>

        <div style={{
          marginTop: 16,
          paddingTop: 16,
          borderTop: `1px solid ${COLORS.border}`,
          display: "flex",
          justifyContent: "flex-end",
        }}>
          <button onClick={onClose} style={styles.btnCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
