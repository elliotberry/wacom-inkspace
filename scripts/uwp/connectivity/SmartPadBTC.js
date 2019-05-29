"use strict";

const SmartPadNS = require("./SmartPadNS");
const GenericSmartPad = require("./GenericSmartPad");

class SmartPadBTC extends GenericSmartPad {
	constructor(appID, resolveAuthorize) {
		super(SmartPadNS.TransportProtocol.BTC);

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

			SmartPadBTC.list(true).then(availableDevices => {
				this.discovery = availableDevices;

				this.updateStatus(SmartPadNS.Status.SCAN_COMPLETE);

				if (this.discovery.length == 0)
					this.emitter.emit("DeviceNotFound", null, deviceInfo);
				else if (this.discovery.length == 1)
					this.open({id: this.discovery.first.id, type: "VIPER"});
			}).catch(() => {
				this.emitter.emit("DeviceNotFound", null, deviceInfo);
			});
		}
	}

	isOpen(orWaiting) {
		return this.origin.isOpen(orWaiting);
	}

	close() {
		super.close(() => {
			this.origin.close();
		});
	}

	static list(inquiry) {
		let context = NativeSmartPad.btcList(inquiry);

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

module.exports = SmartPadBTC;
