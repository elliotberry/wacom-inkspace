"use strict";

const SmartPadNS = require("./SmartPadNS");
const GenericSmartPad = require("./GenericSmartPad");

class SmartPadBLE extends GenericSmartPad {
	constructor(appID, resolveAuthorize) {
		super(SmartPadNS.TransportProtocol.BLE);

		this.resolveAuthorize = resolveAuthorize;
	}

	open(deviceInfo) {
		if (this.isOpen()) return;

		if (deviceInfo) {
			this.updateStatus(SmartPadNS.Status.CONNECTING);
			this.origin.open(JSON.stringify(deviceInfo));
		}
		else {
			this.updateStatus(SmartPadNS.Status.SCAN);

			SmartPadBLE.list().then(availableDevices => {
				this.discovery = availableDevices;

				this.updateStatus(SmartPadNS.Status.SCAN_COMPLETE);

				if (this.discovery.length == 0)
					this.emitter.emit("DeviceNotFound", null, deviceInfo);
				else if (this.discovery.length == 1)
					this.open(this.discovery[0]);
			}).catch(() => {
				this.emitter.emit("DeviceNotFound", null, deviceInfo);
			});
		}
	}

	isOpen(waiting) {
		return this.origin.isOpen(waiting);
	}

	close(finalize) {
		if (!finalize) {
			console.warn("BLE disconnect in windows is unavailable");
			return;
		}

		super.close(() => {
			this.origin.close(finalize);
		});
	}

	static list() {
		let context = NativeSmartPad.bleList();

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

module.exports = SmartPadBLE;
