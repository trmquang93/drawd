import { useState, useEffect, useRef } from "react";
import { isFigmaClipboard, extractFigmaData, parseFigmaFrames, renderFigmaBuffer } from "../utils/parseFigmaClipboard";

// Time window (ms) to apply stashed Figma metadata to a regular image paste.
// After detecting Figma clipboard and prompting "Copy as PNG", the user re-copies
// with Shift+Cmd+C and pastes. The stashed frame name is applied to that paste.
const FIGMA_STASH_TTL = 30000;

export function useFigmaPaste({ handlePaste, addScreenAtCenter }) {
  const [figmaProcessing, setFigmaProcessing] = useState(false);
  const [figmaError, setFigmaError] = useState(null);

  // Stash Figma metadata so the next regular image paste gets the frame name
  const figmaStashRef = useRef(null);

  // Global paste listener: intercepts Figma clipboard before regular image paste
  useEffect(() => {
    const onPaste = async (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.clipboardData && isFigmaClipboard(e.clipboardData)) {
        const html = e.clipboardData.getData("text/html");
        const figmaData = extractFigmaData(html);
        if (figmaData) {
          const items = Array.from(e.clipboardData.items || []);

          // Check for native PNG rendered by Figma's own engine (pixel-perfect)
          const pngItem = items.find((item) => item.kind === "file" && item.type === "image/png");

          e.preventDefault();
          setFigmaError(null);

          // Extract frame name from binary data (lightweight kiwi parse, no WASM)
          let frameName = "Figma Frame";
          let frameCount = 1;
          try {
            const { frames } = parseFigmaFrames(figmaData.buffer);
            if (frames.length > 0) frameName = frames[0].name;
            frameCount = frames.length;
          } catch {
            // Use default name
          }

          const figmaSource = {
            fileKey: figmaData.meta.fileKey,
            frameName,
            importedAt: new Date().toISOString(),
          };

          if (pngItem) {
            // Fast path: native clipboard PNG (Figma Desktop)
            const blob = pngItem.getAsFile();
            const reader = new FileReader();
            reader.onload = () => {
              if (frameCount > 1) {
                alert("Multiple frames detected. Only the first frame was imported. Please copy and paste one frame at a time for best results.");
              }
              addScreenAtCenter(reader.result, frameName, 0, { figmaSource });
            };
            reader.onerror = () => {
              setFigmaError("Failed to read Figma clipboard image");
            };
            reader.readAsDataURL(blob);
          } else {
            // Figma Web: no native PNG. Render via WASM with IMAGE fills
            // stripped (they have no pixel data and would show checker patterns).
            // Stash metadata so a follow-up Shift+Cmd+C paste inherits the name.
            figmaStashRef.current = { frameName, figmaSource, stashedAt: Date.now() };
            setFigmaProcessing(true);

            try {
              const rendered = await renderFigmaBuffer(figmaData.buffer);
              if (rendered.frameCount > 1) {
                alert("Multiple frames detected. Only the first frame was imported. Please copy and paste one frame at a time for best results.");
              }
              addScreenAtCenter(rendered.imageDataUrl, rendered.frameName, 0, { figmaSource });
              setFigmaError(
                "Tip: For pixel-perfect results, use Shift+Cmd+C in Figma to copy as PNG, then paste here.",
              );
            } catch (err) {
              if (import.meta.env.DEV) console.error("[Figma] WASM render failed:", err);
              setFigmaError(
                `Figma frame "${frameName}" detected but rendering failed. ` +
                "Try Shift+Cmd+C in Figma to copy as PNG, then paste here.",
              );
            } finally {
              setFigmaProcessing(false);
            }
          }
          return;
        }
      }

      // Check if this is a regular image paste that should inherit stashed Figma metadata
      const stash = figmaStashRef.current;
      if (stash && Date.now() - stash.stashedAt < FIGMA_STASH_TTL) {
        const items = Array.from(e.clipboardData?.items || []);
        const imgItem = items.find((item) => item.kind === "file" && item.type.startsWith("image/"));
        if (imgItem) {
          e.preventDefault();
          setFigmaError(null);
          const blob = imgItem.getAsFile();
          const reader = new FileReader();
          reader.onload = () => {
            addScreenAtCenter(reader.result, stash.frameName, 0, { figmaSource: stash.figmaSource });
            figmaStashRef.current = null;
          };
          reader.onerror = () => {
            setFigmaError("Failed to read clipboard image");
          };
          reader.readAsDataURL(blob);
          return;
        }
      }

      handlePaste(e);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [handlePaste, addScreenAtCenter]);

  // Auto-dismiss Figma error after 10 seconds (longer for actionable guidance)
  useEffect(() => {
    if (!figmaError) return;
    const timer = setTimeout(() => setFigmaError(null), 10000);
    return () => clearTimeout(timer);
  }, [figmaError]);

  return { figmaProcessing, figmaError, setFigmaError };
}
