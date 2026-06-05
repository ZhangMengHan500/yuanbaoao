const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');

module.exports = async function (env, argv) {
  env.mode = env.mode || 'production';
  env.platform = env.platform || 'web';

  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      projectRoot: __dirname,
    },
    argv
  );

  // Customize config for web-only
  config.resolve.alias = {
    ...config.resolve.alias,
    '@': path.resolve(__dirname, 'src'),
  };

  return config;
};
