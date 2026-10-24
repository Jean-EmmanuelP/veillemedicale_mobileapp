// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Package exports activés (défaut Expo SDK 53) — requis pour résoudre les sous-chemins
// comme `convex/react` / `convex/server`.
config.resolver.unstable_enablePackageExports = true;

module.exports = config;