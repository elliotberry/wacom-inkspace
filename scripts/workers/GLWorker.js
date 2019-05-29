const {common : consoleBridge} = require("../ConsoleBridge");

global.StrokesCodec = require("../StrokesCodec");

global.THREAD = "GL";

let exporter;

function resolve(done, response, output) {
	response.output = output;
	done(response);
}

function reject(done, response, error) {
	response.error = error.message;
	done(response);
}

consoleBridge.init();

module.exports = function(request, done) {
	let message = request.action + " ";

	if (request.action == "EXPORT_NOTES")
		message += request.input.notes.map(note => note.id).join(", ");
	else if (request.action != "INIT")
		message += request.input.note.id;

	message += " // " + request.id;

	console.log("[WORKER_GL] process", message);

	let input = request.input;
	delete request.input;

	let response = Object.assign({}, request);

	if (request.action == "INIT") {
		global.debug = input.debug;

		consoleBridge.connect(input.consoleBridgeID, done);

		exporter = new (require("../NoteExporter"))(input.root);
		resolve(done, request);
	}
	else if (request.action == "EXPORT_NOTES") {
		let notesLayers = exporter.exportNotes(input.notes, input.options);
		resolve(done, response, notesLayers);
	}
	else if (request.action == "EXPORT_NOTE") {
		let buffer = exporter.exportNote(input.note, input.format);
		resolve(done, response, buffer);
	}
	else if (request.action == "EXPORT_LAYER_PREVIEW") {
		let buffer = exporter.exportLayerPreview(input.note);
		resolve(done, response, buffer);
	}
	else
		reject({error: "Unknown request found: " + request.action});
};
