import { useState, useEffect, lazy, Suspense } from "react";
import { Analytics } from "@vercel/analytics/react";
import LandingPage from "./pages/LandingPage";
import DocsPage from "./pages/DocsPage";
import { COLORS } from "./styles/theme";

const Drawd = lazy(() => import("./Drawd"));

function getRoute() {
  const hash = window.location.hash;
  if (hash === "#/editor") return "editor";
  if (hash === "#/docs") return "docs";
  return "landing";
}

export default function App() {
  const [route, setRoute] = useState(getRoute);

  useEffect(() => {
    function onHashChange() {
      setRoute(getRoute());
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  let page;
  if (route === "editor") {
    page = (
      <Suspense
        fallback={
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100vh",
              background: COLORS.bg,
              color: COLORS.textMuted,
              fontSize: 14,
              fontFamily: "sans-serif",
            }}
          >
            Loading editor...
          </div>
        }
      >
        <Drawd />
      </Suspense>
    );
  } else if (route === "docs") {
    page = <DocsPage />;
  } else {
    page = <LandingPage />;
  }

  return (
    <>
      {page}
      <Analytics />
    </>
  );
}
