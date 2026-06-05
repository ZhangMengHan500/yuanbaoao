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

  // Output to dist/ instead of web-build/
  config.output.path = path.resolve(__dirname, 'dist');
  config.output.publicPath = '/';

  return config;
};
