import { useState, useEffect, useRef } from "react";
import { L_COLORS, L_FONTS } from "./landing/landingTheme";
import GLOBAL_CSS from "./landing/globalCss";
import NavBar from "./landing/NavBar";
import Footer from "./landing/Footer";
import { DOC_SECTIONS } from "./docs/docsContent";

const DOCS_CSS = `
  /* ── Docs sidebar ───────────────────────────── */
  .docs-toc-link {
    display: block;
    font-family: ${L_FONTS.ui};
    font-size: 13px;
    color: ${L_COLORS.textMuted};
    text-decoration: none;
    padding: 6px 12px;
    border-radius: 6px;
    border-left: 2px solid transparent;
    transition: color 0.16s ease, background 0.16s ease, border-color 0.16s ease;
    cursor: pointer;
    background: none;
    border-top: none;
    border-right: none;
    border-bottom: none;
    text-align: left;
    width: 100%;
    letter-spacing: -0.01em;
  }
  .docs-toc-link:hover {
    color: ${L_COLORS.text};
    background: rgba(97,175,239,0.07);
  }
  .docs-toc-link.active {
    color: ${L_COLORS.accentLight};
    background: rgba(97,175,239,0.1);
    border-left-color: ${L_COLORS.accent};
  }

  /* ── Docs section heading ───────────────────── */
  .docs-section-title {
    font-family: ${L_FONTS.heading};
    font-weight: 700;
    font-size: 22px;
    color: ${L_COLORS.text};
    letter-spacing: -0.03em;
    margin: 0 0 16px 0;
    padding-bottom: 14px;
    border-bottom: 1px solid ${L_COLORS.borderSubtle};
  }

  /* ── Docs section separator ─────────────────── */
  .docs-section + .docs-section {
    border-top: 1px solid ${L_COLORS.borderSubtle};
    padding-top: 48px;
    margin-top: 48px;
  }

  /* ── Inline code ─────────────────────────────── */
  code {
    font-family: ${L_FONTS.mono};
    font-size: 13px;
    color: ${L_COLORS.accentLight};
    background: rgba(97,175,239,0.1);
    border-radius: 4px;
    padding: 1px 5px;
  }

  /* ── Responsive docs layout ─────────────────── */
  @media (max-width: 860px) {
    .docs-sidebar {
      display: none !important;
    }
    .docs-mobile-toc {
      display: block !important;
    }
  }
`;

const NAV_HEIGHT = 56;

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState(DOC_SECTIONS[0].id);
  const observerRef = useRef(null);
  const contentRef = useRef(null);

  // Scroll-spy: root is the scrollable content pane, not the window
  useEffect(() => {
    if (!contentRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.dataset.sectionId);
          }
        });
      },
      {
        root: contentRef.current,
        rootMargin: "-10% 0px -80% 0px",
        threshold: 0,
      }
    );

    const headings = contentRef.current.querySelectorAll("[data-section-id]");
    headings.forEach((el) => observerRef.current.observe(el));

    return () => observerRef.current.disconnect();
  }, []);

  function scrollToSection(id) {
    const container = contentRef.current;
    const el = document.getElementById(`section-${id}`);
    if (!container || !el) return;
    const elRect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const top = container.scrollTop + (elRect.top - containerRect.top) - 32;
    container.scrollTo({ top, behavior: "smooth" });
  }

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <style>{DOCS_CSS}</style>
      {/* Outer shell: fixed viewport height, no window scroll */}
      <div
        className="dot-grid"
        style={{
          background: L_COLORS.bg,
          height: "100vh",
          overflow: "hidden",
          color: L_COLORS.text,
        }}
      >
        <NavBar mode="docs" />

        {/* Two-column layout below the navbar */}
        <div
          style={{
            display: "flex",
            height: `calc(100vh - ${NAV_HEIGHT}px)`,
            marginTop: NAV_HEIGHT,
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* ── Sidebar (never scrolls) ───────────────── */}
          <aside
            className="docs-sidebar"
            style={{
              width: 240,
              flexShrink: 0,
              borderRight: `1px solid ${L_COLORS.borderSubtle}`,
              padding: "32px 16px 32px 24px",
              display: "flex",
              flexDirection: "column",
              overflowY: "hidden",
            }}
          >
            <div
              style={{
                fontFamily: L_FONTS.mono,
                fontSize: 11,
                fontWeight: 600,
                color: L_COLORS.textDim,
                letterSpacing: "0.08em",
                marginBottom: 10,
                paddingLeft: 12,
              }}
            >
              CONTENTS
            </div>
            {DOC_SECTIONS.map((section) => (
              <button
                key={section.id}
                className={`docs-toc-link${activeSection === section.id ? " active" : ""}`}
                onClick={() => scrollToSection(section.id)}
              >
                {section.title}
              </button>
            ))}
          </aside>

          {/* ── Scrollable content pane ───────────────── */}
          <div
            ref={contentRef}
            style={{
              flex: 1,
              overflowY: "auto",
              minWidth: 0,
            }}
          >
            <div
              style={{
                maxWidth: 760,
                margin: "0 auto",
                padding: "48px 48px 80px",
                boxSizing: "border-box",
              }}
            >
              {/* Page header */}
              <div style={{ marginBottom: 48 }}>
                <h1
                  style={{
                    fontFamily: L_FONTS.heading,
                    fontWeight: 800,
                    fontSize: 34,
                    color: L_COLORS.text,
                    letterSpacing: "-0.04em",
                    margin: "0 0 12px 0",
                  }}
                >
                  User Guide
                </h1>
                <p
                  style={{
                    fontFamily: L_FONTS.ui,
                    fontSize: 16,
                    color: L_COLORS.textMuted,
                    margin: 0,
                    lineHeight: 1.6,
                  }}
                >
                  Everything you need to know to design app flows with Drawd.
                </p>
              </div>

              {/* Mobile inline ToC */}
              <div
                className="docs-mobile-toc"
                style={{
                  display: "none",
                  background: L_COLORS.surface,
                  border: `1px solid ${L_COLORS.border}`,
                  borderRadius: 10,
                  padding: "16px 20px",
                  marginBottom: 40,
                }}
              >
                <div
                  style={{
                    fontFamily: L_FONTS.mono,
                    fontSize: 11,
                    fontWeight: 600,
                    color: L_COLORS.textDim,
                    letterSpacing: "0.08em",
                    marginBottom: 10,
                  }}
                >
                  CONTENTS
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 0" }}>
                  {DOC_SECTIONS.map((section) => (
                    <button
                      key={section.id}
                      className="docs-toc-link"
                      style={{ width: "50%" }}
                      onClick={() => scrollToSection(section.id)}
                    >
                      {section.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sections */}
              {DOC_SECTIONS.map((section) => (
                <section
                  key={section.id}
                  id={`section-${section.id}`}
                  className="docs-section"
                >
                  <h2
                    className="docs-section-title"
                    data-section-id={section.id}
                  >
                    {section.title}
                  </h2>
                  {section.content}
                </section>
              ))}

              <Footer />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
