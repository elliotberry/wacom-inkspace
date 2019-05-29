"use strict";

//require("../scripts/js.ext");

const bluetooth = new (require("bluetooth-serial-port")).BluetoothSerialPort();

const SmartPadNS = require("./SmartPadNS");
const GenericSmartPad = require("./GenericSmartPad");

const SevenBitEncoder = Wacom.SmartPadCommunication.SevenBitEncoder;
const COMMAND_PREFIX = [0x01, 0x00];

// Events: DeviceNotFound, ConnectFailed
class SmartPadBTC extends GenericSmartPad {
	constructor(appID, resolveAuthorize) {
		super(SmartPadNS.TransportProtocol.BTC);

		this.appID = appID;
		this.resolveAuthorize = resolveAuthorize;

		this.initBTEvents();
	}

	initBTEvents() {
		let found = false;

		bluetooth.on("data", (buffer) => {
			try {
				this.processDeviceOutput(buffer);
			}
			catch(error) {
				this.completeState(error);
			}
		});

		bluetooth.on("closed", () => {
			if (this.debug) console.info("bluetooth connection closed");
			if (this.status == SmartPadNS.Status.CLOSED) return;
			this.completeClose();
		});

		bluetooth.on("failure", (error) => {
			if (this.isOpen())
				this.logError(error);
		});

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
		return bluetooth.isOpen();
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

		bluetooth.findSerialPortChannel(device.address, (channel) => {
			bluetooth.connect(device.address, channel, () => {
				setTimeout(() => {
					if (!bluetooth.isOpen()) return;

					this.updateStatus(SmartPadNS.Status.CONNECTED);

					this.device = device;

					this.configure().then(() => {
						this.updateStatus(SmartPadNS.Status.READY);
					}).catch(reason => {
						console.error(reason);
						this.close();
					});
				}, 2000);
			}, (error) => {
				this.updateStatus(SmartPadNS.Status.CLOSED);
				this.emitter.emit("ConnectFailed", device);
			});
		}, (error) => {
			this.updateStatus(SmartPadNS.Status.CLOSED);
			this.emitter.emit("DeviceNotFound", error, device);
		});
	}

	close() {
		super.close(() => {
			this.updateStatus(SmartPadNS.Status.DISCONNECTING);

			this.forceDisconnect().then(() => {
				bluetooth.close();
			}).catch(reason => {
				this.logError(reason);
				bluetooth.close();
			});
		});
	}

	sendCommand(bytes) {
		bytes = COMMAND_PREFIX.concat(bytes);
		bytes = SevenBitEncoder.encode(bytes);

		if (this.debug) console.log("[SmartPadBTC] Send Command:", SmartPadBTC.byteArrayAsHexString(bytes));

		return new Promise((resolve, reject) => {
			bluetooth.write(Buffer.from(bytes), (error, bytesWritten) => {
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
		bluetooth.on("found", (address, name) => {
			if (!this.running) return;
			this.discover(address, name);
		});

		bluetooth.on("finished", () => {
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

		bluetooth.listPairedDevices(devices => {
			devices.forEach(device => this.discover(device.address, device.name, device.services));

			if (inquiry)
				bluetooth.inquire();
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
			if (this.owner.debug) console.log(`[BTCScanner] device ${device.name} found: ${device.address}, services:`, services);

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
