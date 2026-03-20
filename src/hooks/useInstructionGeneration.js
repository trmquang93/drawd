import { useState, useCallback } from "react";
import { generateInstructionFiles } from "../utils/generateInstructionFiles";
import { validateInstructions } from "../utils/validateInstructions";

export function useInstructionGeneration({
  screens, connections, documents,
  featureBrief, taskLink, techStack,
  dataModels, screenGroups, scopeScreenIds,
}) {
  const [instructions, setInstructions] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);

  const buildInstructionResult = useCallback((warnings) => {
    const scopedScreens = scopeScreenIds
      ? screens.filter((s) => scopeScreenIds.has(s.id))
      : screens;
    return generateInstructionFiles(scopedScreens, connections, {
      platform: "auto",
      documents,
      featureBrief,
      taskLink,
      techStack,
      dataModels,
      screenGroups,
      scopeScreenIds,
      allScreens: screens,
      warnings,
    });
  }, [screens, connections, documents, featureBrief, scopeScreenIds, taskLink, techStack, dataModels, screenGroups]);

  const onGenerate = useCallback(() => {
    if (screens.length === 0) return;
    const scopedScreens = scopeScreenIds
      ? screens.filter((s) => scopeScreenIds.has(s.id))
      : screens;
    const warnings = validateInstructions(scopedScreens, connections, { documents });
    const errors = warnings.filter((w) => w.level === "error");
    if (
      errors.length > 0 &&
      !window.confirm(
        `Found ${errors.length} issue(s) that may affect generated output:\n\n${errors.map((e) => `\u2022 ${e.message}`).join("\n")}\n\nGenerate anyway?`
      )
    ) return;
    const result = buildInstructionResult(warnings);
    setInstructions(result);
    setShowInstructions(true);
  }, [screens, connections, documents, scopeScreenIds, buildInstructionResult]);

  return { instructions, showInstructions, setShowInstructions, onGenerate, buildInstructionResult };
}
