const GLContext = require("gl");
const psd = require("ag-psd");
const PNG = require("pngjs").PNG;
const jpeg = require("jpeg-js");

require("./ink-engine/");

const DeviceModel = require("./DeviceModel");
const FakeCanvas = require("./FakeCanvas");
const DrawingTool = require("./DrawingTool");
const DrawingToolsBox = require("./DrawingToolsBox");

class GLCanvas {
	constructor(size, orientation, layers) {
		this.deviceModel = new DeviceModel(size, orientation);
		this.surfaceSize = this.deviceModel.getSurfaceSize();
		this.layers = layers || new Array();

		this.color = Module.Color.BLACK;

		this.canvas = new Module.InkCanvas(this, this.surfaceSize.width, this.surfaceSize.height, {preserveDrawingBuffer: true});
		this.strokesLayer = this.canvas.createLayer(this.deviceModel.size);
		this.exportLayer = this.canvas.createLayer(this.surfaceSize);

		let scaleFactor = 0.5;
		// let scaleFactor = 200 / Math.min(this.deviceModel.size.width, this.deviceModel.size.height);

		let deviceSize = this.deviceModel.getSurfaceSize(scaleFactor);
		let deviceTransform = this.deviceModel.getSurfaceTransform(scaleFactor);

		let squareSize = {width: Math.max(deviceSize.width, deviceSize.height), height: Math.max(deviceSize.width, deviceSize.height)};

		let t = Math.abs(deviceSize.width - deviceSize.height) / 2;
		let tx = (deviceSize.width < deviceSize.height) ? t : 0;
		let ty = (deviceSize.width < deviceSize.height) ? 0 : t;
		let squareTransform = Module.MatTools.makeTranslate(tx, ty);

		this.thumbLayer = this.canvas.createLayer(squareSize);
		this.thumbTransform = Module.MatTools.multiply(squareTransform, deviceTransform);

		this.strokeRenderer = new Module.StrokeRenderer(this.canvas, this.strokesLayer);
	}

	initThumbLayer() {
		this.thumbLayer.delete();

		let scaleFactor = 80 / this.deviceModel.size.width;

		this.thumbLayer = this.canvas.createLayer(this.deviceModel.getSurfaceSize(scaleFactor));
		this.thumbTransform = this.deviceModel.getSurfaceTransform(scaleFactor);
	}

	getContext(webGLContextAttributes) {
		if (!this.context)
			this.context = GLContext(1, 1, webGLContextAttributes);

		return this.context;
	}
/*
	resize() {
		if (this.context.resize)
			this.context.resize(this.surfaceSize.width, this.surfaceSize.height);
		else {
			let ext = this.context.getExtension("stackgl_resize_drawingbuffer");
			ext.resize(this.surfaceSize.width, this.surfaceSize.height)
		}

		this.canvas.resize(this.surfaceSize.width, this.surfaceSize.height);
		this.strokesLayer.resize(this.deviceModel.size.width, this.deviceModel.size.height);
		this.exportLayer.resize(this.surfaceSize.width, this.surfaceSize.height);

		let thumbSize = this.deviceModel.getSurfaceSize(0.5);
		this.thumbLayer.resize(thumbSize.width, thumbSize.height);
		this.thumbTransform = this.deviceModel.getSurfaceTransform(0.5);
	}
*/
	destroy() {
		this.strokeRenderer.delete();

		this.strokesLayer.delete();
		this.exportLayer.delete();
		this.thumbLayer.delete();

		this.canvas.delete();

		if (this.context) {
			if (this.context.destroy)
				this.context.destroy();
			else
				this.context.getExtension("WEBGL_lose_context").loseContext();

			delete this.context;
		}
	}

