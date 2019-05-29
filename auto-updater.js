const ChildProcess = require("child_process")
const path = require("path")

const pkg = require("./package.json");
const project = require("./project.config.js");

const {app, autoUpdater, Menu, ipcMain} = require("electron");

var state = "checking"

exports.initialize = function() {
	if (process.mas) return

	autoUpdater.on("checking-for-update", () => {
		console.info("[AUTO_UPDATER] checking-for-update");

		state = "checking"
		exports.updateMenu()
	})

	autoUpdater.on("update-available", () => {
		console.info("[AUTO_UPDATER] update-available");

		state = "checking"
		exports.updateMenu()
	})

	autoUpdater.on("update-downloaded", () => {
		console.info("[AUTO_UPDATER] update-downloaded");

		state = "installed"
		exports.updateMenu()
	})

	autoUpdater.on("update-not-available", () => {
		console.info("[AUTO_UPDATER] update-not-available");

		state = "no-update"
		exports.updateMenu()
	})

	autoUpdater.on("error", (err) => {
		console.info("[AUTO_UPDATER]", err);

		state = "no-update"
		exports.updateMenu()
	});

	autoUpdater.setFeedURL(exports.getFeedURL())
	autoUpdater.checkForUpdates()
}

exports.getFeedURL = function() {
	let url = project.update.url;

	if (process.platform == "win32" && process.arch == "x64")
		url += "win64";
	else
		url += process.platform;

	url += "/" + pkg.version;

	if (process.platform == "win32")
		url += "/RELEASES";

	return url;
}

exports.updateMenu = function() {
	if (process.mas) return

	var menu = Menu.getApplicationMenu()
	if (!menu) return

	menu.items.forEach(function (item) {
		if (item.submenu) {
			item.submenu.items.forEach(function (item) {
				switch (item.key) {
					case "checkForUpdate":
						item.visible = state === "no-update"
						break
					case "checkingForUpdate":
						item.visible = state === "checking"
						item.enabled = false;
						break
					case "restartToUpdate":
						item.visible = state === "installed"
						break
				}
			})
		}
	})

	Menu.setApplicationMenu(menu)
}

ipcMain.on("auto-updater-update-menu", exports.updateMenu)
ipcMain.on("auto-updater-check-for-update", () => autoUpdater.checkForUpdates())
ipcMain.on("auto-updater-restart-to-update", () => autoUpdater.quitAndInstall())

exports.createShortcut = function (callback) {
	spawnUpdate([
		"--createShortcut", path.basename(process.execPath),
		"--shortcut-locations", "Desktop,StartMenu"
	], callback)
}

exports.removeShortcut = function (callback) {
	spawnUpdate([
		"--removeShortcut", path.basename(process.execPath),
	], callback)
}

function spawnUpdate(args, callback) {
	var updateExe = path.resolve(path.dirname(process.execPath), "..", "Update.exe")
	var stdout = ""
	var spawned = null

	try {
		spawned = ChildProcess.spawn(updateExe, args, {detached: true})
	}
	catch (error) {
		if (error && error.stdout == null) error.stdout = stdout
		process.nextTick(() => callback(error))
		return
	}

	var error = null

	spawned.stdout.on("data", function (data) { stdout += data })

	spawned.on("error", function (processError) {
		if (!error) error = processError
	})

	spawned.on("close", function (code, signal) {
		if (!error && code !== 0) error = new Error("Command failed: " + code + " " + signal)
		if (error && error.code == null) error.code = code
		if (error && error.stdout == null) error.stdout = stdout
		callback(error)
	})
}
