// Satori-safe HTML building blocks.
//
// Every function returns a string fragment that is valid Satori HTML:
//   - `display:flex` on every container with multiple children
//   - No `position:absolute`
//   - `white-space:nowrap` on text leaves
//   - Inline styles only
//
// Fragments are composable: pass the return value of one block as the
// `children` / `body` / `footer` of another.

import { mergeTokens } from "./tokens.js";
import { storeFragment } from "./store.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

function wrapRef(blockType, html, inline) {
  if (inline !== false) return html;
  const id = storeFragment(html);
  return `<x-${blockType} id="${id}"/>`;
}

// ── compose_page ─────────────────────────────────────────────────────────────

export function composePage({ safeArea, background, children, tokens: custom, inline } = {}) {
  const t = mergeTokens(custom);
  const bg = background || t.background;
  const top = safeArea?.top ?? 59;
  const bottom = safeArea?.bottom ?? 34;

  const html =
    `<div style="display:flex;flex-direction:column;width:100%;height:100%;background:${bg};font-family:${t.fontFamily};">` +
      `<div style="display:flex;flex-shrink:0;height:${top}px;"></div>` +
      `<div style="display:flex;flex-direction:column;flex:1;padding:0 16px;overflow:hidden;">` +
        (children || "") +
      `</div>` +
      `<div style="display:flex;flex-shrink:0;height:${bottom}px;"></div>` +
    `</div>`;

  return wrapRef("page", html, inline);
}

// ── compose_button ───────────────────────────────────────────────────────────

export function composeButton({ label, variant = "primary", leadingIcon, trailingIcon, tokens: custom, inline } = {}) {
  const t = mergeTokens(custom);

  let bg, color, border;
  switch (variant) {
    case "secondary":
      bg = t.secondary;
      color = t.secondaryText;
      border = `2px solid ${t.secondaryBorder}`;
      break;
    case "destructive":
      bg = t.destructive;
      color = t.destructiveText;
      border = "none";
      break;
    default:
      bg = t.primary;
      color = t.primaryText;
      border = "none";
  }

  const parts = [];
  if (leadingIcon) {
    parts.push(`<div style="display:flex;flex-shrink:0;margin-right:8px;">${leadingIcon}</div>`);
  }
  parts.push(
    `<div style="display:flex;white-space:nowrap;font-weight:600;font-size:17px;color:${color};">${label || ""}</div>`
  );
  if (trailingIcon) {
    parts.push(`<div style="display:flex;flex-shrink:0;margin-left:8px;">${trailingIcon}</div>`);
  }

  const html =
    `<div style="display:flex;flex-direction:row;align-items:center;justify-content:center;` +
    `padding:14px 20px;border-radius:${t.radius}px;background:${bg};border:${border};">` +
      parts.join("") +
    `</div>`;

  return wrapRef("button", html, inline);
}

// ── compose_list_row ─────────────────────────────────────────────────────────

const CHEVRON_SVG =
  `<svg width="8" height="13" viewBox="0 0 8 13" fill="none" xmlns="http://www.w3.org/2000/svg">` +
  `<path d="M1 1L6.5 6.5L1 12" stroke="#C7C7CC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` +
  `</svg>`;

export function composeListRow({ leadingIcon, title, subtitle, trailingChevron = true, tokens: custom, inline } = {}) {
  const t = mergeTokens(custom);

  const parts = [];

  if (leadingIcon) {
    parts.push(
      `<div style="display:flex;flex-shrink:0;align-items:center;justify-content:center;margin-right:12px;">${leadingIcon}</div>`
    );
  }

  const textParts = [
    `<div style="display:flex;white-space:nowrap;font-size:17px;color:${t.text};">${title || ""}</div>`,
  ];
  if (subtitle) {
    textParts.push(
      `<div style="display:flex;white-space:nowrap;font-size:15px;color:${t.textSecondary};margin-top:2px;">${subtitle}</div>`
    );
  }
  parts.push(
    `<div style="display:flex;flex-direction:column;flex:1;">${textParts.join("")}</div>`
  );

  if (trailingChevron) {
    parts.push(
      `<div style="display:flex;flex-shrink:0;align-items:center;margin-left:8px;">${CHEVRON_SVG}</div>`
    );
  }

  const html =
    `<div style="display:flex;flex-direction:row;align-items:center;padding:12px 0;">` +
      parts.join("") +
    `</div>`;

  return wrapRef("list-row", html, inline);
}

// ── compose_section_header ───────────────────────────────────────────────────

export function composeSectionHeader({ title, action, tokens: custom, inline } = {}) {
  const t = mergeTokens(custom);

  const parts = [
    `<div style="display:flex;flex:1;white-space:nowrap;font-size:13px;font-weight:600;color:${t.sectionHeader};letter-spacing:0.5px;">${(title || "").toUpperCase()}</div>`,
  ];
  if (action) {
    parts.push(
      `<div style="display:flex;flex-shrink:0;white-space:nowrap;font-size:15px;color:${t.primary};">${action}</div>`
    );
  }

  const html =
    `<div style="display:flex;flex-direction:row;align-items:center;padding:8px 0;margin-top:24px;margin-bottom:8px;">` +
      parts.join("") +
    `</div>`;

  return wrapRef("section-header", html, inline);
}

// ── compose_card ─────────────────────────────────────────────────────────────

export function composeCard({ title, body, footer, tokens: custom, inline } = {}) {
  const t = mergeTokens(custom);

  const parts = [];

  if (title) {
    parts.push(
      `<div style="display:flex;padding:16px 16px 8px 16px;">` +
        `<div style="display:flex;white-space:nowrap;font-size:17px;font-weight:600;color:${t.text};">${title}</div>` +
      `</div>`
    );
  }

  if (body) {
    parts.push(
      `<div style="display:flex;flex-direction:column;padding:${title ? "0" : "16px"} 16px ${footer ? "8px" : "16px"} 16px;">` +
        body +
      `</div>`
    );
  }

  if (footer) {
    parts.push(
      `<div style="display:flex;flex-direction:column;padding:8px 16px 16px 16px;">` +
        footer +
      `</div>`
    );
  }

  const html =
    `<div style="display:flex;flex-direction:column;background:${t.cardBackground};border-radius:${t.radius}px;overflow:hidden;">` +
      parts.join("") +
    `</div>`;

  return wrapRef("card", html, inline);
}
