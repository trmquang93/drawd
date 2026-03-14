import { L_COLORS, L_FONTS } from "./landingTheme";
import { TOPBAR_HEIGHT, ICON_PATH, APP_NAME } from "../../constants";
import { Z_INDEX } from "../../styles/theme";

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth" });
}

function navigateToLandingSection(id) {
  window.location.hash = `#${id}`;
}

// mode: "landing" | "docs"
export default function NavBar({ mode = "landing" }) {
  function handleSectionLink(id) {
    if (mode === "docs") {
      navigateToLandingSection(id);
    } else {
      scrollToSection(id);
    }
  }

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: TOPBAR_HEIGHT,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 40px",
        background: `${L_COLORS.bg}e6`,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        boxShadow: `0 1px 0 ${L_COLORS.borderSubtle}, 0 4px 20px rgba(0,0,0,0.25)`,
        zIndex: Z_INDEX.toolbar,
        boxSizing: "border-box",
      }}
    >
      {/* Logo */}
      <div
        style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}
        onClick={() => { window.location.hash = ""; window.location.href = "/"; }}
      >
        <img src={ICON_PATH} alt={APP_NAME} width={26} height={26} />
        <span
          style={{
            fontFamily: L_FONTS.heading,
            fontWeight: 700,
            fontSize: 17,
            color: L_COLORS.text,
            letterSpacing: "-0.03em",
          }}
        >
          {APP_NAME}
        </span>
      </div>

      {/* Center nav links */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 32,
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        <button className="nav-link" onClick={() => handleSectionLink("features")}>
          Features
        </button>
        <button className="nav-link" onClick={() => handleSectionLink("how-it-works")}>
          How It Works
        </button>
        <button className="nav-link" onClick={() => handleSectionLink("demo")}>
          Demo
        </button>
        <a
          className="nav-link"
          href="#/docs"
          style={{
            color: mode === "docs" ? L_COLORS.accentLight : undefined,
            fontWeight: mode === "docs" ? 600 : undefined,
          }}
        >
          Docs
        </a>
      </div>

      {/* Right CTA */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          className="btn-ghost"
          onClick={() => handleSectionLink("how-it-works")}
        >
          Learn more
        </button>
        <button
          onClick={() => { window.location.hash = "#/editor"; }}
          style={{
            padding: "8px 20px",
            background: L_COLORS.accent,
            border: "none",
            borderRadius: 8,
            color: L_COLORS.textOnAccent,
            fontFamily: L_FONTS.ui,
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
            letterSpacing: "-0.01em",
            transition: "background 0.18s ease, box-shadow 0.18s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = L_COLORS.accentHover;
            e.currentTarget.style.boxShadow = `0 0 20px ${L_COLORS.accentGlow}`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = L_COLORS.accent;
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          Open Editor
        </button>
      </div>
    </nav>
  );
}
