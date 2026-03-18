import { useState, useRef, useEffect } from "react";
import { COLORS, FONTS, Z_INDEX } from "../styles/theme";
import { TOPBAR_HEIGHT, ICON_PATH, APP_NAME } from "../constants";

function DocumentsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  );
}

function ModelsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3"/>
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
    </svg>
  );
}

function FileMenuIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function TopBarIconButton({ icon: Icon, title, badge, isActive, onClick, style: extraStyle }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        width: 32,
        height: 32,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: isActive || hovered ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${isActive ? COLORS.textDim : COLORS.border}`,
        borderRadius: 6,
        color: hovered || isActive ? COLORS.text : COLORS.textMuted,
        cursor: "pointer",
        transition: "all 0.15s",
        flexShrink: 0,
        ...extraStyle,
      }}
    >
      <Icon />
      {badge > 0 && (
        <span style={{
          position: "absolute",
          top: -4,
          right: -4,
          background: COLORS.accent,
          color: "#282c34",
          borderRadius: 8,
          fontSize: 9,
          fontWeight: 700,
          fontFamily: FONTS.mono,
          padding: "1px 4px",
          lineHeight: 1.4,
          minWidth: 14,
          textAlign: "center",
          pointerEvents: "none",
        }}>
          {badge}
        </span>
      )}
    </button>
  );
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3"/>
      <circle cx="6" cy="12" r="3"/>
      <circle cx="18" cy="19" r="3"/>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>
  );
}

export function TopBar({ screenCount, connectionCount, onExport, onImport, onGenerate, canUndo, canRedo, onUndo, onRedo, connectedFileName, saveStatus, isFileSystemSupported, onNew, onOpen, onSaveAs, onDocuments, documentCount = 0, onDataModels, dataModelCount = 0, collabState, onShare, collabBadge, collabPresence }) {
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const fileMenuRef = useRef(null);

  useEffect(() => {
    if (!fileMenuOpen) return;
    function handleMouseDown(e) {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target)) {
        setFileMenuOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === "Escape") setFileMenuOpen(false);
    }
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [fileMenuOpen]);

  const statusDotColor = saveStatus === "saving" ? COLORS.warning
    : saveStatus === "saved" ? COLORS.success
    : saveStatus === "error" ? COLORS.danger
    : null;

  const menuItemStyle = (disabled) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    padding: "8px 14px",
    background: "transparent",
    border: "none",
    borderRadius: 6,
    color: disabled ? COLORS.textDim : COLORS.textMuted,
    fontSize: 12,
    fontWeight: 600,
    fontFamily: FONTS.mono,
    cursor: disabled ? "not-allowed" : "pointer",
    textAlign: "left",
    gap: 24,
  });

  return (
    <>
    <style>{`
      @keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      .ff-menu-item:hover:not(:disabled) { background: rgba(255,255,255,0.06) !important; }
    `}</style>
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
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <img
          src={ICON_PATH}
          alt={APP_NAME}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
          }}
        />
        <span
          style={{
            fontSize: 17,
            fontWeight: 600,
            color: COLORS.text,
            fontFamily: FONTS.heading,
            letterSpacing: "-0.02em",
          }}
        >
          Drawd
        </span>
        <span
          style={{
            fontSize: 10,
            color: COLORS.textDim,
            background: COLORS.accent01,
            padding: "3px 8px",
            borderRadius: 4,
            fontFamily: FONTS.mono,
            border: `1px solid ${COLORS.accent02}`,
          }}
        >
          App Flow Designer
        </span>
        {connectedFileName && (
          <span
            style={{
              fontSize: 10,
              color: COLORS.textMuted,
              background: "rgba(255,255,255,0.04)",
              padding: "3px 8px",
              borderRadius: 4,
              fontFamily: FONTS.mono,
              border: `1px solid ${COLORS.border}`,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {statusDotColor && (
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: statusDotColor,
                  display: "inline-block",
                  flexShrink: 0,
                  animation: saveStatus === "saving" ? "pulse-dot 1s infinite" : "none",
                }}
              />
            )}
            {connectedFileName}
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 11, color: COLORS.textDim, fontFamily: FONTS.mono }}>
          {screenCount} screen{screenCount !== 1 ? "s" : ""} &middot; {connectionCount} link{connectionCount !== 1 ? "s" : ""}
        </span>

        <div style={{ display: "flex", gap: 2 }}>
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Cmd+Z)"
            style={{
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: `1px solid ${canUndo ? COLORS.border : "transparent"}`,
              borderRadius: 6,
              color: canUndo ? COLORS.textMuted : COLORS.textDim,
              fontSize: 15,
              cursor: canUndo ? "pointer" : "not-allowed",
              opacity: canUndo ? 1 : 0.4,
              transition: "all 0.2s",
            }}
          >
            &#8617;
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Cmd+Shift+Z)"
            style={{
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: `1px solid ${canRedo ? COLORS.border : "transparent"}`,
              borderRadius: 6,
              color: canRedo ? COLORS.textMuted : COLORS.textDim,
              fontSize: 15,
              cursor: canRedo ? "pointer" : "not-allowed",
              opacity: canRedo ? 1 : 0.4,
              transition: "all 0.2s",
            }}
          >
            &#8618;
          </button>
        </div>

        <TopBarIconButton
          icon={DocumentsIcon}
          title="Documents"
          badge={documentCount}
          onClick={onDocuments}
        />

        <TopBarIconButton
          icon={ModelsIcon}
          title="Data Models"
          badge={dataModelCount}
          onClick={onDataModels}
        />

        {/* Collaboration UI */}
        {collabState?.isConnected ? (
          <>
            {collabBadge}
            {collabPresence}
          </>
        ) : (
          <TopBarIconButton
            icon={ShareIcon}
            title="Share Session"
            onClick={onShare}
          />
        )}

        {/* File dropdown */}
        <div ref={fileMenuRef} style={{ position: "relative" }}>
          <TopBarIconButton
            icon={FileMenuIcon}
            title="File"
            isActive={fileMenuOpen}
            onClick={() => setFileMenuOpen((v) => !v)}
          />

          {fileMenuOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                right: 0,
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 10,
                padding: "6px",
                minWidth: 210,
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                zIndex: Z_INDEX.toolbar,
              }}
            >
              <button
                className="ff-menu-item"
                onClick={() => { setFileMenuOpen(false); onNew(); }}
                style={menuItemStyle(false)}
              >
                <span>New</span>
              </button>

              {isFileSystemSupported && (
                <button
                  className="ff-menu-item"
                  onClick={() => { setFileMenuOpen(false); onOpen(); }}
                  style={menuItemStyle(false)}
                >
                  <span>Open</span>
                  <span style={{ fontSize: 10, color: COLORS.textDim, fontWeight: 400 }}>Cmd+O</span>
                </button>
              )}

              {isFileSystemSupported && (
                <button
                  className="ff-menu-item"
                  onClick={() => { if (screenCount > 0) { setFileMenuOpen(false); onSaveAs(); } }}
                  disabled={screenCount === 0}
                  style={menuItemStyle(screenCount === 0)}
                >
                  <span>Save As</span>
                  <span style={{ fontSize: 10, color: COLORS.textDim, fontWeight: 400 }}>Cmd+S</span>
                </button>
              )}

              {isFileSystemSupported && (
                <div style={{ height: 1, background: COLORS.border, margin: "6px 0" }} />
              )}

              <button
                className="ff-menu-item"
                onClick={() => { setFileMenuOpen(false); onImport(); }}
                style={menuItemStyle(false)}
              >
                <span>Import</span>
              </button>

              <button
                className="ff-menu-item"
                onClick={() => { if (screenCount > 0) { setFileMenuOpen(false); onExport(); } }}
                disabled={screenCount === 0}
                style={menuItemStyle(screenCount === 0)}
              >
                <span>Export</span>
              </button>
            </div>
          )}
        </div>

        <button
          onClick={onGenerate}
          disabled={screenCount === 0}
          title="Generate AI Instructions"
          style={{
            padding: "8px 16px",
            background: screenCount === 0
              ? COLORS.accent008
              : `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentLight})`,
            border: "none",
            borderRadius: 8,
            color: screenCount === 0 ? COLORS.textDim : "#282c34",
            fontSize: 12,
            fontWeight: 700,
            cursor: screenCount === 0 ? "not-allowed" : "pointer",
            fontFamily: FONTS.mono,
            boxShadow: screenCount > 0 ? `0 4px 16px ${COLORS.accentGlow}` : "none",
            transition: "all 0.2s",
            letterSpacing: "0.02em",
          }}
        >
          &#9889; Generate
        </button>
      </div>
    </div>
    </>
  );
}
