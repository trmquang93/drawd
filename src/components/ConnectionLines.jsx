import { COLORS, FONTS } from "../styles/theme";

const HEADER_HEIGHT = 37;
const BORDER = 2;

function getScreenCenterY(screen) {
  const imageAreaHeight = screen.imageHeight || 120;
  return screen.y + (HEADER_HEIGHT + imageAreaHeight) / 2;
}

export function computePoints(conn, screens) {
  const from = screens.find((s) => s.id === conn.fromScreenId);
  const to = screens.find((s) => s.id === conn.toScreenId);
  if (!from || !to) return null;

  const screenW = from.width || 220;
  const hs = conn.hotspotId && from.hotspots
    ? from.hotspots.find((h) => h.id === conn.hotspotId)
    : null;

  let fromX, fromY;
  if (hs && from.imageHeight) {
    fromX = from.x + BORDER + (hs.x + hs.w / 2) / 100 * screenW;
    fromY = from.y + BORDER + HEADER_HEIGHT + (hs.y + hs.h / 2) / 100 * from.imageHeight;
  } else {
    fromX = from.x + screenW;
    fromY = getScreenCenterY(from);
  }
  const toX = to.x;
  const toY = getScreenCenterY(to);

  const dx = toX - fromX;
  const cp = Math.max(80, Math.abs(dx) * 0.4);

  return { fromX, fromY, toX, toY, cp };
}

function bezierD(fromX, fromY, toX, toY, cp) {
  return `M ${fromX} ${fromY} C ${fromX + cp} ${fromY}, ${toX - cp} ${toY}, ${toX} ${toY}`;
}

