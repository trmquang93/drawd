import { useState, useEffect, useRef } from "react";
import { isFigmaClipboard, extractFigmaData, parseFigmaFrames, convertFigmaBuffer } from "../utils/parseFigmaClipboard";

// Time window (ms) to apply stashed Figma metadata to a regular image paste.
// After detecting Figma clipboard and prompting "Copy as PNG", the user re-copies
// with Shift+Cmd+C and pastes. The stashed frame name is applied to that paste.
const FIGMA_STASH_TTL = 60000;

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
            // Figma Web: no native PNG available.
            // Convert the Figma node tree to HTML and render via the browser's
            // own layout engine. This produces higher-fidelity output than the
            // WASM renderer (correct fonts, colors, and layout).
            setFigmaProcessing(true);

            try {
              const converted = await convertFigmaBuffer(figmaData.buffer);
              const GAP = 40;

              for (let i = 0; i < converted.length; i++) {
                const frame = converted[i];
                const frameFigmaSource = {
                  fileKey: figmaData.meta.fileKey,
                  frameName: frame.frameName,
                  importedAt: new Date().toISOString(),
                };
                addScreenAtCenter(
                  frame.imageDataUrl,
                  frame.frameName,
                  i * (220 + GAP),
                  {
                    figmaSource: frameFigmaSource,
                    sourceHtml: frame.html,
                    sourceWidth: frame.width,
                    sourceHeight: frame.height,
                  },
                );
              }

              // Stash metadata for follow-up Shift+Cmd+C pixel-perfect paste
              figmaStashRef.current = {
                frameName: converted[0]?.frameName ?? frameName,
                figmaSource,
                stashedAt: Date.now(),
                frameCount: converted.length,
              };

              if (converted.length > 0) {
                setFigmaError(
                  `${converted.length} screen${converted.length > 1 ? "s" : ""} imported from Figma. ` +
                  "For pixel-perfect images, use \u21E7\u2318C in Figma, then paste here.",
                );
              }
            } catch (err) {
              if (import.meta.env.DEV) console.error("[Figma] HTML conversion failed:", err);
              setFigmaError(
                `Figma frame "${frameName}" detected but conversion failed. ` +
                "Try \u21E7\u2318C in Figma to copy as PNG, then paste here.",
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

  // Auto-dismiss Figma notification after 20 seconds
  useEffect(() => {
    if (!figmaError) return;
    const timer = setTimeout(() => setFigmaError(null), 20000);
    return () => clearTimeout(timer);
  }, [figmaError]);

  return { figmaProcessing, figmaError, setFigmaError };
}
