const fs = require("fs");
const path = require("path");
const glob = require("glob");

const DeviceInputTransformer = require("./DeviceInputTransformer");
const DeviceModel = require("./DeviceModel");

const DBManagerLegacy = require("./DBManagerLegacy");

const {Note, Layer} = require("./Note");

const pkg = require("../package.json");
const pkgVersion = pkg.version.split("-")[0];

// let ts = 0;
let DBManager;

let DataMigration = {
	init: function(settings, dbManager) {
		DBManager = dbManager;
		DBManager.entities = dbManager.constructor.entities;

		DBManagerLegacy.PATH = DBManager.root;
		DBManagerLegacy.db = DBManager.db;

		this.lastMigrationVersion = settings.migrationCompleted;

		if (settings.version != pkgVersion) {
			this.update = true;
			DBManager.edit(DBManager.entities.SETTINGS, {version: pkgVersion, update: settings.version});
		}
		else
			this.update = !!settings.update;
	},

	proceed: function() {
		// ts = Date.now();

		return new Promise((resolve, reject) => {
			// this.callback = resolve;
			// this.proceedLegacyNotes();

			resolve();
		});
	},

	getPreviousVersion(settings, update) {
		let previousVersion;

		if (settings.version != pkgVersion)
			previousVersion = settings.version;
		else if (update && settings.update)
			previousVersion = settings.update;
		else
			previousVersion = pkgVersion;

		return this.parseVersion(previousVersion);
	},

	parseVersion: function(version) {
		if (!version) return 0;
		return parseInt(version.replace(/\./g, ""));
	},
/*
	// 2.0.0
	proceedLegacyNotes: function() {
		DBManagerLegacy.get(DBManagerLegacy.entities.PROFILE).then(profile => {
			this.profile = profile || {};
			if (!this.profile.locale) this.profile.locale = "en-US";

			if (this.profile.fte) {
				let settings = {fte: true, tutorial: true, locale: this.profile.locale};

				if (profile.app) {
					settings.library = profile.app.library;
					settings.window = profile.app.window;
				}

				DBManagerLegacy.get(DBManagerLegacy.entities.DEVICE).then(device => {
					if (device) {
						let orientation = (device.orientation + 3) % 4;
						DBManagerLegacy.edit(DBManagerLegacy.entities.DEVICE, {orientation});
					}
				});

				return DBManager.set(DBManager.entities.SETTINGS, settings)
					.then(() => DBManager.remove(DBManagerLegacy.entities.PROFILE))
					.then(() => DBManagerLegacy.get(DBManagerLegacy.entities.NOTES));
			}
			else
				return DBManagerLegacy.get(DBManagerLegacy.entities.NOTES);
		}).then(notes => {
			this.notes = notes || {};
			this.keys = Object.keys(this.notes);

			this.next();
		}).catch(console.error);
	},

	next: function() {
		let id = this.keys.shift();

		if (id)
			this.proceedNote(id);
		else {
			DBManager.remove(DBManager.entities.NOTES).then(() => {
				if (debug) console.log("[DATA_MIGRATION] completed(" + Object.keys(this.notes).length + "):", Date.now() - ts);
				DBManager.edit(DBManager.entities.SETTINGS, {migrationCompleted: pkgVersion});
				this.callback();
			});
		}
	},

	proceedNote: function(id) {
		let dbNote = this.notes[id];
		let orientation = (dbNote.orientation + 3) % 4;
		let layers = DBManagerLegacy.getNoteLayers(id);

		if (layers.length > 0) {
			let dit = new DeviceInputTransformer(dbNote.size);
			let dm = new DeviceModel(dit.size, orientation);

			if (debug)
				console.log("[DATA_MIGRATION] " + id + " :: " + dbNote.orientation + " -> "  + orientation + " :: " + dm.getMatrixCloudAttr() + " :: " + dm.getBoundingBoxCloudAttr())

			layers.forEach(layer => {
				layer.forEach(stroke => {
					stroke.transform(dit.transform);
				});
			});

			let note = new Note({
				id: id,
				creationDate: dbNote.date,
				size: dm.size,
				transform: dm.transform,
				locale: this.profile.locale,
				layers: layers.map(strokes => new Layer({lastModifiedDate: dbNote.date, strokes: strokes}))
			});

			try {
				DBManagerLegacy.deleteNoteData(id);
			}
			catch(e) {
				console.error(e);
			}

			if (debug) console.log(`[DATA_MIGRATION] exporting ${id} started`);

			DBManager.editNote(note.toJSON(), () => {
				DBManagerLegacy.deleteNote(id, () => this.next());
				if (debug) console.log(`[DATA_MIGRATION] exporting ${id} completed`);
			});
		}
		else
			DBManagerLegacy.deleteNote(id, () => this.next());
	},
*/
	// 2.0.1
	renameNotesCache: function() {
		return new Promise((resolve, reject) => {
			let checkVersion = this.parseVersion(this.lastMigrationVersion);
			let valid = checkVersion >= 200 && checkVersion <= 201;

			if (!valid) {
				resolve();
				return;
			}

			let images = glob.sync(DBManager.root + "/notes/**/*.png").filter(imgPath => ["preview", "thumb"].includes(imgPath.split(/\\|\//g).last.split(".")[0]));

			if (images.length > 0) {
				DBManager.getNotes().then(notesData => {
					let notes = {};

					notesData.forEach(note => notes[note.id] = note);

					images.forEach(imgPath => {
						let arr = imgPath.split(/\\|\//g);
						let id = arr[arr.length-2];
						let name = arr[arr.length-1].split(".")[0];
						let noteData = notes[id];

						if (noteData) {
							arr[arr.length-1] = name + "_" + noteData.lastModifiedDate + ".png";

							try {
								fs.renameSync(imgPath, arr.join(path.sep));
							}
							catch(e) {
								console.error(e);
							}
						}
						else
							console.warn(`Note data not found for ${id}`)
					});

					DBManager.edit(DBManager.entities.SETTINGS, {migrationCompleted: pkgVersion}).then(resolve);
				});
			}
			else
				DBManager.edit(DBManager.entities.SETTINGS, {migrationCompleted: pkgVersion}).then(resolve);
		});
	}
};

module.exports = DataMigration;
