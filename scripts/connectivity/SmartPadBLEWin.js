"use strict";

//require("../scripts/js.ext");

const SmartPadNS = require("./SmartPadNS");
const GenericSmartPad = require("./GenericSmartPad");
const BLECharacteristics = require("./BLECharacteristics");

// region Namespaces
const BluetoothNamespace      = require('@nodert-win10/windows.devices.bluetooth');
const RadiosNamespace 		  = require("@nodert-win10/windows.devices.radios");
const AdvertisementNamespace  = require("@nodert-win10/windows.devices.bluetooth.advertisement");
const GattNamespace           = require("@nodert-win10/windows.devices.bluetooth.genericattributeprofile");
const EnumerationNamespace    = require("@nodert-win10/windows.devices.enumeration");
const StreamsNamespace        = require('@nodert-win10/windows.storage.streams');
// const SystemNamespace         = require("@nodert-win10/windows.system");
// const FoundationNamespace     = require("@nodert-win10/windows.foundation");
// endregion Namespaces

// region Classes
// General
const Radio = RadiosNamespace.Radio;
const RadioState = RadiosNamespace.RadioState;
const RadioKind = RadiosNamespace.RadioKind;
const BluetoothDevice = BluetoothNamespace.BluetoothDevice;
const BluetoothLEDevice = BluetoothNamespace.BluetoothLEDevice;
const DeviceInformation = EnumerationNamespace.DeviceInformation;
// const Launcher = SystemNamespace.Launcher;
// const Uri = FoundationNamespace.Uri;

// Scanning
const BluetoothLEAdvertisement = AdvertisementNamespace.BluetoothLEAdvertisement;
const BluetoothLEAdvertisementWatcher = AdvertisementNamespace.BluetoothLEAdvertisementWatcher;
const BluetoothLEAdvertisementWatcherStatus = AdvertisementNamespace.BluetoothLEAdvertisementWatcherStatus ;
const DeviceWatcherStatus = EnumerationNamespace.DeviceWatcherStatus;

// Pairing
const DevicePairingResult = EnumerationNamespace.DevicePairingResult;

// GATT
const GattDeviceService = GattNamespace.GattDeviceService;
const GattCharacteristic = GattNamespace.GattCharacteristic;
// endregion Classes

// region Services and Characteristics
const SERVICE_COMMAND                       = "6E400001-B5A3-F393-E0A9-E50E24DCCA9E";
const CHARACTERISTIC_COMMAND_WRITE          = "6E400002-B5A3-F393-E0A9-E50E24DCCA9E";
const CHARACTERISTIC_COMMAND_NOTIFY         = "6E400003-B5A3-F393-E0A9-E50E24DCCA9E";

const SERVICE_FILE_TRANSFER                 = "FFEE0001-BBAA-9988-7766-554433221100";
const CHARACTERISTIC_FILE_TRANSFER_NOTIFY   = "FFEE0003-BBAA-9988-7766-554433221100";
const CHARACTERISTIC_FILE_TRANSFER_INDICATE = "FFEE0004-BBAA-9988-7766-554433221100";

const SERVICE_REAL_TIME                     = "00001523-1212-EFDE-1523-785FEABCD123";
const CHARACTERISTIC_REAL_TIME_NOTIFY       = "00001524-1212-EFDE-1523-785FEABCD123";
const CHARACTERISTIC_REAL_TIME_INDICATE     = "00001525-1212-EFDE-1523-785FEABCD123";

const SERVICE_EVENTS                        = "3A340720-C572-11E5-86C5-0002A5D5C51B";
const CHARACTERISTIC_EVENTS_NOTIFY          = "3A340721-C572-11E5-86C5-0002A5D5C51B";
// endregion Services and Characteristics

const COLUMBIA_CONSUMER_USER_CONFIRMATION_ADV_DATA 	= Buffer.from([0x2D, 0x43, 0x4C, 0x52]);
const COLUMBIA_CONSUMER_DATA_SESSION_READY_ADV_DATA = Buffer.from([0x2D, 0x43, 0x4C, 0x52, 0x2E, 0x73, 0x61]);

