/**
 * Creates a hotspot object with sensible defaults.
 * Only the fields that differ per hotspot need to be passed as overrides.
 */
export function makeHotspot(overrides) {
  return {
    id: "",
    label: "",
    elementType: "button",
    interactionType: "tap",
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    action: "navigate",
    targetScreenId: null,
    apiEndpoint: "",
    apiMethod: "",
    requestSchema: "",
    responseSchema: "",
    documentId: null,
    conditions: [],
    onSuccessAction: "",
    onSuccessTargetId: null,
    onSuccessCustomDesc: "",
    onErrorAction: "",
    onErrorTargetId: null,
    onErrorCustomDesc: "",
    dataFlow: [],
    onSuccessDataFlow: [],
    onErrorDataFlow: [],
    validation: null,
    tbd: false,
    tbdNote: "",
    customDescription: "",
    transitionType: "",
    transitionLabel: "",
    ...overrides,
  };
}
