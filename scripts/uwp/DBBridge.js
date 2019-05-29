const {Note, Layer, Entity} = require("../Note");

let DEFAULT_BRUSH;

class DBBridge {
	constructor() {
		DEFAULT_BRUSH = WILL.tools.pen.brush;

		this.entities = {
			SETTINGS: "settings",
			PROFILE: "profile",
			DEVICE: "device",
			NOTES: "notes",
			QUEUE: "queue"
		};
	}

	closeDB() {
		return this.sendPromise("closeDB", []);
	}

	get(entity) {
		return this.sendPromise("get", [entity]);
	}

	set(entity, value) {
		return this.sendPromise("set", [entity, value]);
	}

	edit(entity, data) {
		return this.sendPromise("edit", [entity, data]);
	}

	remove(entity) {
		return this.sendPromise("remove", [entity]);
	}

	getNotes(ids) {
		return this.sendPromise("getNotes", [ids, true]).then(jsonNotes => {
			let notes = {};
			let notesToFix = [];

			jsonNotes.forEach(jsonNote => {
				let note = Note.fromJSON(DEFAULT_BRUSH, jsonNote);

				if (!note.locale) {
					note.locale = LocalesManager.defaultNoteLocale;
					note.touch();

					notesToFix.push(note);
				}
				else if (!note.locale.contains("_")) {
					note.locale = note.locale.replace("-", "_");

					if (!note.locale.contains("_"))
						note.locale = LocalesManager.defaultNoteLocale;

					note.touch();

					notesToFix.push(note);
				}

				if (!note.stream) {
					note.stream = "mate";
					note.touch();

					if (!notesToFix.includes(note))
						notesToFix.push(note);
				}

				if (note.hasPreview())
					notes[note.id] = note;
			});

			if (notesToFix.length)
				this.editNotes(notesToFix).then(() => console.log(`${notesToFix.length} notes fixed`));

			return notes;
		});
	}

	getNote(id) {
		return this.sendPromise("getNote", [id]);
	}

	editNote(note, options, callback) {
		if (!note.id) throw new Error("Note identifier is required");

		if (!callback && options) {
			if (typeof options == "function") {
				callback = options;
				options = undefined;
			}
		}

		this.sendCallback("editNote", [note.toJSON(), options], callback);
	}

	editNotes(notes, options) {
		return this.sendPromise("editNotes", [notes.map(note => note.toJSON()), options]);
	}

	editPages(notes) {
		return this.sendPromise("editPages", [notes.map(note => note.toJSON(null, true))]);
	}

	getNotePaths(id) {
		let notes = "/notes";
		let note = notes + "/" + id;

		return {notes, note};
	}

	getPageLayers(pageID) {
		return this.sendPromise("getPageLayers", [pageID]).then(layersData => {
			return layersData.map(layerData => {
				return Layer.fromJSON(DEFAULT_BRUSH, layerData);
			});
		});
	}

	deleteNote(id, callback) {
		this.sendCallback("deleteNote", [id], callback);
	}

	deleteNotes(ids) {
		return this.sendPromise("deleteNotes", [ids]).then(() => ContentManager.cleanEntityRelations());
	}

	getTags() {
		return this.sendPromise("getTags", []);
	}

	setTags(tags) {
		return this.sendPromise("setTags", [tags]);
	}

	setEntity(entity) {
		return this.sendPromise("setEntity", [entity.toJSON()]);
	}

	getEntity(type) {
		return this.sendPromise("getEntity", [type]).then(jsonEntity => Entity.fromJSON(jsonEntity));
	}

	exportNote(id, format) {
		return this.sendPromise("exportNote", [id, format]);
	}

	exportLayerPreview(note) {
		return this.sendPromise("exportLayerPreview", [note.toJSON()]);
	}

	sendPromise(action, args) {
		return new Promise((resolve, reject) => {
			this.send({action: action, input: args}, resolve, reject);
		});
	}

	sendCallback(action, args, callback) {
		let resolve = callback || (() => {});
		let reject = console.error;

		this.send({action: action, input: args}, resolve, reject);
	}

	send(message, resolve, reject) {
		let context = NativeDBManager.createContext();
		context.message = JSON.stringify(message);

		context.oncomplete = (event) => {
			resolve(...Array.from(event.detail[0].output).map(resolveJSValue));
		};

		context.onerror = (event) => {
			reject(new Error(event.detail[0].error.message))
		};

		NativeDBManager.send(context);
	}
}

module.exports = DBBridge;
