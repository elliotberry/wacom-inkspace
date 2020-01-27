const {app, ipcMain} = require("electron");

const DBBridge = require("./DBBridge");
const ThreadBridge = require("./ThreadBridge");

const {main : consoleBridge} = require("./ConsoleBridge");

class DBBridgeMain extends DBBridge {
	constructor() {
		super(app.getPath("userData") + "/db");

		if (process.platform == "win32")
			this.root = this.root.replace(/\\/g, "/");

		ipcMain.on("db-manager", this.redirect.bind(this));
		ipcMain.on("cloud-sync", this.syncWithCloud.bind(this));
		ipcMain.on("cloud-disconnect", this.disconnectCloud.bind(this));
		ipcMain.on("store-update", this.connectWithStore.bind(this));
		ipcMain.on("data-migration", this.processDataMigration.bind(this));

		consoleBridge.init();

		this.dbWorker = new ThreadBridge(global.ROOT + "/scripts/workers/DBWorker.js");
		this.dbWorker.init({app: global.ROOT, root: this.root}, consoleBridge);

		process.on("exit", () => this.dbWorker.kill());
	}

	openDB() {
		return this.sendPromise("openDB", []);
	}

	connectWithStore(event) {
		this.storeComm = event.sender;

		this.dbWorker.send("CONNECT_WITH_STORE", null, message => this.storeComm.send("store-update", message.response));
	}

	syncWithCloud(event, message) {
		global.mainWindow.webContents.session.resolveProxy("https://wacom.com", proxy => {
			let proxyAddress = proxy.split(";")[0].replace("DIRECT", "").replace("PROXY", "").trim();
			this.sendCallback("syncWithCloud", [message.accessToken, proxyAddress]);
		});
	}

	disconnectCloud(event) {
		this.sendCallback("disconnectCloud", []);
	}

	connectDataMigration() {
		return this.sendPromise("initDataMigration", []);
	}

	processDataMigration(event, message) {
		let sender = event.sender;
		this.sendPromise("processDataMigration", []).then(() => sender.send("data-migration"));
	}

	redirect(event, message) {
		this.linker[message.id] = {
			resolve: (message) => {
// console.info("[_WORKER_DB_] redirect callback " + message.action + " // " + message.id)
				event.sender.send("db-manager", message);
			}
		};
// console.info("[WORKER_DB_] redirect " + message.action + " // " + message.id)
		message.redirect = true;

		this.send(message);
	}

	send(message) {
		let linker = this.linker[message.id];
		this.dbWorker.forward(message, linker.resolve, linker.reject);
		delete this.linker[message.id];
	}

	recieve(message) {
		// ThreadBridge.recieve handles recieve
	}
}

module.exports = DBBridgeMain;
