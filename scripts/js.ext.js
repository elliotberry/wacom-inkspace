/*
window.debug = true;
window.onerror = function(message, url, line) {
	var body = url +
		"\n\n" + message +
		"\n" + "Line #: " + line;

	if (window.debug) {
		alert(body);
		throw Error(message);
	}
};
*/

if (!String.prototype.contains) String.prototype.contains = function(str) {return (this.indexOf(str) != -1)}
if (!String.prototype.startsWith) String.prototype.startsWith = function(str) {return (this.length >= str.length && this.substring(0, str.length) == str)}
if (!String.prototype.endsWith) String.prototype.endsWith = function(str) {return (this.length >= str.length && this.substring(this.length-str.length, this.length) == str)}

String.prototype.charsCode = function() {return this.split("").reduce(function(previous, current) {return previous + current.charCodeAt(0);}, 0);}
String.prototype.containsIgnoreCase = function(str) {return (this.toUpperCase().indexOf(str.toUpperCase()) != -1)}
String.prototype.toCharArray = function(bytes) {var list = bytes?new Uint8Array(this.length):new Array(this.length); list.bytes = true; for (var i = 0; i < this.length; i++) {var code = this.charCodeAt(i); if (code > 255) list.bytes = false; list[i] = code;} return list;}
String.fromCharArray = function(arr) {var binary = ""; try {binary = String.fromCharCode.apply(null, arr);} catch(e) {for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);} return binary;}

String.prototype.pad = function(length, char) {return (this.length < length)?new Array(length - this.length + 1).join(char || "-") + this:this.toString();}
Number.prototype.pad = function(length) {return (String(this).length < length)?new Array(length - String(this).length + 1).join(0) + String(this):this.toString();}

Number.prototype.toFloat32 = function() {var fa32 = new Float32Array(1); fa32[0] = this; return fa32[0];}

Object.defineProperty(Array.prototype, "first", {get: function() {return this[0];}});
Object.defineProperty(Array.prototype, "last", {get: function() {return this[this.length-1];}});

Array.prototype.contains = function(value) {return this.indexOf(value) > -1;}
Array.prototype.clone = function() {var result = new Array(); this.forEach(function(value) {result.push(Object.clone(value));}); return result;}
Array.prototype.pushArray = function() {this.push.apply(this, this.concat.apply([], arguments));}
Array.prototype.add = function(item) {if (!this.contains(item)) return this.push(item);}
Array.prototype.remove = function(element) {return this.removeAt(this.indexOf(element));}
Array.prototype.removeAt = function(idx) {if (idx > -1) this.splice(idx, 1); return this;}
Array.prototype.replace = function(element, replaceWith) {
	var index = this.indexOf(element);

	if (index > -1) {
		if (replaceWith instanceof Array) {
			var args = [index, 1];

			for (var i = 0; i < replaceWith.length; i++)
				args.push(replaceWith[i]);

			this.splice.apply(this, args);
		}
		else
			this.splice(index, 1, replaceWith);
	}

	return this;
}

Array.protoTypedArrays = function() {
	["Int8", "Uint8", "Uint8Clamped", "Int16", "Uint16", "Int32", "Uint32", "Float32", "Float64"].forEach(function(type) {
		var typedArray = eval(type + "Array");

		if (typedArray.from)
			Array.prototype["to" + type + "Array"] = function() {return typedArray.from(this);}
		else
			Array.prototype["to" + type + "Array"] = function() {return new typedArray(this);}

		if (Array.from)
			typedArray.prototype.toArray = function() {return Array.from(this);}
		else
			typedArray.prototype.toArray = function() {return Array.prototype.slice.call(this);}

		typedArray.prototype.clone = function() {return new typedArray(this, this.byteOffset, this.length);}

		// Safari fix, remove when possible
		if (!typedArray.prototype.forEach) typedArray.prototype.forEach = Array.prototype.forEach;
	});
}

Array.protoTypedArrays();
delete Array.protoTypedArrays;

