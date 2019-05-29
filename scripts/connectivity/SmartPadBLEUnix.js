"use strict";

//require("../scripts/js.ext");

// const noble = require("noble");
const noble = require("noble-mac");

const SmartPadNS = require("./SmartPadNS");
const GenericSmartPad = require("./GenericSmartPad");
const BLECharacteristics = require("./BLECharacteristics");

const CHARACTERISTIC_COMMAND_NOTIFY       = "6e400003b5a3f393e0a9e50e24dcca9e";
const CHARACTERISTIC_COMMAND_WRITE        = "6e400002b5a3f393e0a9e50e24dcca9e";
const CHARACTERISTIC_FILE_TRANSFER_NOTIFY = "ffee0003bbaa99887766554433221100";
const CHARACTERISTIC_REAL_TIME_NOTIFY     = "000015241212efde1523785feabcd123";
const CHARACTERISTIC_EVENTS_NOTIFY        = "3a340721c57211e586c50002a5d5c51b";

const VIPER_ENABLED = true;
const FIND_SILENT_ADV = false;

// Events: ConnectFailed, BluetoothPoweredOn, BluetoothPoweredOff
class SmartPadBLE extends GenericSmartPad {
	constructor(appID, resolveAuthorize) {
		super(SmartPadNS.TransportProtocol.BLE);

		this.appID = appID;
		this.resolveAuthorize = resolveAuthorize;

		this.device;
		this.deviceInfo;

		this.characteristics = new BLECharacteristics();

		this.attachBLEEvents();
		this.initCharacteristicsListeners();
	}

	attachBLEEvents() {
		let found = false;

		noble.on("warning", (message) => {
			// The library is constantly spamming this message. So I ignored it.
			if (message == "unknown peripheral undefined RSSI update!") return;
			console.warn("BLE Warning:", message);
		});

		noble.on("stateChange", (state) => {
			switch (state) {
				case "poweredOn":
					this.emitter.emit("BluetoothPoweredOn");
					break;

				case "poweredOff":
					if (this.status.value < SmartPadNS.Status.CLOSING.value) {
						clearTimeout(this.scanTimeoutID);
						this.updateStatus(SmartPadNS.Status.CONNECTING);
					}

					this.emitter.emit("BluetoothPoweredOff");
					break;

				case "unsupported":
					throw new Error("This device does not support Bluetooth Low Energy");
			}
		});

		this.onScanStart = () => {
			if (this.deviceInfo)
				this.updateStatus(SmartPadNS.Status.CONNECTING);
			else
				this.updateStatus(SmartPadNS.Status.SCAN);
		};

		this.onScanStop = (descriptors) => {
			if (this.deviceInfo) {
				if (!found && noble.state == "poweredOn")
					this.updateStatus(SmartPadNS.Status.CLOSED);
			}
			else {
				this.discovery = descriptors || [];

				this.updateStatus(SmartPadNS.Status.SCAN_COMPLETE);

				if (this.discovery.length == 1)
					this.connect(BLEScanner.getDevice(this.discovery.first.id));
			}

			found = false;
		};

		this.onDiscover = (deviceID) => {
			if (this.deviceInfo && this.deviceInfo.id == deviceID) {
				let device = this.device;

				if (!device) {
					device = BLEScanner.getDevice(deviceID);
					device.type = this.deviceInfo.type;
				}

				found = true;

				this.stopScan();
				this.connect(device);
			}
		};
	}

	initCharacteristicsListeners() {
		let processDeviceOutput = (characteristic, data, isNotification) => {
			if (this.debug) console.log("processing", characteristic.name);

			try {
				this.processDeviceOutput(data, characteristic.channel);
			}
			catch(error) {
				this.completeState(error);
			}
		};

		this.characteristics.setListener(BLECharacteristics.CharacteristicType.COMMAND_NOTIFY, processDeviceOutput);
		this.characteristics.setListener(BLECharacteristics.CharacteristicType.EVENTS_NOTIFY, processDeviceOutput);
		this.characteristics.setListener(BLECharacteristics.CharacteristicType.REAL_TIME_NOTIFY, processDeviceOutput);

		this.characteristics.setListener(BLECharacteristics.CharacteristicType.FILE_TRANSFER_NOTIFY, (characteristic, data, isNotification ) => {
			if (this.debug) console.log(characteristic.name, Wacom.SmartPadCommunication.SmartPad.byteArrayAsHexString(data));

			this.updateCommandChainTimeout();
			this.cmdChainGetOldestFile().receiveBuffer(data);
		});
	}

