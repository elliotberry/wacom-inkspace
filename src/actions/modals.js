import {addNotification} from './app';
import {saveNote} from './edit';
import {filterByGroup, deleteNotes, refreshGroups} from './library';

import * as Modals from '../constants/Modals'
import * as WizardSteps from '../constants/WizardSteps'
import * as ActionTypes from '../constants/ActionTypes'

import modalSettings from '../components/settings/modals';
import wizardSettings from '../components/settings/wizards';

// selectedDevice, selectedDeviceType
function updateSelected(type, item) {
	return (dispatch, getState) => {
		global.updateState(Object.defineProperty({}, type, {enumerable: true, configurable: true, writable: true, value: item}));
	}
}

function confirm(obj) {
	switch (obj.type) {
		case "REMOVE_TAG":
			return tagsDeleteConfirm(obj.tag);
		case "REMOVE_NOTE":
			return notesDeleteConfirm(obj.noteIDs);
		case "LOG_OUT":
			return confirmLogout();
		default:
			throw new Error("Unknown confirm type:", obj.type);
	}
}

function confirmLogout() {
	return (dispatch, getState) => {
		AuthenticationManager.logout();
		dispatch(addNotification("notification.cloud.disconnected"));
		dispatch(closeDialog());
	}
}

function openDialog(name, settings, props = {}) {
	return (dispatch, getState) => {
		dispatch({type: ActionTypes.MODAL_SHOW, body: {name, settings, props}});
	}
}

function closeDialog(onclose) {
	return (dispatch, getState) => {
		let {modal} = getState().AppReducer;

		if (modal) {
			dispatch({type: ActionTypes.MODAL_HIDE});

			if (!onclose) {
				onclose = modalSettings[modal].onclose;
				if (onclose) console.warn("******** closing dialog " + modal + " - onclose found ********")
			}

			if (onclose) onclose();
		}
	}
}

function openWizard(type, step) {
	return (dispatch, getState) => {
		dispatch({type: ActionTypes.WIZARD_SHOW, body: {wizardType: type, wizardStep: step}});
	}
}

function moveWizardTo(nextStep) {
	return (dispatch, getState) => {
		dispatch({type: ActionTypes.WIZARD_SET_STEP, body: nextStep});
	}
}

function closeWizard() {
	return (dispatch, getState) => {
		let {wizardType} = getState().AppReducer;

		if (wizardType) {
			let onclose = wizardSettings[wizardType].onclose;

			dispatch({type: ActionTypes.WIZARD_HIDE});
			if (onclose) onclose();
		}
	}
}

function openSettings(tab) {
	return (dispatch, getState) => {
		dispatch(selectSettingsTab(tab));
		dispatch(openDialog(Modals.SETTINGS));
	}
}

function selectSettingsTab(tab) {
	return (dispatch, getState) => {
		dispatch({type: ActionTypes.SET_SETTINGS_TAB_INDEX, body: tab});
	}
}

function setupLater() {
	return (dispatch, getState) => {
		dispatch(moveWizardTo(WizardSteps.LOGIN));
		dispatch(closeDialog());
	}
}

function setupDevice() {
	return (dispatch, getState) => {
		dispatch(moveWizardTo(WizardSteps.SETUP_DEVICE));
		dispatch(closeDialog());
	}
}

function setupBTDevice() {
	return (dispatch, getState) => {
		if (DeviceManager.context == DeviceManager.Context.SETUP)
			dispatch(moveWizardTo(WizardSteps.SWITCH_ON));

		dispatch(closeDialog());
	}
}

function selectUSBConn(onclose) {
	return (dispatch, getState) => {
		dispatch(closeDialog(onclose));
		DeviceManager.open("USB", null, "VIPER");
	}
}

function selectBTCConn(onclose) {
	return (dispatch, getState) => {
		dispatch(moveWizardTo(WizardSteps.SWITCH_ON));
		dispatch(closeDialog(onclose));
	}
}

