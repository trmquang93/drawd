import { COLORS, styles } from "../styles/theme";
import { generateId } from "../utils/generateId";

const DATA_TYPES = ["String", "Int", "Bool", "Object", "Array", "Date", "ID"];
const ACCENT = "#00d2d3";

export function DataFlowEditor({ items, onChange }) {
  const updateItem = (index, patch) => {
    const updated = [...items];
    updated[index] = { ...updated[index], ...patch };
    onChange(updated);
  };

  const removeItem = (index) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const addItem = () => {
    onChange([...items, { id: generateId(), name: "", type: "String", description: "" }]);
  };

  return (
    <div style={{
      border: `1px solid ${COLORS.border}`,
      borderRadius: 8,
      padding: 12,
      background: "rgba(255,255,255,0.02)",
    }}>
      <div style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.08em",
        color: ACCENT,
        marginBottom: 10,
        textTransform: "uppercase",
      }}>
        Data Passed
      </div>

      {items.map((item, i) => (
        <div key={item.id} style={{
          display: "flex",
          gap: 8,
          marginBottom: 8,
          alignItems: "flex-end",
        }}>
          <label style={{ ...styles.monoLabel, flex: 1 }}>
            {i === 0 ? "NAME" : ""}
            <input
              value={item.name}
              onChange={(e) => updateItem(i, { name: e.target.value })}
              placeholder="e.g. productId"
              style={styles.input}
            />
          </label>
          <label style={{ ...styles.monoLabel, flex: 0, minWidth: 90 }}>
            {i === 0 ? "TYPE" : ""}
            {item.type === "custom" ? (
              <input
                value={item.customType || ""}
                onChange={(e) => updateItem(i, { customType: e.target.value })}
                placeholder="Custom type"
                style={styles.input}
                autoFocus
                onBlur={(e) => {
                  if (e.target.value) {
                    updateItem(i, { type: e.target.value, customType: undefined });
                  } else {
                    updateItem(i, { type: "String", customType: undefined });
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.target.blur();
                }}
              />
            ) : (
              <select
                value={item.type || "String"}
                onChange={(e) => updateItem(i, e.target.value === "custom" ? { type: "custom", customType: "" } : { type: e.target.value })}
                style={styles.select}
              >
                {DATA_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
                <option value="custom">Custom...</option>
              </select>
            )}
          </label>
          <label style={{ ...styles.monoLabel, flex: 1 }}>
            {i === 0 ? "DESCRIPTION" : ""}
            <input
              value={item.description}
              onChange={(e) => updateItem(i, { description: e.target.value })}
              placeholder="e.g. Selected product identifier"
              style={styles.input}
            />
          </label>
          <button
            type="button"
            onClick={() => removeItem(i)}
            style={{
              background: "none",
              border: "none",
              color: COLORS.danger,
              cursor: "pointer",
              fontSize: 16,
              padding: "6px",
              marginBottom: 6,
            }}
          >
            &#10005;
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addItem}
        style={{
          width: "100%",
          padding: "6px 0",
          marginTop: 4,
          background: `${ACCENT}0d`,
          border: `1px dashed ${ACCENT}4d`,
          borderRadius: 6,
          color: ACCENT,
          fontSize: 11,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        + Add Data
      </button>
    </div>
  );
}
