if (!global.Module) {
	global.jsExtPrefixURL = "../";
	global.Module = require("./Module");
	// require(scripts + "./debug/Rasterizer");
	require("./WacomInkEngine");
}