function getConnClassName(type) {
	return (dispatch, getState) => {
		let {usbConnected} = getState().AppReducer;

		if (type == "USB")
			return usbConnected?null:"disabled";
		else // BTC
			return usbConnected?"disabled":null;
	}
}

function selectDeviceType() {
	return (dispatch, getState) => {
		let {selectedDeviceType} = getState().AppReducer;

		DeviceManager.type = selectedDeviceType.value;

		dispatch(closeDialog());

		if (selectedDeviceType.value == "VIPER")
			DeviceManager.open("USB", null, selectedDeviceType.value);
		else {
			DeviceManager.clearDeviceConnectedCheck();
			dispatch(moveWizardTo(WizardSteps.SWITCH_ON));
		}
	}
}

function pair() {
	return (dispatch, getState) => {
		let {selectedDevice} = getState().AppReducer;

		DeviceManager.open("BT", selectedDevice, DeviceManager.type);

		dispatch(closeDialog());

		if (DeviceManager.type == "VIPER") {
			if (DeviceManager.smartPad.protocol == "BTC")
				dispatch(moveWizardTo(WizardSteps.BT_CONNECTION_WAITING));
			else
			 	dispatch(openDialog(Modals.BT_INSTRUCTIONS_WAITING));
		}
		else {
			if (process.platform == "win32" && DeviceManager.smartPad.transportProtocol == SmartPadNS.TransportProtocol.BLE)
				dispatch(moveWizardTo(WizardSteps.BT_CONNECTION_WAITING));
		}
	}
}

function getBTInstructionsClassName() {
	return (dispatch, getState) => {
		let {sppConnected} = getState().AppReducer;
		return sppConnected?null:"disabled";
	}
}

function confirmBTInstructions(onclose) {
	return (dispatch, getState) => {
		dispatch(closeDialog(onclose));

		DeviceManager.open("SPP", {}, "VIPER");
	}
}

function restartPairProcess() {
	return (dispatch, getState) => {
		dispatch(moveWizardTo(WizardSteps.SWITCH_ON));
		dispatch(closeDialog());
	}
}

function unlockFeaturesLater() {
	return (dispatch, getState) => {
		dispatch(moveWizardTo(WizardSteps.COMPLETE));
		dispatch(closeDialog());
	}
}

function login() {
	return (dispatch, getState) => {
		dispatch(closeDialog());
		AuthenticationManager.login(true);
	}
}

function forgetDevice(onclose) {
	return (dispatch, getState) => {
		dispatch(closeDialog(() => onclose(true)));
	}
}

function editEntity(type, fromValue, toValue) {
	return (dispatch, getState) => {
		switch (type) {
			case "tags":
				return dispatch(tagsAddConfirm(toValue));
			case "groups":
				let entity = ContentManager.getEntity(type);

				if (fromValue)
					entity.rename(fromValue.id, toValue);
				else
					entity.add(toValue, true);

				DBManager.setEntity(entity).then(() => {
					dispatch(closeDialog());
					dispatch(refreshGroups());
				});

				return dispatch(closeDialog());
			default:
				throw new Error("Unknown entity:", type);
		}
	}
}

function removeGroup() {
	return (dispatch, getState) => {
		let groups = ContentManager.getEntity("groups");
		let filterGroup = groups.get(getState().LibraryReducer.filterGroup);

		groups.remove(filterGroup.id);
		dispatch(filterByGroup());

		DBManager.setEntity(groups).then(() => dispatch(closeDialog()));
	}
}

function deleteGroup() {
	return (dispatch, getState) => {
		let filterGroup = ContentManager.getEntity("groups").get(getState().LibraryReducer.filterGroup);

		dispatch(notesDeleteConfirm(filterGroup.notes));
		dispatch(removeGroup());
	}
}

function saveChanges() {
	return (dispatch, getState) => {
		dispatch(saveNote());
		dispatch(closeDialog());
	}
}

