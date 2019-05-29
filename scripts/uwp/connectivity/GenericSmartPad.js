"use strict";

const EventEmitter = require("events");
const SmartPadNS = require("./SmartPadNS");

// UserConfirmationExpected - AUTHORIZE_EXPECT, AuthorizationSuccess - AUTHORIZE_SUCCESS, AuthorizationError - AUTHORIZE_FAILED
// Events: StatusUpdate, DeviceNotFound, BatteryState, StrokeStart, PointReceived, NewLayer, PointsLost
// Barbera only - PenDetected, BarcodeScanRecord
class GenericSmartPad {
	constructor(transportProtocol) {
		this.transportProtocol = transportProtocol;
		this.emitter = new EventEmitter();

		this.command;
		this.status = SmartPadNS.Status.DISCONNECTED;

		// could be set outside, should be able to transform device initial size and points
		this.inputTransformer = null;

		let orientation;

		Object.defineProperty(this, "id", {get: () => global.resolveJSValue(this.origin.getDeviceID())});
		Object.defineProperty(this, "type", {get: () => this.origin.getDeviceType()});
		Object.defineProperty(this, "protocol", {value: transportProtocol.name});
		Object.defineProperty(this, "orientation", {
			get: () => orientation,
			set: (value) => {
				orientation = value;
				this.origin.setOrientation(value);
			}
		});

		this.origin = NativeSmartPad.createContext(transportProtocol.name);
		this.initEvents();
	}

	initEvents() {
		this.origin.onconnect = (event) => {
			this.updateStatus(SmartPadNS.Status.CONNECTED);

			this.configure().then(() => {
				this.updateStatus(SmartPadNS.Status.READY);
				this.state = SmartPadNS.State.READY;
			}).catch(reason => {
				console.error(reason);
				this.close();
			});
		}

		this.origin.onerror = (event) => {
			let nativeError = event.detail[0].error;
			let error = new Error(nativeError.message);

			if (nativeError.type == "DEVICE_NOT_FOUND")
				this.emitter.emit("DeviceNotFound", error);
			else if (nativeError.type == "CONNECT_FAILED") {
				this.updateStatus(SmartPadNS.Status.CLOSED);
				this.emitter.emit("ConnectFailed", JSON.parse(error.message));
			}
			else if (nativeError.type == "AUTHORIZATION") {
				if (nativeError.message == "FORGET_DEVICE")
					this.resolveAuthorize().then(() => this.origin.keepDevice(true)).catch(() => this.origin.keepDevice(false));
				else if (nativeError.message == "DEVICE_DISCONNECTED")
					this.updateStatus(SmartPadNS.Status.DISCONNECTED);
				else
					this.updateStatus(SmartPadNS.Status.AUTHORIZE_FAILED, {authorizeFailType: SmartPadNS.AuthorizeFailType[nativeError.message]});
			}
			else if (nativeError.type == "FORCE_DISCONNECT") {
				console.error(error);
				this.close(true);
			}
			else
				console.error(error);
		}

		this.origin.ondisconnect = (event) => {
			let args = event.detail[0];

			this.completeClose(args.forgetDevice);

			if (this.transportProtocol == SmartPadNS.TransportProtocol.BLE && !args.finalize)
				this.updateStatus(SmartPadNS.Status.CONNECTING);
		}

		this.origin.ondisoverycomplete = (event) => {
			this.discovery = global.resolveJSValue(event.list);

			this.updateStatus(SmartPadNS.Status.SCAN_COMPLETE);
			if (this.discovery.length == 1) this.origin.connect(this.discovery[0]);
		}

		this.origin.onbatterystatechanged = (event) => {
			let args = event.detail[0];
			if (this.debug) console.log("BatteryStateChanged:", JSON.stringify(args));

			this.emitter.emit("BatteryState", {percent: args.percentage, charging: args.chargingState});
		}

		this.origin.onstrokestart = (event) => {
			let args = event.detail[0];
			if (this.debug) console.log("StrokeStart:", JSON.stringify(args));

			this.emitter.emit("StrokeStart", {timestamp: args.timestamp, penType: args.penType, penID: args.penID});
		}

		this.origin.onpointreceived = (event) => {
			let args = event.detail[0];
			if (this.debug) console.log("PointReceived:", JSON.stringify(args));

			let path;
			let pathPart = Module.PathBuilder.createPath([], 3);

			if (args.pathPart) {
				pathPart = global.StrokesCodec.decodePathPart({}, event.pathPart).first.path;
				pathPart = this.normalizePath(pathPart);
			}

			if (args.path) {
				path = global.StrokesCodec.decodePathPart({}, event.path).first.path;
				path = this.normalizePath(path);
			}

			this.emitter.emit("PointReceived", {phase: args.phase, pathPart: pathPart, path: path});
		}

		this.origin.onresetrealtimedatabuffer = (event) => {
			if (this.debug) console.log("ResetRealtimeDataBuffer");
			this.emitter.emit("ResetRealtimeDataBuffer");
		}

		this.origin.onnewlayer = (event) => {
			if (this.debug) console.log("NewLayer");
			this.emitter.emit("NewLayer");
		}

		this.origin.onpointslost = (event) => {
			let args = event.detail[0];
			if (this.debug) console.log("PointsLost:", JSON.stringify(args));

			this.emitter.emit("PointsLost", {count: args.pointsLostCount});
		}

		this.origin.onchangestate = (event) => {
			let args = event.detail[0];
			if (this.debug) console.log("ChangeState:", JSON.stringify(args));

			if (args.state == "AUTHORIZE_EXPECT")
				this.updateStatus(SmartPadNS.Status.AUTHORIZE_EXPECT);
			else if (args.state == "AUTHORIZE_SUCCESS")
				this.updateStatus(SmartPadNS.Status.AUTHORIZE_SUCCESS);
			else {
				// READY, REAL_TIME, FILE_TRANSFER
				this.state = SmartPadNS.State[args.state];
			}
		}
	}

