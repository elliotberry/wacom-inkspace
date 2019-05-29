"use strict";

//require("../scripts/js.ext");

const bluetooth = require("node-bluetooth");
const btc = new bluetooth.DeviceINQ();

const SmartPadNS = require("./SmartPadNS");
const GenericSmartPad = require("./GenericSmartPad");

const SevenBitEncoder = Wacom.SmartPadCommunication.SevenBitEncoder;
const COMMAND_PREFIX = [0x01, 0x00];

//////////////////////////////////////
global.bluetooth = bluetooth
global.btc = btc
//////////////////////////////////////

// Events: ConnectFailed
class SmartPadBTC extends GenericSmartPad {
	constructor(appID, resolveAuthorize) {
		super(SmartPadNS.TransportProtocol.BTC);

		this.appID = appID;
		this.resolveAuthorize = resolveAuthorize;

		this.attachScannerEvents();
	}

	attachScannerEvents() {
		let found = false;

		this.onScanStart = () => {
			if (this.deviceInfo)
				this.updateStatus(SmartPadNS.Status.CONNECTING);
			else
				this.updateStatus(SmartPadNS.Status.SCAN);
		};

		this.onScanStop = (devices) => {
			if (this.deviceInfo) {
				if (!found)
					this.updateStatus(SmartPadNS.Status.CLOSED);
			}
			else {
				this.discovery = devices;

				this.updateStatus(SmartPadNS.Status.SCAN_COMPLETE);

				if (this.discovery.length == 1)
					this.connect(this.discovery.first);
			}

			found = false;
		};

		this.onDiscover = (device) => {
			if (this.deviceInfo && this.deviceInfo.id == device.id) {
				found = true;

				BTCScanner.stop();
				this.connect(device);
			}
		};
	}

	isOpen() {
		return !!this.device && this.device.isOpen();
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

		BTCScanner.start({onScanStart: this.onScanStart, onScanStop: this.onScanStop, onDiscover: this.onDiscover, debug: this.debug}, !deviceInfo);
	}

	connect(device) {
		this.updateStatus(SmartPadNS.Status.CONNECTING);

		btc.findSerialPortChannel(device.address, (channel) => {
console.log('Found RFCOMM channel for serial port on %s:', device.name, channel);

			bluetooth.connect(device.address, channel, (error, conn) => {
				if (error) {
					this.updateStatus(SmartPadNS.Status.CLOSED);
					this.emitter.emit("DeviceNotFound", error, device);

					return;
				}

				this.attachBTCEvents(conn);

				setTimeout(() => {
					if (!conn.isOpen()) return;

					this.updateStatus(SmartPadNS.Status.CONNECTED);

					this.device = conn;
					this.device.id = device.address;
					this.device.type = device.type;

					this.configure().then(() => {
						this.updateStatus(SmartPadNS.Status.READY);
					}).catch(reason => {
						console.error(reason);
						this.close();
					});
				}, 2000);
			});
		});
	}

	attachBTCEvents(conn) {
		conn.on("data", (buffer) => {
			try {
				this.processDeviceOutput(buffer);
			}
			catch(error) {
				this.completeState(error);
			}
		});

		conn.on("closed", () => {
			// delete this.device;
console.info("============= bluetooth connection closed");
			if (this.debug) console.info("bluetooth connection closed");
			if (this.status == SmartPadNS.Status.CLOSED || this.status == SmartPadNS.Status.DISCONNECTED) return;
			this.completeClose();
		});

		conn.on("error", (error) => {
			if (this.isOpen())
				this.logError(error);
		});
	}

	close() {
		super.close(() => {
			this.updateStatus(SmartPadNS.Status.DISCONNECTING);

			this.device.close(error => {
				if (error) console.error(error);
				delete this.device;

				this.completeClose();
			});

			// this.forceDisconnect().then(() => {
			// 	this.device.close();
			// }).catch(reason => {
			// 	this.logError(reason);
			// 	this.device.close();
			// });
		});
	}

	sendCommand(bytes) {
		bytes = COMMAND_PREFIX.concat(bytes);
		bytes = SevenBitEncoder.encode(bytes);

		if (this.debug) console.log("[SmartPadBTC] Send Command:", SmartPadBTC.byteArrayAsHexString(bytes));

		return new Promise((resolve, reject) => {
			this.device.write(Buffer.from(bytes), (error) => {
				if (error)
					reject(error);
				else
					resolve();
			});
		});
	}

	static list(inquiry) {
		return new Promise((resolve, reject) => {
			BTCScanner.start({
				onScanStop: (devices) => {
					if (devices.length)
						resolve(devices);
					else
						reject();
				}
			}, inquiry);
		});
	}
}

let BTCScanner = {
	NAME_PREFIX: "BT ",

	init() {
		this.devices = {};
		this.owner = {};

		this.inquiry = false;
		this.running = false;

		this.initEvents();
	},

	initEvents() {
		btc.on("found", (address, name) => {
			if (!this.running) return;
			this.discover(address, name);
		});

		btc.on("finished", () => {
			this.inquiry = false;
			if (this.running) this.stop();
		});
	},

	start(owner, inquiry) {
		if (this.running) {
			console.warn("[BTCScanner] already running");
			return;
		}

		if (this.inquiry) {
			console.warn("[BTCScanner] last inqury not completed");
			return;
		}

		this.running = true;
		this.inquiry = inquiry;
		this.devices = {};
		this.owner = owner || {};

		if (this.owner.onScanStart)
			this.owner.onScanStart();

		btc.listPairedDevices(devices => {
console.log(devices)
			devices.forEach(device => this.discover(device.address, device.name, device.services));

			if (inquiry)
				btc.inquire()
				// setTimeout(() => btc.inquire(), 100);
			else
				this.stop();
		});
	},

	stop() {
		if (!this.running) return;

		this.running = false;

		if (this.owner.onScanStop)
			this.owner.onScanStop(Object.values(this.devices));
	},

	discover(address, name, services) {
		if (name.startsWith(BTCScanner.NAME_PREFIX)) {
			let device = this.createDevice(address, name, services);
			// if (this.owner.debug) console.log(`[BTCScanner] device ${device.name} found: ${device.address}, services:`, services);
			console.log(`[BTCScanner] device ${device.name} found: ${device.address}, services:`, services);

			this.devices[device.id] = device;

			if (this.owner.onDiscover)
				this.owner.onDiscover(device);
		}
	},

	createDevice(address, name, services) {
		// 00-00-00-00-00-a8 || 00:00:00:00:00:A8
		if (address.length != 17)
			console.warn("strange device address detected:", address);

		if (address.contains("(") && address.contains(")"))
			address = address.substring(address.indexOf("(")+1, address.lastIndexOf(")"));

		return {id: address, name: name, address: address, type: "VIPER", services: services};
	}
};

BTCScanner.init();

module.exports = SmartPadBTC;
