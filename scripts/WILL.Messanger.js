const uuid = require("uuid");

function getWorker() {
	let worker = new Worker(NativeLinker.get("ROOT") + "/scripts/workers/WILLWorker.js");

	worker.addEventListener("message", function(e) {
		messanger[e.data.action](e.data);
	}, false);

	worker.addEventListener("error", function(e) {
		console.log(["ERROR: Line ", e.lineno, " in ", e.filename, ": ", e.message].join(""));
	}, false);

	return worker;
}

let worker = getWorker();

let messanger = {
	index: {},
	affectedLayers: [],

	init: function() {
		worker.postMessage({action: "init", callback: "load", root: NativeLinker.get("ROOT"), debug: global.debug});
	},

	load: function() {
		console.info("[WORKER_WILL] ready");
	},

	sendStrokePath: function(stroke, layerIndex, strokeIndex) {
		let id = uuid();

		this.index[id] = {stroke: stroke, layerIndex: layerIndex, strokeIndex: strokeIndex};
		worker.postMessage({action: "buildBezierPath", callback: "recieveBezierPath", strokeID: id, strokeData: stroke.data}, [stroke.data.path.points.buffer]);
	},

	recieveBezierPath: function(data) {
		let index = this.index[data.strokeID];
		let stroke = index.stroke;

		stroke.path.points = data.points;
		stroke.bezierPath = new Module.BezierPath(data.segments, data.color);

		if (!this.affectedLayers.includes(this.index[data.strokeID].layerIndex)) this.affectedLayers.push(this.index[data.strokeID].layerIndex);
		delete this.index[data.strokeID];

		WILL.updateBezierProgress(stroke, index.layerIndex, index.strokeIndex);

		if (Object.keys(this.index).length == 0) {
			WILL.refreshLayers(this.affectedLayers);
			this.affectedLayers = [];
		}
	}
};

module.exports = messanger;