const COLUMBIA_CREATIVE_USER_CONFIRMATION_ADV_DATA 	= Buffer.from([0x2D, 0x43, 0x41, 0x54]);
const COLUMBIA_CREATIVE_DATA_SESSION_READY_ADV_DATA = Buffer.from([0x2D, 0x43, 0x41, 0x54, 0x2E, 0x73, 0x61]);

const VIPER_USER_CONFIRMATION_ADV_DATA 				= Buffer.from([0x2D, 0x56, 0x49, 0x50]);
const VIPER_DATA_SESSION_READY_ADV_DATA 			= Buffer.from([0x2D, 0x56, 0x49, 0x50, 0x2E, 0x53, 0x49]);

const DEBUG_CHARACTERISTICS = false;

const COMPANY_IDS = [0x4157, 0x4755];
const VIPER_ENABLED = true;
const FIND_SILENT_ADV = false;

// Events: ConnectFailed, BluetoothPoweredOff
class SmartPadBLE extends GenericSmartPad {
	constructor(appID) {
		super(SmartPadNS.TransportProtocol.BLE);
		this.appID = appID;

		this.bluetoothState = -1;

		this.device;
		this.deviceInfo;
		this.discovery;

		this.shouldFinalize = false;
		this.scanCompletedSuccessfully = false;
		this.disableConfigure = false;

		this.commandService = null;
		this.fileTransferService = null;
		this.realTimeService = null;
		this.eventService = null;

		this.characteristics = new BLECharacteristics();

		this.watcher = new BluetoothLEAdvertisementWatcher();
		this.watcher.scanningMode = AdvertisementNamespace.BluetoothLEScanningMode.active;

		this.initBTEvents();
		this.initCharacteristicsListeners();
	}

	initBTEvents() {
		let self = this;
		let registeredAdresses = [];

		let bluetoothRadio;

		let foundWacomDevice = false;
		let foundPairedDevice = false;

		let device;
		let connectionStatusCallback = (bleDevice) => {
			device = bleDevice;

			if (this.debug) console.log("connectionStatusCallback: connected =", bleDevice.connectionStatus == BluetoothNamespace.BluetoothConnectionStatus.connected)

			if (bleDevice.connectionStatus == BluetoothNamespace.BluetoothConnectionStatus.connected) {
				if (this.status.value < SmartPadNS.Status.CLOSING.value) {
					// TODO check all services
					if (!this.commandService)
						this.processConnect();
					else
						this.configureBle();
				}
			}
			else
				this.close(this.shouldFinalize);
		};

		Object.defineProperty(this, "device", {enumerable: true, configurable: true, get: () => device, set: (bleDevice) => {
			if (device) {
				device.off("ConnectionStatusChanged", connectionStatusCallback);
				device.close();
			}

			if (bleDevice) {
				device = bleDevice;
				device.on("ConnectionStatusChanged", connectionStatusCallback);
			}
			else {
				device.close();
				device = undefined;
			}
		}});

		// Radios is Microsoft Collections Object
		Radio.getRadiosAsync(function (sender, radios) {
			// Find the Bluetooth radio of the PC.
			for (let i = 0; i < radios.length; i++) {
				if (radios.getAt(i).kind == RadioKind.bluetooth) {
					bluetoothRadio = radios.getAt(i);
					break;
				}
			}

			// Get the initial state of the bluetooth module
			self.bluetoothState = bluetoothRadio.state;

			// Listen for Bluetooth state change events.
			bluetoothRadio.on("stateChanged", function (sender, args) {
				if (self.bluetoothState != sender.state) {
					self.bluetoothState = sender.state;

					if (sender.state == RadioState.on) {
						if (self.deviceInfo) {
							setTimeout(() => {
								self.open(self.deviceInfo);
							}, 500);
						}
					}
					else {
						self.emitter.emit("BluetoothPoweredOff");
						self.close(true);
					}
				}
			})
		});

		this.watcher.on("received", (watcher, advData) => {
			SmartPadBLE.getSmartPadDevice(advData, (deviceInformation, error) => {
				// error is for debug only

				if (deviceInformation && !registeredAdresses.includes(advData.bluetoothAddress)) {
					registeredAdresses.push(advData.bluetoothAddress);

					// give the user time to pair if is found Wacom device that is not paired with Windows.
					if (!foundWacomDevice && !deviceInformation.pairing.isPaired) {
						// Launch Bluetooth Settings in Windows
						// Launcher.launchUriAsync(new Uri("ms-settings:bluetooth"), function(sender, isSuccessful) {/* ignore */});

						// Reset the timeout in order to give more time to the user to pair their device
						clearTimeout(this.scanTimeoutID);
						this.scanTimeoutID = setTimeout(this.stopScan.bind(this), 40000);

						foundWacomDevice = true;
					}

					if (deviceInformation.pairing.isPaired)
						this.discovery.push(deviceInformation);
					else {
						let self = this;

						let intervalID = setInterval(() => {
							BluetoothLEDevice.fromBluetoothAddressAsync(advData.bluetoothAddress, function (sender, bleDevice) {
								if (bleDevice.deviceInformation.pairing.isPaired) {
									if (!foundPairedDevice) {
										foundPairedDevice = true;

										clearInterval(intervalID);
										SmartPadBLE.waitForCompletePairing(advData.bluetoothAddress, bleDevice.deviceInformation.name, () => {
											self.discovery = [];
											self.discovery.push(bleDevice);

											clearTimeout(self.scanTimeoutID);
											self.stopScan();
										});
									}
								}
								else
									bleDevice.close();
							});
						}, 500);

						//Make sure timeout is cleared after the 30 sec
						setTimeout(() => clearInterval(intervalID), 30000);
					}
				}
			})
		});

		this.watcher.on("stopped", () => {
			foundWacomDevice = false;
			foundPairedDevice = false;
			registeredAdresses = [];

			if (this.scanCompletedSuccessfully) {
				this.updateStatus(SmartPadNS.Status.SCAN_COMPLETE);
				if (this.discovery.length == 1) this.open(this.discovery[0]);
			}
		});
	}

