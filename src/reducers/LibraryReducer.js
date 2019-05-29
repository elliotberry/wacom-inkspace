import * as ActionTypes from '../constants/ActionTypes'

let defaultState = {
	context: "LIBRARY",
	lastModified: Date.now(),
	groupsModified: false,
	gridWidth: 0,
	collapsedStructure: false,

	deviceStatus: null,
	batteryCharge: null,
	lastSync: new Date(),

	filterTag: null,
	filterGroup: null,
	lastSelectedGroup: null,
	tags: [],

	searchWindowVisible: false,
	searchTerm: undefined,

	rotateInProgress: false,
	rotateTransform: 0,
	rotateTransformDelta: 0,
	rotatedNotes: [],

	combining: false,

	exportLocale: undefined,
	recognizedText: "",

	migrationCompleted: false,
	cloudSyncing: false,
	cloudDownloading: false
};

export default function LibraryReducer (state = defaultState, action) {
	if (global.debug) console.reducer(action.type, action.body);

	switch (action.type) {
		case ActionTypes.UPDATE_STATE_LIBRARY: return {...state, ...action.body}

		case ActionTypes.LIBRARY_SEARCH_SHOW: return {...state, searchWindowVisible: true};
		case ActionTypes.LIBRARY_SEARCH_HIDE: return {...state, searchWindowVisible: false};

		case ActionTypes.LIBRARY_SEARCH_FETCH: return {...state, context: "SEARCH", filterTag: null, searchTerm: action.body, searchWindowVisible: false};
		case ActionTypes.LIBRARY_SEARCH_RESULT_CLOSE: return {...state, context: "LIBRARY", searchTerm: null};

		case ActionTypes.LIBRARY_UPDATE_CONTEXT: return {...state, context: action.body}
		case ActionTypes.LIBRARY_SET_TAG: return {...state, filterTag: action.body, lastModified: Date.now()}
		case ActionTypes.LIBRARY_SET_GROUP: return {...state, filterGroup: action.body, lastSelectedGroup: action.body || state.lastSelectedGroup, lastModified: Date.now()}

		case ActionTypes.ROTATE_TRANSFORM_START: return {...state, rotateTransformDelta: 0, rotateInProgress: true}
		case ActionTypes.ROTATE_TRANSFORM: return {...state, rotateTransform: action.body.rotateTransform, rotateTransformDelta: action.body.rotateTransformDelta, rotatedNotes: ContentManager.selected.slice()}
		case ActionTypes.ROTATE_TRANSFORM_COMPLETE: return {...state, rotateTransform: state.rotateTransform - action.body, rotatedNotes: [], rotateInProgress: false}

		case ActionTypes.COMBINE_NOTES_START: return {...state, combining: true}
		case ActionTypes.COMBINE_NOTES_COMPLETE: return {...state, combining: false};

		case ActionTypes.MODALS_SET_EXPORT_LANGUAGE: return {...state, exportLocale: action.body}
		case ActionTypes.MODALS_SET_RECOGNIZED_TEXT: return {...state, recognizedText: action.body}

		case ActionTypes.MIGRATION_COMPLETED: return {...state, migrationCompleted: true}
		case ActionTypes.CLOUD_SYNCING: return {...state, cloudSyncing: action.body, cloudDownloading: navigator.onLine ? action.body : state.cloudDownloading}
		case ActionTypes.CLOUD_DOWNLOADING: return {...state, cloudDownloading: action.body}

		case ActionTypes.TAGS_UPDATE: return {...state, tags: action.body}

		case ActionTypes.SET_DEVICE_STATUS: return {...state, deviceStatus: action.body}
		case ActionTypes.SET_BATTERY_CHARGE: return {...state, batteryCharge: action.body}
		case ActionTypes.SET_LAST_SYNC: return {...state, lastSync: action.body}

		case ActionTypes.LIBRARY_REFRESH: return {...state, lastModified: Date.now()}
		case ActionTypes.GROUPS_REFRESH: return {...state, groupsModified: !state.groupsModified}
		case ActionTypes.LIBRARY_CLEAN: return {...state, lastModified: Date.now(), tags: []};

		default:
			return state;
	}
}
