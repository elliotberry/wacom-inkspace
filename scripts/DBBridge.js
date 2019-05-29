const uuid = require("uuid");

const DBManager = require("./DBManager");

class DBBridge {
	constructor(root) {
		this.root = root;

		this.linker = {};

		this.getNotePaths = DBManager.prototype.getNotePaths;
		Object.defineProperty(this, "entities", {value: DBManager.entities});
	}

	closeDB() {
		return this.sendPromise("closeDB", []);
	}

	get(entity) {
		return this.sendPromise("get", [entity]);
	}

	set(entity, value) {
		// if (debug) console.log("[DB] set", entity, value);
		return this.sendPromise("set", [entity, value]);
	}

	edit(entity, data) {
		// if (debug) console.log("[DB] edit", entity, data);
		return this.sendPromise("edit", [entity, data]);
	}

	remove(entity) {
		// if (debug) console.log("[DB] remove", entity);
		return this.sendPromise("remove", [entity]);
	}

	getNotes(ids) {
		return this.sendPromise("getNotes", [ids, true]);
	}

	getNote(id) {
		return this.sendPromise("getNote", [id]);
	}

	editNote(note, options, callback) {
		if (!note.id) throw new Error("Note identifier is required");
		// if (debug) console.log("[DB] editNote", note.id);

		if (!callback && options) {
			if (typeof options == "function") {
				callback = options;
				options = undefined;
			}
		}

		this.sendCallback("editNote", [note.toJSON(), options], callback);
	}

	editNotes(notes, options) {
		// if (debug) console.log("[DB] editNotes", notes.map(note => note.id));
		return this.sendPromise("editNotes", [notes.map(note => note.toJSON()), options]);
	}

	editPages(notes) {
		return this.sendPromise("editPages", [notes.map(note => note.toJSON(null, true))]);
	}

	getPageLayers(pageID) {
		return this.sendPromise("getPageLayers", [pageID, true]);
	}

	deleteNote(id, callback) {
		// if (debug) console.log("[DB] deleteNote", id);
		this.sendCallback("deleteNote", [id], callback);
	}

	deleteNotes(ids) {
		// if (debug) console.log("[DB] deleteNotes", ids);
		return this.sendPromise("deleteNotes", [ids]);
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
		return this.sendPromise("getEntity", [type]);
	}

	sendPromise(action, args) {
		return new Promise((resolve, reject) => {
			let id = uuid();

			this.linker[id] = {
				resolve: resolve,
				reject: reject
			};

			this.send({id: id, type: "PROMISE", action: action, input: args});
		});
	}

	sendCallback(action, args, callback) {
		let id = uuid();

		this.linker[id] = {
			resolve: callback || (() => {}),
			reject: console.error
		};

		this.send({id: id, type: "CALLBACK", action: action, input: args});
	}

	send(message) {
		throw new Error("not implemented");
	}

	recieve(message) {
		throw new Error("not implemented");
	}
}

module.exports = DBBridge;