	normalizePath(path) {
		if (path) {
			if (path.points.length) {
				for (let i = 0; i < path.points.length; i++) {
					let base = i * path.stride;

					path.points[base] = path.points[base] * this.pixelRatio;
					path.points[base + 1] = path.points[base + 1] * this.pixelRatio;
				}

				if (this.inputTransformer)
					path = this.inputTransformer.transformPath(path);
			}
		}

		return path;
	}

	configure() {
		return new Promise((resolve, reject) => {
			if (this.serial) {
				this.getSerialNumber().then(serialNumber => {
					if (this.serial != serialNumber) {
						delete this.serial;
						return this.configure();
					}
				}).then(resolve).catch(reject);

				return;
			}

			this.getSerialNumber().then(serialNumber => {
				this.serial = serialNumber;
				return this.initNoteMeasurements();
			}).then(resolve).catch(reject);
		});
	}

	open() {
		throw new Error("not implemented");
	}

	isOpen() {
		throw new Error("not implemented");
	}

	isReady() {
		return this.isOpen() && this.status == SmartPadNS.Status.READY && !this.command;
	}

	close(resolve, reject) {
		if (this.status.value >= SmartPadNS.Status.CONNECTING.value && this.status.value <= SmartPadNS.Status.READY.value) {
			this.updateStatus(SmartPadNS.Status.CLOSING);
			resolve();
		}
		else if (reject)
			reject();
	}

	completeClose(forgetDevice) {
		this.updateStatus(SmartPadNS.Status.CLOSED, {forgetDevice: forgetDevice});
	}

	updateStatus(status, details) {
		this.status = status;

		let event = {smartPad: this, status: status};
		if (details) event = Object.assign(event, details)

		if (status == SmartPadNS.Status.SCAN_COMPLETE)
			event.devices = this.discovery;
		else if (status == SmartPadNS.Status.AUTHORIZE_SUCCESS)
			this.state = SmartPadNS.State.READY;
		else if (status == SmartPadNS.Status.READY)
			this.deviceInfo = {id: this.id, serial: this.serial, type: this.type};
		else if (status == SmartPadNS.Status.CLOSED) {
			if (event.forgetDevice)
				this.forgetDevice = true;
		}
		else if (status == SmartPadNS.Status.DISCONNECTED) {
			if (this.forgetDevice) {
				delete this.deviceInfo;
				delete this.forgetDevice;

				event.forgetDevice = true;
			}
		}

		this.origin.setStatus(status.name);
		this.emitter.emit("StatusUpdate", event);

		if (status == SmartPadNS.Status.SCAN_COMPLETE || status == SmartPadNS.Status.AUTHORIZE_FAILED)
			this.status = SmartPadNS.Status.DISCONNECTED;
		else if (status == SmartPadNS.Status.CLOSED)
			this.updateStatus(SmartPadNS.Status.DISCONNECTED);
	}

	// authorize() {
	// 	this.emitter.emit("UserConfirmationExpected");
	// 	return this.executeCommand("AUTHORIZE", new Wacom.SmartPadCommunication.SmartPadClientId(...this.appID));
	// }

	// checkAuthorization() {
	// 	return this.executeCommand("CHECK_AUTHORIZATION", new Wacom.SmartPadCommunication.SmartPadClientId(...this.appID));
	// }

	// getDeviceID() {
	// 	return this.executeCommand("GET_DEVICE_ID");
	// }