	buildStrokes(deviceType, rawLayers) {
		rawLayers.forEach((rawLayer) => {
			let layer = [];

			rawLayer.forEach((rawPath) => {
				let path;

				this.tool = DrawingToolsBox.getPen(deviceType, rawPath.penType);
				this.tool.activatePathBuilder(DrawingTool.PathBuilderType.PRESSURE);

				for (let i = 0; i < rawPath.points.length-1; i += rawPath.stride) {
					switch (i) {
						case 0:
							this.inputPhase = Module.InputPhase.Begin;
							break;
						case rawPath.points.length - 3:
							this.inputPhase = Module.InputPhase.End;
							break;
						default:
							this.inputPhase = Module.InputPhase.Move;
							break;
					}

					let point = {x: rawPath.points[i], y: rawPath.points[i+1], pressure: rawPath.points[i+2]};
					path = this.buildPath(point);
				}

				let stroke = new Module.Stroke(this.tool.brush, path, NaN, this.color, 0, 1);
				stroke.timestamp = rawPath.timestamp;
				stroke.pointsRate = rawPath.pointsRate;

				layer.push(stroke);
			});

			this.layers.push(layer);
		});

		delete this.inputPhase;
	}

	buildPath(point) {
		if (this.inputPhase == Module.InputPhase.Begin)
			this.tool.smoothener.reset();

		var pathPart = this.tool.pathBuilder.addPoint(this.inputPhase, point, point.pressure);
		var smoothedPathPart = this.tool.smoothener.smooth(pathPart, this.inputPhase == Module.InputPhase.End);
		var pathContext = this.tool.pathBuilder.addPathPart(smoothedPathPart);

		return pathContext.getPath();
	}

	draw() {
		this.strokesLayer.clear();

		this.layers.forEach(layer => {
			layer.forEach((stroke) => {
				if (this.format == "LAYER") stroke.path.transform = this.thumbTransform;
				this.strokeRenderer.draw(stroke);
			});
		});

		if (this.format == "PNG") {
			this.exportLayer.clear();
			this.exportLayer.blend(this.strokesLayer, {transform: this.deviceModel.transform});
		}
		else if (this.format == "JPEG") {
			this.exportLayer.clear(Module.Color.WHITE);
			this.exportLayer.blend(this.strokesLayer, {transform: this.deviceModel.transform});
		}
		else if (this.format == "LAYER") {
			this.thumbLayer.clear();
			this.thumbLayer.blend(this.strokesLayer, {rect: this.thumbLayer.bounds});
		}
		else {
			this.exportLayer.clear();
			this.exportLayer.blend(this.strokesLayer, {transform: this.deviceModel.transform});

			this.thumbLayer.clear();
			this.thumbLayer.blend(this.strokesLayer, {transform: this.thumbTransform});
		}
	}

	toPNG(name) {
		let size;
		let pixels;

		if (name == "thumb") {
			size = {width: this.thumbLayer.bounds.width, height: this.thumbLayer.bounds.height};
			pixels = this.thumbLayer.readPixels();
		}
		// export, preview
		else {
			size = this.surfaceSize;
			pixels = this.exportLayer.readPixels();
		}

		var image = new PNG(size);
		image.data = Buffer.from(pixels);
		return PNG.sync.write(image);
	}

	toJPEG() {
		var rawImageData = {width: this.surfaceSize.width, height: this.surfaceSize.height, data: Buffer.from(this.exportLayer.readPixels())};
		var image = jpeg.encode(rawImageData, 100);
		return image.data;
	}

	toSVG() {
		let svgLayers = new Array();

		this.layers.forEach((layer) => {
			svgLayers.push([]);

			layer.forEach((stroke) => {
				let path2D = new Module.BezierPath();
				// let path2D = new Module.BezierStroke();
				path2D.setStroke(stroke);

				svgLayers.last.push(path2D.buildSVGPath());
			});
		});

		let svg = "";
		svg += Module.GenericPath.openSVG(this.surfaceSize.width, this.surfaceSize.height);

		svgLayers.forEach((svgLayer) => {
			svg += "<g>";
			svgLayer.forEach(svgPath => svg += svgPath.toFill(this.deviceModel.transform));
			// svgLayer.forEach(svgPath => svg += svgPath.toStroke(this.deviceModel.transform));
			svg += "</g>";
		});

		svg += Module.GenericPath.closeSVG();

		return Buffer.from(svg);
	}

