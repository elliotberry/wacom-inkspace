const ChildProcess = require("child_process")
const path = require("path")

const pkg = require("./package.json");
const project = require("./project.config.js");

const {app, autoUpdater, Menu, ipcMain} = require("electron");

require("./scripts/js.ext.js");

let AutoUpdater = {
	init() {
		if (process.mas) return

		autoUpdater.on("checking-for-update", () => this.updateState(AutoUpdater.State.CHECKING))
		autoUpdater.on("update-available", () => this.updateState(AutoUpdater.State.FOUND))
		autoUpdater.on("update-downloaded", () => this.updateState(AutoUpdater.State.INSTALLED))
		autoUpdater.on("update-not-available", () => this.updateState(AutoUpdater.State.NOT_FOUND))
		autoUpdater.on("error", err => this.updateState(AutoUpdater.State.NOT_FOUND, err));

		autoUpdater.setFeedURL(this.getFeedURL())
		autoUpdater.checkForUpdates()
	},

	getFeedURL() {
		let url = project.update.url;

		if (process.platform == "win32" && process.arch == "x64")
			url += "win64";
		else
			url += process.platform;

		url += "/" + pkg.version;

		if (process.platform == "win32")
			url += "/RELEASES";

		return url;
	},

	updateState(state, error) {
		console.info("[AUTO_UPDATER] update", state.name)
		if (error) console.info("[AUTO_UPDATER]", error)

		this.state = state;

		if (state == AutoUpdater.State.FOUND || state == AutoUpdater.State.NOT_FOUND) {
			global.updateFound = (state == AutoUpdater.State.FOUND);
			this.onCheckComplete();
		}
		else if (state == AutoUpdater.State.INSTALLED)
			global.updateInstalled = true;

		this.updateMenu();
	},

	checkForUpdates() {
		autoUpdater.checkForUpdates()
	},

	onCheckComplete() {},

	updateMenu() {
		if (process.mas) return

		var menu = Menu.getApplicationMenu()
		if (!menu) return

		menu.items.forEach(function (item) {
			if (item.submenu) {
				item.submenu.items.forEach(function (item) {
					switch (item.key) {
						case "checkForUpdate":
							item.visible = this.state === AutoUpdater.State.NOT_FOUND
							break
						case "checkingForUpdate":
							item.visible = this.state == AutoUpdater.State.CHECKING || this.state == AutoUpdater.State.FOUND
							item.enabled = false;
							break
						case "restartToUpdate":
							item.visible = this.state === AutoUpdater.State.INSTALLED
							break
					}
				})
			}
		})

		Menu.setApplicationMenu(menu)
	},

	createShortcut(callback) {
		this.spawnUpdate([
			"--createShortcut", path.basename(process.execPath),
			"--shortcut-locations", "Desktop,StartMenu"
		], callback)
	},

	removeShortcut(callback) {
		this.spawnUpdate([
			"--removeShortcut", path.basename(process.execPath),
		], callback)
	},

	spawnUpdate(args, callback) {
		let updateExe = path.resolve(path.dirname(process.execPath), "..", "Update.exe")
		let stdout = ""
		let spawned = null

		try {
			spawned = ChildProcess.spawn(updateExe, args, {detached: true})
		}
		catch (error) {
			if (error && error.stdout == null) error.stdout = stdout
			process.nextTick(() => callback(error))
			return
		}

		let error = null

		spawned.stdout.on("data", data => (stdout += data))

		spawned.on("error", processError => {
			if (!error) error = processError
		})

		spawned.on("close", function (code, signal) {
			if (!error && code !== 0) error = new Error("Command failed: " + code + " " + signal)
			if (error && error.code == null) error.code = code
			if (error && error.stdout == null) error.stdout = stdout
			callback(error)
		})
	}
}

Function.prototype.createEnum.call(AutoUpdater, "State", ["CHECKING", "FOUND", "NOT_FOUND", "INSTALLED"]);

ipcMain.on("auto-updater-update-menu", AutoUpdater.updateMenu)
ipcMain.on("auto-updater-check-for-update", () => autoUpdater.checkForUpdates())
ipcMain.on("auto-updater-restart-to-update", () => autoUpdater.quitAndInstall())

module.exports = AutoUpdater
