import { useState, useCallback, useEffect, useRef } from "react";
import { useCollaboration } from "./useCollaboration";

export function useCollabSync({
  screens, connections, documents,
  featureBrief, taskLink, techStack,
  dataModels, stickyNotes, screenGroups, comments,
  replaceAll, setFeatureBrief, setTaskLink, setTechStack,
  setDataModels, setStickyNotes, setScreenGroups, setComments,
  draggingRef, hotspotInteractionRef, patchScreenImage,
  canvasRef, pan, zoom, initialRoomCode,
}) {
  const [showShareModal, setShowShareModal] = useState(!!initialRoomCode);
  const [showParticipants, setShowParticipants] = useState(false);
  const pendingRemoteStateRef = useRef(null);

  const screensRef = useRef(screens);
  useEffect(() => { screensRef.current = screens; }, [screens]);

  const applyRemotePayload = useCallback((payload) => {
    const incomingScreens = payload.screens || [];
    const currentScreens = screensRef.current;
    const merged = incomingScreens.map((s) => {
      if (!s.imageData) {
        const existing = currentScreens.find((e) => e.id === s.id);
        if (existing?.imageData) return { ...s, imageData: existing.imageData };
      }
      return s;
    });
    replaceAll(merged, payload.connections || [], merged.length + 1, payload.documents || []);
    if (payload.featureBrief !== undefined) setFeatureBrief(payload.featureBrief);
    if (payload.taskLink !== undefined) setTaskLink(payload.taskLink);
    if (payload.techStack !== undefined) setTechStack(payload.techStack);
    if (payload.dataModels !== undefined) setDataModels(payload.dataModels);
    if (payload.stickyNotes !== undefined) setStickyNotes(payload.stickyNotes);
    if (payload.screenGroups !== undefined) setScreenGroups(payload.screenGroups);
    if (payload.comments !== undefined) setComments(payload.comments);
  }, [replaceAll, setFeatureBrief, setTaskLink, setTechStack, setDataModels, setStickyNotes, setScreenGroups, setComments]);

  const applyPendingRemoteState = useCallback((payload) => {
    applyRemotePayload(payload);
  }, [applyRemotePayload]);

  const collab = useCollaboration({
    screens, connections, documents,
    featureBrief, taskLink, techStack,
    dataModels, stickyNotes, screenGroups, comments,
    applyRemoteState: (payload) => {
      const dragging = draggingRef.current;
      const hsMode = hotspotInteractionRef.current?.mode;
      if (dragging || hsMode === "draw" || hsMode === "reposition" || hsMode === "resize") {
        pendingRemoteStateRef.current = payload;
        return;
      }
      applyRemotePayload(payload);
    },
    applyRemoteImage: patchScreenImage,
    canvasRef, pan, zoom,
  });

  const isReadOnly = collab.isReadOnly;
  const { role, isConnected } = collab;
  // Capability flags: fall back to full access when not in a collab session.
  const canEditFlow = !isConnected || role === "host" || role === "editor";
  const canComment = !isConnected || role === "host" || role === "editor" || role === "reviewer";
  const canModerateComments = !isConnected || role === "host" || role === "editor";

  return {
    collab, isReadOnly,
    canEditFlow, canComment, canModerateComments,
    showShareModal, setShowShareModal,
    showParticipants, setShowParticipants,
    pendingRemoteStateRef, applyPendingRemoteState,
  };
}
