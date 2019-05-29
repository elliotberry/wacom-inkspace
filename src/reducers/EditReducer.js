import * as ActionTypes from '../constants/ActionTypes';

let defaultState = {
	note: null,
	newNote: false,
	noteUpdated: false,
	noteProgress: false,
	saveEnabled: false,
	clipboard: null,
	currentLayer: 0,
	layerPaneVisible: true,
	layersChanged: false,
	pasting: false,
	previews: [],
	activeTool: '',
	splitScrubVisible: false,
	saving: false,
	splitMode: null,
	splitCanceled: false,
	splitIndex: null,
	splitIndexMax: null,
	applyingSplitNote: false,
	lastModifiedDate: null
};

export default function EditReducer(state = defaultState, action) {
	if (global.debug) console.reducer(action.type, action.body);

	switch (action.type) {
		case ActionTypes.UPDATE_STATE_EDIT: return {...state, ...action.body}

		case ActionTypes.EDIT_START_SAVE: return {...state, saving: true};
		case ActionTypes.EDIT_END_SAVE: return {...state, lastModifiedDate: state.note.lastModifiedDate, saving: false};

		case ActionTypes.EDIT_CREATE_NOTE: return {...state, newNote: true};

		case ActionTypes.EDIT_MODE_INIT: {
			return {
				...state,
				layerPaneVisible: true,
				activeTool: "",
				note: action.body,
				newNote: false,
				noteProgress: !state.newNote,
				previews: [],
				lastModifiedDate: action.body.lastModifiedDate + (state.newNote ? 1 : 0),
				currentLayer: 0,
				splitMode: null,
				splitIndex: null,
				splitIndexMax: null,
				saving: false
			};
		}

		case ActionTypes.EDIT_MODE_FINALIZE: return {...state, note: null, previews: [], splitMode: null, splitIndex: null, splitIndexMax: null};
		case ActionTypes.EDIT_NOTE_UPDATED: return {...state, noteUpdated: !state.noteUpdated};
		case ActionTypes.EDIT_NOTE_SAVE_ENABLED: return {...state, saveEnabled: action.body};

		case ActionTypes.EDIT_SELECT_LAYER: return {...state, currentLayer: action.body};
		case ActionTypes.EDIT_MERGE_PREVIOUS: return {...state, currentLayer: action.body};
		case ActionTypes.EDIT_DELETE_LAYER: return {...state, currentLayer: action.body};
		case ActionTypes.EDIT_COPY_LAYER: return {...state, clipboard: action.body};
		case ActionTypes.EDIT_PASTE_LAYER: return {...state, currentLayer: action.body};
		case ActionTypes.EDIT_PASTING: return {...state, pasting: action.body};

		case ActionTypes.EDIT_UPDATE_PREVIEWS: return {...state, previews: action.body.slice()};

		case ActionTypes.EDIT_LAYERS_CHANGED: return {...state, layersChanged: !state.layersChanged};

		case ActionTypes.EDIT_SHOW_LAYER_PANE: return {...state, layerPaneVisible: true};
		case ActionTypes.EDIT_HIDE_LAYER_PANE: return {...state, layerPaneVisible: false};

		case ActionTypes.EDIT_TOOL_PICK: return {...state, activeTool: action.body};

		case ActionTypes.EDIT_INIT_SPLIT: {
			let {splitMode, targetLayer} = action.body;
			let {currentLayer, note} = state;
			let splitIndexMax;

			if (splitMode == 'layer') {
				currentLayer = targetLayer;
				splitIndexMax = state.note.layers[currentLayer].strokes.length;
			}
			else if (splitMode == 'note')
				splitIndexMax = state.note.layers.map(layer => layer.strokes.length).reduce((a, b) => a + b, 0);
			else
				throw new Error('Unsupported split mode.');

			return {...state, activeTool: null, currentLayer, splitMode, splitCanceled: false, splitIndexMax, splitIndex: splitIndexMax};
		}

		case ActionTypes.EDIT_CANCEL_SPLIT: return {...state, splitMode: null, splitCanceled: true, splitIndexMax: null, splitIndex: null};
		case ActionTypes.EDIT_APPLY_SPLIT_LAYER: return {...state, splitMode: null, splitIndexMax: null, splitIndex: null};

		case ActionTypes.EDIT_BEGIN_SPLIT_NOTE: return {...state, applyingSplitNote: true}
		case ActionTypes.EDIT_APPLY_SPLIT_NOTE: return {...state, currentLayer: Math.min(state.currentLayer, state.note.layers.length - 1), splitMode: null, splitIndexMax: null, splitIndex: null, applyingSplitNote: false};

		case ActionTypes.EDIT_SET_SPLIT_INDEX: return {...state, splitIndex: action.body};

		default:
			return state;
	}
}
