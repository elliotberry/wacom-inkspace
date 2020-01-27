import fs from 'fs';

import {remote, webFrame, shell, ipcRenderer, crashReporter} from 'electron';
import ua from 'universal-analytics';

// import MainMenuManager from './MainMenuManager';

const project = require("../../project.config.js");
const StrokesCodec = require("../../scripts/StrokesCodec");

// AuthenticationManager.DEBUG
let pcIsAwake = true;

remote.powerMonitor.on("suspend", () => {
	if (debug) console.info("The system is going to sleep")
	pcIsAwake = false;
});

remote.powerMonitor.on("resume", () => {
	if (debug) console.info("The system resume")
	pcIsAwake = true;
});

remote.powerMonitor.on("lock-screen", () => {
	if (debug) {
		let d = new Date();
		console.info("The system lock screen in", d.getHours().pad(2) + ":" + d.getMinutes().pad(2) + ":" + d.getSeconds().pad(2));
	}
});

remote.powerMonitor.on("unlock-screen", () => {
	if (debug) {
		let d = new Date();
		console.info("The system unlock screen in", d.getHours().pad(2) + ":" + d.getMinutes().pad(2) + ":" + d.getSeconds().pad(2));
	}

	remote.powerMonitor.querySystemIdleState(60, idleState => console.info("System state:", idleState))
	remote.powerMonitor.querySystemIdleTime(idleTime => console.info("System idle time:", idleTime))
});

remote.getCurrentWindow().on("minimize", function(e) {
	console.log("========= window is minimized")
}, false);

remote.getCurrentWindow().on("restore", function(e) {
	console.log("========= window is restored")
}, false);

crashReporter.start({
	productName: "InkspaceDesktop",
	companyName: "Wacom Co LTD",
	submitURL: project.crashReportURL,
	extra: {
		product: remote.app.getName(),
		version: remote.app.getVersion() + ", based on Electron " + process.versions.electron
	}
});

let UIManager = {
	editWindow: function(props) {
		let win = remote.getCurrentWindow();

		if ("resizable" in props) win.setResizable(props.resizable);
		if ("maximizable" in props) win.setMaximizable(props.maximizable);
		if ("size" in props) win.setSize(props.size.width, props.size.height);
	},

	setVisualZoomLevelLimits: function(min, max) {
		webFrame.setVisualZoomLevelLimits(min, max);
	},

	maximize: function() {
		remote.getCurrentWindow().maximize();
	},

	reload: function() {
		remote.getCurrentWindow().reload();
	},

	updateAppContext(context) {},
	setCloudLocale(locale) {},

	quit: function() {
		remote.app.quit();
	},

	showSaveDialog: function(title, fileName, callback) {
		let win = remote.getCurrentWindow();
		let options = {};

		options.title = title;
		options.defaultPath = remote.app.getPath("downloads") + "/" + fileName;

		remote.dialog.showSaveDialog(win, options, callback);
	},

	openExternal: function(url) {
		shell.openExternal(url);
	},

	openDialog: function(url) {
		let win = new remote.BrowserWindow({parent: remote.getCurrentWindow(), modal: true, minimizable: false, maximizable: false, show: false, minWidth: 800, minHeight: 600});
		win.setMenuBarVisibility(false);
		win.loadURL(url)
	}
};

let IOManager = {
	existsSync: function(filePath) {
		return fs.existsSync(filePath);
	},

	writeFile: function(filePath, data, callback) {
		fs.writeFile(filePath, data, callback);
	}
};

let PowerManager = {
	blockSleep: function() {
		if (!this.blockerID)
			this.blockerID = remote.powerSaveBlocker.start("prevent-display-sleep");

		return this.blockerID;
	},

	unblockSleep: function() {
		if (this.blockerID) {
			remote.powerSaveBlocker.stop(this.blockerID);
			delete this.blockerID;
		}
	},

	onSuspend: function(callback) {
		remote.powerMonitor.on("suspend", callback);
	}
};

// callback args: event, message
let NativeLinker = {
	linkBrowserWindow: function() {
		ipcRenderer.send("browser-window");
		ipcRenderer.on("browser-window", (event, message) => {
			window.minimized = (message.type == "minimize");
		});
	},

	linkDataMigration: function(callback) {
		ipcRenderer.send("data-migration");
		ipcRenderer.on("data-migration", callback);
	},

	linkStoreUpdate: function(callback) {
		ipcRenderer.send("store-update");
		ipcRenderer.on("store-update", (event, message) => callback(message));
	},

	syncWithCloud: function(message) {
		ipcRenderer.send("cloud-sync", message || {});
	},

	disconnectCloud: function(message) {
		ipcRenderer.send("cloud-disconnect", message || {});
	},

	send: function(event) {
		ipcRenderer.send(event);
	},

	get: function(remoteGlobalName) {
		return remote.getGlobal(remoteGlobalName);
	}
};

class Menu {
	constructor() {
		this.origin = new remote.Menu();
	}

	append(menuItem) {
		this.origin.append(menuItem);
	}

	popup() {
		this.origin.popup(remote.getCurrentWindow(), {async: true});
	}

	static setApplicationMenu(menu) {
		remote.Menu.setApplicationMenu(menu.origin);
	}
};

let UATracker = {
	createInstance(trackingID, userID) {
		return ua(trackingID, userID, {
			requestOptions: {
				headers: {
					"User-Agent": navigator.userAgent
				}
			}// , debug: true
		});
	}
};

const MenuItem = remote.MenuItem;

global.UIManager = UIManager;
global.IOManager = IOManager;
global.PowerManager = PowerManager;
global.NativeLinker = NativeLinker;
global.Menu = Menu;
global.MenuItem = MenuItem;
// global.MainMenuManager = MainMenuManager;
global.UATracker = UATracker;

global.StrokesCodec = StrokesCodec;

// MainMenuManager,
export {UIManager, IOManager, PowerManager, NativeLinker, Menu, MenuItem, UATracker, StrokesCodec};