	initCharacteristicsListeners() {
		let chunks;

		let processDeviceOutput = (characteristic, sender, args) => {
			if (this.debug) console.log("processing", characteristic.name);

			try {
				this.processDeviceOutput(SmartPadBLE.getBytesFromMSBuffer(args.characteristicValue), characteristic.channel);
			}
			catch(error) {
				this.completeState(error);
			}
		};

		this.characteristics.setListener(BLECharacteristics.CharacteristicType.COMMAND_NOTIFY, (characteristic, sender, args) => {
			if (this.debug) console.log("processing", characteristic.name);

			let buffer = SmartPadBLE.getBytesFromMSBuffer(args.characteristicValue);

			if (buffer[0] == 0xC8) {
				// FILE_UPLOAD_STARTED
				if (buffer[2] == 0xBE) {
					chunks = {};
					this.disableCharacteristic(this.characteristics.get(BLECharacteristics.CharacteristicType.EVENTS_NOTIFY)).catch(reason => console.warn(reason.message));
				}
				// FILE_UPLOAD_ENDED
				else if (buffer[2] == 0xED) {
					Object.keys(chunks).map(time => parseInt(time)).sort((a, b) => a - b).forEach(time => {
						let buffer = chunks[time];
						this.cmdChainGetOldestFile().receiveBuffer(buffer);
					});

					chunks = {};
					this.enableCharacteristic(this.characteristics.get(BLECharacteristics.CharacteristicType.EVENTS_NOTIFY)).catch(reason => console.warn(reason.message));
				}
			}

			try {
				this.processDeviceOutput(buffer, characteristic.channel);
			}
			catch(error) {
				this.completeState(error);
			}
		});

		this.characteristics.setListener(BLECharacteristics.CharacteristicType.FILE_TRANSFER_NOTIFY, (characteristic, sender, args) => {
			let buffer = SmartPadBLE.getBytesFromMSBuffer(args.characteristicValue);
			if (this.debug) console.log(characteristic.name, Wacom.SmartPadCommunication.SmartPad.byteArrayAsHexString(buffer), args.timestamp.getTime());

			this.updateCommandChainTimeout();
			this.cmdChainGetOldestFile().receiveBuffer(buffer);
		});

		this.characteristics.setListener(BLECharacteristics.CharacteristicType.FILE_TRANSFER_INDICATE, (characteristic, sender, args) => {
			let buffer = SmartPadBLE.getBytesFromMSBuffer(args.characteristicValue);
			if (this.debug) console.log(characteristic.name, Wacom.SmartPadCommunication.SmartPad.byteArrayAsHexString(buffer), args.timestamp.getTime());

			this.updateCommandChainTimeout();
			// this.cmdChainGetOldestFile().receiveBuffer(buffer);
			chunks[args.timestamp.getTime()] = buffer;
		});

		this.characteristics.setListener(BLECharacteristics.CharacteristicType.EVENTS_NOTIFY, processDeviceOutput);
		this.characteristics.setListener(BLECharacteristics.CharacteristicType.REAL_TIME_NOTIFY, processDeviceOutput);
	}

