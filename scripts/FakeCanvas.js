require("./ink-engine/");

class FakeCanvas {
	constructor(width, height) {
		this.width = width;
		this.height = height;
	}

	getContext(type) {
		return this;
	}

	getImageData(x, y, width, height) {
		let rect = Module.RectTools.create(x, y, width, height);

		return {
			width: width,
			height: height,
			data: this.layer.readPixels(rect)
		};
	}
}

module.exports = FakeCanvas;
