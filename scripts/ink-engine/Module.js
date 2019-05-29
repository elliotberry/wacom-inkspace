if (!Object.extend && typeof global != "undefined")
	require((global.jsExtPrefixURL || "./") + "js.ext");

/**
 * @namespace Module
 * @description canvas bridge
 *
 * <xmp>
 * For local usagse:
 *		Firefox: "security.fileuri.strict_origin_policy" should be false, parameter can be found in about:config
 *		Chrome: start with parameter "--allow-access-from-files"
 * </xmp>
 */
var Module = {
	preRun: [],
	postRun: [],
	addPostScript: function(callback) {
		if (Module.ready && !this.postRun.length)
			callback();
		else
			this.postRun.unshift(callback);
	},
	print: function(text) {
		if (text && text != "") console.log(text);
	},
	printErr: function(text) {
		text = Array.prototype.slice.call(arguments).join(" ");

		if (0) // XXX disabled for safety typeof dump == "function") {
			dump(text + "\n"); // fast, straight to the real console
		else
			console.log(text);
	},
	canvas: null,
	canvasID: "canvas",
	// setStatus: function(text) {},

	totalDependencies: 0,
	monitorRunDependencies: function(left) {
		this.totalDependencies = Math.max(this.totalDependencies, left);
		// Module.setStatus(left?"Preparing... (" + (this.totalDependencies-left) + "/" + this.totalDependencies + ")":"All downloads complete.");
	}
};

Module.getScriptPrefixURL = function(name) {
	var result = null;
	var scripts = document.getElementsByTagName("script");

	for (var i = 0; i < scripts.length; i++) {
		if (scripts[i].src.contains(name)) {
			var src = scripts[i].getAttribute("src");

			if (src.contains("/"))
				src = src.substring(0, src.lastIndexOf("/"));
			else
				src = "";

			result = src;
			break;
		}
	}

	return result;
}

if (ENVIRONMENT == EnvironmentType.WEB) {
	/**
	 * Prefix path to the engine mem file.
	 * Auto initialized with prefix path of Module.js.
	 * Should be configured manually when used in workers or for custom mem file location.
	 *
	 * @memberof Module
	 * @member {String} memoryInitializerPrefixURL
	 */
	Module.memoryInitializerPrefixURL = Module.getScriptPrefixURL("Module.js") + "/";
}
else if (ENVIRONMENT == EnvironmentType.NODE) {
	Module.memoryInitializerPrefixURL = __dirname + "/";
	module.exports = Module;
}

Module.addPostScript(function() {
	Object.defineProperty(Module.VectorInterval.prototype, "length", {get: function() {return this.size();}});
	Object.defineProperty(Module.VectorInt64Ptr.prototype, "length", {get: function() {return this.size();}});
	Object.defineProperty(Module.PathBuilder.prototype, "stride", {get: function() {return this.calculateStride();}});

	Object.extend(Module.VectorInterval.prototype, {
		push: Module.VectorInterval.prototype.push_back,

		forEach: function(callback, context) {
			for (var i = 0; i < this.size(); i++)
				callback.call(context || {}, this.get(i), i, this);
		},

		toArray: function() {
			var result = new Array();
			for (var i = 0; i < this.size(); i++) result.push(this.get(i));
			return result;
		}
	});

	Module.VectorInt64Ptr.prototype.forEach = Module.VectorInterval.prototype.forEach;

	Object.extend(Module.PathBuilder, {
		createPath: function(points, stride) {
			if (Array.isArray(points)) points = points.toFloat32Array();
			return {points: points, stride: stride};
		}
	});

	Object.extend(Module.PathBuilder.prototype, {
		createPath: function(points) {
			this.super.createPath.apply(this.super, arguments);
			return Module.PathBuilder.createPath(points, this.stride);
		},

		addPathPart: function(pathPart) {
			this.super.addPathPart.apply(this.super, arguments);

			var pathContext;

			Module.writeBytes(pathPart.points, function(points) {
				pathContext = this.nativeAddPathPart(points);
			}, this);

			pathContext.stride = this.stride;

			return pathContext;
		},

		finishPreliminaryPath: function(pathEnding) {
			this.super.finishPreliminaryPath.apply(this.super, arguments);

			var path;

			Module.writeBytes(pathEnding.points, function(points) {
				path = this.nativeFinishPreliminaryPath(points);
			}, this);

			return path;
		}
	});

	Object.extend(Module.MultiChannelSmoothener.prototype, {
		smooth: function(pathPart, finish) {
			this.super.smooth.apply(this.super, arguments);

			var path;

			Module.writeBytes(pathPart.points, function(points) {
				path = Module.PathBuilder.createPath(this.nativeSmooth(points, finish), pathPart.stride);
			}, this);

			return path;
		}
	});

	Object.extend(Module.ParticleBrush.prototype, {
		configureShape: function(src, callback, context) {
			if (!this.shapeTexture) {
				this.shapeTexture = Module.GLTools.createTexture(GLctx.CLAMP_TO_EDGE, GLctx.LINEAR);
			}

			Module.GLTools.prepareTexture(this.shapeTexture, src, callback, context);
		},

		configureFill: function(src, callback, context) {
			if (!this.fillTexture) {
				this.fillTexture = Module.GLTools.createTexture(GLctx.REPEAT, GLctx.NEAREST);
			}

			Module.GLTools.prepareTexture(this.fillTexture, src, function(texture) {
				this.setFillTextureSize(texture.image.width, texture.image.height);
				if (callback) callback.call(context || {});
			}, this);
		}
	});

	Object.extend(Module.Intersector.prototype, {
		setTargetAsStroke: function(path, width) {
			this.super.setTargetAsStroke.apply(this.super, arguments);

			Module.writeBytes(path.points, function(points) {
				this.nativeSetTargetAsStroke(points, path.stride, width);
			}, this);
		},

		setTargetAsClosedPath: function(path) {
			this.super.setTargetAsClosedPath.apply(this.super, arguments);

			Module.writeBytes(path.points, function(points) {
				this.nativeSetTargetAsClosedPath(points, path.stride);
			}, this);
		},

		isIntersectingTarget: function(stroke) {
			this.super.isIntersectingTarget.apply(this.super, arguments);

			var result;

			Module.writeBytes(stroke.path.points, function(points) {
				Module.writeBytes(stroke.path.segmentsBounds(), function(segments) {
					result = this.nativeIsIntersectingTarget(points, stroke.path.stride, stroke.width, stroke.ts, stroke.tf, stroke.path.bounds, segments);
				}, this);
			}, this);

			return result;
		},

		intersectWithTarget: function(stroke) {
			this.super.intersectWithTarget.apply(this.super, arguments);

			var intervals;

			Module.writeBytes(stroke.path.points, function(points) {
				Module.writeBytes(stroke.path.segmentsBounds(), function(segments) {
					intervals = this.nativeIntersectWithTarget(points, stroke.path.stride, stroke.width, stroke.ts, stroke.tf, stroke.path.bounds, segments);
				}, this);
			}, this);

			return intervals;
		}
	});

	Object.extend(Module.InkEncoder, {
		encode: function(strokes) {
			var bytes;
			var encoder = new Module.InkEncoder();

			strokes.forEach(function(stroke) {
				encoder.encode(stroke);
			}, this);

			bytes = Module.readBytes(encoder.getBytes());
			encoder.delete();

			return bytes;
		}
	});

	Object.extend(Module.InkEncoder.prototype, {
		encode: function(stroke, paint) {
			this.super.encode(stroke);

			Module.writeBytes(stroke.path.points, function(points) {
				var ink = {
					precision: Module.Stroke.config.encodePrecision,
					path: Module.PathBuilder.createPath(points, stroke.path.stride),
					width: stroke.width,
					color: stroke.color,
					ts: stroke.ts,
					tf: stroke.tf,
					randomSeed: Module.getUnsignedInt(stroke.randomSeed),
					blendMode: stroke.blendMode,
					paint: Module.getUnsignedInt((paint && !isNaN(paint))?paint:stroke.brush.id),
					id: Module.getUnsignedInt(stroke.id)
				};

				this.nativeEncode(ink);
			}, this);
		}
	});

	Object.extend(Module.InkDecoder, {
		decode: function(bytes) {
			var strokes = new Array();
			var stroke;
			var dirtyArea;

			Module.writeBytes(bytes, function(int64Ptr) {
				var decoder = new Module.InkDecoder(int64Ptr);

				while (decoder.hasNext()) {
					stroke = decoder.decode();
					dirtyArea = Module.RectTools.union(dirtyArea, stroke.bounds);

					strokes.push(stroke);
				}

				decoder.delete();
			}, this);

			strokes.bounds = dirtyArea;
			return strokes;
		},

		getStrokeBrush: function(paint) {
			throw new Error("Module.InkDecoder.getStrokeBrush(paint, [user]) should be implemented");
		}
	});

	Object.extend(Module.InkDecoder.prototype, {
		decode: function() {
			this.super.decode.apply(this.super, arguments);

			var ink = this.nativeDecode();
			var paint = ink.paint.null?null:ink.paint.value;
			var brush = Module.InkDecoder.getStrokeBrush(paint);
			var stroke = new Module.Stroke(brush, ink.path, ink.width, ink.color, ink.ts, ink.tf, ink.randomSeed.null?NaN:ink.randomSeed.value, ink.blendMode);

			return stroke;
		}
	});

	Object.extend(Module.BrushEncoder.prototype, {
		encode: function(brush) {
			if (brush instanceof Module.ParticleBrush) {
				var shapes = new Module.VectorInt64Ptr();
				var fills = new Module.VectorInt64Ptr();

				this.encodeImages(brush.shapeTexture, shapes);
				this.encodeImages(brush.fillTexture, fills);

				this.encodeParticleBrush(brush, shapes, fills, Module.getUnsignedInt(brush.id));

				for (var i = 0; i < shapes.size(); i++)
					Module._free(shapes.get(i).ptr);

				for (var i = 0; i < fills.size(); i++)
					Module._free(fills.get(i).ptr);

				shapes.delete();
				fills.delete();
			}
		},

		encodeImages: function(textureID, int64Ptrs) {
			var images = GL.textures[textureID].image?[GL.textures[textureID].image]:GL.textures[textureID].mipmap;
			if (!images) throw new Error("Texture images not found");

			images.forEach(function(image) {
				// do not encode auto generated images
				if (image.src.startsWith("data:")) return;

				var bytes = image.getBytes();
				var ptr = Module._malloc(bytes.length);
				var int64Ptr = {ptr: ptr, length: bytes.length};
				Module.HEAPU8.set(bytes, ptr);

				int64Ptrs.push_back(int64Ptr);
			});
		}
	});

	Object.extend(Module.BrushDecoder.prototype, {
		decode: function() {
			this.brushes = new Array();
			this.loader = 0;

			while (this.hasNext()) {
				var id = this.getBrushID();
				var brushID = id.null?null:id.value;
				var brush = Module.InkDecoder.getStrokeBrush(brushID);

				if (!brush) {
					brush = this.getParticleBrush();
					brush.id = brushID;

					this.decodeImages(brush.shapeTexture, this.getShapes());
					this.decodeImages(brush.fillTexture, this.getFills());
				}

				this.brushes.push(brush);
			}

			if (this.loader == 0)
				this.onComplete(this.brushes);
		},

		decodeImages: function(textureID, int64Ptrs) {
			var texture = GL.textures[textureID];
			var self = this;

			this.loader += int64Ptrs.size();

			if (int64Ptrs.size() > 1) {
				var mipmap = new Array();
				var cnt = int64Ptrs.size();

				for (var i = 0; i < int64Ptrs.size(); i++) {
					var image = Image.fromBytes(Module.readBytes(int64Ptrs.get(i)), function() {
						cnt--;
						self.loader--;

						if (cnt == 0) {
							Module.GLTools.completeMipMap(mipmap, function() {
								texture.mipmap = mipmap;
								Module.GLTools.initTexture(texture);

								if (self.loader == 0)
									self.onComplete(self.brushes);
							});
						}
					});

					mipmap.push(image);
				}
			}
			else {
				var image = Image.fromBytes(Module.readBytes(int64Ptrs.get(0)), function() {
					self.loader--;

					texture.image = this;
					Module.GLTools.initTexture(texture);

					if (self.loader == 0)
						self.onComplete(self.brushes);
				});
			}
		},

		onComplete: function(brushes) {}
	});

	Object.extend(Module.PathOperationEncoder.prototype, {
		encodeComposeStyle: function(style) {
			this.super.encodeComposeStyle.apply(this.super, arguments);
			this.nativeComposeStyle(style.width, style.color, style.blendMode, Module.getUnsignedInt(style.brush.id), Module.getUnsignedInt(style.randomSeed));
		},

		encodeComposePathPart: function(path, color, variableWidth, variableColor, endStroke) {
			this.super.encodeComposePathPart.apply(this.super, arguments);

			if (path.points.length > 0) {
				Module.writeBytes(path.points, function(points) {
					this.nativeComposePathPart(points, color, variableWidth, variableColor, endStroke);
				}, this);
			}
		},

		encodeAdd: function(strokes) {
			this.super.encodeAdd.apply(this.super, arguments);

			var addEncoder = this.nativeAdd();

			strokes.forEach(function(stroke) {
				Module.writeBytes(stroke.path.points, function(points) {
					var ink = {
						precision: Module.Stroke.config.encodePrecision,
						path: Module.PathBuilder.createPath(points, stroke.path.stride),
						width: stroke.width,
						color: stroke.color,
						ts: stroke.ts,
						tf: stroke.tf,
						randomSeed: Module.getUnsignedInt(stroke.randomSeed),
						blendMode: stroke.blendMode,
						paint: Module.getUnsignedInt(stroke.brush.id),
						id: Module.getUnsignedInt(stroke.id)
					};

					addEncoder.encodeStroke(ink)
				}, this);
			}, this);

			this.flush();
		},

		encodeRemove: function(group) {
			this.super.encodeRemove.apply(this.super, arguments);

			Module.writeBytes(group, function(group) {
				this.nativeEncodeRemove(group);
			}, this);
		},

		encodeUpdateColor: function(group, color) {
			this.super.encodeUpdateColor.apply(this.super, arguments);

			Module.writeBytes(group, function(group) {
				this.nativeEncodeUpdateColor(group, color);
			}, this);
		},

		encodeUpdateBlendMode: function(group, blendMode) {
			this.super.encodeUpdateBlendMode.apply(this.super, arguments);

			Module.writeBytes(group, function(group) {
				this.nativeEncodeUpdateBlendMode(group, blendMode);
			}, this);
		},

		encodeSplit: function(splits) {
			this.super.encodeSplit.apply(this.super, arguments);

			var splitEncoder = this.nativeSplit();
			var affectedArea;

			splits.forEach(function(split) {
				var intervals = new Module.VectorInterval();
				var intervalIDs = new Array();

				affectedArea = Module.RectTools.union(affectedArea, split.bounds);

				for (var i = 0; i < split.strokes.length; i++) {
					var strokeID = split.strokes[i].id;
					var interval = split.intervals[i];

					intervals.push(interval);
					if (strokeID) intervalIDs.push(strokeID);
				}

				Module.writeBytes(intervalIDs.toUint32Array(), function(intervalIDs) {
					splitEncoder.encodeStroke(split.id, affectedArea, intervals, intervalIDs);
				}, this);

				intervals.delete();
			}, this);

			this.flush();
		},

		encodeTransform: function(group, mat) {
			this.super.encodeTransform.apply(this.super, arguments);

			Module.writeBytes(group, function(group) {
				this.nativeEncodeTransform(group, mat);
			}, this);
		}
	});

	Object.extend(Module.PathOperationDecoder, {
		getPathOperationDecoderCallbacksHandler: function(implementation) {
			var implementationFunctions = ["onComposeStyle", "onComposePathPart", "onComposeAbort", "onAdd", "onRemove", "onUpdateColor", "onUpdateBlendMode", "onSplit", "onTransform"];
			implementationFunctions.forEach(function(name) {
				if (!implementation[name] || typeof implementation[name] != "function")
					throw new Error("Implementation of \"" + name + "\" missing. Please provide implementation.");
			});

			implementation = Object.clone(implementation);

			Object.extend(implementation, {
				composeStyle: function(user, style, paint) {
					style.brush = Module.InkDecoder.getStrokeBrush(paint, user);
					style.randomSeed = style.randomSeed.null?NaN:style.randomSeed.value;

					return style;
				},

				onAddStroke: function(user, strokes, ink) {
					if (!strokes) strokes = [];
					var brush = Module.InkDecoder.getStrokeBrush(ink.paint.null?null:ink.paint.value, user);
					var stroke = new Module.Stroke(brush, ink.path, ink.width, ink.color, ink.ts, ink.tf, ink.randomSeed.null?NaN:ink.randomSeed.value, ink.blendMode);
					if (!ink.id.null) stroke.id = ink.id.value;

					strokes.push(stroke);

					return strokes;
				},

				onSplitStroke: function(splits, id, affectedArea, intervals, intervalIDs) {
					if (!splits) splits = new Array();
					splits.affectedArea = Module.RectTools.union(splits.affectedArea, affectedArea);

					var split = {id: id, intervals: new Array()};
					splits.push(split);

					intervals.forEach(function(interval, i) {
						var splitInterval = {fromIndex: interval.fromIndex, toIndex: interval.toIndex, fromTValue: interval.fromTValue, toTValue: interval.toTValue};
						if (intervalIDs.length > 0) splitInterval.id = intervalIDs[i];

						split.intervals.push(splitInterval);
					});

					return splits;
				}
			});

			return Module.PathOperationDecoderCallbacksHandlerInterface.implement(implementation);
		}
	});

	Object.extend(Module.MatTools, {
		create: function(values) {
			var mat = this.super.create();

			if (values) {
				for (var name in values) {
					if (name in mat)
						mat[name] = values[name];
					else
						console.warn("Key '" + name + "' is not applicable key for the Matrix2D type");
				}
			}

			return mat;
		},

		makeTranslate: function(tx, ty) {
			if (arguments.length == 1) {
				var point = tx;

				tx = point.x;
				ty = point.y;
			}

			return this.create({tx: tx, ty: ty});
		},

		makeScale: function(sx, sy) {
			if (arguments.length == 1) sy = sx;
			return this.create({a: sx, d: sy});
		},

		makeRotate: function(alpha) {
			return this.create({
				a: Math.cos(alpha),
				b: Math.sin(alpha),
				c: -Math.sin(alpha),
				d: Math.cos(alpha)
			});
		},

		makeScaleAtPoint: function(scale, point) {
			return this.makeTransformAroundPoint(0, scale, point);
		},

		makeRotationAroundPoint: function(alpha, point) {
			return this.makeTransformAroundPoint(alpha, 1, point);
		},

		makeTransformAroundPoint: function(alpha, scale, point) {
			var sx = Math.cos(alpha) * (isNaN(scale)?scale.x:scale);
			var sy = Math.cos(alpha) * (isNaN(scale)?scale.y:scale);
			var sin = Math.sin(alpha);

			return this.create({
				a: sx, b: sin, c: -sin, d: sy,
				tx: point.x - point.x * sx + point.y * sin,
				ty: point.y - point.x * sin - point.y * sy
			});
		},

		fromCSS: function(element) {
			var result = this.create();
			var transform = element.getStyle("transform");

			if (transform != "none") {
				transform = transform.substring(transform.indexOf("(")+1, transform.indexOf(")")).split(/,\s*/g);

				result.a = parseFloat(transform[0]);
				result.b = parseFloat(transform[1]);
				result.c = parseFloat(transform[2]);
				result.d = parseFloat(transform[3]);
				result.tx = parseFloat(transform[4]);
				result.ty = parseFloat(transform[5]);
			}

			return result;
		},

		toCSS: function(mat) {
			return "matrix(" + this.toArray(mat).join(", ") + ")";
		},

		toArray: function(mat) {
			return [mat.a, mat.b, mat.c, mat.d, mat.tx, mat.ty];
		},

		transformPath: function (path, mat) {
			let result;

			Module.writeBytes(path.points, function(points) {
				this.super.transformPath(Module.PathBuilder.createPath(points, path.stride), mat || path.transform);
				result = Module.PathBuilder.createPath(Module.readFloats(points), path.stride);
			}, this);

			return result;
		},

		transformRect: function(rect, mat, discardCeil) {
			return discardCeil?this.super.transformRect(rect, mat):Module.RectTools.ceil(this.super.transformRect(rect, mat));
		}
	});

	var enums = [Module.BlendMode, Module.RotationMode, Module.PropertyName, Module.PropertyFunction, Module.InputPhase];

	enums.forEach(function(enm) {
		for (var name in enm) {
			if (typeof enm[name] == "object") {
				enm[name]["name"] = name;
				enm[name]["type"] = enm[name].constructor.name.split("_")[0];
				enm[enm[name].value] = enm[name];
			}
		}
	});

	Module.ready = true;
});

