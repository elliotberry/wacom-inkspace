import React from 'react';

import USBImage from '../images/live-mode/usb.svg';
import BTCImage from '../images/live-mode/btc.svg';
import BLEImage from '../images/live-mode/ble.svg';

import images from '../../images';

import BTInstructions from '../helpers/BTInstructions';
import DeviceNameForm from '../helpers/DeviceNameForm';
import SelectOrientation from '../helpers/SelectOrientation';
import IFrame from '../helpers/IFrame';
import SelectItem from '../helpers/SelectItem';
import EntityForm from '../helpers/EntityForm';
import TagsManager from '../helpers/TagsManager';
import WacomIDBenefits from '../helpers/WacomIDBenefits';
import VideoProgressBar from '../helpers/VideoProgressBar';

let settings = {
	SetupLater: {
		title: "setupLater.title",
		content: "setupLater.description",

		buttons: [{
			text: "setupLater.title",
			click: "setupLater"
		}, {
			type: "CANCEL"
		}]
	},

	UnlockFeaturesLater: {
		title: "unlockFeaturesLater.title",
		content: "unlockFeaturesLater.description",

		buttons: [{
			text: "unlockFeaturesLater.unlockFeaturesLater",
			click: "unlockFeaturesLater"
		}, {
			type: "CANCEL",
			text: "btn.back"
		}]
	},

	NoSupportedDevice: {
		title: "noSupportedDevice.title",
		// content: "noSupportedDevice.description",
		discardOverlayClcik: true,

		onopen: function() {
			if (DeviceManager.type == "VIPER")
				this.config.content = "noSupportedDevice.viper.description";
			else
				this.config.content = "noSupportedDevice.description";
		},

		buttons: [{
			text: "btn.tryAgain",
			click: "setupDevice"
		}]
	},

	ConnectionLost: {
		title: "connectionLost.title",
		content: "connectionLost.description",
		discardOverlayClcik: true,

		buttons: [{
			text: "btn.tryAgain",
			click: "setupBTDevice"
		}]
	},

	SelectConnection: {
		title: "selectConnection.title",
		content: "selectConnection.description",

		onclose: function() {
			DeviceManager.clearDeviceConnectedCheck();
		},

		buttons: [{
			name: "BTC",
			text: "selectConnection.Bluetooth",
			click: "selectBTCConn",
			classNameSource: "getConnClassName"
		}, {
			name: "USB",
			text: "selectConnection.USB",
			click: "selectUSBConn",
			classNameSource: "getConnClassName"
		}]
	},

	SelectDeviceType: {
		title: "selectDeviceType.title",
		className: "SelectItem",
		extraContent: SelectItem,
		discardOverlayClcik: true,

		selectable: {
			prop: "selectedDeviceType",

			items: [
				{name: "Wacom Intuos Pro", value: "VIPER"},
				{name: "Wacom Smartpad", value: "COLUMBIA"}
				// {name: "Wacom Sketchpad Pro", value: "COLUMBIA_CREATIVE"},
				// {name: "Bamboo Folio / Bamboo Slate", value: "COLUMBIA_CONSUMER"}
			]
		},

		buttons: [{
			text: "btn.proceed",
			click: "selectDeviceType"
		}]
	},

	SelectDevice: {
		title: "selectDevice.title",
		content: "selectDevice.description",
		discardOverlayClcik: true,
		className: "SelectItem",
		extraContent: SelectItem,

		selectable: {
			prop: "selectedDevice",
			items: "devices",

			item: {
				value: "id"
			}
		},

		buttons: [{
			text: "selectDevice.pair",
			click: "pair"
		}, {
			text: "btn.tryAgain",
			className: "cancel",
			click: "restartPairProcess"
		}]
	},

	BTInstructions: {
		title: "btInstructions.title",
		extraContent: BTInstructions,
		discardOverlayClcik: true,

		onclose: function() {
			DeviceManager.clearDeviceConnectedCheck();
		},

		buttons: [{
			text: "btn.next",
			click: "confirmBTInstructions",
			classNameSource: "getBTInstructionsClassName"
		}, {
			type: "CANCEL"
		}]
	},

	BTInstructionsWaiting: {
		title: "btInstructions.title",
		extraContent: BTInstructions,
		discardOverlayClcik: true,

		onclose: function() {
			DeviceManager.clearDeviceConnectedCheck();
		},

		waiting: {
			text: "btInstructions.waiting",
		}
	},

	ForgetDevice: {
		title: "forgetDevice.title",
		content: "forgetDevice.description",
		discardOverlayClcik: true,

		onopen: function() {
			DeviceManager.forgetDevice = true;
		},

		onclose: function(forget) {
			DeviceManager.forgetDevice = false;

			// on CANCEL press
			DeviceManager.onCloseForgetDevice(forget);
		},

		buttons: [{
			text: "forgetDevice.OK",
			click: "forgetDevice"
		}, {
			type: "CANCEL"
		}]
	},

	WacomIDBenefits: {
		extraContent: WacomIDBenefits,
		actionBar: "center",

		buttons: [{
			text: "btn.login",
			click: "login"
		}]
	},

	Login: {
		extraContent: IFrame,

		onclose: function() {
			AuthenticationManager.closeLogin();
		},
	},

	Account: {
		extraContent: IFrame
	},

	SessionExpired: {
		title: "session.expired.title",
		content: "session.expired.description",

		buttons: [{
			text: "btn.login",
			click: "login"
		}, {
			type: "CANCEL",
			text: "btn.use.offline"
		}]
	},

	RemoveGroup: {
		title: "remove.group.title",
		content: "remove.group.description",

		buttons: [{
			type: "CANCEL"
		}, {
			text: "remove.group.title",
			click: "removeGroup"
		}, {
			text: "btn.delete.all",
			click: "deleteGroup"
		}]
	},

	SaveChanges: {
		title: "saveChanges.title",
		content: "saveChanges.description",
		discardOverlayClcik: true,

		buttons: [{
			text: "saveChanges.save",
			click: "saveChanges"
		}, {
			type: "CANCEL",
			text: "saveChanges.dontSave",
			onclose: function() {
				this.props.closeEditNote();
			}
		}]
	},

	Confirm: {
		title: "confirm.title",
		content: "confirm.description",

		buttons: [{
			type: "CANCEL"
		}, {
			id: "confirm",
			text: "menu.delete",
			autoDisable: true,
			click: function() {
				this.props.confirm(this.config.settings);
			}
		}]
	},

	ExportingNote: {
		title: "exportingNote.title",
		image: images.genaratingDoc,
		extraContent: VideoProgressBar
	},

	SetName: {
		title: "addCustomName.title",
		content: "addCustomName.description",
		className: "center",
		actionBar: "center",
		extraContent: DeviceNameForm,
		extraContentType: "IMAGE",

		buttons: [{
			text: "btn.done",
			click: function() {
				let form = this.refs["ExtraContent"].getWrappedInstance().getWrappedInstance();

				if (form.state.value) {
					DeviceManager.setName(form.state.value.trim());
					this.props.closeDialog();
				}
				else
					form.setState({error: "required"});
			}
		}]
	},

	SelectOrientation: {
		title: "orientation.title",
		content: "orientation.description",
		className: "center",
		actionBar: "center",
		image: SelectOrientation,
		discardOverlayClcik: true,

		buttons: [{
			text: "btn.done",
			click: "closeDialog"
		}]
	},

	LiveModeUSBWaiting: {
		title: "live.mode.waiting.usb.title",
		content: "live.mode.waiting.usb.description",
		className: "center",
		image: USBImage,

		onclose: function() {
			DeviceManager.execLiveMode = false;
		},

		waiting: {}
	},

	LiveModeBTCWaiting: {
		title: "live.mode.waiting.btc.title",
		content: "live.mode.waiting.btc.description",
		className: "center",
		image: BTCImage,

		onclose: function() {
			DeviceManager.execLiveMode = false;
		},

		waiting: {}
	},

	LiveModeBLEWaiting: {
		title: "live.mode.waiting.ble.title",
		content: "live.mode.waiting.ble.description",
		className: "center",
		image: BLEImage,

		onclose: function() {
			DeviceManager.execLiveMode = false;
		},

		waiting: {}
	},

	Entity: {
		extraContent: EntityForm,
		actionBar: "center",

		buttons: [{
			id: "cancel",
			type: "CANCEL"
		}, {
			id: "ok",
			type: "CONFIRM",
			text: "btn.OK",
			click: function() {
				let form = this.refs["ExtraContent"].getWrappedInstance();

				// TODO: refactor after TAGS refactoring
				let list = this.config.settings.list;

				if (!list)
					list = ContentManager.getEntity(this.config.settings.type).textValues;

				if (form.state.value) {
					if (form.state.validators["UNIQUE"] && list.includes(form.state.value.trim()))
						form.setState({error: "error.value.already.exists"});
					else
						this.props.editEntity(this.config.settings.type, this.config.settings.value, form.state.value.trim());
				}
				else
					form.setState({error: "error.required"});
			}
		}]
	},

	TagsManager: {
		extraContent: TagsManager
	},

	TagsEditor: {
		extraContent: TagsManager,
		actionBar: "center",

		buttons: [{
			text: "btn.new.tag",
			click: "openTagAdd",
			classNameSource: "getTagAddClassName"
		}]
	},

	TagDelete: {
		buttons: [{
			text: "btn.cancel",
			click: "tagsDeleteConfirm"
		}]
	},

	ExportLimitReached: {
		title: "export.limit.reached.title",
		content: "export.limit.reached.description",

		buttons: [{
			text: "btn.OK",
			click: "closeDialog"
		}]
	},

	Settings: {custom: true},
	ExportAsText: {custom: true}
};

export default settings
