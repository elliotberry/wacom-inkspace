import React from 'react';

import TickIcon from '../icons/TickIcon.svg';

import Logo from '../images/logo.svg';
import SelectDevice from '../images/fte/SelectDevice.svg';
import SwitchOn from '../images/fte/SwitchOn.svg';
import TapToConfirm from '../images/fte/FteTap.svg';
import PressAndHold from '../images/fte/FtePress.svg';
import AcceptBluetooth from '../images/fte/AcceptBluetooth.svg';
import CreateWacomId from '../images/fte/CreateWacomId.svg';
import ViperUsersFinished from '../images/fte/ViperUsersFinished.svg';
import ColumbiaUsersFinished from '../images/fte/ColumbiaUsersFinished.svg';

import SelectOrientation from '../helpers/SelectOrientation';
import DeviceNameForm from '../helpers/DeviceNameForm';
import WacomIDBenefits from '../helpers/WacomIDBenefits';

import WhatsNewSettings from './wizards/whatsNew/settings';
import ViperSettings from './wizards/tutorial/viper/settings';
import ColumbiaSettings from './wizards/tutorial/columbia/settings';

import * as Modals from '../../constants/Modals'

let settings = {
	Welcome: {
		title: "welcome.header",
		content: "welcome.p",
		image: Logo,

		buttons: [{
			text: "welcome.link",
			click: "redirect",
			location: "/terms"
		}]
	},

	SetupDevice: {
		title: "setupDevice.title",
		content: "setupDevice.description",
		image: SelectDevice,

		buttons: [{
			text: "btn.connect",
			click: "connect"
		}, {
			text: "btn.notNow",
			className: "cancel",
			click: "openDialog",
			dialog: Modals.SETUP_LATER
		}]
	},

	SwitchOn: {
		title: "switchOn.title",
		content: "switchOn.description",
		image: SwitchOn,

		buttons: [{
			text: "btn.next",
			click: "redirect",
			location: "Discovery"
		}, {
			text: "btn.startOver",
			className: "cancel",
			click: "redirect",
			location: "SetupDevice"
		}]
	},

	Discovery: {
		title: "pressAndHold.title",
		content: "pressAndHold.description",
		discardOverlayClcik: true,
		image: PressAndHold,

		waiting: {
			text: "btn.pressAndHold.searching",
		}
	},

	BTConnectionWaiting: {
		title: "acceptBTC.title",
		content: "acceptBTC.description",
		discardOverlayClcik: true,
		image: AcceptBluetooth,

		waiting: {
			text: "acceptBTC.waitingAcceptance"
		}
	},

	////////////////////
	BTConnectionAccepted: {
		title: "acceptBTC.title",
		content: "acceptBTC.waitingAcceptance",
		discardOverlayClcik: true,
		image: AcceptBluetooth,

		waiting: {
			text: "acceptBTC.accepted",
			icon: TickIcon
		}
	},

	TapToConfirm: {
		title: "tapToConfirm.title",
		content: "tapToConfirm.description",
		discardOverlayClcik: true,
		image: TapToConfirm,
		waiting: {}
	},

	SetName: {
		title: "addCustomName.title",
		content: "addCustomName.description",
		discardOverlayClcik: true,
		extraContent: DeviceNameForm,

		buttons: [{
			text: "btn.next",
			// click: "redirect",
			classNameSource: "getSetNameClassName",
			// location: "SelectOrientation"
			click: function() {
				let form = this.refs["ExtraContent"].getWrappedInstance().getWrappedInstance();

				if (form.state.value) {
					DeviceManager.setName(form.state.value);
					this.props.redirect("SelectOrientation");
				}
				else
					form.setState({error: "required"});
			}
		}]
	},

	SelectOrientation: {
		title: "orientation.title",
		content: "orientation.description",
		discardOverlayClcik: true,
		image: SelectOrientation,

		buttons: [{
			text: "btn.next",
			click: "redirect",
			location: "Login"
		}]
	},

	Login: {
		// title: "cloudLogin.title",
		// content: "cloudLogin.description",
		image: CreateWacomId,
		extraContent: WacomIDBenefits,

		buttons: [{
			text: "btn.cloudLogin.login",
			click: () => {
				AuthenticationManager.login(true);
			}
		}, {
			text: "btn.notNow",
			className: "cancel",
			click: "openDialog",
			dialog: Modals.UNLOCK_FEATURES_LATER
		}]
	},

	Complete: {
		title: "finished.title",
		content: "finished.description",
		image: ViperUsersFinished,

		buttons: [{
			text: "btn.done",
			click: "redirect",
			location: "/library"
		}]
	},

	Tutorial: {
		prefix: "tutorial",

		viper: ViperSettings.steps,
		columbia: ColumbiaSettings.steps
	},

	WhatsNew: WhatsNewSettings.config
};

export default settings