ArrayBuffer.isTypedArray = function(o) {
	return ArrayBuffer.isView(o) && !(o instanceof DataView);
	// return !!(
		// o instanceof Int8Array || o instanceof Uint8Array || o instanceof Uint8ClampedArray ||
		// o instanceof Int16Array || o instanceof Uint16Array ||
		// o instanceof Int32Array || o instanceof Uint32Array ||
		// o instanceof Float32Array || o instanceof Float64Array
	// );
}

if (!Function.name) Function.name = "Function";
if (!Array.prototype.constructor.name) Array.prototype.constructor.name = "Array";

Function.create = function(name, body) {
	if (!body) body = function() {};
	var args = body.getArguments();
	var f = new Function("body", "return function " + name + "(" + args + ") {return body.apply(this, arguments);};")(body);
	f.toString = function() {return body.toString();}
	f.toSource = function() {return body.toSource();}

	return f;
	// return new Function("body", "return function " + name + "() {return body.apply(this, arguments);};")(body || function() {});
}

if (!("name" in Function.prototype)) Object.defineProperty(Function.prototype, "name", {configurable: true, get: function() {var m = this.toString().match(/^function\s([\w$]+)/); return m?m[1]:"";}});
Function.prototype.getArguments = function() {var m = this.toString().match(/\((.*?)\)/)[1].replace(/\s*/g, ""); return (m.length == 0)?[]:m.split(",");}
Function.prototype.getBody = function() {return this.toString().match(/\{([\s\S]*)\}/m)[1].replace(/^\s*\/\/.*$/mg, "");}

Function.prototype.construct = function(oThis) {
	var fnArguments = arguments.callee.caller.arguments;

	this.getArguments().forEach(function(name, i) {
		this[name] = fnArguments[i];
	}, oThis);
}

Function.prototype.createEnum = function(name, keys) {
	if (this[name]) throw new Error("Already exists key: " + name);
	this[name] = new Object();

	for (var i = 0; i < keys.length; i++) {
		var value = name + "_" + keys[i];
		var type = this[name];

		type[keys[i]] = (function() {
			var enm = Object.create(Object.prototype, {
				constructor: {value: Function.create(value)},
				type: {value: name},
				name: {value: keys[i]},
				value: {value: i}
			});

			Object.defineProperty(type, i, {get: function() {return enm;}});

			return enm;
		})();
	}
}

Function.prototype.argsToJSON = function(defaults) {
	var json = {};
	if (!defaults) defaults = {};
	var fnArguments = arguments.callee.caller.arguments;

	this.getArguments().forEach(function(name, i) {
		json[name] = fnArguments[i];
		if (typeof json[name] == "undefined" && name in defaults) json[name] = defaults[name];
	});

	return json;
}

Function.prototype.getInheritanceChain = function() {
	var result = new Array();
	var parent = this.constructor;

	result.push(this.prototype.constructor);

	while (parent.name != "Function") {
		result.push(parent);
		parent = parent.constructor;
	}

	if (parent != this.prototype.constructor)
		result.push(parent);

	return result;
}

Function.prototype.isClassMethod = function(method) {
	var result = false;

	if (method.name)
		result = this.prototype[method.name] == method;
	else {
		for (var name in this.prototype) {
			if (this.prototype[name] == method) {
				result = true;
				break;
			}
		}
	}

	return result;
}