Module.getUnsignedInt = Module.getUnsignedLong = function(value) {
	if (value && !isNaN(value) && value >= 0)
		return {value: value, null: false};
	else
		return {value: 0, null: true};

	return result;
}

Module.isInt64Ptr = function(int64Ptr) {
	return int64Ptr && "ptr" in int64Ptr && "length" in int64Ptr && "byteLength" in int64Ptr;
}

/**
 * Read bytes from HEAP
 *
 * @param {Module.Int64Ptr} int64Ptr
 * @return {Uint8Array} bytes
 */
Module.readBytes = function(int64Ptr) {
	var data = Module.HEAPU8.subarray(int64Ptr.ptr, int64Ptr.ptr+int64Ptr.byteLength);
	var bytes = new Uint8Array(data, data.byteOffset, int64Ptr.length);

	return bytes;
}

/**
 * Read ints from HEAP
 *
 * @param {Module.Int64Ptr} int64Ptr
 * @return {Uint32Array} ints
 */
Module.readInts = function(int64Ptr) {
	var bytes = Module.readBytes(int64Ptr);
	var ints = new Uint32Array(bytes.buffer);

	return ints;
}

/**
 * Read floats from HEAP
 *
 * @param {Module.Int64Ptr} int64Ptr
 * @return {Float32Array} floats
 */
Module.readFloats = function(int64Ptr) {
	var bytes = Module.readBytes(int64Ptr);
	var floats = new Float32Array(bytes.buffer);

	return floats;
}

/**
 * Handler for extracted data
 *
 * @callback WriteBytesCallback
 * @param {Module.Int64Ptr} int64Ptr
 * @see Module.writeBytes
 */

/**
 * Write bytes to HEAP
 *
 * @param {TypedArray} data
 * @param {WriteBytesCallback} callback
 * @param {Object} [context={}] callback context
 */
Module.writeBytes = function(data, callback, context) {
	if (Module.isInt64Ptr(data)) {
		callback.call(context || {}, data);
		return;
	}
	else if (!ArrayBuffer.isTypedArray(data))
		throw new Error("data is not TypedArray object");

	var ptr = Module._malloc(data.byteLength);
	var int64Ptr = {ptr: ptr, length: data.length, byteLength: data.byteLength};
	var bytes = (data instanceof Uint8Array)?data:new Uint8Array(data.buffer, data.byteOffset, data.byteLength);

	try {
		Module.HEAPU8.set(bytes, ptr);
		callback.call(context || {}, int64Ptr);
	}
	finally {
		Module._free(ptr);
	}
}

