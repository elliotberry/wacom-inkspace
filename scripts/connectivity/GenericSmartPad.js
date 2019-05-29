"use strict";

const EventEmitter = require("events");

// require("../scripts/js.ext");

const SmartPad = require("./bridge/wacom.smartPadCommunication").SmartPad;
const SmartPadNS = require("./SmartPadNS");
const Utils = Wacom.SmartPadCommunication.Utils;

Wacom.SmartPadCommunication.SmartPadClientId.prototype.toString = function() {
	return this.asArray().join(", ");
}

// Events: StatusUpdate, DeviceNotFound, BatteryState, StrokeStart, PointReceived, NewLayer, PointsLost
// Barbera only - PenDetected, BarcodeScanRecord
class GenericSmartPad extends SmartPad {
	constructor(transportProtocol) {
		super();

		this.transportProtocol = transportProtocol;
		this.emitter = new EventEmitter();

		this.command;

		this.device;
		this.discovery = new Array();

		this.status = SmartPadNS.Status.DISCONNECTED;

		// could be set outside, should be able to transform device initial size and points
		this.inputTransformer = null;

		Object.defineProperty(this, "id", {get: () => (this.device ? this.device.id : null)});
		Object.defineProperty(this, "type", {get: () => (this.device ? this.device.type : null)});
		Object.defineProperty(this, "protocol", {value: this.constructor.name.replace("SmartPad", "")});

		this.initEvents();
	}

	initEvents() {
		this.BatteryStateChanged = (sender, args) => {
			if (this.debug) console.log("BatteryStateChanged:", JSON.stringify(args));
			this.emitter.emit("BatteryState", {percent: args.m_percentage, charging: !!args.m_chargingState});
		}

		this.StrokeStart = (sender, args) => {
			if (this.debug) console.log("StrokeStart:", JSON.stringify(args));
			this.emitter.emit("StrokeStart", {timestamp: args.m_timestamp.getTime(), penType: args.m_penType, penID: this.resolvePenID(args.m_penId)});
		}

		this.PointReceived = (sender, args) => {
			if (this.debug) console.log("PointReceived:", JSON.stringify(args));

			let point = {x: args.m_x * this.pixelRatio, y: args.m_y * this.pixelRatio, pressure: args.m_pressure};
			if (this.inputTransformer) point = this.inputTransformer.transformPoint(point);

			this.emitter.emit("PointReceived", {phase: args.m_phase, point: point});
		}

		this.ResetRealtimeDataBuffer = (sender, args) => {
			if (this.debug) console.log("ResetRealtimeDataBuffer");
			this.emitter.emit("ResetRealtimeDataBuffer");
		}

		this.NewLayer = (sender, args) => {
			if (this.debug) console.log("NewLayer");
			this.emitter.emit("NewLayer");
		}

		this.PointsLost = (sender, args) => {
			if (this.debug) console.log("PointsLost:", JSON.stringify(args));
			this.emitter.emit("PointsLost", {count: args.m_pointsLostCount});
		}
	}