Function.prototype.extends = function(superClass) {
	this.prototype = Object.create(superClass.prototype);

	Object.defineProperty(this.prototype, "constructor", {value: this, enumerable: false, writable: true, configurable: true});
	Object.defineProperty(this, "constructor", {value: superClass.prototype.constructor, enumerable: false, writable: true, configurable: true});

	for (var property in superClass) {
		if (superClass.hasOwnProperty(property))
			this[property] = superClass[property];
	}

	if (!this.prototype.$parent) {
		Object.defineProperty(this.prototype, "super", {
			get: function() {
				var result;
				var self = this;
				var chain = this.constructor.getInheritanceChain();
				var caller = arguments.callee.caller;
				if (!caller) return null;

				if (chain.contains(caller)) {
					var parent = this.constructor.constructor;
					var depth = chain.indexOf(caller);

					while (depth > 0) {
						parent = parent.constructor;
						depth--;
					}

					result = function() {
						parent.apply(self, arguments)
					};

					result.bind = function(name) {
						var method = parent.prototype[name];
						if (!method) throw new Error("super function with name '" + name + "' not found");

						return function() {
							return method.apply(self, arguments);
						};
					};
				}
				else {
					var callerClass;

					for (var i = 0; i < chain.length; i++) {
						var clazz = chain[i];

						if (clazz.isClassMethod(caller)) {
							callerClass = clazz;
							break;
						}
					}

					if (!callerClass) throw new Error("super call is outside of inheritance chain");

					var bind = function(name) {
						var caller = callerClass.prototype[name];
						var parent = callerClass.constructor;

						while (parent && parent.prototype[name] == caller) {
							parent = parent.constructor;
							if (parent.name == "Function") parent = null;
						}

						if (!parent) throw new Error("super not found");

						var method = parent.prototype[name];
						if (!method) throw new Error("super function with name '" + name + "' not found");

						return function() {
							return method.apply(self, arguments);
						};
					};

					result = function(name) {
						if (!name || (typeof name != "string")) throw new Error("super function 'name' is required");

						var method = bind(name);
						return method.apply(self, Array.prototype.splice.call(arguments, 1));
					};

					result.bind = bind;
				}

				return result;
			}
		});
	}
}

Object.extend = function(o, data, replace) {
	var override = false;
	var parent = replace?o.$parent:null;

	if (!parent && !replace) {
		parent = new Object();
		parent["$$"] = new Object();
	}

	for (var property in data) {
		if (!replace && typeof o[property] == "function") {
			parent["$$"][property] = o[property];

			(function(property) {
				parent[property] = function() {
					var context = this["$$"].context;
					if (!context) throw new Error("Context not found in \"" + arguments.callee.caller.name + "\".");

					return this["$$"][property].apply(context, arguments);
				};
			})(property);

			o[property] = data[property];

			override = true;
		}
		else if (typeof o[property] == "object")
			Object.extend(o[property], data[property], replace);
		else
			o[property] = data[property];
	}

	if (override && !replace) {
		if (!o.hasOwnProperty("super")) {
			Object.defineProperty(o, "super", {
				get: function() {
					var result;
					var caller = arguments.callee.caller;

					if (!caller)
						throw "\"super\" not applicable for root";

					var lvl = caller.lvl;

					if (lvl > 0) {
						var result = this.$parent;

						while (result["$$"].lvl > lvl - 1)
							result = result.$parent;
					}
					else
						result = this.$parent;

					result["$$"].context = this;
					return result;
				}
			});
		}

		if (o.$parent) {
			parent.$parent = o.$parent;
			parent["$$"].lvl = o.$parent["$$"].lvl + 1;

			for (property in parent.$parent) {
				if (typeof parent.$parent[property] == "function" && typeof parent[property] == "undefined") {
					(function(property) {
						parent[property] = function() {
							if (!this.$parent["$$"].context) this.$parent["$$"].context = this["$$"].context;
							return this.$parent[property].apply(this.$parent, arguments);
						};
					})(property);
				}
			}
		}
		else
			parent["$$"].lvl = 1;

		for (property in parent["$$"]) {
			if (typeof parent["$$"][property] == "function")
				parent["$$"][property].lvl = parent["$$"].lvl;
		}

		o.$parent = parent;
	}
}

