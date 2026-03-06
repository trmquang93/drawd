export function importFlow(fileText) {
  let data;
  try {
    data = JSON.parse(fileText);
  } catch {
    throw new Error("Invalid file: not valid JSON.");
  }

  if (typeof data.version !== "number") {
    throw new Error("Invalid file: missing version field.");
  }

  if (data.version > 1) {
    throw new Error(
      `Unsupported file version ${data.version}. Please update FlowForge to open this file.`
    );
  }

  if (!Array.isArray(data.screens)) {
    throw new Error("Invalid file: screens must be an array.");
  }

  if (!Array.isArray(data.connections)) {
    throw new Error("Invalid file: connections must be an array.");
  }

  return data;
}
