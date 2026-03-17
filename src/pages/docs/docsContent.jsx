import React from "react";
import { L_COLORS, L_FONTS } from "../landing/landingTheme";
import { DOMAIN } from "../../constants";
import rawGuide from "./userGuide.md?raw";

// ── Markdown-to-JSX renderer for the docs page ──────────────────────────────

const escapeHtml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Convert inline markdown (bold, code spans) to HTML. Operates on pre-escaped text. */
function inlineFmt(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(
      /`([^`]+)`/g,
      `<kbd style="display:inline-block;font-family:${L_FONTS.mono};font-size:12px;color:${L_COLORS.text};background:rgba(255,255,255,0.06);border:1px solid ${L_COLORS.border};border-radius:5px;padding:2px 7px;line-height:1.6;letter-spacing:0">$1</kbd>`,
    );
}

/**
 * Detect shortcut-row lines: `| \`key\` ... | action |`
 * Returns { keys: string[], action: string } or null.
 */
function parseShortcutRow(line) {
  const m = line.match(/^\|\s*(.+?)\s*\|\s*(.+?)\s*\|?\s*$/);
  if (!m) return null;
  const rawKeys = m[1];
  const action = m[2];
  // Keys cell must contain at least one backtick-wrapped segment
  const keys = [...rawKeys.matchAll(/`([^`]+)`/g)].map((k) => k[1]);
  if (keys.length === 0) return null;
  return { keys, action };
}

/** Render a single section's markdown body to an HTML string. */
function renderSection(md) {
  const lines = md.split("\n");
  let html = "";
  let inUl = false;
  let inCallout = false;
  let calloutType = "";
  let calloutLines = [];

  const closeUl = () => {
    if (inUl) {
      html += "</ul>";
      inUl = false;
    }
  };

  const flushCallout = () => {
    if (!inCallout) return;
    inCallout = false;
    const body = calloutLines.join(" ");
    if (calloutType === "TIP") {
      html +=
        `<div style="background:${L_COLORS.accent008};border:1px solid ${L_COLORS.accent02};border-radius:8px;padding:12px 16px;margin-bottom:16px">` +
        `<span style="font-family:${L_FONTS.mono};font-size:11px;font-weight:600;color:${L_COLORS.accentLight};letter-spacing:0.06em">TIP</span>` +
        `<div style="font-family:${L_FONTS.ui};font-size:14px;color:${L_COLORS.textMuted};line-height:1.65;margin-top:4px">${inlineFmt(escapeHtml(body))}</div>` +
        `</div>`;
    } else {
      html +=
        `<div style="background:${L_COLORS.amber007};border:1px solid ${L_COLORS.amber02};border-radius:8px;padding:12px 16px;margin-bottom:16px">` +
        `<span style="font-family:${L_FONTS.mono};font-size:11px;font-weight:600;color:${L_COLORS.amber};letter-spacing:0.06em">NOTE</span>` +
        `<div style="font-family:${L_FONTS.ui};font-size:14px;color:${L_COLORS.textMuted};line-height:1.65;margin-top:4px">${inlineFmt(escapeHtml(body))}</div>` +
        `</div>`;
    }
    calloutLines = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    // Callout start: > [!TIP] or > [!NOTE]
    const calloutStart = trimmed.match(/^>\s*\[!(TIP|NOTE)\]\s*$/);
    if (calloutStart) {
      closeUl();
      flushCallout();
      inCallout = true;
      calloutType = calloutStart[1];
      continue;
    }

    // Continuation of a callout block
    if (inCallout) {
      if (trimmed.startsWith("> ")) {
        calloutLines.push(trimmed.slice(2));
        continue;
      }
      // Empty blockquote continuation line
      if (trimmed === ">") {
        calloutLines.push("");
        continue;
      }
      // End of callout
      flushCallout();
    }

    // Shortcut row: | `key` `key` | action |
    const sc = parseShortcutRow(trimmed);
    if (sc) {
      closeUl();
      const keysHtml = sc.keys
        .map(
          (k) =>
            `<kbd style="display:inline-block;font-family:${L_FONTS.mono};font-size:12px;color:${L_COLORS.text};background:rgba(255,255,255,0.06);border:1px solid ${L_COLORS.border};border-radius:5px;padding:2px 7px;line-height:1.6;letter-spacing:0">${escapeHtml(k)}</kbd>`,
        )
        .join(" ");
      html +=
        `<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">` +
        `<div style="display:flex;gap:4px;flex-shrink:0;min-width:140px">${keysHtml}</div>` +
        `<span style="font-family:${L_FONTS.ui};font-size:14px;color:${L_COLORS.textMuted}">${inlineFmt(escapeHtml(sc.action))}</span>` +
        `</div>`;
      continue;
    }

    // H3
    const h3 = trimmed.match(/^### (.+)/);
    if (h3) {
      closeUl();
      html += `<h3 style="font-family:${L_FONTS.heading};font-weight:600;font-size:16px;color:${L_COLORS.text};margin-top:28px;margin-bottom:8px;letter-spacing:-0.02em">${inlineFmt(escapeHtml(h3[1]))}</h3>`;
      continue;
    }

    // Unordered list item
    const li = trimmed.match(/^[-*] (.+)/);
    if (li) {
      if (!inUl) {
        html += `<ul style="padding-left:20px;margin:0 0 16px 0">`;
        inUl = true;
      }
      html += `<li style="font-family:${L_FONTS.ui};font-size:15px;color:${L_COLORS.textMuted};line-height:1.75;margin-bottom:4px">${inlineFmt(escapeHtml(li[1]))}</li>`;
      continue;
    }

    closeUl();

    // Empty line — skip (paragraph spacing handled by margins)
    if (trimmed === "") continue;

    // Paragraph
    html += `<p style="font-family:${L_FONTS.ui};font-size:15px;color:${L_COLORS.textMuted};line-height:1.75;margin-top:0;margin-bottom:16px">${inlineFmt(escapeHtml(trimmed))}</p>`;
  }

  closeUl();
  flushCallout();
  return html;
}

// ── Parse the raw markdown into DOC_SECTIONS ─────────────────────────────────

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function parseGuide(raw) {
  // Replace {{DOMAIN}} template placeholder
  const md = raw.replace(/\{\{DOMAIN\}\}/g, DOMAIN);

  // Split on ## headings (level 2). Each chunk starts with the heading line.
  const chunks = md.split(/^(?=## )/m).filter((c) => c.trim());

  return chunks.map((chunk) => {
    const firstNewline = chunk.indexOf("\n");
    const titleLine = firstNewline === -1 ? chunk : chunk.slice(0, firstNewline);
    const title = titleLine.replace(/^##\s+/, "").trim();
    const body = firstNewline === -1 ? "" : chunk.slice(firstNewline + 1);

    return {
      id: slugify(title),
      title,
      content: (
        <div dangerouslySetInnerHTML={{ __html: renderSection(body) }} />
      ),
    };
  });
}

export const DOC_SECTIONS = parseGuide(rawGuide);
