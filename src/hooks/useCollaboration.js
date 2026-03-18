import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "../collab/supabaseClient";
import { COLLAB_DEBOUNCE_MS, CURSOR_THROTTLE_MS, COLLAB_ROOM_CODE_LENGTH } from "../constants";

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
  dataModels, stickyNotes, screenGroups,
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

  const channelRef = useRef(null);
  const peerIdRef = useRef(generatePeerId());
  const applyingRemoteRef = useRef(false);
  const debounceTimerRef = useRef(null);
  const cursorThrottleRef = useRef(0);
  const roleRef = useRef(null);
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);

  const screensRef = useRef(screens);
  const buildCollabPayloadRef = useRef(null);
  const applyRemoteStateRef = useRef(null);
  const applyRemoteImageRef = useRef(null);

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
    };
  }, [screens, connections, documents, featureBrief, taskLink, techStack, dataModels, stickyNotes, screenGroups]);

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

    // Presence: sync
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const allPeers = [];
      const cursors = [];
      for (const [, presences] of Object.entries(state)) {
        for (const p of presences) {
          if (p.peerId === peerIdRef.current) continue;
          allPeers.push({
            id: p.peerId,
            displayName: p.displayName,
            color: p.color,
            role: p.role,
          });
          if (p.cursorX != null && p.cursorY != null) {
            cursors.push({
              id: p.peerId,
              displayName: p.displayName,
              color: p.color,
              x: p.cursorX,
              y: p.cursorY,
              lastUpdate: p.cursorTs || Date.now(),
            });
          }
        }
      }
      setPeers(allPeers);
      setRemoteCursors(cursors);

      // Host departure detection
      if (myRole !== "host") {
        const hasHost = allPeers.some((p) => p.role === "host");
        if (!hasHost && allPeers.length === 0 && channelRef.current) {
          // Check if we ever had a host (we did since we joined)
          setHostLeft(true);
        }
      }
    });

    // When a new peer joins, host sends current state then images one-by-one
    channel.on("presence", { event: "join" }, () => {
      if (roleRef.current === "host") {
        // Small delay to let the joiner's subscription settle
        setTimeout(() => {
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
          cursorX: null,
          cursorY: null,
          cursorTs: null,
        });
        channelRef.current = channel;
        setRoomCode(code);
        setRole("host");
        setIsConnected(true);
        setHostLeft(false);
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
          cursorX: null,
          cursorY: null,
          cursorTs: null,
        });
        channelRef.current = channel;
        setRoomCode(normalizedCode);
        setRole("editor");
        setIsConnected(true);
        setHostLeft(false);
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
    setIsConnected(false);
    setRoomCode(null);
    setRole(null);
    setPeers([]);
    setRemoteCursors([]);
    setHostLeft(false);
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

  // State broadcasting (host only, debounced)
  useEffect(() => {
    if (role !== "host" || !channelRef.current || applyingRemoteRef.current) return;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      const channel = channelRef.current;
      if (channel && roleRef.current === "host") {
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
  }, [screens, connections, documents, featureBrief, taskLink, techStack, dataModels, stickyNotes, screenGroups, role, buildCollabPayload]);

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

      channel.track({
        peerId: peerIdRef.current,
        displayName: channel._presenceState?.[peerIdRef.current]?.[0]?.displayName || "",
        color: channel._presenceState?.[peerIdRef.current]?.[0]?.color || "#61afef",
        role: roleRef.current,
        cursorX: worldX,
        cursorY: worldY,
        cursorTs: now,
      });
    };

    canvas.addEventListener("mousemove", onMouseMove);
    return () => canvas.removeEventListener("mousemove", onMouseMove);
  }, [isConnected, canvasRef]);

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
    isReadOnly: role === "viewer",
    isHost: role === "host",
    isCollabAvailable: !!supabase,
    createRoom,
    joinRoom,
    leaveRoom,
    setPeerRole,
    dismissHostLeft,
  };
}