/**
 * Creating of layer without specified size fallbacks to default layer size.
 * It defaults to screen size.
 *
 * @param {int} width
 * @param {int} height
 */
Module.setDefaultLayerSize = function(width, height) {
	if (width > 4000) throw new Error(`Max texture size width (4000) exceeded: ${width}`);
	if (height > 4000) throw new Error(`Max texture size height (4000) exceeded: ${height}`);
	if (!height) height = width;

	Module.DEFAULT_LAYER_SIZE = {width: width, height: height};
}

/**
 * Creating of layer without specified scaleFactor fallbacks to default scaleFactor.
 * It defaults to 1.
 *
 * @param {float} scaleFactor number between 0 and 1
 */
Module.setDefaultScaleFactor = function(scaleFactor) {
	if (scaleFactor > 0 && scaleFactor <= 1)
		Module.DEFAULT_SCALE_FACTOR = scaleFactor;
	else
		throw new Error(`Scale factor should be a number between 0 and 1: ${scaleFactor}`);
}

/**
 * Storage for a bitmap data that can be manipulated or presented on the screen.
 * It corresponds to an GL texture or a render buffer.
 * It defines the ration between actual pixels and the abstract layer dimensions.
 *
 * @class Module.GenericLayer
 * @since version 1.3
 * @abstract
 */
Module.GenericLayer = function() {
	throw new BindingError("GenericLayer has no accessible constructor");
}

/**
 * Layer width
 *
 * @memberof Module.GenericLayer.prototype
 * @member {int} width
 */
Object.defineProperty(Module.GenericLayer.prototype, "width", {
	get: function() {
		return this.layer.width;
	}
});

/**
 * Layer height
 *
 * @memberof Module.GenericLayer.prototype
 * @member {int} height
 */
Object.defineProperty(Module.GenericLayer.prototype, "height", {
	get: function() {
		return this.layer.height;
	}
});

/**
 * The bounds of the layer. Equals to (0, 0, width, height).
 *
 * @memberof Module.GenericLayer.prototype
 * @member {Module.Rectangle} bounds
 */
Object.defineProperty(Module.GenericLayer.prototype, "bounds", {
	get: function() {
		return Module.RectTools.create(this.layer.bounds.left, this.layer.bounds.bottom, this.layer.bounds.width, this.layer.bounds.height);
	}
});

Object.extend(Module.GenericLayer.prototype, {
	/**
	 * Clears layer area with a color
	 *
	 * @method Module.GenericLayer.prototype.clear
	 * @param {(Module.Rectangle | Module.Color)} [rect=bounds] area to clear
	 * @param {Module.Color} [color=Module.Color.TRANSPERENT]
	 */
	clear: function(rect, color) {
		if (!color) {
			if (Module.Color.is(rect)) {
				color = rect;
				rect = null;
			}
			else
				color = Module.Color.TRANSPERENT;
		}
		else if (Module.Color.is(rect))
			throw new Error("`clear` first argument should be Module.Rectangle");

		var wrect = rect ? Module.makeRectFromFlippedRect(rect) : null;

		this.renderingContext.setTarget(this.layer, wrect);
		this.renderingContext.clearColor(color);

		if (wrect) {
			this.renderingContext.disableTargetClipRect();
		}
	},

	/**
	 * Draws points with a brush over the layer
	 *
	 * @method Module.GenericLayer.prototype.draw
	 * @param {Module.Stroke} stroke model instance
	 * @return {Module.Rectangle} affected area
	 */
	draw: function(stroke) {
		if (!Module.Stroke.validatePath(stroke.path)) return null;

		var drawContext = null;

		if (stroke.brush instanceof Module.ParticleBrush && !isNaN(stroke.randomSeed)) {
			drawContext = new Module.StrokeDrawContext();
			drawContext.randomSeed = stroke.randomSeed;
		}

		var dirtyArea = this.drawStroke(stroke.brush, stroke.path, stroke.width, stroke.color, true, true, stroke.ts, stroke.tf, drawContext);

		if (drawContext) drawContext.delete();
		return dirtyArea;
	},

	/**
	 * Draws points with a brush over the layer
	 *
	 * @method Module.GenericLayer.prototype.drawStroke
	 * @param {Module.StrokeBrush} brush instance of the Module.StrokeBrush class that determines how the stroke is going to be rendered
	 * @param {Module.Path} path points to draw
	 * @param {float} width The width of the stroke. If the stroke has a variable thickness which is included in the control points array, this parameter must be NaN.
	 * @param {Module.Color} color stroke color
	 * 		If the stroke has a variable alpha which is included in the control points array, alpha component must be NaN.
	 * @param {boolean} roundCapBeginning Cap the stroke with a circle at the start
	 * @param {boolean} roundCapEnding Cap the stroke with a circle at the end
	 * @param {float} ts The starting value for the Catmull-Roll spline parameter
	 * @param {float} tf The final value for the Catmull-Rom spline parameter
	 * @param {Module.StrokeDrawContext} drawContext Module.StrokeDrawContext instance (contains previous path point), applicable only when brush is Module.ParticleBrush
	 *
	 * @return {Module.Rectangle} affected area
	 */
	drawStroke: function(brush, path, width, color, roundCapBeggining, roundCapEnding, ts, tf, drawContext) {
		if (!Module.Stroke.validatePath(path)) return null;

		var dirtyArea;

		Module.writeBytes(path.points, function(points) {
			if (path.transform && !Module.MatTools.isIdentity(path.transform)) {
				Module.MatTools.transformPath(Module.PathBuilder.createPath(points, path.stride), path.transform);
				if (!isNaN(width)) width *= Math.sqrt(path.transform.a*path.transform.a + path.transform.c*path.transform.c);
			}

			points = Module.readFloats(points);

			this.renderingContext.setTarget(this.layer);
			dirtyArea = this.renderingContext.drawStroke(brush, points, path.stride, width, color, roundCapBeggining, roundCapEnding, ts, tf, drawContext, true);

			if (dirtyArea)
				dirtyArea = Module.RectTools.create(dirtyArea.left, dirtyArea.bottom, dirtyArea.width, dirtyArea.height);
		}, this);

		if (path.transform && !Module.MatTools.isIdentity(path.transform) && Module.isInt64Ptr(path.points))
			Module.MatTools.transformPath(path, Module.MatTools.invert(path.transform));

		return dirtyArea;
	},

	/**
	 * Fills path with color
	 *
	 * @method Module.GenericLayer.prototype.fillPath
	 * @param {Module.Path} path control points to work with it
	 * @param {Module.Color} color fill color
	 * @param {boolean} antiAliasing is anti aliasing is enabled
	 */
	fillPath: function(path, color, antiAliasing) {
		if (!Module.Stroke.validatePath(path)) return;

		Module.writeBytes(path.points, function(points) {
			this.renderingContext.setTarget(this.layer);
			this.renderingContext.fillPath(points, path.stride, color, !!antiAliasing);
		}, this);
	},

	/**
	 * Draws the content of the 'source'. The 'source' must use a texture storage.
	 *
	 * @method Module.GenericLayer.prototype.blend
	 * @param {Module.GenericLayer} source layer to be drawn
	 * @param {Module.BlendOptions} options blending configuration
	 */
	blend: function(source, options) {
		if (!options) options = {};
		if (!options.mode) options.mode = Module.BlendMode.NORMAL;

		if (options.rect && !options.transform) {
			options.sourceRect = options.rect;
			options.destinationRect = options.rect;
		}

		if (options.transform && options.destinationRect) throw new Error("`destinationRect` is not applicable with `transform`");
		if (options.sourceRect && !options.destinationRect) throw new Error("With `sourceRect`, `destinationRect` is required");
		if (options.destinationRect && !options.sourceRect) throw new Error("With `destinationRect`, `sourceRect`is required");

		this.renderingContext.setTarget(this.layer, options.clipRect?Module.makeRectFromFlippedRect(options.clipRect):undefined);
		if (typeof options.flipY == "boolean") source.layer.flipY = options.flipY;

		if (options.transform && options.rect) {
			// rect should be slightly bigger (width += 2 * MAX_SCALE_FACTOR, height += 2 * MAX_SCALE_FACTOR)
			// var rect = Module.RectTools.create(options.sourceRect.left - 2, options.sourceRect.top - 2, options.sourceRect.width + 4, options.sourceRect.height + 4);

			var sourceQuad = Module.makeQuadFromFlippedRect(options.rect);
			var destinationQuad = sourceQuad.transform(Module.makeMat4FromMatrix2D(options.transform));

			this.renderingContext.drawLayer(source.layer, sourceQuad, destinationQuad, options.mode);
		}
		else if (options.transform)
			this.renderingContext.drawLayerWithTransform(source.layer, Module.makeMat4FromMatrix2D(options.transform), options.mode);
		else if (options.sourceRect && options.destinationRect)
			this.renderingContext.drawLayer(source.layer, Module.makeQuadFromFlippedRect(options.sourceRect), Module.makeQuadFromFlippedRect(options.destinationRect), options.mode);
		else
			this.renderingContext.drawLayerWithTransform(source.layer, null, options.mode);
	},

	/**
	 * Read pixels data
	 *
	 * @method Module.GenericLayer.prototype.readPixels
	 * @param {Module.Rectangle} [rect=bounds] area to read
	 */
	readPixels: function(rect) {
		this.renderingContext.setTarget(this.layer);
		return this.renderingContext.readPixels(rect ? Module.makeRectFromFlippedRect(rect) : null);
	},

	/**
	 * Write pixels data
	 *
	 * @method Module.GenericLayer.prototype.writePixels
	 * @param {Uint8Array} bytes pixels data
	 * @param {Module.Rectangle} [rect=bounds] area to write
	 */
	writePixels: function(bytes, rect) {
		if (!bytes) throw new Error("GenericLayer$writePixels 'bytes' parameter is required");
		if (!(bytes instanceof Uint8Array)) throw new Error("GenericLayer$writePixels 'bytes' parameter is not instance of Uint8Array");

		this.renderingContext.setTarget(this.layer);
		this.renderingContext.writePixels(rect ? Module.makeRectFromFlippedRect(rect) : null, bytes);
	},

	/**
	 * Resize layer
	 *
	 * @method Module.InkCanvas.prototype.resize
	 * @param {int} width
	 * @param {int} height
	 */
	resize: function(width, height) {
		this.layer.resize(width, height);
	},
});

/**
 * Creates ink canvas connected with html canvas.
 * This layer is the target of screen rendering.
 *
 * @class Module.InkCanvas
 * @extends Module.GenericLayer
 * @since version 1.0
 * @param {HTMLCanvasElement} canvas DOM element related with ink canvas in web environment or WebGL provider
 * @param {int} width initial width
 * @param {int} height initial height
 * @param {Module.WebGLContextAttributes} [webGLContextAttributes] WebGL context configuration
 */
