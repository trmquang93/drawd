import { getBounds } from "../geometry.js";

// Dynamic Island.
//
// A solid black pill centered horizontally near the top of the iPhone
// viewport. It does NOT change color with chromeStyle — the real island is
// always black.
//
// Safe-area contribution: top: 59 (= y(11) + h(37) + breathing room(11)).
// When combined with status-bar-ios (top: 54), max-by-edge gives top: 59.

export const dynamicIsland = {
  id: "dynamic-island",
  appliesTo: ["iphone"],
  conflicts: [],

  bounds: ({ device }) => getBounds("dynamic-island", device),

  safeArea: () => ({ top: 59 }),

  render: ({ device }) => {
    const { x, y, w, h } = getBounds("dynamic-island", device);
    const r = h / 2;
    return `
      <g id="chrome-dynamic-island">
        <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ry="${r}" fill="#000000"/>
      </g>
    `;
  },
};
