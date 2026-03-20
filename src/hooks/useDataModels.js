import { useState, useCallback } from "react";

export function useDataModels() {
  const [dataModels, setDataModels] = useState([]);
  const [showDataModels, setShowDataModels] = useState(false);

  const addDataModel = useCallback((name, schema) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    setDataModels((prev) => [...prev, { id, name, schema, createdAt: new Date().toISOString() }]);
    return id;
  }, []);

  const updateDataModel = useCallback((id, patch) => {
    setDataModels((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  const deleteDataModel = useCallback((id) => {
    setDataModels((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return {
    dataModels, setDataModels,
    showDataModels, setShowDataModels,
    addDataModel, updateDataModel, deleteDataModel,
  };
}