	isOpen(orWaiting) {
		let result = this.device && this.device.state == "connected";
		if (orWaiting) result = result || this.status == SmartPadNS.Status.CONNECTING;
		return result;
	}

	open(deviceInfo) {
		this.deviceInfo = deviceInfo;

		if (this.isOpen()) return;

		if (this.status == SmartPadNS.Status.SCAN) {
			console.info("scanning...");
			return;
		}
		else if (this.status == SmartPadNS.Status.CONNECTING) {
			if (deviceInfo) {
				console.info("connecting...");
				return;
			}
			else
				this.close();
		}
		else if (this.status == SmartPadNS.Status.CONNECTED) {
			console.info("connected but not ready yet...");
			return;
		}

		let device = deviceInfo ? BLEScanner.getDevice(deviceInfo.id) : null;

		if (device)
			this.connect(device);
		else
			this.startScan(!deviceInfo);
	}

	startScan(timeout) {
		BLEScanner.start({onScanStart: this.onScanStart, onScanStop: this.onScanStop, onDiscover: this.onDiscover, debug: this.debug});
		if (timeout) this.scanTimeoutID = setTimeout(this.stopScan.bind(this), 20000);
	}

	async stopScan() {
		clearTimeout(this.scanTimeoutID);
		await BLEScanner.stop();
	}

	connect(device) {
		this.device = device;

		device.once("connect", (error) => {
			if (error) {
				console.log("state", device.state);
				console.error(error);

				return;
			}

			this.updateStatus(SmartPadNS.Status.CONNECTED)
			this.discoverServices();
		});

		device.once("disconnect", (error) => {
			if (error) console.error(error);
			if (this.debug) console.log("ble disconnect (event)");
			if (this.status == SmartPadNS.Status.SCAN) return;

			let status = this.status;

			this.updateStatus(SmartPadNS.Status.DISCONNECTED);

			this.reconnect = this.command || status.value >= SmartPadNS.Status.CONNECTED.value && status.value < SmartPadNS.Status.READY.value;

			if (this.command) this.completeState(new Error("Connection closed unexpectedly (" + this.command + ")"));
			if (!this.reconnect) this.startScan();
		});

		if (this.status == SmartPadNS.Status.DISCONNECTED)
			this.updateStatus(SmartPadNS.Status.CONNECTING);

		setTimeout(() => {
			if (device.state != "connecting") return;

			device.removeAllListeners("connect");
			device.removeAllListeners("disconnect");
			device.disconnect(error => {});

			this.updateStatus(SmartPadNS.Status.CLOSED);
			this.emitter.emit("ConnectFailed", BLEScanner.getDeviceDescriptor(device));
		}, 5000);

		device.connect();
	}

	discoverServices() {
		let serviceUUIDs = [];

		this.device.discoverServices(serviceUUIDs, (error, services) => {
			if (error) {
				console.error(error);
				this.close();
			}
			else {
				if (this.debug)
					console.log("services", services)

				Promise.all(services.map(service => this.discoverCharacteristics(service))).then(() => {
					return Promise.all(this.characteristics.values(true).map(characteristic => this.enableCharacteristic(characteristic)));
				}).then(() => {
					this.characteristics.values().forEach(characteristic => characteristic.on("data", characteristic.listener));
					return this.configure();
				}).then(() => {
					return this.setParameter(Wacom.SmartPadCommunication.SmartPadParameter.FILE_TRANSFER_SERVICE_REPORTING_TYPE, 0);
				}).then(() => {
					this.updateStatus(SmartPadNS.Status.READY);
				}).catch((reason) => {
					this.logError(reason);
					this.close(this.forgetDevice);
				});
			}
		});
	}

