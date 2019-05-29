const SerialPort = require("serialport");

// const childProcess = require("child_process");

const SmartPadNS = require("./SmartPadNS");
const GenericSmartPad = require("./GenericSmartPad");

const SevenBitEncoder = Wacom.SmartPadCommunication.SevenBitEncoder;
const COMMAND_PREFIX = [0x01, 0x00];

// Events: DeviceNotFound, ConnectFailed
class SmartPadSPP extends GenericSmartPad {
	constructor(appID, resolveAuthorize) {
		super(SmartPadNS.TransportProtocol.BTC);

		this.appID = appID;
		this.resolveAuthorize = resolveAuthorize;

		this.initScannerEvents();
	}

	initScannerEvents() {
		let found = false;

		this.onScanStart = () => {
			let deviceID;

			if (this.deviceInfo) {
				this.updateStatus(SmartPadNS.Status.CONNECTING);

				if (process.platform == "darwin")
					deviceID = this.deviceInfo.id.split("-")[0];
				else
					deviceID = "COM";
			}
			else
				this.updateStatus(SmartPadNS.Status.SCAN);

			return deviceID;
		};

		this.onScanStop = (devices) => {
			if (this.deviceInfo) {
				if (!found)
					this.updateStatus(SmartPadNS.Status.DISCONNECTED, {ignore: true});
			}
			else {
				this.discovery = devices;

				this.updateStatus(SmartPadNS.Status.SCAN_COMPLETE);

				if (this.discovery.length == 1)
					// this.connect(this.discovery.first);
					this.attach(this.discovery.first);
			}

			found = false;
		};

		// this.onDiscover = (deviceInfo) => {
		this.onDiscover = (deviceInfo, port) => {
			this.deviceInfo = deviceInfo;

			found = true;
			// SPPScanner.stop().then(() => this.connect(deviceInfo));
			SPPScanner.stop().then(() => {
				// setTimeout(() => this.connect(deviceInfo), 2000);
				this.attach(port);
			});
		};
	}

	open(deviceInfo) {
		this.deviceInfo = deviceInfo;

		if (this.isOpen()) return;

		if (this.status == SmartPadNS.Status.SCAN) {
			console.info("scanning...");
			return;
		}
		else if (this.status == SmartPadNS.Status.CONNECTING) {
			console.info("connecting...");
			return;
		}
		else if (this.status == SmartPadNS.Status.CONNECTED) {
			console.info("connected but not ready yet...");
			return;
		}

		SPPScanner.start({onScanStart: this.onScanStart, onScanStop: this.onScanStop, onDiscover: this.onDiscover, debug: this.debug}, true);
	}

	connect(deviceInfo) {
		let port = new SerialPort(deviceInfo.id, {autoOpen: false, lock: false});
		this.attachSPPEvents(port);

		this.serialPort = deviceInfo.id;
		this.updateStatus(SmartPadNS.Status.CONNECTING);

		port.open(error => {
			if (error) {
				console.warn("serial port open failed:", error.message);

				this.emitter.emit("ConnectFailed", deviceInfo);
				this.updateStatus(SmartPadNS.Status.DISCONNECTED);
			}
			else {
				this.device = port;
				this.device.id = deviceInfo.id;
				this.device.type = "VIPER";

				this.updateStatus(SmartPadNS.Status.CONNECTED);

				this.configure(deviceInfo).then(() => {
					this.updateStatus(SmartPadNS.Status.READY);
				}).catch(reason => {
					this.logError(reason);
					this.close();
				});
			}
		});
	}

	attach(device) {
		this.updateStatus(SmartPadNS.Status.CONNECTING);

		this.attachSPPEvents(device);
		this.device = device;

		this.updateStatus(SmartPadNS.Status.CONNECTED);

		this.configure().then(() => {
			this.updateStatus(SmartPadNS.Status.READY);
		}).catch(reason => {
			this.logError(reason);
			this.close();
		});
	}

	detach() {
		this.detachSPPEvents();
		this.completeClose();
	}

