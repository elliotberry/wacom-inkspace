const path = require("path");

const webpack = require("webpack");
// const HtmlWebpackPlugin = require("html-webpack-plugin");
const CleanWebpackPlugin = require("clean-webpack-plugin");
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const UglifyJsPlugin = require("uglifyjs-webpack-plugin");

const project = require("./project.config");

const inProject = path.resolve.bind(path, project.basePath);
const inProjectSrc = (file) => inProject(project.srcDir, file);

const __DEV__ = project.env === "development";
const __PROD__ = project.env === "production";

const config = {
	mode: project.env,
	entry: {},
	output: {
		path: inProject(project.outDir),
		publicPath: project.publicPath,
		filename: "[name].js",
		libraryTarget: "commonjs2"
	},
	resolve: {
		modules: [
			inProject(project.srcDir),
			inProject("scripts"),
			"node_modules"
		],
		extensions: [".js", ".jsx", ".json"]
	},
	module: {
		rules: [
			{test: inProject("scripts/ink-engine"), use: [{loader: "ignore-loader"}]},
			{test: /\.html$/, use: {loader: "html-loader"}},
			{test: /\.css$/, use: ExtractTextPlugin.extract({fallback: "style-loader", use: [{loader: "css-loader", options: {sourceMap: true, url: false}}]})},
			{test: /\.(png|svg|jpg|gif)$/, use: [{loader: "file-loader", options: {name: "[path][name].[ext]", publicPath: `${__dirname}/dist/`}}]},
			{
				test: /\.jsx?$/,
				exclude: [
					inProject("node_modules"),
					inProject("scripts"),
					inProject("scripts/ink-engine/Module.js"),
					inProject("scripts/ink-engine/WacomInkEngine.js"),
					inProject("connectivity/bridge/bridge.js"),
					inProject("connectivity/bridge/wacom.smartPadCommunication.js"),
				],
				use: {
					// babel-core babel-loader
					loader: "babel-loader",
					options: {
						// babel-preset-env babel-preset-stage-0 babel-preset-react
						// babel-preset-es2015-without-strict
						presets: ["@babel/preset-env", "@babel/preset-react"],
						// babel-plugin-transform-remove-strict-mode 	// babel-plugin-add-module-exports, babel-plugin-transform-runtime, babel-plugin-transform-es2015-modules-commonjs
						plugins: [
							// Stage 0
							"@babel/plugin-proposal-function-bind",

							// Stage 1
							"@babel/plugin-proposal-export-default-from",
							"@babel/plugin-proposal-logical-assignment-operators",
							["@babel/plugin-proposal-optional-chaining", { loose: false }],
							["@babel/plugin-proposal-pipeline-operator", { proposal: "minimal" }],
							["@babel/plugin-proposal-nullish-coalescing-operator", { loose: false }],
							"@babel/plugin-proposal-do-expressions",

							// Stage 2
							["@babel/plugin-proposal-decorators", { legacy: true }],
							"@babel/plugin-proposal-function-sent",
							"@babel/plugin-proposal-export-namespace-from",
							"@babel/plugin-proposal-numeric-separator",
							"@babel/plugin-proposal-throw-expressions",

							// Stage 3
							"@babel/plugin-syntax-dynamic-import",
							"@babel/plugin-syntax-import-meta",
							["@babel/plugin-proposal-class-properties", { loose: false }],
							"@babel/plugin-proposal-json-strings",

							"transform-remove-strict-mode", [
							"inline-react-svg", {
								"svgo": {
									"plugins": [
										{"convertShapeToPath": false}
									]
								}
							}]
						]
					}
				}
			}
		]
	},
	plugins: [
		new CleanWebpackPlugin(["dist"]),
		new ExtractTextPlugin({filename: "bundle.css", disable: false, allChunks: true}),
		new webpack.IgnorePlugin(new RegExp("^(ipc)$")),
		new webpack.DefinePlugin(Object.assign({
			"process.env": { NODE_ENV: JSON.stringify(project.env) },
			__DEV__,
			__PROD__
		}, project.globals))
	],
	optimization: {
		runtimeChunk: "single",
		minimize: __PROD__,
		minimizer: [],
		splitChunks: {
			cacheGroups: {
				vendor: {
					test: /[\\/]node_modules[\\/]/,
					name: "vendor",
					chunks: "all"
				}
			}
		}
	},
	externals: project.externals
}

if (project.target == "ELECTRON") {
	config.entry.main = inProjectSrc("index");
	config.target = "electron-renderer";

	if (__DEV__) {
		config.plugins.push(new webpack.SourceMapDevToolPlugin({
			filename: "[name].js.map",
			exclude: ["vendor.js"]
		}));
	}
}
else if (project.target == "UWP")
	config.entry.main = inProjectSrc("index-uwp");

// config.plugins.push(new HtmlWebpackPlugin({template: inProject("index.html"), inject: true}));

if (__PROD__) {
/*
	config.optimization.minimizer.push(
		new UglifyJSPlugin({
			sourceMap: !!config.devtool,
			uglifyOptions: {
				sourceMap: !!config.devtool,
				comments: false,
				compress: {
					warnings: false,
					screw_ie8: true,
					conditionals: true,
					unused: true,
					comparisons: true,
					sequences: true,
					dead_code: true,
					evaluate: true,
					if_return: true,
					join_vars: true
				}
			}
		})
	);
*/
}

module.exports = config
