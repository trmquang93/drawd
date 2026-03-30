// ── App Identity ─────────────────────────────
export const APP_NAME = "Drawd";
export const ICON_PATH = "/icon.svg";
export const GITHUB_URL = "https://github.com/codeflow-studio/drawd";
export const DOMAIN = "drawd.app";

// ── File Format ──────────────────────────────
export const FILE_VERSION = 11;
export const FILE_EXTENSION = ".drawd";
export const LEGACY_FILE_EXTENSION = ".flowforge";
export const DEFAULT_EXPORT_FILENAME = "flow-export";
export const DEFAULT_FLOW_NAME = "Untitled Flow";
export const DEFAULT_DOCUMENT_NAME = "Untitled Document";
export const DEFAULT_MODEL_NAME = "Untitled Model";
export const DEFAULT_STATE_NAME = "Default";
export const SCREEN_NAME_TEMPLATE = (count) => `Screen ${count}`;

// ── Layout Dimensions ────────────────────────
export const DEFAULT_SCREEN_WIDTH = 220;
export const DEFAULT_IMAGE_HEIGHT = 120;
export const DEFAULT_SCREEN_HEIGHT = 200;
export const HEADER_HEIGHT = 37;
export const TOPBAR_HEIGHT = 56;
export const SIDEBAR_WIDTH = 280;
export const SCREENS_PANEL_WIDTH = 220;
export const PARTICIPANTS_PANEL_WIDTH = 260;
export const BORDER_WIDTH = 2;

// ── Canvas ───────────────────────────────────
export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 2.0;
export const ZOOM_STEP = 0.02;
export const GRID_SIZE = 24;
export const MIN_HOTSPOT_SIZE = 2;
export const BEZIER_FACTOR = 0.4;
export const BEZIER_MIN_CP = 80;

// ── Grid Placement ───────────────────────────
export const GRID_COLUMNS = 4;
export const GRID_COL_WIDTH = 280;
export const GRID_ROW_HEIGHT = 420;
export const GRID_MARGIN = 60;
export const PASTE_STAGGER = 30;
export const STATE_VARIANT_OFFSET = 250;
export const MERGE_GAP = 300;
export const CENTER_HEIGHT_ESTIMATE = 160;
export const VIEWPORT_FALLBACK_WIDTH = 800;
export const VIEWPORT_FALLBACK_HEIGHT = 600;

// ── Hotspot ──────────────────────────────────
export const HOTSPOT_PASTE_OFFSET = 5;

// ── Selection ────────────────────────────────
export const RUBBER_BAND_THRESHOLD = 3;

// ── Timing ───────────────────────────────────
export const AUTOSAVE_DEBOUNCE_MS = 1500;
export const FILE_POLL_INTERVAL_MS = 1500;
export const SAVE_STATUS_RESET_MS = 2000;
export const COPY_FEEDBACK_MS = 2000;

// ── Validation ───────────────────────────────
export const DESCRIPTION_MAX_LENGTH = 500;

// ── Collaboration ───────────────────────────
export const COLLAB_DEBOUNCE_MS = 500;
export const CURSOR_THROTTLE_MS = 150;
export const CURSOR_STALE_MS = 4000;
export const COLLAB_ROOM_CODE_LENGTH = 6;
export const COLLAB_CURSOR_FADE_MS = 3000;

// ── Sticky Notes ─────────────────────────────
export const STICKY_NOTE_MIN_WIDTH = 150;
