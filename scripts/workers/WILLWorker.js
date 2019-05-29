self.addEventListener("message", function(e) {
	// console.log(JSON.stringify(e.data));

	var result = messanger[e.data.action](e.data);
	result.action = e.data.callback;

	var transferrable = result.transferrable || [];
	delete result.transferrable;

	self.postMessage(result, transferrable);
}, false);

var messanger = {
	init: function(input) {
		// global.debug = input.debug;

		self.importScripts(input.root + "/scripts/js.ext.js");
		self.importScripts(input.root + "/scripts/ink-engine/Module.js");

		Module.memoryInitializerPrefixURL = input.root + "/scripts/ink-engine/";

		self.importScripts(input.root + "/scripts/ink-engine/WacomInkEngine.js");

		return {};
	},

	buildBezierPath: function(data) {
		var points = data.strokeData.path.points;

		var path = new Module.BezierPath();
		path.setStroke(data.strokeData);

		var transferrable = [points.buffer];
		var segments = path.data;
		var color = path.color;

		segments.forEach(function(segment) {
			transferrable.push(segment.buffer);
		});

		return {
			strokeID: data.strokeID,
			points: points,
			segments: segments,
			color: color,
			transferrable: transferrable
		};
	}
};