Module.InkCanvas = function(canvas, width, height, webGLContextAttributes) {
	if (!canvas || typeof canvas.getContext != "function") throw new Error("WebGL context provider is required");
	if (!(width > 0 && height > 0)) throw new Error("width and height are required and should be positive whole numbers");

	/**
	 * Drawing surface
	 *
	 * @readonly
	 * @memberof Module.InkCanvas.prototype
	 * @member {HTMLCanvasElement} surface
	 */
	Object.defineProperty(this, "surface", {value: canvas});

	canvas.width = width;
	canvas.height = height;

	var renderingContext = new Module.RenderingContext(canvas, webGLContextAttributes || {});
	Object.defineProperty(this, "renderingContext", {value: renderingContext});

	this.activate();

	if (!Module.DEFAULT_LAYER_SIZE) {
		if (typeof screen == "undefined")
			Module.DEFAULT_LAYER_SIZE = {width: width, height: height};
		else {
			let size = Math.max(screen.width, screen.height);
			Module.DEFAULT_LAYER_SIZE = {width: size, height: size};
		}
	}

	if (!Module.DEFAULT_SCALE_FACTOR)
		Module.DEFAULT_SCALE_FACTOR = 1;

	var layer = this.renderingContext.createLayer(width, height, Module.DEFAULT_SCALE_FACTOR);
	layer.init3(null, null, null, false);

	if (ENVIRONMENT == EnvironmentType.WEB)
		layer.flipY = true;

	Object.defineProperty(this, "layer", {
		get: function() {
			this.activate();
			return layer;
		}
	});

	/**
	 * Drawing surface context
	 *
	 * @readonly
	 * @memberof Module.InkCanvas.prototype
	 * @member {WebGLRenderingContext} ctx
	 */
	Object.defineProperty(this, "ctx", {
		get: function() {
			return this.renderingContext.willGLContext.gl;
		}
	});

	if (webGLContextAttributes && webGLContextAttributes.preserveDrawingBuffer) {
		Object.defineProperty(this, "frameID", {value: NaN});

		this.requestAnimationFrame = function(callback) {
			throw new Error("This usage is not applicable when preserve drawing buffer");
			// callback(Date.now());
		};
	}
	else if (Module.ownBackbuffer) {
		var self = this;

		this.requestAnimationFrame = function(callback) {
			self.frameID = requestAnimationFrame(callback);
		};

		this.frameID = -1;
	}
	else
		Module.InkCanvas.implementBackbuffer.bind(this)();
}

Module.InkCanvas.extends(Module.GenericLayer);

Module.InkCanvas.implementBackbuffer = function() {
	if (arguments.callee.caller != Module.InkCanvas.prototype.constructor)
		throw new Error("Backbuffer implementation is part from InkCanvas implementation");

	var backbuffer = this.createLayer();
	var currentFrameUpdates = new Array();

	Object.defineProperty(this, "backbuffer", {
		get: function() {
			this.activate();
			return backbuffer;
		}
	});

	/**
	 * Adds callback to queue, executed on first animation frame.
	 * This method is not applicable when `preserveDrawingBuffer` WebGL context attribute is setted.
	 *
	 * @method Module.InkCanvas.prototype.requestAnimationFrame
	 * @param {Function} callback A parameter specifying a function to call when it's time to update your animation for the next repaint.
	 *   The callback has one single argument, a DOMHighResTimeStamp,
	 *   which indicates the current time (the time returned from Performance.now()) for when requestAnimationFrame starts to fire callbacks.
	 * @param {boolean} present is callback affects canvas
	 * @return {int} animation frame ID
	 */
	this.requestAnimationFrame = function(callback, present) {
		if (present) this.present = true;
		currentFrameUpdates.add(callback);
		return this.frameID;
	};

	var blend = this.blend.bind(this);

	var present = function(timestamp) {
		while (currentFrameUpdates.length > 0) {
			var callback = currentFrameUpdates.shift();
			callback(timestamp);
		}

		if (this.present) {
			delete this.present;
			blend(this.backbuffer, {mode: Module.BlendMode.NONE});
		}

		this.frameID = requestAnimationFrame(present);
	}.bind(this);

	this.frameID = requestAnimationFrame(present);

	this.clear = function(rect, color) {
		this.backbuffer.clear(rect, color);
		this.present = true;
	};

	this.draw = function(stroke) {
		this.backbuffer.draw(stroke);
		this.present = true;
	};

	this.drawStroke = function(brush, path, width, color, roundCapBeggining, roundCapEnding, ts, tf, drawContext) {
		var dirtyArea = this.backbuffer.drawStroke(brush, path, width, color, roundCapBeggining, roundCapEnding, ts, tf, drawContext);
		this.present = true;

		return dirtyArea;
	};

	this.fillPath = function(path, color, antiAliasing) {
		this.backbuffer.fillPath(path, color, antiAliasing);
		this.present = true;
	};

	this.blend = function(source, options) {
		this.backbuffer.blend(source, options);
		this.present = true;
	};

	this.readPixels = function(rect) {
		return this.backbuffer.readPixels(rect);
	};

	this.writePixels = function(bytes, rect) {
		this.backbuffer.writePixels(bytes, rect);
		this.present = true;
	};
	/*
	var resize = this.resize.bind(this)

	this.resize = function(width, height) {
		resize(width, height);
		this.backbuffer.resize(width, height);
	};
	*/
}

Object.extend(Module.InkCanvas.prototype, {
	/**
	 * Creates OffscreenLayer instance
	 *
	 * @method Module.InkCanvas.prototype.createLayer
	 * @param {Module.OffscreenLayerOptions} options layer configuration
	 * @return {Module.OffscreenLayer} layer for offscreen rendering
	 */
	createLayer: function(options) {
		if (!options) options = {};

		var layer;

		if (options.renderbuffer) {
			if (!options.framebuffer) throw new Error("`framebuffer` is required when `renderbuffer` available");
			if (!(options.framebuffer instanceof WebGLFramebuffer)) throw new Error("`framebuffer` is not instance of WebGLFramebuffer");
			if (!(options.renderbuffer instanceof WebGLRenderbuffer)) throw new Error("`renderbuffer` is not instance of WebGLRenderbuffer");

			layer = this.renderingContext.createLayerFromGLBuffers(options.framebuffer, options.renderbuffer, !!options.ownGlResources);
		}
		else if (options.framebuffer) {
			if (!(options.framebuffer instanceof WebGLFramebuffer)) throw new Error("`framebuffer` is not instance of WebGLFramebuffer");

			layer = this.renderingContext.createLayerFromGLFramebuffer(options.framebuffer, !!options.ownGlResources);
		}
		else if (options.texture) {
			if (!(options.texture instanceof WebGLTexture)) throw new Error("`texture` is not instance of WebGLTexture");

			if (options.width > 0 && options.height > 0) {
				layer = this.renderingContext.createLayer(options.width, options.height, Module.DEFAULT_SCALE_FACTOR);
				layer.init3(null, null, options.texture, !!options.ownGlResources);
			}
			else if (options.texture.image) {
				layer = this.renderingContext.createLayer(options.texture.image.width, options.texture.image.height, Module.DEFAULT_SCALE_FACTOR);
				layer.init3(null, null, options.texture, !!options.ownGlResources);
			}
			else
				throw new Error("`width` and `height` are required when `texture` is available");
		}
		else if (options.width > 0 && options.height > 0) {
			if (options.scaleFactor > 0) {
				layer = this.renderingContext.createLayer(options.width, options.height, options.scaleFactor);
				layer.init1(true);
			}
			else {
				layer = this.renderingContext.createLayer(options.width, options.height, Module.DEFAULT_SCALE_FACTOR);
				layer.init1(true);
			}
		}
		else {
			layer = this.renderingContext.createLayer(Module.DEFAULT_LAYER_SIZE.width, Module.DEFAULT_LAYER_SIZE.height, Module.DEFAULT_SCALE_FACTOR);
			layer.init1(true);
		}

		var OffscreenLayer = Function.create("OffscreenLayer", function(layer, renderingContext) {
			this.layer = layer;
			this.renderingContext = renderingContext;

			this.delete = function() {
				layer.delete();
			};

			this.isDeleted = function() {
				return layer.isDeleted();
			};

			this.deleteLater = function() {
				layer.deleteLater();
				return this;
			};
		});

		OffscreenLayer.extends(Module.GenericLayer);

		Object.defineProperty(OffscreenLayer.prototype, "renderbuffer", {
			get: function() {
				return this.layer.renderbuffer;
			}
		});

		Object.defineProperty(OffscreenLayer.prototype, "framebuffer", {
			get: function() {
				return this.layer.framebuffer;
			}
		});

		Object.defineProperty(OffscreenLayer.prototype, "texture", {
			get: function() {
				return this.layer.colorTexture;
			}
		});

		return new OffscreenLayer(layer, this.renderingContext);
	},

	/**
	 * Resize canvas
	 *
	 * @method Module.InkCanvas.prototype.resize
	 * @param {int} width
	 * @param {int} height
	 */
	resize: function(width, height) {
		this.surface.width = width;
		this.surface.height = height;
		this.layer.setDimensions(width, height);
	},

	activate: function() {
		Module.canvas = this.surface;

		if (ENVIRONMENT == EnvironmentType.NODE)
			global.GLctx = this.renderingContext.willGLContext.gl;
		else
			GLctx = this.renderingContext.willGLContext.gl;
	},

	delete: function() {
		if (ENVIRONMENT == EnvironmentType.WEB)
			cancelAnimationFrame(this.frameID);

		this.layer.delete();
		if (this.backbuffer) this.backbuffer.delete();
	},

	deleteLater: function() {
		this.layer.deleteLater();
		if (this.backbuffer) this.backbuffer.deleteLater();

		return this;
	},

	isDeleted: function() {
		return this.layer.isDeleted();
	}
}, true);

/**
 * Stroke model
 *
 * @class Module.Stroke
 * @since version 1.4
 *
 * @param {Module.StrokeBrush} brush
 * @param {Module.Path} path
 * @param {float} width
 * @param {Module.Color} color
 * @param {float} ts
 * @param {float} tf
 * @param {int} [randomSeed=NaN]
 * @param {Module.BlendMode} [blendMode=Module.BlendMode.NORMAL]
 */
Module.Stroke = function(brush, path, width, color, ts, tf, randomSeed, blendMode) {
	this.brush = brush;
	this.brush.mutable = true;
	this.path = path;
	this.width = width;

	this.color = Object.clone(color);
	Module.Color.init(this.color);

	this.ts = ts;
	this.tf = tf;
	this.randomSeed = (randomSeed && !isNaN(randomSeed))?randomSeed:NaN;
	this.blendMode = blendMode || Module.BlendMode.NORMAL;

	this.initPath();

	if (Module.Stroke.config.autoNormalize) this.normalize();
	if (typeof Module.Stroke.config.generateID == "function") this.id = Module.Stroke.config.generateID(this);
}

/**
 * Stroke length
 *
 * @memberof Module.Stroke
 * @member {int} length
 */
Object.defineProperty(Module.Stroke.prototype, "length", {enumerable: true, get: function() {return this.path.length;}});

/**
 * Stroke bounds
 *
 * @memberof Module.Stroke
 * @member {Module.Rectangle} bounds
 */
Object.defineProperty(Module.Stroke.prototype, "bounds", {enumerable: true, get: function() {return this.path.bounds;}});

Object.defineProperty(Module.Stroke.prototype, "data", {enumerable: true, get: function() {return {path: {points: this.path.points, stride: this.path.stride}, width: this.width, color: this.color, ts: this.ts, tf: this.tf, randomSeed: this.randomSeed, blendMode: this.blendMode};}});

