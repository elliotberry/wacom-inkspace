require("./ink-engine/");

class DeviceModel {
	/**
	 * @param {Module.Size} size
	 * 	CL IntuosPro L: {width: 1411, height: 980} -> {width: 864, height: 1188}
	 * 	CL IntuosPro M: {width: 1016, height: 672} -> {width: 592, height: 864}
	 * @param {int} orientation possible values: 0L, 1T, 2R, 3B
	 * @param {int} orientation possible values: 0T, 1R, 2B, 3L
	 */
	constructor(size, orientation) {
		this.size = size;
		this.orientation = orientation || 0;

		switch (this.orientation) {
			// Button Top
			case 0:
				this.transform = Module.MatTools.create({a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0});
				break;

			// Button Right
			case 1:
				this.transform = Module.MatTools.create({a: 0, b: 1, c: -1, d: 0, tx: size.height, ty: 0});
				break;

			// Button Bottom
			case 2:
				this.transform = Module.MatTools.create({a: -1, b: 0, c: 0, d: -1, tx: size.width, ty: size.height});
				break;

			// Button Left
			case 3:
				this.transform = Module.MatTools.create({a: 0, b: -1, c: 1, d: 0, tx: 0, ty: size.width});
				break;
		}
	}

	getSurfaceSize(scaleFactor) {
		if (!scaleFactor) scaleFactor = 1;

		let width = (this.orientation % 2 == 0)?this.size.width:this.size.height;
		let height = (this.orientation % 2 == 0)?this.size.height:this.size.width;

		return {width: Math.ceil(width * scaleFactor), height: Math.ceil(height * scaleFactor)}
	}

	getSurfaceTransform(scaleFactor) {
		if (!scaleFactor) return this.transform;
		return Module.MatTools.multiply(Module.MatTools.makeScale(scaleFactor), this.transform);
	}

	isLandscape() {
		return DeviceModel.isLandscape(this.orientation);
	}

	getMatrixCloudAttr() {
		return DeviceModel.getMatrixCloudAttr(this.transform);
	}

	getBoundingBoxCloudAttr() {
		return DeviceModel.getBoundingBoxCloudAttr(this.orientation, this.size);
	}

	static isLandscape(orientation) {
		return orientation == 1 || orientation == 3;
	}

	static getOrientation(transform) {
		if (transform.tx == 0 && transform.ty == 0)
			return 0;
		else if (transform.tx != 0 && transform.ty == 0)
			return 1;
		else if (transform.tx != 0 && transform.ty != 0)
			return 2;
		else // transform.tx == 0 && transform.ty != 0
			return 3;
	}

	static getMatrixCloudAttr(transform) {
		return `matrix(${transform.a.toFixed(1)} ${transform.b.toFixed(1)} ${transform.c.toFixed(1)} ${transform.d.toFixed(1)} ${transform.tx.toFixed(1)} ${transform.ty.toFixed(1)})`;
	}

	static getBoundingBoxCloudAttr(orientation, size) {
		if (DeviceModel.isLandscape(orientation))
			return `rect(0.0 0.0 ${size.height.toFixed(1)} ${size.width.toFixed(1)})`;
		else
			return `rect(0.0 0.0 ${size.width.toFixed(1)} ${size.height.toFixed(1)})`;
	}
}

module.exports = DeviceModel;
