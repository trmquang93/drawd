import { COLORS, FONTS, Z_INDEX } from "../styles/theme";
import { HotspotModal } from "./HotspotModal";
import { ConnectionEditModal } from "./ConnectionEditModal";
import { DocumentsPanel } from "./DocumentsPanel";
import { DataModelsPanel } from "./DataModelsPanel";
import { InstructionsPanel } from "./InstructionsPanel";
import { RenameModal } from "./RenameModal";
import { ImportConfirmModal } from "./ImportConfirmModal";
import { ParticipantsPanel } from "./ParticipantsPanel";
import { ShortcutsPanel } from "./ShortcutsPanel";
import { ShareModal } from "./ShareModal";
import { HostLeftModal } from "./HostLeftModal";

export function ModalsLayer({
  // Hotspot modal
  hotspotModal, setHotspotModal,
  screens, documents, addDocument,
  saveHotspot, deleteHotspot, updateConnection,
  // Connection edit modal
  connectionEditModal, setConnectionEditModal,
  saveConnectionGroup, deleteConnectionGroup, deleteConnection,
  setSelectedConnection,
  // Documents
  showDocuments, setShowDocuments,
  updateDocument, deleteDocument,
  // Data models
  showDataModels, setShowDataModels,
  dataModels, addDataModel, updateDataModel, deleteDataModel,
  // Instructions
  showInstructions, setShowInstructions, instructions,
  // Rename
  renameModal, setRenameModal, renameScreen,
  // Import
  importConfirm, onImportReplace, onImportMerge, setImportConfirm,
  // Participants
  showParticipants, setShowParticipants, collab,
  // Shortcuts
  showShortcuts, setShowShortcuts,
  // Share
  showShareModal, setShowShareModal, initialRoomCode,
  // Figma
  figmaProcessing, figmaError, setFigmaError,
}) {
  return (
    <>
      {hotspotModal && (
        <HotspotModal
          screen={hotspotModal.screen}
          hotspot={hotspotModal.hotspot}
          screens={screens}
          documents={documents}
          onAddDocument={addDocument}
          connection={hotspotModal.connection || null}
          prefilledTarget={hotspotModal.prefilledTarget || null}
          prefilledRect={hotspotModal.prefilledRect || null}
          onSave={(hs) => {
            saveHotspot(hotspotModal.screen.id, hs);
            if (hotspotModal.connection) {
              updateConnection(hotspotModal.connection.id, {
                transitionType: hs.transitionType ?? "",
                transitionLabel: hs.transitionLabel ?? "",
              });
            }
            setHotspotModal(null);
          }}
          onDelete={(id) => { deleteHotspot(hotspotModal.screen.id, id); setHotspotModal(null); }}
          onClose={() => setHotspotModal(null)}
        />
      )}

      {connectionEditModal && (
        <ConnectionEditModal
          connection={connectionEditModal.connection}
          groupConnections={connectionEditModal.groupConnections}
          screens={screens}
          fromScreen={connectionEditModal.fromScreen}
          onSave={(payload) => {
            saveConnectionGroup(connectionEditModal.connection.id, payload);
            setConnectionEditModal(null);
            setSelectedConnection(null);
          }}
          onDelete={() => {
            const conn = connectionEditModal.connection;
            if (conn.conditionGroupId) {
              deleteConnectionGroup(conn.conditionGroupId);
            } else {
              deleteConnection(conn.id);
            }
            setConnectionEditModal(null);
            setSelectedConnection(null);
          }}
          onClose={() => setConnectionEditModal(null)}
        />
      )}

      {showDocuments && (
        <DocumentsPanel
          documents={documents}
          onAddDocument={addDocument}
          onUpdateDocument={updateDocument}
          onDeleteDocument={deleteDocument}
          onClose={() => setShowDocuments(false)}
        />
      )}

      {showDataModels && (
        <DataModelsPanel
          dataModels={dataModels}
          onAddModel={addDataModel}
          onUpdateModel={updateDataModel}
          onDeleteModel={deleteDataModel}
          onClose={() => setShowDataModels(false)}
        />
      )}

      {showInstructions && (
        <InstructionsPanel
          instructions={instructions}
          onClose={() => setShowInstructions(false)}
        />
      )}

      {renameModal && (
        <RenameModal
          screen={renameModal}
          onSave={(name) => { renameScreen(renameModal.id, name); setRenameModal(null); }}
          onClose={() => setRenameModal(null)}
        />
      )}

      {importConfirm && (
        <ImportConfirmModal
          payload={importConfirm}
          canvasEmpty={screens.length === 0}
          onReplace={onImportReplace}
          onMerge={onImportMerge}
          onClose={() => setImportConfirm(null)}
        />
      )}

      {showParticipants && collab.isConnected && (
        <ParticipantsPanel
          peers={collab.peers}
          selfDisplayName={collab.selfDisplayName}
          selfColor={collab.selfColor}
          selfRole={collab.role}
          isHost={collab.isHost}
          onSetRole={collab.setPeerRole}
          onClose={() => setShowParticipants(false)}
        />
      )}

      {showShortcuts && <ShortcutsPanel onClose={() => setShowShortcuts(false)} />}

      {showShareModal && (
        <ShareModal
          isCollabAvailable={collab.isCollabAvailable}
          initialRoomCode={initialRoomCode}
          onCreateRoom={(name, color) => {
            collab.createRoom(name, color);
            setShowShareModal(false);
          }}
          onJoinRoom={(code, name, color) => {
            collab.joinRoom(code, name, color);
            setShowShareModal(false);
          }}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {collab.hostLeft && (
        <HostLeftModal
          onKeepState={() => {
            collab.dismissHostLeft();
            collab.leaveRoom();
          }}
          onLeave={() => {
            collab.dismissHostLeft();
            collab.leaveRoom();
          }}
        />
      )}

      {figmaProcessing && (
        <div style={{
          position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.5)", zIndex: Z_INDEX.modal + 10,
        }}>
          <div style={{
            background: COLORS.bg, color: COLORS.fg, padding: "24px 32px", borderRadius: 12,
            fontFamily: FONTS.ui, fontSize: 14, textAlign: "center",
            border: `1px solid ${COLORS.border}`, boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}>
            <div style={{ marginBottom: 12, fontSize: 20 }}>Rendering Figma frame...</div>
            <div style={{ color: COLORS.fgMuted }}>This may take a moment on first use while the rendering engine loads.</div>
          </div>
        </div>
      )}

      {figmaError && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: COLORS.danger, color: "#fff", padding: "10px 20px", borderRadius: 8,
          fontFamily: FONTS.ui, fontSize: 13, zIndex: Z_INDEX.modal + 10,
          boxShadow: "0 4px 16px rgba(0,0,0,0.3)", cursor: "pointer",
          maxWidth: 480,
        }} onClick={() => setFigmaError(null)}>
          Figma paste failed: {figmaError}
        </div>
      )}
    </>
  );
}
