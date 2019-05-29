import uuid from "uuid";

const PromiseQueue = require("../../scripts/PromiseQueue");

const DeviceInputTransformer = require("../../scripts/DeviceInputTransformer");
const DeviceModel = require("../../scripts/DeviceModel");
const {Note} = require("../../scripts/Note");

const project = require("../../project.config.js");

import * as Modals from '../constants/Modals'
import * as WizardTypes from '../constants/WizardTypes'
import * as WizardSteps from '../constants/WizardSteps'
import * as DeviceStatus from '../constants/DeviceStatus'

let smartPadUSB;
let smartPadBTC;
let smartPadBLE;

// let smartPad;
// let nextSmartPad;

let DeviceManager = {
	context: null,
	discardReconnect: false,

	type: null,
	serialPortSupport: false,
	btcSupport: false,

	BTCL: project["BTCL"],
	BTLE: project["BTLE"],
	// SKIP_DOWNLOAD: debug && true,

	UPDATE_DEVICE_RETRY_TIMEOUT: 2000,
	CHECK_CONNECTED_INTERVAL: 5000,
	SEARCHING_TIMEOUT: 30000,
	BLE_CONNECTED_TIMEOUT: 5 * 60 * 1000 * (debug?0:1),
	KEEP_ALIVE_TIMEOUT: 10000,
	RECONNECT_TIMEOUT: 10000,
	DOWNLOAD_INTERVAL: 15000,

	init(appID) {
		let device;

		Object.defineProperty(this, "device", {
			set: (value) => {
				if (global.mainMenuManager) mainMenuManager.refresh();

				if (value && value != "REMOVE")
					device = value;
				else {
					if (value == "REMOVE")
						device = null;
					else
						delete device[device.protocol];

					// DBManager.remove(DBManager.entities.DEVICE);

					if (global.smartPad) {
						smartPad.close(true);
						delete global.smartPad;

						this.setDeviceStatus(DeviceStatus.NOT_PAIRED);
					}
				}

				this.setDevice(device);
				DBManager.set(DBManager.entities.DEVICE, device);
			},
			get: () => {
				return device;
			}
		});

		Object.defineProperty(this, "transportProtocol", {
			get: () => {
				return global.smartPad ? smartPad.transportProtocol : null ;
			}
		});

		return DBManager.get(DBManager.entities.DEVICE).then(value => {
			device = value;

			if (device && device.firmwareVersion && typeof device.firmwareVersion.version == "string")
				device.firmwareVersion = {version: [device.firmwareVersion.version], type: [[device.firmwareVersion.type]]};
		}).then(() => {
			smartPadUSB = new SmartPadUSB();
			smartPadUSB.inputTransformer = new DeviceInputTransformer();
			smartPadUSB.debug = project.debugDevice;
			if (device) smartPadUSB.deviceInfo = device["USB"];

			if (DeviceManager.BTCL) {
				if (global.SmartPadSPP) {
					this.serialPortSupport = true;

					smartPadBTC = new SmartPadSPP(appID, ::this.resolveAuthorize);
					smartPadBTC.inputTransformer = new DeviceInputTransformer();
					smartPadBTC.debug = project.debugDevice;
					if (device) smartPadBTC.deviceInfo = device["SPP"];
				}
				else if (global.SmartPadBTC) {
					this.btcSupport = true;

					smartPadBTC = new SmartPadBTC(appID, ::this.resolveAuthorize);
					smartPadBTC.inputTransformer = new DeviceInputTransformer();
					smartPadBTC.debug = project.debugDevice;
					if (device) smartPadBTC.deviceInfo = device["BTC"];
				}
				else
					throw new Error("SmartPad bluetooth classic not found");
			}

			if (DeviceManager.BTLE && SmartPadBLE) {
				smartPadBLE = new SmartPadBLE(appID, ::this.resolveAuthorize);
				smartPadBLE.inputTransformer = new DeviceInputTransformer();
				smartPadBLE.debug = project.debugDevice;
				if (device) smartPadBLE.deviceInfo = device["BLE"];
			}

			return SmartPadUSB.attachListeners((id, error) => {
				if (debug) console.log("[DEVICE_MANAGER] usb device attached:", id, "found:", SmartPadUSB.devices.length);

				if (error) {
					if (smartPadUSB.debug) console.error(error);
					this.addNotification("notification.malfunction.device.detected");
				}
				else {
					global.updateState({usbConnected: true});

					if (global.smartPad) {
						if (smartPad.isOpen()) {
							// if (smartPad.transportProtocol == SmartPadNS.TransportProtocol.BTC && smartPad.serial == id)
							if (smartPad.protocol == "SPP" && smartPad.serial == id) {
								this.instantReconnect = true;
								smartPad.close();
							}
						}
						else {
							if (this.device && this.device["USB"])
								this.reconnect(true);
						}
					}
				}
			}, (id) => {
				if (debug) console.log("[DEVICE_MANAGER] usb device detached:", id, "left:", SmartPadUSB.devices.length);

				if (!SmartPadUSB.devices.length)
					global.updateState({usbConnected: false});
			});
		}).then(() => device);
	},

	linkUI(layoutBridge) {
		Object.keys(layoutBridge).forEach(key => this[key] = layoutBridge[key]);

		this.linkedWithUI = true;
	},

	clean() {
		this.device = "REMOVE";
	},

	configure: function (context) {
		this.update(context);

		if (!global.smartPad && this.device && context != DeviceManager.Context.SETUP) {
			this.type = this.device.type || "VIPER";

			if (this.device.protocol == "USB" && this.device["USB"])
				global.smartPad = smartPadUSB;
			else if ((this.device.protocol == "BTC" && this.device["BTC"]) || (this.device.protocol == "SPP" && this.device["SPP"]))
				global.smartPad = smartPadBTC;
			else if (this.device.protocol == "BLE" && this.device["BLE"])
				global.smartPad = smartPadBLE;

			this.updateOrientation(this.device.orientation);
		}
	},

	update: function (context) {
		if (!context) throw new Error("context is required");
		if (this.context == context) return;

		console.info("========= " + context.name + " =========");
		UIManager.updateAppContext(context.name);

		if (!this.commonEvents) {
			this.commonEvents = true;

			this.initContextEvents();

			this.attachEvents(smartPadUSB);
			if (smartPadBTC) this.attachEvents(smartPadBTC);
			if (smartPadBLE) this.attachEvents(smartPadBLE);
		}

		let exitSetup = (this.context == DeviceManager.Context.SETUP);

		switch (this.context) {
			case DeviceManager.Context.SETUP:
				this.detachFTEEvents(smartPadUSB);
				if (smartPadBTC) this.detachFTEEvents(smartPadBTC);
				if (smartPadBLE) this.detachFTEEvents(smartPadBLE);

				break;
			case DeviceManager.Context.LIBRARY:
				this.detachLibraryEvents(smartPadUSB);
				if (smartPadBTC) this.detachLibraryEvents(smartPadBTC);
				if (smartPadBLE) this.detachLibraryEvents(smartPadBLE);

				break;

			case DeviceManager.Context.CREATION:
				this.detachCreationEvents(smartPadUSB);
				if (smartPadBTC) this.detachCreationEvents(smartPadBTC);
				if (smartPadBLE) this.detachCreationEvents(smartPadBLE);

				break;
			case DeviceManager.Context.LIVE:
				this.detachLiveEvents(smartPadUSB);
				if (smartPadBTC) this.detachLiveEvents(smartPadBTC);
				if (smartPadBLE) this.detachLiveEvents(smartPadBLE);

				if (global.smartPad && global.smartPad.isReady())
					global.smartPad.switchToFileTransferMode().catch(console.error);

				break;
		}

		this.context = context;

		switch (context) {
			case DeviceManager.Context.SETUP:
				this.attachFTEEvents(smartPadUSB);
				if (smartPadBTC) this.attachFTEEvents(smartPadBTC);
				if (smartPadBLE) this.attachFTEEvents(smartPadBLE);

				break;
			case DeviceManager.Context.LIBRARY:
				this.attachLibraryEvents(smartPadUSB);
				if (smartPadBTC) this.attachLibraryEvents(smartPadBTC);
				if (smartPadBLE) this.attachLibraryEvents(smartPadBLE);

				if (exitSetup && global.smartPad && !smartPad.isOpen(true)) {
					let deviceInfo = this.device[smartPad.protocol];

					if (deviceInfo)
						smartPad.open(deviceInfo);
				}

				if (this.execDownload) {
					delete this.execDownload;
					this.download();
				}

				break;

			case DeviceManager.Context.CREATION:
				this.attachCreationEvents(smartPadUSB);
				if (smartPadBTC) this.attachCreationEvents(smartPadBTC);
				if (smartPadBLE) this.attachCreationEvents(smartPadBLE);

				break;
			case DeviceManager.Context.LIVE:
				this.attachLiveEvents(smartPadUSB);
				if (smartPadBTC) this.attachLiveEvents(smartPadBTC);
				if (smartPadBLE) this.attachLiveEvents(smartPadBLE);

				break;
		}
	},

	open(protocol, deviceInfo, deviceType) {
		if (protocol == "DEFAULT") {
			if (global.smartPad) {
				if (smartPad.transportProtocol == SmartPadNS.TransportProtocol.BLE) {
					this.setDeviceStatus(DeviceStatus.SEARCHING_LOADING);

					this.searchingTimeoutID = setTimeout(() => {
						this.setDeviceStatus(DeviceStatus.DISCONNECTED);
					}, DeviceManager.SEARCHING_TIMEOUT);
				}
				else
					this.setDeviceStatus(DeviceStatus.DISCONNECTED);

				smartPad.open(this.device[smartPad.protocol]);
			}

			return;
		}

		if (deviceType)
			this.type = deviceType;
		else if (smartPadBLE) {
			this.openDialog(Modals.SELECT_DEVICE_TYPE);
			return;
		}
		else {
			protocol = "USB";
			this.type = "VIPER";
		}

		if (protocol == "USB") {
			if (SmartPadUSB.devices.length > 0) {
				this.reconfigure(() => {
					this.smartPad = smartPadUSB;
					this.smartPad.open();
				});
			}
			else {
				if (DeviceManager.BTCL)
					this.openDialog(Modals.SELECT_CONNECTION);
				else
					this.openDialog(Modals.NO_SUPPORTED_DEVICE);
			}
		}
		else if (protocol == "SPP") {
			if (deviceInfo) {
				this.reconfigure(() => {
					this.smartPad = smartPadBTC;
					this.smartPad.open();
				});

				this.openDialog(Modals.BT_INSTRUCTIONS_WAITING);
			}
			else {
				SmartPadSPP.stopScanner().then(() => {
					return SmartPadSPP.list();
				}).then(devices => {
					global.updateState({sppConnected: true});
				}).catch(() => {
					clearInterval(this.checkConnID);

					this.checkConnID = setTimeout(() => {
						if (debug) console.log("[DEVICE_MANAGER] check SPP connected");
						DeviceManager.open("SPP", null, "VIPER");
					}, DeviceManager.CHECK_CONNECTED_INTERVAL);
				});
			}
		}
		else if (protocol == "BT") {
			if (deviceInfo)
				this.smartPad.open(deviceInfo);
			else {
				clearInterval(this.checkConnID);

				this.reconfigure(() => {
					this.smartPad = (this.type == "VIPER") ? smartPadBTC : smartPadBLE;
					this.smartPad.open();
				});
			}
		}
		else
			throw new Error("Unknown protocol detected:", protocol);
	},

	clearDeviceConnectedCheck: function() {
		clearInterval(this.checkConnID);
	},

	isOpen: function(waiting) {
		return global.smartPad && smartPad.isOpen(waiting);
	},

	setName: function(name) {
		this.onDeviceReady = () => {
			delete this.onDeviceReady;
			return this.rename(name.trim()).catch(SmartPadUSB.logError);
		};

		if (smartPad.isOpen() && (smartPad.state == SmartPadNS.State.READY || !this.downloading))
			this.onDeviceReady().catch(SmartPadUSB.logError);
	},

	rename: function(name) {
		return new Promise((resolve, reject) => {
			if (name == this.device.name)
				resolve();
			else {
				smartPad.switchToReadyMode().then(() => {
					return smartPad.setDeviceName(name);
				}).then(() => {
					this.device.name = name;
					DBManager.edit(DBManager.entities.DEVICE, {name: name});

					this.setDevice(this.device);

					if (this.context == DeviceManager.Context.SETUP)
						return Promise.resolve();
					else
						return smartPad.switchToFileTransferMode();
				}).catch(reject);
			}
		});
	},

	close: function() {
		return new Promise((resolve, reject) => {
			if (global.smartPad) {
				if (smartPad.isOpen()) {
					if (smartPad instanceof SmartPadUSB && smartPad.state == SmartPadNS.State.REAL_TIME) {
						if (smartPad.isReady()) {
							smartPad.switchToReadyMode().then(() => {
								resolve(true);
								smartPad.close(true);
							}).catch(reject);
						}
						else
							reject("smartPad is busy, waiting...");
					}
					else {
						resolve(true);
						smartPad.close(true);
					}
				}
				else if (this.serialPortSupport)
					SmartPadSPP.stopScanner().then(resolve).catch(reject);
				else
					resolve(false);
			}
			else
				resolve(false);
		});
	},

	triggerLiveMode: function() {
		if (!global.smartPad) {
			this.addNotification("notification.device.noFound");
			return;
		}
		else if (this.downloading) {
			this.addNotification("notification.no.live.mode.while.note.transfer");
			return;
		}

		if (smartPad.isReady()) {
			smartPad.switchToRealTimeMode().then(() => {
				this.keepAlive();

				this.closeDialog();
				global.redirect("/live");
			}).catch(reason => {
				console.error(reason);
				this.addNotification("notification.trigger.live.mode.failed");
			});
		}
		else {
			this.execLiveMode = true;
			UIManager.updateAppContext("LIVE_MODE_ATTEMPT");

			this.openDialog("LiveMode" + ((smartPad.protocol == "SPP")?"BTC":smartPad.protocol) + "Waiting");

			return;
		}
	},

	reconfigure: function (callback) {
		this.completeReconfigure = (timeout) => {
			delete this.completeReconfigure;

			if (timeout)
				setTimeout(callback, 250);
			else
				callback();
		};

		if (global.smartPad && global.smartPad.isOpen(true))
			smartPad.close(true);
		else
			this.completeReconfigure();
	},

	getDeviceModel() {
		return new DeviceModel(smartPad.size, smartPad.orientation);
	},

	updateOrientation: function (orientation, edit) {
		if (typeof orientation == "undefined") {
			orientation = 0;
			console.warn(new Error("orientation is required"));
		}

		smartPadUSB.orientation = orientation;
		if (smartPadBTC) smartPadBTC.orientation = orientation;
		if (smartPadBLE) smartPadBLE.orientation = orientation;

		if (this.device)
			this.device.orientation = orientation;

		if (edit) {
			this.setDevice(this.device);

			UAManager.hardware("Set Orientation", orientation);
			DBManager.edit(DBManager.entities.DEVICE, {orientation: orientation});
		}
	},

	reconnect: function (instant) {
		delete this.instantReconnect;

		if (!global.smartPad || !this.device || (!this.device["USB"] && !this.device["BTC"]) || smartPad.transportProtocol == SmartPadNS.TransportProtocol.BLE)
			return;

		if (smartPad.isOpen() || this.discardReconnect)
			return;

		if (this.context == DeviceManager.Context.SETUP || this.forgetDevice) {
			clearTimeout(this.reconnectTimeoutID);
			this.reconnectTimeoutID = setTimeout(() => this.reconnect(), DeviceManager.RECONNECT_TIMEOUT);

			return;
		}

		if (debug && !instant)
			console.log("[DEVICE_MANAGER] attempt to reconnect", this.context.name);

		let lookup = (smartPad) => {
			return new Promise((resolve, reject) => {
				if (smartPad && smartPad.deviceInfo) {
					if (debug) console.info("[DEVICE_MANAGER]", "lookup:", smartPad.protocol);

					if (smartPad instanceof SmartPadUSB) {
						if (SmartPadUSB.devices.includes(smartPad.deviceInfo.id))
							resolve();
						else {
							let error;

							if (SmartPadUSB.devices.length)
								error = "Unknown USB device detected";

							reject(error);
						}
					}
					else if (this.serialPortSupport && smartPad instanceof SmartPadSPP)
						SmartPadSPP.list(smartPad.deviceInfo).then(devices => resolve(smartPad.deviceInfo)).catch(reject);
					else {
						SmartPadBTC.list(false).then(devices => {
							if (devices.map(device => device.id).includes(smartPad.deviceInfo.id))
								resolve();
							else
								reject();
						}).catch(reject);
					}
				}
				else
					reject();
			});
		};

		let protocolsLookup = (smartPads) => {
			let smartPad = smartPads.shift();

			if (smartPad) {
				lookup(smartPad).then(deviceInfo => {
					if (debug) console.info("[DEVICE_MANAGER]", smartPad.protocol, "found ...");
					resolveLookup(smartPad, deviceInfo);
				}).catch((reason) => {
					if (reason) console.warn(reason);
					protocolsLookup(smartPads);
				});
			}
			else
				this.reconnect();
		};

		let resolveLookup = (smartPad, deviceInfo) => {
			deviceInfo = Object.assign({}, deviceInfo || smartPad.deviceInfo, {reconnect: true});

			global.smartPad = smartPad;

			if (this.serialPortSupport && smartPad.transportProtocol == SmartPadNS.TransportProtocol.USB)
				SmartPadSPP.stopScanner().then(() => smartPad.open(deviceInfo)).catch(console.error);
			else
				smartPad.open(deviceInfo);
		};

		clearTimeout(this.reconnectTimeoutID);

		if (instant)
			protocolsLookup([smartPadUSB, smartPadBTC]);
		else
			this.reconnectTimeoutID = setTimeout(() => this.reconnect(true), DeviceManager.RECONNECT_TIMEOUT);
	},

	initContextEvents: function () {
		this.liveStatusUpdate = (event) => {
			if (event.status == SmartPadNS.Status.CLOSED || event.status == SmartPadNS.Status.DISCONNECTED) {
				WILL.abort();

				if (this.liveDeviceClosed)
					this.liveDeviceClosed();
			}
		}

		setInterval(DeviceManager.download.bind(DeviceManager), DeviceManager.DOWNLOAD_INTERVAL);
	},

	attachEvents: function (smartPad) {
		smartPad.on("StatusUpdate", (event) => {
			console.info("--------- " + event.status.name + " ---------");

			switch (event.status) {
				case SmartPadNS.Status.READY:
					if (this.context == DeviceManager.Context.SETUP) {
						global.smartPad = event.smartPad;
						UAManager.hardware("Pair Device", smartPad.protocol + " Pairing successful (" + this.type + ")");
					}

					if (!this.device || this.device.type != smartPad.type)
						AuthenticationManager.createAsset(smartPad);

					clearTimeout(this.searchingTimeoutID);
					clearTimeout(this.bleConnectedTimeoutID);

					this.setDeviceStatus(DeviceStatus.CONNECTED_NOT_CHARGING);
					this.setLastSync();

					this.updateDeviceInfo();

					break;
				case SmartPadNS.Status.DISCONNECTED:
					if (event.forgetDevice) {
						this.device = null;

						clearTimeout(this.bleConnectedTimeoutID);
						this.setDeviceStatus(DeviceStatus.DISCONNECTED);
					}
					else {
						if (smartPad.transportProtocol == SmartPadNS.TransportProtocol.BLE) {
							this.bleConnectedTimeoutID = setTimeout(() => {
								this.setDeviceStatus(DeviceStatus.DISCONNECTED);
							}, DeviceManager.BLE_CONNECTED_TIMEOUT);
						}
						else
							this.setDeviceStatus(DeviceStatus.DISCONNECTED);
					}

					if (this.context == DeviceManager.Context.SETUP) {
						if (this.completeReconfigure)
							this.completeReconfigure(true);
						else if (!event.ignore && global.getState("wizardStep") != WizardSteps.SETUP_DEVICE) {
							if (smartPad.protocol == "SPP") this.closeDialog();
							this.openDialog(Modals.CONNECTION_LOST);
						}
					}
					else
						this.reconnect(this.instantReconnect);

					break;
				case SmartPadNS.Status.CLOSED:
					if (AppManager.closing) {
						AppManager.confirmSmartPadClose();
						return;
					}

					if (this.downloading)
						this.completeDownload();

					delete this.onDeviceReady;

					break;
				case SmartPadNS.Status.SCAN_COMPLETE:
					if (this.context == DeviceManager.Context.SETUP) {
						let devices = event.devices;

						if (debug)
							console.log("[DEVICE_MANAGER] found", devices);

						if (devices.ignore)
							return;

						// devices = devices.concat(devices: [
						// 	{name: "Bamboo Smartpad 1", address: "9c-34-67-es-0U-71"},
						// 	{name: "Bamboo Smartpad 2", address: "9c-34-67-es-0U-72"},
						// 	{name: "Bamboo Smartpad 3", address: "9c-34-67-es-0U-73"}
						// ]);

						if (devices.length == 0) {
							if (smartPad.protocol == "SPP") this.closeDialog();
							this.openDialog(Modals.NO_SUPPORTED_DEVICE);
						}
						else if (devices.length > 1) {
							global.updateState({devices});

							if (smartPad.protocol == "SPP") this.closeDialog();
							this.openDialog(Modals.SELECT_DEVICE);
						}
					}

					break;
				case SmartPadNS.Status.AUTHORIZE_EXPECT:
					if (this.context == DeviceManager.Context.SETUP) {
						this.closeDialog();
						this.moveWizardTo(WizardSteps.TAP_TO_CONFIRM);
					}
					else
						this.addNotification("notification.device.restore.connection");

					break;
				case SmartPadNS.Status.AUTHORIZE_FAILED:
					switch (event.authorizeFailType) {
						case SmartPadNS.AuthorizeFailType.FOREIGN_DEVICE:
							if (this.context == DeviceManager.Context.SETUP) {
								if (smartPad.protocol == "SPP") this.closeDialog();
								this.openDialog(Modals.CONNECTION_LOST);
							}
							else {
								this.device = null;
								DeviceManager.addNotification("notification.device.not.recognized");
							}

							break;
						case SmartPadNS.AuthorizeFailType.CONFIRMATION_TIMEOUT:
							if (this.context == DeviceManager.Context.SETUP) {
								this.smartPad.close(true);
								this.openDialog(Modals.CONNECTION_LOST);
							}

							break;
					}

					break;
			}
		});

		smartPad.on("ConnectFailed", (device) => {
			console.warn("cannot connect:", JSON.stringify(device));

			if (this.context == DeviceManager.Context.SETUP)
				this.openDialog(Modals.CONNECTION_LOST);
			else {
				if (smartPad.transportProtocol == SmartPadNS.TransportProtocol.BLE)
					smartPad.open(device);
				else
					this.reconnect();
			}
		});

		if (smartPad.transportProtocol == SmartPadNS.TransportProtocol.BLE) {
			smartPad.on("BluetoothPoweredOff", () => {
				if (debug) console.log("[DEVICE_MANAGER] BluetoothPoweredOff");
				// this.addNotification("Bluetooth module not found. Power on Bluetooth module.");
			});
		}

		smartPad.on("DeviceNotFound", (error) => {
			if (error) {
				console.error(error);

				if (error.message == "Unknown device detected")
					this.addNotification("notification.newDevice.connected");
			}

			if (debug) console.warn("[DEVICE_MANAGER]", smartPad.protocol, "device not found");

			if (this.context == DeviceManager.Context.SETUP)
				this.openDialog(Modals.NO_SUPPORTED_DEVICE);
			else
				this.reconnect();
		});

		smartPad.on("BatteryState", (event) => {
			this.setBatteryCharge(event);
		});
	},

	resolveAuthorize() {
		return new Promise((resolve, reject) => {
			if (this.context == DeviceManager.Context.SETUP || smartPad.transportProtocol == SmartPadNS.TransportProtocol.BTC)
				resolve();
			else {
				let timeoutID;
				let autoReconnect = false;

				let onDisconnect = (event) => {
					if (event.status == SmartPadNS.Status.DISCONNECTED) {
						if (this.type == "COLUMBIA_CONSUMER") return;

						this.closeDialog(() => {
							clearTimeout(timeoutID);
							smartPad.off("StatusUpdate", onDisconnect);

							reject(new Error("Device disconnected"));
						});
					}
				};

				this.onCloseForgetDevice = (forget) => {
					clearTimeout(timeoutID);
					smartPad.off("StatusUpdate", onDisconnect);

					if (forget)
						reject("FORGET_DEVICE");
					else {
						resolve(autoReconnect);
						if (autoReconnect) this.addNotification("notification.device.restore.connection");
					}
				};

				this.openDialog(Modals.FORGET_DEVICE);

				smartPad.on("StatusUpdate", onDisconnect);

				timeoutID = setTimeout(() => {
					autoReconnect = true;
					this.closeDialog();
				}, 30000);
			}
		});
	},

	updateDeviceInfo() {
		let complete = (batteryState) => {
			if (this.context == DeviceManager.Context.SETUP) {
				if (this.type == "VIPER") {
					if (this.context == DeviceManager.Context.SETUP)
						this.closeDialog();

					this.moveWizardTo(WizardSteps.SELECT_ORIENTATION);
				}
				else
					this.moveWizardTo(WizardSteps.SET_NAME);
			}

			return Promise.resolve().then(() => {
				if (!batteryState)
					return smartPad.getBatteryState();
				else
					return Promise.resolve(batteryState);
			}).then(batteryState => {
				this.setBatteryCharge(batteryState);

				if (this.onDeviceReady)
					return this.onDeviceReady();
				else
					return Promise.resolve();
			}).then(() => {
				if (smartPad.transportProtocol == SmartPadNS.TransportProtocol.BLE) {
					if (this.context == DeviceManager.Context.SETUP)
						this.execDownload = true;
					else if (this.execLiveMode) {
						this.execLiveMode = false;
						this.triggerLiveMode();
					}
					else
						this.download();
				}
				else if (this.execLiveMode) {
					this.execLiveMode = false;
					this.triggerLiveMode();
				}
			});
		};

		this.type = smartPad.type;

		if (this.device && this.device.protocol == "BLE" && this.device["BLE"] && smartPad.transportProtocol == SmartPadNS.TransportProtocol.BLE && smartPad.serial == this.device.id) {
			complete().catch(smartPad.logError);
			return;
		}

		let device = this.device || {};

		device.id = smartPad.serial;
		device.type = smartPad.type;
		device.size = smartPad.size;
		device.protocol = smartPad.protocol;
		device.serialNumber = smartPad.serial;
		device[smartPad.protocol] = smartPad.deviceInfo;

		if (smartPad.transportProtocol == SmartPadNS.TransportProtocol.BTC && !device["USB"])
			device["USB"] = {id: smartPad.serial, type: smartPad.type};

		smartPad.switchToReadyMode().then(() => {
			return smartPad.getDeviceName();
		}).then(name => {
			device.name = name;
			return smartPad.getFirmwareVersion();
		}).then(firmwareVersion => {
			device.firmwareVersion = firmwareVersion;
			return smartPad.getBatteryState();
		}).then(batteryState => {
			if ("orientation" in smartPad) device.orientation = smartPad.orientation;

			this.device = device;

			return complete(batteryState);
		}).catch(reason => {
			smartPad.logError(reason);

			if (smartPad.isOpen())
				setTimeout(() => this.updateDeviceInfo(), DeviceManager.UPDATE_DEVICE_RETRY_TIMEOUT);
		});
	},

	navigateToBegining: function () {
		this.closeDialog();

		if (!global.smartPad || smartPad instanceof SmartPadUSB)
			this.moveWizardTo(WizardSteps.SETUP_DEVICE);
		else
			this.moveWizardTo(WizardSteps.SWITCH_ON);
	},

	keepAlive: function() {
		if (global.smartPad && this.serialPortSupport && smartPad instanceof SmartPadSPP) {
			clearTimeout(DeviceManager.keepAliveTimeoutID);
			DeviceManager.keepAliveTimeoutID = setTimeout(() => smartPad.getDataSessionState().then(() => DeviceManager.keepAlive()).catch(console.error), DeviceManager.KEEP_ALIVE_TIMEOUT);
		}
	},

	attachFTEEvents: function (smartPad) {
		if (smartPad.transportProtocol == SmartPadNS.TransportProtocol.BLE) {
			smartPad.on("BluetoothPoweredOff", () => {
				this.closeDialog();
				this.navigateToBegining();
			});
		}
	},

	detachFTEEvents: function (smartPad) {
		if (smartPad) {
			smartPad.off("BluetoothPoweredOff");
			// smartPad.off("ResetRealtimeDataBuffer");
		}

		delete this.smartPad;
	},

	attachLibraryEvents: function (smartPad) {},
	detachLibraryEvents: function (smartPad) {},

	attachLiveEvents: function (smartPad) {
		smartPad.on("StatusUpdate", this.liveStatusUpdate);

		smartPad.on("ResetRealtimeDataBuffer", () => {
			WILL.abort();

			if (this.liveNewPage)
				this.liveNewPage();
		});

		smartPad.on("NewLayer", () => {
			WILL.abort();

			if (this.liveNewLayer)
				this.liveNewLayer();
		});

		smartPad.on("StrokeStart", (event) => {
			if (this.liveStrokeStart)
				this.liveStrokeStart(event.timestamp, event.penType, event.penID);
		});

		smartPad.on("PointReceived", (event) => {
			if (this.livePointReceived)
				this.livePointReceived(event.phase, event.point || event.pathPart, event.path);

			this.keepAlive();
		});

		smartPad.on("PointsLost", (event) => {
			console.log("%cPointsLost:", "color: orange", event.count);
		});
	},

	detachLiveEvents: function (smartPad) {
		smartPad.off("StatusUpdate", this.liveStatusUpdate);
		smartPad.off("NewLayer");
		smartPad.off("StrokeStart");
		smartPad.off("PointReceived");
		smartPad.off("PointsLost");
		smartPad.off("ResetRealtimeDataBuffer");
	},

	attachCreationEvents: function (smartPad) {},
	detachCreationEvents: function (smartPad) {},

	download: function () {
		if (!global.smartPad) return;
		if (!smartPad.isReady() || this.downloading) return;
		if (smartPad.state == SmartPadNS.State.REAL_TIME) return;
		if (!this.context || this.context == DeviceManager.Context.SETUP) return;

		smartPad.switchToFileTransferMode().then(() => this.startDownload()).catch(smartPad.logError);
	},

	startDownload() {
		if (DeviceManager.SKIP_DOWNLOAD) return;

		let file;
		let count = 0;

		let processNote = (file, callback) => {
			let note = new Note({
				creationDate: file.timestamp,
				size: smartPad.size,
				orientation: smartPad.orientation,
				locale: LocalesManager.defaultNoteLocale,
				rawLayers: file.layers
			});

			console.log(`[DOWNLOAD] exporting ${note.id} started`);

			DBManager.editNote(note, {deviceType: this.type}, () => {
				console.log(`[DOWNLOAD] exporting ${note.id} completed`);
				callback();
			});
		};

		let next = () => {
			smartPad.getOldestFileInfo().then((fileInfo) => {
				if (debug) console.log("[DOWNLOAD] File Info - created:", new Date(fileInfo.timestamp), "size:", fileInfo.size);
				file = Object.clone(fileInfo);
				return smartPad.getOldestFile();
			}).then((layers) => {
				file.layers = layers;

				count--;

				if (file.layers.length > 0) {
					processNote(file, () => {
						smartPad.deleteOldestFile().then(() => {
							this.updateDownloadProgress();

							if (count > 0)
								next();
							else
								this.completeDownload();
						}).catch(reason => {
							this.cancelDownloadProgress();
							this.completeDownload(this.downloading - count);
						});
					});
				}
				else {
					smartPad.deleteOldestFile().then(() => {
						this.updateDownloadProgress();
						if (count > 0) next();
					}).catch(reason => {
						this.cancelDownloadProgress();
						this.completeDownload(this.downloading - count);
					});
				}
			}).catch(reason => {
				smartPad.logError(reason);

				smartPad.deleteOldestFile().then(() => {
					this.cancelDownloadProgress();
					delete this.downloading;

					this.download();
				}).catch(reason => {
					this.cancelDownloadProgress();
					this.completeDownload(this.downloading - count);
				});
			});
		};

		smartPad.getFilesCount().then((filesCount) => {
			count = filesCount;

			this.downloading = count;

			if (count > 0) {
				if (debug) console.log("[DOWNLOAD]", count + " notes found. Downloading...");

				this.updateDownloadProgress(count)
				next();
			}
			else
				this.completeDownload();
		}).catch(smartPad.logError);
	},

	completeDownload(downloaded) {
		if (this.downloading > 0) {
			if (debug) console.log("[DOWNLOAD] complete", this.downloading, downloaded);

			UAManager.hardware("Transfer Device Content", "Content Imported", downloaded || this.downloading);

			delete this.downloading;

			this.setLastSync();
			// this.addNotification('download.completed')
		}

		if (smartPad.transportProtocol == SmartPadNS.TransportProtocol.BLE)
			smartPad.close();
	}
}

Function.prototype.createEnum.call(DeviceManager, "Context", ["SETUP", "LIBRARY", "CREATION", "LIVE"]);

export default DeviceManager;
