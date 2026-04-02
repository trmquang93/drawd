import js from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

const browserGlobals = {
  window: "readonly",
  document: "readonly",
  console: "readonly",
  alert: "readonly",
  confirm: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  setInterval: "readonly",
  clearInterval: "readonly",
  fetch: "readonly",
  URL: "readonly",
  FileReader: "readonly",
  Blob: "readonly",
  File: "readonly",
  navigator: "readonly",
  performance: "readonly",
  requestAnimationFrame: "readonly",
  cancelAnimationFrame: "readonly",
  atob: "readonly",
  btoa: "readonly",
  TextEncoder: "readonly",
  TextDecoder: "readonly",
  crypto: "readonly",
  KeyboardEvent: "readonly",
  MouseEvent: "readonly",
  CustomEvent: "readonly",
  Image: "readonly",
};

export default [
  js.configs.recommended,
  {
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      // Allow _-prefixed params to signal intentionally unused args
      "no-unused-vars": ["error", { varsIgnorePattern: "^_", argsIgnorePattern: "^_" }],
    },
    settings: {
      react: { version: "detect" },
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: browserGlobals,
    },
  },
  {
    ignores: ["dist/**", "node_modules/**"],
  },
];