export function ConnectionLines({
  screens,
  connections,
  previewLine,
  hotspotPreviewLine,
  selectedConnectionId,
  onConnectionClick,
  onConnectionDoubleClick,
  onEndpointMouseDown,
  endpointDragPreview,
}) {
  return (
    <svg
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: 1,
        height: 1,
        overflow: "visible",
        pointerEvents: "none",
      }}
    >
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill={COLORS.connectionLine} />
        </marker>
        <marker id="arrowhead-selected" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill={COLORS.accentLight} />
        </marker>
        <marker id="arrowhead-success" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill={COLORS.success} />
        </marker>
        <marker id="arrowhead-error" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill={COLORS.danger} />
        </marker>
        <marker id="arrowhead-condition" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill={COLORS.condition} />
        </marker>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glow-strong">
          <feGaussianBlur stdDeviation="5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* State group connector lines (dashed, behind navigation arrows) */}
      {(() => {
        const groups = {};
        screens.forEach((s) => {
          if (s.stateGroup) {
            if (!groups[s.stateGroup]) groups[s.stateGroup] = [];
            groups[s.stateGroup].push(s);
          }
        });
        return Object.values(groups)
          .filter((g) => g.length >= 2)
          .map((group) => {
            const sorted = [...group].sort((a, b) => a.x - b.x || a.y - b.y);
            return sorted.slice(0, -1).map((s, i) => {
              const next = sorted[i + 1];
              const sw = s.width || 220;
              const nw = next.width || 220;
              const fromX = s.x + sw;
              const fromY = s.y + (HEADER_HEIGHT + (s.imageHeight || 120)) / 2;
              const toX = next.x;
              const toY = next.y + (HEADER_HEIGHT + (next.imageHeight || 120)) / 2;
              return (
                <line
                  key={`state-${s.id}-${next.id}`}
                  x1={fromX}
                  y1={fromY}
                  x2={toX}
                  y2={toY}
                  stroke="rgba(108,92,231,0.25)"
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                />
              );
            });
          });
      })()}
      {connections.map((conn) => {
        const pts = computePoints(conn, screens);
        if (!pts) return null;

        let { fromX, fromY, toX, toY, cp } = pts;
        const isSelected = conn.id === selectedConnectionId;

        // Determine color based on connectionPath
        let lineColor = COLORS.connectionLine;
        let lineMarker = "url(#arrowhead)";
        let selectedMarker = "url(#arrowhead-selected)";
        if (conn.connectionPath === "api-success") {
          lineColor = COLORS.success;
          lineMarker = "url(#arrowhead-success)";
          selectedMarker = "url(#arrowhead-success)";
        } else if (conn.connectionPath === "api-error") {
          lineColor = COLORS.danger;
          lineMarker = "url(#arrowhead-error)";
          selectedMarker = "url(#arrowhead-error)";
        } else if (conn.connectionPath && conn.connectionPath.startsWith("condition-")) {
          lineColor = COLORS.condition;
          lineMarker = "url(#arrowhead-condition)";
          selectedMarker = "url(#arrowhead-condition)";
        }

        // Apply endpoint drag preview overrides
        if (endpointDragPreview && endpointDragPreview.connectionId === conn.id) {
          if (endpointDragPreview.endpoint === "from") {
            fromX = endpointDragPreview.mouseX;
            fromY = endpointDragPreview.mouseY;
          } else {
            toX = endpointDragPreview.mouseX;
            toY = endpointDragPreview.mouseY;
          }
          const dx = toX - fromX;
          cp = Math.max(80, Math.abs(dx) * 0.4);
        }

        const d = bezierD(fromX, fromY, toX, toY, cp);

        return (
          <g key={conn.id}>
            {/* Transparent wide hit area for click interaction */}
            <path
              d={d}
              fill="none"
              stroke="transparent"
              strokeWidth={12}
              pointerEvents="stroke"
              cursor="pointer"
              onClick={(e) => { e.stopPropagation(); onConnectionClick?.(conn.id); }}
              onDoubleClick={(e) => { e.stopPropagation(); onConnectionDoubleClick?.(conn.id); }}
            />
            {/* Origin dot */}
            <circle
              cx={fromX}
              cy={fromY}
              r={isSelected ? 6 : 5}
              fill={isSelected ? COLORS.accentLight : lineColor}
              filter={isSelected ? "url(#glow-strong)" : "url(#glow)"}
              opacity={isSelected ? 1 : 0.9}
            />
            {/* Visible path */}
            <path
              d={d}
              fill="none"
              stroke={isSelected ? COLORS.accentLight : lineColor}
              strokeWidth={isSelected ? 4 : 2.5}
              strokeDasharray={isSelected ? "none" : "8 4"}
              markerEnd={isSelected ? selectedMarker : lineMarker}
              filter={isSelected ? "url(#glow-strong)" : "url(#glow)"}
              opacity={isSelected ? 1 : 0.7}
            />
            {/* Label */}
            {(conn.label || conn.condition) && (
              <text
                x={(fromX + toX) / 2}
                y={(fromY + toY) / 2 - 10}
                fill={conn.condition ? COLORS.condition : COLORS.accentLight}
                fontSize={10}
                fontFamily={FONTS.mono}
                textAnchor="middle"
                style={{ filter: "url(#glow)" }}
              >
                {conn.condition || conn.label}
              </text>
            )}
            {/* Endpoint handles when selected */}
            {isSelected && (
              <>
                <circle
                  cx={fromX}
                  cy={fromY}
                  r={7}
                  fill={COLORS.accent}
                  stroke={COLORS.accentLight}
                  strokeWidth={2}
                  filter="url(#glow-strong)"
                  cursor="grab"
                  pointerEvents="all"
                  onMouseDown={(e) => { e.stopPropagation(); onEndpointMouseDown?.(e, conn.id, "from"); }}
                />
                <circle
                  cx={toX}
                  cy={toY}
                  r={7}
                  fill={COLORS.accent}
                  stroke={COLORS.accentLight}
                  strokeWidth={2}
                  filter="url(#glow-strong)"
                  cursor="grab"
                  pointerEvents="all"
                  onMouseDown={(e) => { e.stopPropagation(); onEndpointMouseDown?.(e, conn.id, "to"); }}
                />
              </>
            )}
          </g>
        );
      })}
      {hotspotPreviewLine && (() => {
        const from = screens.find((s) => s.id === hotspotPreviewLine.fromScreenId);
        if (!from) return null;
        const hs = hotspotPreviewLine.hotspotId && from.hotspots
          ? from.hotspots.find((h) => h.id === hotspotPreviewLine.hotspotId)
          : null;
        const screenW = from.width || 220;
        let fromX, fromY;
        if (hs && from.imageHeight) {
          fromX = from.x + BORDER + (hs.x + hs.w / 2) / 100 * screenW;
          fromY = from.y + BORDER + HEADER_HEIGHT + (hs.y + hs.h / 2) / 100 * from.imageHeight;
        } else {
          fromX = from.x + screenW;
          fromY = getScreenCenterY(from);
        }
        const toX = hotspotPreviewLine.toX;
        const toY = hotspotPreviewLine.toY;
        const dx = toX - fromX;
        const cp = Math.max(80, Math.abs(dx) * 0.4);
        return (
          <g>
            <circle cx={fromX} cy={fromY} r={5} fill={COLORS.success} opacity={0.8} />
            <path
              d={bezierD(fromX, fromY, toX, toY, cp)}
              fill="none"
              stroke={COLORS.success}
              strokeWidth={2.5}
              strokeDasharray="8 4"
              markerEnd="url(#arrowhead)"
              opacity={0.6}
            />
          </g>
        );
      })()}
      {previewLine && (() => {
        const from = screens.find((s) => s.id === previewLine.fromScreenId);
        if (!from) return null;
        const fromX = from.x + (from.width || 220);
        const fromY = getScreenCenterY(from);
        const toX = previewLine.toX;
        const toY = previewLine.toY;
        const dx = toX - fromX;
        const cp = Math.max(80, Math.abs(dx) * 0.4);
        return (
          <g>
            <circle cx={fromX} cy={fromY} r={5} fill={COLORS.connectionLine} opacity={0.6} />
            <path
              d={bezierD(fromX, fromY, toX, toY, cp)}
              fill="none"
              stroke={COLORS.connectionLine}
              strokeWidth={2.5}
              strokeDasharray="8 4"
              markerEnd="url(#arrowhead)"
              opacity={0.4}
            />
          </g>
        );
      })()}
    </svg>
  );
}
