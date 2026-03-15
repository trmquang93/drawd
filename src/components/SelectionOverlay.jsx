import { COLORS, Z_INDEX } from "../styles/theme";

export function SelectionOverlay({ rubberBandRect }) {
  if (!rubberBandRect || rubberBandRect.width < 1 || rubberBandRect.height < 1) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: rubberBandRect.x,
        top: rubberBandRect.y,
        width: rubberBandRect.width,
        height: rubberBandRect.height,
        background: COLORS.selection,
        border: `1px solid ${COLORS.selectionBorder}`,
        borderRadius: 2,
        pointerEvents: "none",
        zIndex: Z_INDEX.selectionOverlay,
      }}
    />
  );
}
