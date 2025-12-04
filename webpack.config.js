const path = require('path');
const defaults = require('@wordpress/scripts/config/webpack.config');
const Dotenv = require('dotenv-webpack');

module.exports = {
  ...defaults,

  // 👇 חשוב: לא לדרוס, אלא למזג את externals של ברירת־המחדל
  externals: {
    ...(defaults.externals || {}),
    react: 'React',
    'react-dom': 'ReactDOM',
    // ליתר ביטחון – אפשר להשאיר מפורש (גם אם כבר קיים בדיפולט):
    '@wordpress/i18n': 'wp.i18n',
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
          options: { presets: ['@babel/preset-env', '@babel/preset-react'] },
        },
      },
    ],
  },

  plugins: [
    ...defaults.plugins,
    new Dotenv(),
  ],
};
