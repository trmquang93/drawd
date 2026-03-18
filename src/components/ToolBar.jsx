import { COLORS, FONTS } from "../styles/theme";

const SelectIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M4 2.5L10.5 20.5L13 13L20.5 10.5L4 2.5Z" />
  </svg>
);

const PanIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
    <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
    <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
    <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
  </svg>
);

const UploadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
    <polyline points="12 7 12 3 8 3" />
    <line x1="12" y1="3" x2="12" y2="7" />
    <polyline points="9 6 12 3 15 6" />
  </svg>
);

const BlankScreenIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="2" />
    <line x1="9" y1="7" x2="15" y2="7" strokeOpacity="0.5" />
    <line x1="9" y1="10" x2="15" y2="10" strokeOpacity="0.5" />
    <line x1="9" y1="13" x2="12" y2="13" strokeOpacity="0.5" />
  </svg>
);

const StickyNoteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8l6-6V4a2 2 0 0 0-2-2z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const TOOLS = [
  { id: "select", label: "Select", icon: SelectIcon, key: "V" },
  { id: "pan", label: "Pan", icon: PanIcon, key: "H" },
];

const dividerStyle = {
  width: 1,
  height: 20,
  background: COLORS.border,
  margin: "0 2px",
  flexShrink: 0,
};

function ActionButton({ icon: Icon, label, shortcutKey, onClick }) {
  return (
    <button
      onClick={onClick}
      title={`${label} (${shortcutKey})`}
      style={{
        width: 36,
        height: 36,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        border: "1px solid transparent",
        borderRadius: 8,
        color: COLORS.textMuted,
        cursor: "pointer",
        transition: "all 0.12s ease",
        padding: 0,
        outline: "none",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = COLORS.surfaceHover;
        e.currentTarget.style.color = COLORS.text;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = COLORS.textMuted;
      }}
    >
      <Icon />
    </button>
  );
}

export function ToolBar({ activeTool, onToolChange, onUpload, onAddBlank, onAddStickyNote, isReadOnly }) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: "6px 8px",
        display: "flex",
        alignItems: "center",
        gap: 4,
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        zIndex: 100,
        userSelect: "none",
      }}
    >
      {TOOLS.map((tool, i) => {
        const isActive = activeTool === tool.id;
        const Icon = tool.icon;
        return (
          <span key={tool.id} style={{ display: "contents" }}>
            {i > 0 && <div style={dividerStyle} />}
            <button
              onClick={() => onToolChange(tool.id)}
              title={`${tool.label} tool (${tool.key})`}
              style={{
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: isActive ? COLORS.accent018 : "transparent",
                border: isActive ? `1px solid ${COLORS.accent}` : "1px solid transparent",
                borderRadius: 8,
                color: isActive ? COLORS.accentLight : COLORS.textMuted,
                cursor: "pointer",
                transition: "all 0.12s ease",
                padding: 0,
                outline: "none",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = COLORS.surfaceHover;
                  e.currentTarget.style.color = COLORS.text;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = COLORS.textMuted;
                }
              }}
            >
              <Icon />
            </button>
          </span>
        );
      })}

      {!isReadOnly && (
        <>
          <div style={dividerStyle} />
          <ActionButton icon={UploadIcon} label="Upload Screens" shortcutKey="U" onClick={onUpload} />
          <ActionButton icon={BlankScreenIcon} label="Add Blank Screen" shortcutKey="B" onClick={onAddBlank} />
          <ActionButton icon={StickyNoteIcon} label="Add Sticky Note" shortcutKey="N" onClick={onAddStickyNote} />
        </>
      )}
    </div>
  );
}
