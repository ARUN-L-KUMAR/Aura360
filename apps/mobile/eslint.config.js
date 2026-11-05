// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // Node scripts and tests run outside React Native.
    files: ["scripts/**/*.js", "tests/**/*.ts"],
    languageOptions: {
      globals: { __dirname: "readonly", process: "readonly", require: "readonly", console: "readonly", module: "readonly" },
    },
  },
]);