Object.equals = function(x, y) {
	// if both x and y are null or undefined and exactly the same
	if (x === y) return true;

	// if they are not strictly equal, they both need to be Objects
	if (!(x instanceof Object && y instanceof Object)) return false;

	// they must have the exact same prototype chain, the closest we can do is test there constructor.
	if (x.constructor !== y.constructor) return false;

	for (var p in x) {
		// other properties were tested using x.constructor === y.constructor
		if (!x.hasOwnProperty(p)) continue;

		// allows to compare x[p] and y[p] when set to undefined
		if (!y.hasOwnProperty(p)) return false;

		// if they have the same strict value or identity then they are equal
		if (x[p] === y[p]) continue;

		// Numbers, Strings, Functions, Booleans must be strictly equal
		if (typeof(x[p]) !== "object") return false;

		// Objects and Arrays must be tested recursively
		if (!Object.equals(x[p], y[p])) return false;
	}

	for (p in y) {
		// allows x[p] to be set to undefined
		if (y.hasOwnProperty(p) && !x.hasOwnProperty(p)) return false;
	}

	return true;
}

Object.clone = function(oReferance, bDataOnly) {
	var aReferances = new Array();

	function deepCopy(oSource) {
		if (oSource === null) return null;
		if (typeof(oSource) !== "object" || oSource.mutable) return oSource;
		if (typeof oSource.clone === "function") return oSource.clone();

		for (var i = 0; i < aReferances.length; i++) {
			if (aReferances[i][0] === oSource)
				return aReferances[i][1];
		}

		var oCopy = Object.create(Object.getPrototypeOf(oSource));
		aReferances.push([oSource, oCopy]);

		for (sPropertyName in oSource) {
			if (bDataOnly && typeof oSource[sPropertyName] === "function")
				continue;

			if (oSource.hasOwnProperty(sPropertyName))
				oCopy[sPropertyName] = deepCopy(oSource[sPropertyName]);
		}

		return oCopy;
	}

	return deepCopy(oReferance);
}

Object.nameAnonymousFunctions = function(o, constructorName) {
	for (var name in o) {
		if (typeof o[name] == "function" && !o[name].name) {
			if (name == "constructor" && constructorName)
				Object.defineProperty(o[name], "name", {value: constructorName});
			else
				Object.defineProperty(o[name], "name", {value: name});
		}
	}
}

JSON.toBase64 = function(json) {
	return btoa(JSON.stringify(json));
}

JSON.fromBase64 = function(base64) {
	return JSON.parse(atob(base64));
}

JSON.encode = function(json) {
	var base64 = JSON.toBase64(json);
	return base64.toCharArray(true);
}

JSON.decode = function(bytes) {
	var base64 = String.fromCharArray(bytes);
	return JSON.fromBase64(base64);
}

Math.toDegrees = function(angle) {return angle * (180 / this.PI);}
Math.toRadians = function(angle) {return angle * (this.PI / 180);}
Math.randomInt = function(min, max) {return Math.floor(this.random() * (max - min + 1)) + min;}

Math.ctg = function(x) {return 1 / Math.tan(x);}
Math.arcctg = function(x)  {return Math.PI / 2 - Math.atan(x);}

var ENVIRONMENT = (function() {
	var WEB = typeof window === "object";
	var WORKER = typeof importScripts === "function";
	var NODE = typeof process === "object" && typeof require === "function" && !WEB && !WORKER;

	if (this)
		Function.prototype.createEnum.call(this, "EnvironmentType", ["WEB", "WORKER", "NODE", "SHELL"]);
	else
		Function.prototype.createEnum.call(global, "EnvironmentType", ["WEB", "WORKER", "NODE", "SHELL"]);

	if (WEB)
		return EnvironmentType.WEB;
	else if (WORKER)
		return EnvironmentType.WORKER;
	else if (NODE)
		return EnvironmentType.NODE;
	else
		return this.EnvironmentType.SHELL;
})();

if (ENVIRONMENT == EnvironmentType.NODE)
	global.ENVIRONMENT = ENVIRONMENT;

