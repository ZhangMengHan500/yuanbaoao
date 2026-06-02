const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const defaultConfig = getDefaultConfig(__dirname);

const stubsDir = path.resolve(__dirname, 'src/stubs');

const nativeModules = [
  'react-native-mmkv',
  'react-native-voice',
  'react-native-tts',
  'lottie-react-native',
];

defaultConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && nativeModules.includes(moduleName)) {
    const exts = ['.web.ts', '.web.tsx', '.web.js'];
    for (const ext of exts) {
      const stubPath = path.join(stubsDir, moduleName + ext);
      if (fs.existsSync(stubPath)) {
        return {filePath: stubPath};
      }
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = defaultConfig;
