import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "../collab/supabaseClient";
import { COLLAB_DEBOUNCE_MS, CURSOR_THROTTLE_MS, CURSOR_STALE_MS, COLLAB_ROOM_CODE_LENGTH } from "../constants";

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 for clarity
  let code = "";
  for (let i = 0; i < COLLAB_ROOM_CODE_LENGTH; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generatePeerId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function useCollaboration({
  screens, connections, documents,
  featureBrief, taskLink, techStack,
  dataModels, stickyNotes, screenGroups, comments,
  applyRemoteState,
  applyRemoteImage,
  canvasRef, pan, zoom,
}) {
  const [isConnected, setIsConnected] = useState(false);
  const [roomCode, setRoomCode] = useState(null);
  const [role, setRole] = useState(null);
  const [peers, setPeers] = useState([]);
  const [remoteCursors, setRemoteCursors] = useState([]);
  const [hostLeft, setHostLeft] = useState(false);
  const [selfDisplayName, setSelfDisplayName] = useState(null);
  const [selfColor, setSelfColor] = useState(null);

  const channelRef = useRef(null);
  // Use useState for a stable self peer ID so it can be returned without a ref access during render.
  const [selfPeerId] = useState(generatePeerId);
  const peerIdRef = useRef(selfPeerId);
  const applyingRemoteRef = useRef(false);
  const debounceTimerRef = useRef(null);
  const cursorThrottleRef = useRef(0);
  const roleRef = useRef(null);
  const selfDisplayNameRef = useRef(null);
  const selfColorRef = useRef(null);
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);

  const screensRef = useRef(screens);
  const buildCollabPayloadRef = useRef(null);
  const applyRemoteStateRef = useRef(null);
  const applyRemoteImageRef = useRef(null);
  const initializedPeersRef = useRef(new Set());
  const remoteCursorsRef = useRef([]);

  // Keep refs in sync
  useEffect(() => { screensRef.current = screens; }, [screens]);
  useEffect(() => { panRef.current = pan; }, [pan]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { roleRef.current = role; }, [role]);
  // Build payload for broadcasting (omit viewport and heavy metadata)
  // Lightweight payload without imageData (keeps broadcast under Supabase's ~1MB limit)
  const buildCollabPayload = useCallback(() => {
    return {
      screens: screens.map(({ imageData: _img, ...rest }) => rest),
      connections: connections.map((c) => ({ ...c })),
      documents: documents.map((d) => ({ ...d })),
      featureBrief,
      taskLink,
      techStack,
      dataModels,
      stickyNotes,
      screenGroups,
      comments,
    };
  }, [screens, connections, documents, featureBrief, taskLink, techStack, dataModels, stickyNotes, screenGroups, comments]);

  useEffect(() => { buildCollabPayloadRef.current = buildCollabPayload; }, [buildCollabPayload]);
  useEffect(() => { applyRemoteStateRef.current = applyRemoteState; }, [applyRemoteState]);
  useEffect(() => { applyRemoteImageRef.current = applyRemoteImage; }, [applyRemoteImage]);

  // Track which images have been sent so we only broadcast changes
  const sentImageHashRef = useRef({});

  // Subscribe to channel events
  const setupChannel = useCallback((channel, myRole) => {
    // Broadcast: state-update
    channel.on("broadcast", { event: "state-update" }, ({ payload }) => {
      if (!payload) return;
      applyingRemoteRef.current = true;
      applyRemoteStateRef.current(payload);
      // Reset after a tick to let React state settle
      requestAnimationFrame(() => { applyingRemoteRef.current = false; });
    });

    // Broadcast: screen-image (individual image delivery)
    channel.on("broadcast", { event: "screen-image" }, ({ payload }) => {
      if (payload?.screenId && payload?.imageData) {
        applyRemoteImageRef.current(payload.screenId, payload.imageData);
      }
    });

    // Broadcast: role-change
    channel.on("broadcast", { event: "role-change" }, ({ payload }) => {
      if (payload?.targetPeerId === peerIdRef.current) {
        setRole(payload.newRole);
      }
    });

    // Broadcast: cursor-update
    channel.on("broadcast", { event: "cursor-update" }, ({ payload }) => {
      if (!payload?.peerId) return;
      const entry = {
        id: payload.peerId,
        displayName: payload.displayName,
        color: payload.color,
        x: payload.x,
        y: payload.y,
        lastUpdate: payload.ts,
      };
      const prev = remoteCursorsRef.current;
      const idx = prev.findIndex((c) => c.id === payload.peerId);
      const next = idx >= 0
        ? prev.map((c, i) => (i === idx ? entry : c))
        : [...prev, entry];
      remoteCursorsRef.current = next;
      setRemoteCursors(next);
    });

    // Presence: sync
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const allPeers = [];
      for (const [, presences] of Object.entries(state)) {
        for (const p of presences) {
          if (p.peerId === peerIdRef.current) continue;
          allPeers.push({
            id: p.peerId,
            displayName: p.displayName,
            color: p.color,
            role: p.role,
          });
        }
      }
      setPeers(allPeers);

      // Remove cursors for peers that left via Presence
      const activePeerIds = new Set(allPeers.map((p) => p.id));
      const filtered = remoteCursorsRef.current.filter((c) => activePeerIds.has(c.id));
      if (filtered.length !== remoteCursorsRef.current.length) {
        remoteCursorsRef.current = filtered;
        setRemoteCursors(filtered);
      }

      // Host departure detection
      if (myRole !== "host") {
        const hasHost = allPeers.some((p) => p.role === "host");
        if (!hasHost && allPeers.length === 0 && channelRef.current) {
          setHostLeft(true);
        }
      }
    });

    // When a genuinely new peer joins, host sends current state then images one-by-one.
    // Supabase Presence fires leave+join on every track() call (e.g. cursor updates),
    // so we deduplicate by tracking which peerIds we've already initialized.
    channel.on("presence", { event: "join" }, ({ newPresences }) => {
      if (roleRef.current !== "host") return;
      for (const p of newPresences) {
        if (!p.peerId || initializedPeersRef.current.has(p.peerId)) continue;
        initializedPeersRef.current.add(p.peerId);
        // Small delay to let the joiner's subscription settle
        setTimeout(() => {
          if (channelRef.current !== channel) return;
          channel.send({
            type: "broadcast",
            event: "state-update",
            payload: buildCollabPayloadRef.current(),
          });
          // Send each screen's image individually to stay under size limit
          const current = screensRef.current;
          const withImages = current.filter((s) => s.imageData);
          withImages.forEach((s, i) => {
            setTimeout(() => {
              if (channelRef.current === channel) {
                channel.send({
                  type: "broadcast",
                  event: "screen-image",
                  payload: { screenId: s.id, imageData: s.imageData },
                });
              }
            }, (i + 1) * 100);
          });
        }, 300);
        break; // one send per new peer is enough
      }
    });
  }, []);

  const createRoom = useCallback((displayName, color) => {
    if (!supabase) return;
    const code = generateRoomCode();
    const channel = supabase.channel(`room:${code}`, {
      config: { broadcast: { self: false } },
    });

    setupChannel(channel, "host");

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          peerId: peerIdRef.current,
          displayName,
          color,
          role: "host",
        });
        channelRef.current = channel;
        setRoomCode(code);
        setRole("host");
        setIsConnected(true);
        setHostLeft(false);
        setSelfDisplayName(displayName);
        setSelfColor(color);
        selfDisplayNameRef.current = displayName;
        selfColorRef.current = color;
      }
    });
  }, [setupChannel]);

  const joinRoom = useCallback((code, displayName, color) => {
    if (!supabase) return;
    const normalizedCode = code.toUpperCase().trim();
    const channel = supabase.channel(`room:${normalizedCode}`, {
      config: { broadcast: { self: false } },
    });

    setupChannel(channel, "editor");

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          peerId: peerIdRef.current,
          displayName,
          color,
          role: "editor",
        });
        channelRef.current = channel;
        setRoomCode(normalizedCode);
        setRole("editor");
        setIsConnected(true);
        setHostLeft(false);
        setSelfDisplayName(displayName);
        setSelfColor(color);
        selfDisplayNameRef.current = displayName;
        selfColorRef.current = color;
      }
    });
  }, [setupChannel]);

  const leaveRoom = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    initializedPeersRef.current.clear();
    remoteCursorsRef.current = [];
    setIsConnected(false);
    setRoomCode(null);
    setRole(null);
    setPeers([]);
    setRemoteCursors([]);
    setHostLeft(false);
    setSelfDisplayName(null);
    setSelfColor(null);
    selfDisplayNameRef.current = null;
    selfColorRef.current = null;
  }, []);

  const setPeerRole = useCallback((peerId, newRole) => {
    if (roleRef.current !== "host" || !channelRef.current) return;
    channelRef.current.send({
      type: "broadcast",
      event: "role-change",
      payload: { targetPeerId: peerId, newRole },
    });
  }, []);

  const dismissHostLeft = useCallback(() => {
    setHostLeft(false);
  }, []);

  // State broadcasting (host + editors, debounced)
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (!role || role === "viewer" || !channelRef.current || applyingRemoteRef.current) return;

    debounceTimerRef.current = setTimeout(() => {
      const channel = channelRef.current;
      if (channel && roleRef.current && roleRef.current !== "viewer") {
        channel.send({
          type: "broadcast",
          event: "state-update",
          payload: buildCollabPayload(),
        });

        // Send new/changed images individually
        const prevHashes = sentImageHashRef.current;
        const nextHashes = {};
        let delay = 0;
        for (const s of screens) {
          if (!s.imageData) continue;
          // Use first 64 chars of imageData as a fast change fingerprint
          const fingerprint = s.imageData.slice(0, 64);
          nextHashes[s.id] = fingerprint;
          if (prevHashes[s.id] !== fingerprint) {
            setTimeout(() => {
              if (channelRef.current === channel) {
                channel.send({
                  type: "broadcast",
                  event: "screen-image",
                  payload: { screenId: s.id, imageData: s.imageData },
                });
              }
            }, delay);
            delay += 100;
          }
        }
        sentImageHashRef.current = nextHashes;
      }
    }, COLLAB_DEBOUNCE_MS);
  }, [screens, connections, documents, featureBrief, taskLink, techStack, dataModels, stickyNotes, screenGroups, comments, role, buildCollabPayload]);

  // Cursor broadcasting via mousemove on canvas
  useEffect(() => {
    if (!isConnected || !canvasRef?.current) return;
    const canvas = canvasRef.current;

    const onMouseMove = (e) => {
      const now = Date.now();
      if (now - cursorThrottleRef.current < CURSOR_THROTTLE_MS) return;
      cursorThrottleRef.current = now;

      const channel = channelRef.current;
      if (!channel) return;

      const rect = canvas.getBoundingClientRect();
      const worldX = (e.clientX - rect.left - panRef.current.x) / zoomRef.current;
      const worldY = (e.clientY - rect.top - panRef.current.y) / zoomRef.current;

      channel.send({
        type: "broadcast",
        event: "cursor-update",
        payload: {
          peerId: peerIdRef.current,
          displayName: selfDisplayNameRef.current || "",
          color: selfColorRef.current || "#61afef",
          x: worldX,
          y: worldY,
          ts: now,
        },
      });
    };

    canvas.addEventListener("mousemove", onMouseMove);
    return () => canvas.removeEventListener("mousemove", onMouseMove);
  }, [isConnected, canvasRef]);

  // Stale cursor cleanup: remove cursors not updated within CURSOR_STALE_MS.
  // Handles unclean disconnects (browser crash, network drop) where Presence
  // leave event never fires.
  useEffect(() => {
    if (!isConnected) return;
    const id = setInterval(() => {
      const now = Date.now();
      const prev = remoteCursorsRef.current;
      const filtered = prev.filter((c) => now - c.lastUpdate < CURSOR_STALE_MS);
      if (filtered.length !== prev.length) {
        remoteCursorsRef.current = filtered;
        setRemoteCursors(filtered);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [isConnected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    isConnected,
    roomCode,
    role,
    peers,
    remoteCursors,
    hostLeft,
    selfDisplayName,
    selfColor,
    selfPeerId,
    isReadOnly: role === "viewer" || role === "reviewer",
    isHost: role === "host",
    isCollabAvailable: !!supabase,
    createRoom,
    joinRoom,
    leaveRoom,
    setPeerRole,
    dismissHostLeft,
  };
}
