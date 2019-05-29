const {remote, ipcRenderer} = require("electron");

const {Note, Layer, Entity} = require("./Note");

const DBBridge = require("./DBBridge");
const ThreadBridge = require("./ThreadBridge");

const {render : consoleBridge} = require("./ConsoleBridge");

const project = require("../project.config.js");

class DBBridgeRender extends DBBridge {
	constructor() {
		super(remote.app.getPath("userData") + "/db");

		if (process.platform == "win32")
			this.root = this.root.replace(/\\/g, "/");

		ipcRenderer.on("db-manager", (event, message) => this.recieve(message));

		consoleBridge.init(remote.app.getPath("userData"), project.loggerType);

		this.glWorker = new ThreadBridge(remote.getGlobal("ROOT") + "/scripts/workers/GLWorker.js");
		this.glWorker.init({root: this.root}, consoleBridge);

		// process.on("disconnect", () => this.glWorker.kill());
	}

	getEntity(type) {
		return super.getEntity(type).then(data => Entity.fromJSON(data));
	}

	getNotes(ids) {
		return super.getNotes(ids).then(notesData => {
			let notes = {};
			let notesToFix = [];

			notesData.forEach(data => {
				let note = Note.fromJSON(undefined, data);

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

				if (note.locale == "nb_NO") {
					note.locale = "no_NO";
					note.touch();

					if (!notesToFix.includes(note))
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
				this.editPages(notesToFix).then(() => console.log(`${notesToFix.length} notes fixed`));

			return notes;
		});
	}

	getPageLayers(pageID) {
		return super.getPageLayers(pageID).then(layersData => {
			return layersData.map(layerData => {
				return Layer.fromJSON(WILL.tools.pen.brush, layerData);
			});
		});
	}

	deleteNotes(ids) {
		return super.deleteNotes(ids).then(() => ContentManager.cleanEntityRelations());
	}

	exportNote(id, format) {
		// if (debug) console.log("[DB] exportNote", id, format);

		return new Promise((resolve, reject) => {
			this.getNote(id).then(noteData => {
				this.glWorker.send("EXPORT_NOTE", {input: {note: noteData, format: format}}, resolve, reject);
			}).catch(console.error);
		});
	}

	exportLayerPreview(note) {
		// if (debug) console.log("[DB] exportLayerPreview", Object.assign(note, {layers: note.layers.length}));

		return (new Promise((resolve, reject) => {
			this.glWorker.send("EXPORT_LAYER_PREVIEW", {input: {note: note.toJSON()}}, resolve, reject);
		})).then(data => Buffer.from(data).toString("base64"));
	}

	send(message) {
		ipcRenderer.send("db-manager", message);
	}

	recieve(message) {
		let linker = this.linker[message.id];
// console.info("[DB] recieve", message.action + " // " + message.id)
		if (!linker)
			console.warn("Linker missing for message: " + JSON.stringify(message));
		else {
			if (message.error)
				linker.reject(message.error);
			else
				linker.resolve(...message.output);
				// linker.resolve.apply({}, message.output);

			delete this.linker[message.id];
		}
	}
}

module.exports = DBBridgeRender;