Object.extend(Module.Stroke, {
	/**
	 * Strokes configuration
	 *
	 * @memberof Module.Stroke
	 * @member {Module.StrokesConfiguration} config
	 */
	config: {
		encodePrecision: 2,
		autoNormalize: false,
		generateID: undefined
	},

	/**
	 * Creates stroke point object
	 *
	 * @method Module.Stroke.createPoint
	 * @param {int} [x=Infinity]
	 * @param {int} [y=Infinity]
	 * @param {float} [width=Infinity]
	 * @param {float} [alpha=Infinity]
	 * @return {Module.Point2D} new point, with args as properties
	 */
	createPoint: function(x, y, width, alpha) {
		return {
			x: (typeof x == "undefined" || x == null || isNaN(x))?Infinity:x,
			y: (typeof y == "undefined" || y == null || isNaN(y))?Infinity:y,
			width: (typeof width == "undefined" || width == null || isNaN(width))?Infinity:width,
			alpha: (typeof alpha == "undefined" || alpha == null || isNaN(alpha))?Infinity:alpha
		};
	},

	fromJSON: function(brush, data) {
		if (!data.width) data.width = NaN;
		if (!data.color.alpha) data.color.alpha = NaN;
		if (!data.path) data.path = Module.PathBuilder.createPath(data.points, data.stride);

		if (data.path.type) {
			if (data.path.type != "ARRAY") {
				if (!(typeof Buffer)) throw new Error("Buffer not found, unable to deserialize points. Please provide Buffer in global scope.");
				let buffer;

				switch (data.path.type) {
					case "BUFFER":
						buffer = Buffer.from(data.path.points);
						break;
					case "BASE64":
						buffer = Buffer.from(data.path.points, "base64");
						break;
					default:
						throw new Error("Invalid serial type provided: " + data.path.type);
				}

				let bytes = new Uint8Array(buffer);
				data.path.points = new Float32Array(bytes.buffer);

				delete data.path.type;
			}
		}

		return new Module.Stroke(brush, data.path, data.width, data.color, data.ts, data.tf, data.randomSeed, Module.BlendMode[data.blendMode]);
	},

	validatePath: function(path) {
		if (!path) return false;

		if (Module.isInt64Ptr(path.points))
			return true;

		if (path.points.length < 4 * path.stride) {
			if (path.points.length > 0)
				Module.printErr("WARNING: Less than needed minimum of points passed (At least 4 points are needed to define a path)!");

			return false;
		}

		if (path.points.length % path.stride != 0) {
			Module.printErr("WARNING: The points array size (" + path.points.length + ") is should be a multiple of the stride property (" + path.stride + ")!");
			return false;
		}

		return true;
	},

	normalizeStrokeData: function(data) {
 		if (!data.path) throw new Error("StrokeData path is required");

 		if (!("width" in data)) data.width = NaN;
 		if (!("ts" in data)) data.ts = 0;
 		if (!("tf" in data)) data.tf = 1;
 		if (!("randomSeed" in data)) data.randomSeed = NaN;
 		if (!("blendMode" in data)) data.blendMode = Module.BlendMode.NORMAL;
	}
});

Object.extend(Module.Stroke.prototype, {
	initPath: function() {
		Object.defineProperty(this.path, "length", {enumerable: true, get: function() {return this.points.length / this.stride;}});

		Object.extend(this.path, {
			get: function(i) {
				var base = i * this.stride;
				var point = {x: this.points[base], y: this.points[base + 1]};

				if (this.index.width > -1) point.width = this.points[base + this.index.width];
				if (this.index.alpha > -1) point.alpha = this.points[base + this.index.alpha];

				return point;
			},

			set: function(i, point) {
				var base = i * this.stride;

				this.points[base] = point.x;
				this.points[base + 1] = point.y;
				if (this.index.width > -1) this.points[base + this.index.width] = point.width;
				if (this.index.alpha > -1) this.points[base + this.index.alpha] = point.alpha;
			},

			getPart: function(fromIndex, toIndex) {
				return {
					points: new Float32Array(this.points.subarray(fromIndex * this.stride, (toIndex+1) * this.stride)),
					stride: this.stride,
					index: this.index
				};
			},

			getAverageWidth: function() {
				var result = 0;

				if (this.index.width > -1) {
					var width = 0;

					for (var i = 0; i < this.length; i++)
						width += this.get(i).width;

					result = width / this.length;
				}
				else
					result = this.width;

				return result;
			},

			calculateBounds: function(width, scattering) {
				this.bounds = null;
				this.segments = new Array(this.length - 3);

				Module.writeBytes(this.points, function(points) {
					for (var i = 0; i < this.segments.length; i++) {
						var segment = Module.calculateSegmentBounds(points, this.stride, width, i, scattering || 0);

						this.segments[i] = segment;
						this.bounds = Module.RectTools.union(this.bounds, segment);
					}
				}, this);
			},

			transformBounds: function(mat) {
				this.bounds = Module.MatTools.transformRect(this.bounds, mat);
			},

			segmentsBounds: function() {
				var segments = new Float32Array(this.segments.length * 4);

				this.segments.forEach(function(segment, i) {
					segments[i * 4] = segment.left;
					segments[i * 4 + 1] = segment.top;
					segments[i * 4 + 2] = segment.width;
					segments[i * 4 + 3] = segment.height;
				});

				return segments;
			}
		});

		var points = this.path.points;

		if (Module.isInt64Ptr(points)) {
			this.path.calculateBounds(this.width, this.brush.scattering);
			this.path.points = Module.readFloats(points);
		}
		else {
			if (points instanceof Array)
				this.path.points = points.toFloat32Array();
			else if (!(points instanceof Float32Array))
				throw new Error("Invalid path points type");
			else if (points.byteOffset > 0)
				this.path.points = new Float32Array(points);

			if (!this.path.bounds || !this.path.segments)
				this.path.calculateBounds(this.width, this.brush.scattering);
		}

		if (!this.path.index) {
			this.path.index = new Object();

			switch (this.path.stride) {
				case 2:
					this.path.index.width = -1;
					this.path.index.alpha = -1;

					break;
				case 3:
					this.path.index.width = isNaN(this.width)?2:-1;
					this.path.index.alpha = isNaN(this.width)?-1:2;

					break;
				case 4:
					this.path.index.width = 2;
					this.path.index.alpha = 3;

					break;
				default:
					throw new Error("Invalid stride: " + this.path.stride);
			}
		}
	},

	/**
	 * Normalize path points (floats) with encode precision
	 *
	 * @method Module.Stroke.prototype.normalize
	 */
	normalize: function() {
		let factor = Math.pow(10, Module.Stroke.config.encodePrecision);

		this.path.points.forEach((float, index) => {
			this.path.points[index] = Math.round(float * factor) / factor;
		});
	},

	getAverageWidth: function() {
		return this.path.getAverageWidth();
	},

	/**
	 * @method Module.Stroke.prototype.getPoint
	 * @param {int} idx
	 * @return {Module.Point2D} point on idx
	 */
	// TODO: rename to: pointAt
	getPoint: function(idx) {
		return this.path.get(idx);
	},

	/**
	 * Sets point stroke
	 *
	 * @method Module.Stroke.prototype.setPoint
	 * @param {int} idx
	 * @param {Module.Point2D} point stroke point
	 */
	setPoint: function(idx, point) {
		this.path.set(idx, point);
	},

	/**
	 * When stroke path is modified, bounds should be updated
	 *
	 * @method Module.Stroke.prototype.updateBounds
	 */
	updateBounds: function() {
		this.path.calculateBounds(this.width, this.brush.scattering);
	},

	/**
	 * Split stroke
	 *
	 * @method Module.Stroke.prototype.split
	 * @param {Module.VectorInterval} intervals
	 * @param {Module.IntersectorTargetType} type
	 * @return {Module.Split} intersection result
	 */
	split: function(intervals, type) {
		var result;

		var dirtyArea;
		var intersect = false;

		var strokes = new Array();
		var strokesIntervals = new Array();
		var holes = new Array();
		var selected = new Array();

		for (var i = 0; i < intervals.size(); i++) {
			var interval = intervals.get(i);
			var subStroke = this.subStroke(interval.fromIndex, interval.toIndex, interval.fromTValue, interval.toTValue);

			if (interval.inside) {
				intersect = true;
				dirtyArea = Module.RectTools.union(dirtyArea, subStroke.bounds);
			}

			if (type == Module.IntersectorTargetType.STROKE) {
				if (interval.inside)
					holes.push(interval);
				else {
					strokesIntervals.push(interval);
					strokes.push(subStroke);
				}
			}
			else {
				if (interval.inside)
					selected.push(subStroke);

				strokesIntervals.push(interval);
				strokes.push(subStroke);
			}
		}

		result = {intersect: intersect};

		if (intersect) {
			result.stroke = this;
			result.bounds = dirtyArea;
			result.strokes = strokes;
			result.intervals = strokesIntervals;

			if (type == Module.IntersectorTargetType.STROKE)
				result.holes = holes;
			else
				result.selected = selected;
		}

		return result;
	},

	/**
	 * Creates new stroke based on current
	 *
	 * @method Module.Stroke.prototype.subStroke
	 * @param {int} fromIndex start point idx
	 * @param {int} toIndex end point idx
	 * @param {float} fromTValue
	 * @param {float} toTValue
	 * @return {Module.Stroke} new stroke
	 */
	subStroke: function(fromIndex, toIndex, fromTValue, toTValue) {
		if (fromIndex == 0 && toIndex == this.length - 1 && fromTValue == this.ts && toTValue == this.tf)
			return this;

		var path = this.path.getPart(fromIndex, toIndex);
		var stroke = new Module.Stroke(this.brush, path, this.width, this.color, fromTValue, toTValue, this.randomSeed, this.blendMode);

		return stroke;
	},

	/**
	 * Transform stroke
	 *
	 * @method Module.Stroke.prototype.transform
	 * @param {Module.Matrix2D} mat transform matrix
	 */
	transform: function(mat) {
		Module.writeBytes(this.path.points, function(points) {
			var path = Module.PathBuilder.createPath(points, this.path.stride);
			Module.MatTools.transformPath(path, mat);

			this.path.points = Module.readFloats(points);
		}, this);

		this.path.calculateBounds(this.width, this.brush.scattering);
	},

	/**
	 * Serialize stroke with JSON
	 *
	 * @method Module.Stroke.prototype.toJSON
	 * @param {string} [type=AUTO] AUTO, ARRAY, BUFFER, BASE64
	 * <ul>
	 *   <li>AUTO check for Buffer support and defaults to BUFFER else ARRAY</li>
	 * 	 <li>ARRAY plain array from floats</li>
	 * 	 <li>BUFFER Buffer.toJSON is used</li>
	 * 	 <li>BASE64 Buffer.toString("base64") is used</li>
	 * </ul>
	 */
	toJSON: function(type) {
		if (!type) type = "AUTO";
		if (type == "AUTO") type = (typeof Buffer) ? "BUFFER" : "ARRAY";

		let points;

		if (type == "ARRAY")
			points = this.path.points.toArray();
		else {
			if (!(typeof Buffer)) throw new Error("Buffer not found, unable to serialize points. Please provide Buffer in global scope.");
			let buffer = Buffer.from(this.path.points.buffer);

			switch (type) {
				case "BUFFER":
					points = buffer.toJSON();
					break;
				case "BASE64":
					points = buffer.toString("base64");
					break;
				default:
					throw new Error("Invalid serial type provided: " + type);
			}
		}

		var stroke = {
			path: {
				type: type,
				points: points,
				stride: this.path.stride,
				bounds: this.path.bounds,
				segments: this.path.segments,
				transform: this.path.transform
			},
			width: this.width,
			color: this.color,
			ts: this.ts,
			tf: this.tf,
			randomSeed: this.randomSeed,
			blendMode: this.blendMode.value
		};

		return stroke;
	}
});

/**
 * Stroke painter
 *
 * @class Module.StrokeRenderer
 * @since version 1.3
 * @param {Module.InkCanvas} canvas view layer
 * @param {(Module.GenericLayer | Module.OffscreenLayerOptions)} [layerORoptions]
 *  If argument is layer, it is a buffer layer for stroke building. In this case preliminary curve draw is over canvas.
 *  When not available is auto created with default size (device screen bounds) or user defined size.
 */
Module.StrokeRenderer = function(canvas, layerORoptions) {
	this.canvas = canvas;

	var layer = (layerORoptions instanceof Module.GenericLayer)?layerORoptions:null;
	var options = (layerORoptions && !layer)?layerORoptions:new Object();

	this.layer = layer || canvas.createLayer(options);
	this.layerOptions = options;

	this.ownLayer = !layer;

	this.restart = true;
}

