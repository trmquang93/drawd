import { useState, useEffect } from "react";
import { isFigmaClipboard, extractFigmaData, renderFigmaBuffer } from "../utils/parseFigmaClipboard";

export function useFigmaPaste({ handlePaste, addScreenAtCenter }) {
  const [figmaProcessing, setFigmaProcessing] = useState(false);
  const [figmaError, setFigmaError] = useState(null);

  // Global paste listener: intercepts Figma clipboard before regular image paste
  useEffect(() => {
    const onPaste = async (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.clipboardData && isFigmaClipboard(e.clipboardData)) {
        const html = e.clipboardData.getData("text/html");
        const figmaData = extractFigmaData(html);
        if (figmaData) {
          e.preventDefault();
          setFigmaProcessing(true);
          setFigmaError(null);
          try {
            const { frameName, imageDataUrl, frameCount } = await renderFigmaBuffer(figmaData.buffer);
            if (frameCount > 1) {
              alert("Multiple frames detected. Only the first frame was imported. Please copy and paste one frame at a time for best results.");
            }
            addScreenAtCenter(imageDataUrl, frameName, 0, {
              figmaSource: {
                fileKey: figmaData.meta.fileKey,
                frameName,
                importedAt: new Date().toISOString(),
              },
            });
          } catch (err) {
            console.error("Figma render failed:", err);
            setFigmaError(err.message || "Failed to render Figma frame");
          } finally {
            setFigmaProcessing(false);
          }
          return;
        }
      }

      handlePaste(e);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [handlePaste, addScreenAtCenter]);

  // Auto-dismiss Figma error after 5 seconds
  useEffect(() => {
    if (!figmaError) return;
    const timer = setTimeout(() => setFigmaError(null), 5000);
    return () => clearTimeout(timer);
  }, [figmaError]);

  return { figmaProcessing, figmaError, setFigmaError };
}
