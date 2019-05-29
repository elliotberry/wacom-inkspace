const fs = require("fs");
const fsUtils = require("./FSUtils");

let GLCanvas = require("./GLCanvas");

var DBManagerLegacy = {
	entities: {
		SETTINGS: "settings",
		PROFILE: "profile",
		DEVICE: "device",
		NOTES: "notes"
	},

	get: function(entity) {
		return new Promise((resolve, reject) => {
			this.db.get(entity, (error, entry) => {
				if (error) {
					if (error.type == "NotFoundError")
						resolve();
					else
						reject(error);
				}
				else
					resolve(entry);
			});
		});
	},

	set: function(entity, value, callback) {
		this.db.put(entity, value, (error) => {
			if (error) console.error("put " + entity + ":", error.message);
			if (callback) callback(error);
		});
	},

	edit: function(entity, data, callback) {
		this.db.get(entity, (error, entry) => {
			if (error) {
				if (error.type == "NotFoundError")
					entry = {};
				else
					console.error("get " + entity + ":", error.message);
			}

			for (let name in data) {
				if (data[name] == "REMOVE")
					delete entry[name];
				else
					entry[name] = data[name];
			}

			this.db.put(entity, entry, (error) => {
				if (error) console.error("put " + entity + ":", error.message);
				if (callback) callback(error);
			})
		});
	},

	remove: function(entity, callback) {
		this.db.del(entity, (error) => {
			if (callback) callback(error);
		});
	},

	getNotePaths: function(id) {
		let notes = DBManagerLegacy.PATH + "/notes";
		let note = notes + "/" + id;
		let layers = note + "/layers";

		return {
			notes: notes,
			note: note,
			layers: layers
		};
	},

	getNoteLayers: function(id) {
		let layersPath = this.getNotePaths(id).layers;

		if (!fs.existsSync(layersPath))
			return [];

		let files = fs.readdirSync(layersPath);
		let layers = new Array(files.length);

		files.forEach((fileName) => {
			let index = parseInt(fileName.replace("layer", ""), 10);
			let bytes = fs.readFileSync(layersPath + "/" + fileName);

			layers[index] = GLCanvas.fromProtoBuf(bytes);
		});

		return layers;
	},

	deleteNote: function(id, callback) {
		this.db.get(DBManager.entities.NOTES, (error, notes) => {
			if (error)
				console.error(error);
			else {
				delete notes[id];

				this.db.put("notes", notes, (error) => {
					if (error)
						console.error(error);
					else {
						try {
							fsUtils.removeSync(this.getNotePaths(id).layers);
						}
						catch(e) {
							console.error(e);
						}

						if (callback)
							callback();
					}
				});
			}
		});
	},

	deleteNoteData: function(id) {
		fsUtils.removeSync(this.getNotePaths(id).note + "/thumb.png");
		fsUtils.removeSync(this.getNotePaths(id).note + "/preview.png");
	}
};

module.exports = DBManagerLegacy;