	isOpen(orConnecting) {
		let result = this.bluetoothState == RadioState.on && this.device && this.device.connectionStatus == BluetoothNamespace.BluetoothConnectionStatus.connected;
		if (orConnecting) result = result || this.status == SmartPadNS.Status.CONNECTING;
		return result;
	}

	open(device) {
		if (this.isOpen()) return;

		if (this.status == SmartPadNS.Status.SCAN) {
			if (this.debug) console.info("scanning...");
			return;
		}
		else if (this.status == SmartPadNS.Status.CONNECTING) {
			if (this.debug) console.info("connecting...");
			return;
		}
		else if (this.status == SmartPadNS.Status.CONNECTED) {
			if (this.debug) console.info("connected but not ready yet...");
			return;
		}

		if (device) {
			this.updateStatus(SmartPadNS.Status.CONNECTING);
			this.connect(device);
		}
		else {
			this.startScan();
			this.scanTimeoutID = setTimeout(this.stopScan.bind(this), 20000);
		}
	}

	connect(device) {
		if (device instanceof BluetoothLEDevice) {
			this.device = device;
			this.processConnect();
		}
		else {
			let self = this;

			this.deviceInfo = device;

			BluetoothLEDevice.fromBluetoothAddressAsync(device.address, function (sender, bleDevice) {
				if (!bleDevice || !bleDevice.deviceInformation.pairing.isPaired) {
					self.emitter.emit("DeviceNotFound", new Error("Device unpaired unexpectedly"), device);
					self.close(true);
					return;
				}

				self.device = bleDevice;
				self.type = device.type;

				if (bleDevice.connectionStatus == BluetoothNamespace.BluetoothConnectionStatus.connected)
					self.processConnect();
			});
		}
	}

	processConnect() {
		this.discoverServicesAndCharacteristics(this.device.bluetoothAddress).then(() => {
			return Promise.all(this.characteristics.values(true).map(characteristic => this.enableCharacteristic(characteristic)));
		}).then(() => {
			this.characteristics.values().forEach(characteristic => characteristic.on("ValueChanged", characteristic.listener));
			return Promise.resolve();
		}).catch(reason => {
			this.logError(reason);
			this.close(true);
		}).then(() => {
			this.configureBle();
		});
	}

	discoverServicesAndCharacteristics(address) {
		let self = this;

		return new Promise((resolve, reject) => {
			BluetoothLEDevice.fromBluetoothAddressAsync(address, function (sender, bleDevice) {
				if (self.debug) console.log("Discovering services and characteristics...");
				self.device = bleDevice;

				self.commandService = self.device.getGattService(SERVICE_COMMAND);
				self.fileTransferService = self.device.getGattService(SERVICE_FILE_TRANSFER);
				self.realTimeService = self.device.getGattService(SERVICE_REAL_TIME);
				self.eventService = self.device.getGattService(SERVICE_EVENTS);

				try {
					self.characteristics.set(BLECharacteristics.CharacteristicType.COMMAND_WRITE, self.commandService.getCharacteristics(CHARACTERISTIC_COMMAND_WRITE)[0]);
					self.characteristics.set(BLECharacteristics.CharacteristicType.COMMAND_NOTIFY, self.commandService.getCharacteristics(CHARACTERISTIC_COMMAND_NOTIFY)[0]);
					self.characteristics.set(BLECharacteristics.CharacteristicType.EVENTS_NOTIFY, self.eventService.getCharacteristics(CHARACTERISTIC_EVENTS_NOTIFY)[0]);
					self.characteristics.set(BLECharacteristics.CharacteristicType.REAL_TIME_NOTIFY, self.realTimeService.getCharacteristics(CHARACTERISTIC_REAL_TIME_NOTIFY)[0]);
					self.characteristics.set(BLECharacteristics.CharacteristicType.REAL_TIME_INDICATE, self.realTimeService.getCharacteristics(CHARACTERISTIC_REAL_TIME_INDICATE)[0]);
					self.characteristics.set(BLECharacteristics.CharacteristicType.FILE_TRANSFER_NOTIFY, self.fileTransferService.getCharacteristics(CHARACTERISTIC_FILE_TRANSFER_NOTIFY)[0]);
					self.characteristics.set(BLECharacteristics.CharacteristicType.FILE_TRANSFER_INDICATE, self.fileTransferService.getCharacteristics(CHARACTERISTIC_FILE_TRANSFER_INDICATE)[0]);

					resolve();
				}
				catch(e) {
					reject(e);
				}
			});
		});
	}

