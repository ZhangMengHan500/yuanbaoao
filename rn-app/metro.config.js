const { getDefaultConfig } = require('@react-native/metro-config');
const path = require('path');
const fs = require('fs');

const defaultConfig = getDefaultConfig(__dirname);

const stubsDir = path.resolve(__dirname, 'src/stubs');

// Map of native module names to their web stub filenames
const nativeModuleStubs = {
  'react-native-mmkv': 'react-native-mmkv.web.ts',
  'react-native-voice': 'react-native-voice.web.ts',
  'react-native-tts': 'react-native-tts.web.ts',
  'lottie-react-native': 'lottie-react-native.web.tsx',
  'react-native-image-picker': 'react-native-image-picker.web.ts',
  'react-native-document-picker': 'react-native-document-picker.web.ts',
  'react-native-fs': 'react-native-fs.web.ts',
  '@react-native-camera-roll/camera-roll': 'camera-roll.web.ts',
};

defaultConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && nativeModuleStubs[moduleName]) {
    const stubPath = path.join(stubsDir, nativeModuleStubs[moduleName]);
    if (fs.existsSync(stubPath)) {
      return {type: 'sourceFile', filePath: stubPath};
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = defaultConfig;
