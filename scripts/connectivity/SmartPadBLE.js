const os = require("os");

if (os.platform() == "win32") {
	// if (parseFloat(os.release()) >= 10)
	// 	module.exports = require("./SmartPadBLEWin");
	// else
		module.exports = null;
}
else
	module.exports = require("./SmartPadBLEUnix");
