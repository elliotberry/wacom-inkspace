const fs = require("fs");

const {Note} = require("./Note");
const GLCanvas = require("./GLCanvas");
const DrawingToolsBox = require("./DrawingToolsBox");

const DBManager = require("./DBManager");

class NoteExporter {
	constructor(root) {
		this.root = root;

		this.getNotePaths = DBManager.prototype.getNotePaths;
	}

	exportNotes(notes, options) {
		let result = {};

		notes.forEach(noteData => {
			let note = Note.fromJSON(DrawingToolsBox.pen.brush, noteData);

			let data = GLCanvas.export(note, options || {});
			let paths = this.getNotePaths(note.id);

			if (!fs.existsSync(paths.notes)) fs.mkdirSync(paths.notes);
			if (!fs.existsSync(paths.note)) fs.mkdirSync(paths.note);

			let previousFiles = fs.readdirSync(paths.note).filter(name => name.endsWith(".png"));

			let newFiles = [
				"preview_" + note.lastModifiedDate + ".png",
				"thumb_" + note.lastModifiedDate + ".png"
			];

			fs.writeFileSync(paths.note + "/" + newFiles[0], data.preview);
			fs.writeFileSync(paths.note + "/" + newFiles[1], data.thumb);

			setTimeout(() => {
				previousFiles.filter(fileName => !newFiles.includes(fileName)).forEach(fileName => {
					fs.unlink(paths.note + "/" + fileName, (error) => {});
				});
			}, 1000);

			result[note.id] = note.layers.map(layer => layer.toJSON());
		});

		return result;
	}

	exportNote(noteData, format) {
		let note = Note.fromJSON(DrawingToolsBox.pen.brush, noteData);
		return GLCanvas.export(note, {format: format});
	}

	exportLayerPreview(noteData) {
		let note = Note.fromJSON(DrawingToolsBox.pen.brush, noteData);
		return GLCanvas.export(note, {format: "LAYER"});
	}
}

module.exports = NoteExporter;