	enableCharacteristic(characteristic) {
		return new Promise((resolve, reject) => {
			characteristic.writeClientCharacteristicConfigurationDescriptorAsync(GattNamespace.GattClientCharacteristicConfigurationDescriptorValue[characteristic.type], function(sender, status) {
				if (status == GattNamespace.GattCommunicationStatus.unreachable)
					reject(new Error("Device characteristic (" + characteristic.name + ") is unreachable"));
				else {
					if (this.debug) console.log(characteristic.name, "enabled");
					resolve();
				}
			});
		});
	}

	disableCharacteristic(characteristic) {
		return new Promise((resolve, reject) => {
			characteristic.writeClientCharacteristicConfigurationDescriptorAsync(GattNamespace.GattClientCharacteristicConfigurationDescriptorValue.none, function(sender, status) {
				if (status == GattNamespace.GattCommunicationStatus.success) {
					if (this.debug) console.log(characteristic.name, "disabled");
					resolve();
				}
				else
					reject(new Error("Device characteristic (" + characteristic.name + ") disabling is unsuccessful"));
			});
		});
	}

	close(stopReconnecting) {
		this.shouldFinalize = stopReconnecting;

		if (this.watcher && this.watcher.status == BluetoothLEAdvertisementWatcherStatus.started)
			this.stopScan();

		if (this.isOpen()) {
			super.close(() => {
				this.updateStatus(SmartPadNS.Status.DISCONNECTING);

				let completeClose = () => {
					if (stopReconnecting)
						this.finalize();

					this.completeClose();

					if (!stopReconnecting)
						this.updateStatus(SmartPadNS.Status.CONNECTING);
				};

				if (this.uncompleteCommand)
					completeClose();
				else {
					this.forceDisconnect().then(completeClose).catch(reason => {
						this.logError(reason);
						completeClose();
					});
				}
			});
		}
		else {
			if (stopReconnecting)
				this.finalize();

			super.close(() => {
				this.completeClose();

				if (!stopReconnecting)
					this.updateStatus(SmartPadNS.Status.CONNECTING);
			});
		}
	}

	finalize() {
		if (!this.device) return;

		if (this.debug) console.log("--------- FINALIZE ---------");

		this.shouldFinalize = false;

		if (this.commandService) {
			this.commandService.close();
			this.commandService = null;
		}

		if (this.fileTransferService) {
			this.fileTransferService.close();
			this.fileTransferService = null;
		}

		if (this.realTimeService) {
			this.realTimeService.close();
			this.realTimeService = null
		}

		if (this.eventService) {
			this.eventService.close();
			this.eventService = null;
		}

		this.characteristics.close();

		this.discovery = [];
		this.device = null;

		delete this.deviceInfo;
	}

	configureBle() {
		this.address = this.device.bluetoothAddress;

		this.updateStatus(SmartPadNS.Status.CONNECTED);

		if (this.disableConfigure) {
			this.disableConfigure = false;
			return;
		}

		this.configure().then(() => {
			// FILE_TRANSFER_NOTIFY
			// return this.setParameter(Wacom.SmartPadCommunication.SmartPadParameter.FILE_TRANSFER_SERVICE_REPORTING_TYPE, 0);

			// FILE_TRANSFER_INDICATE
			return this.setParameter(Wacom.SmartPadCommunication.SmartPadParameter.FILE_TRANSFER_SERVICE_REPORTING_TYPE, 1);
		}).then(() => {
			this.updateStatus(SmartPadNS.Status.READY);
		}).catch(reason => {
			this.logError(reason);

			if (reason.message != "Device is recognized but it is in User Confirmation mode")
				this.close();
			else if (this.type == "COLUMBIA_CONSUMER")
				this.disableConfigure = true;
		});
	}