	configure() {
		return new Promise((resolve, reject) => {
			if (this.serial && this.transportProtocol == SmartPadNS.TransportProtocol.USB) {
				this.switchToReadyMode().then(() => {
					return this.getSerialNumber();
				}).then(serialNumber => {
					if (this.serial != serialNumber) {
						delete this.serial;
						return this.configure();
					}
					else
						return this.setDateTime(new Date());
				}).then(resolve).catch(reject);

				return;
			}

			let initNoteSize = (noteParams) => {
				if (noteParams["POINT_SIZE"]) {
					const INCH_TO_MICROMETER = 25400;
					const DOTS_PER_INCH = 96;

					this.pixelRatio = noteParams["POINT_SIZE"] / INCH_TO_MICROMETER * DOTS_PER_INCH;
				}
				else
					this.pixelRatio = 0.04;

				this.size = {
					width: Math.ceil(noteParams["NOTE_WIDTH"] * this.pixelRatio),
					height: Math.ceil(noteParams["NOTE_HEIGHT"] * this.pixelRatio)
				};

				if (this.inputTransformer) {
					this.inputTransformer.init(this.size);
					this.size = this.inputTransformer.size;
				}
			};

			this.commands = {
				"GET_PARAMETER": {commandChain: this.cmdChainGetParam()},
				"SET_STATE_READY": {
					commandChain: this.cmdChainSetState(),
					resetWith: Wacom.SmartPadCommunication.DeviceState.Ready
				}
			};

			Promise.resolve().then(() => {
				if (this.transportProtocol == SmartPadNS.TransportProtocol.USB)
					return this.switchToReadyMode();
				else
					return Promise.resolve();
			}).then(() => {
				return this.getParameter(Wacom.SmartPadCommunication.SmartPadParameter.SMARTPAD_FW_PROTOCOL_LEVEL);
			}).then((protocolLevel) => {
				if (this.debug) console.log("protocolLevel:", "0x000" + protocolLevel.toString(16));

				this.m_protocolContext.init(this.transportProtocol, protocolLevel);
				this.initCommands();

				return this.processAuthorization();
			}).then(() => {
				return this.setDateTime(new Date());
			}).then(() => {
				return this.getSerialNumber();
			}).then((serialNumber) => {
				this.serial = serialNumber;
				return this.getParameters();
			}).then((params) => {
				this.pointsRate = params["REALTIME_POINTS_RATE"];

				initNoteSize(params);
				resolve();
			}).catch(reason => {
				if (reason instanceof Wacom.SmartPadCommunication.CommandNotSupportedException) {
					this.getParameter(Wacom.SmartPadCommunication.SmartPadParameter.NOTE_WIDTH).then(width => {
						return this.getParameter(Wacom.SmartPadCommunication.SmartPadParameter.NOTE_HEIGHT).then(height => ({NOTE_WIDTH: width, NOTE_HEIGHT: height}));
					}).then(size => {
						this.pointsRate = 200;

						initNoteSize(size);
						resolve();
					});
				}
				else
					reject(reason);
			});
		});
	}

	processAuthorization() {
		if (this.transportProtocol == SmartPadNS.TransportProtocol.USB)
			return Promise.resolve();
		else if (this.transportProtocol == SmartPadNS.TransportProtocol.BTC) {
			if (this.device.skipAuthorization) {
				delete this.device.skipAuthorization;
				return Promise.resolve();
			}
		}

		// 0 Wacom.SmartPadCommunication.CheckAuthorizationResult.Recognized_DataReady					Authorized
		// 1 Wacom.SmartPadCommunication.CheckAuthorizationResult.Recognized_UserConfirmation			ForgetDevice
		// 2 Wacom.SmartPadCommunication.CheckAuthorizationResult.NotRecognized_DataReady				DeviceInUseByAnotherHost
		// 3 Wacom.SmartPadCommunication.CheckAuthorizationResult.NotRecognized_UserConfirmation		authorize

		// 0 Wacom.SmartPadCommunication.AuthorizeResult.Success										Authorized
		// 1 Wacom.SmartPadCommunication.AuthorizeResult.ConfirmationTimeout							AuthorizeTimeout

		return Promise.resolve().then(() => {
			if (this.forceAuthorize)
				return Promise.resolve();
			else
				return this.checkAuthorization();
		}).then((result) => {
			if (this.forceAuthorize) {
				delete this.forceAuthorize;
				return this.authorize()
			}
			else {
				switch (result) {
					case Wacom.SmartPadCommunication.CheckAuthorizationResult.Recognized_DataReady:
						if (this.debug) console.info("Device is recognized and it is in Data Ready mode");
						return Promise.resolve(Wacom.SmartPadCommunication.AuthorizeResult.Success);
					case Wacom.SmartPadCommunication.CheckAuthorizationResult.Recognized_UserConfirmation:
						return this.resolveAuthorize().then((autoReconnect) => {
							if (this.debug) console.info("Device is recognized and it is in User Confirmation mode (force authorize)");

							if (this.type == "COLUMBIA_CONSUMER") {
								this.keepConnection = true;
								this.forceAuthorize = !autoReconnect;

								return Promise.reject(new Error("COLUMBIA_CONSUMER"));
							}
							else
								return this.authorize();
						}).catch((reason) => {
							if (reason == "FORGET_DEVICE") {
								this.forgetDevice = true;

								// this.updateStatus(SmartPadNS.Status.AUTHORIZE_FAILED, {authorizeFailType: SmartPadNS.AuthorizeFailType.OWN_DEVICE_IN_DISCOVERY_MODE});
								return Promise.reject(new Error("Device is recognized but it is in User Confirmation mode"));
							}
							else
								return Promise.reject(reason);
						});
					case Wacom.SmartPadCommunication.CheckAuthorizationResult.NotRecognized_DataReady:
						if (this.transportProtocol == SmartPadNS.TransportProtocol.BTC)
							return this.authorize();
						else {
							this.updateStatus(SmartPadNS.Status.AUTHORIZE_FAILED, {authorizeFailType: SmartPadNS.AuthorizeFailType.FOREIGN_DEVICE});
							return Promise.reject(new Error("Device is not recognized but it is in Data Ready mode"));
						}
					case Wacom.SmartPadCommunication.CheckAuthorizationResult.NotRecognized_UserConfirmation:
						if (this.debug) console.info("Device is not recognized but it is in User Confirmation mode");
						return this.authorize();
					default:
						return Promise.reject(new Error("Invalid check authorization result " + result));
				}
			}
		}).then((result) => {
			switch (result) {
				case Wacom.SmartPadCommunication.AuthorizeResult.Success:
					if (this.debug) console.info("Device is authorized successfully");
					this.updateStatus(SmartPadNS.Status.AUTHORIZE_SUCCESS);
					return Promise.resolve();
				case Wacom.SmartPadCommunication.AuthorizeResult.ConfirmationTimeout:
					this.updateStatus(SmartPadNS.Status.AUTHORIZE_FAILED, {authorizeFailType: SmartPadNS.AuthorizeFailType.CONFIRMATION_TIMEOUT});
					return Promise.reject(new Error("Device timed out during authorization"));
				default:
					return Promise.reject(new Error("Invalid authorization result " + result));
			}
		});
	}

