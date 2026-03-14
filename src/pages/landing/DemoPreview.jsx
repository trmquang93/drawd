import { L_COLORS, L_FONTS } from "./landingTheme";
import { DOMAIN } from "../../constants";

// Floating annotation callouts over the screenshot
function Callout({ text, style }) {
  return (
    <div
      style={{
        position: "absolute",
        ...style,
        background: "rgba(20, 20, 24, 0.92)",
        border: `1px solid ${L_COLORS.accent035}`,
        borderRadius: 6,
        padding: "5px 10px",
        fontFamily: L_FONTS.mono,
        fontSize: 11,
        fontWeight: 500,
        color: L_COLORS.accentLight,
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        boxShadow: `0 2px 12px rgba(0,0,0,0.5)`,
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      {text}
    </div>
  );
}

export default function DemoPreview() {
  return (
    <section
      id="demo"
      style={{
        maxWidth: 1000,
        margin: "0 auto",
        padding: "80px 40px",
        boxSizing: "border-box",
      }}
    >
      {/* Section label */}
      <div
        className="reveal"
        style={{
          fontFamily: L_FONTS.mono,
          fontSize: 11,
          fontWeight: 500,
          color: L_COLORS.amber,
          letterSpacing: "0.1em",
          marginBottom: 16,
        }}
      >
        DEMO
      </div>

      <h2
        className="reveal"
        style={{
          fontFamily: L_FONTS.heading,
          fontWeight: 700,
          fontSize: "clamp(22px, 3.5vw, 34px)",
          color: L_COLORS.text,
          margin: "0 0 12px",
          letterSpacing: "-0.03em",
          transitionDelay: "60ms",
        }}
      >
        See it in action
      </h2>
      <p
        className="reveal"
        style={{
          fontFamily: L_FONTS.ui,
          fontSize: 15,
          color: L_COLORS.textMuted,
          margin: "0 0 48px",
          lineHeight: 1.6,
          transitionDelay: "100ms",
        }}
      >
        Upload screens, draw tap areas, connect flows, export instructions.
      </p>

      {/* Browser chrome frame */}
      <div
        className="reveal"
        style={{
          position: "relative",
          borderRadius: 12,
          overflow: "hidden",
          border: `1px solid ${L_COLORS.border}`,
          boxShadow: `0 0 0 1px ${L_COLORS.borderSubtle}, 0 32px 80px rgba(0,0,0,0.65), 0 0 60px ${L_COLORS.accentGlow}`,
          maxWidth: 900,
          transitionDelay: "140ms",
        }}
      >
        {/* Chrome toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 16px",
            background: "#1c1c22",
            borderBottom: `1px solid ${L_COLORS.border}`,
          }}
        >
          {/* Traffic lights */}
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#ff5f57" }} />
            <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#ffbd2e" }} />
            <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#28c840" }} />
          </div>
          {/* Fake URL bar */}
          <div
            style={{
              flex: 1,
              maxWidth: 360,
              margin: "0 auto",
              background: "rgba(0,0,0,0.3)",
              border: `1px solid ${L_COLORS.border}`,
              borderRadius: 5,
              padding: "3px 10px",
              fontFamily: L_FONTS.mono,
              fontSize: 11,
              color: L_COLORS.textDim,
              letterSpacing: "0.01em",
              textAlign: "center",
            }}
          >
            {DOMAIN}
          </div>
          <div style={{ width: 72 }} />
        </div>

        {/* Screenshot area with callouts */}
        <div style={{ position: "relative" }}>
          <img
            src="/example-flow.png"
            alt="Drawd editor showing an app flow with screens, connections, and hotspots"
            style={{ display: "block", width: "100%", height: "auto" }}
          />

          {/* Annotation callouts */}
          <Callout text="← Drag to connect" style={{ top: "22%", left: "52%" }} />
          <Callout text="Draw tap areas →" style={{ top: "48%", left: "15%" }} />
          <Callout text="Export to AI ↓" style={{ bottom: "18%", right: "8%" }} />
        </div>
      </div>
    </section>
  );
}