	attachSPPEvents(port) {
		port.on("data", (data) => {
			try {
				this.processDeviceOutput(data);
			}
			catch(error) {
				this.completeState(error);
			}
		});

		port.on("disconnect", (error) => {
			if (this.debug) console.info("spp disconnect");
			if (error) console.warn(error);
		});

		port.on("close", (error) => {
			if (this.debug) console.info("spp close (event)");
			if (error) console.error(error);

			this.completeClose();
		});

		port.on("error", error => {
			console.warn(error.message);
		});
	}

	detachSPPEvents() {
		this.device.removeAllListeners("data");
		this.device.removeAllListeners("error");
		this.device.removeAllListeners("disconnect");
		this.device.removeAllListeners("close");
	}

	isOpen() {
		return !!this.device && this.device.isOpen;
	}

	close() {
		if (this.status == SmartPadNS.Status.DISCONNECTING) return;

		super.close(() => {
			this.updateStatus(SmartPadNS.Status.DISCONNECTING);

			let completeClose = () => {
				this.device.removeAllListeners("close");
				this.device.close((error) => {
					if (this.debug) console.info("spp close (callback)");
					if (error) console.error(error);

					this.completeClose();
				});
			};

			if (this.uncompleteCommand)
				completeClose();
			else if (!this.device)
				this.completeClose();
			else {
				this.forceDisconnect(true).then(completeClose).catch(reason => {
					this.logError(reason);
					completeClose();
				});
			}
		}, () => {
			if (this.isOpen())
				this.completeClose();
		});
	}

	sendCommand(bytes) {
		if (!this.isOpen()) throw new Error("Not Open")

		bytes = COMMAND_PREFIX.concat(bytes);
		bytes = SevenBitEncoder.encode(bytes);

		if (this.debug) console.log("Send Command:", SmartPadSPP.byteArrayAsHexString(bytes));

		return new Promise((resolve, reject) => {
			this.device.write(Buffer.from(bytes), (error) => {
				if (error)
					reject(error);
				else
					this.device.drain(resolve);
			});
		});
	}

	static stopScanner() {
		return SPPScanner.stop();
	}

	static list(deviceInfo) {
		return new Promise((resolve, reject) => {
			let deviceID;

			if (deviceInfo && process.platform == "darwin")
				deviceID = deviceInfo.id.split("-")[0];

			SPPScanner.start({
				deviceID: deviceID,
				onScanStop: (devices) => {
					if (devices.length)
						resolve(devices);
					else
						reject();
				}
			});
		});
	}
}

