// Expo tự nhận monorepo (watchFolders, node_modules gốc). NativeWind biên dịch global.css lúc bundle.
// inlineRem 16: p-4 = 16px giống web (mặc định NativeWind là 14).
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16 });
