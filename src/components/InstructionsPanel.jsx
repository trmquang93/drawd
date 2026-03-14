import { useState, useCallback } from "react";
import { COLORS, FONTS, Z_INDEX } from "../styles/theme";
import { buildZip, downloadZip } from "../utils/zipBuilder";
import { COPY_FEEDBACK_MS } from "../constants";

function renderMarkdown(text) {
  const lines = text.split("\n");
  let html = "";
  let inUl = false;
  let inOl = false;

  const closeList = () => {
    if (inUl) { html += "</ul>"; inUl = false; }
    if (inOl) { html += "</ol>"; inOl = false; }
  };

  const inlineFormat = (line) =>
    line
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" style="max-width:100%;border-radius:6px;margin:8px 0" />')
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, `<code style="background:${COLORS.accent012};padding:2px 5px;border-radius:3px;font-size:0.9em">$1</code>`);

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line === "---" || line === "***") {
      closeList();
      html += "<hr/>";
      continue;
    }

    if (/^\|.+\|$/.test(line)) {
      // Table rows — pass through as preformatted
      closeList();
      html += `<div style="font-family:monospace;font-size:12px;white-space:pre">${inlineFormat(line)}</div>`;
      continue;
    }

    const h1 = line.match(/^# (.+)/);
    if (h1) { closeList(); html += `<h1 style="font-size:22px;margin:20px 0 8px;font-weight:700">${inlineFormat(h1[1])}</h1>`; continue; }

    const h2 = line.match(/^## (.+)/);
    if (h2) { closeList(); html += `<h2 style="font-size:17px;margin:18px 0 6px;font-weight:600">${inlineFormat(h2[1])}</h2>`; continue; }

    const h3 = line.match(/^### (.+)/);
    if (h3) { closeList(); html += `<h3 style="font-size:14px;margin:14px 0 4px;font-weight:600">${inlineFormat(h3[1])}</h3>`; continue; }

    const ul = line.match(/^[-*] (.+)/);
    if (ul) {
      if (inOl) { html += "</ol>"; inOl = false; }
      if (!inUl) { html += "<ul>"; inUl = true; }
      html += `<li>${inlineFormat(ul[1])}</li>`;
      continue;
    }

    const olIndented = line.match(/^ {2,}[-*] (.+)/);
    if (olIndented) {
      html += `<li style="margin-left:16px">${inlineFormat(olIndented[1])}</li>`;
      continue;
    }

    const ol = line.match(/^\d+\. (.+)/);
    if (ol) {
      if (inUl) { html += "</ul>"; inUl = false; }
      if (!inOl) { html += "<ol>"; inOl = true; }
      html += `<li>${inlineFormat(ol[1])}</li>`;
      continue;
    }

    closeList();

    if (line.trim() === "") {
      html += "<br/>";
    } else {
      html += `<p style="margin:4px 0">${inlineFormat(line)}</p>`;
    }
  }

  closeList();
  return html;
}

export function InstructionsPanel({ instructions, onClose, isPreview = false }) {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState("rendered");

  const files = instructions?.files || [];
  const images = instructions?.images || [];
  const activeFile = files[activeTab];

  const copyTab = useCallback(() => {
    if (!activeFile) return;
    navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
  }, [activeFile]);

  const copyAll = useCallback(() => {
    const all = files.map(f => f.content).join("\n\n---\n\n");
    navigator.clipboard.writeText(all);
    setCopied(true);
    setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
  }, [files]);

  const onDownloadZip = useCallback(() => {
    const zipFiles = [
      ...files.map(f => ({ name: f.name, content: f.content })),
      ...images.map(img => ({ name: img.name, content: img.data })),
    ];
    const blob = buildZip(zipFiles);
    downloadZip(blob, "drawd-instructions.zip");
  }, [files, images]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: Z_INDEX.modal,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 16,
          width: "90%",
          maxWidth: 800,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 80px rgba(0,0,0,0.7)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px 0",
            borderBottom: `1px solid ${COLORS.border}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>&#9889;</span>
              <h3
                style={{
                  margin: 0,
                  color: COLORS.text,
                  fontFamily: FONTS.heading,
                  fontSize: 17,
                  fontWeight: 600,
                }}
              >
                {isPreview ? "Preview — AI Build Instructions" : "AI Build Instructions"}
              </h3>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {!isPreview && (
                <button
                  onClick={onDownloadZip}
                  style={{
                    padding: "7px 16px",
                    background: "rgba(152,195,121,0.12)",
                    border: "1px solid rgba(152,195,121,0.3)",
                    borderRadius: 8,
                    color: COLORS.success,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: FONTS.mono,
                    transition: "all 0.2s",
                  }}
                >
                  Download ZIP
                </button>
              )}
              <button
                onClick={copyAll}
                style={{
                  padding: "7px 16px",
                  background: copied ? "rgba(152,195,121,0.15)" : COLORS.accent015,
                  border: `1px solid ${copied ? "rgba(152,195,121,0.3)" : COLORS.accent03}`,
                  borderRadius: 8,
                  color: copied ? COLORS.success : COLORS.accentLight,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: FONTS.mono,
                  transition: "all 0.2s",
                }}
              >
                {copied ? "\u2713 Copied!" : "Copy All"}
              </button>
              <button
                onClick={onClose}
                style={{
                  padding: "7px 12px",
                  background: "transparent",
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 8,
                  color: COLORS.textMuted,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                &#10005;
              </button>
            </div>
          </div>

          {/* Tab bar */}
          <div style={{ display: "flex", gap: 0 }}>
            {files.map((f, i) => (
              <button
                key={f.name}
                onClick={() => { setActiveTab(i); setCopied(false); }}
                style={{
                  padding: "8px 16px",
                  background: "transparent",
                  border: "none",
                  borderBottom: i === activeTab
                    ? `2px solid ${COLORS.accent}`
                    : "2px solid transparent",
                  color: i === activeTab ? COLORS.text : COLORS.textDim,
                  fontSize: 12,
                  fontWeight: i === activeTab ? 600 : 400,
                  cursor: "pointer",
                  fontFamily: FONTS.mono,
                  transition: "all 0.15s",
                }}
              >
                {f.name}
              </button>
            ))}

            <div style={{ flex: 1 }} />

            {/* View mode toggle */}
            <button
              onClick={() => setViewMode(viewMode === "rendered" ? "raw" : "rendered")}
              style={{
                padding: "6px 12px",
                background: "transparent",
                border: `1px solid ${COLORS.border}`,
                borderBottom: "none",
                borderRadius: "6px 6px 0 0",
                color: COLORS.textDim,
                fontSize: 10,
                cursor: "pointer",
                fontFamily: FONTS.mono,
              }}
            >
              {viewMode === "rendered" ? "Raw" : "Rendered"}
            </button>

            {/* Copy current tab */}
            <button
              onClick={copyTab}
              style={{
                padding: "6px 12px",
                background: "transparent",
                border: `1px solid ${COLORS.border}`,
                borderBottom: "none",
                borderRadius: "6px 6px 0 0",
                color: COLORS.textDim,
                fontSize: 10,
                cursor: "pointer",
                fontFamily: FONTS.mono,
                marginLeft: 4,
              }}
            >
              Copy
            </button>
          </div>
        </div>

        {/* Content */}
        {activeFile && viewMode === "raw" && (
          <pre
            style={{
              margin: 0,
              padding: 24,
              overflow: "auto",
              flex: 1,
              color: COLORS.text,
              fontSize: 12.5,
              lineHeight: 1.7,
              fontFamily: FONTS.mono,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {activeFile.content}
          </pre>
        )}

        {activeFile && viewMode === "rendered" && (
          <div
            style={{
              margin: 0,
              padding: 24,
              overflow: "auto",
              flex: 1,
              color: COLORS.text,
              fontSize: 13,
              lineHeight: 1.7,
              fontFamily: FONTS.ui,
            }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(activeFile.content) }}
          />
        )}
      </div>
    </div>
  );
}