function notesDeleteConfirm(noteIDs) {
	return (dispatch, getState) => {
		dispatch(deleteNotes(noteIDs));
		dispatch(addNotification("notification.file.deleted"));
		dispatch(closeDialog());
	}
}

function openTagAdd() {
	return (dispatch, getState) => {
		let {tags} = getState().LibraryReducer;

		dispatch(openDialog(Modals.ENTITY, {type: "tags", list: tags, buttons: {ok: {text: "btn.add"}}}));
	}
}

function getTagAddClassName(type) {
	return (dispatch, getState) => {
		let {profile} = getState().AppReducer;
		return profile.linkedWithCloud?null:"disabled";
	}
}

function tagsCancel() {
	return (dispatch, getState) => {
		dispatch(closeDialog());
		dispatch(openDialog(Modals.TAGS_EDITOR));
	}
}

function tagsAddConfirm(tag) {
	return (dispatch, getState) => {
		let {tags} = getState().LibraryReducer;

		tags = tags.slice(0);
		tags.push(tag);

		DBManager.setTags(tags).then(() => {
			dispatch(closeDialog());
			dispatch({type: ActionTypes.TAGS_UPDATE, body: tags});
		});
	}
}

function tagsEditConfirm(oldValue, newValue) {
	return (dispatch, getState) => {
		let notes = Object.values(ContentManager.notes).filter(note => note.tags.includes(oldValue));
		let tags = getState().LibraryReducer.tags.slice();
		if (tags.includes(newValue)) return;

		tags.replace(oldValue, newValue);
		notes.forEach(note => note.tags.replace(oldValue, newValue));

		DBManager.editPages(notes).then(() => DBManager.setTags(tags)).then(() => {
			dispatch({type: ActionTypes.LIBRARY_SET_TAG, body: null});
			dispatch({type: ActionTypes.TAGS_UPDATE, body: tags});

			ContentManager.filter(ContentManager.FilterType.TAG, null);
		}).catch(console.error);
	}
}

function tagsDeleteConfirm(tag) {
	return (dispatch, getState) => {
		let notes = Object.values(ContentManager.notes).filter(note => note.tags.includes(tag));
		let {tags} = getState().LibraryReducer;

		tags = tags.slice(0);
		tags.remove(tag);

		notes.forEach(note => note.tags.remove(tag));

		DBManager.editPages(notes).then(() => DBManager.setTags(tags)).then(() => {
			dispatch({type: ActionTypes.LIBRARY_SET_TAG, body: null});
			dispatch({type: ActionTypes.TAGS_UPDATE, body: tags});
			dispatch(closeDialog());

			ContentManager.filter(ContentManager.FilterType.TAG, null);
		});
	}
}

function tagsEditNotes(tag, notes, callback) {
	return (dispatch, getState) => {
		let selectedNotes = notes.map(note => note.clone(true));
		let remove = selectedNotes.filter(note => note.tags.includes(tag)).length == selectedNotes.length;

		selectedNotes.forEach(note => {
			note.tags.remove(tag);
			if (!remove) note.tags.push(tag);

			note.touch();
		});

		DBManager.editPages(selectedNotes).then(callback).catch(console.error);
	}
}

export {
	openDialog,
	closeDialog,
	openWizard,
	moveWizardTo,
	closeWizard,

	openSettings,
	selectSettingsTab,

	confirm,
	confirmLogout,
	updateSelected,

	setupLater,
	setupDevice,
	setupBTDevice,
	getConnClassName,
	pair,
	getBTInstructionsClassName,
	confirmBTInstructions,
	selectDeviceType,
	restartPairProcess,
	selectUSBConn,
	selectBTCConn,
	unlockFeaturesLater,
	login,
	forgetDevice,
	editEntity,
	removeGroup,
	deleteGroup,
	saveChanges,
	notesDeleteConfirm,
	openTagAdd,
	getTagAddClassName,
	tagsCancel,
	tagsAddConfirm,
	tagsEditConfirm,
	tagsDeleteConfirm,
	tagsEditNotes
}
