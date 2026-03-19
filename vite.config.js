// Vite configuration loader - loads config from config folder
const { defineConfig } = require('vite');
const baseConfig = require('./config/vite.config.internal.js');

module.exports = defineConfig({
  ...baseConfig,
  // Add any root-level overrides here if needed
});