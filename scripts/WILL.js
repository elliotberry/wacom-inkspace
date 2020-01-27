import * as DrawingTool from './DrawingTool';
import * as DrawingToolsBox from './DrawingToolsBox';

let WILL = {
	MIN_SCALE_FACTOR: 0.5,
	MAX_SCALE_FACTOR: 3,

	tools: DrawingToolsBox,

	init(deviceModel, layoutBridge) {
		this.layoutBridge = layoutBridge;

		this.backgroundColor = Module.Color.WHITE;
		this.color = Module.Color.BLACK;

		this.VIEW_AREA = Module.RectTools.create(0, 0, deviceModel.size.width, deviceModel.size.height);

		this.clear();
		this.canvas.resize(deviceModel.size.width, deviceModel.size.height);

		this.context2D.init(deviceModel.transform);
		this.initEvents();

		this.strokeInputEnabled = false;

		this.tool = undefined;
		this.layers = undefined;
		this.currentLayer = undefined;

		this.split = {
			prev: undefined,
			mode: undefined,
			index: undefined,
			affectedLayer: undefined
		};
	},

	initEvents() {
		if (this.events) {
			window.addEventListener("resize", this.events.resize);
			return;
		}

		this.events = {
			resize: (e) => {
				if (this.layoutBridge.liveMode)
					this.context2D.fitToScreen();
			},

			pointerdown: (e) => {
				if (e.button == 0) {
					this.tool.preparePathBuilder(e, Module.InputPhase.Begin);
					this.beginStroke(this.getInputPoint(e));
				}
			},

			pointermove: (e) => {
				if (!this.inputPhase) return;

				this.tool.preparePathBuilder(e, Module.InputPhase.Move);
				this.moveStroke(this.getInputPoint(e))
			},

			pointerup: (e) => {
				if (!this.inputPhase) return;

				this.tool.preparePathBuilder(e, Module.InputPhase.End);
				this.endStroke(this.getInputPoint(e))
			},

			pointercancel: (e) => {
				this.abort();
			},

			wheel: (e) => {
				e.preventDefault();
				this.context2D.zoom(e);

				if (this.lastNotification) WILL.removeNotification(this.lastNotification);
				this.lastNotification = "zoom" + Math.random();
				WILL.addNotification({key: this.lastNotification, message: `${Math.floor(this.context2D.transformScaleFactor * 100)}%`});
			},

			beginPan: (e) => {
				if (e.button != 2) return;

				this.context2D.beginPan({x: e.clientX, y: e.clientY});

				e.preventDefault();
				e.stopPropagation();
			},

			movePan: (e) => {
				this.context2D.movePan({x: e.clientX, y: e.clientY});

				e.preventDefault();
				e.stopPropagation();

			},

			endPan: (e) => {
				this.context2D.endPan();
			}
		};

		window.addEventListener("resize", this.events.resize);

		document.addEventListener("dblclick", (e) => {
			this.context2D.resetTransforms();
		});
	},

	setLayers(layers) {
		this.layers = layers;

		this.context2D.createLayers();

		layers.forEach((layer, layerIndex) => {
			let dirtyArea;

			layer.strokes.forEach((stroke, strokeIndex) => {
				if (!stroke.isBezierPath()) {
					if (!this.bezierProgress) {
						this.bezierProgress = {count: 0, length: ([].concat.apply([], this.layers.map(layer => layer.strokes))).length};
						this.layoutBridge.startProgress();
					}

					this.messanger.sendStrokePath(stroke, layerIndex, strokeIndex);
				}
				else
					dirtyArea = Module.RectTools.union(dirtyArea, stroke.bounds);
			});

			if (dirtyArea)
				this.context2D.refresh(dirtyArea, layerIndex);
		});

		if (!this.bezierProgress)
			this.refreshLayers();
	},

	updateBezierProgress(stroke, layerIndex, strokeIndex) {
		this.bezierProgress.count++;

		// this.context2D.refresh(stroke.bounds, layerIndex, strokeIndex + 1);

		this.layoutBridge.updateProgress(this.bezierProgress.count * (100 / this.bezierProgress.length));
	},

	refreshLayers(affectedLayers) {
		if (this.layoutBridge.liveMode) return;
		if (!affectedLayers) affectedLayers = [];

		this.layers.forEach((layer, layerIndex) => this.context2D.refresh(this.VIEW_AREA, layerIndex));
		this.layoutBridge.updatePreview(...affectedLayers);

		delete this.bezierProgress;
		this.layoutBridge.completeProgress();
	},

	setSplitMode(splitMode, canceled) {
		this.split = {
			prev: Object.clone(this.split),
			mode: splitMode,
			index: undefined,
			affectedLayer: undefined
		};

		if (splitMode) {
			this.split.prev = {};

			if (splitMode == "layer") {
				this.split.affectedLayer = this.currentLayer;

				this.layers.forEach((layer, layerIndex) => {
					if (layerIndex != this.currentLayer)
						this.context2D.updateLayerOpacity(layerIndex, 0.5);
				});
			}
		}
		else if (this.split.prev) {
			let split = this.split.prev;

			if (split.mode == "layer") {
				this.layers.forEach((layer, layerIndex) => {
					this.context2D.updateLayerOpacity(layerIndex);
				});

				if (!canceled)
					this.layoutBridge.updatePreview(split.affectedLayer, split.affectedLayer+1);
			}
			else if (split.mode == "note") {
				if (canceled) return;

				this.layers.forEach((layer, layerIndex) => {
					if (split.affectedLayer >= layerIndex)
						this.layoutBridge.updatePreview(layerIndex);
				});
			}
			else
				throw new Error("Unknown split mode found: " + split.mode);
		}
	},

	setSplitIndex(splitIndex) {
		this.split.prev = Object.clone(this.split);
		this.split.index = splitIndex;

		if (splitIndex == null)
			return;

		if (this.split.prev.index != this.split.index) {
			let strokes;

			if (this.split.mode == "layer")
				strokes = this.layers[this.currentLayer].strokes;
			else if (this.split.mode == "note")
				strokes = [].concat.apply([], this.layers.map(layer => layer.strokes));

			if (strokes) {
				let affectedStrokes = strokes.slice(Math.min(this.split.prev.index || 0, splitIndex), Math.max(this.split.prev.index || 0, splitIndex));
				let affectedArea;

				affectedStrokes.forEach(stroke => {
					affectedArea = Module.RectTools.union(affectedArea, stroke.bounds);
				});

				if (affectedArea) {
					if (this.split.mode == "layer")
						this.context2D.refresh(affectedArea, this.currentLayer, splitIndex);
					else if (this.split.mode == "note") {
						let skipLastLength = strokes.length - splitIndex;
						let affectedLayer = 0;
						let strokeIndex = 0;

						for (var i = this.layers.length - 1; i >= 0; i--) {
							let layer = this.layers[i];

							strokeIndex = layer.strokes.length - skipLastLength;

							if (strokeIndex >= 0) {
								affectedLayer = i;
								break;
							}
							else {
								this.context2D.clear(i);
								skipLastLength -= layer.strokes.length;
							}
						}

						this.split.affectedLayer = affectedLayer;

						if (strokeIndex == 0 && affectedLayer > 0 && this.split.prev.index < splitIndex) {
							affectedLayer--;
							strokeIndex = this.layers[affectedLayer].strokes.length;
						}

						if (affectedLayer > this.split.prev.affectedLayer) {
							for (let i = this.split.prev.affectedLayer; i <= affectedLayer; i++) {
								if (i == affectedLayer)
									this.context2D.refresh(affectedArea, i, strokeIndex);
								else
									this.context2D.refresh(affectedArea, i);
							}
						}
						else
							this.context2D.refresh(affectedArea, affectedLayer, strokeIndex);
					}
					else
						throw new Error("Unknown split mode found: " + this.split.mode);
				}
			}
		}
	},

	setCurrentLayer(currentLayer) {
		this.currentLayer = currentLayer;
	},

	isInEraseMode() {
		return this.tool && this.tool.type == DrawingTool.Type.ERASER;
	},

	initInkEngine() {
		let maxDeviceModelSize = {width: 864, height: 1188};

		this.canvas = new Module.InkCanvas(document.getElementById("canvas"), maxDeviceModelSize.width, maxDeviceModelSize.height);
		this.strokesLayer = this.canvas.createLayer(maxDeviceModelSize);
		this.strokesAndCurrentStrokeLayer = this.canvas.createLayer(maxDeviceModelSize);

		this.strokeRenderer = new Module.StrokeRenderer(this.canvas);
		this.intersector = new Module.Intersector();

		this.context2D.initBezierStroke(WILL.MAX_SCALE_FACTOR);
	},

	setTool(tool) {
		this.tool = tool;

		if (this.tool.type != DrawingTool.Type.ERASER)
			this.strokeRenderer.configure({ brush: this.tool.brush, color: this.color });
	},

	setColor(color) {
		this.color = color;

		if (this.tool && this.tool.brush)
			this.strokeRenderer.configure({ brush: this.tool.brush, color: this.color });
	},

	enableStrokeInput() {
		if (!this.strokeInputEnabled) {
			this.canvas.surface.addEventListener("pointerdown", this.events.pointerdown);
			document.addEventListener("pointermove", this.events.pointermove);
			document.addEventListener("pointerup", this.events.pointerup);
			document.addEventListener("pointercancel", this.events.pointercancel);

			this.strokeInputEnabled = true;
		}
	},

	disableStrokeInput() {
		if (this.strokeInputEnabled) {
			this.canvas.surface.removeEventListener("pointerdown", this.events.pointerdown);
			document.removeEventListener("pointermove", this.events.pointermove);
			document.removeEventListener("pointerup", this.events.pointerup);
			document.removeEventListener("pointercancel", this.events.pointercancel);

			this.strokeInputEnabled = false;
		}
	},

	enableZoomAndPan() {
		this.canvas.surface.addEventListener("wheel", this.events.wheel);

		this.canvas.surface.addEventListener("mousedown", this.events.beginPan);
		this.canvas.surface.addEventListener("mousemove", this.events.movePan);
		document.addEventListener("mouseup", this.events.endPan);

		document.addEventListener("pointerleave", this.events.endPan);
	},

	disableZoomAndPan() {
		this.canvas.surface.removeEventListener("wheel", this.events.wheel);
		this.canvas.surface.removeEventListener("mousedown", this.events.beginPan);
		this.canvas.surface.removeEventListener("mousemove", this.events.movePan);
		document.removeEventListener("mouseup", this.events.endPan);

		document.removeEventListener("pointerleave", this.events.endPan);
	},

	getOffset(e) {
		if (!WILL.context2D.layersNode.offsetParent) return {x: 0, y: 0};

		let offsetRect = WILL.context2D.layersNode.offsetParent.getBoundingClientRect();
		let pt = Module.MatTools.transformPoint({x: e.pageX - offsetRect.x, y: e.pageY - offsetRect.y}, Module.MatTools.invert(WILL.context2D.transform));

		return pt;
	},

	getInputPoint(e) {
		let pt = {pressure: this.tool.pathBuilderValue};

		if (e.type == "pointerdown") {
			pt.x = e.offsetX;
			pt.y = e.offsetY;
		}
		// pointermove, pointerup
		else {
			let offset = this.getOffset(e);

			pt.x = offset.x;
			pt.y = offset.y;
		}

		return pt;
	},

	beginStroke(point) {
		this.inputPhase = Module.InputPhase.Begin;
		this.pointerPos = point;

		this.beginStrokeTimestamp = Date.now();
		this.lastEventTimestamp = new Date();
		if (this.layoutBridge.liveMode) this.pointerChunk = [];

		this.buildPath(point);

		if (!this.isInEraseMode())
			this.drawPath();
		else
			this.erase();
	},

	moveStroke(point) {
		this.inputPhase = Module.InputPhase.Move;
		this.pointerPos = point;
		if (this.layoutBridge.liveMode) this.pointerChunk.push(point);

		let cahcePointerInput = () => {
			if (this.inputPhase && this.inputPhase == Module.InputPhase.Move) {
				if (this.layoutBridge.liveMode) {
					this.buildPath(this.pointerChunk);
					this.pointerChunk = [];
				}
				else
					this.buildPath(this.pointerPos);

				if (!this.isInEraseMode())
					this.drawPath();
				else
					this.erase();
			}
		};

		if (window.minimized) {
			let currentTimestamp = new Date();

			if (currentTimestamp - this.lastEventTimestamp >= 8)
				cahcePointerInput();

			this.lastEventTimestamp = currentTimestamp;
		}
		else {
			if (this.frameID != this.canvas.frameID)
				this.frameID = this.canvas.requestAnimationFrame(cahcePointerInput, true);
		}
	},

	endStroke(point) {
		if (!point) point = this.pointerPos;

		if (this.layoutBridge.liveMode && this.pointerChunk.length > 0) {
			this.buildPath(this.pointerChunk);
			this.drawPath();
		}

		this.inputPhase = Module.InputPhase.End;

		this.buildPath(point);

		if (!this.isInEraseMode())
			this.drawPath();
		else
			this.erase();

		delete this.inputPhase;
	},

	buildPath(point) {
		if (this.inputPhase == Module.InputPhase.Begin) {
			if (!this.layoutBridge.liveMode)
				this.tool.smoothener.reset();

			delete this.path;
			delete this.pathPart;
		}

		if (this.layoutBridge.liveMode) {
			let points = (point instanceof Array)?point:[point];
			let chunk = [];

			if (points.first.points) {
				let stride = points.first.stride;

				points.forEach(pathPart => {
					chunk = chunk.concat(pathPart.points.toArray());
				});

				this.pathPart = Module.PathBuilder.createPath(chunk.toFloat32Array(), stride);
			}
			else {
				let pathPart;

				points.forEach(point => {
					pathPart = this.tool.pathBuilder.addPoint(this.inputPhase, point, point.pressure);
					chunk = chunk.concat(Module.readFloats(pathPart.points).toArray());
				});

				pathPart = Module.PathBuilder.createPath(chunk.toFloat32Array(), pathPart.stride);
				let pathContext = this.tool.pathBuilder.addPathPart(pathPart);

				this.pathPart = pathContext.getPathPart();
				// this.pathPart = Module.PathBuilder.createPath(chunk.toFloat32Array(), pathPart.stride);
				this.path = pathContext.getPath();
			}
		}
		else {
			var pathPart = this.tool.pathBuilder.addPoint(this.inputPhase, point, point.pressure);
			var smoothedPathPart = this.tool.smoothener.smooth(pathPart, this.inputPhase == Module.InputPhase.End);
			var pathContext = this.tool.pathBuilder.addPathPart(smoothedPathPart);

			this.pathPart = pathContext.getPathPart();
			this.path = pathContext.getPath();

			if (this.inputPhase == Module.InputPhase.Move) {
				var preliminaryPathPart = this.tool.pathBuilder.createPreliminaryPath();
				var preliminarySmoothedPathPart = this.tool.smoothener.smooth(preliminaryPathPart, true);

				this.preliminaryPathPart = this.tool.pathBuilder.finishPreliminaryPath(preliminarySmoothedPathPart);
			}
		}
	},

	drawPath() {
		switch (this.inputPhase) {
			case Module.InputPhase.Begin:
				this.strokeRenderer.draw(this.pathPart, false);
				this.refresh(this.strokeRenderer.updatedArea);

				break;
			case Module.InputPhase.Move:
				this.strokeRenderer.draw(this.pathPart, false);
				this.refresh(this.strokeRenderer.updatedArea);

				break;
			case Module.InputPhase.End:
				let stroke = this.strokeRenderer.toStroke(this.path);
				stroke.timestamp = this.beginStrokeTimestamp;
				stroke.pointsRate = this.layoutBridge.liveMode ? global.smartPad.pointsRate : 60;

				this.layoutBridge.addStroke(stroke)

				this.strokeRenderer.draw(this.pathPart, true);
				this.refresh(this.strokeRenderer.strokeBounds);

				break;
			default:
				throw new Error("Invalid input phase:", this.inputPhase);
		}
	},

	erase() {
		if (this.pathPart.points.length == 0) return;

		var dirtyArea = null;
		var strokesToRemove = [];

		this.intersector.setTargetAsStroke(this.pathPart, NaN);

		this.layers[this.currentLayer].strokes.forEach(stroke => {
			if (this.intersector.isIntersectingTarget(stroke)) {
				dirtyArea = Module.RectTools.union(dirtyArea, stroke.bounds);
				strokesToRemove.push(stroke);
			}
		});

		if (strokesToRemove.length > 0)
			this.layoutBridge.removeStrokes(strokesToRemove);

		this.context2D.refresh(dirtyArea);
	},

	refresh(dirtyArea) {
		dirtyArea = Module.RectTools.intersect(this.VIEW_AREA, dirtyArea);
		if (!dirtyArea) return;

		var strokesLayer = this.strokesLayer;

		// dirtyArea = Module.RectTools.create(dirtyArea.left - MAX_SCALE_FACTOR, dirtyArea.top - MAX_SCALE_FACTOR, dirtyArea.width + MAX_SCALE_FACTOR * 2, dirtyArea.height + MAX_SCALE_FACTOR * 2);

		if (this.inputPhase && this.inputPhase != Module.InputPhase.End && !this.isInEraseMode()) {
			strokesLayer = this.strokesAndCurrentStrokeLayer;

			this.strokesAndCurrentStrokeLayer.blend(this.strokesLayer, { mode: Module.BlendMode.NONE, rect: dirtyArea });
			this.strokeRenderer.updatedArea = Module.RectTools.union(this.strokeRenderer.updatedArea, dirtyArea);

			if (!this.layoutBridge.liveMode && this.inputPhase == Module.InputPhase.Move)
				this.strokeRenderer.drawPreliminary(this.preliminaryPathPart);

			this.strokeRenderer.blendUpdatedArea(this.strokesAndCurrentStrokeLayer);
		}

		if (this.inputPhase == Module.InputPhase.End) {
			this.clear();
			this.context2D.refresh(dirtyArea);
		}
		else {
			this.canvas.clear(dirtyArea);
			this.canvas.blend(strokesLayer, {rect: dirtyArea});
		}
	},

	abort: function() {
		if (!this.inputPhase) return;

		let dirtyArea = this.strokeRenderer.strokeBounds;

		this.strokeRenderer.abort();
		delete this.inputPhase;

		this.refresh(dirtyArea);
	},

	clear() {
		this.strokesLayer.clear();
		this.canvas.clear();
	},

	finalize() {
		// let ext = this.canvas.ctx.getExtension("WEBGL_lose_context");

		this.abort();
		this.disableStrokeInput();
		this.disableZoomAndPan();

		window.removeEventListener("resize", this.events.resize);

		// this.strokeRenderer.delete();
		// this.strokesLayer.delete();
		// this.strokesAndCurrentStrokeLayer.delete();
		// this.canvas.delete();

		// if (ext) ext.loseContext();
	}
}

export default WILL
