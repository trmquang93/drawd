import { useState, useRef, useCallback } from "react";
import { generateId } from "../utils/generateId";

export function useScreenManager(pan, zoom) {
  const [screens, setScreens] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedScreen, setSelectedScreen] = useState(null);

  const fileInputRef = useRef(null);
  const screenCounter = useRef(1);

  const addScreen = useCallback((imageData = null, name = null) => {
    const count = screenCounter.current++;
    const offsetX = (screens.length % 4) * 280 + 60;
    const offsetY = Math.floor(screens.length / 4) * 420 + 60;
    const newScreen = {
      id: generateId(),
      name: name || `Screen ${count}`,
      x: (-pan.x + offsetX) / zoom,
      y: (-pan.y + offsetY) / zoom,
      width: 220,
      imageData,
      hotspots: [],
    };
    setScreens((prev) => [...prev, newScreen]);
    setSelectedScreen(newScreen.id);
  }, [screens.length, pan, zoom]);

  const removeScreen = useCallback((id) => {
    setScreens((prev) => prev.filter((s) => s.id !== id));
    setConnections((prev) =>
      prev.filter((c) => c.fromScreenId !== id && c.toScreenId !== id)
    );
    if (selectedScreen === id) setSelectedScreen(null);
  }, [selectedScreen]);

  const renameScreen = useCallback((id, name) => {
    setScreens((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
  }, []);

  const moveScreen = useCallback((id, x, y) => {
    setScreens((prev) =>
      prev.map((s) => (s.id === id ? { ...s, x, y } : s))
    );
  }, []);

  const handleImageUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onFileChange = useCallback((e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        addScreen(ev.target.result, file.name.replace(/\.[^.]+$/, ""));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }, [addScreen]);

  const handlePaste = useCallback((e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imageItems = items.filter((item) => item.type.startsWith("image/"));
    if (imageItems.length === 0) return;
    e.preventDefault();
    imageItems.forEach((item) => {
      const file = item.getAsFile();
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const count = screenCounter.current;
        addScreen(ev.target.result, `Pasted Screen ${count}`);
      };
      reader.readAsDataURL(file);
    });
  }, [addScreen]);

  const handleCanvasDrop = useCallback((e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        addScreen(ev.target.result, file.name.replace(/\.[^.]+$/, ""));
      };
      reader.readAsDataURL(file);
    });
  }, [addScreen]);

  const saveHotspot = useCallback((screenId, hotspot) => {
    setScreens((prev) =>
      prev.map((s) => {
        if (s.id !== screenId) return s;
        const existing = s.hotspots.findIndex((h) => h.id === hotspot.id);
        const newHotspots = existing >= 0
          ? s.hotspots.map((h) => (h.id === hotspot.id ? hotspot : h))
          : [...s.hotspots, hotspot];
        return { ...s, hotspots: newHotspots };
      })
    );

    if (hotspot.targetScreenId && (hotspot.action === "navigate" || hotspot.action === "modal")) {
      setConnections((prev) => {
        const exists = prev.some(
          (c) => c.fromScreenId === screenId && c.toScreenId === hotspot.targetScreenId && c.hotspotId === hotspot.id
        );
        if (exists) {
          return prev.map((c) =>
            c.fromScreenId === screenId && c.hotspotId === hotspot.id
              ? { ...c, toScreenId: hotspot.targetScreenId, label: hotspot.label }
              : c
          );
        }
        return [
          ...prev,
          {
            id: generateId(),
            fromScreenId: screenId,
            toScreenId: hotspot.targetScreenId,
            hotspotId: hotspot.id,
            label: hotspot.label || "",
            action: hotspot.action,
          },
        ];
      });
    }
  }, []);

  const deleteHotspot = useCallback((screenId, hotspotId) => {
    setScreens((prev) =>
      prev.map((s) =>
        s.id === screenId ? { ...s, hotspots: s.hotspots.filter((h) => h.id !== hotspotId) } : s
      )
    );
    setConnections((prev) => prev.filter((c) => c.hotspotId !== hotspotId));
  }, []);

  return {
    screens,
    connections,
    selectedScreen,
    setSelectedScreen,
    fileInputRef,
    addScreen,
    removeScreen,
    renameScreen,
    moveScreen,
    handleImageUpload,
    onFileChange,
    handlePaste,
    handleCanvasDrop,
    saveHotspot,
    deleteHotspot,
  };
}
