import {push} from 'react-router-redux'

import {openDialog, moveWizardTo} from './modals'

import * as Modals from '../constants/Modals'
import * as WizardSteps from '../constants/WizardSteps'

function redirect(nextStep) {
	return (dispatch, getState) => {
		let {wizardStep} = getState().AppReducer;

		if (nextStep.startsWith("/")) {
			if (wizardStep == WizardSteps.COMPLETE) {
				UIManager.editWindow({resizable: true, maximizable: true});
				DBManager.edit(DBManager.entities.SETTINGS, {fte: true});
			}

			dispatch(push(nextStep));
		}
		else {
			if (nextStep == WizardSteps.DISCOVERY) {
				if (DeviceManager.type == "VIPER" && DeviceManager.serialPortSupport) {
					global.updateState({sppConnected: false});
					dispatch(openDialog(Modals.BT_INSTRUCTIONS));

					DeviceManager.open("SPP", null, "VIPER");
				}
				else {
					DeviceManager.open("BT", null, DeviceManager.type);

					if (process.platform == "win32" && global.MANUAL_PAIRING)
						dispatch(openDialog(Modals.BT_INSTRUCTIONS_WAITING));
					else
						dispatch(moveWizardTo(nextStep));
				}
			}
			else
				dispatch(moveWizardTo(nextStep));
		}
	}
}

function connect() {
	return (dispatch, getState) => {
		DeviceManager.open();
	}
}

function getSetNameClassName() {
	return (dispatch, getState) => {
		let {device} = getState().AppReducer;
		return (device && device.name)?null:"disabled";
	}
}

function exit() {
	return (dispatch, getState) => {
		let {wizardStep} = getState().AppReducer;

		if (wizardStep == WizardSteps.COMPLETE)
			dispatch(moveWizardTo(undefined));
	}
}

export {
	redirect,
	connect,
	getSetNameClassName,
	exit
}