	getDeviceName() {
		return this.executeCommand("GET_DEVICE_NAME");
	}

	setDeviceName(name) {
		return this.executeCommand("SET_DEVICE_NAME", name);
	}

	// getParameters() {
	// 	return this.executeCommand("GET_SUPPORTED_PARAMETERS");
	// }

	// getParameter(name) {
	// 	return this.executeCommand("GET_PARAMETER", name);
	// }

	// setParameter(name, value) {
	// 	return this.executeCommand("SET_PARAMETER", name, value);
	// }

	// {width: INT, height: INT, pointSize: FLOAT}
	initNoteMeasurements() {
		const DEFAULT_PIXEL_RATIO = 0.04;
		const INCH_TO_MICROMETER = 25400;
		const DOTS_PER_INCH = 96;

		return this.executeCommand("GET_NOTE_MEASUREMENTS").then(measurements => {
			if (!measurements.pointSize)
				this.pixelRatio = DEFAULT_PIXEL_RATIO;
			else
				this.pixelRatio = measurements.pointSize / INCH_TO_MICROMETER * DOTS_PER_INCH;

			this.size = {
				width: Math.ceil(measurements.width * this.pixelRatio),
				height: Math.ceil(measurements.height * this.pixelRatio)
			};

			this.pointsRate = measurements.pointsRate;

			if (this.inputTransformer) {
				this.inputTransformer.init(this.size);
				this.size = this.inputTransformer.size;
			}
		});
	}

	// [{version: STRING, type: STRING}, {version: STRING, type: STRING}]
	getFirmwareVersion() {
		return this.executeCommand("GET_FIRMWARE_VERSION").then(value => {
			let versions = [];
			let types = [];

			value.forEach(item => {
				versions.push(item.version);
				types.push(item.type);
			});

			return {version: versions, type: types};
		});
	}

	getSerialNumber() {
		return this.executeCommand("GET_SERIAL_NUMBER");
	}


	// {percent: INT, charging: BOOLEAN}
	getBatteryState() {
		return this.executeCommand("GET_BATTERY_STATE");
	}

	// getDateTime() {
	// 	return this.executeCommand("GET_DATE_TIME");
	// }

	// setDateTime(date) {
	// 	return this.executeCommand("SET_DATE_TIME", date);
	// }

	// getDataSessionState() {
	// 	return this.executeCommand("GET_STATE");
	// }

	switchToReadyMode() {
		return this.executeCommand("SET_STATE_READY");
	}

	switchToRealTimeMode() {
		return this.executeCommand("SET_STATE_REAL_TIME");
	}

	switchToFileTransferMode() {
		return this.executeCommand("SET_STATE_FILE_TRANSFER");
	}

	// getFilesCount() {
	// 	return this.executeCommand("GET_FILES_COUNT");
	// }

	// getOldestFileInfo() {
	// 	return this.executeCommand("GET_OLDEST_FILE_INFO");
	// }

	// getOldestFile() {
	// 	return this.executeCommand("GET_OLDEST_FILE");
	// }

	// deleteOldestFile() {
	// 	return this.executeCommand("DELETE_OLDEST_FILE");
	// }

	// deleteAllFiles() {
	// 	return this.executeCommand("DELETE_ALL_FILES");
	// }

	// forceDisconnect(keepCurrentConntectionState) {
	// 	return this.executeCommand("FORCE_DISCONNECT", !!keepCurrentConntectionState);
	// }

	// resetToDefault() {
	// 	return this.executeCommand("RESET_TO_DEFAULTS");
	// }

	executeCommand(command, value) {
		return new Promise((resolve, reject) => {
			if (!this.isOpen()) {
				reject(new Error("Device is not found. Please open connection first!"));
				return;
			}

			if (this.command) {
				reject(new Error("Device is busy. Processing " + this.command + " command chain. Command " + command + " is dropped."));
				return;
			}

			this.command = command;

			let context = this.origin.createActionContext(command, value);

			context.oncomplete = (event) => {
				delete this.command;

				resolve(global.resolveJSValue(event.detail[0].obj));
			};

			// "Device not responding: " + this.command
			// "Connection with current device is lost. " + command + " cannot be completed."
			context.onerror = (event) => {
				delete this.command;

				reject(new Error(event.detail[0].error));
			};

			this.origin.send(context);
		});
	}

	once(event, fn) {
		this.emitter.once(event, fn);
	}

	on(event, fn) {
		this.emitter.on(event, fn);
	}

	off(event, fn) {
		if (fn)
			this.emitter.removeListener(event, fn);
		else
			this.emitter.removeAllListeners(event);
	}
}

module.exports = GenericSmartPad;
