import * as ActionTypes from '../constants/ActionTypes';

let defaultState = {
	online: false,
	profile: null,

	device: null,
	orientation: undefined,

	modals: [],
	modal: undefined,
	modalSettings: undefined,

	wizardType: undefined,

	wizardStep: undefined,
	usbConnected: false,
	sppConnected: false,
	devices: null,
	selectedDevice: null,
	selectedDeviceType: null,

	fte: false,
	update: false,
	tutorial: false,
	lastLogin: null,
	iFrameSRC: null,

	language: null,
	settingsTabIndex: 0,

	downloadProgress: {downloaded: 0, total: 0}
};

export default function AppReducer(state = defaultState, action) {
	if (global.debug) console.reducer(action.type, action.body);

	switch (action.type) {
		case ActionTypes.UPDATE_STATE_APP: return {...state, ...action.body}

		case ActionTypes.SET_PROFILE: return {...state, profile: action.body};
		case ActionTypes.SET_DEVICE: return {...state, device: (action.body && action.body.protocol)? action.body : null, orientation: action.body ? action.body.orientation : null};

		case ActionTypes.MODAL_SHOW: {
			let name = action.body.name;
			let settings = action.body.settings;

			let modals = state.modals.slice();

			if (!modals.last || modals.last.name != name)
				modals.push({name, settings});
			else
				console.warn("openDialog duplicate: " + name);

			UAManager.screen("Modal", name);
// console.log("============== MODAL_SHOW", name, JSON.stringify(modals))
			return {...state, ...action.body.props, modals, modal: name, modalSettings: settings};
		}

		case ActionTypes.MODAL_HIDE: {
			let modals = state.modals.slice();
			let modal = modals.pop();

			if (modal) {
				let parent;
				let parentSettings;

				if (modals.last) {
					parent = modals.last.name;
					parentSettings = modals.last.settings;
				}
// console.log("============== MODAL_HIDE", state.modal, "=>", parent, JSON.stringify(modals))
				return {...state, modals: modals, modal: parent, modalSettings: parentSettings}
			}
			else
				return state;
		}

		case ActionTypes.WIZARD_SHOW: {
			let props = (typeof action.body == "string")?{wizardType: action.body}:action.body;
			UAManager.screen("Wizard", props.wizardType);

			return {...state, ...props};
		}

		case ActionTypes.WIZARD_HIDE: return {...state, wizardType: undefined, wizardStep: undefined};
		case ActionTypes.WIZARD_SET_STEP: return {...state, wizardStep: action.body};

		case ActionTypes.SET_LANGUAGE: return {...state, language: action.body}
		case ActionTypes.SET_SETTINGS_TAB_INDEX: return {...state, settingsTabIndex: action.body}

		case ActionTypes.UPDATE_DOWNLOAD_PROGRESS: return {...state, downloadProgress: action.body}

		default:
			return state;
	}
}