	discoverCharacteristics(service) {
		return new Promise((resolve, reject) => {
			let characteristicsUUIDs = [];

			service.discoverCharacteristics(characteristicsUUIDs, (error, characteristics) => {
				if (error)
					reject(error);
				else {
					characteristics.forEach(characteristic => {
						if (!characteristic.uuid) return;

						if (characteristic.uuid.toLowerCase() == CHARACTERISTIC_COMMAND_WRITE)
							this.characteristics.set(BLECharacteristics.CharacteristicType.COMMAND_WRITE, characteristic);
						else if (characteristic.uuid.toLowerCase() == CHARACTERISTIC_COMMAND_NOTIFY)
							this.characteristics.set(BLECharacteristics.CharacteristicType.COMMAND_NOTIFY, characteristic);
						else if (characteristic.uuid.toLowerCase() == CHARACTERISTIC_EVENTS_NOTIFY)
							this.characteristics.set(BLECharacteristics.CharacteristicType.EVENTS_NOTIFY, characteristic);
						else if (characteristic.uuid.toLowerCase() == CHARACTERISTIC_REAL_TIME_NOTIFY)
							this.characteristics.set(BLECharacteristics.CharacteristicType.REAL_TIME_NOTIFY, characteristic);
						else if (characteristic.uuid.toLowerCase() == CHARACTERISTIC_FILE_TRANSFER_NOTIFY)
							this.characteristics.set(BLECharacteristics.CharacteristicType.FILE_TRANSFER_NOTIFY, characteristic);

						resolve();
					});
				}
			});
		});
	}

	enableCharacteristic(characteristic) {
		return new Promise((resolve, reject) => {
			let timeoutID = setTimeout(() => reject(new Error("Device characteristic (" + characteristic.name + ") is unreachable")), 1000);

			characteristic.once("notify", (state) => {
				if (this.debug) console.log(characteristic.name, "enabled");
				clearTimeout(timeoutID);
				resolve();
			});

			characteristic.notify(true);
		});
	}

	async close(finalize) {
		await this.stopScan();

		if (this.keepConnection) {
			delete this.keepConnection;

			if (this.isOpen()) {
				this.device.removeAllListeners("disconnect");
				this.device.disconnect((error) => {
					if (error) console.error(error);
					if (this.debug) console.log("ble reconnect (callback)");

					this.connect(this.device);
				});
			}
			else {
				if (this.forceAuthorize)
					this.connect(this.device)
				else
					this.startScan();
			}

			return;
		}

		super.close(() => {
			this.updateStatus(SmartPadNS.Status.DISCONNECTING);

			this.device.removeAllListeners("disconnect");
			this.device.disconnect((error) => {
				if (error) console.error(error);
				if (this.debug) console.log("ble disconnect (callback)");

				if (finalize)
					this.completeClose();
				else {
					this.updateStatus(SmartPadNS.Status.DISCONNECTED);
					this.startScan();
				}
			});
		}, () => {
			if (this.reconnect) {
				delete this.reconnect;

				if (finalize)
					this.completeClose();
				else
					this.startScan();
			}
			else if (finalize) {
				if (this.status != SmartPadNS.Status.DISCONNECTED)
					this.updateStatus(SmartPadNS.Status.CLOSED);

				delete this.forgetDevice;
			}
		});
	}

	sendCommand(bytes) {
		if (this.debug) console.log("Send Command:", SmartPadBLE.byteArrayAsHexString(bytes));

		return new Promise((resolve, reject) => {
			this.characteristics.get(BLECharacteristics.CharacteristicType.COMMAND_WRITE).write(Buffer.from(bytes), false, (error) => {
				if (error)
					reject(error);
				else
					resolve();
			});
		});
	}

	static checkBLESupported() {
		return new Promise((resolve, reject) => {
			if (noble.state == "unknown")
				noble.once("stateChange", (state) => resolve(state != "unsupported"));
			else
				resolve(noble.state != "unsupported");
		});
	}

	static list() {
		return new Promise((resolve, reject) => {
			if (BLEScanner.running)
				resolve(BLEScanner.getDescriptors());
			else {
				BLEScanner.start();

				setTimeout(() => {
					BLEScanner.stop();

					let descriptors = BLEScanner.getDescriptors();

					if (descriptors.length)
						resolve(descriptors);
					else
						reject();
				}, 10000);
			}
		});
	}
}