let SPPScanner = {
	init() {
		this.owner = {};
		this.devices = [];
		this.running = false;

		this.initScanner();
	},

	initScanner() {
		let device;
		let deviceName;

		this.scanner = new SmartPadSPP();

		this.scanner.configure = function(deviceInfo) {
			return new Promise((resolve, reject) => {
				deviceName = null;

				let protocolLevel = 0x00020102;
				this.m_protocolContext.init(this.transportProtocol, protocolLevel);
				this.initCommands();

				this.switchToReadyMode().then(() => {
					this.device.skipAuthorization = true;
					return this.getDeviceName();
				}).catch(reason => {
					if (reason instanceof Wacom.SmartPadCommunication.InvalidStateException)
						return this.getDeviceName();
					else
						return Promise.reject(reason);
				}).then(name => {
					deviceName = name;
					resolve();
				}).catch(reason => {
					this.emitter.emit("DeviceNotFound", reason, deviceInfo);
					reject(reason);
				});
			});
		};

		this.scanner.on("StatusUpdate", (event) => {
			if (event.status != SmartPadNS.Status.CLOSED)
				console.info("%c[SPP_SCANNER]", "color: #C16903", "---------", event.status.name + ((event.status == SmartPadNS.Status.CONNECTING) ? " (" + this.scanner.serialPort + ")" : ""), "---------");

			if (event.status == SmartPadNS.Status.CONNECTING)
				device = undefined;
			else if (event.status == SmartPadNS.Status.READY) {
				device = this.scanner.device;

				this.onReady(deviceName);
				// this.scanner.close();
				this.scanner.detach();
			}
			else if (event.status == SmartPadNS.Status.DISCONNECTED)
				this.onClosed(device);
		});

		this.scanner.on("ConnectFailed", (deviceInfo) => this.onDeviceNotFound(deviceInfo));
		this.scanner.on("DeviceNotFound", (error, deviceInfo) => this.onDeviceNotFound(deviceInfo));
	},

	fetch() {
		return new Promise((resolve, reject) => {
			SerialPort.list((error, ports) => {
				if (error)
					reject(error);
				else {
					let devices = [];

					ports.forEach(port => {
						let name = port.comName.replace(/.*\./g,"");

						if (process.platform == "win32") {
							if (port.pnpId.indexOf("BTHENUM") == 0 && port.pnpId.indexOf("VID") != -1 && port.pnpId.indexOf("PID") != -1) {
								let arr = port.pnpId.split(/\\\d/)[0].split("_");
								arr.shift();

								if (arr[0] == "VID&0002056A" && (arr[1] == "PID&0360" || arr[1] == "PID&0361"))
									devices.push({id: port.comName, name: name});
							}
						}
						else {
							if (name.indexOf("BT") == 0)
								devices.push({id: port.comName.replace("dev/tty", "dev/cu"), name});
						}
					});

					if (this.owner.deviceID)
						devices = devices.filter(device => device.id.startsWith(this.owner.deviceID));

					resolve(devices);
				}
			});
		});
	},

	inquire(devices) {
		let count = 0;

		devices.reverse();

		this.onDeviceNotFound = (deviceInfo) => {
			devices[count].notfound = true;
// console.log("============ onDeviceNotFound", JSON.stringify(deviceInfo));
		};

		this.onReady = (deviceName) => {
			devices[count].name = deviceName;

			console.info("%c[SPP_SCANNER]", "color: #C16903", "resolved", devices[count]);
		};

		this.onClosed = (device) => {
			// reconnect
			// if (!devices[count].notfound && this.owner.deviceID && this.owner.onDiscover)
			if (device && this.owner.deviceID && this.owner.onDiscover)
				// this.owner.onDiscover(devices[count]);
				this.owner.onDiscover(devices[count], device);

			count++;

			if (this.forceStop)
				this.scanner.complete([]);
			else {
				// first accessible serial port when pairing, ignore others
				if (device)
					this.scanner.complete([device]);
				else {
					if (count == devices.length)
						this.scanner.complete(devices);
					else {
// console.log("============ connect["+count+"]", devices[count].id)
						this.scanner.connect(devices[count]);
					}
				}
			}
		};

// console.log("============ connect[0]", devices[0].id)
		this.scanner.connect(devices[count]);
	},

	completeInquire(devices) {
		if (this.forceStop) {
			let forceStop = this.forceStop;
			delete this.forceStop;

			if (this.owner.onScanStop)
				this.owner.onScanStop({ignore: true, length: 0});

			forceStop();
		}
		else {
			this.devices = devices.filter(device => !device.notfound);
// console.log("============ complete scan (" + this.devices.length + ")", this.devices);
			if (this.owner.onScanStop)
				this.owner.onScanStop(this.devices);

			this.stop(true);
		}
	},

	start(owner, inquiry) {
		if (this.running) {
			console.warn("[SPPScanner] already running");
			return;
		}

		this.running = true;
		this.devices = [];
		this.owner = owner || {};

		if (this.owner.onScanStart)
			this.owner.deviceID = this.owner.onScanStart();
// console.clear();
		this.fetch().then(devices => {
// console.log("============ fetch (" + devices.length + ")", JSON.stringify(devices));
			if (inquiry) {
				this.scanner.debug = this.owner.debug;

				return new Promise((resolve, reject) => {
					if (!devices.length)
						resolve(devices);
					else {
						this.scanner.complete = resolve;
						this.inquire(devices);
					}
				});
			}
			else
				return Promise.resolve(devices);
		}).then(devices => {
			this.completeInquire(devices);
		}).catch(reason => {
			console.error(reason);
			this.completeInquire([]);
		});
	},

	stop(completeInquire) {
		return new Promise((resolve, reject) => {
			let complete = () => {
				this.running = false;
				resolve();
			};

			if (completeInquire)
				complete();
			else if (this.running) {
				if (this.forceStop)
					reject(new Error("Already SPPScanner is stopping..."));
				else
					this.forceStop = complete;
			}
			else
				resolve();
		});
	}
};

SPPScanner.init();

module.exports = SmartPadSPP;
