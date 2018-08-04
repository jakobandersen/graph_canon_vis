const CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = {
  entry: './index.js',
  output: {
    filename: 'bundle.js'
  },
  plugins: [
    new CopyWebpackPlugin([
		{from: "index.html"},
		{from: "logs.json"},
		{from: "logs", to: "logs"},
	])
  ]
};
