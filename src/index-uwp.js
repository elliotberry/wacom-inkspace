import '../scripts/uwp/NativeBridge';
import Logger from '../scripts/uwp/Logger';
import DBBridge from '../scripts/uwp/DBBridge';
import MainMenuManager from '../scripts/uwp/MainMenuManager';

import renderApp from './main';

global.process = {
	platform: "win32"
};

global.MainMenuManager = MainMenuManager;

Logger.init();
global.Logger = Logger;

global.SmartPadNS = require("../scripts/uwp/connectivity/SmartPadNS");
global.SmartPadUSB = require("../scripts/uwp/connectivity/SmartPadUSB");
global.SmartPadBTC = require("../scripts/uwp/connectivity/SmartPadBTC");
global.SmartPadBLE = require("../scripts/uwp/connectivity/SmartPadBLE");

global.getScrollParent = function(reactList) {
	const {axis} = reactList.props;
	const OVERFLOW_KEYS = {x: 'overflowX', y: 'overflowY'};

	let el = reactList.getEl();
	const overflowKey = OVERFLOW_KEYS[axis];
	let otherAxisOverflowKey = OVERFLOW_KEYS[axis == 'x' ? 'y' : 'x' ];

	while (el = el.parentElement) {
		if (['auto', 'scroll', 'overlay'].includes(window.getComputedStyle(el)[overflowKey]) || window.getComputedStyle(el)[otherAxisOverflowKey] == 'hidden')
			return el;
	}

	return window;
};

DeviceManager.SKIP_DOWNLOAD = true;

// console.suppress.push("UWP");
// console.suppress.push("REDUX");
// console.suppress.push("CONTENT_MANAGER");

Module.addPostScript(() => {
	global.DBManager = new DBBridge();

	renderApp();
});

/*
DBManager

SmartPadUSB
SmartPadBTC
SmartPadBLE

NativeBridge (
	UIManager,
	IOManager,
	PowerManager,
	NativeLinker,
	Menu,
	MenuItem,
	UAManager
)

DiffSync
window.onbeforeunload
	closeDB()
	closeSmartPad()
*/
