require("./ink-engine/");

const A4 = {width: 864, height: 1188};
const A5 = {width: 592, height: 864};

class DeviceInputTransformer {
	constructor(size) {
		if (size)
			this.init(size);
		else {
			this.size = {width: undefined, height: undefined};
			this.transform = Module.MatTools.create();
		}
	}

	init(size) {
		let page;

		if (Math.abs(size.width - A5.height) < Math.abs(size.width - A4.height))
			page = A5;
		else
			page = A4;

		// center content on page
		let deltaTranslate;
		let scaleFactor;

		let sw = page.width / size.height;
		let sh = page.height / size.width;

		if (sw < sh) {
			let delta = page.height - sw * size.width;

			deltaTranslate = Module.MatTools.makeTranslate(0, delta / 2);
			scaleFactor = sw;
		}
		else {
			let delta = page.width - sh * size.height;

			deltaTranslate = Module.MatTools.makeTranslate(delta / 2, 0);
			scaleFactor = sh;
		}

		var translate = Module.MatTools.makeTranslate(size.height, 0);
		var rotate = Module.MatTools.makeRotate(Math.toRadians(90));

		this.transform = Module.MatTools.multiply(translate, rotate);
		this.transform = Module.MatTools.multiply(Module.MatTools.makeScale(scaleFactor), this.transform);
		this.transform = Module.MatTools.multiply(deltaTranslate, this.transform);

		this.size = page;
	}

	transformPoint(point) {
		let result = Module.MatTools.transformPoint(point, this.transform);
		result.pressure = point.pressure;
		return result;
	}

	transformPath(path) {
		return Module.MatTools.transformPath(path, this.transform);
	}
}

module.exports = DeviceInputTransformer;