	toPSD() {
		let surfaceSize = this.deviceModel.getSurfaceSize(2.5);
		let transform = this.deviceModel.getSurfaceTransform(2.5);

		let psdLayer = this.canvas.createLayer(surfaceSize);
		let strokeRenderer = new Module.StrokeRenderer(this.canvas, psdLayer);

		let data = {
			width: surfaceSize.width,
			height: surfaceSize.height,
			children: []
		};

		this.layers.forEach((layer, idx) => {
			let canvas = new FakeCanvas(surfaceSize.width, surfaceSize.height);
			canvas.layer = this.canvas.createLayer(surfaceSize);

			let layerPSD = {
				left: 0,
				top: 0,
				right: surfaceSize.width,
				bottom: surfaceSize.height,
				name: "Layer " + idx,
				canvas: canvas
			};

			psdLayer.clear();

			layer.forEach((stroke) => {
				stroke.transform(transform);
				strokeRenderer.draw(stroke);
			});

			canvas.layer.clear();
			canvas.layer.blend(psdLayer);

// let fs = require("fs");
// let image = new PNG(surfaceSize);
// image.data = Buffer.from(canvas.layer.readPixels());

// image.pack().pipe(fs.createWriteStream("/Users/vassilev/Documents/Apps/WILL/ViperTestTool/db/psd" + this.deviceModel.orientation + ".png"));

// let buffer = PNG.sync.write(image);
// fs.writeFileSync("/Users/vassilev/Documents/Apps/WILL/ViperTestTool/db/psd" + this.deviceModel.orientation + ".png", buffer);

			data.children.push(layerPSD);
		});

		let buffer = psd.writePsdBuffer(data);

		data.children.forEach((layerPSD) => {
			layerPSD.canvas.layer.delete();
		});

		strokeRenderer.delete();
		psdLayer.delete();

		return buffer;
	}

	static fromProtoBuf(bytes) {
		return Module.InkDecoder.decode(bytes);
	}

	static toProtoBuf(strokes) {
		return Module.InkEncoder.encode(strokes);
	}

	// format: PSD, SVG, PNG, JPEG
	static export(note, options) {
		let result = {};

		let canvas = new GLCanvas(note.size, note.orientation, (note.rawLayers ? null : note.strokesList));

		if (note.rawLayers) {
			canvas.buildStrokes(options.deviceType, note.rawLayers);
			note.updateRawLayers(canvas.layers);
		}

		if (options.format != "PSD" && options.format != "SVG") {
			canvas.format = options.format;

			if (options.format == "LAYER") canvas.initThumbLayer();
			canvas.draw();
		}

		if (options.format == "PSD")
			result = canvas.toPSD();
		else if (options.format == "SVG")
			result = canvas.toSVG();
		else if (options.format == "PNG")
			result = canvas.toPNG("export");
		else if (options.format == "LAYER")
			result = canvas.toPNG("thumb");
		else if (options.format == "JPEG")
			result = canvas.toJPEG();
		else {
			result.preview = canvas.toPNG("preview");
			result.thumb = canvas.toPNG("thumb");
		}

		canvas.destroy();

		return result;
	}
}

Module.InkDecoder.getStrokeBrush = (paint) => {
	// return DrawingToolsBox.getPen("DEVICE_TYPE", paint || 0).brush;
	return DrawingToolsBox.pen.brush;
};

module.exports = {
	fromProtoBuf: GLCanvas.fromProtoBuf,
	toProtoBuf: GLCanvas.toProtoBuf,
	export: GLCanvas.export
};
