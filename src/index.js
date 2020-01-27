import './globals/NativeBridge';
import MainMenuManager from './globals/MainMenuManager';
import DBBridge from '../scripts/DBBridgeRender';

import renderApp from './main';

global.MainMenuManager = MainMenuManager;
global.DBManager = new DBBridge();

global.MANUAL_PAIRING = true;

global.SmartPadNS = require("../scripts/connectivity/SmartPadNS");
global.SmartPadUSB = require("../scripts/connectivity/SmartPadUSB");
// global.SmartPadBTC = require("../scripts/connectivity/SmartPadBTC");
global.SmartPadSPP = require("../scripts/connectivity/SmartPadSPP");
global.SmartPadBLE = null;

let SmartPadBLE = require("../scripts/connectivity/SmartPadBLE");

// console.suppress.push("REDUX");
// console.suppress.push("APP");
// console.suppress.push("CLOUD");
console.suppress.push("CLOUD_SYNCING");
console.suppress.push("CLOUD_EXPORTING");
console.suppress.push("CLOUD_DOWNLOADING");
// console.suppress.push("WORKER_GL");
console.suppress.push("WORKER_DB");
// console.suppress.push("UA_MANAGER");
// console.suppress.push("DOWNLOAD");
// console.suppress.push("CONTENT_MANAGER");
// console.suppress.push("DEVICE_MANAGER");
// console.suppress.push("AUTHENTICATION_MANAGER");

if (SmartPadBLE) {
	SmartPadBLE.checkBLESupported().then(supported => {
		if (supported) global.SmartPadBLE = SmartPadBLE;
		Module.addPostScript(renderApp);
	});
}
else
	Module.addPostScript(renderApp);
