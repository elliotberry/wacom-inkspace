let context2D = {
	init(contentTransform) {
		this.transform = contentTransform;
		this.contentTransform = contentTransform;

		this.layers = [];

		this.layersNode = WILL.canvas.surface.parentElement;
		// this.layersNode.backgroundColor = `rgba(${WILL.backgroundColor.red}, ${WILL.backgroundColor.green}, ${WILL.backgroundColor.blue}, ${WILL.backgroundColor.alpha})`;

		this.layersNode.style.width = WILL.canvas.bounds.width + "px";
		this.layersNode.style.height = WILL.canvas.bounds.height + "px";

		Object.defineProperty(this, "ctx", {configurable: true, get: () => this.layers[WILL.currentLayer].ctx});
		Object.defineProperty(this, "transformScaleFactor", {configurable: true, get: () => Math.sqrt(this.transform.a * this.transform.a + this.transform.c * this.transform.c)});

		this.fitToScreen();
	},

	fitToScreen: function() {
		let parent = this.layersNode.parentElement;
		let transformArea = Module.MatTools.transformRect(WILL.VIEW_AREA, this.contentTransform);

		let scaleFactor = 1;
		let x = parent.getMathStyle("width") / 2 - transformArea.width / 2;
		let y = parent.getMathStyle("height") / 2 - transformArea.height / 2;

		if (x < 0 && y < 0)
			scaleFactor = Math.min((parent.getMathStyle("width") - 30) / transformArea.width, (parent.getMathStyle("height") - 30) / transformArea.height);
		else if (x < 0)
			scaleFactor = (parent.getMathStyle("width") - 30) / transformArea.width;
		else if (y < 0)
			scaleFactor = (parent.getMathStyle("height") - 30) / transformArea.height;

		this.zoom({offsetX: 0, offsetY: 0}, scaleFactor);
		this.centerCanvas();
	},

	initBezierStroke(maxScaleFactor) {
		Object.defineProperty(Module.Stroke.prototype, "bezierPath", {
			get: function () {
				if (!this.bezierPathValue) {
					this.bezierPathValue = new Module.BezierPath();
					this.bezierPathValue.setStroke(this, maxScaleFactor);
					this.bezierPathValue.transform = Module.MatTools.create();
					this.bezierPathValue.currentTransform = Module.MatTools.create();
				}

				return this.bezierPathValue;
			},

			set: function (value) {
				this.bezierPathValue = value;
				this.bezierPathValue.transform = Module.MatTools.create();
				this.bezierPathValue.currentTransform = Module.MatTools.create();
			}
		});

		Module.Stroke.prototype.isBezierPath = function () {
			return !!this.bezierPathValue;
		}

		Module.Stroke.prototype.drawBezierPath = function (ctx) {
			this.bezierPath.draw(ctx);
		}

		/*
		Object.extend(Module.Stroke.prototype, {
			transform: function (mat) {
				if (mat) {
					this.bezierPath.transform = Module.MatTools.multiply(mat, this.bezierPath.transform);
					this.bezierPath.currentTransform = Module.MatTools.multiply(mat, this.bezierPath.currentTransform);
				}
				else {
					if (!Module.MatTools.isIdentity(this.bezierPath.currentTransform)) {
						this.super.transform(this.bezierPath.currentTransform);
						this.bezierPath.currentTransform = Module.MatTools.create();
					}
				}
			}
		});
		*/
	},

	createLayers() {
		let layers = [];

		WILL.layers.forEach((layer, idx) => {
			let canvas = document.createElement("canvas");
			canvas.id = layer.id;

			canvas.width = WILL.canvas.bounds.width;
			canvas.height = WILL.canvas.bounds.height;

			canvas.className = "canvas-layer";
			canvas.setAttribute("data-idx", idx);

			canvas.ctx = canvas.getContext("2d");

			layers.push(canvas);
		});

		document.querySelectorAll(".canvas-layer").forEach(node => node.remove());
		layers.forEach(canvas => this.layersNode.insertBefore(canvas, WILL.canvas.surface));

		this.layers = layers;
	},

	updateLayerOpacity(idx, opacity) {
		this.layers[idx].style.opacity = opacity || "";
	},

	refresh(dirtyArea, layerIDX, strokeIndex) {
		if (typeof layerIDX == "undefined") layerIDX = WILL.currentLayer;

		if (!dirtyArea) return;

		let ctx = this.layers[layerIDX].ctx;
		let strokes = WILL.layers[layerIDX].strokes;
		if (strokeIndex >= 0) strokes = strokes.slice(0, strokeIndex);

		ctx.save();
		ctx.beginPath();
		ctx.rect(dirtyArea.left, dirtyArea.top, dirtyArea.width, dirtyArea.height);
		ctx.clip();
		ctx.clearCanvas();

		strokes.forEach(stroke => {
			let affectedArea = Module.RectTools.intersect(stroke.bounds, dirtyArea);
			if (affectedArea) stroke.drawBezierPath(ctx);
		}, this);

		ctx.restore();
	},

	clear(layerIDX) {
		if (typeof layerIDX == "undefined") layerIDX = WILL.currentLayer;
		this.layers[layerIDX].ctx.clearCanvas();
	},

	zoom: function(e, scaleFactor) {
		let transform;
		let pos;
		let scale;

		if (e.type == "pinch")
			scale = e.detail.scale;
		else {
			if (scaleFactor)
				this.transform = this.contentTransform;

			if (scaleFactor)
				pos = {x: e.offsetX, y: e.offsetY};
			else
				pos = Module.MatTools.transformPoint({x: e.offsetX, y: e.offsetY}, this.transform);

			scale = scaleFactor || ((e.deltaY > 0)?0.97:1.03);
		}

		let transformScaleFactor = this.transformScaleFactor;

		if (transformScaleFactor * scale < WILL.MIN_SCALE_FACTOR)
			scale = WILL.MIN_SCALE_FACTOR / transformScaleFactor;
		else if (transformScaleFactor * scale > WILL.MAX_SCALE_FACTOR)
			scale = WILL.MAX_SCALE_FACTOR / transformScaleFactor;

		if (e.type == "pinch") {
			e.detail.scale = scale;
			transform = e.detail.transform;
		}
		else
			transform = Module.MatTools.makeScaleAtPoint(scale, pos);

		// if (!scaleFactor) transform = Module.MatTools.multiply(transform, this.transform);
		transform = Module.MatTools.multiply(transform, this.transform);

		if ((transformScaleFactor == WILL.MIN_SCALE_FACTOR && transformScaleFactor < WILL.MIN_SCALE_FACTOR) || (transformScaleFactor == WILL.MAX_SCALE_FACTOR && transformScaleFactor > WILL.MAX_SCALE_FACTOR))
			return;

		this.updateTransform(transform);
	},

	pan(point) {
		this.beginPan({x: 0, y: 0});
		this.movePan(point);
		this.endPan();
	},

	beginPan(point) {
		this.panPoint = point;
	},

	movePan(point) {
		if (!this.panPoint) return;

		let delta = {x: point.x - this.panPoint.x, y: point.y - this.panPoint.y};
		this.panPoint = point;

		let transform = Module.MatTools.makeTranslate(delta);
		transform = Module.MatTools.multiply(transform, this.transform);

		this.updateTransform(transform);
	},

	endPan() {
		delete this.panPoint;
	},

	centerCanvas() {
		let parent = this.layersNode.parentElement;
		let transformArea = Module.MatTools.transformRect(WILL.VIEW_AREA, this.transform);

		let x = parent.getMathStyle("width") / 2 - transformArea.width / 2;
		let y = parent.getMathStyle("height") / 2 - transformArea.height / 2;

		this.pan({x: x, y: y});
	},

	updateTransform(transform) {
		this.transform = transform;
		this.layersNode.style.transform = `matrix(${transform.a}, ${transform.b}, ${transform.c}, ${transform.d}, ${transform.tx}, ${transform.ty})`;
	},

	resetTransforms() {
		this.fitToScreen();
	}
}

export default context2D