	sendCommand(bytes) {
		if (this.debug) console.log("Send Command:", SmartPadBLE.byteArrayAsHexString(bytes));

		return new Promise((resolve, reject) => {
			let buffer = SmartPadBLE.getMSBuffer(bytes);

			try {
				this.characteristics.get(BLECharacteristics.CharacteristicType.COMMAND_WRITE).writeValueAsync(buffer, function() {
					if (this.debug) console.log("written, args:", arguments);
					resolve();
				});
			}
			catch(error) {
				if (error.toString().indexOf("The object has been closed.") >= 0) {
					reject(new Error("Bluetooth is powered off"));
					this.close(true);
				}
			}
		});
	}

	startScan() {
		this.updateStatus(SmartPadNS.Status.SCAN);

		this.scanCompletedSuccessfully = false;
		this.discovery = [];

		this.watcher.start();
	}

	stopScan() {
		clearTimeout(this.scanTimeoutID);
		this.scanCompletedSuccessfully = true;
		this.watcher.stop();
	}

	static getSmartPadDevice(advData, callback) { // callback(deviceInformation, error)
		if (advData.advertisement.manufacturerData.length == 0) {
			callback(undefined, new Error("Missing manufacturer data"));
			return;
		}

		let manufacturerData = advData.advertisement.manufacturerData[0];
		let companyId = manufacturerData.companyId;

		if (!manufacturerData.data) {
			callback(undefined, new Error("Missing manufacturer data"));
			return;
		}

		if (!COMPANY_IDS.includes(companyId)) {
			callback(undefined, new Error("Not a SmartPad device"));
			return;
		}

		let data = Buffer.from(SmartPadBLE.getBytesFromMSBuffer(manufacturerData.data));
		let type;

		if (data.equals(COLUMBIA_CONSUMER_USER_CONFIRMATION_ADV_DATA))
			type = "COLUMBIA_CONSUMER";
		else if (data.equals(COLUMBIA_CONSUMER_DATA_SESSION_READY_ADV_DATA) && FIND_SILENT_ADV)
			type = "COLUMBIA_CONSUMER";
		else if (data.equals(COLUMBIA_CREATIVE_USER_CONFIRMATION_ADV_DATA))
			type = "COLUMBIA_CREATIVE";
		else if (data.equals(COLUMBIA_CREATIVE_DATA_SESSION_READY_ADV_DATA) && FIND_SILENT_ADV)
			type = "COLUMBIA_CREATIVE";
		else if (data.equals(VIPER_USER_CONFIRMATION_ADV_DATA) && VIPER_ENABLED)
			type = "VIPER";
		else if (data .equals(VIPER_DATA_SESSION_READY_ADV_DATA) && VIPER_ENABLED && FIND_SILENT_ADV)
			type = "VIPER";

		if (!type) {
			callback(undefined, new Error("Not a SmartPad device"));
			return;
		}

		BluetoothLEDevice.fromBluetoothAddressAsync(advData.bluetoothAddress, function (sender, bleDevice) {
			let deviceInformation = bleDevice.deviceInformation;
			deviceInformation.type = type;
			deviceInformation.address = advData.bluetoothAddress;

			bleDevice.close();

			callback(deviceInformation);
		});
	}

