const path = require('path');

module.exports = {
  mode: 'development',
  entry: './src/renderer/game.ts',
  output: {
    filename: 'game.bundle.js',
    path: path.resolve(__dirname, 'dist/renderer'),
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  devtool: 'source-map',
};