	initCommands() {
		this.commands = {
			"AUTHORIZE": {
				commandChain: this.cmdChainAuthorize(),
				timeout: 40000,
				resetWithProtocolContext: true
			},
			"CHECK_AUTHORIZATION": {
				commandChain: this.cmdChainCheckAuthorization(),
				resetWithProtocolContext: true
			},
			"GET_DEVICE_ID": {
				commandChain: this.cmdChainGetDeviceID(),
				resolve: (deviceID) => deviceID.toString()
			},
			"GET_DEVICE_NAME": {
				commandChain: this.cmdChainGetDeviceName(),
				resolve: (name) => Buffer.from(name).toString("utf-8")
			},
			"SET_DEVICE_NAME": {
				commandChain: this.cmdChainSetDeviceName(),
				resetWithProtocolContext: true
			},
			"GET_SUPPORTED_PARAMETERS": {
				commandChain: this.cmdChainGetSupportedParams(),
				resolve: (value) => {
					let result = {};
					let params = [];
					let keys = Object.keys(Wacom.SmartPadCommunication.SmartPadParameter);

					for (let i = keys.length - 1; i >= 0; i--) {
						let name = keys[i];

						if (name == name.toUpperCase())
							params[Wacom.SmartPadCommunication.SmartPadParameter[name]] = name;
					}

					value.forEach((param) => {
						result[params[param.m_id]] = param.m_value;
					});

					return result;
				}
			},
			"GET_PARAMETER": {
				commandChain: this.cmdChainGetParam()
			},
			"SET_PARAMETER": {
				commandChain: this.cmdChainSetParam()
			},
			"GET_DATE_TIME": {
				commandChain: this.cmdChainGetDateTime()
			},
			"SET_DATE_TIME": {
				commandChain: this.cmdChainSetDateTime()
			},
			"GET_FIRMWARE_VERSION": {
				commandChain: this.cmdChainGetFirmwareVersion(),
				resolve: (value) => {
					let versions = [];
					let types = [];

					value.forEach(item => {
						versions.push(item.getVersionString());
						types.push(item.getFirmwareType());
					});

					return {version: versions, type: types};
				}
			},
			"GET_SERIAL_NUMBER": {
				commandChain: this.cmdChainGetSerialNumber(),
				resolve: (serial) => String.fromCharArray(serial)
			},
			"GET_BATTERY_STATE": {
				commandChain: this.cmdChainGetBatteryState(),
				resolve: (value) => {
					var bs = new Wacom.SmartPadCommunication.BatteryState.fromUShort(value);

					return {
						percent: bs.m_percent,
						charging: bs.m_isCharging
					};
				}
			},
			"GET_STATE": {
				commandChain: this.cmdChainGetState()
			},
			"SET_STATE_REAL_TIME": {
				commandChain: this.cmdChainSetState(),
				resetWith: Wacom.SmartPadCommunication.DeviceState.RealTime
			},
			"SET_STATE_FILE_TRANSFER": {
				commandChain: this.cmdChainSetState(),
				resetWith: Wacom.SmartPadCommunication.DeviceState.FileTransfer
			},
			"SET_STATE_READY": {
				commandChain: this.cmdChainSetState(),
				resetWith: Wacom.SmartPadCommunication.DeviceState.Ready
			},
			"GET_FILES_COUNT": {
				commandChain: this.cmdChainGetFilesCount()
			},
			"GET_OLDEST_FILE_INFO": {
				commandChain: this.cmdChainGetFileInfo(),
				resolve: (fileInfo) => ({timestamp: fileInfo.m_dateTime.getTime(), size: fileInfo.m_fileSize})
			},
			"GET_OLDEST_FILE": {
				commandChain: this.cmdChainGetOldestFile(),
				resolve: (paths) => {
					let layers = [];

					if (paths != null) {
						let layer;
						let data;

						let lastTimestamp = 0;
						let invalidIntervals = [];

						paths.items.forEach((path, i) => {
							let data = {
								penID: this.resolvePenID(path.m_penId),
								penType: path.m_penType,
								timestamp: (new Date(path.m_timestamp)).getTime(),
								pointsRate: this.pointsRate,
								stride: 3,
								points: new Array()
							};

							if (lastTimestamp == 0) lastTimestamp = data.timestamp;
// console.log((data.timestamp < lastTimestamp)?"----------":"++++++++++", data.timestamp, data.timestamp - lastTimestamp)
							if (data.timestamp < lastTimestamp) invalidIntervals.push({index: i, timestamp: data.timestamp, interval: data.timestamp - lastTimestamp});

							// TODO: Temproary fix, remove when VIPER is fixed
							if (data.timestamp < lastTimestamp) {
								data.timestamp = data.timestamp - (data.timestamp - lastTimestamp) + 1;
// console.log("**********", data.timestamp, data.timestamp - lastTimestamp)
							}

							lastTimestamp = data.timestamp;

							path.m_points.items.forEach(m_point => {
								let point = {x: m_point.m_x * this.pixelRatio, y: m_point.m_y * this.pixelRatio, pressure: m_point.m_pressure};

								if (m_point.m_isValid) {
									if (this.inputTransformer) point = this.inputTransformer.transformPoint(point);

									data.points.push(point.x);
									data.points.push(point.y);
									data.points.push(point.pressure);
								}
								else {
									if (this.debug)
										console.warn("Invalid point detected:", point);
								}
							});

							if (data.points.length == 3)
								data.points = data.points.concat(data.points);

							data.points = new Float32Array(data.points);

							if (path.m_newLayer || !layer) {
								if (layer && layer.length > 0) layers.push(layer);
								layer = [];
							}

							if (data.points.length > 0)
								layer.push(data);
						});

						if (invalidIntervals.length > 0)
							console.warn("Invalid intervals detected", invalidIntervals.length, "from", paths.items.length, "strokes", invalidIntervals);

						if (layer && layer.length)
							layers.push(layer);
					}

					return layers;
				}
			},
			"DELETE_OLDEST_FILE": {
				commandChain: this.cmdChainDeleteOldestFile()
			},
			"DELETE_ALL_FILES": {
				commandChain: this.cmdChainDeleteAllFiles()
			},
			"FORCE_DISCONNECT": {
				commandChain: this.cmdChainForceDisconnect()
			},
			"RESET_TO_DEFAULTS": {
				commandChain: this.cmdChainResetToDefaults()
			}
		};
	}

