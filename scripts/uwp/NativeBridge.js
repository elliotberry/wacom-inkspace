const StrokesCodec = require("./StrokesCodec");

function resolveJSValue(obj) {
	if (obj.value) {
		if (obj.type == "JSON")
			return JSON.parse(obj.value);
		else if (obj.type == "ARRAY")
			return Array.from(obj.value);
		else if (obj.type == "JSON_ARRAY")
			return Array.from(obj.value).map(value => JSON.parse(value));
		else if (obj.type == "BINARY")
			return Buffer.from(obj.value, "base64");
		else if (obj.type == "ERROR") {
			let error = new Error(obj.value.message);
			if (obj.value.type) error.type = obj.value.type;

			return error;
		}
		else
			return obj.value;
	}
	else
		return null;
}

let UIManager = {
	editWindow: function(props) {},
	setVisualZoomLevelLimits: function(min, max) {},
	maximize: function() {},
	reload: function() {},

	updateAppContext(context) {
		NativeUIManager.updateAppContext(context);
	},

	setCloudLocale(locale) {
		NativeUIManager.setLocale(locale);
	},

	quit: function() {},

	showSaveDialog: function(title, fileName, callback) {
		NativeUIManager.onsavedialogcomplete = (event) => callback(event.detail[0].filePath);
		NativeUIManager.showSaveDialog(fileName);
	},

	openExternal: function(url) {
		NativeUIManager.openExternal(url);
	}
};

let IOManager = {
	existsSync: function(filePath) {
		return NativeIOManager.existsSync(filePath);
	},

	writeFile: function(filePath, data, callback) {
		NativeIOManager.onwritefilecomplete = (event) => callback();
		NativeIOManager.onwritefileerror = (event) => callback(new Error(event.detail[0].error.message));
		NativeIOManager.onwritefileerror = (event) => callback(resolveJSValue({type: "ERROR", value: event.detail[0].error}));

		NativeIOManager.writeFile(filePath, data.toString("base64"));
	}
};

let PowerManager = {
	blockSleep: function() {
		NativePowerManager.blockSleep();
	},

	unblockSleep: function() {
		NativePowerManager.unblockSleep();
	},

	onSuspend: function(callback) {},

	onResume: function() {
		AuthenticationManager.refreshAccessToken();
	}
};

NativePowerManager.onawake = PowerManager.onResume;

let NativeLinker = {
	log: function(...args) {
		NativeNativeLinker.print(args.join(" "));
	},

	error: function(err) {
		NativeNativeLinker.error(err.message || err, err.stack);
	},

	linkBrowserWindow: function() {
		NativeNativeLinker.onwindowinteraction = (event) => {
			window.minimized = event.detail[0].minimize;
		};
	},

	// TODO: not implemented properly
	linkDataMigration: function(callback) {
		DBManager.edit(DBManager.entities.SETTINGS, {migrationCompleted: true});
	},

	linkStoreUpdate: function(callback) {
		NativeNativeLinker.onstoreupdate = (event) => {
			let args = event.detail[0];
			let body = resolveJSValue(args.body);

			if (args.action == "UPDATE_DOWNLOAD_PROGRESS")
				DeviceManager.downloading = body.total;

			callback({action: args.action, body: body});
		};
	},

	syncWithCloud: function(message) {
		if (message)
			NativeNativeLinker.syncWithCloud(message.accessToken);
		else
			NativeNativeLinker.syncWithCloud(null);
	},

	disconnectCloud: function(message) {
		NativeNativeLinker.disconnectCloud();
	},

	send: function(event) {},

	get: function(remoteGlobalName) {
		return resolveJSValue(NativeNativeLinker.get(remoteGlobalName));
	}
};

NativeNativeLinker.onlog = (event) => {
	let args = event.detail[0];

	if (args.type == "ERROR")
		console.error(args.message);
	else if (debug)
		console.info(args.message);
};

class Menu {
	constructor() {
		this.origin = NativeMenu.createContext();
	}

	append(menuItem) {
		this.origin.append(menuItem.origin);
	}

	popup() {
		NativeMenu.popup(this.origin);
	}

	static setApplicationMenu(menu) {}
}

class MenuItem {
	constructor(props) {
		this.id = props.id;

		this.origin = NativeMenuItem.createContext();
		this.origin.id = props.id;
		this.origin.label = props.label;
		this.origin.icon = props.icon;
		this.origin.type = props.type;
		this.origin.enabled = ("enabled" in props) ? props.enabled : true;

		this.origin.onclick = props.click;

		if (props.submenu) {
			let menu = new Menu();
			props.submenu.forEach(item => menu.append(new MenuItem(item)));
			this.origin.subMenu = menu.origin;
		}

		Object.defineProperty(this, "label", {value: this.origin.label});
		Object.defineProperty(this, "enabled", {get: () => this.origin.enabled, set: value => (this.origin.enabled = value)});
	}
}

class UATracker {
	constructor(trackingID, userID) {
		this.origin = NativeTracker.createTracker(trackingID, userID, navigator.userAgent);
	}

	set(key, value) {
		this.origin.set(key, value);
	}

	pageview(name) {
		return {send: function() {}};
	}

	screenview(screenName, productName) {
		this.origin.screenView(screenName, productName);
		return this;
	}

	event(category, action, label, value) {
		if (value == undefined)
			this.origin.customEvent(category, action, label);
		else
			this.origin.customEventWithValue(category, action, label, value);

		return this;
	}

	send() {
		this.origin.send();
	}

	static createInstance(trackingID, userID) {
		return new UATracker(trackingID, userID);
	}
}

global.UIManager = UIManager;
global.IOManager = IOManager;
global.PowerManager = PowerManager;
global.NativeLinker = NativeLinker;
global.Menu = Menu;
global.MenuItem = MenuItem;
// global.MainMenuManager = MainMenuManager;
global.UATracker = UATracker;

global.Buffer = Buffer;
global.StrokesCodec = StrokesCodec;

global.resolveJSValue = resolveJSValue;

// , MainMenuManager - moved in index-uwp.js
export {UIManager, IOManager, PowerManager, NativeLinker, Menu, MenuItem, UATracker, StrokesCodec};