Object.extend(Module.StrokeRenderer.prototype, {
	/**
	 * Defines rendering brush
	 *
	 * @memberof Module.StrokeRenderer
	 * @member {Module.StrokeBrush} brush
	 */
	brush: null,

	/**
	 * Defines rendering color
	 *
	 * @memberof Module.StrokeRenderer
	 * @member {Module.Color} color
	 */
	color: null,

	/**
	 * Defines stroke width. Default value is NaN.
	 * NaN value instructs 'Module.StrokeRenderer' that the path has a variable width
	 * which will be provided by the control points array.
	 *
	 * @memberof Module.StrokeRenderer
	 * @member {float} width
	 */
	width: NaN,

	/**
	 * Random generator seed, applicable only when brush is Module.ParticleBrush
	 *
	 * @memberof Module.StrokeRenderer
	 * @member {int} randomSeed
	 */
	randomSeed: NaN,

	/**
	 * Used when blending updated area and stroke. Default is NORMAL.
	 *
	 * @memberof Module.StrokeRenderer
	 * @member {Module.BlendMode} blendMode
	 */
	blendMode: null,

	/**
	 * Buffer layer for stroke building with preliminary curve, default is null.
	 * Auto created when draw preliminary path.
	 *
	 * @memberof Module.StrokeRenderer
	 * @member {Module.Layer} preliminaryLayer
	 */
	preliminaryLayer: null,

	/**
	 * Current stroke area
	 *
	 * @memberof Module.StrokeRenderer
	 * @member {Module.Rectangle} strokeBounds
	 */
	strokeBounds: null,

	/**
	 * Current modified segments area
	 *
	 * @memberof Module.StrokeRenderer
	 * @member {Module.Rectangle} updatedArea
	 */
	updatedArea: null,

	/**
	 * Configures rendering. First call is used for initialilzation.
	 *
	 * @method Module.StrokeRenderer.prototype.configure
	 * @param {Module.ComposeStyle} settings renderer configuration settings
	 */
	configure: function(settings) {
		if (!this.blendMode) this.blendMode = Module.BlendMode.NORMAL;

		if (settings.brush) this.brush = settings.brush;
		if (typeof settings.width != "undefined") this.width = settings.width;
		if (settings.color) this.color = settings.color;
		if (settings.blendMode) this.blendMode = settings.blendMode;

		if (this.brush instanceof Module.ParticleBrush && settings.randomSeed && !isNaN(settings.randomSeed))
			this.initialRandomSeed = settings.randomSeed;
	},

	/**
	 * Render data input
	 *
	 * @method Module.StrokeRenderer.prototype.draw
	 * @param {(Module.Path | Module.Stroke)} path
	 * @param {boolean} [endStroke] applicable only when path is Module.Path, when true caps end of stroke and completes stroke rendering
	 * @param {boolean} [endCap] applicable only when path is Module.Path, when true caps end of stroke, but do not completes stroke rendering
	 */
	draw: function(path, endStroke, endCap) {
		if (this.layer.isDeleted()) throw new Error("StrokeRenderer cannot draw, it is already deleted");

		if (!(path instanceof Module.Stroke)) {
			if (!this.brush) throw new Error("StrokeRenderer requires 'brush' to be configured");
			if (!this.color) throw new Error("StrokeRenderer requires 'color' to be configured");
		}

		if (this.restart)
			this.reset();

		if (path instanceof Module.Stroke) {
			var dirtyArea = this.layer.draw(path);

			this.strokeBounds = dirtyArea;
			this.updatedArea = dirtyArea;

			this.restart = true;
		}
		else {
			if (!this.validate(path)) return;

			if (this.beginStroke && this.brush instanceof Module.ParticleBrush && (path.stride == 4 || (path.stride == 3 && !isNaN(this.width))))
				this.color = {red: this.color.red, green: this.color.green, blue: this.color.blue, alpha: NaN};

			var drawContext = (this.brush instanceof Module.ParticleBrush)?this.strokeLastRendererdDrawContext:null;
			var dirtyArea = this.layer.drawStroke(this.brush, path, this.width, this.color, this.beginStroke, endStroke || endCap, 0, 1, drawContext);

			this.incompleteStrokeBounds = Module.RectTools.union(this.incompleteStrokeBounds, dirtyArea);
			this.strokeBounds = Module.RectTools.union(this.strokeBounds, dirtyArea);
			this.updatedArea = Module.RectTools.union(this.incompleteStrokeBounds, this.preliminaryDirtyArea);

			this.blendWithPreliminaryLayer = false;

			if (this.beginStroke && dirtyArea)
				this.beginStroke = false;

			if (endStroke) {
				this.strokeBounds = Module.RectTools.ceil(this.strokeBounds);
				this.restart = true;
			}
		}
	},

	/**
	 * Render preliminary curve
	 *
	 * @method Module.StrokeRenderer.prototype.drawPreliminary
	 * @param {Module.Path} path
	 */
	drawPreliminary: function(path) {
		if (!this.validate(path)) return;

		var drawContext = null;
		var layer = null;

		if (this.brush instanceof Module.ParticleBrush) {
			this.strokeLastRendererdDrawContext.copyTo(this.strokePrelimLastRenderedDrawContext);
			drawContext = this.strokePrelimLastRenderedDrawContext;
		}

		if (this.ownLayer) {
			if (!this.preliminaryLayer) {
				this.preliminaryLayer = this.canvas.createLayer(this.layerOptions);
				this.preliminaryLayer.clear();
			}

			layer = this.preliminaryLayer;
		}
		else
			layer = this.preliminaryLayer || this.canvas;

		if (this.updatedArea && this.preliminaryLayer)
			this.preliminaryLayer.blend(this.layer, {mode: Module.BlendMode.NONE, rect: this.updatedArea});

		this.preliminaryDirtyArea = layer.drawStroke(this.brush, path, this.width, this.color, this.beginStroke, true, 0, 1, drawContext);
		this.updatedArea = Module.RectTools.union(this.updatedArea, this.preliminaryDirtyArea);

		if (this.preliminaryLayer)
			this.blendWithPreliminaryLayer = true;
	},

	/**
	 * Restarts StrokeRenderer instance lifecycle for next usage
	 *
	 * @method Module.StrokeRenderer.prototype.abort
	 */
	abort: function() {
		this.restart = true;
	},

	/**
	 * Reset current state
	 *
	 * @method Module.StrokeRenderer.prototype.abort
	 */
	reset: function() {
		this.beginStroke = true;

		this.incompleteStrokeBounds = null;
		this.strokeBounds = null;
		this.updatedArea = null;
		this.preliminaryDirtyArea = null;

		if (this.brush instanceof Module.ParticleBrush) {
			if (this.strokeLastRendererdDrawContext && !this.strokeLastRendererdDrawContext.isDeleted()) this.strokeLastRendererdDrawContext.delete();

			this.strokeLastRendererdDrawContext = new Module.StrokeDrawContext();
			if (!this.strokePrelimLastRenderedDrawContext) this.strokePrelimLastRenderedDrawContext = new Module.StrokeDrawContext();

			if (this.initialRandomSeed) {
				this.strokeLastRendererdDrawContext.seed = this.initialRandomSeed;
				delete this.initialRandomSeed;
			}

			this.randomSeed = this.strokeLastRendererdDrawContext.seed;
		}
		else
			this.randomSeed = NaN;

		if (this.ownLayer) {
			this.layer.clear();
			if (this.preliminaryLayer) this.preliminaryLayer.clear();
		}

		this.restart = false;
	},

	validate: function(path) {
		if (!Module.Stroke.validatePath(path))
			return false;

		if (isNaN(this.width) && path.stride == 2) {
			Module.printErr("WARNING: Either the width property must be set or the path points must include a width value!");
			return false;
		}

		return true;
	},

	/**
	 * Blends affected area with another layer
	 *
	 * @method Module.StrokeRenderer.prototype.blendUpdatedArea
	 * @param {Module.GenericLayer} [layer=this.canvas] target layer for stroke blending, where blendMode is previously configured
	 */
	blendUpdatedArea: function(layer) {
		if (!this.updatedArea) return;

		var target = layer || this.canvas;
		var updatedAreaLayer = this.blendWithPreliminaryLayer?this.preliminaryLayer:this.layer;
		var dirtyArea = Module.RectTools.intersect(this.updatedArea, target.bounds);
		if (dirtyArea) target.blend(updatedAreaLayer, {mode: this.blendMode, rect: Module.RectTools.ceil(dirtyArea)});

		this.incompleteStrokeBounds = null;
		this.updatedArea = null;
	},

	/**
	 * Blends completed stroke with another layer
	 *
	 * @method Module.StrokeRenderer.prototype.blendStroke
	 * @param {Module.GenericLayer} [layer=this.canvas] target layer for stroke blending
	 * @param {Module.BlendMode} [blendMode=this.blendMode] blending mode
	 * @param {Module.Rectangle} [dirtyArea=this.strokeBounds] blending area
	 */
	blendStroke: function(layer, blendMode, dirtyArea) {
		if (!this.strokeBounds) return;

		var source = this.layer;
		var target = layer || this.canvas;

		dirtyArea = Module.RectTools.intersect(dirtyArea || this.strokeBounds, target.bounds);
		if (dirtyArea) target.blend(source, {mode: blendMode || this.blendMode, rect: Module.RectTools.ceil(dirtyArea)});
	},

	/**
	 * Converts current drawed path to stroke
	 *
	 * @method Module.StrokeRenderer.prototype.toStroke
	 * @param {Module.Path} path stroke path
	 * @return {Module.Stroke} stroke
	 */
	toStroke: function(path) {
		return new Module.Stroke(this.brush, path, this.width, this.color, 0, 1, this.randomSeed, this.blendMode);
	},

	delete: function() {
		if (this.ownLayer) {
			this.layer.delete();
			if (this.preliminaryLayer) this.preliminaryLayer.delete();
		}

		if (this.strokeLastRendererdDrawContext) this.strokeLastRendererdDrawContext.delete();
		if (this.strokePrelimLastRenderedDrawContext) this.strokePrelimLastRenderedDrawContext.delete();
	}
});

/**
 * @class Module.GenericPath
 * @since version 1.8
 * @abstract
 * @param {Array<Float32Array>} [segments] path segments (boundaries)
 * @param {Module.Color} [color] path fill color
 */
Module.GenericPath = function GenericPath(segments, color) {
	if (!(this instanceof Module.FlatPath || this instanceof Module.BezierPath))
		throw new BindingError("GenericPath has no accessible constructor");

	this.data = segments || [];
	this.color = color || Module.Color.TRANSPERENT;
}

Object.extend(Module.GenericPath, {
	openSVG: function(width, height) {
		return "<svg" +
			" xmlns=\"http://www.w3.org/2000/svg\"" +
			" xmlns:xlink=\"http://www.w3.org/1999/xlink\"" +
			" xml:space=\"preserve\" version=\"1.1\"" +
			" width=\"" + width + "\"" +
			" height=\"" + height + "\"" +
		">";
	},

	closeSVG: function() {
		return "</svg>";
	},

	getContext: function(ctx) {
		return context = {
			beginPath: function() {
				ctx.beginPath();
			},

			drawSegment: function(path) {
				path.segment = true;
				path.draw(ctx);
			},

			completePath: function() {
				ctx.fill();
			},
		};
	}
});

/**
 * Contours generated count
 *
 * @memberof Module.GenericPath.prototype
 * @member {int} length
 */
Object.defineProperty(Module.GenericPath.prototype, "length", {get: function() {return this.data.length;}});