	resolvePenID(uInt64) {
		let penID = "";
		let bytes = [];

		if (uInt64) {
			Wacom.SmartPadCommunication.Utils.writeULongLE(bytes, 0, uInt64);

			if (!bytes.filter(b => b > 0).length)
				bytes = [];
		}

		bytes.forEach(byte => {
			let value = byte.toString(16).toUpperCase();

			penID += (value.length == 1)?"0":"";
			penID += value;
			penID += ":";
		});

		return penID.substring(0, penID.lastIndexOf(":"));
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

	completeClose() {
		delete this.device;
		delete this.uncompleteCommand;
		if (this.command) this.completeState(new Error("Connection closed unexpectedly (" + this.command + ")"));

		this.updateStatus(SmartPadNS.Status.CLOSED);
	}

	updateStatus(status, details) {
		if (this.status == status) return;

		this.status = status;

		let event = {smartPad: this, status: status};
		if (details) event = Object.assign(event, details)

		if (status == SmartPadNS.Status.SCAN)
			this.discovery = new Array();
		else if (status == SmartPadNS.Status.SCAN_COMPLETE)
			event.devices = this.discovery;
		else if (status == SmartPadNS.Status.AUTHORIZE_SUCCESS)
			this.state = SmartPadNS.State.READY;
		else if (status == SmartPadNS.Status.READY)
			this.deviceInfo = {id: this.id, serial: this.serial, type: this.type};
		else if (status == SmartPadNS.Status.DISCONNECTED) {
			if (this.forgetDevice) {
				delete this.deviceInfo;
				delete this.forgetDevice;

				event.forgetDevice = true;
			}
		}

		this.emitter.emit("StatusUpdate", event);

		//  || status == SmartPadNS.Status.AUTHORIZE_FAILED
		if (status == SmartPadNS.Status.SCAN_COMPLETE)
			this.status = SmartPadNS.Status.DISCONNECTED;
		else if (status == SmartPadNS.Status.CLOSED)
			this.updateStatus(SmartPadNS.Status.DISCONNECTED);
	}

	sendCommand(bytes, callback) {
		throw new Error("not implemented");
	}

	getCommandConfig() {
		return this.commands[this.command];
	}

	executeCommandChain(command, resetWith) {
		return new Promise((resolve, reject) => {
			if (!this.isOpen()) {
				reject(new Error("Cannot process " + command + ". Device is not found. Please open connection first!"));
				return;
			}

			if (this.command) {
			// if (this.command && (this.command == "FORCE_DISCONNECT" || command != "FORCE_DISCONNECT")) {
				reject(new Error("Device is busy. Processing " + this.command + " command chain. Command " + command + " is dropped."));
				return;
			}

			this.command = command;

			let config = this.commands[command];

			if (!config) {
				delete this.command;

				reject(new Error("Device unreachable"));
				return;
			}

			let args = resetWith || config.resetWith;

			if (command == "SET_PARAMETER") {
				let name = arguments[1];
				let value = arguments[2];

				args = name + " :: " + value;

				config.commandChain.reset(name, value);
			}
			else if (config.resetWithProtocolContext)
				config.commandChain.reset(this.m_protocolContext, resetWith || config.resetWith);
			else
				config.commandChain.reset(resetWith || config.resetWith);

			// TODO: completeCommandChain in this is not needed any more
			this.completeCommandChain = (result, error) => {
				clearTimeout(this.commandChainTimeoutID);

				if (!this.command) {
					reject(new Error("Connection with current device is lost. " + command + " cannot be completed."));
					return;
				}
				else {
					if (this.command.startsWith("SET_STATE"))
						this.state = SmartPadNS.State[this.command.replace("SET_STATE_", "")];

					if (error) {
						this.uncompleteCommand = this.command;
						delete this.command;

						reject(error);
						return;
					}
					else {
						delete this.command;

						if (config.resolve) {
							try {
								result = config.resolve(result);
							}
							catch(error) {
								reject(error);
								return;
							}
						}

						resolve(result);
					}
				}
			};

			this.emitter.once("CompleteCommandChain", this.completeCommandChain);
			this.updateCommandChainTimeout(config.timeout);

			if (this.debug) console.log("--- execute " + command + (args?" (" + args + ")":"") + " command chain ---");
			this.processState(config.commandChain.getFirstState());
		});
	}

	updateCommandChainTimeout(timeout) {
		clearTimeout(this.commandChainTimeoutID);
		this.commandChainTimeoutID = setTimeout(this.completeCommandChainTimeout.bind(this), timeout || 5000);
	}

	completeCommandChainTimeout() {
		if (this.command) {
			if (this.skipNotResponding) {
				console.warn("Device not responding: " + this.command);
				return;
			}

			this.uncompleteCommand = this.command;

			this.completeState(new Error("Device not responding: " + this.command));
			this.close();
		}
	}

	processState(state) {
		// If the state provides a command for the SmartPad device -> send the command
		var cmdPacketsCount = state.getCommandPacketsCount();
		var commandBytesArr = [];

		for (var i = 0; i < cmdPacketsCount; i++) {
			let commandBytes = state.getCommandBytes(this.m_protocolContext, i);
			if (commandBytes) commandBytesArr.push(commandBytes);
		}

		if (commandBytesArr.length > 0) {
			let next = (commandBytes) => {
				if (this.debug) console.log("Command bytes:", SmartPad.byteArrayAsHexString(commandBytes));

				this.sendCommand(commandBytes).then(() => {
					if (commandBytesArr.length > 0)
						next(commandBytesArr.shift());
					else if (state.m_isFinal)
						this.completeState();
				}).catch(reason => {
					this.completeState(reason);
				});
			};

			next(commandBytesArr.shift());
		}
		else if (state.m_isFinal)
			this.completeState();
	}

	completeState(error) {
		if (this.command) {
			if (this.debug) {
				if (error)
					console.log("--- process completed (" + this.command + ") with error (%c" + error.message + "%c) ---", "color: red", "color: black");
				else
					console.log("--- process completed (" + this.command + ") ---");
			}

			this.getCommandConfig().commandChain.onComplete(this, error);
		}
		else if (error) {
			console.warn(error);

			if (this.status.value < SmartPadNS.Status.CLOSING.value) {
				// should never happens
				console.warn("================ completeState (" + this.status.name + ") - no command (should never happens) = " + error.message + " ================");
				// this.emitter.removeListener("CompleteCommandChain", this.completeCommandChain);
			}
		}
	}

	processDeviceOutput(buffer, channelID) {
		if (!buffer || buffer.length == 0) return;

		let bytes = new Uint8Array(buffer).toArray();
		let channelBytes;
		let tag;
		let msgLength;
		let nextMessage;
		let bodyLength;

		if (this.message) {
			if (this.debug)
				console.log("Message next part:", SmartPad.byteArrayAsHexString(bytes));

			channelID = this.message.channelID;
			tag = this.message.tag;
			msgLength = this.message.length;

			let expected = this.message.length - this.message.body.length;

			if (bytes.length > expected) {
				let part = bytes.splice(0, expected);
				nextMessage = bytes;

				this.message.body = this.message.body.concat(part);
			}
			else {
				this.message.body = this.message.body.concat(bytes);

				if (bytes.length < expected)
					return;
			}

			bodyLength = this.message.body.length;

			if (channelID == 3)
				bytes = this.message.body;
			else
				bytes = [tag, msgLength].concat(this.message.body);

			delete this.message;
		}
		else {
			if (!channelID) {
				channelBytes = bytes.splice(0, 2); // remove COMMAND_PREFIX
				channelID = Utils.readUShortLE(channelBytes, 0);
			}

			if (this.header) {
				this.header.body = this.header.body.concat(bytes);

				if (this.header.body.length < this.header.length) {
console.warn("Incomplete header detected, expected (" + this.header.length + "), found (" + this.header.body.length + ")", this.header);
					return;
				}
				else {
					channelID = this.header.channelID;
					channelBytes = undefined;
					bytes = this.header.body;

					delete this.header;
				}
			}
			else {
				let headerLength = (channelID == 3)?3:2;

				if (bytes.length < headerLength) {
					this.header = {
						channelID: channelID,
						body: bytes,
						length: headerLength
					};
console.warn("Incomplete header detected, expected (" + headerLength + "), found (" + bytes.length + ")", this.header);
					return;
				}
			}

			tag = (channelID == 3)?null:bytes[0];
			msgLength = (channelID == 3)?Utils.readUShortLE(bytes.splice(0, 2), 0):bytes[1];
			bodyLength = bytes.length - ((channelID == 3)?0:2);
		}

		if (this.debug) {
			if (channelBytes) console.log("Channel:", SmartPad.byteArrayAsHexString(channelBytes));

			console.log(`Channel: ${channelID} / Tag: ${(tag || 0).toString(16).toUpperCase()} / Message: ${msgLength} / Body: ${bodyLength}`);

			if (channelID == 3)
				console.log("File Chunk:", SmartPad.byteArrayAsHexString(bytes));
			else
				console.log("Device output(" + SmartPad.translateCommandToHumanReadable(bytes, this.m_protocolContext) + "):", SmartPad.byteArrayAsHexString(bytes));
		}

		if (msgLength < bodyLength) {
			let part = bytes.splice(0, msgLength + ((channelID == 3)?0:2));
			nextMessage = bytes;
			bytes = part;

			if (this.debug)
				console.log("Message Part(" + SmartPad.translateCommandToHumanReadable(bytes, this.m_protocolContext) + "):", SmartPad.byteArrayAsHexString(bytes));
		}
		else if (msgLength > bodyLength) {
			// console.warn("Process device incomplete message. Recieved: " + bodyLength + " bytes. Expected: " + msgLength + " bytes.");

			if (channelID == 1 || channelID == 2)
				bytes.splice(0, 2);

			this.message = {
				channelID: channelID,
				tag: tag,
				length: msgLength,
				body: bytes
			};

			return;
		}

		switch (channelID) {
			case 1: // command
				// Columbia Consumer sends one of the system events through the command service's notify characteristics.
				if (this.m_protocolContext.isSystemEvent(bytes))
					this.processEvent(bytes);
				else if (this.command)
					this.processCommandResponse(bytes);
				else
					console.error("Cannot process device command response:", SmartPad.byteArrayAsHexString(bytes));

				break;
			case 2: // event
				if (this.m_protocolContext.isSystemEvent(bytes) || this.m_protocolContext.isRealtimeEvent(bytes))
					this.processEvent(bytes);
				else
					throw new Error("Unexpected event with tag: " + tag + " (" + SmartPad.byteArrayAsHexString(bytes) + ")");

				break;
			case 3: // file chunk
				this.updateCommandChainTimeout();
				this.cmdChainGetOldestFile().receiveBuffer(bytes);

				break;
			default:
				throw new Error("Unexpected channelID: " + channelID + " (" + SmartPad.byteArrayAsHexString(bytes) + ")");
		}

		if (nextMessage) this.processDeviceOutput(Buffer.from(nextMessage));
	}

	processCommandResponse(bytes) {
		var commandChain = this.getCommandConfig().commandChain;
		var state = commandChain.getNextState(this.m_protocolContext, bytes);

		if (state != null)
			this.processState(state);
	}
/*
	initParameters(callback) {
		let result = {};
		let params = Object.keys(Wacom.SmartPadCommunication.SmartPadParameter);

		for (let i = params.length - 1; i >= 0; i--) {
			let name = params[i];

			if (name != name.toUpperCase())
				params.remove(name);
		}

		let next = () => {
			if (params.length == 0) {
				callback(result);
				return;
			}

			let name = params.splice(0, 1)[0];

			this.getParameter(Wacom.SmartPadCommunication.SmartPadParameter[name]).then((value) => {
				result[name] = value;
				next();
			}).catch(reason => {
				result[name] = reason.message;
				next();
			});
		};

		next();
	}
*/
	download(processNote) {
		let file;
		let count = 0;

		let completeFile = () => {
			this.deleteOldestFile().then(() => {
				count--;
				if (count > 0) next();
			});
		}

		let next = () => {
			this.getOldestFileInfo().then((fileInfo) => {
				file = Object.clone(fileInfo);
				return this.getOldestFile();
			}).then((layers) => {
				file.layers = layers;

				if (file.layers.length > 0)
					processNote(file, completeFile);
				else
					completeFile();
			}).catch(this.logError);
		};

		this.switchToFileTransferMode().then(() => {
			return this.getFilesCount();
		}).then((filesCount) => {
			count = filesCount;
			if (count > 0) next();
		}).catch(this.logError);
	}

	downloadQA(processNote) {
		let file;
		let count = 0;

		let next = () => {
			this.getOldestFileInfo().then((fileInfo) => {
				file = Object.clone(fileInfo);
				return this.getOldestFile();
			}).then((layers) => {
				file.layers = layers;
				processNote(file);
			}).catch(this.logError);
		};

		this.switchToFileTransferMode().then(() => {
			return this.getFilesCount();
		}).then((filesCount) => {
			count = filesCount;
			if (count > 0) next();
		}).catch(this.logError);
	}

	authorize() {
		this.updateStatus(SmartPadNS.Status.AUTHORIZE_EXPECT);
		return this.executeCommandChain("AUTHORIZE", new Wacom.SmartPadCommunication.SmartPadClientId(...this.appID));
	}

	checkAuthorization() {
		return this.executeCommandChain("CHECK_AUTHORIZATION", new Wacom.SmartPadCommunication.SmartPadClientId(...this.appID));
	}

	getDeviceID() {
		return this.executeCommandChain("GET_DEVICE_ID");
	}

	getDeviceName() {
		return this.executeCommandChain("GET_DEVICE_NAME");
	}

	setDeviceName(name) {
		return this.executeCommandChain("SET_DEVICE_NAME", Buffer.from(name));
	}

	getParameters() {
		return this.executeCommandChain("GET_SUPPORTED_PARAMETERS");
	}

	getParameter(name) {
		if (name == Wacom.SmartPadCommunication.SmartPadParameter.SMARTPAD_FW_PROTOCOL_LEVEL) {
			return this.executeCommandChain("GET_PARAMETER", name).catch(reason => {
				// Columbia Consumer did not report protocol level
				if (reason instanceof Wacom.SmartPadCommunication.InvalidStateException)
					return 0x00010202;
				else
					throw reason;
			});
		}
		else
			return this.executeCommandChain("GET_PARAMETER", name);
	}

	setParameter(name, value) {
		return this.executeCommandChain("SET_PARAMETER", name, value);
	}

	getFirmwareVersion() {
		return this.executeCommandChain("GET_FIRMWARE_VERSION");
	}

	getSerialNumber() {
		return this.executeCommandChain("GET_SERIAL_NUMBER");
	}

	getBatteryState() {
		return this.executeCommandChain("GET_BATTERY_STATE");
	}

	getDateTime() {
		return this.executeCommandChain("GET_DATE_TIME");
	}

	setDateTime(date) {
		return this.executeCommandChain("SET_DATE_TIME", date);
	}

	getDataSessionState() {
		return this.executeCommandChain("GET_STATE");
	}

	switchToRealTimeMode() {
		return this.executeCommandChain("SET_STATE_REAL_TIME");
	}

	switchToFileTransferMode() {
		return this.executeCommandChain("SET_STATE_FILE_TRANSFER");
	}

	switchToReadyMode() {
		return this.executeCommandChain("SET_STATE_READY");
	}

	getFilesCount() {
		return this.executeCommandChain("GET_FILES_COUNT");
	}

	getOldestFileInfo() {
		return this.executeCommandChain("GET_OLDEST_FILE_INFO");
	}

	getOldestFile() {
		return this.executeCommandChain("GET_OLDEST_FILE").then(file => {
			delete this.retryDownload;
			return file;
		}).catch(reason => {
			//  && reason.message == "CRC check failed"
			if (reason instanceof System.Exception) {
				if (this.retryDownload)
					this.retryDownload++;
				else
					this.retryDownload = 1;

				if (this.retryDownload < 3) {
					console.warn("retry download:", this.retryDownload);
					console.warn(GenericSmartPad.fixError(reason));

					return this.getOldestFile();
				}
				else {
					delete this.retryDownload;
					throw reason;
				}
			}
			else
				throw reason;
		});
	}

	deleteOldestFile() {
		return this.executeCommandChain("DELETE_OLDEST_FILE");
	}

	deleteAllFiles() {
		return this.executeCommandChain("DELETE_ALL_FILES");
	}

	forceDisconnect(keepCurrentConntectionState) {
		return this.executeCommandChain("FORCE_DISCONNECT", !!keepCurrentConntectionState);
	}

	resetToDefault() {
		return this.executeCommandChain("RESET_TO_DEFAULTS");
	}

	setResultObject(result, error) {
		this.emitter.emit("CompleteCommandChain", result, error);
	}

	setResultDateTime(result, error) {
		this.emitter.emit("CompleteCommandChain", result, error);
	}

	setResultUInt(result, error) {
		this.emitter.emit("CompleteCommandChain", result, error);
	}

	setResultULong(result, error) {
		this.emitter.emit("CompleteCommandChain", result, error);
	}

	logError(e) {
		GenericSmartPad.logError(e);
	}

	static fixError(e) {
		if (e.errorStack) {
			let stack = e.errorStack;
			stack.name = e.$$name;
			stack.message = stack.name + ": " + e.message;
			e = stack;
		}

		return e;
	}

	static logError(e) {
		console.error(GenericSmartPad.fixError(e));
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
