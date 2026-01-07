const path = require('path');
const webpack = require('webpack');
const defaults = require('@wordpress/scripts/config/webpack.config');

module.exports = {
  ...defaults,
externals: {
  ...(defaults.externals || {}),
  react: 'React',
  'react-dom': 'ReactDOM',
  '@wordpress/i18n': 'wp.i18n',
},

  optimization: {
    ...defaults.optimization,
    splitChunks: { cacheGroups: { default: false } },
    runtimeChunk: false,
  },
  resolve: {
    ...defaults.resolve,
    alias: {
      ...defaults.resolve.alias,
      '@components': path.resolve(__dirname, 'src/components/'),
      '@utils': path.resolve(__dirname, 'src/utils/'),
      '@': path.resolve(__dirname, 'src/'),
    },
    fallback: {
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer/'),
    },
  },
  module: {
    ...defaults.module,
    rules: [
      ...defaults.module.rules,
      {
        test: /\.m?js$/,
        include: [path.resolve(__dirname, 'node_modules/@heroui')],
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'],
          },
        },
      },
    ],
  },
  plugins: [
    ...defaults.plugins,
    new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 }),
  ],
};