if (ENVIRONMENT == EnvironmentType.WEB) {
	HTMLElement.prototype.getInlineStyle = function(property) {
		return this.style[property] || this.style["-webkit-" + property] || this.style["-khtml-" + property] || this.style["-moz-" + property] || this.style["-ms-" + property] || this.style["-o-" + property] || "";
	}

	HTMLElement.prototype.setStyle = function(property, value) {
		var prefixList = ["-webkit", "-khtml", "-moz", "-ms", "-o"];

		prefixList.forEach(function(prefix) {
			this.style[prefix + "-" + property] = value;
		}, this);

		this.style[property] = value;
	}

	HTMLElement.prototype.getStyle = function(property) {
		var value = property;
		var vendorPrefixed = property.startsWith("-");
		if (vendorPrefixed) value = property.substring(1);

		var arr = value.split("-");
		for (var i = arr.length-1; i > 0; i--) arr[i] = arr[i].substring(0, 1).toUpperCase() + arr[i].substring(1);
		value = arr.join("");

		// Firefox else IE
		var result = window.getComputedStyle?document.defaultView.getComputedStyle(this, null)[value]:this.currentStyle[value];

		if (!vendorPrefixed && typeof result === "undefined") {
			var prefixList = ["-webkit", "-khtml", "-moz", "-ms", "-o"];

			for (var i = 0; i < prefixList.length; i++) {
				result = this.getStyle(prefixList[i] + "-" + property);
				if (result != "undefined") break;
			}
		}

		return result;
	}

	HTMLElement.prototype.getMathStyle = function(property, inline) {
		var value = inline?this.getInlineStyle(property):this.getStyle(property);
		if (value == "auto") value = 0;
		return parseFloat(value);
	}

	HTMLElement.prototype.getTransformStyle = function() {
		var result = {
			translate: {x: 0, y: 0},
			scale: {x: 1, y: 1},
			rotate: {angle: 0},
			skew: {angleX: 0, angleY: 0},
			matrix: {a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0}
		};

		var transform = this.getStyle("transform");

		if (transform != "none") {
			var values = transform.substring(transform.indexOf("(")+1, transform.indexOf(")")).split(/,\s*/g);

			var a = parseFloat(values[0]);
			var b = parseFloat(values[1]);
			var c = parseFloat(values[2]);
			var d = parseFloat(values[3]);
			var tx = parseFloat(values[4]);
			var ty = parseFloat(values[5]);

			result.scale = {x: Math.sqrt(a*a + c*c), y: Math.sqrt(d*d + b*b)};
			result.skew = {angleX: Math.tan(c), angleY: Math.tan(b)};
			result.rotate = {angle: Math.atan2(b, a)};
			result.translate = {x: tx, y: ty};
			result.matrix = {a: a, b: b, c: c, d: d, tx: tx, ty: ty};
		}

		return result;
	}

	/**
	 * type xy location possible values: TL, BR, TR, BL, default is TL
	 */
	HTMLElement.prototype.toRect = function(type) {
		var rect = new Object();
		var alpha = this.getTransformStyle().rotate.angle;
		var clientRect = this.getBoundingClientRect();

		rect.width = this.offsetWidth;
		rect.height = this.offsetHeight;

		rect.left = this.offsetLeft;
		rect.top = this.offsetTop;
		rect.right = rect.left + rect.width;
		rect.bottom = rect.top + rect.height;

		rect.scaleFactor = Math.max(rect.width, rect.height) / Math.min(rect.width, rect.height);
		rect.offsetWidth = this.offsetWidth;
		rect.offsetHeight = this.offsetHeight;
		rect.fullWidth = this.offsetWidth + this.getMathStyle("margin-left") + this.getMathStyle("margin-right");
		rect.fullHeight = this.offsetHeight + this.getMathStyle("margin-top") + this.getMathStyle("margin-bottom");
		rect.center = {x: rect.width/2, y: rect.height / 2};

		// rect.rotationFrameWidth = rect.width*Math.abs(Math.cos(alpha)) + rect.height*Math.abs(Math.sin(alpha));
		// rect.rotationFrameHeight = rect.height*Math.abs(Math.sin(alpha)) + rect.height*Math.abs(Math.cos(alpha));
		// rect.rotationCenter = {x: rect.rotationFrameWidth/2, y: rect.rotationFrameHeight / 2};

		rect.rotationFrameWidth = clientRect.width;
		rect.rotationFrameHeight = clientRect.height;
		rect.rotationCenter = {x: clientRect.width/2, y: clientRect.height / 2};

		Object.defineProperty(rect, "x", {get: function() {return this.left;}});
		Object.defineProperty(rect, "y", {get: function() {return this.top;}});

		rect.centerOnParent = {x: rect.left + rect.rotationCenter.x, y: rect.top + rect.rotationCenter.y};
		rect.centerOnScreen = {x: clientRect.left + rect.rotationCenter.x, y: clientRect.top + rect.rotationCenter.y};

		return rect;
	}

	HTMLImageElement.prototype.toDataURL = function(type) {
		var canvas = document.createElement("canvas");
		canvas.width = this.width;
		canvas.height = this.height;
		canvas.getContext("2d").drawImage(this, 0, 0);

		return canvas.toDataURL(type || "image/png");
	}

	HTMLImageElement.prototype.toBlob = function(type) {
		return new Blob([this.getBytes(type).buffer], {type: type || "image/png"});
	}

	HTMLImageElement.prototype.getBytes = function(type) {
		var dataURL = this.toDataURL(type);
		var base64 = dataURL.split(",")[1];
		// var mime = dataURL.split(",")[0].split(":")[1].split(";")[0];

		return atob(base64).toCharArray(true);
	}

	Image.fromBytes = function(bytes, callback, type) {
		var image = new Image();

		image.onload = function () {
			URL.revokeObjectURL(this.src);
			if (callback) callback.call(this);
		}

		image.src = URL.createObjectURL(new Blob([bytes.buffer], {type : "image/" + (type || "png")}));

		return image;
	}

	CanvasRenderingContext2D.prototype.clearCanvas = function(color) {
		this.clearRect(0, 0, this.canvas.width, this.canvas.height);

		if (color) {
			this.fillStyle = color;
			this.fillRect(0, 0, this.canvas.width, this.canvas.height);
		}
	}

	Object.defineProperty(Screen.prototype, "deviceWidth", {get: function() {
		if (window.orientation == 90 || window.orientation == -90) {
			if (this.orientation)
				delete this.orientation;
			else {
				this.orientation = true;
				return this.deviceHeight;
			}
		}

		var width = this.width;

		if (!window.matchMedia("(-webkit-device-pixel-ratio)").matches) {
			width = Math.ceil(width * window.devicePixelRatio);

			if (width % 10 != 0) {
				if (width % 10 > 5)
					width += (10 - width % 10);
				else
					width -= width % 10;
			}
		}

		return width;
	}});

	Object.defineProperty(Screen.prototype, "deviceHeight", {get: function() {
		if (window.orientation == 90 || window.orientation == -90) {
			if (this.orientation)
				delete this.orientation;
			else {
				this.orientation = true;
				return this.deviceWidth;
			}
		}

		var height = this.height;

		if (!window.matchMedia("(-webkit-device-pixel-ratio)").matches) {
			height = Math.ceil(height * window.devicePixelRatio);

			if (height % 10 != 0) {
				if (height % 10 > 5)
					height += (10 - height % 10);
				else
					height -= height % 10;
			}
		}

		return height;
	}});

	// Safari FIX
	(function() {
		try {
			var clientRect = document.createElement("div").getBoundingClientRect();

			if (!("x" in clientRect)) {
				Object.extend(HTMLElement.prototype, {
					getBoundingClientRect: function() {
						var clientRect = this.super.getBoundingClientRect();

						clientRect.x = clientRect.left;
						clientRect.y = clientRect.top;

						return clientRect;
					}
				});
			}
		}
		catch(e) {
			// IE throws exception
		}
	})();
}