let BLEScanner = {
	COLUMBIA_CONSUMER_USER_CONFIRMATION_ADV_DATA: Buffer.from([0x55, 0x47, 0x2D, 0x43, 0x4C, 0x52]),
	COLUMBIA_CONSUMER_DATA_SESSION_READY_ADV_DATA: Buffer.from([0x55, 0x47, 0x2D, 0x43, 0x4C, 0x52, 0x2E, 0x73, 0x61]),

	COLUMBIA_CREATIVE_USER_CONFIRMATION_ADV_DATA: Buffer.from([0x55, 0x47, 0x2D, 0x43, 0x41, 0x54]),
	COLUMBIA_CREATIVE_DATA_SESSION_READY_ADV_DATA: Buffer.from([0x55, 0x47, 0x2D, 0x43, 0x41, 0x54, 0x2E, 0x73, 0x61]),

	VIPER_USER_CONFIRMATION_ADV_DATA: Buffer.from([0x57, 0x41, 0x2D, 0x56, 0x49, 0x50]),
	VIPER_DATA_SESSION_READY_ADV_DATA: Buffer.from([0x57, 0x41, 0x2D, 0x56, 0x49, 0x50, 0x2E, 0x53, 0x49]),

	init() {
		this.peripherals = {};
		this.owner = {};
		this.running = false;

		this.initEvents();
	},

	initEvents() {
		let bleState = noble.state;

		noble.on("stateChange", (state) => {
			if (bleState == state) {
				console.warn("ble state duplicates, no state change")
				return;
			}

			if (global.debug)
				console.info("[BLE]", bleState, "=>", state)

			bleState = state;

			if (this.running) {
				if (state == "poweredOn") {
					this.peripherals = {};
					noble.startScanning();
				}
				else
					noble.stopScanning();
			}
		});

		noble.on("scanStart", () => {
			if (this.owner.onScanStart)
				this.owner.onScanStart();
		});

		noble.on("scanStop", () => {
			if (this.owner.onScanStop)
				this.owner.onScanStop(this.getDescriptors());
		});

		noble.on("discover", (peripheral) => {
			this.peripherals[peripheral.uuid] = peripheral;

			if (this.owner.onDiscover)
				this.owner.onDiscover(peripheral.uuid);
		});
	},

	start(owner) {
		if (this.running) {
			console.warn("[BLEScanner] already running");
			return;
		}

		this.running = true;
		this.peripherals = {};
		this.owner = owner || {};

		if (noble.state == "poweredOn")
			noble.startScanning();
	},

	stop() {
		return new Promise((resolve, reject) => {
			if (this.running) {
				if (this.stopping)
					reject(new Error("Already BLEScanner is stopping..."));
				else {
					this.stopping = true;

					noble.stopScanning(() => {
						this.stopping = false;
						this.running = false;
						resolve();
					});
				}
			}
			else
				resolve();
		});
	},

	getDescriptors() {
		return Object.values(this.peripherals).map(peripheral => this.getDeviceDescriptor(peripheral)).filter(descriptor => !!descriptor);
	},

	getDeviceDescriptor(peripheral) {
		let deviceInfo = {
			id: peripheral.uuid,
			name: peripheral.advertisement.localName
		};

		let data = peripheral.advertisement.manufacturerData;

		if (data) {
			data = Buffer.from(data);

			if (data.equals(BLEScanner.COLUMBIA_CONSUMER_USER_CONFIRMATION_ADV_DATA))
				deviceInfo.type = "COLUMBIA_CONSUMER";
			else if (data.equals(BLEScanner.COLUMBIA_CONSUMER_DATA_SESSION_READY_ADV_DATA) && FIND_SILENT_ADV)
				deviceInfo.type = "COLUMBIA_CONSUMER";
			else if (data.equals(BLEScanner.COLUMBIA_CREATIVE_USER_CONFIRMATION_ADV_DATA))
				deviceInfo.type = "COLUMBIA_CREATIVE";
			else if (data.equals(BLEScanner.COLUMBIA_CREATIVE_DATA_SESSION_READY_ADV_DATA) && FIND_SILENT_ADV)
				deviceInfo.type = "COLUMBIA_CREATIVE";
			else if (data.equals(BLEScanner.VIPER_USER_CONFIRMATION_ADV_DATA) && VIPER_ENABLED)
				deviceInfo.type = "VIPER";
			else if (data .equals(BLEScanner.VIPER_DATA_SESSION_READY_ADV_DATA) && VIPER_ENABLED && FIND_SILENT_ADV)
				deviceInfo.type = "VIPER";
			else
				deviceInfo = undefined;
		}
		else
			deviceInfo = undefined;

		if (deviceInfo) {
			peripheral.type = deviceInfo.type;
			if (this.owner.debug) console.log("[BLEScanner]", deviceInfo.type, "discovered:", deviceInfo.name, "(" + deviceInfo.id + ")");
		}

		return deviceInfo;
	},

	getDevice(deviceID) {
		return this.peripherals[deviceID];
	}
};

BLEScanner.init();

module.exports = SmartPadBLE;