	static waitForCompletePairing(address, name, callback) {
		let devices = new Map();

		address = address.toString(16);

		let filter = "System.Devices.InterfaceClassGuid:=\"{6E3BB679-4372-40C8-9EAA-4509DF260CD8}\"" +
			" AND (" +
				" System.DeviceInterface.Bluetooth.DeviceAddress:= " + address +
				" OR System.Devices.Aep.Bluetooth.IssueInquiry:=System.StructuredQueryType.Boolean#True " +
			")" +
			" AND (" +
				"System.DeviceInterface.Bluetooth.ServiceGuid:=\"{" + SERVICE_COMMAND + "}\"" +
				" OR System.DeviceInterface.Bluetooth.ServiceGuid:=\"{" + SERVICE_FILE_TRANSFER + "}\"" +
				" OR System.DeviceInterface.Bluetooth.ServiceGuid:=\"{" + SERVICE_REAL_TIME + "}\"" +
				" OR System.DeviceInterface.Bluetooth.ServiceGuid:=\"{" + SERVICE_EVENTS    + "}\"" +
			")" +
			" AND System.Devices.InterfaceEnabled:=System.StructuredQueryType.Boolean#True";

		let deviceWatcher = DeviceInformation.createWatcher(filter, ["System.Devices.Aep.DeviceAddress", "System.Devices.DeviceInstanceId"]);

		let foundDeviceAddress;

		let tryCompleteWaiting = (sender) => {
			// TODO: pass servicesCount as parameter instead of 4
			if (devices.size < 4) return;

			let values = devices.values();
			let next;

			while (!(next = values.next()).done) {
				if (next.value.name != name)
					return;
			}

			sender.off("Added", deviceWatcherAdded);
			sender.off("Updated", deviceWatcherUpdated);

			sender.stop();

			callback();
		};

		let deviceWatcherAdded = (sender, deviceInformation) => {
			let strArr = deviceInformation.id.split("#");
			let strArr2 = strArr[1].split("_");

			foundDeviceAddress = strArr2[strArr2.length - 1];
			if (address == foundDeviceAddress) {
				devices.set(deviceInformation.id, deviceInformation);
				tryCompleteWaiting(sender)
			}
		};

		let deviceWatcherUpdated = (sender, update) => {
			if (sender.status >= DeviceWatcherStatus.stopped) return;

			if (foundDeviceAddress && address == foundDeviceAddress && devices.get(update.id)) {
				devices.get(update.id).update(update);
				tryCompleteWaiting(sender);
			}
		};

		deviceWatcher.on("Added", deviceWatcherAdded);
		deviceWatcher.on("Updated", deviceWatcherUpdated);
		deviceWatcher.start();
	}

	static list(callback) {
		let devices = [];

		let filter = "System.Devices.InterfaceClassGuid:=\"{6E3BB679-4372-40C8-9EAA-4509DF260CD8}\"" +
			 " AND System.DeviceInterface.Bluetooth.ServiceGuid:=\"{" + SERVICE_COMMAND + "}\"" +
			 // 	"System.DeviceInterface.Bluetooth.ServiceGuid:=\"{" + SERVICE_COMMAND + "}\"" +
				// " OR System.DeviceInterface.Bluetooth.ServiceGuid:=\"{" + SERVICE_FILE_TRANSFER + "}\"" +
			 // 	" OR System.DeviceInterface.Bluetooth.ServiceGuid:=\"{" + SERVICE_REAL_TIME + "}\"" +
			 // 	" OR System.DeviceInterface.Bluetooth.ServiceGuid:=\"{" + SERVICE_EVENTS    + "}\"" +
			 // ")";
			" AND System.Devices.InterfaceEnabled:=System.StructuredQueryType.Boolean#True";

		let deviceWatcher = DeviceInformation.createWatcher(filter, ["System.Devices.Aep.DeviceAddress", "System.Devices.DeviceInstanceId"]);

		let deviceWatcherAdded = (sender, deviceInformation) => {
			BluetoothLEDevice.fromIdAsync(deviceInformation.id, (sender, bleDevice) => {
				devices.push({name: deviceInformation.name, address: bleDevice.bluetoothAddress});
			});
		};

		deviceWatcher.on("Added", deviceWatcherAdded);
		deviceWatcher.start();

		setTimeout(() => {
			deviceWatcher.off("Added", deviceWatcherAdded);
			deviceWatcher.stop();

			callback(devices);
		}, 1000)
	}

	static getBytesFromMSBuffer(msBuffer) {
		let dataReader = StreamsNamespace.DataReader.fromBuffer(msBuffer);
		let responseBytes = [];

		while (dataReader.unconsumedBufferLength > 0)
			responseBytes.push(dataReader.readByte())

		dataReader.close();
		return responseBytes;
	}

	static getMSBuffer(cmdBytes) {
		let dataWriter = new StreamsNamespace.DataWriter()

		for (let i = 0; i < cmdBytes.length; i++)
			dataWriter.writeByte(cmdBytes[i]);

		let buffer = dataWriter.detachBuffer();
		dataWriter.close();

		return buffer;
	}
}

module.exports = SmartPadBLE;
