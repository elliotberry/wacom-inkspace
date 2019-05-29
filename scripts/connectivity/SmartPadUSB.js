"use strict";

//require("../scripts/js.ext");

const usb = require("usb");

const SmartPadNS = require("./SmartPadNS");
const GenericSmartPad = require("./GenericSmartPad");

const COMMAND_PREFIX = [0x01, 0x00];

class SmartPadUSB extends GenericSmartPad {
	static get devices() {
		return Object.keys(USBWatcher.devices);
	}

	constructor() {
		super(SmartPadNS.TransportProtocol.USB);
	}

	open(deviceInfo) {
		if (this.isOpen()) return;

		let device;
		let error;

		if (deviceInfo) {
			device = USBWatcher.devices[deviceInfo.id];

			if (!device && SmartPadUSB.devices.length)
				error = new Error("Unknown device detected");
		}
		else if (SmartPadUSB.devices.length)
			device = USBWatcher.devices[SmartPadUSB.devices.first];

		if (device) {
			device.open();

			device.reset(error => {
				if (error) console.error(error);
				this.connect(device);
			});
		}
		else
			this.emitter.emit("DeviceNotFound", error);
	}

	connect(device) {
		try {
			device.commInterface = device.interface(1);
			device.commInterface.claim();
		}
		catch(error) {
			try {
				device.close();
			}
			catch(error) {
				console.warn(error.message);
			}

			this.emitter.emit("DeviceNotFound", error);
			return;
		}

		let inEndPoint = device.commInterface.endpoint(130);
		inEndPoint.startPoll(3, 512);

		inEndPoint.on("data", (buffer) => {
			try {
				this.processDeviceOutput(buffer);
			}
			catch(error) {
				this.completeState(error);
			}
		});

		inEndPoint.on("error", (error) => {
			console.error(error.message);
			this.close();
		});

		this.updateStatus(SmartPadNS.Status.CONNECTED);

		this.device = device;
		this.device.type = "VIPER";

		this.configure().then(() => {
			this.device.id = this.serial;
			this.updateStatus(SmartPadNS.Status.READY);
		}).catch(reason => {
			this.logError(reason);
			this.close();
		});
	}

	isOpen() {
		return !!this.device;
	}

	close() {
		super.close(() => {
			this.device.commInterface.release(true, (error) => {
				if (error)
					console.error(error.message);
				else {
					try {
						this.device.close();
					}
					catch(error) {
						console.error(error.message);
					}
				}

				this.completeClose();
			});
		});
	}

	sendCommand(bytes) {
		bytes = COMMAND_PREFIX.concat(bytes);
		if (this.debug) console.log("Send Command:", SmartPadUSB.byteArrayAsHexString(bytes));

		return new Promise((resolve, reject) => {
			this.device.controlTransfer(0x40, 0xF0, 0x00, 0x00, Buffer.from(bytes), (error) => {
				if (error)
					reject(error);
				else
					resolve();
			});
		});
	}

	static attachListeners(onAttach, onDetach) {
		USBWatcher.onAttach = onAttach || (() => {});
		USBWatcher.onDetach = onDetach || (() => {});

		return USBWatcher.list().then(list => Promise.all(list.map(device => USBWatcher.addDevice(device)))).catch(ignore => {});
	}

	static detachListeners() {
		USBWatcher.onAttach = () => {};
		USBWatcher.onDetach = () => {};
	}

	static list() {
		return USBWatcher.list();
	}
}

// this variable depress compiler optimization, it should be here (used in list method)
let list = new Array();

let USBWatcher = {
	// available wacom usb devices
	devices: {},

	// 1386
	VID: 0x56A,
	// 855, 856
	PIDS: [0x357, 0x358],

	init() {
		usb.on("attach", device => {
			if (!this.isWacomDevice(device)) return;
			// console.log("=============================== attach:", device);

			let retry = 0;
			let addDevice = () => {
				this.addDevice(device).then(this.onAttach).catch(reason => {
					if (reason.malfunction) {
						if (retry < 3) {
							retry++;
let d = new Date();
let prefix = d.getHours().pad(2) + ":" + d.getMinutes().pad(2) + ":" + d.getSeconds().pad(2) + "." + d.getMilliseconds().pad(4) + ":";
console.warn(prefix + " ***** malfunction retry", retry)
							setTimeout(addDevice, retry * 2000);

							return;
						}

						console.warn("Malfunction device detected, please reconnect");
						this.onAttach(null, new Error("Malfunction device detected, please reconnect"));
					}

					console.error(reason);
				});
			};

			setTimeout(addDevice, 2000);
		});

		usb.on("detach", device => {
			if (!this.isWacomDevice(device)) return;
			// console.log("=============================== detach:", device.id);

			this.removeDevice(device);
			this.onDetach(device.id);
		});
	},

	list() {
		list = usb.getDeviceList();

		let result = list.filter(device => this.isWacomDevice(device));

		return new Promise((resolve, reject) => {
			if (result.length)
				resolve(result);
			else
				reject();
		});
	},

	isWacomDevice(device) {
		return device.deviceDescriptor.idVendor == this.VID || this.PIDS.includes(device.deviceDescriptor.idProduct);
	},

	addDevice(device) {
		return new Promise((resolve, reject) => {
			try {
				device.open();
			}
			catch(error) {
				error.malfunction = true;
				reject(error);
				return;
			}

			if (device.deviceDescriptor.iSerialNumber == 0) {
				reject(new Error("SerialNumber not found"));
				return;
			}

			// iSerialNumber, iManufacturer, iProduct
			device.getStringDescriptor(device.deviceDescriptor.iSerialNumber, (error, serial) => {
				try {
					device.close();
				}
				catch(error) {
					console.warn(error);
				}

				if (error)
					reject(error);
				else {
					if (serial) {
						device.id = serial;
						device.serial = serial;

						this.devices[serial] = device;

						resolve(serial);
					}
					else
						reject(new Error("Device ID not found"));
				}
			});
		});
	},

	removeDevice(device) {
		delete this.devices[device.id];
	},

	onAttach(id, error) {
		console.warn("not implemented");
	},

	onDetach(id) {
		console.warn("not implemented");
	}
};

USBWatcher.init();

module.exports = SmartPadUSB;
