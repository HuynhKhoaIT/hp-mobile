// NativeWind 4: JSX đi qua nativewind để className hoạt động. babel-preset-expo tự thêm plugin worklets (Reanimated 4).
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
  };
};
