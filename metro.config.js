const { getDefaultConfig } = require('expo/metro-config');

/** Metro 配置：在默认资产扩展中追加 ogg（内置提示音资产，供 expo-audio require 打包试听）。 */
const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('ogg');

module.exports = config;
