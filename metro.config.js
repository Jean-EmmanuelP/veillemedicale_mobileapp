// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Fix for Supabase/ws issue with Expo SDK 53
config.resolver.unstable_enablePackageExports = false;

// Explicitly ignore 'stream' and 'events' modules
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  stream: false,
  events: false,
};

module.exports = config;