Object.extend(Module.GenericPath.prototype, {
	/**
	 * Iterated path gets next contour
	 *
	 * @method Module.GenericPath.prototype.boundaryAt
	 * @param {int} i boundary index
	 * @return {Module.Boundary} contour
	 */
	boundaryAt: function(i) {
		var boundary = new Object();

		boundary.data = this.data[i];
		boundary.startingPoint = {x: boundary.data[0], y: boundary.data[1]};
		boundary.length = (boundary.data.length - 2) / this.boundaryPartLength;

		return boundary;
	},

	/**
	 * Converts stroke data to contours, ready for drawing
	 *
	 * @method Module.GenericPath.prototype.setStroke
	 * @param {(Module.Stroke | Module.StrokeData)} stroke stroke description
	 * @param {int} [maxScaleFactor=1] applicable only for Module.FlatPath
	 */
	setStroke: function(stroke, maxScaleFactor) {
		Module.Stroke.normalizeStrokeData(stroke);

		this.color = isNaN(stroke.color.alpha)?Module.Color.from(stroke.color.red, stroke.color.green, stroke.color.blue):stroke.color;

		Module.writeBytes(stroke.path.points, function(points) {
			var convertor = new Module.PathConvertor(this instanceof Module.FlatPath, maxScaleFactor || 1);
			var segments = convertor.convert(points, stroke.path.stride, stroke.width, stroke.ts, stroke.tf);

			segments.forEach(function(segment) {
				this.data.push(Module.readFloats(segment));
			}, this);

			convertor.delete();
		}, this);
	},

	buildSVGPath: function() {
		var svgPath = new Module.SVGPath(this.color, this.width);

		for (var i = 0; i < this.length; i++)
			this.boundaryAt(i).updateSVGPath(svgPath);

		return svgPath;
	},

	/**
	 * Render path content on canvas with 2D context
	 *
	 * @method Module.GenericPath.prototype.draw
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {Module.Matrix2D} transform context transform. When not available,
	 * 		transform is `transform` of Path if available or `transform` of ctx.canvas if available or multiply of both if available.
	 */
	draw: function(ctx, transform) {
		if (!transform) {
			if (this.transform) {
				transform = this.transform;
				if (ctx.canvas.transform) transform = Module.MatTools.multiply(ctx.canvas.transform, transform);
			}
			else if (ctx.canvas.transform)
				transform = ctx.canvas.transform;
		}

		ctx.fillStyle = "rgba(" + Module.Color.toArray(this.color).join(", ") + ")";
		if (transform) ctx.setTransform(transform.a, transform.b, transform.c, transform.d, transform.tx, transform.ty);

		if (!this.segment)
			ctx.beginPath();

		for (var i = 0; i < this.length; i++) {
			this.boundaryAt(i).draw(ctx);
			ctx.closePath();
		}

		if (!this.segment)
			ctx.fill();

		if (transform) ctx.setTransform(1, 0, 0, 1, 0, 0);
	}
});

/**
 * Module.GenericPath implemenatation.
 * Boundaries produced from this implemenatation contains points suitable for `lineTo` method.
 *
 * @class Module.FlatPath
 * @extends Module.GenericPath
 * @since version 1.8
 * @param {Array<Float32Array>} [segments] path segments
 * @param {Module.Color} [color] path fill color
 */
Module.FlatPath = function FlatPath(segments, color) {
	this.super(segments, color);

	this.boundaryPartLength = 2;
}

Module.FlatPath.extends(Module.GenericPath);

Object.extend(Module.FlatPath.prototype, {
	boundaryAt: function(i) {
		var boundaryPartLength = this.boundaryPartLength;
		var boundary = this.super("boundaryAt", i);

		boundary.updateSVGPath = function(svgPath) {
			svgPath.closePath = true;

			svgPath.addSegment(Module.SVGPath.SegmentType.MOVE_TO_POINT, this.startingPoint);

			for (var j = 0; j < this.length; j++)
				svgPath.addSegment(Module.SVGPath.SegmentType.LINE_TO_POINT, this.pointAt(j));
		}

		boundary.draw = function(ctx) {
			ctx.moveTo(this.startingPoint.x, this.startingPoint.y);

			for (var j = 0; j < this.length; j++) {
				var point = this.pointAt(j);
				ctx.lineTo(point.x, point.y);
			}
		};

		boundary.pointAt = function(j) {
			var base = j * boundaryPartLength + 2;
			return {x: this.data[base], y: this.data[base + 1]};
		};

		return boundary;
	}
}, true);

/**
 * Module.GenericPath implemenatation.
 * Boundaries produced from this implemenatation contains curves suitable for `bezierCurveTo` method.
 *
 * @class Module.BezierPath
 * @extends Module.GenericPath
 * @since version 1.8
 * @param {Array<Float32Array>} [segments] path segments
 * @param {Module.Color} [color] path fill color
 */
Module.BezierPath = function BezierPath(segments, color) {
	this.super(segments, color);

	this.boundaryPartLength = 6;
}

Module.BezierPath.extends(Module.GenericPath);

Object.extend(Module.BezierPath.prototype, {
	boundaryAt: function(i) {
		var boundaryPartLength = this.boundaryPartLength;
		var boundary = this.super("boundaryAt", i);

		boundary.updateSVGPath = function(svgPath) {
			svgPath.addSegment(Module.SVGPath.SegmentType.MOVE_TO_POINT, this.startingPoint);

			for (var j = 0; j < this.length; j++)
				svgPath.addSegment(Module.SVGPath.SegmentType.CURVE_TO_POINT, this.curveAt(j));
		}

		boundary.draw = function(ctx) {
			ctx.moveTo(this.startingPoint.x, this.startingPoint.y);

			for (var j = 0; j < this.length; j++) {
				var curve = this.curveAt(j);
				var cp1 = curve[0];
				var cp2 = curve[1];
				var p = curve[2];

				ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p.x, p.y);
			}
		};

		boundary.curveAt = function(j) {
			var base = j * boundaryPartLength + 2;

			return [
				{x: this.data[base], y: this.data[base + 1]},
				{x: this.data[base + 2], y: this.data[base + 3]},
				{x: this.data[base + 4], y: this.data[base + 5]}
			];
		};

		return boundary;
	}
}, true);

Module.BezierStroke = function BezierStroke(segments, color) {
	this.super(segments, color);
}

Module.BezierStroke.extends(Module.BezierPath);

Object.extend(Module.BezierStroke.prototype, {
	/**
	 * Converts stroke data to contours, ready for drawing
	 *
	 * @method Module.GenericPath.prototype.setStroke
	 * @param {Module.Stroke} stroke stroke
	 * @param {int} [maxScaleFactor=1] applicable only for Module.FlatPath
	 */
	setStroke: function(stroke) {
		this.width = stroke.getAverageWidth();
		this.color = isNaN(stroke.color.alpha)?Module.Color.from(stroke.color.red, stroke.color.green, stroke.color.blue):stroke.color;

		var points = new Array();
		var startingPoint = stroke.getPoint(0);

		points.push(startingPoint.x);
		points.push(startingPoint.y);

		for (var i = 1; i < stroke.length - 3; i++) {
			// Calcualte bezier control points
			var one6th = 0.166666666666;

			var p0 = stroke.getPoint(i);
			var p1 = stroke.getPoint(i+1);
			var p2 = stroke.getPoint(i+2);
			var p3 = stroke.getPoint(i+3);

			var cp1 = {x: -one6th * p0.x + p1.x + one6th * p2.x, y: -one6th * p0.y + p1.y + one6th * p2.y};
			var cp2 = {x: +one6th * p1.x + p2.x - one6th * p3.x, y: +one6th * p1.y + p2.y - one6th * p3.y};

			points.push(cp1.x);
			points.push(cp1.y);
			points.push(cp2.x);
			points.push(cp2.y);
			points.push(p2.x);
			points.push(p2.y);
		}

		this.data.push(new Float32Array(points));
	}
}, true);

Module.SVGPath = function SVGPath(color, width) {
	this.color = color;
	this.width = width;
	this.closePath = false;
	this.segments = new Array();
}

Object.extend(Module.SVGPath.prototype, {
	addSegment: function(segmentType, content) {
		this.segments.push({type: segmentType, key: segmentType.name.substring(0, 1), content: content});
	},

	getPath: function(transform) {
		var result = "";

		this.segments.forEach(function(segment) {
			var points = (segment.content instanceof Array)?segment.content:new Array(segment.content);

			result += " ";
			result += segment.key;

			points.forEach(function(point) {
				if (transform)
					point = Module.MatTools.transformPoint(point, transform);

				result += " ";
				result += point.x.toFixed(2) + "," + point.y.toFixed(2);
			});
		});

		if (this.closePath)
			result += " Z";

		return result.trim();
	},

	toFill: function(transform) {
		return "<path fill=\"" + Module.Color.toHex(this.color) + "\" d=\"" + this.getPath(transform) + "\"/>";
	},

	toStroke: function(transform, width) {
		if (!width && !this.width) throw new Error("`width` parameter is required");
		return "<path stroke=\"" + Module.Color.toHex(this.color) + "\" fill=\"none\" stroke-width=\"" + (width || this.width).toFixed(2) + "\" d=\"" + this.getPath(transform) + "\"/>";
	}
});

Module.SVGPath.createEnum("SegmentType", ["MOVE_TO_POINT", "LINE_TO_POINT", "CURVE_TO_POINT", "QUAD_CURVE_TO_POINT"]);

/**
 * @namespace Module.Color
 *
 * @description Module.Color utils
 */
Module.Color = {
	/**
	 * Represents transperent color
	 *
	 * @memberof Module.Color
	 * @member {Module.Color} TRANSPERENT
	 */
	TRANSPERENT: {red: 0, green: 0, blue: 0, alpha: 0},

	/**
	 * Represents color Black
	 *
	 * @memberof Module.Color
	 * @member {Module.Color} BLACK
	 */
	BLACK: {red: 0, green: 0, blue: 0, alpha: 1},

	/**
	 * Represents color White
	 *
	 * @memberof Module.Color
	 * @member {Module.Color} WHITE
	 */
	WHITE: {red: 255, green: 255, blue: 255, alpha: 1},

	/**
	 * Represents color Red
	 *
	 * @memberof Module.Color
	 * @member {Module.Color} RED
	 */
	RED: {red: 255, green: 0, blue: 0, alpha: 1},

	/**
	 * Represents color Green
	 *
	 * @memberof Module.Color
	 * @member {Module.Color} GREEN
	 */
	GREEN: {red: 0, green: 255, blue: 0, alpha: 1},

	/**
	 * Represents color Blue
	 *
	 * @memberof Module.Color
	 * @member {Module.Color} BLUE
	 */
	BLUE: {red: 0, green: 0, blue: 255, alpha: 1},

	init: function(color) {
		if (color.ready) return;

		Object.defineProperty(color, "ready", {value: true});
		Object.defineProperty(color, "asHex", {get: function() {return Module.Color.toHex(this);}});
		Object.defineProperty(color, "asArray", {get: function() {return Module.Color.toArray(this);}});
	},

	/**
	 * Creates Module.Color object
	 *
	 * @see Module.Color
	 * @param {(int | Array)} redORrgba between 0-255 or rgba array
	 * @param {int} green between 0-255
	 * @param {int} blue between 0-255
	 * @param {float} alpha between 0-1
	 * @return {Module.Color} color
	 */
	from: function(redORrgba, green, blue, alpha) {
		var red = redORrgba;

		if (redORrgba instanceof Array) {
			var rgba = redORrgba;

			red = rgba[0];
			green = rgba[1];
			blue = rgba[2];
			alpha = rgba[3];
		}

		var color = {red: red, green: green, blue: blue, alpha: isNaN(alpha)?1:alpha};
		this.init(color);

		return color;
	},

	/**
	 * Checks is argument defines Module.Color
	 *
	 * @param {Module.Color} green between 0-255
	 * @return {boolean} argument is color
	 */
	is: function(color) {
		return color && "red" in color && "green" in color && "blue" in color;
	},

	/**
	 * Creates a RGBA array from color
	 *
	 * @param {Module.Color} color
	 * @return {Array} rgba array
	 */
	toArray: function(color) {
		return [color.red, color.green, color.blue, color.alpha];
	},

	/**
	 * Creates a color from hex
	 *
	 * @param {String} hex color with leading '#'
	 * @return {Module.Color} color
	 */
	fromHex: function(hex) {
		hex = hex.substring(1);
		return Module.Color.from(parseInt(hex.substring(0, 2), 16), parseInt(hex.substring(2, 4), 16), parseInt(hex.substring(4, 6), 16));
	},

	/**
	 * Creates a hex string from color
	 *
	 * @param {Module.Color} color
	 * @return {String} hex string with leading '#'
	 */
	toHex: function(color) {
		return "#" + color.red.toString(16).pad(2, "0") + color.green.toString(16).pad(2, "0") + color.blue.toString(16).pad(2, "0");
	},

	random: function(alpha) {
		return Module.Color.from(Math.randomInt(0, 255), Math.randomInt(0, 255), Math.randomInt(0, 255), alpha?Math.random():1);
	}
};

