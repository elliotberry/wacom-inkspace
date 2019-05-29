"use strict";

const SmartPadNS = require("./SmartPadNS");
const GenericSmartPad = require("./GenericSmartPad");

let devices = {};
let onAttach = (id, error) => {};
let onDetach = (id) => {};

class SmartPadUSB extends GenericSmartPad {
	static get devices() {
		return Object.keys(devices);
	}

	constructor() {
		super(SmartPadNS.TransportProtocol.USB);

		this.origin.onattach = (event) => {
			let args = event.detail[0];

			let device = global.resolveJSValue(args.device);
			let error = global.resolveJSValue(args.error);
			if (error) error = new Error(error);

			devices[device.id] = device;
			onAttach(device.id, error);
		}

		this.origin.ondetach = (event) => {
			let device = global.resolveJSValue(event.detail[0].device);

			delete devices[device.id];
			onDetach(device.id);
		}
	}

	open(deviceInfo) {
		if (this.isOpen()) return;

		let error;

		if (deviceInfo) {
			let found = SmartPadUSB.devices.includes(deviceInfo.id);

			if (!found) {
				deviceInfo = null;

				if (SmartPadUSB.devices.length)
					error = new Error("Unknown device detected");
			}
		}
		else if (SmartPadUSB.devices.length)
			deviceInfo = {id: SmartPadUSB.devices.first, type: "VIPER"};

		if (deviceInfo)
			this.origin.open(JSON.stringify(deviceInfo));
		else
			this.emitter.emit("DeviceNotFound", error);
	}

	isOpen() {
		return this.origin.isOpen();
	}

	close() {
		super.close(() => {
			this.origin.close();
		});
	}

	static attachListeners(onAttachListener, onDetachListener) {
		onAttach = onAttachListener || (() => {});
		onDetach = onDetachListener || (() => {});

		return SmartPadUSB.list().then(list => {
			list.forEach(device => {
				devices[device.id] = device;
			});
		}).catch(ignore => {});
	}

	static detachListeners() {
		onAttach = () => {};
		onDetach = () => {};
	}

	static list() {
		let context = NativeSmartPad.usbList();

		return new Promise((resolve, reject) => {
			context.oncomplete = (event) => {
				let result = global.resolveJSValue(event.detail[0].list);

				if (result.length)
					resolve(result);
				else
					reject();
			};
		});
	}
}

module.exports = SmartPadUSB;
