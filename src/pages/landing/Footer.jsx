import { L_COLORS, L_FONTS } from "./landingTheme";
import { GITHUB_URL } from "../../constants";

const PRODUCT_LINKS = [
  { label: "Editor", href: "#/editor" },
  { label: "Features", href: "#features" },
  { label: "GitHub", href: GITHUB_URL },
];

const RESOURCE_LINKS = [
  { label: "Docs", href: "#/docs" },
  { label: "Changelog", href: "#" },
  { label: "Contact", href: "#" },
];

function FooterLink({ label, href }) {
  const isExternal = href.startsWith("http");
  const isHash = href.startsWith("#");
  return (
    <a
      href={href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      onClick={
        isHash && !isExternal
          ? (e) => {
              if (href.startsWith("#/")) return; // let hash routing handle it
              e.preventDefault();
              const id = href.slice(1);
              const el = document.getElementById(id);
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }
          : undefined
      }
      style={{
        display: "block",
        fontFamily: L_FONTS.ui,
        fontSize: 14,
        color: L_COLORS.textMuted,
        textDecoration: "none",
        lineHeight: 2,
        transition: "color 0.18s ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = L_COLORS.text; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = L_COLORS.textMuted; }}
    >
      {label}
    </a>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer>
      {/* Gradient top border */}
      <div
        style={{
          height: 1,
          background: `linear-gradient(90deg, transparent 0%, ${L_COLORS.accent04} 30%, ${L_COLORS.amber03} 70%, transparent 100%)`,
        }}
      />

      <div
        style={{
          maxWidth: 1000,
          margin: "0 auto",
          padding: "48px 40px 32px",
          boxSizing: "border-box",
        }}
      >
        {/* Three-column layout */}
        <div
          className="footer-cols"
          style={{
            display: "flex",
            gap: 64,
            marginBottom: 48,
          }}
        >
          {/* Col 1: Logo + tagline */}
          <div style={{ flex: "0 0 200px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
              <img src="/icon.svg" alt="Drawd" width={22} height={22} />
              <span
                style={{
                  fontFamily: L_FONTS.heading,
                  fontWeight: 700,
                  fontSize: 16,
                  color: L_COLORS.text,
                  letterSpacing: "-0.03em",
                }}
              >
                Drawd
              </span>
            </div>
            <p
              style={{
                fontFamily: L_FONTS.ui,
                fontSize: 13,
                color: L_COLORS.textMuted,
                lineHeight: 1.65,
                margin: 0,
                maxWidth: 180,
              }}
            >
              Visual app flow designer for developers and designers.
            </p>
          </div>

          {/* Col 2: Product */}
          <div>
            <div
              style={{
                fontFamily: L_FONTS.mono,
                fontSize: 11,
                fontWeight: 500,
                color: L_COLORS.textDim,
                letterSpacing: "0.08em",
                marginBottom: 12,
              }}
            >
              PRODUCT
            </div>
            {PRODUCT_LINKS.map((l) => (
              <FooterLink key={l.label} {...l} />
            ))}
          </div>

          {/* Col 3: Resources */}
          <div>
            <div
              style={{
                fontFamily: L_FONTS.mono,
                fontSize: 11,
                fontWeight: 500,
                color: L_COLORS.textDim,
                letterSpacing: "0.08em",
                marginBottom: 12,
              }}
            >
              RESOURCES
            </div>
            {RESOURCE_LINKS.map((l) => (
              <FooterLink key={l.label} {...l} />
            ))}
          </div>
        </div>

        {/* Bottom row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            borderTop: `1px solid ${L_COLORS.borderSubtle}`,
            paddingTop: 24,
          }}
        >
          <span
            style={{
              fontFamily: L_FONTS.mono,
              fontSize: 12,
              color: L_COLORS.textDim,
            }}
          >
            &copy; {year} Drawd. Free to use.
          </span>
          <span
            style={{
              fontFamily: L_FONTS.mono,
              fontSize: 12,
              color: L_COLORS.textDim,
              letterSpacing: "0.02em",
            }}
          >
            Made for builders.
          </span>
        </div>
      </div>
    </footer>
  );
}