(function() {
	for (var name in Module.Color) {
		if (typeof Module.Color[name] == "object")
			Module.Color.init(Module.Color[name]);
	}
})();
/*
Module.Rectangle = {
	init: function(rect) {
		rect.ceil = function() {
			this.left = Math.floor(this.left);
			this.top = Math.floor(this.top);
			this.right = Math.ceil(this.right);
			this.bottom = Math.ceil(this.bottom);
			this.width = this.right - this.left;
			this.height = this.bottom - this.top;
		}

		rect.union = function(rect) {return Module.RectTools.union(this, rect);}
		rect.intersect = function(rect) {return Module.RectTools.intersect(this, rect);}
		rect.toPath = function() {return Module.RectTools.getPath(this);}
	},

	from: function(left, top, width, height) {
		var rect = Module.RectTools.create(left, top, width, height);
		this.init(rect);
		return rect;
	}
};
*/
/**
 * @namespace Module.RectTools
 * @description helper methods which provides basic operations with rectangles
 */
Module.RectTools = {
	/**
	 * Creates a rect with the given dimensions
	 *
	 * @param {float} left x coordinate
	 * @param {float} top y coordinate
	 * @param {float} width rect width
	 * @param {float} height rect height
	 * @return {Module.Rectangle} rect
	 */
	create: function(left, top, width, height) {
		var rect = {left: left, top: top, width: width, height: height};

		rect.right = left + width;
		rect.bottom = top + height;

		// Module.Rectangle.init(rect);

		return rect;
	},

	create2: function(left, top, right, bottom) {
		var rect = {left: left, top: top, right: right, bottom: bottom};

		rect.width = right - left;
		rect.height = bottom - top;

		// Module.Rectangle.init(rect);

		return rect;
	},

	/**
	 * Ceils all properties of the rect object
	 *
	 * @param {Module.Rectangle} rect src rect
	 * @param {boolean} even width & height to be even
	 * @return {Module.Rectangle} ceiled rect
	 */
	ceil: function(rect, even) {
		if (!rect) return null;

		var left = Math.floor(rect.left);
		var top = Math.floor(rect.top);
		var right = Math.ceil(rect.right);
		var bottom = Math.ceil(rect.bottom);
		var width = right-left;
		var height = bottom-top;

		if (even) {
			width += width % 2;
			height += height % 2;
		}

		return this.create(left, top, width, height);
	},

	/**
	 * Combines 2 rects in 1 bigger
	 *
	 * @param {Module.Rectangle} rectA
	 * @param {Module.Rectangle} rectB
	 * @return {Module.Rectangle} unioned rect
	 */
	union: function(rectA, rectB) {
		if (!rectA) return rectB;
		if (!rectB) return rectA;

		var left = Math.min(rectA.left, rectB.left);
		var top = Math.min(rectA.top, rectB.top);
		var right = Math.max(rectA.right, rectB.right);
		var bottom = Math.max(rectA.bottom, rectB.bottom);

		return this.create(left, top, right-left, bottom-top);
	},

	/**
	 * Intersects 2 rects
	 *
	 * @param {Module.Rectangle} rectA
	 * @param {Module.Rectangle} rectB
	 * @return {Module.Rectangle} intersected rect, hhen intersection not available result is null
	 */
	intersect: function(rectA, rectB) {
		if (!rectA || !rectB) return null;

		if (rectA.left < rectB.right && rectA.right > rectB.left && rectA.bottom > rectB.top && rectA.top < rectB.bottom) {
			var left = Math.max(rectA.left, rectB.left);
			var top = Math.max(rectA.top, rectB.top);
			var right = Math.min(rectA.right, rectB.right);
			var bottom = Math.min(rectA.bottom, rectB.bottom);

			return this.create(left, top, right-left, bottom-top);
		}
		else
			return null;
	},

	/**
	 * Intersects point with rect
	 *
	 * @param {Module.Rectangle} rect
	 * @param {Module.Point} point
	 * @return {boolean} is point part from rect
	 */
	containsPoint: function(rect, pt) {
		return rect.left <= pt.x && rect.right >= pt.x && rect.top <= pt.y && rect.bottom >= pt.y;
	},

	getPath: function(rect) {
		return Module.PathBuilder.createPath([
			rect.left, rect.top,
			rect.left, rect.top,
			rect.right, rect.top,
			rect.right, rect.bottom,
			rect.left, rect.bottom,
			rect.left, rect.top,
			rect.left, rect.top,
		], 2);
	}
};

/**
 * @namespace Module.GLTools
 * @description helper methods for working with textures
 */
Module.GLTools = {
	/**
	 * Used for interoperability between WebGL and WILL SDK.
	 * Creates texture with predifined configuration.
	 *
	 * @param {int} [wrapMode=CLAMP_TO_EDGE] texture parameter for TEXTURE_WRAP_S and TEXTURE_WRAP_T
	 * @param {int} [sampleMode=NEAREST] texture parameter for TEXTURE_MIN_FILTER and TEXTURE_MAG_FILTER
	 */
	createTexture: function(wrapMode, sampleMode) {
		if (!wrapMode) wrapMode = GLctx.CLAMP_TO_EDGE;
		if (!sampleMode) sampleMode = GLctx.NEAREST;

		var texture = GLctx.createTexture();

		GLctx.bindTexture(GLctx.TEXTURE_2D, texture);
		GLctx.texParameteri(GLctx.TEXTURE_2D, GLctx.TEXTURE_WRAP_S, wrapMode);
		GLctx.texParameteri(GLctx.TEXTURE_2D, GLctx.TEXTURE_WRAP_T, wrapMode);
		GLctx.texParameteri(GLctx.TEXTURE_2D, GLctx.TEXTURE_MIN_FILTER, sampleMode);
		GLctx.texParameteri(GLctx.TEXTURE_2D, GLctx.TEXTURE_MAG_FILTER, sampleMode);
		GLctx.bindTexture(GLctx.TEXTURE_2D, null);

		return texture;
	},

	/**
	 * Handler for texture when is ready
	 *
	 * @callback PrepareTextureCallback
	 * @param {WebGLTexture} texture
	 * @see Module.GLTools.prepareTexture
	 */

	/**
	 * Fills a texture object with pixels
	 *
	 * @param {WebGLTexture} texture
	 * @param {(URI | Array<URI>)} srcORArray URI to an image that will be used as a pixel source or mipmap array
	 * @param {PrepareTextureCallback} [callback] function that will receive the prepared texture as a parameter, to process it
	 * @param {Object} [context] callback context
	 */
	prepareTexture: function(texture, srcORArray, callback, context) {
		if (srcORArray instanceof Array) {
			var sources = srcORArray;
			var mipmap = new Array();
			var cnt = sources.length;

			sources.forEach(function(src) {
				var image = new Image();
				image.onload = function () {
					cnt--;

					if (cnt == 0) {
						Module.GLTools.completeMipMap(mipmap, function() {
							texture.mipmap = mipmap;
							Module.GLTools.initTexture(texture);
							if (callback) callback.call(context || {}, texture);
						});
					}
				}

				image.crossOrigin = "anonymous";
				image.src = src;
				mipmap.push(image);
			}, this);
		}
		else {
			var src = srcORArray;

			var image = new Image();
			image.onload = function () {
				texture.image = this;
				Module.GLTools.initTexture(texture);
				if (callback) callback.call(context || {}, texture);
			}

			image.crossOrigin = "anonymous";
			image.src = src;
		}
	},

	completeMipMap: function(mipmap, callback) {
		var cnt = 0;

		if (mipmap.last.width == 1) {
			callback();
			return;
		}

		while (mipmap.last.width > 1) {
			cnt++;

			var canvas = document.createElement("canvas");
			canvas.width = mipmap.last.width / 2;
			canvas.height = mipmap.last.height / 2;

			canvas.getContext("2d").drawImage(mipmap.last, 0, 0, canvas.width, canvas.height);

			var image = new Image(canvas.width, canvas.height);
			image.onload = function () {
				cnt--;
				if (cnt == 0) callback();
			};

			image.src = canvas.toDataURL();
			mipmap.push(image);
		}
		/*
		var last = mipmap.last;

		while (last.width > 1) {
			cnt++;

			last.width /= 2;
			last.height /= 2;

			var image = new Image();
			image.onload = function () {
				cnt--;
				if (cnt == 0) callback();
			};

			image.src = last.toDataURL();
			mipmap.push(image);
		}

		last.removeAttribute("width");
		last.removeAttribute("height");
		*/
	},

	initTexture: function(texture) {
		GLctx.bindTexture(GLctx.TEXTURE_2D, texture);
		GLctx.pixelStorei(GLctx.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

		if (texture.mipmap) {
			for (var i = 0; i < texture.mipmap.length; i++)
				GLctx.texImage2D(GLctx.TEXTURE_2D, i, GLctx.RGBA, GLctx.RGBA, GLctx.UNSIGNED_BYTE, texture.mipmap[i]);

			GLctx.texParameteri(GLctx.TEXTURE_2D, GLctx.TEXTURE_MIN_FILTER, GLctx.LINEAR_MIPMAP_LINEAR);
			GLctx.texParameteri(GLctx.TEXTURE_2D, GLctx.TEXTURE_MAG_FILTER, GLctx.LINEAR);
		}
		else
			GLctx.texImage2D(GLctx.TEXTURE_2D, 0, GLctx.RGBA, GLctx.RGBA, GLctx.UNSIGNED_BYTE, texture.image);

		GLctx.pixelStorei(GLctx.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
		GLctx.bindTexture(GLctx.TEXTURE_2D, null);

		this.logGLError(texture.name);
	},

	/**
	 * Reads pixel data from texture
	 *
	 * @param {WebGLTexture} texture
	 * @param {Module.Rectangle} rect specific rect in texture
	 * @return {Uint8Array} pixels
	 */
	readTexturePixels: function(texture, rect) {
		var data = new Uint8Array(rect.width * rect.height * 4);

		// Create a framebuffer backed by the texture
		var framebuffer = GLctx.createFramebuffer();
		GLctx.bindFramebuffer(GLctx.FRAMEBUFFER, framebuffer);
		GLctx.framebufferTexture2D(GLctx.FRAMEBUFFER, GLctx.COLOR_ATTACHMENT0, GLctx.TEXTURE_2D, texture, 0);

		// Read the contents of the framebuffer
		GLctx.readPixels(rect.left, rect.top, rect.width, rect.height, GLctx.RGBA, GLctx.UNSIGNED_BYTE, data);

		GLctx.deleteFramebuffer(framebuffer);
		return data;
	},

	/**
	 * Used for debugging
	 *
	 * @param {String} message could be texture id or another usefull information
	 */
	logGLError: function(message) {
		var error = GLctx.getError();
		if (error > 0) console.error("WebGL error - " + message + ": " + error);
	}
};
